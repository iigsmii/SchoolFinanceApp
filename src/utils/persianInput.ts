/**
 * Persian Number & Input Utility Functions
 *
 * Provides safe conversions for parsing Persian/Arabic digits to English digits
 * without DOM hijacking, ensuring Android/iOS mobile virtual keyboards,
 * backspace, and cursor navigation work 100% normally.
 */

export const toLatinDigits = (str: string = ''): string => {
  if (!str) return '';
  return String(str).replace(/[۰-۹٠-٩]/g, (char) => {
    const code = char.charCodeAt(0);
    // 0x06F0 to 0x06F9: Persian digits ۰-۹
    // 0x0660 to 0x0669: Arabic digits ٠-٩
    return String(code >= 0x06f0 && code <= 0x06f9 ? code - 0x06f0 : code - 0x0660);
  });
};

export const toPersianDigits = (str: string | number = ''): string => {
  if (str === null || str === undefined || str === '') return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/[0-9]/g, (w) => persianDigits[Number(w)]);
};

/**
 * Normalizes general Persian text: converts Arabic Yeh/Kaf to Persian, cleans tatweel,
 * retains proper Persian half-spaces.
 */
export const normalizePersianCleanText = (str: string = ''): string => {
  if (!str) return '';
  return String(str)
    .replace(/[يىئ]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ةۀ]/g, 'ه')
    .replace(/ـ+/g, '') // strip tatweel
    .replace(/[ \t]+/g, ' ')
    .trim();
};

export const normalizePersianLiveText = (str: string = ''): string => {
  if (!str) return '';
  return toLatinDigits(str)
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[ةۀ]/g, 'ه');
};

/**
 * Parses user-entered amount strings (with commas or Persian numbers) into a valid integer number.
 */
export const parseAmountValue = (val: string | number): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const latin = toLatinDigits(String(val)).replace(/[,٬\s_]/g, '');
  const parsed = parseInt(latin, 10);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formats an amount with standard comma separation.
 */
export const formatAmountString = (val: string | number): string => {
  const num = parseAmountValue(val);
  if (num === 0 && (!val || val === '0')) return val === '0' ? '0' : '';
  return num.toLocaleString('en-US');
};

/**
 * Safe amount input change handler that preserves cursor position even when commas are added/removed.
 * Prevents mobile keyboards from jumping to the end, dropping characters, or truncating text.
 */
export const handleAmountInputChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  onChange: (formattedVal: string) => void
) => {
  const input = e.target;
  const raw = input.value;
  const latin = toLatinDigits(raw);
  const digitsOnly = latin.replace(/\D/g, '');

  if (!digitsOnly) {
    onChange('');
    return;
  }

  const oldCursor = input.selectionStart || 0;
  const digitsBeforeCursor = latin.slice(0, oldCursor).replace(/\D/g, '').length;

  const formatted = Number(digitsOnly).toLocaleString('en-US');
  onChange(formatted);

  // Restore cursor based on digit position rather than absolute char index
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => {
      let count = 0;
      let newPos = formatted.length;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          count++;
          if (count === digitsBeforeCursor) {
            newPos = i + 1;
            break;
          }
        }
      }
      try {
        input.setSelectionRange(newPos, newPos);
      } catch {
        // ignore in environments that do not support selection
      }
    });
  }
};

/**
 * Cleans user input for phone numbers, national IDs, or raw digit fields.
 */
export const cleanNumericString = (val: string = ''): string => {
  return toLatinDigits(val).replace(/\D/g, '');
};

/**
 * Safe no-op for backwards compatibility: does NOT hook into window/document events.
 */
export const installPersianLiveInputNormalizer = () => {
  return () => {};
};
