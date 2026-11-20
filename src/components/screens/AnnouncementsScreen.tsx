import React, { useEffect, useMemo, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Header } from '../Header';
import SchoolSelect from '../SchoolSelect';
import { useApp } from '../../context/AppContext';
import { Student, AnnouncementSmsLog } from '../../types';
import { Megaphone, Send, Users, Smartphone, Globe, History, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface NativeSmsPlugin {
  send(options: { phone: string; message: string }): Promise<{ accepted: boolean; message?: string }>;
  requestPermission(): Promise<{ granted: boolean }>;
}
const NativeSms = registerPlugin<NativeSmsPlugin>('NativeSms');
const STORAGE_KEY = 'school_finance_announcement_sms_logs';
const readLogs = (): AnnouncementSmsLog[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};
const normalizePhone = (value?: string) => (value || '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '');

export const AnnouncementsScreen: React.FC = () => {
  const { currentUser, students, schools, accentColor } = useApp();
  const senior = currentUser?.role === 'senior' || currentUser?.role === 'admin';
  const [schoolId, setSchoolId] = useState<number>(senior ? 0 : currentUser?.school_id || 0);
  const [grade, setGrade] = useState('all');
  const [recipient, setRecipient] = useState<'mother' | 'father' | 'both'>('mother');
  const [provider, setProvider] = useState<'sim' | 'panel'>('sim');
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [logs, setLogs] = useState<AnnouncementSmsLog[]>(readLogs);
  const [tab, setTab] = useState<'compose' | 'history'>('compose');
  const [notice, setNotice] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [showSmsGuide, setShowSmsGuide] = useState(false);

  const filteredStudents = useMemo(() => students.filter(s => s.active !== false && (schoolId === 0 || s.school_id === schoolId) && (grade === 'all' || String(s.grade) === grade)), [students, schoolId, grade]);
  useEffect(() => { setSelectedStudentIds(filteredStudents.map(s => s.id)); }, [filteredStudents]);

  const grades = useMemo(() => Array.from(new Set(students.filter(s => s.active !== false && (schoolId === 0 || s.school_id === schoolId)).map(s => String(s.grade || '').trim()).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'fa')), [students, schoolId]);
  const targets = useMemo(() => {
    const rows: {student: Student; phone: string; who: 'mother'|'father'}[] = [];
    filteredStudents.filter(student => selectedStudentIds.includes(student.id)).forEach(student => {
      const phones = recipient === 'both' ? [{phone: student.mother_phone,who:'mother' as const},{phone: student.father_phone || student.phone,who:'father' as const}] : recipient === 'mother' ? [{phone: student.mother_phone,who:'mother' as const}] : [{phone: student.father_phone || student.phone,who:'father' as const}];
      phones.forEach(x => { const phone = normalizePhone(x.phone); if (/^09\d{9}$/.test(phone)) rows.push({student,phone,who:x.who}); });
    });
    return rows.filter((x,i,all)=>all.findIndex(y=>y.phone===x.phone && y.student.id===x.student.id)===i);
  }, [filteredStudents, selectedStudentIds, recipient]);

  const saveLog = (entry: AnnouncementSmsLog) => {
    setLogs(prev => { const next=[entry,...prev].slice(0,1500); try { localStorage.setItem(STORAGE_KEY,JSON.stringify(next)); } catch {} return next; });
  };

  const sendCampaign = async () => {
    if (!message.trim() || !targets.length || sending) return;
    if (provider === 'panel') { setNotice('اتصال پنل پیامکی هنوز پیکربندی نشده است؛ فعلاً ارسال از سیم‌کارت اندروید در دسترس است.'); return; }
    if (!Capacitor.isNativePlatform()) { setNotice('ارسال مستقیم سیم‌کارت فقط در نسخه نصب‌شده اندروید فعال است؛ نسخه وب صرفاً امکان آماده‌سازی و پیش‌نمایش را دارد.'); return; }
    setSending(true); setConfirmed(false); setNotice('');
    try {
      const permission = await NativeSms.requestPermission();
      if (!permission.granted) { setShowSmsGuide(true); throw new Error('مجوز پیامک هنوز فعال نیست. راهنمای فعال‌سازی را در همین صفحه دنبال کنید.'); }
      setShowSmsGuide(false);
      setProgress({done:0,total:targets.length});
      for (let i=0;i<targets.length;i++) {
        const target=targets[i];
        const school=schools.find(s=>s.id===target.student.school_id);
        try {
          const result=await NativeSms.send({phone:target.phone,message:message.trim()});
          if (!result.accepted) throw new Error(result.message || 'ارسال توسط اندروید پذیرفته نشد.');
          saveLog({id: crypto.randomUUID(),campaign:message.trim(),phone:target.phone,student_name:target.student.name,school_name:school?.name || target.student.school_name || '',grade:target.student.grade,recipient:target.who,status:'accepted',sent_at:new Date().toISOString(),sent_by:currentUser?.name || ''});
        } catch (error) {
          saveLog({id: crypto.randomUUID(),campaign:message.trim(),phone:target.phone,student_name:target.student.name,school_name:school?.name || '',grade:target.student.grade,recipient:target.who,status:'failed',error:error instanceof Error?error.message:'خطای ارسال',sent_at:new Date().toISOString(),sent_by:currentUser?.name || ''});
        }
        setProgress({done:i+1,total:targets.length});
        await new Promise(resolve=>setTimeout(resolve,450));
      }
      setNotice('صف ارسال تمام شد. «پذیرفته‌شده» یعنی اندروید درخواست را قبول کرده؛ تحویل قطعی پیامک از این صفحه قابل تضمین نیست.');
    } catch(error) { setNotice(error instanceof Error?error.message:'خطا در شروع ارسال پیامک'); }
    finally { setSending(false); }
  };

  return <div className="min-h-screen bg-[#f8f5f9] pb-12" dir="rtl">
    <Header title="اطلاع‌رسانی و پیامک والدین" />
    <main className="max-w-4xl mx-auto px-4 py-5 space-y-4">
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-[#e5dde8]">
        <button onClick={()=>setTab('compose')} className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${tab==='compose'?'text-white':'text-gray-600'}`} style={tab==='compose'?{background:accentColor}:{}}>ارسال پیام جدید</button>
        <button onClick={()=>setTab('history')} className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${tab==='history'?'text-white':'text-gray-600'}`} style={tab==='history'?{background:accentColor}:{}}>گزارش ارسال‌ها ({logs.length})</button>
      </div>
      {tab==='compose' ? <>
        <section className="bg-white rounded-3xl border border-[#e5dde8] p-5 space-y-4">
          <div className="flex items-center gap-2 font-black text-[#341648]"><Megaphone style={{color:accentColor}}/> پیام عمومی؛ مستقل از پیامک شهریه</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-bold space-y-1.5">مرکز آموزشی
              {senior ? <SchoolSelect schools={schools} value={schoolId} onChange={v=>{setSchoolId(Number(v));setGrade('all');}} includeAll allValue={0} allLabel="همه مدارس" className="w-full p-3 rounded-xl border border-[#e5dde8] bg-white"/> : <div className="p-3 rounded-xl bg-gray-50 border">{currentUser?.school_name || 'مدرسه شما'}</div>}
            </label>
            <label className="text-xs font-bold space-y-1.5">پایه تحصیلی
              <select value={grade} onChange={e=>setGrade(e.target.value)} className="w-full p-3 rounded-xl border border-[#e5dde8] bg-white"><option value="all">همه پایه‌ها</option>{grades.map(g=><option key={g} value={g}>{g}</option>)}</select>
            </label>
            <label className="text-xs font-bold space-y-1.5">گیرنده پیام
              <select value={recipient} onChange={e=>setRecipient(e.target.value as any)} className="w-full p-3 rounded-xl border border-[#e5dde8] bg-white"><option value="mother">فقط مادران</option><option value="father">فقط پدران</option><option value="both">مادر و پدر</option></select>
            </label>
            <label className="text-xs font-bold space-y-1.5">روش ارسال
              <select value={provider} onChange={e=>setProvider(e.target.value as any)} className="w-full p-3 rounded-xl border border-[#e5dde8] bg-white"><option value="sim">سیم‌کارت همین گوشی اندروید</option><option value="panel">پنل پیامکی (نیازمند اتصال پنل)</option></select>
            </label>
          </div>
          <section className="rounded-2xl border border-[#e5dde8] p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-sm">انتخاب دانش‌آموزان</div>
              <div className="flex gap-2">
                <button type="button" onClick={()=>setSelectedStudentIds(filteredStudents.map(s=>s.id))} className="text-xs font-bold text-purple-700 px-3 py-2 rounded-lg bg-purple-50">انتخاب همه</button>
                <button type="button" onClick={()=>setSelectedStudentIds([])} className="text-xs font-bold text-rose-700 px-3 py-2 rounded-lg bg-rose-50">لغو انتخاب همه</button>
              </div>
            </div>
            <div className="text-xs text-gray-500">{selectedStudentIds.length.toLocaleString('fa-IR')} از {filteredStudents.length.toLocaleString('fa-IR')} دانش‌آموز انتخاب شده‌اند. با برداشتن تیک هر دانش‌آموز، پیام برای والدین او ارسال نمی‌شود.</div>
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-100">
              {filteredStudents.map(student=><label key={student.id} className="flex items-center gap-3 p-3 text-sm cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={e=>setSelectedStudentIds(prev=>e.target.checked?[...prev,student.id]:prev.filter(id=>id!==student.id))} className="w-4 h-4 accent-purple-700"/>
                <span className="flex-1 min-w-0"><span className="font-bold">{student.name}</span><span className="block text-xs text-gray-500">{student.grade || 'بدون پایه'} · {student.mother_phone || student.father_phone || student.phone ? 'دارای شماره تماس' : 'بدون شماره تماس ثبت‌شده'}</span></span>
              </label>)}
              {filteredStudents.length===0&&<p className="text-center text-xs text-gray-400 p-4">دانش‌آموزی در این فیلتر وجود ندارد.</p>}
            </div>
          </section>
          <div className="rounded-2xl bg-purple-50 border border-purple-100 p-3 flex items-center gap-2 text-xs text-purple-900"><Users className="w-4 h-4 shrink-0"/> {selectedStudentIds.length.toLocaleString('fa-IR')} دانش‌آموز انتخاب شده · {targets.length.toLocaleString('fa-IR')} شماره معتبر برای ارسال. پیام برای هر شماره جداگانه فرستاده می‌شود.</div>
          <label className="block text-xs font-bold space-y-2">متن پیام
            <textarea rows={5} value={message} onChange={e=>setMessage(e.target.value)} placeholder="مثلاً: اولیای گرامی، فرارسیدن عید ... را تبریک عرض می‌کنیم." className="w-full p-4 rounded-2xl border border-[#e5dde8] bg-[#fdfcfd] text-sm leading-7 resize-y"/>
          </label>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 leading-6"><AlertTriangle className="w-4 h-4 inline ml-1"/> ارسال گروهی پس از تأیید نهایی آغاز می‌شود. بسته به اپراتور، پوشش شبکه و محدودیت گوشی ممکن است پیامکی ناموفق بماند. وضعیت پذیرفته‌شده به معنی تحویل قطعی نیست.</div>
          {!confirmed ? <button disabled={!message.trim() || !targets.length} onClick={()=>setConfirmed(true)} className="w-full rounded-xl py-3 text-white font-black disabled:opacity-40" style={{background:accentColor}}>بازبینی و تأیید ارسال ({targets.length.toLocaleString('fa-IR')} پیامک)</button> : <div className="rounded-2xl border-2 border-amber-300 p-4 space-y-3"><div className="font-black text-sm">تأیید نهایی ارسال</div><p className="text-xs text-gray-600">برای {targets.length.toLocaleString('fa-IR')} شماره، از طریق {provider==='sim'?'سیم‌کارت گوشی':'پنل پیامکی'} ارسال انجام شود؟</p><div className="bg-gray-50 rounded-xl p-3 text-sm whitespace-pre-wrap">{message}</div><div className="flex gap-2"><button disabled={sending} onClick={()=>setConfirmed(false)} className="flex-1 rounded-xl py-3 border font-bold">بازگشت</button><button disabled={sending} onClick={sendCampaign} className="flex-1 rounded-xl py-3 text-white font-bold flex items-center justify-center gap-2" style={{background:accentColor}}>{sending?<><span className="animate-spin">◌</span> در حال ارسال {progress.done}/{progress.total}</>:<><Send className="w-4 h-4"/> تأیید و شروع ارسال</>}</button></div>{sending&&<div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full transition-all" style={{width:`${progress.total?progress.done/progress.total*100:0}%`,background:accentColor}}/></div>}</div>}
          {notice&&<p className="text-xs leading-6 rounded-xl p-3 bg-blue-50 text-blue-900">{notice}</p>}
        </section>
        <section className="bg-white rounded-2xl border border-[#e5dde8] p-4 space-y-3">
          <button type="button" onClick={()=>setShowSmsGuide(v=>!v)} className="w-full flex items-center justify-between gap-2 text-right font-bold text-sm">
            <span className="flex items-center gap-2"><Smartphone className="w-4 h-4"/> راهنمای فعال‌سازی مجوز پیامک در اندروید</span><span>{showSmsGuide?'−':'+'}</span>
          </button>
          {showSmsGuide&&<div className="text-xs text-gray-700 leading-7 space-y-2">
            <p>این مراحل فقط برای اولین بار و در نصب APK خارج از Google Play ممکن است لازم باشد. اندروید برای محافظت از گوشی، فعال‌سازی این مجوز را به تأیید خودتان واگذار می‌کند.</p>
            <ol className="list-decimal pr-5 space-y-1">
              <li>وارد تنظیمات گوشی شوید و بخش «برنامه‌ها / Apps» را باز کنید.</li>
              <li>برنامه «SchoolFinanceApp» را انتخاب کنید.</li>
              <li>از منوی سه‌نقطهٔ بالای صفحه، گزینهٔ «Allow restricted settings / اجازه تنظیمات محدودشده» را انتخاب و تأیید کنید.</li>
              <li>به صفحه اطلاعات برنامه برگردید و وارد «Permissions / مجوزها» شوید.</li>
              <li>گزینه «SMS» را باز کنید و «Allow / اجازه دادن» را انتخاب کنید.</li>
              <li>به برنامه برگردید و ارسال را دوباره شروع کنید؛ برنامه مجوز را مجدداً بررسی می‌کند.</li>
            </ol>
            <p className="text-amber-800 bg-amber-50 rounded-xl p-3">فقط اگر APK را از مخزن رسمی SchoolFinanceApp دریافت کرده‌اید و به منبع آن اعتماد دارید، این تنظیم را فعال کنید. برنامه نمی‌تواند این محدودیت امنیتی اندروید را به‌جای شما بردارد.</p>
          </div>}
        </section>
        <section className="bg-white rounded-2xl border border-[#e5dde8] p-4 space-y-2"><div className="font-bold text-sm flex items-center gap-2"><Smartphone className="w-4 h-4"/> ارسال با سیم‌کارت</div><p className="text-xs text-gray-600 leading-6">فقط در APK اندروید و با مجوز پیامک فعال است. از سیم‌کارت پیش‌فرض پیامک گوشی استفاده می‌شود؛ انتخاب دستی سیم‌کارت دوم فعلاً به انتخاب پیش‌فرض سیستم وابسته است.</p><div className="font-bold text-sm flex items-center gap-2"><Globe className="w-4 h-4"/> پنل پیامکی</div><p className="text-xs text-gray-600 leading-6">گزینه پنل در ساختار صفحه پیش‌بینی شده، اما برای ارسال واقعی باید API امن پنل و اطلاعات سرویس‌دهنده در بک‌اند مدرسه تنظیم شود؛ کلید API نباید داخل APK یا مرورگر ذخیره شود.</p></section>
      </> : <section className="bg-white rounded-3xl border border-[#e5dde8] p-4 space-y-3"><div className="font-bold flex items-center gap-2"><History className="w-4 h-4"/> سوابق این دستگاه</div>{logs.length===0?<p className="text-center text-gray-400 py-8 text-sm">هنوز سابقه‌ای ثبت نشده است.</p>:logs.map(log=><div key={log.id} className="border border-gray-100 rounded-xl p-3 space-y-1"><div className="flex justify-between gap-2"><b className="text-sm">{log.student_name} · {log.grade}</b><span className={`text-xs font-bold ${log.status==='accepted'?'text-emerald-700':'text-rose-700'}`}>{log.status==='accepted'?<><CheckCircle2 className="inline w-3 h-3"/> پذیرفته‌شده</>:<><XCircle className="inline w-3 h-3"/> ناموفق</>}</span></div><div className="text-xs text-gray-500">{log.school_name} · {log.phone} · {log.recipient==='mother'?'مادر':'پدر'} · {new Date(log.sent_at).toLocaleString('fa-IR')}</div>{log.error&&<div className="text-xs text-rose-700">{log.error}</div>}<p className="text-xs text-gray-700 line-clamp-2">{log.campaign}</p></div>)}</section>}
    </main>
  </div>;
};
