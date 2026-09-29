-- سرفصل پارسیان برای هر دانش‌آموز
alter table public.students
  add column if not exists parsian_account_code text,
  add column if not exists parsian_account_name text,
  add column if not exists parsian_kol_code text,
  add column if not exists parsian_moeen_code text,
  add column if not exists parsian_tafsili_code text;

create index if not exists students_parsian_account_code_idx
  on public.students(parsian_account_code);

-- این ستون‌ها در خروجی پارسیان از ساختار tafsili-moeen-kol استفاده می‌کنند.
-- نمونه واقعی فایل پارسیان: 48-4-67 => KolCode=67, MoeenCode=4, TafsiliCode=48.

-- تلاش برای تکمیل خودکار کد حساب دانش‌آموزان قدیمی که حساب پارسیان‌شان از قبل در جدول accounts وجود دارد.
update public.students s
set parsian_account_code = a.code,
    parsian_account_name = a.name,
    parsian_kol_code = split_part(a.code, '-', 3),
    parsian_moeen_code = split_part(a.code, '-', 2),
    parsian_tafsili_code = split_part(a.code, '-', 1)
from public.accounts a
where s.parsian_account_code is null
  and a.code ~ '^[0-9]+-[0-9]+-67$'
  and a.name ilike s.name || '%'
  and a.name ilike '%' || s.grade || '%';
