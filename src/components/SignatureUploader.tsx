import React, { useState, useRef } from 'react';
import { processSignatureImage } from '../utils/signatureProcessor';
import { Upload, Trash2, CheckCircle2, Sliders, X, Sparkles, Image as ImageIcon } from 'lucide-react';

interface SignatureUploaderProps {
  currentSignature?: string | null;
  onSave: (signatureDataUrl: string | null) => void;
  title?: string;
  accentColor?: string;
}

export const SignatureUploader: React.FC<SignatureUploaderProps> = ({
  currentSignature,
  onSave,
  title = 'امضای رسمی امور مالی',
  accentColor = '#62205f',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [processedSignature, setProcessedSignature] = useState<string | null>(currentSignature || null);
  const [threshold, setThreshold] = useState<number>(205);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState<boolean>(false);

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rawUrl = e.target?.result as string;
        setTempImage(rawUrl);
        const processed = await processSignatureImage(rawUrl, {
          luminanceThreshold: threshold,
        });
        setProcessedSignature(processed);
        setShowEditor(true);
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در پردازش تصویر');
      setIsProcessing(false);
    }
  };

  const handleThresholdChange = async (newVal: number) => {
    setThreshold(newVal);
    if (!tempImage) return;
    try {
      const processed = await processSignatureImage(tempImage, {
        luminanceThreshold: newVal,
      });
      setProcessedSignature(processed);
    } catch {}
  };

  const handleApplySave = () => {
    onSave(processedSignature);
    setShowEditor(false);
  };

  const handleRemoveSignature = () => {
    setProcessedSignature(null);
    setTempImage(null);
    onSave(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e5dde8] p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-[#341648]">{title}</span>
        </div>
        {processedSignature && (
          <button
            type="button"
            onClick={handleRemoveSignature}
            className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>حذف امضا</span>
          </button>
        )}
      </div>

      {/* Signature Preview Slot */}
      <div className="relative min-h-[90px] rounded-xl border border-dashed border-gray-200 bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] flex items-center justify-center p-3 overflow-hidden">
        {processedSignature ? (
          <img
            src={processedSignature}
            alt="امضای رسمی"
            className="max-h-20 max-w-full object-contain filter drop-shadow-xs"
          />
        ) : (
          <div className="text-center text-xs text-gray-400 py-2">
            <ImageIcon className="w-6 h-6 mx-auto mb-1 text-gray-300" />
            <span>هنوز تصویری برای امضا بارگذاری نشده است</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="flex-1 py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#62205f] border border-purple-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{processedSignature ? 'تغییر یا آپلود امضای جدید' : 'آپلود امضای مدیر'}</span>
        </button>

        {tempImage && (
          <button
            type="button"
            onClick={() => setShowEditor(true)}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
            title="تنظیم زمینه و شفافیت"
          >
            <Sliders className="w-4 h-4" />
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="text-[11px] text-rose-600 font-semibold">{errorMsg}</div>
      )}

      {/* Advanced Fine-Tuning Modal */}
      {showEditor && tempImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-gray-200 space-y-4 text-right">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-sm font-bold text-[#341648]">حذف خودکار زمینه سفید و تنظیم امضا</h4>
              <button
                onClick={() => setShowEditor(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Checkerboard preview */}
            <div className="min-h-[140px] rounded-2xl border border-gray-300 bg-[repeating-conic-gradient(#f0f0f0_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px] flex items-center justify-center p-4">
              {processedSignature ? (
                <img
                  src={processedSignature}
                  alt="پیش‌نمایش امضا بدون زمینه"
                  className="max-h-28 max-w-full object-contain"
                />
              ) : null}
            </div>

            {/* Threshold Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-600">
                <span>میزان حساسیت حذف زمینه سفید کاغذ:</span>
                <span className="font-mono font-bold">{threshold}</span>
              </div>
              <input
                type="range"
                min="140"
                max="245"
                value={threshold}
                onChange={(e) => handleThresholdChange(Number(e.target.value))}
                className="w-full accent-[#62205f] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>حفظ خطوط نازک</span>
                <span>حذف قوی‌تر سایه کاغذ</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleApplySave}
                className="flex-1 py-2.5 rounded-xl bg-[#62205f] hover:bg-[#4a1550] text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
                style={{ backgroundColor: accentColor }}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>ذخیره امضا در اسناد</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
