import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, Eye, Sparkles, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { compressReceiptImage, CompressionResult } from '../utils/imageCompressor';

interface ReceiptImageUploaderProps {
  label?: string;
  value?: string;
  onChange: (dataUrl: string) => void;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export const ReceiptImageUploader: React.FC<ReceiptImageUploaderProps> = ({
  label = 'تصویر فاکتور / رسید پرداخت',
  value,
  onChange,
  required = true,
  error,
  helperText = 'ارسال عکس الزامی است؛ تصاویر به صورت خودکار بدون افت کیفیت کم‌حجم می‌شوند.',
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [isCompressing, setIsCompressing] = useState(false);
  const [stats, setStats] = useState<CompressionResult | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFileProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setLocalError(null);
    setIsCompressing(true);

    try {
      const res = await compressReceiptImage(file, 1280, 0.8);
      setStats(res);
      onChange(res.dataUrl);
    } catch (err: any) {
      setLocalError(err?.message || 'خطا در بارگذاری تصویر');
    } finally {
      setIsCompressing(false);
      // reset inputs so same file can be selected again if needed
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onChange('');
    setStats(null);
    setLocalError(null);
  };

  return (
    <div className="space-y-2">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileProcess}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileProcess}
        className="hidden"
      />

      {/* Label and mandatory badge */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-[#341648]">
          {label} {required && <span className="text-rose-500 font-bold">* (الزامی)</span>}
        </label>
        {value && (
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            عکس الصاق شد
          </span>
        )}
      </div>

      {/* Upload card */}
      <div
        className={`p-3.5 rounded-2xl border transition-all ${
          !value && required
            ? 'bg-rose-50/40 border-rose-300'
            : value
            ? 'bg-emerald-50/30 border-emerald-200'
            : 'bg-[#fcfaff] border-[#e5dde8]'
        }`}
      >
        {isCompressing ? (
          <div className="py-6 flex flex-col items-center justify-center gap-2 text-purple-800">
            <Loader2 className="w-7 h-7 animate-spin text-purple-700" />
            <span className="text-xs font-bold">در حال پردازش و بهینه‌سازی حجم عکس...</span>
            <span className="text-[10px] text-gray-500">کاهش هوشمند حجم تصویر بدون افت کیفیت خوانایی</span>
          </div>
        ) : value ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Thumbnail with preview click */}
              <div
                onClick={() => setIsPreviewOpen(true)}
                className="w-16 h-16 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-xs cursor-pointer relative group shrink-0 bg-black/5"
                title="مشاهده بزرگنمایی تصویر"
              >
                <img
                  src={value}
                  alt="رسید"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Eye className="w-4 h-4 text-white" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>تصویر با کیفیت فشرده شد</span>
                </div>
                {stats ? (
                  <div className="text-[11px] text-gray-600">
                    حجم اولیه: <span className="font-mono font-bold text-gray-700">{stats.originalSizeKB} KB</span> ➔{' '}
                    حجم بهینه: <span className="font-mono font-bold text-emerald-700">{stats.compressedSizeKB} KB</span>
                    {stats.savingsPercent > 0 && (
                      <span className="mr-1 text-emerald-600 font-bold">({stats.savingsPercent}% صرفه‌جویی)</span>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-gray-500">کیفیت عالی و خوانا جهت بایگانی و پرینت</div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-1 shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5 text-purple-700" />
                <span>مشاهده</span>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-1 shadow-2xs"
              >
                <span>تغییر</span>
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all"
                title="حذف تصویر"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-center sm:text-right">
                <p className="text-xs font-bold text-[#341648]">عکس فاکتور یا رسید را الصاق کنید</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{helperText}</p>
              </div>

              {/* Two buttons: Camera & Gallery */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>عکس با دوربین</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-white hover:bg-gray-50 active:scale-95 text-gray-800 border border-gray-300 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-all"
                >
                  <ImageIcon className="w-4 h-4 text-purple-700" />
                  <span>انتخاب از گالری</span>
                </button>
              </div>
            </div>

            {required && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>توجه: بدون ارسال عکس رسید/فاکتور، ثبت این تراکنش امکان‌پذیر نیست.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {(error || localError) && (
        <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error || localError}</span>
        </p>
      )}

      {/* Full-resolution Image Preview Modal */}
      {isPreviewOpen && value && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#341648]">پیش‌نمایش تصویر رسید / فاکتور</h4>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-1 rounded-xl hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[75vh] flex items-center justify-center bg-gray-900/5">
              <img
                src={value}
                alt="تصویر بزرگ رسید"
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-gray-200"
              />
            </div>
            <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-gray-50 text-xs">
              <span className="text-gray-500">کیفیت متن، تاریخ و مبالغ برای بایگانی بررسی شد</span>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 rounded-xl bg-purple-700 text-white font-bold"
              >
                تأیید و بازگشت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
