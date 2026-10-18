/**
 * sheetBridge.ts — پل ارتباطی مستقیم با بک‌اند Google Apps Script
 *
 * چرا این فایل لازم است؟
 * اسکریپت سرور (SchoolFinanceApp_GoogleAppsScript_FINAL.gs) برای هر عمل نوشتن
 * (student_add, tuition_add, expense_add, ...) سه چیز می‌خواهد:
 *   1) توکن نشست سرور که فقط با action=login صادر می‌شود
 *   2) request_id یکتا (الگوی [a-zA-Z0-9-]{16,80}) برای جلوگیری از ثبت تکراری
 *   3) مقدارهای فیلدهای همان اکشن
 *
 * مسیر قبلی برنامه فقط با توکن OAuth گوگل (sheets.googleapis.com) می‌نوشت، که
 * روی اندروید/وب‌اپ در دسترس نیست؛ نتیجه: دانش‌آموز در شیت ثبت نمی‌شد و روی
 * دستگاه‌های دیگر دیده نمی‌شد. این ماژول مسیر درست (Apps Script) را پیاده می‌کند.
 *
 * نکتهٔ امنیتی: آدرس وب‌اپ و شناسهٔ شیت هاردکد شده‌اند و از تنظیمات قابل تغییر
 * نیستند تا کاربر نتواند اتصال را خراب کند.
 */

/** نشانی ثابت وب‌اپ (از سمت کاربر قابل تغییر نیست) */
export const FIXED_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbzsCUERpyKBOZg4z4AMua3RvWKgguw73-1ZtkzgjrJdfA4yOX2d69WqlXy1FS7NPHnxqA/exec';

/** شناسهٔ ثابت فایل گوگل شیت (از سمت کاربر قابل تغییر نیست) */
export const FIXED_SPREADSHEET_ID = '1bFTL1edC-btgjp2KvvkwIM5WaJnycVFylTmFQQFRixk';

const SESSION_STORAGE_KEY = 'school_finance_backend_session';

export interface BackendSession {
  token: string;
  user: {
    id: number | string;
    name: string;
    username: string;
    school_id?: number | string;
    role?: string;
  };
  saved_at: number;
}

export interface BackendResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  raw?: any;
}

/* ------------------------------------------------------------------ */
/* Session handling                                                    */
/* ------------------------------------------------------------------ */

export const loadSession = (): BackendSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BackendSession) : null;
  } catch {
    return null;
  }
};

export const saveSession = (session: BackendSession | null) => {
  try {
    if (session) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore quota errors */
  }
};

export const clearSession = () => saveSession(null);

/**
 * request_id یکتا در قالب مورد قبول سرور: 16 تا 80 نویسه از [a-zA-Z0-9-].
 * (crypto.randomUUID در مرورگرهای قدیمی/WebView اندروید ممکن است نباشد.)
 */
export const newRequestId = (): string => {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
  return uuid;
};

/* ------------------------------------------------------------------ */
/* Low-level transport                                                 */
/* ------------------------------------------------------------------ */

/**
 * فراخوانی اکشن روی بک‌اند.
 *
 * سرور برای درخواست‌های نوشتن، پاسخ را با یک ریدایرکت به
 * script.googleusercontent.com برمی‌گرداند. fetch خودش ریدایرکت را دنبال
 * می‌کند، پس response.json() درست کار می‌کند. اگر پاسخ HTML باشد یعنی
 * ریدایرکت/مجوز ناقص بوده و باید خطا برگردانیم (نه اینکه سکوت کنیم).
 */
export const callBackend = async <T = any>(
  action: string,
  payload: Record<string, any> = {}
): Promise<BackendResult<T>> => {
  try {
    const body: Record<string, any> = { action, ...payload };

    // توکن نشست را خودکار اضافه کن (به‌جز خود login)
    if (action !== 'login') {
      const session = loadSession();
      if (session?.token) body.token = session.token;
    }

    const res = await fetch(FIXED_WEB_APP_URL, {
      method: 'POST',
      // text/plain از preflight و خطای CORS وب‌اپ گوگل جلوگیری می‌کند.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
    });

    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      return {
        success: false,
        error:
          'پاسخ سرور قابل خواندن نیست. معمولاً یعنی دسترسی وب‌اپ روی «هر کس» تنظیم نشده یا نشست منقضی شده است.',
        raw: text.slice(0, 300),
      };
    }

    if (json && json.success === false) {
      return { success: false, error: String(json.error || json.message || 'خطای سرور'), raw: json };
    }

    return { success: true, data: json, raw: json };
  } catch (e: any) {
    return { success: false, error: e?.message || 'خطا در ارتباط با سرور' };
  }
};

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export const loginBackend = async (username: string, password: string): Promise<BackendResult<BackendSession>> => {
  const res = await callBackend<{ token: string; user: BackendSession['user'] }>('login', {
    username,
    password,
  });

  if (!res.success || !res.data?.token) {
    return { success: false, error: res.error || 'نام کاربری یا رمز عبور اشتباه است.' };
  }

  const session: BackendSession = {
    token: res.data.token,
    user: res.data.user,
    saved_at: Date.now(),
  };
  saveSession(session);
  return { success: true, data: session };
};

export const logoutBackend = async () => {
  const session = loadSession();
  if (session?.token) {
    await callBackend('logout', { token: session.token }).catch(() => undefined);
  }
  clearSession();
};

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export const fetchStudents = async (opts: { school_id?: number | string; q?: string } = {}) =>
  callBackend<any[]>('students', opts);

export const fetchSchools = async () => callBackend<any[]>('schools', {});

export const fetchTuition = async (opts: { school_id?: number | string } = {}) =>
  callBackend<any[]>('tuition', opts);

export const fetchExpenses = async (opts: { school_id?: number | string } = {}) =>
  callBackend<any[]>('expenses', opts);

export const fetchCheques = async () => callBackend<any[]>('cheques', {});

export const fetchSummary = async (opts: { school_id?: number | string } = {}) =>
  callBackend<any>('summary', opts);

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

export interface NewStudentInput {
  name: string;
  grade: string;
  phone: string;
  national_id: string;
  school_id: number | string;
}

/**
 * ثبت دانش‌آموز در گوگل شیت (مسیر درست: Apps Script).
 * پس از ثبت موفق، خودِ سرور شناسهٔ نهایی را برمی‌گرداند.
 */
export const createStudent = async (
  student: NewStudentInput
): Promise<BackendResult<{ id: number | string }>> => {
  const name = String(student.name || '').trim();
  const nationalId = String(student.national_id || '').replace(/\D/g, '');
  const phone = String(student.phone || '').replace(/\D/g, '');

  // اعتبارسنجی سمت کلاینت، دقیقاً مطابق قواعد سرور
  if (!name) return { success: false, error: 'نام دانش‌آموز الزامی است.' };
  if (!/^\d{10}$/.test(nationalId)) return { success: false, error: 'کد ملی باید دقیقاً ۱۰ رقم باشد.' };
  if (phone && !/^0\d{10}$/.test(phone)) return { success: false, error: 'شماره تماس باید ۱۱ رقم و با ۰ شروع شود.' };
  if (!student.school_id) return { success: false, error: 'مدرسه مشخص نشده است.' };

  // اطمینان از معتبر بودن نشست
  if (!loadSession()?.token) {
    return { success: false, error: 'برای ثبت در گوگل شیت ابتدا با نام کاربری و رمز وارد شوید.' };
  }

  return callBackend<{ id: number | string }>('student_add', {
    request_id: newRequestId(),
    name,
    grade: student.grade,
    phone,
    national_id: nationalId,
    school_id: student.school_id,
  });
};

export const updateStudentBackend = async (payload: Record<string, any>) =>
  callBackend('student_update', { request_id: newRequestId(), ...payload });

export const deleteStudentBackend = async (id: number | string) =>
  callBackend('student_delete', { id });

export const addTuitionEntry = async (payload: Record<string, any>) =>
  callBackend('tuition_add', { request_id: newRequestId(), ...payload });

export const addExpenseEntry = async (payload: Record<string, any>) =>
  callBackend('expense_add', { request_id: newRequestId(), ...payload });

/* ------------------------------------------------------------------ */
/* Verification helper                                                 */
/* ------------------------------------------------------------------ */

/**
 * آیا این دانش‌آموز واقعاً در شیت ثبت شده است؟
 * برای بازخورد صادقانه به کاربر استفاده می‌شود.
 */
export const verifyStudentInSheet = async (
  nationalId: string
): Promise<{ verified: boolean; error?: string }> => {
  const nid = String(nationalId || '').replace(/\D/g, '');
  if (!nid) return { verified: false, error: 'کد ملی نامعتبر است.' };

  const res = await callBackend<any[]>('students', { q: nid });
  if (!res.success) return { verified: false, error: res.error };

  const list: any[] = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
  const found = list.some((s) => String(s?.national_id || '').replace(/\D/g, '') === nid);
  return { verified: found };
};
