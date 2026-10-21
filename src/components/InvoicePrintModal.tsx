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
  const { managerSignature, setManagerSignature, accentColor, getStudentBalance, smsConfig } = useApp();
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [paperSize, setPaperSize] = useState<'a4' | 'a5'>('a4');
  const [showSmsOptions, setShowSmsOptions] = useState(false);
  const [smsRecipient, setSmsRecipient] = useState<'mother' | 'father'>('mother');
  const [smsMethod, setSmsMethod] = useState<'phone' | 'system'>('phone');
  const [hadithRandomSeed] = useState(() => Math.random());

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
    let script = document.querySelector(`script[data-pdf-lib="${src}"]`) as HTMLScriptElement | null;
    if (script && script.dataset.failed === 'true') { script.remove(); script = null; }
    if (script?.dataset.loaded === 'true' && !test()) { script.remove(); script = null; }
    const target = script || document.createElement('script');
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (test()) {
        target.dataset.loaded = 'true';
        resolve();
      } else {
        target.dataset.failed = 'true';
        reject(new Error('کتابخانه PDF بارگذاری شد اما قابل استفاده نیست.'));
      }
    };
    target.addEventListener('load', finish, { once: true });
    target.addEventListener('error', () => {
      if (settled) return;
      settled = true;
      target.dataset.failed = 'true';
      reject(new Error('بارگذاری کتابخانه PDF ناموفق بود؛ اتصال اینترنت را بررسی و دوباره تلاش کنید.'));
    }, { once: true });
    if (!script) {
      target.src = src;
      target.async = true;
      target.dataset.pdfLib = src;
      document.head.appendChild(target);
    }
  });

  const handleDownloadPdf = async () => {
    setPdfError('');
    setIsPdfLoading(true);
    try {
      await loadPdfScript('https://unpkg.com/html2canvas-pro@1.5.11/dist/html2canvas-pro.min.js', () => typeof (window as any).html2canvas === 'function');
      await loadPdfScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => Boolean((window as any).jspdf?.jsPDF));
      const target = document.getElementById('printable-invoice');
      if (!target) throw new Error('محتوای فاکتور پیدا نشد.');
      const canvas = await (window as any).html2canvas(target, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: Math.max(target.scrollWidth, 900),
        onclone: (clonedDocument: Document) => {
          const clonedInvoice = clonedDocument.getElementById('printable-invoice');
          if (clonedInvoice) {
            clonedInvoice.style.overflow = 'visible';
            clonedInvoice.style.height = 'auto';
            clonedInvoice.style.maxHeight = 'none';
          }
        },
      });
      const JsPDF = (window as any).jspdf.jsPDF;
      const pdf = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = paperSize === 'a4' ? 210 : 148;
      const pageHeight = paperSize === 'a4' ? 297 : 210;
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
      setPdfError((error instanceof Error ? error.message : 'ساخت فایل PDF ناموفق بود.') + ' پنجره چاپ باز می‌شود؛ در مقصد چاپ، «ذخیره به‌صورت PDF» را انتخاب کنید.');
      // Fallback for Android WebView or blocked external PDF libraries.
      window.setTimeout(() => window.print(), 250);
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handlePaymentSms = () => {
    const remaining = getStudentBalance(student.id).debt;
    const preferredPhone = smsRecipient === 'mother'
      ? (student.mother_phone || '')
      : (student.father_phone || student.phone || '');
    const phone = preferredPhone.trim();
    if (!phone) {
      window.alert(smsRecipient === 'mother'
        ? 'شماره تلفن مادر ثبت نشده است.'
        : 'شماره تلفن پدر ثبت نشده است.');
      return;
    }
    const latestPayment = transactions
      .filter((t) => t.student_id === student.id && t.kind === 'شهریه' && (t.credit || 0) > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    if (!latestPayment) {
      window.alert('برای این دانش‌آموز پرداخت شهریه‌ای ثبت نشده است؛ ابتدا پرداخت را ثبت کنید.');
      return;
    }
    const paidAmount = latestPayment.credit || latestPayment.amount || 0;
    const paymentDate = latestPayment.jalali_date || jalaliFromGregorian(latestPayment.date);
    const message = `ولی گرامی دانش‌آموز ${student.name}، پرداخت شهریه به مبلغ ${formatRial(paidAmount)} ریال در تاریخ ${paymentDate} ثبت شد. مانده شهریه: ${formatRial(remaining)} ریال. با احترام، مدرسة القرآن الکریم شهرضا`;
    if (smsMethod === 'phone') {
      const separator = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? '&' : '?';
      window.location.href = `sms:${phone}${separator}body=${encodeURIComponent(message)}`;
      setShowSmsOptions(false);
      return;
    }
    if (!smsConfig.enabled || !smsConfig.apiUrl || !smsConfig.apiKey) {
      window.alert('برای ارسال از سامانه، ابتدا پنل پیامک و اطلاعات وب‌سرویس را در بخش «سامانه پیامک» تنظیم و فعال کنید. این برنامه در حال حاضر ارسال مستقیم از این صفحه را به وب‌سرویس متصل نکرده است.');
      return;
    }
    window.alert('ارسال مستقیم از پنل پیامک هنوز در این صفحه پیاده‌سازی نشده است؛ برای جلوگیری از ثبت ارسالِ غیرواقعی، پیامک ارسال نشد. فعلاً «از گوشی» را انتخاب کنید یا از صفحه «سامانه پیامک» استفاده کنید.');
  };
  const studentTxs = transactions
    .filter((t) => t.student_id === student.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const totalDebit = studentTxs.reduce((sum, t) => sum + (t.debit || 0), 0);
  const totalCredit = studentTxs.reduce((sum, t) => sum + (t.credit || 0), 0);

  return (
    <div className="invoice-print-root fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-[#d7e4ed] overflow-hidden my-auto">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-3 sm:px-6 py-3 sm:py-4 border-b border-[#e5dde8] bg-[#f8f5f9] w-full min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-sm font-bold text-[#341648]">پیش‌نمایش و صدور فاکتور رسمی</span>
            <button onClick={onClose} className="sm:hidden p-2 text-gray-500 rounded-xl hover:bg-gray-200/50" aria-label="بستن پیش‌نمایش"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shrink-0" aria-label="اندازه برگه PDF">
              <span className="px-1 text-[11px] font-bold text-slate-500">برگه</span>
              <button type="button" onClick={() => setPaperSize('a4')} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${paperSize === 'a4' ? 'bg-[#1b365d] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>A4</button>
              <button type="button" onClick={() => setPaperSize('a5')} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${paperSize === 'a5' ? 'bg-[#1b365d] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>A5</button>
            </div>
            <button
              onClick={() => setShowSignatureModal(!showSignatureModal)}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-[#62205f] border border-purple-200 rounded-xl font-bold text-xs transition-all"
            >
              <PenTool className="w-3.5 h-3.5 text-[#62205f]" />
              <span>{managerSignature ? 'ویرایش امضای فاکتور' : 'افزودن امضای رسمی'}</span>
            </button>
            <button
              onClick={() => setShowSmsOptions((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
              title="آماده‌سازی پیام تشکر و مانده شهریه در برنامه پیامک گوشی"
            >
              <MessageSquare className="w-4 h-4" />
              <span>ارسال پیامک تشکر</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isPdfLoading}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#62205f] text-white rounded-xl font-bold text-sm whitespace-nowrap hover:opacity-90 active:scale-95 transition-all shadow-sm disabled:opacity-60"
              style={{ backgroundColor: accentColor }}
            >
              {isPdfLoading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>{isPdfLoading ? "در حال آماده‌سازی..." : "چاپ / ذخیره PDF"}</span>
            </button>
            <button
              onClick={onClose}
              className="hidden sm:block p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-200/50 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showSmsOptions && (
          <div className="no-print mx-4 mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-3">
            <div className="font-bold text-sm text-sky-950">تنظیم ارسال پیام به ولی دانش‌آموز</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                گیرنده پیام
                <select value={smsRecipient} onChange={(e) => setSmsRecipient(e.target.value as 'mother' | 'father')} className="rounded-xl border border-slate-300 bg-white p-2.5 text-sm">
                  <option value="mother">مادر {student.mother_phone ? `(${student.mother_phone})` : '(شماره ثبت نشده)'}</option>
                  <option value="father">پدر {student.father_phone || student.phone ? `(${student.father_phone || student.phone})` : '(شماره ثبت نشده)'}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
                روش ارسال
                <select value={smsMethod} onChange={(e) => setSmsMethod(e.target.value as 'phone' | 'system')} className="rounded-xl border border-slate-300 bg-white p-2.5 text-sm">
                  <option value="phone">از پیامک گوشی</option>
                  <option value="system">از سامانه پیامک مدرسه</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handlePaymentSms} className="rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: accentColor }}>ادامه</button>
              <button type="button" onClick={() => setShowSmsOptions(false)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">انصراف</button>
            </div>
          </div>
        )}

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

        <style>{`@media print { @page { size: ${paperSize} portrait; margin: 8mm; } .no-print { display: none !important; } .invoice-print-root { position: static !important; inset: auto !important; display: block !important; background: white !important; padding: 0 !important; overflow: visible !important; } #printable-invoice { overflow: visible !important; max-height: none !important; } }`}</style>

        {/* Invoice Printable Area */}
        <div id="printable-invoice" className="p-4 sm:p-10 overflow-y-auto overflow-x-auto font-['Vazirmatn',sans-serif] bg-white text-[#232d3a] flex-1 min-w-0">
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
                          <div className="font-semibold text-[#1b365d]">{isDebt ? (t.description || t.comment || 'ثبت بدهی شهریه') : 'پرداخت بابت شهریه مصوب'}</div>
                          {!isDebt && (t.description || t.comment) && <div className="mt-0.5 text-[10px] text-gray-500">جزئیات: {t.description || t.comment}</div>}
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

          {/* Closing balance and thank-you note */}
          <div className="mb-5 rounded-2xl border-2 border-[#1b365d] bg-[#f3f7fb] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-[#1b365d]">مانده نهایی حساب شهریه</div>
                <div className="mt-1 text-[11px] text-gray-500">بر اساس گردش‌های ثبت‌شده تا تاریخ صدور این فاکتور</div>
              </div>
              <div className={`text-xl sm:text-2xl font-black font-mono ${balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {balance > 0 ? `${formatRial(balance)} ریال بدهکار` : balance < 0 ? `${formatRial(Math.abs(balance))} ریال بستانکار` : '۰ ریال — تسویه‌شده'}
              </div>
            </div>
          </div>
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-xs sm:text-sm leading-7 text-emerald-900">
            <div className="font-black">با سپاس از اعتماد و پرداخت به‌موقع شما</div>
            از همراهی شما خانواده گرامی در تأمین هزینه‌های آموزشی و تربیتی فرزندانمان صمیمانه سپاسگزاریم. برای دانش‌آموز عزیزتان، توفیق و پیشرفت روزافزون آرزومندیم.
          </div>
          {/* Random Shia narration: choose once for each invoice preview */}
          {(() => {
            const shiaNarrations = [
              {
                narrator: 'امیرالمؤمنین علیه‌السلام',
                text: '«عَلَى الإِنصافِ تَرسَخُ المَوَدَّةُ»',
                meaning: 'انصاف، دوستی را استوار می‌کند.',
                source: 'غرر الحکم و درر الکلم، حدیث ۶۱۹۰'
              },
              {
                narrator: 'امیرالمؤمنین علیه‌السلام',
                text: '«زَكاةُ القُدرَةِ الإِنصافُ»',
                meaning: 'زکات و شکرانه قدرت، رعایت انصاف است.',
                source: 'غرر الحکم و درر الکلم، حدیث ۵۴۴۸'
              },
              {
                narrator: 'امیرالمؤمنین علیه‌السلام',
                text: '«الأَمانَةُ تُؤَدّي إِلَى الصِّدقِ»',
                meaning: 'امانت‌داری به راستگویی می‌انجامد.',
                source: 'غرر الحکم و درر الکلم؛ میزان الحکمة، باب امانت'
              },
              {
                narrator: 'امیرالمؤمنین علیه‌السلام',
                text: '«إِذا قَوِيَتِ الأَمانَةُ كَثُرَ الصِّدقُ»',
                meaning: 'هرگاه امانت‌داری نیرومند شود، راستگویی فراوان می‌شود.',
                source: 'غرر الحکم و درر الکلم؛ میزان الحکمة، باب امانت'
              },
              {
                narrator: 'امیرالمؤمنین علیه‌السلام',
                text: '«الأَمانَةُ وَالوَفاءُ صِدقُ الأَفعالِ»',
                meaning: 'امانت‌داری و وفای به عهد، راستی در کردار است.',
                source: 'غرر الحکم و درر الکلم؛ میزان الحکمة، باب امانت'
              },
              {
                narrator: 'امام جعفر صادق (علیه‌السلام)',
                text: '«إِنَّ اللَّهَ لَمْ يَبْعَثْ نَبِيّاً إِلَّا بِصِدْقِ الْحَدِيثِ وَأَدَاءِ الْأَمَانَةِ»',
                meaning: 'خداوند هیچ پیامبری را نفرستاد مگر با راستگویی و ادای امانت.',
                source: 'الکافی، جلد ۲، صفحه ۱۰۴؛ و جلد ۵، صفحه ۱۳۳'
              },
              {
                narrator: 'پیامبر اکرم (صلی‌الله‌علیه‌وآله)',
                text: '«لا إيمانَ لِمَن لا أَمانَةَ لَهُ»',
                meaning: 'کسی که امانت‌دار نیست، ایمان کامل ندارد.',
                source: 'الأمالی شیخ صدوق؛ نقل‌شده در میزان الحکمة، باب امانت'
              },
              {
                narrator: 'امیرالمؤمنین علیه‌السلام',
                text: '«مَن عُرِفَ بِالكَذِبِ لَمْ يُقْبَلْ صِدْقُهُ»',
                meaning: 'کسی که به دروغگویی شناخته شود، سخن راستش نیز پذیرفته نمی‌شود.',
                source: 'غرر الحکم و درر الکلم، حدیث ۸۰۱۰'
              },
              {
                narrator: 'امیرالمؤمنین علیه‌السلام',
                text: '«لَيسَ مِنَ العَدلِ القَضاءُ عَلَى الثِّقَةِ بِالظَّنِّ»',
                meaning: 'داوری درباره فرد امین بر پایه گمان، از عدالت نیست.',
                source: 'غرر الحکم و درر الکلم، حدیث ۷۵۰۰'
              },
              {
                narrator: 'امیرالمؤمنین علیه‌السلام',
                text: '«أَدُّوا الأَمانَةَ وَلَوْ إِلَى قَتَلَةِ أَوْلادِ الأَنْبِياءِ»',
                meaning: 'امانت را ادا کنید، حتی اگر صاحب آن با شما دشمن باشد.',
                source: 'بحار الأنوار، جلد ۷۵، صفحه ۱۱۵؛ نقل از منابع روایی شیعه'
              },
              {
                narrator: 'امام جعفر صادق (علیه‌السلام)',
                text: '«أَنْصِفِ النَّاسَ مِنْ نَفْسِكَ»',
                meaning: 'با مردم منصفانه رفتار کن و انصاف را از خودت آغاز کن.',
                source: 'الکافی، جلد ۲، صفحه ۴۷۴، باب الإنصاف والعدل'
              },
              {
                narrator: 'امام جعفر صادق (علیه‌السلام)',
                text: '«وَمُؤَاسَاتُكَ الْأَخَ فِي الْمَالِ»',
                meaning: 'از نشانه‌های نیکی، یاری و همراهی برادر دینی در امور مالی است.',
                source: 'الکافی، جلد ۲، صفحه ۴۷۴، باب الإنصاف والعدل'
              }
            ];
            const narration = shiaNarrations[Math.floor(hadithRandomSeed * shiaNarrations.length)];
            return (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
                <div className="mb-1 text-[11px] font-bold text-amber-900">حدیثی از منابع شیعه درباره اخلاق و امانت‌داری</div>
                <div className="mb-1 text-[11px] font-bold text-[#5b4218]">{narration.narrator}</div>
                <div className="text-sm font-bold leading-7 text-[#5b4218]">{narration.text}</div>
                <div className="mt-1 text-[11px] leading-5 text-amber-900">{narration.meaning}</div>
                <div className="mt-1 text-[10px] text-amber-800">منبع: {narration.source}</div>
              </div>
            );
          })()}

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
