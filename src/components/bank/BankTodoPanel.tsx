import React, { useState } from 'react';
import { AlertTriangle, BellRing, ChevronDown, ChevronUp, CreditCard, Eraser, Landmark, User } from 'lucide-react';
import type { BankTransaction, School } from '../../types';
import type { AccountReport, ResponsibleGroup } from '../../utils/bankReconcile';
import { formatRial, jalaliFromGregorian } from '../../utils/jalali';

interface Props {
  report: AccountReport;
  schools: School[];
  busy: boolean;
  isSenior: boolean;
  onResolve: (row: BankTransaction) => void;
  onNotify: () => void;
  onRegisterTerminal: (terminal: string, schoolIds: number[]) => void;
  onCleanTags: () => void;
  }

const PAGE = 15;

const kindStyle: Record<ResponsibleGroup['kind'], { badge: string; label: string }> = {
  petty: { badge: 'bg-blue-100 text-blue-800', label: 'کارت تن‌خواه' },
  school: { badge: 'bg-emerald-100 text-emerald-800', label: 'مدرسه' },
  shared: { badge: 'bg-indigo-100 text-indigo-800', label: 'پایانه مشترک' },
  unassigned: { badge: 'bg-amber-100 text-amber-900', label: 'نامشخص' },
};

const GroupCard: React.FC<{ group: ResponsibleGroup; onResolve: (row: BankTransaction) => void; defaultOpen: boolean }> = ({ group, onResolve, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [shown, setShown] = useState(PAGE);
  const style = kindStyle[group.kind];
  const rows = [...group.rows].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-3 p-4 text-right">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black shrink-0 ${style.badge}`}>{style.label}</span>
          <span className="font-black text-gray-900 text-sm truncate">{group.title}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-left">
            <div className="text-xs font-black text-gray-900">{group.rows.length.toLocaleString('fa-IR')} ردیف</div>
            <div className="text-[11px] text-gray-500">{formatRial(group.total)} ریال</div>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {rows.slice(0, shown).map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 space-y-0.5">
                <div className="text-xs font-bold text-gray-900">
                  {formatRial(Number(row.amount))} ریال
                  <span className={`mr-2 text-[11px] font-black ${row.direction === 'withdrawal' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {row.direction === 'withdrawal' ? 'برداشت' : row.direction === 'pos_sale' ? 'پوز' : 'واریز'}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 truncate">
                  {jalaliFromGregorian(row.date)}
                  {row.terminal_number ? ` · پایانه ${row.terminal_number}` : ''}
                  {row.tracking_code && row.tracking_code !== 'بانکی' ? ` · پیگیری ${row.tracking_code}` : ''}
                </div>
                {row.description && <div className="text-[11px] text-gray-400 truncate">{row.description}</div>}
              </div>
              <button type="button" onClick={() => onResolve(row)} className="shrink-0 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold active:scale-95 transition-all">
                ثبت
              </button>
            </div>
          ))}
          {rows.length > shown && (
            <button type="button" onClick={() => setShown(shown + PAGE)} className="w-full py-3 text-xs font-bold text-purple-700 hover:bg-purple-50">
              نمایش {Math.min(PAGE, rows.length - shown).toLocaleString('fa-IR')} ردیف بیشتر
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const UnknownTerminalRow: React.FC<{ terminal: string; count: number; total: number; schools: School[]; onRegister: (terminal: string, schoolIds: number[]) => void; disabled: boolean }> = ({ terminal, count, total, schools, onRegister, disabled }) => {
  const [picked, setPicked] = useState<number[]>([]);
  const toggle = (id: number) => setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  return (
    <div className="bg-white rounded-xl border border-amber-200 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-black text-gray-900 font-mono" dir="ltr">{terminal}</div>
          <div className="text-[11px] text-gray-500">{count.toLocaleString('fa-IR')} ردیف · {formatRial(total)} ریال</div>
        </div>
        <button type="button" disabled={!picked.length || disabled} onClick={() => onRegister(terminal, picked)} className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-amber-950 text-xs font-black">
          ثبت پایانه
        </button>
      </div>
      <div className="text-[11px] text-gray-500">مدرسه‌ها را انتخاب کنید (اگر چند شیفت یک پایانه دارند، همه را انتخاب کنید):</div>
      <div className="flex flex-wrap gap-1.5">
        {schools.filter((s) => s.active !== false).map((s) => (
          <button key={s.id} type="button" onClick={() => toggle(s.id)} className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${picked.includes(s.id) ? 'bg-purple-700 text-white border-purple-700' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-purple-50'}`}>
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export const BankTodoPanel: React.FC<Props> = ({ report, schools, busy, isSenior, onResolve, onNotify, onRegisterTerminal, onCleanTags }) => {
  const schoolName = (id: number) => schools.find((s) => s.id === id)?.name || `مدرسه ${id}`;
  const notifiable = report.groups.filter((g) => g.kind !== 'unassigned').reduce((n, g) => n + g.rows.length, 0);
  const petty = report.groups.filter((g) => g.kind === 'petty');
  const pettyTotal = petty.reduce((n, g) => n + g.rows.length, 0);

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-gray-900 text-base flex items-center gap-2">
              <Landmark className="w-5 h-5 text-purple-700" />
              {report.unregisteredCount
                ? `${report.unregisteredCount.toLocaleString('fa-IR')} تراکنش در بانک هست و در نرم‌افزار ثبت نشده`
                : 'همه‌ی تراکنش‌های این حساب ثبت یا تطبیق شده‌اند'}
            </h2>
            {report.unregisteredCount > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                مجموع {formatRial(report.unregisteredTotal)} ریال · {pettyTotal.toLocaleString('fa-IR')} مورد از کارت‌های تن‌خواه · {notifiable.toLocaleString('fa-IR')} مورد مدیر مشخص دارد
              </p>
            )}
          </div>
          {isSenior && report.unregisteredCount > 0 && (
            <button type="button" disabled={busy} onClick={onNotify} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#62205f] hover:bg-[#4e164e] disabled:opacity-50 text-white text-xs font-black active:scale-95 transition-all">
              <BellRing className="w-4 h-4 text-amber-300" />
              <span>{busy ? 'در حال ارسال…' : 'اطلاع به مدیران مربوط'}</span>
            </button>
          )}
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          هر مدیر فقط ردیف‌های مدرسه‌ی خودش و برداشت‌های کارت تن‌خواه خودش را می‌بیند. با ثبت شهریه یا هزینه، ردیف خودکار از این فهرست خارج می‌شود. هنگام ورود اکسل نیز به‌صورت خودکار اطلاع داده می‌شود.
        </p>
      </div>

      {report.unknownTerminals.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 sm:p-5 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black text-amber-950 text-sm">پایانه‌های ثبت‌نشده</h3>
              <p className="text-xs text-amber-900 leading-relaxed">
                این پایانه‌ها برای هیچ مدرسه‌ای ثبت نشده‌اند، پس ردیف‌هایشان به مدرسه‌ای برچسب نمی‌خورد. مدرسه‌ی هر پایانه را مشخص کنید تا ردیف‌ها به مدیر همان مدرسه برسد.
              </p>
            </div>
          </div>
          {isSenior ? (
            <div className="space-y-2">
              {report.unknownTerminals.map((t) => (
                <UnknownTerminalRow key={t.terminal} {...t} schools={schools} onRegister={onRegisterTerminal} disabled={busy} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-900">ثبت پایانه فقط توسط مدیر ارشد انجام می‌شود.</p>
          )}
        </div>
      )}

      {report.sharedTerminals.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-3xl p-4 space-y-1.5">
          <h3 className="font-black text-indigo-950 text-sm">پایانه‌های مشترک بین چند مدرسه</h3>
          <p className="text-xs text-indigo-900 leading-relaxed">
            ردیف این پایانه‌ها تا وقتی با یک شهریه تطبیق نخورده‌اند به همه‌ی مدیران آن مدارس اطلاع داده می‌شود؛ با تطبیق، مدرسه‌ی درست خودکار مشخص می‌شود.
          </p>
          {report.sharedTerminals.map((t) => (
            <div key={t.terminal} className="text-xs bg-white rounded-xl border border-indigo-100 p-2.5">
              <span className="font-mono font-black" dir="ltr">{t.terminal}</span>
              <span className="text-gray-600"> ← {t.schoolIds.map(schoolName).join(' / ')} ({t.count.toLocaleString('fa-IR')} ردیف)</span>
            </div>
          ))}
        </div>
      )}

      {report.groups.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-black text-gray-500 flex items-center gap-2">
            <User className="w-3.5 h-3.5" /> به تفکیک مدیر / مدرسه
            <CreditCard className="w-3.5 h-3.5 mr-2" /> کارت‌های تن‌خواه اول آمده‌اند
          </h3>
          {report.groups.map((g, i) => <GroupCard key={g.key} group={g} onResolve={onResolve} defaultOpen={i === 0} />)}
        </div>
      )}

      {isSenior && (
        <div className="flex justify-end">
          <button type="button" disabled={busy} onClick={onCleanTags} className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-rose-700 disabled:opacity-50">
            <Eraser className="w-3.5 h-3.5" /> پاک‌سازی برچسب‌های اشتباه قدیمی مدرسه
          </button>
        </div>
      )}
    </section>
  );
};
