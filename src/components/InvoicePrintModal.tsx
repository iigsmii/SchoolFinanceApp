import React, { useEffect, useState } from 'react';
import appLogo from '../assets/images/quran_school_finance_logo_1792312844966.jpg';
import { Student, Transaction } from '../types';
import { jalaliFromGregorian, todayJalali, formatRial } from '../utils/jalali';
import { Printer, Download, X, Sparkles, PenTool, MessageSquare, LoaderCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SignatureUploader } from './SignatureUploader';

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
  const { managerSignature, setManagerSignature, accentColor, getStudentBalance } = useApp();
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    const handleAppBack = () => {
      if (showSignatureModal) setShowSignatureModal(false);
      else onClose();
    };
    window.addEventListener('app:back', handleAppBack);
    return () => window.removeEventListener('app:back', handleAppBack);
  }, [showSignatureModal, onClose]);

  const loadPdfScript = (src: string, test: () => boolean) => new Promise<void>((resolve, reject) => {
    if (test()) { resolve(); return; }
    const existing = document.querySelector(`script[data-pdf-lib="${src}"]`) as HTMLScriptElement | null;
    const script = existing || document.createElement('script');
    const finish = () => test() ? resolve() : reject(new Error('بارگذاری کتابخانه PDF انجام نشد.'));
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error('اتصال برای ساخت PDF برقرار نشد.')), { once: true });
    if (!existing) {
      script.src = src;
      script.async = true;
      script.dataset.pdfLib = src;
      document.head.appendChild(script);
    }
  });

  const handleDownloadPdf = async () => {
    setPdfError('');
    setIsPdfLoading(true);
    try {
      await loadPdfScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', () => typeof (window as any).html2canvas === 'function');
      await loadPdfScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => Boolean((window as any).jspdf?.jsPDF));
      const target = document.getElementById('printable-invoice');
      if (!target) throw new Error('محتوای فاکتور پیدا نشد.');
      const canvas = await (window as any).html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: Math.max(target.scrollWidth, 900),
      });
      const JsPDF = (window as any).jspdf.jsPDF;
      const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const pxPerMm = canvas.width / printableWidth;
      const pageHeightPx = Math.floor(printableHeight * pxPerMm);
      let offsetY = 0;
      let page = 0;
      while (offsetY < canvas.height) {
        const sliceHeight = Math.min(pageHeightPx, canvas.height - offsetY);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext('2d');
        if (!ctx) throw new Error('ساخت تصویر فاکتور در مرورگر ناموفق بود.');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        if (page > 0) pdf.addPage();
        const image = pageCanvas.toDataURL('image/jpeg', 0.94);
        pdf.addImage(image, 'JPEG', margin, margin, printableWidth, sliceHeight / pxPerMm, undefined, 'FAST');
        offsetY += sliceHeight;
        page += 1;
      }
      const safeName = (student.name || 'دانش‌آموز').replace(/[\\/:*?"<>|]/g, '-').trim();
      pdf.save(`رسید-شهریه-${safeName}-${student.id}.pdf`);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : 'ساخت فایل PDF ناموفق بود. اتصال اینترنت را بررسی کنید.');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handlePaymentSms = () => {
    const remaining = getStudentBalance(student.id).debt;
    const phone = (student.father_phone || student.phone || student.mother_phone || '').trim();
    if (!phone) {
      window.alert('برای این دانش‌آموز شماره تلفن ثبت نشده است.');
      return;
    }
    const message = `اولیای گرامی دانش‌آموز ${student.name}، از پرداخت شهریه شما سپاسگزاریم. مبلغ پرداختی ثبت شد و مانده شهریه ${formatRial(remaining)} ریال است. با احترام، مدرسة القرآن الکریم شهرضا`;
    const separator = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?';
    window.location.href = `sms:${phone}${separator}body=${encodeURIComponent(message)}`;
  };

  const studentTxs = transactions.filter((t) => t.student_id === student.id);
  const totalDebit = studentTxs.reduce((sum, t) => sum + (t.debit || 0), 0);
  const totalCredit = studentTxs.reduce((sum, t) => sum + (t.credit || 0), 0);

  return (
    <div className="invoice-print-root fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-[#d7e4ed] overflow-hidden my-auto">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-[#e5dde8] bg-[#f8f5f9]">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#341648]">پیش‌نمایش و صدور فاکتور رسمی</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSignatureModal(!showSignatureModal)}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-[#62205f] border border-purple-200 rounded-xl font-bold text-xs transition-all"
            >
              <PenTool className="w-3.5 h-3.5 text-[#62205f]" />
              <span>{managerSignature ? 'ویرایش امضای فاکتور' : 'افزودن امضای رسمی'}</span>
            </button>
            <button
              onClick={handlePaymentSms}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
              title="آماده‌سازی پیام تشکر و مانده شهریه در برنامه پیامک گوشی"
            >
              <MessageSquare className="w-4 h-4" />
              <span>ارسال پیامک تشکر</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isPdfLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#0f766e] text-white rounded-xl font-bold text-sm hover:bg-[#115e59] disabled:opacity-60 active:scale-95 transition-all shadow-sm"
              title="ساخت و دانلود مستقیم فایل PDF"
            >
              {isPdfLoading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isPdfLoading ? 'در حال ساخت PDF...' : 'دانلود PDF'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-[#62205f] text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm"
              style={{ backgroundColor: accentColor }}
            >
              <Printer className="w-4 h-4" />
              <span>چاپ یا ذخیره PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-200/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {pdfError && <div className="no-print mx-4 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{pdfError} اگر اینترنت در دسترس نیست، از گزینه «چاپ» استفاده کنید.</div>}

        {/* Signature Uploader Drawer if opened */}
        {showSignatureModal && (
          <div className="no-print p-4 bg-purple-50/50 border-b border-purple-200 animate-in fade-in duration-150">
            <SignatureUploader
              currentSignature={managerSignature}
              onSave={(sig) => {
                setManagerSignature(sig);
                setShowSignatureModal(false);
              }}
              title="بارگذاری و تنظیم امضای رسمی فاکتور"
              accentColor={accentColor}
            />
          </div>
        )}

        {/* Invoice Printable Area */}
        <div id="printable-invoice" className="p-6 sm:p-10 overflow-y-auto font-['Vazirmatn',sans-serif] bg-white text-[#232d3a] flex-1">
          {/* Header Banner */}
          <div className="bg-gradient-to-l from-[#172554] via-[#1e3a5f] to-[#0f766e] text-white p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shadow-md">
            <div className="flex items-center gap-3">
              <img
                src={appLogo}
                alt="لوگوی سیستم مالی مدرسة القرآن"
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-xl object-cover border border-amber-300/40 shrink-0 shadow-xs"
              />
              <div>
                <div className="text-xl sm:text-2xl font-black">{student.school_name || 'مدرسة القرآن الکریم شهرضا'}</div>
                <div className="text-sm sm:text-base font-semibold opacity-90 mt-0.5">فاکتور و ریز گردش حساب مالی دانش‌آموز</div>
              </div>
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
                <span className="font-semibold text-gray-500 w-28">مرکز آموزشی:</span>
                <span className="font-bold">{student.school_name || 'مدرسه القرآن'}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-gray-500 w-32">کد ملی:</span>
                <span className="font-mono font-bold">{student.national_id}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-gray-500 w-28">پایه تحصیلی:</span>
                <span className="font-bold">{student.grade}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-gray-500 w-32">شماره پدر:</span>
                <span className="font-mono">{student.father_phone || student.phone}</span>
              </div>
              <div className="flex">
                <span className="font-semibold text-gray-500 w-28">شماره مادر:</span>
                <span className="font-mono">{student.mother_phone || '—'}</span>
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
            <div className="p-4 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-900">
              <div className="text-xs font-semibold text-gray-500 mb-1">مجموع پرداختی‌های ثبت‌شده</div>
              <div className="text-base sm:text-xl font-black font-mono">
                {formatRial(totalCredit)} ریال
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="border border-[#ccd8e2] rounded-2xl overflow-hidden mb-6">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#1b365d] text-white">
                <tr>
                  <th className="p-3 text-center">ردیف</th>
                  <th className="p-3">تاریخ</th>
                  <th className="p-3">شرح تراکنش</th>
                  <th className="p-3 text-center">نوع</th>
                  <th className="p-3 text-left">بدهکار (ریال)</th>
                  <th className="p-3 text-left">بستانکار (ریال)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1ebf2]">
                {studentTxs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-400">
                      هیچ تراکنشی برای این دانش‌آموز ثبت نشده است.
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
              <div className="font-bold text-[#1b365d] text-sm mb-2">مهر و امضای امور مالی مدرسه</div>
              {managerSignature ? (
                <div className="h-16 flex items-center justify-center">
                  <img
                    src={managerSignature}
                    alt="امضای رسمی"
                    className="max-h-16 max-w-[180px] object-contain drop-shadow-xs"
                  />
                </div>
              ) : (
                <div className="text-[11px] text-gray-400 mt-6">..................................</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
