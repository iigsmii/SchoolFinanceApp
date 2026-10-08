# راه‌اندازی بیلد امضاشده در GitHub Actions

این پروژه در Workflow انتشار، فقط APK امضاشده را منتشر می‌کند. برای حفظ امنیت، فایل Keystore و رمزهای آن داخل مخزن قرار نمی‌گیرند.

## ۱) ساخت Keystore (فقط یک بار)

روی رایانه‌ای که Java نصب است اجرا کنید و رمزهای امن انتخاب کنید:

```bash
keytool -genkeypair -v -keystore school-finance-release.jks -alias schoolfinance -keyalg RSA -keysize 2048 -validity 10000
```

فایل `school-finance-release.jks` و رمزهایش را محرمانه و در محل امن پشتیبان‌گیری کنید. برای انتشار نسخه‌های بعدی باید از همین کلید استفاده شود؛ با عوض‌کردن کلید، به‌روزرسانی نصب موجود ممکن است انجام نشود.

## ۲) تبدیل Keystore به Base64

Linux:

```bash
base64 -w 0 school-finance-release.jks
```

macOS:

```bash
base64 < school-finance-release.jks | tr -d '\n'
```

متن خروجی را کپی کنید. خود فایل `.jks` را به GitHub یا داخل ZIP پروژه آپلود نکنید.

## ۳) افزودن GitHub Actions Secrets

در مخزن GitHub به مسیر زیر بروید:

`Settings` → `Secrets and variables` → `Actions` → `New repository secret`

این چهار Secret را با نام دقیق زیر بسازید:

- `KEYSTORE_BASE64`: متن Base64 فایل Keystore
- `KEYSTORE_PASSWORD`: رمز Keystore
- `KEY_ALIAS`: نام alias؛ در دستور بالا `schoolfinance`
- `KEY_PASSWORD`: رمز کلید alias

اگر رمز کلید و رمز Keystore یکسان انتخاب شده‌اند، مقدارشان می‌تواند یکسان باشد.

## ۴) ساخت و دریافت APK

پس از push کردن فایل‌ها به شاخه `main`، یا از تب `Actions` اجرای دستی `Android Release APK (signed)`، وارد اجرای موفق Workflow شوید. در بخش `Artifacts` فایل `SchoolFinanceApp-release-signed` را دریافت کنید و APK داخل آن را نصب کنید.

Workflow قبل از انتشار، امضا را با `apksigner verify` بررسی می‌کند و در صورت نبود Secrets یا نامعتبر بودن امضا متوقف می‌شود.

## نکات مهم

- APK ساخته‌شده روی رایانه شخصی ممکن است در صورت تنظیم‌نشدن Keystore محلی، بدون امضا باشد؛ برای انتشار از Artifact امضاشده GitHub استفاده کنید.
- Keystore، رمزها و فایل‌های حاوی کلید خصوصی را commit نکنید.
- امضا فقط هویت ناشر/یکپارچگی APK را تأیید می‌کند؛ تضمین نمی‌کند هر مشکل نصب دیگری (مانند ناسازگاری نسخه، فضای ذخیره‌سازی یا نصب نسخه‌ای با امضای متفاوت) وجود نداشته باشد.
