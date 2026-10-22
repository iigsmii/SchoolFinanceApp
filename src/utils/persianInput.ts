/**
 * Universal High-Performance Persian & Arabic Live Input Normalizer
 *
 * Guarantees that:
 * 1. Persian numerals (۰-۹) and Arabic numerals (٠-٩) are converted to Latin ASCII digits (0-9)
 *    immediately on the fly with 0ms delay, before layout render and without cursor jumping.
 * 2. Arabic keyboard letters (ي, ى, ك, ۀ) are live-converted to standard Persian (ی, ک, ه).
 * 3. Works seamlessly on Chrome, Safari, Firefox, Android Chrome/WebView (Capacitor)
 *    across all standard inputs (text, number, tel, search, url) and textareas.
 * 4. Passwords (type="password") remain untouched for security and password integrity.
 */

export const toLatinDigits = (str: string = ''): string => {
  if (!str) return '';
  return str.replace(/[۰-۹٠-٩]/g, (char) => {
    const code = char.charCodeAt(0);
    // 0x06F0 to 0x06F9: Persian digits ۰-۹
    // 0x0660 to 0x0669: Arabic digits ٠-٩
    return String(code >= 0x06f0 && code <= 0x06f9 ? code - 0x06f0 : code - 0x0660);
  });
};

export const normalizePersianLiveText = (str: string = ''): string => {
  if (!str) return '';
  return str
    // Convert Persian digits
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    // Convert Arabic digits
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    // Convert Arabic Yeh / Alef Maqsura to Persian Yeh
    .replace(/[يى]/g, 'ی')
    // Convert Arabic Kaf to Persian Kaf
    .replace(/ك/g, 'ک')
    // Convert Arabic Teh Marbuta / Heh with Hamza to standard Persian Heh
    .replace(/[ةۀ]/g, 'ه');
};

const setNativeValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype = element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  if (descriptor?.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }
  // Dispatch synthetic event with custom flag to avoid re-triggering loops
  const event = new Event('input', { bubbles: true, cancelable: true });
  (event as any).__persianNormalized = true;
  element.dispatchEvent(event);
};

const insertTextManual = (target: HTMLInputElement | HTMLTextAreaElement, text: string) => {
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  const original = target.value;
  const nextValue = original.substring(0, start) + text + original.substring(end);

  setNativeValue(target, nextValue);

  const nextPos = start + text.length;
  try {
    target.setSelectionRange(nextPos, nextPos);
  } catch {
    // Some input types (e.g. number/email in some browsers) do not allow setSelectionRange
  }
};

let isInstalled = false;

export const installPersianLiveInputNormalizer = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (isInstalled) return () => {};
  isInstalled = true;

  // 1. BEFOREINPUT (Immediate Live Interception - 0ms delay, zero visual flicker)
  // Fires before the character is inserted into the DOM.
  const handleBeforeInput = (e: Event) => {
    const event = e as InputEvent;
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    if (target instanceof HTMLInputElement && target.type === 'password') return;
    if (target.readOnly || target.disabled) return;

    const data = event.data;
    if (!data) return;

    // Fast check: does typed text contain any characters needing normalization?
    if (/[۰-۹٠-٩يىكةۀ]/.test(data)) {
      const normalized = normalizePersianLiveText(data);
      if (normalized !== data) {
        event.preventDefault();
        // Insert normalized text natively into the input
        let inserted = false;
        try {
          inserted = document.execCommand('insertText', false, normalized);
        } catch {
          inserted = false;
        }

        if (!inserted) {
          insertTextManual(target, normalized);
        }
      }
    }
  };

  // 2. PASTE (Intercept pasted content with Persian numbers or Arabic letters)
  const handlePaste = (e: ClipboardEvent) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    if (target instanceof HTMLInputElement && target.type === 'password') return;
    if (target.readOnly || target.disabled) return;

    const text = e.clipboardData?.getData('text/plain') || e.clipboardData?.getData('text');
    if (text && /[۰-۹٠-٩يىكةۀ]/.test(text)) {
      e.preventDefault();
      const normalized = normalizePersianLiveText(text);
      let inserted = false;
      try {
        inserted = document.execCommand('insertText', false, normalized);
      } catch {
        inserted = false;
      }
      if (!inserted) {
        insertTextManual(target, normalized);
      }
    }
  };

  // 3. COMPOSITIONEND (Android Gboard / Virtual Keyboard IME completion)
  const handleCompositionEnd = (e: CompositionEvent) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    if (target instanceof HTMLInputElement && target.type === 'password') return;
    if (target.readOnly || target.disabled) return;

    const val = target.value;
    if (val && /[۰-۹٠-٩يىكةۀ]/.test(val)) {
      const normalized = normalizePersianLiveText(val);
      if (normalized !== val) {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        setNativeValue(target, normalized);
        if (start !== null && end !== null) {
          try {
            target.setSelectionRange(start, end);
          } catch {}
        }
      }
    }
  };

  // 4. INPUT (Capture phase fallback for autofill, drag-drop, or browsers without beforeinput)
  const handleInput = (e: Event) => {
    if ((e as any).__persianNormalized) return;
    const target = e.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    if (target instanceof HTMLInputElement && target.type === 'password') return;
    if (target.readOnly || target.disabled) return;

    const original = target.value;
    if (!original || !/[۰-۹٠-٩يىكةۀ]/.test(original)) return;

    const normalized = normalizePersianLiveText(original);
    if (normalized === original) return;

    const start = target.selectionStart;
    const end = target.selectionEnd;

    setNativeValue(target, normalized);

    if (start !== null && end !== null) {
      try {
        target.setSelectionRange(start, end);
      } catch {}
    }
  };

  // Attach all handlers in capture phase to run before any component-level handlers
  document.addEventListener('beforeinput', handleBeforeInput, true);
  document.addEventListener('paste', handlePaste, true);
  document.addEventListener('compositionend', handleCompositionEnd, true);
  document.addEventListener('input', handleInput, true);

  return () => {
    isInstalled = false;
    document.removeEventListener('beforeinput', handleBeforeInput, true);
    document.removeEventListener('paste', handlePaste, true);
    document.removeEventListener('compositionend', handleCompositionEnd, true);
    document.removeEventListener('input', handleInput, true);
  };
};
