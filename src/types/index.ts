export interface User {
  id: number;
  username: string;
  name: string;
  role: 'senior' | 'admin' | 'manager';
  school_id?: number;
  school_name?: string;
  active: boolean;
  password?: string;
}

export interface School {
  id: number;
  name: string;
  code: string;
  type?: string;
  active: boolean;
  moeen_code?: number;
}

export interface Student {
  id: number;
  name: string;
  grade: string;
  phone: string;
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
  student_id?: number;
  student_name?: string;
  student_grade?: string;
  kind: 'شهریه' | 'شهریه_بدهی' | 'هزینه';
  amount: number;
  debit: number;
  credit: number;
  payment_method?: string; // 'پول نقد' | 'کارت به کارت' | 'کارت خوان' | 'چک'
  payment_source?: string; // 'bank' | 'own' | string
  tracking_code?: string;
  comment?: string;
  description?: string;
  expense_category_id?: string | number;
  expense_category_name?: string;
  reconciled?: boolean;
  review_status?: 'pending' | 'approved' | 'rejected';
  attachment_url?: string;
  source_id?: number;
}

export interface Cheque {
  id: number;
  sayad_id: string; // 16 digits
  student_id: number;
  student_name: string;
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
}

export interface SeniorMessage {
  id: string;
  message: string;
  created_at: string;
  author_name: string;
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
  | 'students'
  | 'tuition'
  | 'cheque_list'
  | 'cheques'
  | 'expenses'
  | 'transactions'
  | 'statement'
  | 'claim'
  | 'report'
  | 'activity'
  | 'settings'
  | 'bank'
  | 'managers'
  | 'schools'
  | 'export'
  | 'messages'
  | 'sms_reminders'
  | 'staff';

