import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Student, Transaction } from '../types';
import { JalaliDatePicker } from './JalaliDatePicker';
import { todayJalali, jalaliToIso, formatRial, latinDigits } from '../utils/jalali';
import { matchesStudentSearch } from '../utils/studentSearch';
import {
  FileText,
  Search,
  Sparkles,
  X,
  Printer,
  CreditCard,
  Check,
  Building,
} from 'lucide-react';

interface QuickInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIssueInvoice?: (student: Student) => void;
  students?: Student[];
  accentColor?: string;
}

export const QuickInvoiceModal: React.FC<QuickInvoiceModalProps> = ({
  isOpen,
  onClose,
  onIssueInvoice,
  students: propStudents,
  accentColor: propAccentColor,
}) => {
  const {
    students,
    currentUser,
    accentColor,
    addTuitionDebt,
    getStudentBalance,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  // Filter available students
  const availableStudents = students.filter((s) => {
    if (!isSenior && Number(s.school_id) !== Number(currentUser?.school_id)) return false;
    return s.active;
  });

  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Each opening starts with a clean student selection and fresh invoice fields.
  useEffect(() => {
    if (isOpen) {
      setSelectedStudent(null);
      setStudentSearch('');
      setError('');
    }
  }, [isOpen]);

  const [tuitionAmount, setTuitionAmount] = useState('180,000,000');
  const [invoiceDate, setInvoiceDate] = useState(todayJalali());
  const [description, setDescription] = useState('شهریه مصوب سال تحصیلی ۱۴۰۵-۱۴۰۶');
  const [recordAsNewDebt, setRecordAsNewDebt] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const filteredStudents = availableStudents.filter((st) =>
    matchesStudentSearch(st, studentSearch)
  );
  const visibleStudents = filteredStudents.slice(0, 50);

  const studentBalance = selectedStudent ? getStudentBalance(selectedStudent.id) : null;

  const handleSelectStudent = (st: Student) => {
    setSelectedStudent(st);
    setStudentSearch('');
    // If student has existing debt, set amount or keep
    const bal = getStudentBalance(st.id);
    if (bal.balance > 0) {
      setTuitionAmount(Number(bal.balance).toLocaleString('en-US'));
    }
  };

  const handleApplyPreset = (amt: number) => {
    setTuitionAmount(amt.toLocaleString('en-US'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedStudent) {
      setError('دانش‌آموز مورد نظر را انتخاب نمایید.');
      return;
    }

    const cleanAmount = Number(latinDigits(tuitionAmount).replace(/[,٬]/g, '').trim());
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      setError('مبلغ شهریه را به ریال به درستی وارد کنید.');
      return;
    }

    try {
      if (recordAsNewDebt) {
        const isoDate = jalaliToIso(invoiceDate);
        addTuitionDebt({
          student_id: selectedStudent.id,
          amount: cleanAmount,
          date: isoDate,
          description: description.trim() || 'شهریه مصوب',
          school_id: selectedStudent.school_id,
        });
      }

      // Trigger invoice modal
      if (onIssueInvoice) {
        onIssueInvoice(selectedStudent);
      }
      onClose();
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#e5dde8] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e5dde8] mb-5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: accentColor }}
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#341648]">صدور سریع فاکتور پرداخت شهریه</h2>
              <p className="text-xs text-gray-400">انتخاب دانش‌آموز، مبلغ و صدور فوری فاکتور رسمی PDF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Student Picker */}
          <div>
            <label className="block text-xs font-bold text-[#341648] mb-1.5">
              انتخاب دانش‌آموز <span className="text-rose-500">*</span>
            </label>
            <div className="relative mb-2">
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="جست‌وجوی سریع با نام یا کد ملی..."
                className="w-full pl-4 pr-10 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs text-[#302735] focus:outline-hidden focus:border-[#62205f]"
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
            </div>

            {studentSearch.trim() && (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-[#e5dde8] divide-y divide-gray-100 bg-white mb-2 shadow-xs">
                {filteredStudents.length === 0 ? (
                  <div className="p-2.5 text-center text-gray-400">دانش‌آموزی یافت نشد</div>
                ) : (
                  visibleStudents.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleSelectStudent(st)}
                      className="w-full text-right p-2.5 hover:bg-[#fcf8fd] flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="font-bold text-[#341648]">{st.name}</span>
                        <span className="text-gray-400 mr-2">| پایه {st.grade}</span>
                      </div>
                      <span className="font-mono text-gray-400 text-[11px]">{st.national_id}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Selected Student Card */}
            {selectedStudent && (
              <div className="bg-[#fcfaff] p-3 rounded-2xl border border-[#ede5ef] flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#341648] text-sm flex items-center gap-2">
                    <span>{selectedStudent.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#f2eaf3] text-[#62205f] font-semibold">
                      پایه {selectedStudent.grade}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    کد ملی: <span className="font-mono">{selectedStudent.national_id}</span> | {selectedStudent.school_name}
                  </div>
                </div>

                <div className="text-left">
                  <div className="text-[10px] text-gray-400">مانده بدهی فعلی:</div>
                  <div className="font-bold font-mono text-rose-700 text-xs">
                    {studentBalance && studentBalance.balance > 0
                      ? `${formatRial(studentBalance.balance)} ریال`
                      : 'حساب تسویه'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Amount Field with Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#341648]">
                مبلغ شهریه فاکتور (ریال) <span className="text-rose-500">*</span>
              </label>
              {studentBalance && studentBalance.balance > 0 && (
                <button
                  type="button"
                  onClick={() => setTuitionAmount(Number(studentBalance.balance).toLocaleString('en-US'))}
                  className="text-[11px] font-bold text-[#62205f] hover:underline"
                >
                  استفاده از کل مانده بدهی ({formatRial(studentBalance.balance)})
                </button>
              )}
            </div>

            <input
              type="text"
              value={tuitionAmount}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                setTuitionAmount(raw ? Number(raw).toLocaleString('en-US') : '');
              }}
              placeholder="مثال: ۱۸۰,۰۰۰,۰۰۰"
              className="w-full px-4 py-3 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-sm font-mono text-left focus:outline-hidden focus:border-[#62205f]"
              dir="ltr"
            />

            {/* Quick Presets */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleApplyPreset(60000000)}
                className="flex-1 py-1 px-2 rounded-lg border border-[#e5dde8] bg-white text-[11px] font-semibold text-gray-600 hover:border-[#62205f]"
              >
                ۶۰ میلیون (قسط ۱)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(120000000)}
                className="flex-1 py-1 px-2 rounded-lg border border-[#e5dde8] bg-white text-[11px] font-semibold text-gray-600 hover:border-[#62205f]"
              >
                ۱۲۰ میلیون (قسط ۲)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(180000000)}
                className="flex-1 py-1 px-2 rounded-lg border border-[#e5dde8] bg-white text-[11px] font-semibold text-[#62205f] hover:border-[#62205f]"
              >
                ۱۸۰ میلیون (کل شهریه)
              </button>
            </div>
          </div>

          {/* Description & Date */}
          <div>
            <label className="block text-xs font-bold text-[#341648] mb-1.5">
              عنوان و شرح فاکتور
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: شهریه مصوب سال تحصیلی..."
              className="w-full px-4 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs text-[#302735] focus:outline-hidden"
            />
          </div>

          <JalaliDatePicker
            label="تاریخ صدور سند"
            value={invoiceDate}
            onChange={setInvoiceDate}
            required
          />

          {/* Record As New Debt Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#fcfaff] border border-[#ede5ef] cursor-pointer">
            <input
              type="checkbox"
              checked={recordAsNewDebt}
              onChange={(e) => setRecordAsNewDebt(e.target.checked)}
              className="mt-0.5 rounded text-[#62205f] focus:ring-[#62205f]"
            />
            <div>
              <span className="font-bold text-gray-800 text-xs">
                همزمان به عنوان بدهی جدید در سوابق و پرونده مالی دانش‌آموز ثبت شود
              </span>
              <p className="text-[11px] text-gray-400 mt-0.5">
                (در صورت غیرفعال بودن، فاکتور بر اساس سوابق مالی و مانده حساب کنونی صادر می‌گردد)
              </p>
            </div>
          </label>

          {/* Submit Action Buttons */}
          <div className="flex items-center gap-3 pt-3">
            <button
              type="submit"
              className="flex-1 py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: accentColor }}
            >
              <Printer className="w-4 h-4" />
              <span>مشاهده و چاپ فاکتور رسمی PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-3.5 px-4 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-sm font-semibold"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
