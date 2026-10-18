import React from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { QuickInvoiceModal } from '../QuickInvoiceModal';
import { FileText } from 'lucide-react';

/**
 * صفحهٔ مستقل «صدور فاکتور سریع»
 * همان فرم صدور فاکتور را در قالب یک صفحهٔ اختصاصی (مثل صفحهٔ دانش‌آموزان/مدیران)
 * نمایش می‌دهد. بستن فرم، کاربر را به صفحهٔ قبل برمی‌گرداند.
 */
export const QuickInvoiceScreen: React.FC = () => {
  const { goBack, accentColor } = useApp();

  return (
    <div className="w-full max-w-full min-h-screen overflow-x-hidden bg-[#f8f5f9] pb-12">
      <Header title="صدور سریع فاکتور" />

      <main className="w-full max-w-4xl mx-auto px-4 py-6 space-y-5 box-border">
        <div className="bg-white rounded-3xl p-5 border border-[#e5dde8] shadow-xs flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: accentColor }}
          >
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#341648]">صدور فاکتور سریع شهریه</h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              دانش‌آموز را انتخاب کنید، مبلغ و شرح را تعیین کنید و فاکتور رسمی را برای چاپ یا ذخیرهٔ PDF صادر نمایید.
              این صفحه همان امکانات مودال فاکتور سریع را در قالب یک صفحهٔ مستقل فراهم می‌کند.
            </p>
          </div>
        </div>
      </main>

      {/* The invoice form itself, rendered as a page-level sheet */}
      <QuickInvoiceModal isOpen onClose={goBack} />
    </div>
  );
};
