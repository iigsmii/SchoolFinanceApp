# تغییرات نسخه جدید

این نسخه برای معماری واقعی پروژه آماده شده است:

Android → Render API → Supabase + Supabase Storage

## فایل‌ها

- `server.js`: Backend کامل و APIهای جدید
- `package.json`: وابستگی‌های Backend
- `001_school_finance.sql`: Migration امن برای Supabase
- `MainActivity.java`: رابط Android و فرم‌های جدید
- `ApiClient.java`: ارتباط امن Android با Render
- `AndroidManifest.xml`: دسترسی اینترنت

## کارهایی که باید انجام شود

1. در Supabase، فایل `001_school_finance.sql` را یک بار در SQL Editor اجرا کنید.
2. فایل‌های `server.js` و `package.json` را جایگزین فایل‌های پوشه `server` کنید.
3. در Render این Environment Variableها را نگه دارید/تنظیم کنید:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CORS_ORIGIN` (برای اپ Native می‌تواند خالی باشد)
   - `PORT=10000`
4. در Android فایل `MainActivity.java` و `ApiClient.java` را جایگزین کنید.
5. `AndroidManifest.xml` را جایگزین کنید.
6. فایل قدیمی `DB.java` دیگر نباید استفاده شود؛ حذفش کنید.
7. Commit و Push کنید تا Render دوباره Deploy شود.

## نکته امنیتی

Service Role Key فقط روی Render قرار می‌گیرد و هرگز داخل Android یا Git قرار نگیرد.

## Excel پارسیان

Endpoint خروجی:
`GET /api/export/parsian`

خروجی با ستون‌های نمونه واقعی پارسیان تولید می‌شود:
`ID, KolCode, MoeenCode, TafsiliCode, HesabName, Comment, Bed, Bes, Factor_Num, Tick, SanadComment, ChkNum, IsRecPayChk, CostCenterCode`

## محدودیت فعلی تطبیق بانک

Backend فایل CSV/XLS/XLSX را می‌خواند و تراکنش‌های بانکی را بر اساس مبلغ و در صورت وجود شماره پیگیری/شرح با پرداخت شهریه تطبیق می‌دهد. برای تطبیق صددرصدی با قالب نهایی بانک، اگر قالب بانک رسمی/ثابت متفاوت باشد، mapping آن باید بعد از اولین فایل واقعی بانک تنظیم شود.

## 2026-10-01 – اصلاح پنل کاربر ارشد و لیست مدیران
- لیست مدارس و لیست مدیران در داشبورد کاربر ارشد فعال و صریح شد.
- بخش تطبیق بانک برای کاربر ارشد حفظ شد.
- لیست مدیران فایل «مدیر ها.xlsx» به پروژه اضافه شد.
- دکمه «افزودن مدیران از فایل پیوست» اضافه شد؛ مدیران موجود دوباره ایجاد نمی‌شوند.
- برای هر مدیر نام مدرسه/مرکز در لیست نمایش داده می‌شود.
- رمزهای فایل در Backend فقط به صورت SHA-256 ذخیره می‌شوند.
