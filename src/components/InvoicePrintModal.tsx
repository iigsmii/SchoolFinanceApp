import React from 'react';
import { Student, Transaction } from '../types';
import { jalaliFromGregorian, todayJalali, formatRial } from '../utils/jalali';
import { Printer, Download, X } from 'lucide-react';

interface InvoicePrintModalProps {
  student: Student;
  transactions: Transaction[];
  balance: number;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  student,
  transactions,
  balance,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const studentTxs = transactions.filter((t) => t.student_id === student.id);
  const totalDebit = studentTxs.reduce((sum, t) => sum + (t.debit || 0), 0);
  const totalCredit = studentTxs.reduce((sum, t) => sum + (t.credit || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#e5dde8] overflow-hidden my-auto">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-[#e5dde8] bg-[#f8f5f9]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#341648]">پیش‌نمایش و صدور فاکتور رسمی</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-[#62205f] text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" />
              چاپ یا ذخیره PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-200/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Area */}
        <div id="printable-invoice" className="p-6 sm:p-10 overflow-y-auto font-['Vazirmatn',sans-serif] bg-white text-[#232d3a] flex-1">
          {/* Header Banner matching Android PdfDocument */}
          <div className="bg-[#1b365d] text-white p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shadow-md">
            <div>
              <div className="text-xl sm:text-2xl font-black">{student.school_name || 'مجموعه مدارس مدرسة القرآن'}</div>
              <div className="text-sm sm:text-base font-semibold opacity-90 mt-1">فاکتور و ریز گردش حساب دانش‌آموز</div>
            </div>
            <div className="text-xs sm:text-sm font-medium text-right sm:text-left bg-white/10 px-4 py-2 rounded-xl backdrop-blur-xs">
              <div>تاریخ صدور: {todayJalali()}</div>
              <div>شماره پرونده: {student.id}</div>
              {student.parsian_code && <div>کد پارسیان: {student.parsian_code}</div>}
            </div>
          </div>

          {/* Student Details Card */}
          <div className="bg-[#eff6fa] border border-[#ccd8e2] rounded-2xl p-5 mb-6">
            <div className="text-sm font-bold text-[#1b365d] mb-3 pb-2 border-b border-[#ccd8e2]">مشخصات دانش‌آموز</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-xs sm:text-sm">
              <div className="flex">
                <span className="font-semibold text-gray-500 w-32">نام و نام خانوادگی:</span>
                <span className="font-bold text-[#1b365d]">{student.name}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-gray-500 w-28">مدرسه:</span>
                <span className="font-bold">{student.school_name || 'دبستان'}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-gray-500 w-32">کد ملی:</span>
                <span className="font-mono font-bold">{student.national_id}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-gray-500 w-28">شماره تماس:</span>
                <span className="font-mono">{student.phone}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-gray-500 w-32">پایه تحصیلی:</span>
                <span className="font-bold">{student.grade}</span>
              </div>
            </div>
          </div>

          {/* Balance Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`p-4 rounded-2xl border ${balance > 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-xs font-semibold text-gray-500 mb-1">مانده بدهی شهریه</div>
              <div className="text-base sm:text-xl font-black font-mono">
                {balance > 0 ? `${formatRial(balance)} ریال` : '۰ ریال'}
              </div>
            </div>
            <div className={`p-4 rounded-2xl border ${balance < 0 ? 'bg-teal-50 border-teal-200 text-teal-900' : 'bg-gray-50 border-gray-200'}`}>
              <div className="text-xs font-semibold text-gray-500 mb-1">مانده بستانکاری</div>
              <div className="text-base sm:text-xl font-black font-mono text-teal-700">
                {balance < 0 ? `${formatRial(Math.abs(balance))} ریال` : '۰ ریال (تسویه)'}
              </div>
            </div>
          </div>

          {/* Table Header and Rows matching Android PDF */}
          <div className="overflow-x-auto rounded-xl border border-[#ccd8e2] mb-6 shadow-xs">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-[#167d7d] text-white">
                <tr>
                  <th className="p-3 font-bold text-center w-12">ردیف</th>
                  <th className="p-3 font-bold w-28">تاریخ</th>
                  <th className="p-3 font-bold">شرح و توضیحات</th>
                  <th className="p-3 font-bold w-24 text-center">نوع سند</th>
                  <th className="p-3 font-bold w-32 text-left">بدهکار (ریال)</th>
                  <th className="p-3 font-bold w-32 text-left">بستانکار (ریال)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ccd8e2]">
                {studentTxs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500 font-medium">
                      هنوز گردشی برای این دانش‌آموز ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  studentTxs.map((t, idx) => {
                    const isDebt = t.kind === 'شهریه_بدهی' || t.debit > 0;
                    return (
                      <tr key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#eff6fa]'}>
                        <td className="p-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                        <td className="p-3 font-mono font-medium text-gray-700">{jalaliFromGregorian(t.date)}</td>
                        <td className="p-3">
                          <div className="font-semibold text-[#1b365d]">{t.description || t.comment || '—'}</div>
                          {t.tracking_code && (
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              روش: {t.payment_method || 'بانک'} | پیگیری: {t.tracking_code}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              isDebt ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isDebt ? 'بدهی' : 'پرداخت'}
                          </span>
                        </td>
                        <td className="p-3 text-left font-mono font-bold text-gray-900">
                          {isDebt ? formatRial(t.debit) : '—'}
                        </td>
                        <td className="p-3 text-left font-mono font-bold text-teal-700">
                          {!isDebt ? formatRial(t.credit) : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-[#f0f4f8] font-bold border-t-2 border-[#167d7d]">
                <tr>
                  <td colSpan={4} className="p-3 text-right">جمع کل گردش:</td>
                  <td className="p-3 text-left font-mono text-gray-900">{formatRial(totalDebit)}</td>
                  <td className="p-3 text-left font-mono text-teal-700">{formatRial(totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer Official Seal and Signature */}
          <div className="pt-6 border-t border-gray-200 flex justify-between items-end text-xs text-gray-500">
            <div>
              <div>این سند به‌صورت سیستمی توسط سامانه مالی مدرسة القرآن صادر شده است.</div>
              <div className="mt-1 font-mono text-[10px]">کد امنیتی یکتا: SF-{student.id}-{Date.now().toString(36)}</div>
            </div>
            <div className="text-center pl-8">
              <div className="font-bold text-[#1b365d] text-sm mb-8">مهر و امضای امور مالی مدرسه</div>
              <div className="text-[11px] text-gray-400">..................................</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
