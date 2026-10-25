export interface User {
  id: number;
  username: string;
  name: string;
  gender?: 'male' | 'female';
  role: 'senior' | 'admin' | 'manager';
  school_id?: number;
  school_name?: string;
  active: boolean;
  password?: string;
  petty_cash_card?: string; // شماره ۱۶ رقمی کارت تن‌خواه مدیر
  petty_cash_bank?: string; // نام بانک کارت تن‌خواه
  petty_cash_shaba?: string; // شماره شبای کارت تن‌خواه
  petty_cash_limit?: number; // سقف مجاز تن‌خواه به ریال
  petty_cash_balance?: number; // مانده تخمینی تن‌خواه به ریال
}

export interface School {
  id: number;
  name: string;
  code: string;
  type?: string;
  active: boolean;
  moeen_code?: number;
  tafsili_code?: string; // کد تفصیلی در حسابداری پارسیان
  petty_cash_card?: string;
  pos_terminal_number?: string;
}

export interface Student {
  id: number;
  name: string;
  grade: string;
  phone: string;
  father_phone?: string;
  mother_phone?: string;
  national_id: string;
  school_id: number;
  school_name?: string;
  active: boolean;
  needs_fix?: boolean;
  parsian_code?: string;
  created_at?: string;
}

export interface Transaction {
  id: number;
  date: string; // ISO yyyy-MM-dd
  jalali_date?: string;
  school_id: number;
  school_name?: string;
  tafsili_code?: string; // کد تفصیلی مدرسه در سند هزینه/تراکنش
  student_id?: number;
  student_name?: string;
  student_grade?: string;
  kind: 'شهریه' | 'شهریه_بدهی' | 'هزینه' | 'دریافت متفرقه' | 'تخفیف_شهریه';
  amount: number;
  debit: number;
  credit: number;
  payment_method?: string; // 'پول نقد' | 'کارت به کارت' | 'کارت خوان' | 'چک' | 'کارت تن‌خواه' | 'تخفیف / بورسیه'
  payment_source?: 'bank' | 'own' | 'petty_cash' | string; // 'petty_cash' = کارت تن‌خواه مدیر
  petty_cash_card?: string;
  is_bank_fee?: boolean; // کارمزد بانکی
  tracking_code?: string;
  pos_terminal_number?: string;
  debt_item_type?: 'tuition' | 'service' | 'food' | 'uniform' | 'activity' | 'books' | 'other';
  installment_index?: number;
  total_installments?: number;
  discount_reason?: string;
  comment?: string;
  description?: string;
  expense_category_id?: string | number;
  expense_category_name?: string;
  reconciled?: boolean;
  review_status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  registered_by?: number | string;
  attachment_url?: string;
  source_id?: number;
  bank_transaction_id?: number;
  linked_account_name?: string;
}

export interface Cheque {
  id: number;
  sayad_id?: string; // 16 digits (اختیاری در چک غیر صیادی و قرض‌الحسنه)
  cheque_number?: string; // شماره سریال برگه چک
  bank_name?: string; // بانک صادرکننده چک (ملی، ملت، صادرات، رسالت و...)
  cheque_type?: 'sayad' | 'non_sayad' | 'gharzolhasane' | 'guarantee'; // نوع چک: صیادی، غیر صیادی، قرض‌الحسنه، ضمانتی
  cheque_purpose?: 'tuition' | 'guarantee' | 'staff_guarantee' | 'general'; // بابت: شهریه، ضمانت و...
  issuer_name?: string; // نام صادرکننده یا صاحب حساب
  student_id?: number;
  student_name?: string;
  school_id: number;
  school_name: string;
  amount: number;
  due_date: string; // ISO yyyy-MM-dd
  issue_date: string;
  received_confirmed: boolean;
  in_favor_confirmed: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'paid' | 'bounced';
  note?: string;
  attachment_url?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  active: boolean;
}

export interface BankTransaction {
  id: number;
  date: string;
  school_id: number;
  school_name?: string;
  amount: number;
  tracking_code: string;
  bank_account: string;
  description?: string;
  reconciled: boolean;
  matched_transaction_id?: number;
  direction?: 'deposit' | 'withdrawal' | 'pos_sale' | 'unknown';
  balance?: number;
  card_number?: string; // سازگاری با نسخه‌های قبلی
  source_card_number?: string; // شماره کارت مبدأ
  destination_card_number?: string; // شماره کارت مقصد
  terminal_number?: string;
  reference_number?: string;
  pos_reference_code?: string;
  fee_amount?: number;
  account_suffix?: string;
  transaction_time?: string;
  settlement_date?: string;
  assigned_student_id?: number;
  assigned_student_name?: string;
  assigned_purpose?: string;
  matched_manager_id?: number;
}

export interface SeniorMessage {
  id: string;
  message: string;
  created_at: string;
  author_name: string;
}

export type FeedbackType = 'bug' | 'suggestion' | 'criticism' | 'question';
export type FeedbackPriority = 'normal' | 'important' | 'urgent';
export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'acknowledged';

export interface ManagerFeedback {
  id: string; // e.g. "FB-1742081234"
  tracking_code: string; // e.g. "PR-4892"
  type: FeedbackType;
  title: string;
  description: string;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  user_id: number;
  user_name: string;
  school_id: number;
  school_name: string;
  created_at: string; // ISO date
  created_at_jalali: string; // e.g. "1403/08/04"
  attachment_url?: string; // Optional screenshot or photo
  device_info?: string; // e.g. "اندروید APK (v2.16.0)"
  senior_reply?: string; // پاسخ مدیر ارشد
  senior_reply_at?: string; // تاریخ پاسخ
}

export interface ActivityLog {
  id: string;
  user_id: number;
  user_name: string;
  school_id?: number;
  school_name?: string;
  action: string;
  description: string;
  entity_type?: string;
  entity_id?: string | number;
  date: string;
}

export interface SmsLog {
  id: string;
  student_id: number;
  student_name: string;
  school_name?: string;
  phone: string;
  amount: number;
  overdue_days: number;
  message: string;
  sent_at: string;
  status: 'sent' | 'delivered' | 'failed';
}

export interface SmsConfig {
  provider: 'kavenegar' | 'faraz' | 'mellipayamak' | 'magfa' | 'custom';
  apiKey: string;
  senderNumber: string;
  apiUrl: string;
  patternCode: string;
  enabled: boolean;
  autoSendOnDebt: boolean;
  smsTemplate: string;
}

export interface StaffMember {
  id: number;
  school_id: number;
  school_name?: string;
  name: string;
  national_id: string;
  phone: string;
  role_title: string; // e.g. 'معلم قرآن', 'آموزگار پایه سوم', 'معاون آموزشی', 'مربی ورزش', 'کادر اداری'
  contract_type: 'hourly' | 'monthly' | 'session'; // ساعتی، ماهانه، جلسه‌ای
  hourly_rate: number; // نرخ هر ساعت کارکرد به ریال
  base_salary: number; // حقوق پایه ماهانه به ریال
  insurance_employer_share: number; // سهم بیمه کارفرما
  insurance_employee_share: number; // سهم بیمه کارمند (کسر از حقوق)
  bank_card_or_sheba?: string;
  kol_code?: string; // کد کل حسابداری پارسیان
  moeen_code?: string; // کد معین حسابداری پارسیان
  tafsili_code?: string; // کد تفصیلی حسابداری پارسیان
  active: boolean;
  created_at?: string;
}

export interface StaffWorkLog {
  id: number;
  staff_id: number;
  staff_name: string;
  school_id: number;
  school_name?: string;
  month_name: string; // e.g. 'مهر ۱۴۰۳'
  work_hours: number; // ساعت کارکرد عادی
  overtime_hours: number; // ساعات اضافه کار
  sessions_count?: number; // تعداد جلسات تدریس
  absent_hours?: number; // ساعات غیبت یا کسر کار
  recorded_by: string;
  date: string;
  notes?: string;
}

export interface PayrollPayment {
  id: number;
  staff_id: number;
  staff_name: string;
  school_id: number;
  school_name?: string;
  month_name: string;
  payment_type: 'salary' | 'insurance' | 'bonus' | 'advance'; // پرداخت حقوق، پرداخت بیمه، پاداش، مساعده
  gross_amount: number; // ناخالص حقوق
  insurance_deduction: number; // کسر بیمه
  net_paid_amount: number; // خالص پرداختی
  payment_date: string; // تاریخ پرداخت
  tracking_code: string; // شماره پیگیری واریز
  source: 'bank' | 'own'; // پرداخت از حساب مدرسه یا مدیر
  attachment_url?: string; // تصویر رسید پرداخت
  notes?: string;
  created_at: string;
}

export type ScreenType =
  | 'dashboard'
  | 'finance_overview'
  | 'students'
  | 'tuition'
  | 'tuition_trend'
  | 'debtors'
  | 'quick_invoice'
  | 'cheque_list'
  | 'cheques'
  | 'expenses'
  | 'transactions'
  | 'statement'
  | 'claim'
  | 'report'
  | 'activity'
  | 'settings'
  | 'google_settings'
  | 'bank'
  | 'bank_accounts'
  | 'managers'
  | 'schools'
  | 'export'
  | 'messages'
  | 'sms_reminders'
  | 'staff'
  | 'feedback';

export interface BankAccount {
  id: number;
  name: string; // عنوان نمایشی حساب e.g. 'حساب اصلی شهریه - بانک ملی'
  bank_name: string; // نام بانک
  branch_name?: string; // نام یا کد شعبه
  account_number: string; // شماره حساب
  card_number?: string; // شماره ۱۶ رقمی کارت بانکی
  sheba_number?: string; // شماره شبا IR
  school_id: number; // مدرسه متصل
  school_name?: string;
  pos_terminal_number?: string; // شماره پایانه پوز
  kol_code: string; // کد کل حسابداری پارسیان (پیش‌فرض 10)
  moeen_code: string; // کد معین حسابداری پارسیان
  tafsili_code?: string; // کد تفصیلی
  initial_balance?: number; // مانده آغازین به ریال
  is_active: boolean;
  notes?: string;
  created_at?: string;
}

export interface JournalEntryRow {
  row_number: number;
  doc_number: number;
  date_jalali: string; // YYYY/MM/DD
  kol_code: string;
  kol_name: string;
  moeen_code: string;
  moeen_name: string;
  tafsili_code: string;
  tafsili_name: string;
  description: string;
  debit: number;
  credit: number;
  tracking_code?: string;
  school_id: number;
  school_name: string;
  source_type: 'tuition_debt' | 'tuition_payment' | 'expense' | 'cheque' | 'discount' | 'bank_sync';
  source_id: number;
}

export interface ParsianJournalEntry {
  doc_number: number;
  date_jalali: string;
  date_iso: string;
  school_id: number;
  school_name: string;
  source_type: 'tuition_debt' | 'tuition_payment' | 'expense' | 'cheque' | 'discount' | 'bank_sync';
  source_id: number;
  description: string;
  rows: JournalEntryRow[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
}

export interface ParsianCodingConfig {
  kol_receivable: string; // حساب‌های دریافتنی (دانش‌آموزان) - پیش‌فرض 11
  kol_bank: string;       // موجودی نقد و بانک - پیش‌فرض 10
  kol_cheques: string;    // اسناد دریافتنی (چک‌ها) - پیش‌فرض 12
  kol_income: string;     // درآمد شهریه - پیش‌فرض 70
  kol_discount: string;   // تخفیفات شهریه - پیش‌فرض 71
  kol_expense: string;    // هزینه‌های عمومی و اداری - پیش‌فرض 60
  kol_petty_cash: string; // حساب تنخواه گردان مدیران - پیش‌فرض 20
  kol_payable: string;    // حساب‌های پرداختنی - پیش‌فرض 21
}

