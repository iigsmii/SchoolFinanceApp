import React from 'react';
import { X, AlertCircle, RefreshCw, Trash2, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { describeFailedItem, FailedItemInput } from '../utils/outboxDescribe';

interface Props {
  item: FailedItemInput;
  onClose: () => void;
}

/** جزئیات یک مورد که در گوگل‌شیت ثبت نشد: کدام رکورد، چه مشخصاتی، چرا، و چه کاری می‌شود کرد. */
export const FailedSyncDialog: React.FC<Props> = ({ item, onClose }) => {
  const { students, schools, transactions, bankTransactions, cheques, setCurrentScreen, retryFailedSyncOne, dismissFailedSync } = useApp();
  const info = describeFailedItem(item, { students, schools, transactions, bankTransactions, cheques });

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 p-3" dir="rtl" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-3xl p-5 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-black text-[#341648]">{item.label}</div>
            {info.summary && <div className="text-xs text-gray-600 mt-0.5">{info.summary}</div>}
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="بستن"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 text-red-800 p-3 text-xs leading-6">
          <AlertCircle className="w-4 h-4 mt-1 shrink-0" />
          <span>{item.error || 'ثبت در گوگل‌شیت انجام نشد.'}</span>
        </div>

        {info.records.length === 0 && (
          <p className="text-xs text-gray-500">رکورد مربوطه روی این دستگاه دیگر پیدا نشد (ممکن است حذف یا با نسخهٔ سرور جایگزین شده باشد).</p>
        )}
        {info.records.map((r, i) => (
          <div key={i} className="rounded-2xl border border-[#e5dde8] overflow-hidden">
            <div className="px-3 py-1.5 bg-[#f7f2f8] text-xs font-black text-[#341648]">{r.title}</div>
            <div className="divide-y divide-gray-100">
              {r.fields.map((f, j) => (
                <div key={j} className={`flex items-start justify-between gap-3 px-3 py-1.5 text-xs ${f.warn ? 'bg-amber-50 text-amber-900 font-bold' : ''}`}>
                  <span className="text-gray-500 shrink-0">{f.label}</span>
                  <span className="text-left font-semibold text-gray-800 break-words min-w-0">{f.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button type="button" onClick={() => { retryFailedSyncOne(item.key); onClose(); }} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-600 text-white text-xs font-black">
            <RefreshCw className="w-4 h-4" /> تلاش مجدد
          </button>
          <button type="button" onClick={() => { dismissFailedSync(item.key); onClose(); }} className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-200 text-red-700 text-xs font-black">
            <Trash2 className="w-4 h-4" /> حذف از صف
          </button>
          {info.screen && (
            <button type="button" onClick={() => { setCurrentScreen(info.screen!); onClose(); }} className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-[#e5dde8] text-[#341648] text-xs font-black">
              <ArrowLeft className="w-4 h-4" /> رفتن به {info.screenLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
