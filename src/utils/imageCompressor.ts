/**
 * Utility for client-side receipt/invoice image compression.
 * Reduces 5MB-15MB phone camera photos down to 50KB-120KB while preserving
 * sharp text on thermal paper, bank receipts, Pos slips, and stamps.
 */

export interface CompressionResult {
  dataUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  savingsPercent: number;
  width: number;
  height: number;
}

export async function compressReceiptImage(
  file: File,
  maxDimension = 1280,
  quality = 0.8
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('فایل انتخاب شده تصویر معتبر نیست.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error('خطا در پردازش تصویر'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Downscale while preserving aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('امکان ایجاد بستر گرافیکی وجود ندارد.'));
          return;
        }

        // Draw image with smooth scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Calculate size in KB
        const originalSizeKB = Math.round(file.size / 1024);
        // Approx size of base64
        const stringLength = dataUrl.length - 'data:image/jpeg;base64,'.length;
        const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.562489633438312;
        const compressedSizeKB = Math.max(1, Math.round(sizeInBytes / 1024));

        const savingsPercent = originalSizeKB > 0
          ? Math.max(0, Math.round(((originalSizeKB - compressedSizeKB) / originalSizeKB) * 100))
          : 0;

        resolve({
          dataUrl,
          originalSizeKB,
          compressedSizeKB,
          savingsPercent,
          width,
          height,
        });
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
