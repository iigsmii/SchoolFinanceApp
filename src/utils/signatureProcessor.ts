/**
 * Signature Image Processor
 * - Automatic background removal (white paper removal to transparent)
 * - Auto-cropping of blank borders
 * - Size optimization & compression
 */

export interface ProcessSignatureOptions {
  luminanceThreshold?: number; // 0 - 255 (default: 205)
  maxWidth?: number; // default: 360
  maxHeight?: number; // default: 140
  enhanceContrast?: boolean;
}

export const processSignatureImage = (
  fileOrDataUrl: File | string,
  options: ProcessSignatureOptions = {}
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const {
      luminanceThreshold = 205,
      maxWidth = 360,
      maxHeight = 140,
      enhanceContrast = true,
    } = options;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const handleLoaded = () => {
      try {
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;

        if (originalWidth === 0 || originalHeight === 0) {
          throw new Error('ابعاد تصویر امضا نامعتبر است.');
        }

        // 1. Render onto initial canvas
        const canvas = document.createElement('canvas');
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('عدم پشتیبانی مرورگر از Canvas 2D');

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, originalWidth, originalHeight);
        const data = imageData.data;

        // 2. Remove background (turn light pixels transparent) and calculate ink bounding box
        let minX = originalWidth;
        let minY = originalHeight;
        let maxX = 0;
        let maxY = 0;
        let hasInk = false;

        for (let y = 0; y < originalHeight; y++) {
          for (let x = 0; x < originalWidth; x++) {
            const idx = (y * originalWidth + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (a < 20) {
              // already transparent
              data[idx + 3] = 0;
              continue;
            }

            // Perceptual brightness
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

            if (luminance >= luminanceThreshold) {
              // Background pixel: make transparent
              data[idx + 3] = 0;
            } else {
              // Ink pixel: calculate softness and bounding box
              hasInk = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;

              // Smooth edges near the threshold
              const delta = luminanceThreshold - luminance;
              const alphaRatio = Math.min(1, delta / 30);
              data[idx + 3] = Math.round(a * alphaRatio);

              // Enhance ink contrast if desired
              if (enhanceContrast) {
                data[idx] = Math.max(0, Math.round(r * 0.7));
                data[idx + 1] = Math.max(0, Math.round(g * 0.7));
                data[idx + 2] = Math.max(0, Math.round(b * 0.8));
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);

        if (!hasInk) {
          // If no dark pixels detected, fallback to original resized
          minX = 0;
          minY = 0;
          maxX = originalWidth;
          maxY = originalHeight;
        }

        // Add 8px padding
        const pad = 8;
        const cropX = Math.max(0, minX - pad);
        const cropY = Math.max(0, minY - pad);
        const cropW = Math.min(originalWidth - cropX, maxX - minX + pad * 2);
        const cropH = Math.min(originalHeight - cropY, maxY - minY + pad * 2);

        // 3. Scale into target bounds
        const scale = Math.min(maxWidth / cropW, maxHeight / cropH, 1.5);
        const targetW = Math.max(20, Math.round(cropW * scale));
        const targetH = Math.max(10, Math.round(cropH * scale));

        const targetCanvas = document.createElement('canvas');
        targetCanvas.width = targetW;
        targetCanvas.height = targetH;
        const targetCtx = targetCanvas.getContext('2d');
        if (!targetCtx) throw new Error('Target canvas context failed');

        targetCtx.imageSmoothingEnabled = true;
        targetCtx.imageSmoothingQuality = 'high';

        targetCtx.drawImage(
          canvas,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          targetW,
          targetH
        );

        // Export as clean lightweight PNG data URL
        const resultDataUrl = targetCanvas.toDataURL('image/png', 0.85);
        resolve(resultDataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => reject(new Error('خطا در بارگذاری تصویر امضا'));

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          img.src = e.target.result;
        } else {
          reject(new Error('خطا در خواندن فایل'));
        }
      };
      reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
};
