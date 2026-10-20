import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { Student, Transaction } from '../../types';
import { InvoicePrintModal } from '../InvoicePrintModal';
import { formatRial, jalaliFromGregorian } from '../../utils/jalali';
import { matchesStudentSearch } from '../../utils/studentSearch';
import {
  Search,
  FileText,
  Printer,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  User,
} from 'lucide-react';

export const StatementScreen: React.FC = () => {
  const {
    students,
    transactions,
    currentUser,
    accentColor,
    getStudentBalance,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showExpenseLedger, setShowExpenseLedger] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const availableStudents = students.filter((s) => {
    if (!isSenior && s.school_id !== currentUser?.school_id) return false;
    return matchesStudentSearch(s, searchQuery);
  });
  const visibleStudents = availableStudents.slice(0, 50);

  const handleSelectStudent = (st: Student) => {
    setSelectedStudent(st);
    setShowExpenseLedger(false);
    setSearchQuery('');
  };

  const studentTxs = selectedStudent
    ? transactions.filter((t) => t.student_id === selectedStudent.id)
    : [];

  const balanceData = selectedStudent ? getStudentBalance(selectedStudent.id) : null;

  const expenseTxs = transactions.filter((t) => {
    if (t.kind !== 'هزینه') return false;
    if (!isSenior && t.school_id !== currentUser?.school_id) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-12">
      <Header title="ریز گردش حساب و فاکتور" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Search Student Box */}
        <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جست‌وجوی نام یا کد ملی دانش‌آموز جهت صدور فاکتور..."
                className="w-full pl-4 pr-11 py-3 bg-[#fdfcfd] rounded-2xl border border-[#e5dde8] text-sm text-[#302735] focus:outline-hidden focus:border-[#62205f]"
              />
              <Search className="w-5 h-5 text-gray-400 absolute right-3.5 top-3.5" />
            </div>

            <button
              onClick={() => {
                setShowExpenseLedger(!showExpenseLedger);
                setSelectedStudent(null);
              }}
              className={`px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm border transition-all flex items-center justify-center gap-2 ${
                showExpenseLedger
                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                  : 'bg-white text-gray-700 border-[#e5dde8] hover:bg-gray-50'
              }`}
            >
              <Receipt className="w-4 h-4 text-purple-600" />
              <span>{showExpenseLedger ? 'بستن هزینه‌ها' : 'نمایش تاریخچه هزینه‌ها'}</span>
            </button>
          </div>

          {searchQuery.trim() && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-2xl border border-[#e5dde8] divide-y divide-gray-100 bg-white shadow-md">
              {availableStudents.length === 0 ? (
                <div className="p-3 text-center text-xs text-gray-500">دانش‌آموزی پیدا نشد</div>
              ) : (
                visibleStudents.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => handleSelectStudent(st)}
                    className="w-full text-right p-3 hover:bg-[#fcf8fd] flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-bold text-[#341648]">{st.name}</span>
                      <span className="text-gray-400 mr-2">| پایه {st.grade}</span>
                      <span className="text-gray-400 mr-2">| {st.school_name}</span>
                    </div>
                    <span className="font-mono text-gray-500">{st.national_id}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Expense Ledger Mode */}
        {showExpenseLedger && (
          <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-sm space-y-4">
            <h3 className="text-base font-black text-[#341648] pb-3 border-b border-[#e5dde8]">
              تاریخچه گردش هزینه‌های مدرسه ({expenseTxs.length} سند)
            </h3>
            {expenseTxs.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400">هزینه‌ای ثبت نشده است.</div>
            ) : (
              <div className="space-y-3">
                {expenseTxs.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl border border-[#ede5ef] bg-[#fcfaff] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#341648] text-sm">
                        {t.expense_category_name || t.description}
                      </div>
                      <div className="text-gray-500 mt-1">
                        تاریخ: {jalaliFromGregorian(t.date)} | پیگیری: {t.tracking_code || '—'} | منبع:{' '}
                        {t.payment_source === 'own' ? 'حساب شخصی مدیر' : 'بانک مدرسه'}
                      </div>
                    </div>
                    <div className="font-black font-mono text-purple-900 text-sm">
                      {formatRial(t.amount)} ریال
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected Student Ledger */}
        {selectedStudent && (
          <div className="space-y-4">
            {/* Student Header Card */}
            <div className="bg-white rounded-3xl p-6 border border-[#e5dde8] shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="text-xs text-gray-500 font-semibold mb-0.5">ریز گردش حساب دانش‌آموز:</div>
                <h2 className="text-xl font-black text-[#341648] flex items-center gap-2">
                  <span>{selectedStudent.name}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-lg bg-[#f2eaf3] text-[#62205f] font-bold">
                    پایه {selectedStudent.grade}
                  </span>
                </h2>
                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4">
                  <span>کد ملی: <span className="font-mono">{selectedStudent.national_id}</span></span>
                  <span>مدرسه: {selectedStudent.school_name}</span>
                  <span>کد پارسیان: <span className="font-mono">{selectedStudent.parsian_code}</span></span>
                </div>
              </div>

              <button
                onClick={() => setIsInvoiceModalOpen(true)}
                className="w-full sm:w-auto py-3 px-5 rounded-2xl text-white font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: accentColor }}
              >
                <FileText className="w-5 h-5" />
                دریافت فاکتور رسمی PDF
              </button>
            </div>

            {/* Balance Status Banner */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
                <div className="text-xs font-semibold text-gray-500 mb-1">مانده بدهی</div>
                <div className="text-lg font-black font-mono text-rose-800">
                  {balanceData && balanceData.balance > 0
                    ? `${formatRial(balanceData.balance)} ریال`
                    : '۰ ریال'}
                </div>
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-center">
                <div className="text-xs font-semibold text-gray-500 mb-1">مانده بستانکاری</div>
                <div className="text-lg font-black font-mono text-teal-800">
                  {balanceData && balanceData.balance < 0
                    ? `${formatRial(Math.abs(balanceData.balance))} ریال`
                    : '۰ ریال'}
                </div>
              </div>
            </div>

            {/* Transactions Ledger Table */}
            <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-sm">
              <h3 className="text-sm font-bold text-[#341648] mb-4">گردش تفصیلی حساب</h3>

              {studentTxs.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400">گردشی برای این دانش‌آموز ثبت نشده است.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-[#e5dde8] text-gray-400 font-bold">
                        <th className="pb-3 text-center w-10">ردیف</th>
                        <th className="pb-3 w-28">تاریخ</th>
                        <th className="pb-3">شرح</th>
                        <th className="pb-3 text-center w-20">نوع</th>
                        <th className="pb-3 text-left w-32">بدهکار (ریال)</th>
                        <th className="pb-3 text-left w-32">بستانکار (ریال)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f2eaf3]">
                      {studentTxs.map((t, idx) => {
                        const isDebt = t.kind === 'شهریه_بدهی';
                        return (
                          <tr key={t.id} className="hover:bg-[#fcfaff]">
                            <td className="py-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                            <td className="py-3 font-mono font-medium text-gray-600">
                              {jalaliFromGregorian(t.date)}
                            </td>
                            <td className="py-3">
                              <span className="font-semibold text-gray-900">{t.description || t.comment || '—'}</span>
                              {t.tracking_code && (
                                <span className="text-gray-400 mr-2 font-mono">({t.tracking_code})</span>
                              )}
                            </td>
                            <td className="py-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  isDebt ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {isDebt ? 'بدهی' : 'پرداخت'}
                              </span>
                            </td>
                            <td className="py-3 text-left font-mono font-bold text-gray-900">
                              {isDebt ? formatRial(t.amount) : '—'}
                            </td>
                            <td className="py-3 text-left font-mono font-bold text-teal-700">
                              {!isDebt ? formatRial(t.amount) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {!selectedStudent && !showExpenseLedger && (
          <div className="bg-white rounded-3xl p-10 text-center text-gray-400 border border-[#e5dde8]">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold">دانش‌آموزی انتخاب نشده است.</p>
            <p className="text-xs text-gray-400 mt-1">
              جهت صدور فاکتور یا مشاهده صورتحساب مالی، دانش‌آموز را از کادر بالا جست‌وجو نمایید.
            </p>
          </div>
        )}
      </main>

      {/* Invoice Modal for Printing & PDF */}
      {isInvoiceModalOpen && selectedStudent && (
        <InvoicePrintModal
          student={selectedStudent}
          transactions={transactions}
          balance={balanceData?.balance || 0}
          onClose={() => setIsInvoiceModalOpen(false)}
        />
      )}
    </div>
  );
};
