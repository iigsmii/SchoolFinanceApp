import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { Student } from '../../types';
import { buildParsianCode } from '../../utils/parsian';
import { matchesStudentSearch } from '../../utils/studentSearch';
import {
  UserPlus,
  FileSpreadsheet,
  AlertTriangle,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  CheckCircle2,
  Upload,
  PhoneCall,
  UserCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { playClickSound, playSuccessSound } from '../../utils/soundEffects';

const GRADES = ['پیش یک', 'پیش دو', 'اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم'];

export const StudentsScreen: React.FC = () => {
  const {
    students,
    schools,
    currentUser,
    accentColor,
    addStudent,
    updateStudent,
    deleteStudent,
    withdrawStudent,
    transactions,
    importStudents,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterNeedsFix, setFilterNeedsFix] = useState(false);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<number>(
    isSenior ? 0 : currentUser?.school_id || 1
  );

  // Edit / Add modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formName, setFormName] = useState('');
  const [formGrade, setFormGrade] = useState('اول');
  const [formFatherPhone, setFormFatherPhone] = useState('');
  const [formMotherPhone, setFormMotherPhone] = useState('');
  const [formNationalId, setFormNationalId] = useState('');
  const [formSchoolId, setFormSchoolId] = useState<number>(
    isSenior ? schools[0]?.id || 1 : currentUser?.school_id || 1
  );
  const [formError, setFormError] = useState('');

  // Excel import status state
  const [importSummary, setImportSummary] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingStudent(null);
    setFormName('');
    const targetScId = isSenior ? (selectedSchoolFilter || schools[0]?.id || 1) : currentUser?.school_id || 1;
    const targetSc = schools.find((s) => s.id === targetScId);
    const isMahd = targetSc?.name?.includes('مهد') || targetSc?.name?.includes('مهدالرضا');
    setFormGrade(isMahd ? 'پیش یک' : 'اول');
    setFormFatherPhone('');
    setFormMotherPhone('');
    setFormNationalId('');
    setFormSchoolId(targetScId);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormName(student.name);
    setFormGrade(student.grade);
    setFormFatherPhone(student.father_phone || student.phone || '');
    setFormMotherPhone(student.mother_phone || '');
    setFormNationalId(student.national_id);
    setFormSchoolId(student.school_id);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = formName.trim();
    const cleanFatherPhone = formFatherPhone.trim();
    const cleanMotherPhone = formMotherPhone.trim();
    const cleanNid = formNationalId.trim();

    if (!cleanName) {
      setFormError('نام و نام خانوادگی دانش‌آموز را وارد کنید.');
      return;
    }
    if (!cleanFatherPhone && !cleanMotherPhone) {
      setFormError('حداقل یکی از شماره‌های پدر یا مادر را وارد نمایید.');
      return;
    }
    if (cleanFatherPhone && !/^0\d{10}$/.test(cleanFatherPhone)) {
      setFormError('شماره موبایل پدر باید ۱۱ رقم و با ۰ شروع شود (مثال: 09131234567).');
      return;
    }
    if (cleanMotherPhone && !/^0\d{10}$/.test(cleanMotherPhone)) {
      setFormError('شماره موبایل مادر باید ۱۱ رقم و با ۰ شروع شود (مثال: 09131234567).');
      return;
    }
    if (!/^\d{10}$/.test(cleanNid)) {
      setFormError('کد ملی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }

    const primaryPhone = cleanFatherPhone || cleanMotherPhone;

    if (editingStudent) {
      updateStudent(editingStudent.id, {
        name: cleanName,
        grade: formGrade,
        phone: primaryPhone,
        father_phone: cleanFatherPhone,
        mother_phone: cleanMotherPhone,
        national_id: cleanNid,
        school_id: formSchoolId,
        needs_fix: false,
      });
    } else {
      addStudent({
        name: cleanName,
        grade: formGrade,
        phone: primaryPhone,
        father_phone: cleanFatherPhone,
        mother_phone: cleanMotherPhone,
        national_id: cleanNid,
        school_id: formSchoolId,
        active: true,
        needs_fix: false,
      });
    }
    playSuccessSound();
    setIsModalOpen(false);
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const matrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: false });
        const normalizeHeader = (v: unknown) => String(v ?? '')
          .replace(/[\u200c\u200f\u202a-\u202e\ufeff]/g, '')
          .trim().toLowerCase().replace(/[\s_\-\u0640]/g, '')
          .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک');
        const headerAliases = (values: unknown[], aliases: string[]) => {
          const normalized = values.map(normalizeHeader);
          return aliases.some(alias => normalized.includes(normalizeHeader(alias)));
        };
        // Many school workbooks have a merged title in row 1 and real headers in row 2.
        const headerIndex = matrix.findIndex((row, index) => index < 20 &&
          headerAliases(row, ['کد ملی','کدملی','national id','national_id']) &&
          ((headerAliases(row, ['نام']) && headerAliases(row, ['نام خانوادگی','نام‌خانوادگی','نام خانوادگي','surname','last name'])) ||
            headerAliases(row, ['نام کامل','نام و نام خانوادگی','نام دانش آموز','نام دانش‌آموز','full name','student name'])));
        if (headerIndex < 0) {
          setImportSummary('عنوان ستون‌ها پیدا نشد. فایل باید ستون‌های نام، نام خانوادگی و کد ملی را داشته باشد.');
          return;
        }
        const headers = (matrix[headerIndex] || []).map((h, i) => String(h ?? '').trim() || ('ستون ' + (i + 1)));
        const data = matrix.slice(headerIndex + 1).map(cells => {
          const row: Record<string, unknown> = {};
          headers.forEach((header, i) => { row[header] = cells?.[i] ?? ''; });
          return row;
        }).filter(row => Object.values(row).some(value => String(value ?? '').trim() !== ''));
        const getCell = (row: any, aliases: string[]) => {
          const keys = Object.keys(row || {});
          const targets = aliases.map(normalizeHeader).filter(Boolean);
          // Exact header match first; only then allow conservative containment matching.
          const exact = keys.find((k) => targets.includes(normalizeHeader(k)));
          if (exact !== undefined) return row[exact];
          const key = keys.find((k) => {
            const header = normalizeHeader(k);
            return targets.some((a) => a.length >= 5 && (header.startsWith(a) || header.endsWith(a)));
          });
          return key !== undefined ? row[key] : '';
        };
        const cleanText = (v: unknown) => String(v ?? '').replace(/[\u200c\u200f\ufeff]/g, '').replace(/\s+/g, ' ').trim();
        const normalizeDigits = (v: unknown) => String(v ?? '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
        const newStudents: Array<Omit<Student, 'id' | 'parsian_code'>> = [];
        const headerKeys = Object.keys(data[0] || {}).map(normalizeHeader);
        const hasSchoolColumn = headerKeys.some((h) => ['مدرسه','ناممدرسه','school','schoolname','کدمدرسه','schoolcode'].some((a) => h.includes(normalizeHeader(a))));
        let chosenSchoolId = currentUser?.school_id || 1;
        if (isSenior && !hasSchoolColumn) {
          const choices = schools.map((sc) => `${sc.id}: ${sc.name}`).join('\n');
          const answer = window.prompt(`این فایل ستون مدرسه ندارد. شناسه مدرسه مقصد را وارد کنید:\n${choices}`, String(selectedSchoolFilter || schools[0]?.id || 1));
          if (answer === null) { setImportSummary('ورود اکسل لغو شد.'); return; }
          const requestedId = Number(normalizeDigits(answer).trim());
          if (!schools.some((sc) => sc.id === requestedId)) { setImportSummary('شناسه مدرسه معتبر نیست؛ ورود انجام نشد.'); return; }
          chosenSchoolId = requestedId;
        }

        let rejectedRows = 0;
        data.forEach((row: any) => {
          const firstName = cleanText(getCell(row, ['نام کوچک','نام','اسم','first name','firstname','given name']));
          const lastName = cleanText(getCell(row, ['نام خانوادگی','نام‌خانوادگی','نام خانوادگي','فامیلی','فامیل','نام فامیل','نام خانوادگی دانش آموز','نام خانوادگی دانش‌آموز','last name','lastname','surname','family name']));
          const fullName = cleanText(getCell(row, ['نام و نام خانوادگی','نام‌ونام‌خانوادگی','نام کامل','نام کامل دانش آموز','نام کامل دانش‌آموز','نام دانش آموز','نام دانش‌آموز','student name','full name','fullname']));
          // Separate first/last-name columns are authoritative. This avoids importing only the first name
          // when a workbook contains both a full-name column and distinct surname column.
          const name = [firstName, lastName].filter(Boolean).join(' ') || fullName;
          let grade = String(getCell(row, ['پایه','کلاس','grade','class']) || 'اول').trim();
          if (grade === 'مهد') grade = 'پیش یک';

          const fatherP = normalizeDigits(getCell(row, ['شماره پدر','تلفن پدر','موبایل پدر','شماره همراه پدر','شماره موبایل','شماره تلفن همراه','موبایل','تلفن','phone','mobile','father phone'])).replace(/\D/g, '');
          const motherP = normalizeDigits(getCell(row, ['شماره مادر','تلفن مادر','موبایل مادر','شماره همراه مادر','mother phone'])).replace(/\D/g, '');
          const normalizedFatherP = /^9\d{9}$/.test(fatherP) ? '0' + fatherP : fatherP;
          const nid = normalizeDigits(getCell(row, ['کد ملی','کدملی','شماره ملی','شماره کد ملی','کد شناسایی ملی','national_id','national id','national code','nid'])).replace(/\D/g, '');

          let schoolId = chosenSchoolId;
          const schoolName = String(getCell(row, ['مدرسه','نام مدرسه','school','school name']) || '');
          const schoolCode = String(getCell(row, ['کد مدرسه','school code']) || '');
          if (schoolCode || schoolName) {
            const sc = schools.find((s) => (schoolName && normalizeHeader(s.name).includes(normalizeHeader(schoolName))) || (schoolCode && s.code === schoolCode));
            if (sc) schoolId = sc.id;
          }

          if (!name || !nid || nid.length > 10) {
            rejectedRows++;
            return;
          }
          newStudents.push({
            name: String(name).trim(),
            grade,
            phone: normalizedFatherP || motherP || '',
            father_phone: normalizedFatherP || '',
            mother_phone: motherP || '',
            national_id: nid.padStart(10, '0'),
            school_id: schoolId,
            active: true,
            needs_fix: nid.length !== 10,
          });
        });

        if (newStudents.length > 0) {
          const res = importStudents(newStudents);
          playSuccessSound();
          setImportSummary(
            `ورود موفق: ${res.added} دانش‌آموز افزوده شد. (${res.skipped} مورد تکراری، ${res.invalid} ناقص، ${rejectedRows} ردیف خراب/ناقص رد شد)`
          );
        } else {
          setImportSummary(`هیچ دانش‌آموز قابل ورود پیدا نشد. ${rejectedRows} ردیف به‌دلیل نام یا کد ملی نامعتبر رد شد.`);
        }
      } catch (err: any) {
        setImportSummary('خطا در پردازش فایل اکسل: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Filter list
  const filteredStudents = students.filter((s) => {
    if (s.active === false) return false;
    if (selectedSchoolFilter !== 0 && Number(s.school_id) !== Number(selectedSchoolFilter)) return false;
    if (filterNeedsFix && !s.needs_fix) return false;
    if (!matchesStudentSearch(s, searchQuery)) return false;
    return true;
  });

  const needsFixCount = students.filter((s) => s.needs_fix).length;

  return (
    <div className="min-h-screen pb-16 bg-[#f8f5f9]">
      <Header title="مدیریت دانش‌آموزان" />

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-4">
        {/* Top Actions: Add & Import */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-[#e5dde8] shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playClickSound();
                openAddModal();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all"
              style={{ backgroundColor: accentColor }}
            >
              <UserPlus className="w-4 h-4" />
              <span>افزودن دانش‌آموز جدید</span>
            </button>

            <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs sm:text-sm cursor-pointer active:scale-95 transition-all">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>ورود با اکسل</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelImport}
                className="hidden"
              />
            </label>
          </div>

          {/* School filter for Senior */}
          {isSenior && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 shrink-0">مرکز:</span>
              <select
                value={selectedSchoolFilter}
                onChange={(e) => setSelectedSchoolFilter(Number(e.target.value))}
                className="px-3 py-2 bg-[#fcfaff] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#341648] focus:outline-hidden"
              >
                <option value={0}>همه مراکز آموزشی</option>
                {schools.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {importSummary && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{importSummary}</span>
            </div>
            <button onClick={() => setImportSummary(null)} className="text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search & Needs Fix Filter */}
        <div className="bg-white p-4 rounded-3xl border border-[#e5dde8] shadow-xs space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی نام، کد ملی، شماره تماس پدر یا مادر..."
              className="w-full pr-10 pl-4 py-2.5 rounded-2xl border border-[#e5dde8] text-xs bg-[#fdfcfd] focus:border-[#62205f] outline-hidden"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <div className="text-gray-500 font-semibold">
              تعداد دانش‌آموزان: <span className="font-bold text-[#341648] font-mono">{filteredStudents.length}</span> نفر
            </div>

            {needsFixCount > 0 && (
              <button
                onClick={() => setFilterNeedsFix(!filterNeedsFix)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all ${
                  filterNeedsFix
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>نیازمند اصلاح ({needsFixCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Student Cards List */}
        <div className="space-y-2.5">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-[#e5dde8] text-xs text-gray-400">
              دانش‌آموزی با این مشخصات یافت نشد.
            </div>
          ) : (
            filteredStudents.map((s) => (
              <div
                key={s.id}
                onClick={() => openEditModal(s)}
                className="bg-white p-3.5 sm:p-4 rounded-3xl border border-[#e5dde8] hover:border-[#62205f]/50 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-[#341648]">{s.name}</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#f2eaf3] text-[#62205f]">
                      پایه {s.grade}
                    </span>
                    {s.needs_fix && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold">
                        نیازمند اصلاح
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                    <span>واحد: <strong className="text-gray-700">{s.school_name || 'مرکز'}</strong></span>
                    <span>کد ملی: <span className="font-mono">{s.national_id}</span></span>
                    {s.parsian_code && (
                      <span className="text-gray-400 font-mono text-[11px]">پارسیان: {s.parsian_code}</span>
                    )}
                  </div>

                  {/* Separate Father and Mother Phones */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs font-mono">
                    {s.father_phone && (
                      <div className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        <span className="font-sans text-[10px] text-blue-900 font-bold">پدر:</span>
                        <a
                          href={`tel:${s.father_phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline flex items-center gap-1"
                        >
                          <PhoneCall className="w-3 h-3 inline" />
                          <span>{s.father_phone}</span>
                        </a>
                      </div>
                    )}

                    {s.mother_phone && (
                      <div className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                        <span className="font-sans text-[10px] text-purple-900 font-bold">مادر:</span>
                        <a
                          href={`tel:${s.mother_phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline flex items-center gap-1"
                        >
                          <PhoneCall className="w-3 h-3 inline" />
                          <span>{s.mother_phone}</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <span className="text-xs font-bold text-[#62205f] hover:underline flex items-center gap-1">
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>ویرایش</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#e5dde8] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5dde8] mb-4">
              <h2 className="text-base sm:text-lg font-black text-[#341648]">
                {editingStudent ? 'ویرایش مشخصات دانش‌آموز' : 'افزودن دانش‌آموز جدید'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1">
                  نام و نام خانوادگی دانش‌آموز <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: علی‌رضا کمالی"
                  className="w-full px-3.5 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs sm:text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">
                    پایه تحصیلی <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-semibold text-[#302735] focus:outline-hidden focus:border-[#62205f]"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">
                    کد ملی (۱۰ رقم) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formNationalId}
                    onChange={(e) => setFormNationalId(e.target.value.replace(/\D/g, ''))}
                    placeholder="1190248561"
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs sm:text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f] font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Father Phone and Mother Phone Separated */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50/40 rounded-2xl border border-purple-100">
                <div>
                  <label className="block text-xs font-bold text-blue-900 mb-1">
                    شماره همراه پدر:
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={formFatherPhone}
                    onChange={(e) => setFormFatherPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="09131234567"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-blue-200 text-xs sm:text-sm text-[#302735] font-mono text-left outline-hidden focus:border-blue-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">
                    شماره همراه مادر:
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={formMotherPhone}
                    onChange={(e) => setFormMotherPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="09139876543"
                    className="w-full px-3 py-2 bg-white rounded-xl border border-purple-200 text-xs sm:text-sm text-[#302735] font-mono text-left outline-hidden focus:border-purple-500"
                    dir="ltr"
                  />
                </div>
              </div>

              {isSenior && (
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">
                    مرکز آموزشی / مدرسه <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formSchoolId}
                    onChange={(e) => setFormSchoolId(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-semibold text-[#302735] focus:outline-hidden focus:border-[#62205f]"
                  >
                    {schools.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editingStudent && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <button type="button" onClick={() => {
                    const hasHistory = transactions.some((t) => Number(t.student_id) === Number(editingStudent.id));
                    if (hasHistory) { alert('برای این دانش‌آموز گردش مالی ثبت شده است؛ حذف مجاز نیست. از گزینه انصراف از مدرسه استفاده کنید.'); return; }
                    if (window.confirm('دانش‌آموز بدون گردش مالی به‌طور کامل حذف شود؟')) { deleteStudent(editingStudent.id); setIsModalOpen(false); }
                  }} className="py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs">حذف دانش‌آموز</button>
                  <button type="button" onClick={() => {
                    if (window.confirm('انصراف از مدرسه ثبت شود؟ دانش‌آموز غیرفعال خواهد شد و سوابق مالی حفظ می‌شود.')) { withdrawStudent(editingStudent.id); setIsModalOpen(false); }
                  }} className="py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs">انصراف از مدرسه</button>
                </div>
              )}
              <div className="flex items-center gap-3 pt-3 border-t border-[#e5dde8]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs active:scale-95 transition-all"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs shadow-md active:scale-95 transition-all"
                  style={{ backgroundColor: accentColor }}
                >
                  {editingStudent ? 'ذخیره تغییرات' : 'ثبت دانش‌آموز'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
