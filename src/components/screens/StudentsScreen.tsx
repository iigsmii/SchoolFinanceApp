import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { Student } from '../../types';
import {
  UserPlus,
  AlertTriangle,
  Search,
  Edit2,
  X,
  CheckCircle2,
  Upload,
  PhoneCall,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { playClickSound, playSuccessSound } from '../../utils/soundEffects';
import { createStudent, updateStudentBackend, verifyStudentInSheet, loadSession } from '../../services/sheetBridge';

const GRADES = ['پیش یک', 'پیش دو', 'اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم'];

type SaveState = 'idle' | 'saving' | 'saved_local_only' | 'saved_synced';

export const StudentsScreen: React.FC = () => {
  const {
    students,
    schools,
    currentUser,
    accentColor,
    addStudent,
    updateStudent,
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

  // Sync feedback
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

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
    setSaveState('idle');
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
    setSaveState('idle');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
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

      // Update on the server as well (best-effort; local record is already saved)
      if (loadSession()?.token) {
        setSaveState('saving');
        const res = await updateStudentBackend({
          id: editingStudent.id,
          name: cleanName,
          grade: formGrade,
          phone: primaryPhone,
          national_id: cleanNid,
          school_id: formSchoolId,
        });
        setSaveState(res.success ? 'saved_synced' : 'saved_local_only');
        if (!res.success) {
          setSyncNotice(
            `تغییرات در این دستگاه ذخیره شد، اما در گوگل شیت به‌روزرسانی نشد: ${res.error || 'خطای نامشخص'}`
          );
        }
      } else {
        setSaveState('saved_local_only');
        setSyncNotice('تغییرات فقط در این دستگاه ذخیره شد؛ برای ثبت در گوگل شیت ابتدا وارد حساب کاربری سرور شوید.');
      }

      playSuccessSound();
      setTimeout(() => setIsModalOpen(false), 900);
      return;
    }

    // ---------- New student: write to the sheet FIRST, then to local state ----------
    playSuccessSound();

    if (!loadSession()?.token) {
      // Offline / not logged into the backend: keep local record but be explicit.
      const created = addStudent({
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
      setSaveState('saved_local_only');
      setSyncNotice(
        `دانش‌آموز «${created.name}» فقط در همین دستگاه ثبت شد و در گوگل شیت ذخیره نشد؛ به همین دلیل در گوشی‌های دیگر دیده نمی‌شود. برای ثبت ابری، از بخش تنظیمات وارد حساب شوید.`
      );
      setTimeout(() => setIsModalOpen(false), 1200);
      return;
    }

    setSaveState('saving');
    const res = await createStudent({
      name: cleanName,
      grade: formGrade,
      phone: primaryPhone,
      national_id: cleanNid,
      school_id: formSchoolId,
    });

    if (res.success) {
      // Verify the row really landed in the sheet before claiming success.
      const check = await verifyStudentInSheet(cleanNid);

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

      if (check.verified) {
        setSaveState('saved_synced');
        setSyncNotice(`دانش‌آموز «${cleanName}» با موفقیت در گوگل شیت ثبت شد و در همه دستگاه‌ها نمایش داده می‌شود.`);
      } else {
        setSaveState('saved_synced');
        setSyncNotice(
          `ثبت در سرور انجام شد، اما بازخوانی تأییدکننده نتیجه نداد: ${check.error || 'ردیف جدید هنوز در خواندن ظاهر نشد.'}`
        );
      }
      setTimeout(() => setIsModalOpen(false), 1200);
    } else {
      // Server rejected: do NOT silently keep a local-only record that would hide the problem.
      setSaveState('idle');
      setFormError(
        `${res.error || 'ثبت در گوگل شیت انجام نشد.'} — دانش‌آموز ذخیره نشد؛ لطفاً مشکل را برطرف و دوباره تلاش کنید.`
      );
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
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const newStudents: Array<Omit<Student, 'id' | 'parsian_code'>> = [];

        data.forEach((row: any) => {
          const name = row['نام و نام خانوادگی'] || row['نام'] || row['name'] || '';
          let grade = String(row['پایه'] || row['کلاس'] || row['grade'] || 'اول').trim();
          if (grade === 'مهد') grade = 'پیش یک';

          const fatherP = String(row['شماره پدر'] || row['تلفن پدر'] || row['موبایل پدر'] || row['تلفن'] || row['phone'] || '').replace(/\D/g, '');
          const motherP = String(row['شماره مادر'] || row['تلفن مادر'] || row['موبایل مادر'] || '').replace(/\D/g, '');
          const nid = String(row['کد ملی'] || row['کدملی'] || row['national_id'] || '').replace(/\D/g, '');

          let schoolId = currentUser?.school_id || 1;
          if (row['کد مدرسه'] || row['مدرسه']) {
            const sc = schools.find((s) => s.name.includes(row['مدرسه']) || s.code === row['کد مدرسه']);
            if (sc) schoolId = sc.id;
          }

          if (name && nid) {
            newStudents.push({
              name: String(name).trim(),
              grade,
              phone: fatherP || motherP || '',
              father_phone: fatherP || '',
              mother_phone: motherP || '',
              national_id: nid.padStart(10, '0'),
              school_id: schoolId,
              active: true,
              needs_fix: nid.length !== 10,
            });
          }
        });

        if (newStudents.length > 0) {
          const res = importStudents(newStudents);
          playSuccessSound();
          setImportSummary(
            `ورود موفق: ${res.added} دانش‌آموز افزوده شد. (${res.skipped} مورد تکراری، ${res.invalid} ناقص)`
          );
        } else {
          setImportSummary('هیچ سطری مطابق با ستون‌های مورد نظر (نام و کد ملی) یافت نشد.');
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
    if (!s.active) return false;
    if (selectedSchoolFilter !== 0 && s.school_id !== selectedSchoolFilter) return false;
    if (filterNeedsFix && !s.needs_fix) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = s.name.toLowerCase().includes(q);
      const matchNid = s.national_id.includes(q);
      const matchPhone =
        s.phone.includes(q) ||
        (s.father_phone && s.father_phone.includes(q)) ||
        (s.mother_phone && s.mother_phone.includes(q));
      if (!matchName && !matchNid && !matchPhone) return false;
    }
    return true;
  });

  const needsFixCount = students.filter((s) => s.needs_fix).length;

  return (
    <div className="w-full max-w-full min-h-screen overflow-x-hidden pb-16 bg-[#f8f5f9]">
      <Header title="مدیریت دانش‌آموزان" />

      <main className="w-full max-w-4xl mx-auto px-4 py-5 space-y-4 box-border">
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

        {syncNotice && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-semibold flex items-start justify-between gap-2">
            <span className="leading-relaxed">{syncNotice}</span>
            <button onClick={() => setSyncNotice(null)} className="text-amber-700 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold leading-relaxed">
                ⚠️ {formError}
              </div>
            )}

            {saveState === 'saved_synced' && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{syncNotice || 'در گوگل شیت ثبت شد.'}</span>
              </div>
            )}

            {saveState === 'saved_local_only' && (
              <div className="p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold leading-relaxed">
                {syncNotice || 'فقط در این دستگاه ذخیره شد.'}
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
                  disabled={saveState === 'saving'}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: accentColor }}
                >
                  {saveState === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {saveState === 'saving'
                      ? 'در حال ثبت در گوگل شیت...'
                      : editingStudent
                      ? 'ذخیره تغییرات'
                      : 'ثبت دانش‌آموز'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
