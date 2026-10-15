import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { Student } from '../../types';
import { buildParsianCode } from '../../utils/parsian';
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
} from 'lucide-react';
import * as XLSX from 'xlsx';

const GRADES = ['مهد', 'اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم'];

export const StudentsScreen: React.FC = () => {
  const {
    students,
    schools,
    currentUser,
    accentColor,
    addStudent,
    updateStudent,
    deleteStudent,
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
  const [formPhone, setFormPhone] = useState('');
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
    setFormGrade('اول');
    setFormPhone('');
    setFormNationalId('');
    setFormSchoolId(isSenior ? (selectedSchoolFilter || schools[0]?.id || 1) : currentUser?.school_id || 1);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormName(student.name);
    setFormGrade(student.grade);
    setFormPhone(student.phone);
    setFormNationalId(student.national_id);
    setFormSchoolId(student.school_id);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = formName.trim();
    const cleanPhone = formPhone.trim();
    const cleanNid = formNationalId.trim();

    if (!cleanName) {
      setFormError('نام و نام خانوادگی دانش‌آموز را وارد کنید.');
      return;
    }
    if (!/^0\d{10}$/.test(cleanPhone)) {
      setFormError('شماره موبایل باید ۱۱ رقم و با ۰ شروع شود (مثال: 09131234567).');
      return;
    }
    if (!/^\d{10}$/.test(cleanNid)) {
      setFormError('کد ملی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }

    if (editingStudent) {
      updateStudent(editingStudent.id, {
        name: cleanName,
        grade: formGrade,
        phone: cleanPhone,
        national_id: cleanNid,
        school_id: formSchoolId,
        needs_fix: false,
      });
    } else {
      addStudent({
        name: cleanName,
        grade: formGrade,
        phone: cleanPhone,
        national_id: cleanNid,
        school_id: formSchoolId,
        active: true,
        needs_fix: false,
      });
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('آیا از حذف این دانش‌آموز اطمینان دارید؟')) {
      deleteStudent(id);
      setIsModalOpen(false);
    }
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
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

        const targetSchool = formSchoolId || currentUser?.school_id || 1;
        const parsedStudents: Array<Omit<Student, 'id' | 'parsian_code'>> = [];

        data.forEach((row) => {
          const name = String(row['نام'] || row['نام و نام خانوادگی'] || row['نام دانش آموز'] || row['name'] || '').trim();
          const nid = String(row['کد ملی'] || row['کدملی'] || row['national_id'] || '').replace(/\D/g, '').trim();
          const phone = String(row['تلفن'] || row['موبایل'] || row['شماره تماس'] || row['phone'] || '09130000000').replace(/\D/g, '').trim();
          const grade = String(row['پایه'] || row['کلاس'] || row['grade'] || 'اول').trim();

          if (name) {
            parsedStudents.push({
              name,
              national_id: nid || '0000000000',
              phone: phone.startsWith('0') ? phone : `0${phone}`,
              grade: GRADES.includes(grade) ? grade : 'اول',
              school_id: targetSchool,
              active: true,
              needs_fix: !/^\d{10}$/.test(nid),
            });
          }
        });

        if (parsedStudents.length === 0) {
          alert('هیچ دانش‌آموزی در فایل اکسل شناسایی نشد. ستون‌های «نام» و «کد ملی» را بررسی کنید.');
          return;
        }

        const res = importStudents(parsedStudents);
        setImportSummary(`ورود فایل اکسل با موفقیت انجام شد: ${res.added} نفر افزوده شدند، ${res.skipped} مورد تکراری، ${res.invalid} مورد نیازمند اصلاح.`);
      } catch (err) {
        alert('خطا در خواندن فایل اکسل: ' + String(err));
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    if (!isSenior && s.school_id !== currentUser?.school_id) return false;
    if (isSenior && selectedSchoolFilter > 0 && s.school_id !== selectedSchoolFilter) return false;
    if (filterNeedsFix && !s.needs_fix) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchNid = s.national_id.includes(q);
      const matchPhone = s.phone.includes(q);
      const matchGrade = s.grade.toLowerCase().includes(q);
      return matchName || matchNid || matchPhone || matchGrade;
    }
    return true;
  });

  const liveParsianCode = buildParsianCode(formNationalId, formSchoolId);

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="مدیریت دانش‌آموزان" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Action Buttons Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-white font-bold text-sm shadow-md active:scale-95 transition-all"
            style={{ backgroundColor: accentColor }}
          >
            <UserPlus className="w-5 h-5" />
            افزودن دانش‌آموز جدید
          </button>

          <label className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-white border border-[#e5dde8] text-[#341648] font-bold text-sm shadow-xs cursor-pointer hover:border-[#62205f] active:scale-95 transition-all">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>ورود دانش‌آموزان از Excel</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleExcelImport}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setFilterNeedsFix(!filterNeedsFix)}
            className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl border font-bold text-sm shadow-xs active:scale-95 transition-all ${
              filterNeedsFix
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-white text-rose-700 border-[#e5dde8] hover:bg-rose-50'
            }`}
          >
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>دانش‌آموزان نیازمند اصلاح</span>
          </button>
        </div>

        {importSummary && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{importSummary}</span>
            </div>
            <button onClick={() => setImportSummary(null)} className="text-emerald-600 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جست‌وجوی نام، پایه یا کد ملی دانش‌آموز..."
                className="w-full pl-4 pr-11 py-3 bg-[#fdfcfd] rounded-2xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f]"
              />
              <Search className="w-5 h-5 text-gray-400 absolute right-3.5 top-3.5" />
            </div>

            {isSenior && (
              <div className="sm:w-64">
                <select
                  value={selectedSchoolFilter}
                  onChange={(e) => setSelectedSchoolFilter(Number(e.target.value))}
                  className="w-full py-3 px-3 bg-[#fdfcfd] rounded-2xl border border-[#e5dde8] text-sm font-semibold text-[#302735] focus:outline-hidden focus:border-[#62205f]"
                >
                  <option value={0}>همه مدارس ({schools.length} مرکز)</option>
                  {schools.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 font-medium">
            تعداد نمایش: {filteredStudents.length} دانش‌آموز
            {filterNeedsFix && ' (فیلتر: فقط نیازمند اصلاح)'}
          </div>
        </div>

        {/* Student List Cards */}
        <div className="space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-gray-400 border border-[#e5dde8]">
              دانش‌آموزی با این مشخصات یافت نشد.
            </div>
          ) : (
            filteredStudents.map((s) => (
              <div
                key={s.id}
                onClick={() => openEditModal(s)}
                className={`cursor-pointer rounded-2xl p-4 sm:p-5 border transition-all hover:shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                  s.needs_fix
                    ? 'bg-rose-50/80 border-rose-200 hover:border-rose-400'
                    : 'bg-white border-[#e5dde8] hover:border-[#62205f]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    {s.needs_fix && (
                      <span className="text-xs font-bold text-rose-700 bg-rose-200/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        نیاز به اصلاح کد ملی
                      </span>
                    )}
                    <h3 className="text-base font-bold text-[#341648]">{s.name}</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#f2eaf3] text-[#62205f]">
                      پایه {s.grade}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-2 font-medium">
                    <span>مدرسه: {s.school_name || 'مدرسه'}</span>
                    <span>کد ملی: <span className="font-mono">{s.national_id}</span></span>
                    <span>همراه: <span className="font-mono">{s.phone}</span></span>
                  </div>

                  <div className="text-[11px] font-mono text-gray-400 mt-1">
                    کد حساب پارسیان: {s.parsian_code || '—'}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-xs font-bold text-[#62205f] hover:underline flex items-center gap-1">
                    <Edit2 className="w-3.5 h-3.5" />
                    ویرایش
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#e5dde8] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#e5dde8] mb-5">
              <h2 className="text-lg font-black text-[#341648]">
                {editingStudent ? 'ویرایش اطلاعات دانش‌آموز' : 'افزودن دانش‌آموز جدید'}
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

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  نام و نام خانوادگی دانش‌آموز <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: علی‌رضا کمالی"
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">
                    پایه تحصیلی <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-semibold text-[#302735] focus:outline-hidden focus:border-[#62205f]"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">
                    شماره همراه اولیا <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="09131234567"
                    className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f] font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1.5">
                  کد ملی (دقیقاً ۱۰ رقم) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={formNationalId}
                  onChange={(e) => setFormNationalId(e.target.value.replace(/\D/g, ''))}
                  placeholder="1190248561"
                  className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f] font-mono text-left"
                  dir="ltr"
                />
              </div>

              {isSenior && (
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1.5">
                    مدرسه / مرکز <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formSchoolId}
                    onChange={(e) => setFormSchoolId(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-semibold text-[#302735] focus:outline-hidden focus:border-[#62205f]"
                  >
                    {schools.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Parsian Accounting Code Live Card matching Android */}
              <div className="bg-[#fcfaff] p-3.5 rounded-2xl border border-[#ede5ef] text-xs">
                <div className="font-bold text-[#341648] mb-1">کد حساب پارسیان (محاسبه خودکار):</div>
                <div className="font-mono text-sm font-black text-[#62205f]">
                  {liveParsianCode.fullCode}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  کد کل: {liveParsianCode.generalCode} | کد معین مدرسه: {liveParsianCode.moeenCode} | کد تفصیلی: {liveParsianCode.tafsiliCode}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: accentColor }}
                >
                  <Check className="w-4 h-4" />
                  ذخیره اطلاعات
                </button>

                {editingStudent && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingStudent.id)}
                    className="py-3 px-4 rounded-xl text-rose-700 bg-rose-50 border border-rose-200 font-bold text-sm hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 px-4 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-sm font-semibold"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
