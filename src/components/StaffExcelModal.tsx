import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { StaffMember, School } from '../types';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
  Check,
  Building,
  GraduationCap,
  Users,
  Eye,
  Trash2,
} from 'lucide-react';
import { formatRial, latinDigits } from '../utils/jalali';

interface StaffExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  defaultSchoolId: number;
  onImport: (staffList: Omit<StaffMember, 'id'>[]) => void;
  accentColor: string;
}

interface ParsedStaffRow {
  name: string;
  national_id: string;
  phone: string;
  role: string;
  school_id: number;
  school_name: string;
  contract_type: 'hourly' | 'monthly' | 'session';
  hourly_rate: number;
  base_salary: number;
  insurance_employer: number;
  insurance_employee: number;
  bank_account?: string;
  bank_name?: string;
  valid: boolean;
  notes: string[];
}

const clean = (s: any) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[\u200c\u200f\u202a-\u202e\s_-]/g, '');

export const StaffExcelModal: React.FC<StaffExcelModalProps> = ({
  isOpen,
  onClose,
  schools,
  defaultSchoolId,
  onImport,
  accentColor,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedStaffRow[]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [fallbackSchoolId, setFallbackSchoolId] = useState<number>(defaultSchoolId || 1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const schoolMap = new Map<number, string>();
  schools.forEach((s) => schoolMap.set(s.id, s.name));

  const handleProcessWorkbook = (wb: XLSX.WorkBook, name: string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const sheetName =
        wb.SheetNames.find((s) => {
          const c = clean(s);
          return c.includes('staff') || c.includes('معلم') || c.includes('پرسنل') || c.includes('کارکنان');
        }) || wb.SheetNames[0];

      const ws = wb.Sheets[sheetName];
      if (!ws) {
        throw new Error('شیت مناسب در فایل اکسل یافت نشد.');
      }

      const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
      if (rows.length < 2) {
        throw new Error('فایل اکسل خالی است یا فقط یک سطر دارد.');
      }

      const rawHeaders = (rows[0] || []).map((h) => String(h || '').trim());
      const headers = rawHeaders.map(clean);
      setDetectedColumns(rawHeaders.filter(Boolean));

      // Fuzzy column finder
      const findIdx = (keywords: string[]) =>
        headers.findIndex((h) => keywords.some((kw) => h.includes(clean(kw))));

      const nameIdx = findIdx(['نام و نام خانوادگی', 'نام و نام‌خانوادگی', 'نام', 'نام کامل', 'نام خانوادگی', 'معلم', 'پرسنل', 'name', 'fullname']);
      const nidIdx = findIdx(['کدملی', 'کد ملی', 'شماره ملی', 'شناسه ملی', 'national_id', 'nid', 'melli']);
      const phoneIdx = findIdx(['تلفن', 'شماره همراه', 'همراه', 'موبایل', 'شماره تماس', 'phone', 'mobile']);
      const roleIdx = findIdx(['سمت', 'نقش', 'عنوان شغلی', 'پست', 'مسئولیت', 'عنوان', 'رشته', 'درس', 'role']);
      const schoolIdx = findIdx(['مدرسه', 'نام مدرسه', 'کد مدرسه', 'واحد', 'school']);
      const contractIdx = findIdx(['نوع قرارداد', 'قرارداد', 'نوع همکاری', 'همکاری', 'contract']);
      const rateIdx = findIdx(['نرخ ساعتی', 'حق‌التدریس', 'دستمزد ساعتی', 'مبلغ ساعت', 'ساعتی', 'rate']);
      const baseIdx = findIdx(['حقوق پایه', 'پایه حقوق', 'حقوق ثابت', 'حقوق ماهانه', 'مقرری', 'salary', 'base']);
      const insEmpIdx = findIdx(['بیمه کارفرما', 'حق بیمه کارفرما', 'سهم کارفرما', 'کارفرما']);
      const insEmplyIdx = findIdx(['بیمه پرسنل', 'بیمه کارمند', 'سهم کارمند', 'پرسنل بیمه']);
      const bankIdx = findIdx(['شماره حساب', 'شماره کارت', 'شماره شبا', 'شبا', 'کارت', 'bank', 'card']);
      const bankNameIdx = findIdx(['نام بانک', 'بانک', 'bank_name']);

      if (nameIdx === -1 && nidIdx === -1) {
        throw new Error('ستون‌های کلیدی (نام یا کد ملی) در فایل اکسل شناسایی نشدند.');
      }

      const results: ParsedStaffRow[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const name = String(row[nameIdx >= 0 ? nameIdx : 0] || '').trim();
        if (!name || name === 'نام و نام خانوادگی') continue;

        let nid = String(row[nidIdx >= 0 ? nidIdx : 1] || '').trim().replace(/\D/g, '');
        if (nid.length > 0 && nid.length < 10) nid = nid.padStart(10, '0');

        let phone = String(row[phoneIdx >= 0 ? phoneIdx : 2] || '').trim().replace(/\D/g, '');
        if (/^9\d{9}$/.test(phone)) phone = '0' + phone;

        let role = String(row[roleIdx >= 0 ? roleIdx : 3] || 'آموزگار ابتدایی').trim();
        if (!role) role = 'آموزگار ابتدایی';

        // Match school
        let schoolId = fallbackSchoolId;
        if (schoolIdx >= 0 && row[schoolIdx]) {
          const rawSc = String(row[schoolIdx]).trim();
          const matchedSc = schools.find(
            (s) =>
              s.name.includes(rawSc) ||
              rawSc.includes(s.name) ||
              s.code.toLowerCase() === rawSc.toLowerCase() ||
              String(s.id) === rawSc
          );
          if (matchedSc) schoolId = matchedSc.id;
        }

        const rawRate = row[rateIdx >= 0 ? rateIdx : -1];
        const hourly_rate = Number(String(rawRate || 0).replace(/\D/g, '')) || 0;

        const rawBase = row[baseIdx >= 0 ? baseIdx : -1];
        const base_salary = Number(String(rawBase || 0).replace(/\D/g, '')) || 0;

        const rawInsEmp = row[insEmpIdx >= 0 ? insEmpIdx : -1];
        const insurance_employer = Number(String(rawInsEmp || 0).replace(/\D/g, '')) || 0;

        const rawInsEmply = row[insEmplyIdx >= 0 ? insEmplyIdx : -1];
        const insurance_employee = Number(String(rawInsEmply || 0).replace(/\D/g, '')) || 0;

        let contract_type: 'hourly' | 'monthly' | 'session' = 'hourly';
        if (contractIdx >= 0 && row[contractIdx]) {
          const cStr = String(row[contractIdx]);
          if (cStr.includes('ماه') || cStr.includes('ثابت')) contract_type = 'monthly';
          else if (cStr.includes('جلسه')) contract_type = 'session';
          else contract_type = 'hourly';
        } else if (base_salary > 0 && hourly_rate === 0) {
          contract_type = 'monthly';
        }

        const bank_account = bankIdx >= 0 ? String(row[bankIdx] || '').trim() : undefined;
        const bank_name = bankNameIdx >= 0 ? String(row[bankNameIdx] || '').trim() : undefined;

        const notes: string[] = [];
        if (!nid || nid.length !== 10) notes.push('کد ملی نامعتبر یا ناقص');
        if (!phone || phone.length < 10) notes.push('تلفن ناقص');

        results.push({
          name,
          national_id: nid,
          phone,
          role,
          school_id: schoolId,
          school_name: schoolMap.get(schoolId) || 'مدرسه',
          contract_type,
          hourly_rate,
          base_salary,
          insurance_employer,
          insurance_employee,
          bank_account,
          bank_name,
          valid: !!name,
          notes,
        });
      }

      setFileName(name);
      setParsedRows(results);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در خواندن فایل اکسل');
      setParsedRows([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        handleProcessWorkbook(wb, file.name);
      } catch (err: any) {
        setErrorMsg('خطا در بارگذاری فایل: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        handleProcessWorkbook(wb, file.name);
      } catch (err: any) {
        setErrorMsg('خطا در بارگذاری فایل: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'نام و نام خانوادگی': 'حمیدرضا تقوی',
        'کد ملی': '1190456789',
        'شماره همراه': '09131234567',
        'سمت': 'آموزگار ابتدایی',
        'مدرسه': schools[0]?.name || 'دبستان نور ۱',
        'نوع قرارداد': 'ساعتی',
        'نرخ ساعتی (ریال)': 1400000,
        'حقوق پایه ماهانه (ریال)': 0,
        'حق بیمه سهم کارفرما': 12000000,
        'حق بیمه سهم پرسنل': 4500000,
        'شماره حساب یا شبا': 'IR890170000000109283746501',
        'نام بانک': 'بانک ملی',
      },
      {
        'نام و نام خانوادگی': 'مریم السادات کمالی',
        'کد ملی': '1190987654',
        'شماره همراه': '09139876543',
        'سمت': 'مربی قرآن و حفظ',
        'مدرسه': schools[1]?.name || 'دبستان تبیان ۱',
        'نوع قرارداد': 'ماهانه',
        'نرخ ساعتی (ریال)': 0,
        'حقوق پایه ماهانه (ریال)': 165000000,
        'حق بیمه سهم کارفرما': 18000000,
        'حق بیمه سهم پرسنل': 7000000,
        'شماره حساب یا شبا': 'IR450150000000208172635402',
        'نام بانک': 'بانک سپه',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Staff_Template');
    XLSX.writeFile(wb, 'قالب_اکسل_پرسنل_مدرسه_القرآن.xlsx');
  };

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;
    const staffToImport: Omit<StaffMember, 'id'>[] = parsedRows.map((r) => ({
      name: r.name,
      national_id: r.national_id,
      phone: r.phone,
      role_title: r.role || 'معلم / مربی',
      school_id: r.school_id || fallbackSchoolId,
      contract_type: r.contract_type,
      hourly_rate: r.hourly_rate,
      base_salary: r.base_salary,
      insurance_employer_share: r.insurance_employer,
      insurance_employee_share: r.insurance_employee,
      bank_card_or_sheba: r.bank_account
        ? (r.bank_name ? `${r.bank_account} (${r.bank_name})` : r.bank_account)
        : undefined,
      active: true,
    }));

    onImport(staffToImport);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] shadow-2xl border border-[#e5dde8] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#e5dde8] flex items-center justify-between bg-gradient-to-r from-purple-50 via-pink-50/30 to-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#341648] text-amber-300 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#341648]">
                ورود هوشمند مشخصات کارکنان و معلمان از فایل اکسل
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                شناسایی خودکار نام، کد ملی، شماره تماس، سمت، قرارداد، حقوق ساعتی و حق بیمه
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Top Controls: Template Download & Fallback School */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-[#fcfaff] rounded-2xl border border-[#ede5ef]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#341648]">مدرسه پیش‌فرض برای موارد نامشخص:</span>
              <select
                value={fallbackSchoolId}
                onChange={(e) => setFallbackSchoolId(Number(e.target.value))}
                className="px-3 py-1.5 bg-white rounded-xl border border-gray-200 text-xs font-bold text-[#341648]"
              >
                {schools.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-gray-50 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-2xs transition-all active:scale-95"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>دانلود قالب اکسل نمونه کارکنان (.xlsx)</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-6 sm:p-8 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-[#62205f] bg-purple-50/70 scale-[0.99]'
                : 'border-gray-300 hover:border-[#62205f] bg-[#fdfcfd] hover:bg-purple-50/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-100 text-[#62205f] flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-[#341648] mb-1">
              فایل اکسل کارکنان را اینجا بکشید یا برای انتخاب کلیک کنید
            </div>
            <p className="text-xs text-gray-500">
              پشتیبانی از فرمت‌های XLSX، XLS و CSV (نرم‌افزار به‌صورت هوشمند سرستون‌ها را مطابقت می‌دهد)
            </p>
            {fileName && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>فایل انتخاب‌شده: {fileName}</span>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Detected Summary */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#341648]">
                    پیش‌نمایش داده‌های شناسایی‌شده:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300">
                    {parsedRows.length} نفر کادر و معلم
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  ستون‌های شناسایی‌شده: {detectedColumns.join(' • ')}
                </div>
              </div>

              {/* Table */}
              <div className="border border-[#e5dde8] rounded-2xl overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#fcfaff] text-gray-600 font-bold border-b border-[#e5dde8] sticky top-0">
                      <tr>
                        <th className="p-3">ردیف</th>
                        <th className="p-3">نام و نام خانوادگی</th>
                        <th className="p-3">کد ملی</th>
                        <th className="p-3">تلفن همراه</th>
                        <th className="p-3">سمت / نقش</th>
                        <th className="p-3">مدرسه</th>
                        <th className="p-3">نوع قرارداد</th>
                        <th className="p-3">نرخ ساعتی / پایه</th>
                        <th className="p-3">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-purple-50/30 transition-colors">
                          <td className="p-3 font-mono text-gray-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-[#341648]">{r.name}</td>
                          <td className="p-3 font-mono">{r.national_id || '—'}</td>
                          <td className="p-3 font-mono">{r.phone || '—'}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 font-semibold">
                              {r.role}
                            </span>
                          </td>
                          <td className="p-3 text-gray-700">{r.school_name}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                r.contract_type === 'hourly'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-blue-100 text-blue-900'
                              }`}
                            >
                              {r.contract_type === 'hourly' ? 'ساعتی' : 'ماهانه'}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-[#341648]">
                            {r.hourly_rate > 0
                              ? `${formatRial(r.hourly_rate)} / ساعت`
                              : r.base_salary > 0
                              ? `${formatRial(r.base_salary)} ماهانه`
                              : '—'}
                          </td>
                          <td className="p-3">
                            {r.notes.length === 0 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                <Check className="w-3.5 h-3.5" />
                                <span>تأیید</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-amber-700 text-[11px]"
                                title={r.notes.join(' - ')}
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{r.notes[0]}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#e5dde8] bg-[#fdfcfd] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs active:scale-95 transition-all"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedRows.length === 0 || isProcessing}
            className="px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: accentColor }}
          >
            <Check className="w-4 h-4" />
            <span>تأیید و افزودن {parsedRows.length} نفر به سامانه</span>
          </button>
        </div>
      </div>
    </div>
  );
};
