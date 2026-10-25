import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../Header';
import { StaffMember, StaffWorkLog, PayrollPayment } from '../../types';
import { JalaliDatePicker } from '../JalaliDatePicker';
import { ReceiptImageUploader } from '../ReceiptImageUploader';
import { formatRial, jalaliFromGregorian, todayJalali, jalaliToIso, latinDigits } from '../../utils/jalali';
import {
  GraduationCap,
  Users,
  Clock,
  CreditCard,
  PlusCircle,
  Search,
  Filter,
  Trash2,
  Edit2,
  Check,
  X,
  FileText,
  Printer,
  ShieldCheck,
  Landmark,
  Building,
  Phone,
  Sparkles,
  AlertCircle,
  Eye,
  CheckCircle2,
  Briefcase,
  Layers,
  Banknote,
  Receipt,
  UserCheck,
  FileSpreadsheet,
  PenTool,
} from 'lucide-react';
import { StaffExcelModal } from '../StaffExcelModal';
import { SignatureUploader } from '../SignatureUploader';
import { openAttachment } from '../../services/attachments';

const MONTH_NAMES = [
  'مهر ۱۴۰۵',
  'آبان ۱۴۰۵',
  'آذر ۱۴۰۵',
  'دی ۱۴۰۵',
  'بهمن ۱۴۰۵',
  'اسفند ۱۴۰۵',
  'فروردین ۱۴۰۶',
  'اردیبهشت ۱۴۰۶',
  'خرداد ۱۴۰۶',
];

const ROLE_OPTIONS = [
  'آموزگار ابتدایی',
  'مربی قرآن و حفظ',
  'مربی تجوید و صوت',
  'معاون آموزشی',
  'معاون پرورشی',
  'مربی ورزش و سلامت',
  'مربی پیش‌دبستانی و مهد',
  'کادر اداری و دفتری',
  'نیروهای خدماتی و تأسیسات',
];

export const StaffScreen: React.FC = () => {
  const {
    currentUser,
    accentColor,
    schools,
    staffMembers,
    staffWorkLogs,
    payrollPayments,
    addStaffMember,
    updateStaffMember,
    deleteStaffMember,
    addStaffWorkLog,
    deleteStaffWorkLog,
    addPayrollPayment,
    deletePayrollPayment,
    calculateStaffPayroll,
    managerSignature,
    setManagerSignature,
  } = useApp();

  const isSenior = currentUser?.role === 'senior' || currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'staff' | 'work_logs' | 'payroll'>('staff');
  const [selectedSchoolId, setSelectedSchoolId] = useState<number>(
    isSenior ? 0 : currentUser?.school_id || 0
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(MONTH_NAMES[0]);

  // Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffNationalId, setStaffNationalId] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState(ROLE_OPTIONS[0]);
  const [staffSchoolId, setStaffSchoolId] = useState<number>(currentUser?.school_id || 1);
  const [staffContractType, setStaffContractType] = useState<'hourly' | 'monthly' | 'session'>('hourly');
  const [staffHourlyRate, setStaffHourlyRate] = useState('');
  const [staffBaseSalary, setStaffBaseSalary] = useState('');
  const [staffEmployerIns, setStaffEmployerIns] = useState('');
  const [staffEmployeeIns, setStaffEmployeeIns] = useState('');
  const [staffBankCard, setStaffBankCard] = useState('');
  const [staffKolCode, setStaffKolCode] = useState('');
  const [staffMoeenCode, setStaffMoeenCode] = useState('');
  const [staffTafsiliCode, setStaffTafsiliCode] = useState('');
  const [staffError, setStaffError] = useState('');
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Work Log Modal
  const [isWorkLogModalOpen, setIsWorkLogModalOpen] = useState(false);
  const [workLogStaffId, setWorkLogStaffId] = useState<number>(staffMembers[0]?.id || 1);
  const [workLogHours, setWorkLogHours] = useState('');
  const [workLogOvertime, setWorkLogOvertime] = useState('');
  const [workLogSessions, setWorkLogSessions] = useState('');
  const [workLogAbsent, setWorkLogAbsent] = useState('');
  const [workLogNotes, setWorkLogNotes] = useState('');
  const [workLogError, setWorkLogError] = useState('');

  // Payment Modal (Salary / Insurance)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payStaffId, setPayStaffId] = useState<number>(staffMembers[0]?.id || 1);
  const [payType, setPayType] = useState<'salary' | 'insurance' | 'bonus'>('salary');
  const [payMonth, setPayMonth] = useState(MONTH_NAMES[0]);
  const [payGrossAmount, setPayGrossAmount] = useState('');
  const [payInsuranceDeduction, setPayInsuranceDeduction] = useState('');
  const [payNetAmount, setPayNetAmount] = useState('');
  const [payDate, setPayDate] = useState(todayJalali());
  const [payTrackingCode, setPayTrackingCode] = useState('');
  const [paySource, setPaySource] = useState<'bank' | 'own'>('bank');
  const [payAttachment, setPayAttachment] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Pay Slip Print Modal
  const [printSlipData, setPrintSlipData] = useState<{
    staff: StaffMember;
    payroll: ReturnType<typeof calculateStaffPayroll>;
    monthName: string;
    payment?: PayrollPayment;
  } | null>(null);

  // Filter staff list
  const filteredStaff = staffMembers.filter((s) => {
    if (!s.active) return false;
    if (selectedSchoolId !== 0 && s.school_id !== selectedSchoolId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = s.name.toLowerCase().includes(q);
      const matchRole = s.role_title.toLowerCase().includes(q);
      const matchPhone = s.phone.includes(q);
      const matchNid = s.national_id.includes(q);
      if (!matchName && !matchRole && !matchPhone && !matchNid) return false;
    }
    return true;
  });

  // Filter work logs
  const filteredWorkLogs = staffWorkLogs.filter((l) => {
    if (selectedSchoolId !== 0 && l.school_id !== selectedSchoolId) return false;
    if (selectedMonth && l.month_name !== selectedMonth) return false;
    return true;
  });

  // Filter payments
  const filteredPayments = payrollPayments.filter((p) => {
    if (selectedSchoolId !== 0 && p.school_id !== selectedSchoolId) return false;
    if (selectedMonth && p.month_name !== selectedMonth) return false;
    return true;
  });

  const handleImportStaff = (imported: Omit<StaffMember, 'id'>[]) => {
    let count = 0;
    imported.forEach((st) => {
      addStaffMember(st);
      count++;
    });
    alert(`${count} نفر از کادر و معلمان با موفقیت از اکسل وارد سامانه شدند.`);
  };

  // Open add staff modal
  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    setStaffName('');
    setStaffNationalId('');
    setStaffPhone('');
    setStaffRole(ROLE_OPTIONS[0]);
    setStaffSchoolId(selectedSchoolId !== 0 ? selectedSchoolId : schools[0]?.id || 1);
    setStaffContractType('hourly');
    setStaffHourlyRate('1,500,000');
    setStaffBaseSalary('0');
    setStaffEmployerIns('0');
    setStaffEmployeeIns('0');
    setStaffBankCard('');
    setStaffKolCode('');
    setStaffMoeenCode('');
    setStaffTafsiliCode('');
    setStaffError('');
    setIsStaffModalOpen(true);
  };

  // Open edit staff modal
  const handleOpenEditStaff = (st: StaffMember) => {
    setEditingStaff(st);
    setStaffName(st.name);
    setStaffNationalId(st.national_id);
    setStaffPhone(st.phone);
    setStaffRole(st.role_title);
    setStaffSchoolId(st.school_id);
    setStaffContractType(st.contract_type);
    setStaffHourlyRate(st.hourly_rate ? Number(st.hourly_rate).toLocaleString('en-US') : '');
    setStaffBaseSalary(st.base_salary ? Number(st.base_salary).toLocaleString('en-US') : '');
    setStaffEmployerIns(st.insurance_employer_share ? Number(st.insurance_employer_share).toLocaleString('en-US') : '');
    setStaffEmployeeIns(st.insurance_employee_share ? Number(st.insurance_employee_share).toLocaleString('en-US') : '');
    setStaffBankCard(st.bank_card_or_sheba || '');
    setStaffKolCode(st.kol_code || '');
    setStaffMoeenCode(st.moeen_code || '');
    setStaffTafsiliCode(st.tafsili_code || '');
    setStaffError('');
    setIsStaffModalOpen(true);
  };

  // Save staff member
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');
    if (!staffName.trim()) {
      setStaffError('نام و نام خانوادگی پرسنل را وارد کنید.');
      return;
    }
    if (!staffPhone.trim() || !/^0\d{10}$/.test(staffPhone.trim())) {
      setStaffError('شماره تلفن همراه باید ۱۱ رقمی و با ۰ شروع شود.');
      return;
    }

    const hr = Number(latinDigits(staffHourlyRate).replace(/\D/g, '')) || 0;
    const base = Number(latinDigits(staffBaseSalary).replace(/\D/g, '')) || 0;
    const insEmp = Number(latinDigits(staffEmployerIns).replace(/\D/g, '')) || 0;
    const insUser = Number(latinDigits(staffEmployeeIns).replace(/\D/g, '')) || 0;

    const school = schools.find((sc) => sc.id === staffSchoolId);

    if (editingStaff) {
      updateStaffMember(editingStaff.id, {
        name: staffName.trim(),
        national_id: staffNationalId.trim(),
        phone: staffPhone.trim(),
        role_title: staffRole,
        school_id: staffSchoolId,
        school_name: school?.name,
        contract_type: staffContractType,
        hourly_rate: hr,
        base_salary: base,
        insurance_employer_share: insEmp,
        insurance_employee_share: insUser,
        bank_card_or_sheba: staffBankCard.trim(),
        kol_code: staffKolCode.trim() || undefined,
        moeen_code: staffMoeenCode.trim() || undefined,
        tafsili_code: staffTafsiliCode.trim() || undefined,
      });
    } else {
      addStaffMember({
        name: staffName.trim(),
        national_id: staffNationalId.trim(),
        phone: staffPhone.trim(),
        role_title: staffRole,
        school_id: staffSchoolId,
        school_name: school?.name,
        contract_type: staffContractType,
        hourly_rate: hr,
        base_salary: base,
        insurance_employer_share: insEmp,
        insurance_employee_share: insUser,
        bank_card_or_sheba: staffBankCard.trim(),
        kol_code: staffKolCode.trim() || undefined,
        moeen_code: staffMoeenCode.trim() || undefined,
        tafsili_code: staffTafsiliCode.trim() || undefined,
        active: true,
        created_at: todayJalali(),
      });
    }

    setIsStaffModalOpen(false);
  };

  // Open Work Log Modal
  const handleOpenWorkLog = (staffId?: number) => {
    setWorkLogStaffId(staffId || filteredStaff[0]?.id || 1);
    setWorkLogHours('');
    setWorkLogOvertime('');
    setWorkLogSessions('');
    setWorkLogAbsent('');
    setWorkLogNotes('');
    setWorkLogError('');
    setIsWorkLogModalOpen(true);
  };

  // Save Work Log
  const handleSaveWorkLog = (e: React.FormEvent) => {
    e.preventDefault();
    setWorkLogError('');
    const hours = Number(latinDigits(workLogHours).replace(/\D/g, '')) || 0;
    const overtime = Number(latinDigits(workLogOvertime).replace(/\D/g, '')) || 0;
    const sessions = Number(latinDigits(workLogSessions).replace(/\D/g, '')) || 0;
    const absent = Number(latinDigits(workLogAbsent).replace(/\D/g, '')) || 0;

    if (hours === 0 && sessions === 0 && overtime === 0) {
      setWorkLogError('حداقل میزان ساعات کارکرد یا تعداد جلسات را وارد نمایید.');
      return;
    }

    const st = staffMembers.find((s) => s.id === workLogStaffId);
    if (!st) {
      setWorkLogError('پرسنل انتخاب شده معتبر نیست.');
      return;
    }

    addStaffWorkLog({
      staff_id: st.id,
      staff_name: st.name,
      school_id: st.school_id,
      school_name: st.school_name,
      month_name: selectedMonth,
      work_hours: hours,
      overtime_hours: overtime,
      sessions_count: sessions,
      absent_hours: absent,
      notes: workLogNotes.trim(),
      recorded_by: currentUser?.name || 'مدیر مدرسه',
      date: todayJalali(),
    });

    setIsWorkLogModalOpen(false);
  };

  // Open Payment Modal
  const handleOpenPayment = (staffId?: number, type: 'salary' | 'insurance' = 'salary') => {
    const targetId = staffId || filteredStaff[0]?.id || 1;
    setPayStaffId(targetId);
    setPayType(type);
    setPayMonth(selectedMonth);
    setPayDate(todayJalali());
    setPayTrackingCode('');
    setPaySource('bank');
    setPayAttachment('');
    setPayNotes('');
    setPaymentError('');

    // Precalculate salary
    const calc = calculateStaffPayroll(targetId, selectedMonth);
    const targetStaff = staffMembers.find((s) => s.id === targetId);

    if (type === 'salary') {
      setPayGrossAmount(calc.grossAmount.toLocaleString('en-US'));
      setPayInsuranceDeduction(calc.insuranceEmployee.toLocaleString('en-US'));
      setPayNetAmount(calc.netPayable.toLocaleString('en-US'));
      setPayNotes(`واریز حقوق ${selectedMonth} به شماره حساب/کارت ${targetStaff?.bank_card_or_sheba || 'بانکی'}`);
    } else {
      // Insurance payment
      const totalIns = calc.insuranceEmployer + calc.insuranceEmployee;
      setPayGrossAmount(totalIns.toLocaleString('en-US'));
      setPayInsuranceDeduction('0');
      setPayNetAmount(totalIns.toLocaleString('en-US'));
      setPayNotes(`پرداخت حق بیمه تامین اجتماعی ماه ${selectedMonth} شعبه شهرضا`);
    }

    setIsPaymentModalOpen(true);
  };

  // Save Payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');

    const net = Number(latinDigits(payNetAmount).replace(/\D/g, '')) || 0;
    const gross = Number(latinDigits(payGrossAmount).replace(/\D/g, '')) || 0;
    const ins = Number(latinDigits(payInsuranceDeduction).replace(/\D/g, '')) || 0;

    if (net <= 0) {
      setPaymentError('مبلغ خالص پرداختی باید بزرگتر از صفر باشد.');
      return;
    }
    if (!payTrackingCode.trim()) {
      setPaymentError('شماره پیگیری واریز بانکی الزامی است.');
      return;
    }
    if (!payAttachment || !payAttachment.trim()) {
      setPaymentError('ارسال عکس فیش واریز یا رسید پرداخت الزامی است. لطفاً تصویر رسید را با دوربین یا گالری الصاق نمایید.');
      return;
    }

    const st = staffMembers.find((s) => s.id === payStaffId);
    if (!st) {
      setPaymentError('پرسنل انتخاب شده معتبر نیست.');
      return;
    }

    addPayrollPayment({
      staff_id: st.id,
      staff_name: st.name,
      school_id: st.school_id,
      school_name: st.school_name,
      month_name: payMonth,
      payment_type: payType,
      gross_amount: gross,
      insurance_deduction: ins,
      net_paid_amount: net,
      payment_date: jalaliToIso(payDate),
      tracking_code: payTrackingCode.trim(),
      source: paySource,
      attachment_url: payAttachment,
      notes: payNotes.trim(),
    });

    setIsPaymentModalOpen(false);
  };

  // Open Pay Slip
  const handleOpenPaySlip = (st: StaffMember) => {
    const calc = calculateStaffPayroll(st.id, selectedMonth);
    const existingPayment = payrollPayments.find(
      (p) => p.staff_id === st.id && p.month_name === selectedMonth && p.payment_type === 'salary'
    );
    setPrintSlipData({
      staff: st,
      payroll: calc,
      monthName: selectedMonth,
      payment: existingPayment,
    });
  };

  return (
    <div className="min-h-screen bg-[#f8f5f9] pb-16">
      <Header title="مدیریت کارکنان، معلمان و پرداخت حقوق" />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Banner with Neyrizi title and Quranic motif */}
        <div
          className="rounded-3xl p-6 text-white shadow-xl relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #2c0f38 100%)`,
          }}
        >
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold bg-white/20 text-[#f5dff2] px-3 py-0.5 rounded-full">
                  مدرسه القرآن الکریم شهرضا
                </span>
                <span className="text-[11px] font-bold bg-amber-400 text-[#341648] px-2.5 py-0.5 rounded-full">
                  امور اداری و حقوق دستمزد
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-neyrizi tracking-wide">
                مدیریت جامع معلمان، مربیان و پرداخت حقوق و بیمه
              </h2>
              <p className="text-xs text-[#f5dff2]/90 mt-1 max-w-2xl leading-relaxed">
                سامانه ثبت ساعات کارکرد معلمان و مربیان، محاسبه اتوماتیک حقوق، پرداخت حقوق و بیمه به تأمین اجتماعی و صدور فیش رسمی حقوق
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => setIsExcelModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-white/95 hover:bg-white text-[#341648] font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-amber-300/60"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>ورود هوشمند از فایل اکسل</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddStaff}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-[#341648] font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>افزودن معلم / پرسنل جدید</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Filter Bar: Month Selector & School Selector */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#e5dde8] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-[#341648] whitespace-nowrap">دوره کارکرد:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-[#fcfaff] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#341648] focus:outline-hidden"
            >
              {MONTH_NAMES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {isSenior ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-[#341648] whitespace-nowrap">مدرسه:</span>
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(Number(e.target.value))}
                  className="px-3 py-2 bg-[#fcfaff] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#341648] focus:outline-hidden w-full sm:w-auto"
                >
                  <option value={0}>همه مدارس و مراکز قرآنی شهرضا</option>
                  {schools.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200">
                {currentUser?.school_name || 'مدرسه شما'}
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#e5dde8] shadow-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'staff'
                ? 'bg-[#62205f] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            style={activeTab === 'staff' ? { backgroundColor: accentColor } : {}}
          >
            <Users className="w-4 h-4" />
            <span>معلمان و پرسنل ({filteredStaff.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('work_logs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'work_logs'
                ? 'bg-[#62205f] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            style={activeTab === 'work_logs' ? { backgroundColor: accentColor } : {}}
          >
            <Clock className="w-4 h-4" />
            <span>کارکرد ساعتی و حضور ({filteredWorkLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'payroll'
                ? 'bg-[#62205f] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            style={activeTab === 'payroll' ? { backgroundColor: accentColor } : {}}
          >
            <CreditCard className="w-4 h-4" />
            <span>پرداخت حقوق و بیمه ({filteredPayments.length})</span>
          </button>
        </div>

        {/* Tab 1: Staff Directory */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            {/* Search Box */}
            <div className="bg-white rounded-3xl p-4 border border-[#e5dde8] shadow-xs">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جست‌وجوی نام، سمت، کدملی یا شماره همراه معلم..."
                  className="w-full pl-4 pr-11 py-2.5 bg-[#fdfcfd] rounded-2xl border border-[#e5dde8] text-xs font-medium focus:outline-hidden focus:border-[#62205f]"
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-3" />
              </div>
            </div>

            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStaff.length === 0 ? (
                <div className="col-span-full bg-white rounded-3xl p-12 text-center text-gray-400 space-y-2 border border-[#e5dde8]">
                  <GraduationCap className="w-10 h-10 mx-auto text-gray-300" />
                  <p className="text-sm font-bold text-gray-600">پرسنل یا معلمی یافت نشد.</p>
                  <button
                    type="button"
                    onClick={handleOpenAddStaff}
                    className="mt-2 px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold"
                  >
                    افزودن اولین معلم / مربی
                  </button>
                </div>
              ) : (
                filteredStaff.map((st) => {
                  const calc = calculateStaffPayroll(st.id, selectedMonth);
                  return (
                    <div
                      key={st.id}
                      className="bg-white rounded-3xl p-5 border border-[#e5dde8] hover:border-purple-300 shadow-xs hover:shadow-md transition-all space-y-3.5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-base border border-purple-200">
                              <GraduationCap className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-[#341648]">{st.name}</h4>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] bg-purple-100 text-purple-900 font-bold px-2 py-0.5 rounded-md">
                                  {st.role_title}
                                </span>
                                <span className="text-[10px] bg-gray-100 text-gray-700 font-semibold px-2 py-0.5 rounded-md">
                                  {st.school_name}
                                </span>
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800">
                            {st.contract_type === 'hourly'
                              ? 'ساعتی'
                              : st.contract_type === 'session'
                              ? 'جلسه‌ای'
                              : 'ماهانه ثابت'}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-3 border-t border-gray-100">
                          <div>
                            <span className="text-gray-400">شماره تماس:</span>{' '}
                            <span className="font-mono font-bold text-gray-800">{st.phone}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">کد ملی:</span>{' '}
                            <span className="font-mono text-gray-800">{st.national_id || '---'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">نرخ ساعت:</span>{' '}
                            <span className="font-mono font-bold text-purple-900">
                              {st.hourly_rate ? formatRial(st.hourly_rate) : '---'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">حقوق پایه:</span>{' '}
                            <span className="font-mono text-gray-800">
                              {st.base_salary ? formatRial(st.base_salary) : 'ساعتی'}
                            </span>
                          </div>
                          {(st.kol_code || st.moeen_code || st.tafsili_code) && (
                            <div className="col-span-2 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200 flex items-center justify-between text-[11px]">
                              <span className="text-amber-900 font-bold">کدهای حسابداری پارسیان:</span>
                              <span className="font-mono font-bold text-amber-950" dir="ltr">
                                کل: {st.kol_code || '-'} | معین: {st.moeen_code || '-'} | تفصیلی: {st.tafsili_code || '-'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Current Month Work Log Badge */}
                        <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-100 flex items-center justify-between text-xs mt-3">
                          <span className="text-purple-950 font-bold">
                            کارکرد {selectedMonth}:
                          </span>
                          <span className="font-bold text-purple-900">
                            {calc.workHours} ساعت عادی + {calc.overtimeHours} اضافه
                            {calc.sessionsCount > 0 && ` + ${calc.sessionsCount} جلسه`}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenWorkLog(st.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-purple-100/80 hover:bg-purple-200 text-purple-900 font-bold flex items-center gap-1 text-[11px]"
                            title="ثبت ساعت کارکرد ماهانه"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>ثبت کارکرد</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenPaySlip(st)}
                            className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center gap-1 text-[11px]"
                            title="مشاهده و چاپ فیش حقوقی"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>فیش حقوق</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {isSenior && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayment(st.id, 'salary')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 text-[11px] shadow-2xs"
                              title="پرداخت حقوق ماهانه"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>پرداخت حقوق</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditStaff(st)}
                            className="p-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600"
                            title="ویرایش مشخصات"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isSenior && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`آیا از حذف معلم/پرسنل ${st.name} اطمینان دارید؟`)) {
                                  deleteStaffMember(st.id);
                                }
                              }}
                              className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Work Logs */}
        {activeTab === 'work_logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#341648]">
                  گزارش کارکرد معلمان و مربیان در دوره {selectedMonth}
                </h3>
                <p className="text-xs text-gray-500">
                  ثبت ساعات کارکرد عادی، اضافه‌کار، جلسات تدریس قرآن و غیبت
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenWorkLog()}
                className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>ثبت کارکرد جدید</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-[#e5dde8] shadow-xs overflow-hidden">
              {filteredWorkLogs.length === 0 ? (
                <div className="p-12 text-center text-gray-400 space-y-2">
                  <Clock className="w-10 h-10 mx-auto text-gray-300" />
                  <p className="text-sm font-bold text-gray-600">هنوز کارکردی برای دوره {selectedMonth} ثبت نشده است.</p>
                  <p className="text-xs">مدیران مدارس می‌توانند با زدن دکمه «ثبت کارکرد جدید» ساعات معلمان خود را وارد نمایند.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredWorkLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 hover:bg-[#fcfaff] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#341648]">{log.staff_name}</span>
                          <span className="text-[10px] bg-purple-100 text-purple-900 font-semibold px-2 py-0.5 rounded-md">
                            {log.school_name}
                          </span>
                          <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                            {log.month_name}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                          <span>ساعات عادی: <strong className="font-mono text-purple-900">{log.work_hours} ساعت</strong></span>
                          <span>•</span>
                          <span>اضافه‌کار: <strong className="font-mono text-amber-700">{log.overtime_hours} ساعت</strong></span>
                          {log.sessions_count ? (
                            <>
                              <span>•</span>
                              <span>جلسات: <strong className="font-mono text-emerald-700">{log.sessions_count} جلسه</strong></span>
                            </>
                          ) : null}
                          {log.notes && (
                            <>
                              <span>•</span>
                              <span className="text-gray-500">{log.notes}</span>
                            </>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          ثبت‌شده توسط: {log.recorded_by} در تاریخ {log.date}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('آیا از حذف این رکورد کارکرد اطمینان دارید؟')) {
                              deleteStaffWorkLog(log.id);
                            }
                          }}
                          className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs"
                          title="حذف رکورد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Payroll & Insurance Payments */}
        {activeTab === 'payroll' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#341648]">
                  مدیریت پرداخت حقوق و پرداخت بیمه تامین اجتماعی ({selectedMonth})
                </h3>
                <p className="text-xs text-gray-500">
                  پرداخت‌های ثبت‌شده مستقیماً در هزینه‌ها و تراز مالی مدرسه محاسبه می‌گردند
                </p>
              </div>

              {isSenior && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenPayment(undefined, 'salary')}
                    className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>ثبت پرداخت حقوق</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenPayment(undefined, 'insurance')}
                    className="px-3.5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>ثبت پرداخت بیمه</span>
                  </button>
                </div>
              )}
            </div>

            {/* Payments List */}
            <div className="bg-white rounded-3xl border border-[#e5dde8] shadow-xs overflow-hidden">
              {filteredPayments.length === 0 ? (
                <div className="p-12 text-center text-gray-400 space-y-2">
                  <CreditCard className="w-10 h-10 mx-auto text-gray-300" />
                  <p className="text-sm font-bold text-gray-600">هنوز پرداختی در دوره {selectedMonth} ثبت نشده است.</p>
                  {isSenior ? (
                    <p className="text-xs">جهت ثبت واریز حقوق معلمان یا بیمه تأمین اجتماعی، از دکمه‌های بالا استفاده فرمایید.</p>
                  ) : (
                    <p className="text-xs">پرداخت حقوق توسط کاربر ارشد سامانه ثبت می‌گردد.</p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredPayments.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 hover:bg-[#fcfaff] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#341648]">{p.staff_name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            p.payment_type === 'salary'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {p.payment_type === 'salary' ? 'پرداخت حقوق' : 'پرداخت بیمه تامین اجتماعی'}
                          </span>
                          <span className="text-[10px] bg-purple-100 text-purple-900 font-semibold px-2 py-0.5 rounded-md">
                            {p.school_name}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                          <span>
                            خالص پرداختی:{' '}
                            <strong className="font-mono font-bold text-emerald-700">
                              {formatRial(p.net_paid_amount)} ریال
                            </strong>
                          </span>
                          <span>•</span>
                          <span>پیگیری: <strong className="font-mono text-gray-700">{p.tracking_code}</strong></span>
                          <span>•</span>
                          <span>تاریخ: <span className="font-mono text-gray-700">{jalaliFromGregorian(p.payment_date)}</span></span>
                          {p.notes && (
                            <>
                              <span>•</span>
                              <span className="text-gray-500">{p.notes}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {p.attachment_url && (
                          <button
                            type="button"
                            onClick={() => void openAttachment(p.attachment_url!)}
                            className="px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-purple-700 text-xs font-bold flex items-center gap-1 shadow-2xs"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>رسید</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const st = staffMembers.find((s) => s.id === p.staff_id);
                            if (st) {
                              const calc = calculateStaffPayroll(st.id, p.month_name);
                              setPrintSlipData({
                                staff: st,
                                payroll: calc,
                                monthName: p.month_name,
                                payment: p,
                              });
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>چاپ فیش</span>
                        </button>

                        {isSenior && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('آیا از حذف این پرداخت اطمینان دارید؟')) {
                                deletePayrollPayment(p.id);
                              }
                            }}
                            className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Staff Modal (Add / Edit) */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#e5dde8] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="text-base font-bold text-[#341648]">
                {editingStaff ? 'ویرایش مشخصات معلم / پرسنل' : 'ثبت مشخصات معلم و مربی جدید'}
              </h4>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {staffError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                ⚠️ {staffError}
              </div>
            )}

            <form onSubmit={handleSaveStaff} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">
                    نام و نام خانوادگی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="مثال: علیرضا کاظمی"
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-semibold focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">
                    شماره همراه <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    placeholder="مثال: 09132214567"
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-mono focus:outline-hidden"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">سمت / عنوان شغلی</label>
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-semibold text-[#302735]"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">مدرسه مربوطه</label>
                  <select
                    disabled={!isSenior}
                    value={staffSchoolId}
                    onChange={(e) => setStaffSchoolId(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-semibold text-[#302735]"
                  >
                    {schools.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">کد ملی</label>
                  <input
                    type="text"
                    value={staffNationalId}
                    onChange={(e) => setStaffNationalId(e.target.value)}
                    placeholder="۱۰ رقم کد ملی"
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-mono focus:outline-hidden"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">شیوه قرارداد و محاسبه</label>
                  <select
                    value={staffContractType}
                    onChange={(e) => setStaffContractType(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-semibold text-[#302735]"
                  >
                    <option value="hourly">ساعتی (کارکرد بر مبنای ساعت)</option>
                    <option value="monthly">ماهانه ثابت (به اضافه اضافه‌کار)</option>
                    <option value="session">جلسه‌ای (مربیان کلاس‌های قرآن)</option>
                  </select>
                </div>
              </div>

              {/* Financial terms (editable by Senior Manager) */}
              <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-700" />
                    <span>مقررات مالی و نرخ دستمزد {isSenior ? '⭐ (قابل ویرایش مدیر ارشد)' : '(مشاهده)'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      نرخ هر ساعت کارکرد (ریال)
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      disabled={!isSenior}
                      value={staffHourlyRate}
                      onChange={(e) => {
                        const raw = latinDigits(e.target.value).replace(/\D/g, '');
                        setStaffHourlyRate(raw ? Number(raw).toLocaleString('en-US') : '');
                      }}
                      placeholder="مثال: ۱,۵۰۰,۰۰۰"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-gray-300 text-xs font-mono text-left focus:outline-hidden"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      حقوق پایه ماهانه (ریال)
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      disabled={!isSenior}
                      value={staffBaseSalary}
                      onChange={(e) => {
                        const raw = latinDigits(e.target.value).replace(/\D/g, '');
                        setStaffBaseSalary(raw ? Number(raw).toLocaleString('en-US') : '');
                      }}
                      placeholder="مثال: ۱۲۰,۰۰۰,۰۰۰"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-gray-300 text-xs font-mono text-left focus:outline-hidden"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      سهم بیمه کارفرما / مدرسه (ریال)
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      disabled={!isSenior}
                      value={staffEmployerIns}
                      onChange={(e) => {
                        const raw = latinDigits(e.target.value).replace(/\D/g, '');
                        setStaffEmployerIns(raw ? Number(raw).toLocaleString('en-US') : '');
                      }}
                      placeholder="۲۳ درصد سهم مدرسه"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-gray-300 text-xs font-mono text-left focus:outline-hidden"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      کسورات سهم بیمه کارمند (ریال)
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      disabled={!isSenior}
                      value={staffEmployeeIns}
                      onChange={(e) => {
                        const raw = latinDigits(e.target.value).replace(/\D/g, '');
                        setStaffEmployeeIns(raw ? Number(raw).toLocaleString('en-US') : '');
                      }}
                      placeholder="۷ درصد کسر از حقوق"
                      className="w-full px-3 py-2 bg-white rounded-xl border border-gray-300 text-xs font-mono text-left focus:outline-hidden"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              {/* Parsian Accounting Codes */}
              <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/80 space-y-2.5">
                <div className="text-xs font-bold text-amber-950 flex items-center justify-between">
                  <span>کدهای حسابداری پارسیان (معلم / پرسنل)</span>
                  <span className="text-[10px] text-amber-800 font-normal">کل • معین • تفصیلی</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">کد کل</label>
                    <input
                      type="text"
                      value={staffKolCode}
                      onChange={(e) => setStaffKolCode(e.target.value)}
                      placeholder="مثال: ۸۰۱"
                      className="w-full px-2.5 py-2 bg-white rounded-xl border border-amber-200 text-xs font-mono text-center focus:outline-hidden"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">کد معین</label>
                    <input
                      type="text"
                      value={staffMoeenCode}
                      onChange={(e) => setStaffMoeenCode(e.target.value)}
                      placeholder="مثال: ۱۲"
                      className="w-full px-2.5 py-2 bg-white rounded-xl border border-amber-200 text-xs font-mono text-center focus:outline-hidden"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">کد تفصیلی</label>
                    <input
                      type="text"
                      value={staffTafsiliCode}
                      onChange={(e) => setStaffTafsiliCode(e.target.value)}
                      placeholder="مثال: ۱۰۴"
                      className="w-full px-2.5 py-2 bg-white rounded-xl border border-amber-200 text-xs font-mono text-center focus:outline-hidden"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1">شماره شبا یا کارت بانکی</label>
                <input
                  type="text"
                  value={staffBankCard}
                  onChange={(e) => setStaffBankCard(e.target.value)}
                  placeholder="مثال: IR450170000000123456789012 یا ۱۶ رقم کارت"
                  className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-mono focus:outline-hidden"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md active:scale-95"
                >
                  {editingStaff ? 'ذخیره تغییرات' : 'ثبت معلم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Work Log Modal */}
      {isWorkLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#e5dde8]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="text-base font-bold text-[#341648]">ثبت کارکرد ماهانه ({selectedMonth})</h4>
              <button
                type="button"
                onClick={() => setIsWorkLogModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {workLogError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                ⚠️ {workLogError}
              </div>
            )}

            <form onSubmit={handleSaveWorkLog} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1">انتخاب معلم یا پرسنل</label>
                <select
                  value={workLogStaffId}
                  onChange={(e) => setWorkLogStaffId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735]"
                >
                  {filteredStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role_title} - {s.school_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">
                    ساعات کارکرد موظف / عادی
                  </label>
                  <input
                    type="number"
                    value={workLogHours}
                    onChange={(e) => setWorkLogHours(e.target.value)}
                    placeholder="مثال: 64"
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-mono text-left focus:outline-hidden"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">
                    ساعات اضافه‌کار (با ضریب ۱.۴)
                  </label>
                  <input
                    type="number"
                    value={workLogOvertime}
                    onChange={(e) => setWorkLogOvertime(e.target.value)}
                    placeholder="مثال: 12"
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-mono text-left focus:outline-hidden"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">
                    تعداد جلسات (برای مربیان جلسه‌ای)
                  </label>
                  <input
                    type="number"
                    value={workLogSessions}
                    onChange={(e) => setWorkLogSessions(e.target.value)}
                    placeholder="مثال: 16"
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-mono text-left focus:outline-hidden"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">
                    کسر کار یا غیبت (ساعت)
                  </label>
                  <input
                    type="number"
                    value={workLogAbsent}
                    onChange={(e) => setWorkLogAbsent(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-mono text-left focus:outline-hidden"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#341648] mb-1">توضیحات و گزارش کارکرد</label>
                <input
                  type="text"
                  value={workLogNotes}
                  onChange={(e) => setWorkLogNotes(e.target.value)}
                  placeholder="مثال: برگزاری کلاس‌های حفظ تخصصی..."
                  className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsWorkLogModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md active:scale-95"
                >
                  ثبت کارکرد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal (Salary & Insurance with Mandatory Compressed Receipt Upload) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#e5dde8] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="text-base font-bold text-[#341648]">
                {payType === 'salary' ? 'ثبت پرداخت حقوق معلم / پرسنل' : 'ثبت پرداخت حق بیمه تأمین اجتماعی'}
              </h4>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {paymentError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                ⚠️ {paymentError}
              </div>
            )}

            <form onSubmit={handleSavePayment} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">نوع پرداخت</label>
                  <select
                    value={payType}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setPayType(t);
                      // update notes
                      const st = staffMembers.find((s) => s.id === payStaffId);
                      if (t === 'salary') {
                        setPayNotes(`واریز حقوق ${payMonth} به حساب ${st?.bank_card_or_sheba || 'بانکی'}`);
                      } else {
                        setPayNotes(`پرداخت حق بیمه تامین اجتماعی دوره ${payMonth} شعبه شهرضا`);
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735]"
                  >
                    <option value="salary">پرداخت حقوق و دستمزد</option>
                    <option value="insurance">پرداخت حق بیمه تأمین اجتماعی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">معلم / پرسنل</label>
                  <select
                    value={payStaffId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setPayStaffId(id);
                      const calc = calculateStaffPayroll(id, payMonth);
                      if (payType === 'salary') {
                        setPayGrossAmount(calc.grossAmount.toLocaleString('en-US'));
                        setPayInsuranceDeduction(calc.insuranceEmployee.toLocaleString('en-US'));
                        setPayNetAmount(calc.netPayable.toLocaleString('en-US'));
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735]"
                  >
                    {filteredStaff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} - {s.school_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">مبلغ ناخالص (ریال)</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    value={payGrossAmount}
                    onChange={(e) => {
                      const raw = latinDigits(e.target.value).replace(/\D/g, '');
                      setPayGrossAmount(raw ? Number(raw).toLocaleString('en-US') : '');
                    }}
                    className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-300 text-xs font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">کسر بیمه (ریال)</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    value={payInsuranceDeduction}
                    onChange={(e) => {
                      const raw = latinDigits(e.target.value).replace(/\D/g, '');
                      setPayInsuranceDeduction(raw ? Number(raw).toLocaleString('en-US') : '');
                    }}
                    className="w-full px-3 py-2 bg-gray-50 rounded-xl border border-gray-300 text-xs font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">خالص پرداختی (ریال) *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    value={payNetAmount}
                    onChange={(e) => {
                      const raw = latinDigits(e.target.value).replace(/\D/g, '');
                      setPayNetAmount(raw ? Number(raw).toLocaleString('en-US') : '');
                    }}
                    className="w-full px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-300 text-xs font-mono font-bold text-emerald-900 text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <JalaliDatePicker
                  label="تاریخ واریز"
                  value={payDate}
                  onChange={setPayDate}
                  required
                />

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">
                    شماره پیگیری واریز بانکی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={payTrackingCode}
                    onChange={(e) => setPayTrackingCode(e.target.value)}
                    placeholder="مثال: BNK-7789410"
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-mono text-left focus:outline-hidden"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">منبع پرداخت</label>
                  <select
                    value={paySource}
                    onChange={(e) => setPaySource(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs font-bold text-[#302735]"
                  >
                    <option value="bank">حساب بانکی مدرسه القرآن</option>
                    <option value="own">پرداخت شخصی مدیر (طلب از مدرسه)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#341648] mb-1">توضیحات</label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="شرح واریزی..."
                    className="w-full px-3 py-2.5 bg-[#fdfcfd] rounded-xl border border-[#e5dde8] text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Receipt Image Upload (MANDATORY with compression) */}
              <ReceiptImageUploader
                value={payAttachment}
                onChange={setPayAttachment}
                required={true}
                label="تصویر فیش واریز / رسید بانکی پرداخت حقوق"
                helperText="ارسال عکس فیش پرداختی الزامی است و برای بایگانی اسناد مالی مدرسه ذخیره می‌شود."
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md active:scale-95"
                >
                  ثبت قطعی پرداخت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Pay Slip Print Modal */}
      {printSlipData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-gray-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 no-print">
              <h4 className="text-base font-bold text-[#341648]">فیش حقوق و دستمزد رسمی</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSignatureModal(true)}
                  className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#62205f] border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <PenTool className="w-3.5 h-3.5 text-[#62205f]" />
                  <span>{managerSignature ? 'ویرایش امضای فیش' : 'افزودن امضای مدیر'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintSlipData(null)}
                  className="p-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold"
                >
                  بستن
                </button>
              </div>
            </div>

            {/* Printable Slip Container */}
            <div className="p-6 bg-white border-2 border-purple-900/40 rounded-2xl space-y-5 print:border-none print:p-0">
              {/* Slip Header */}
              <div className="text-center pb-4 border-b-2 border-dashed border-gray-300 space-y-1">
                <div className="text-xs font-bold text-gray-500">بسم الله الرحمن الرحیم</div>
                <h3 className="text-xl font-black font-neyrizi text-purple-950">
                  سیستم جامع امور مالی مدرسه القرآن الکریم شهرضا
                </h3>
                <h4 className="text-sm font-bold text-gray-800">
                  فیش رسمی پرداخت حقوق و دستمزد ماهانه • دوره {printSlipData.monthName}
                </h4>
              </div>

              {/* Personal Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-3.5 rounded-xl text-xs border border-gray-200">
                <div>
                  <span className="text-gray-400">نام و نام خانوادگی:</span>
                  <div className="font-bold text-gray-900 mt-0.5">{printSlipData.staff.name}</div>
                </div>
                <div>
                  <span className="text-gray-400">عنوان شغلی:</span>
                  <div className="font-bold text-gray-900 mt-0.5">{printSlipData.staff.role_title}</div>
                </div>
                <div>
                  <span className="text-gray-400">مدرسه / مرکز:</span>
                  <div className="font-bold text-gray-900 mt-0.5">{printSlipData.staff.school_name}</div>
                </div>
                <div>
                  <span className="text-gray-400">کد ملی:</span>
                  <div className="font-mono font-bold text-gray-900 mt-0.5">{printSlipData.staff.national_id || '---'}</div>
                </div>
              </div>

              {/* Earnings & Deductions Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full divide-y divide-gray-200 text-right">
                  <thead className="bg-purple-50 text-purple-950 font-bold">
                    <tr>
                      <th className="p-2.5">شرح کارکرد و مزایا</th>
                      <th className="p-2.5 text-center">مقدار</th>
                      <th className="p-2.5 text-left">مبلغ (ریال)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="p-2.5">ساعات کارکرد موظف / عادی</td>
                      <td className="p-2.5 text-center font-mono">{printSlipData.payroll.workHours} ساعت</td>
                      <td className="p-2.5 text-left font-mono font-bold">
                        {formatRial(printSlipData.payroll.workHours * printSlipData.payroll.hourlyRate)}
                      </td>
                    </tr>
                    {printSlipData.payroll.overtimeHours > 0 && (
                      <tr>
                        <td className="p-2.5">ساعات اضافه‌کار (ضریب ۱.۴)</td>
                        <td className="p-2.5 text-center font-mono">{printSlipData.payroll.overtimeHours} ساعت</td>
                        <td className="p-2.5 text-left font-mono font-bold">
                          {formatRial(Math.round(printSlipData.payroll.overtimeHours * printSlipData.payroll.hourlyRate * 1.4))}
                        </td>
                      </tr>
                    )}
                    {printSlipData.payroll.baseSalary > 0 && (
                      <tr>
                        <td className="p-2.5">حقوق پایه ماهانه</td>
                        <td className="p-2.5 text-center font-mono">ثابت</td>
                        <td className="p-2.5 text-left font-mono font-bold">
                          {formatRial(printSlipData.payroll.baseSalary)}
                        </td>
                      </tr>
                    )}
                    {printSlipData.payroll.sessionsCount > 0 && (
                      <tr>
                        <td className="p-2.5">تعداد جلسات تدریس قرآن</td>
                        <td className="p-2.5 text-center font-mono">{printSlipData.payroll.sessionsCount} جلسه</td>
                        <td className="p-2.5 text-left font-mono font-bold">
                          {formatRial(printSlipData.payroll.sessionsCount * printSlipData.payroll.hourlyRate)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-gray-50/60 font-bold">
                      <td colSpan={2} className="p-2.5 text-gray-800">مجموع ناخالص حقوق و مزایا:</td>
                      <td className="p-2.5 text-left font-mono text-purple-900">
                        {formatRial(printSlipData.payroll.grossAmount)} ریال
                      </td>
                    </tr>
                    <tr className="text-rose-700">
                      <td colSpan={2} className="p-2.5">کسورات سهم بیمه کارمند (تأمین اجتماعی):</td>
                      <td className="p-2.5 text-left font-mono font-bold">
                        - {formatRial(printSlipData.payroll.insuranceEmployee)} ریال
                      </td>
                    </tr>
                    <tr className="bg-emerald-50 text-emerald-950 font-black text-sm">
                      <td colSpan={2} className="p-3">خالص پرداختی به پرسنل:</td>
                      <td className="p-3 text-left font-mono text-emerald-900">
                        {formatRial(printSlipData.payroll.netPayable)} ریال
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Payment Status & Signatures */}
              <div className="pt-3 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                <div>
                  <span className="text-gray-400">وضعیت پرداخت:</span>{' '}
                  {printSlipData.payment ? (
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                      واریز شد (پیگیری: {printSlipData.payment.tracking_code})
                    </span>
                  ) : (
                    <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md">
                      محاسبه‌شده - در انتظار واریز مدیر ارشد
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-12 text-center text-gray-700 pt-6">
                  <div>
                    <div className="text-[11px] text-gray-400">امضای امور مالی:</div>
                    {managerSignature ? (
                      <div className="h-16 flex items-center justify-center">
                        <img
                          src={managerSignature}
                          alt="امضای رسمی امور مالی"
                          className="max-h-16 max-w-[170px] object-contain drop-shadow-xs"
                        />
                      </div>
                    ) : (
                      <div className="font-bold mt-3 text-purple-950">سیدمهدی گلزاری</div>
                    )}
                    <div className="text-[10px] text-gray-500 font-bold mt-1">سیدمهدی گلزاری</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400">مهر و امضای مدرسه:</div>
                    <div className="font-bold mt-3 text-purple-950">مدرسه القرآن الکریم شهرضا</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Smart Staff Excel Importer Modal */}
      <StaffExcelModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        schools={schools}
        defaultSchoolId={selectedSchoolId !== 0 ? selectedSchoolId : schools[0]?.id || 1}
        onImport={handleImportStaff}
        accentColor={accentColor}
      />

      {/* Signature Uploader Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="max-w-md w-full relative">
            <button
              onClick={() => setShowSignatureModal(false)}
              className="absolute -top-3 -right-3 z-10 p-2 rounded-full bg-white text-gray-700 shadow-lg border border-gray-200 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
            <SignatureUploader
              currentSignature={managerSignature}
              onSave={(sig) => {
                setManagerSignature(sig);
                setShowSignatureModal(false);
              }}
              title="امضای رسمی امور مالی (سیدمهدی گلزاری)"
              accentColor={accentColor}
            />
          </div>
        </div>
      )}
    </div>
  );
};
