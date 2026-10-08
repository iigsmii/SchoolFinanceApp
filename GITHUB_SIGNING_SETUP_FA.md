# راه‌اندازی و دریافت APK امضاشده

این Workflow ابتدا APK را می‌سازد، سپس با `apksigner` آن را امضا و امضا را بررسی می‌کند. فایل Artifact فقط پس از موفقیت بررسی امضا منتشر می‌شود. فایل‌های کلید و رمزها را هرگز داخل مخزن عمومی قرار ندهید.

## ۱) ساخت کلید امضا (فقط یک بار)

روی رایانه‌ای که Java نصب دارد اجرا کنید:

```bash
keytool -genkeypair -v -keystore school-finance-release.jks -alias schoolfinance -keyalg RSA -keysize 2048 -validity 10000
```

رمزها را امن نگه دارید و از فایل `school-finance-release.jks` نسخه پشتیبان بگیرید. برای به‌روزرسانی نسخه‌ای که روی گوشی نصب است، باید همان کلید امضای نسخه قبلی استفاده شود. اگر قبلاً برنامه را با کلید دیگری منتشر کرده‌اید، کلید جدید ممکن است نصب به‌روزرسانی را ناممکن کند.

## ۲) ساخت Base64 از Keystore

Linux:

```bash
base64 -w 0 school-finance-release.jks
```

macOS:

```bash
base64 < school-finance-release.jks | tr -d '\n'
```

## ۳) تعریف GitHub Actions Secrets

در مخزن GitHub مسیر `Settings` → `Secrets and variables` → `Actions` → `New repository secret` را باز کنید و این چهار مقدار را بسازید:

- `KEYSTORE_BASE64`: خروجی Base64 کلید
- `KEYSTORE_PASSWORD`: رمز Keystore
- `KEY_ALIAS`: در مثال بالا `schoolfinance`
- `KEY_PASSWORD`: رمز کلید alias

اگر رمز Keystore و رمز alias یکسان هستند، می‌توانید برای هر دو مقدار یکسان وارد کنید.

## ۴) اجرای Workflow

فایل‌ها را در شاخه `main` آپلود کنید. سپس از تب `Actions`، Workflow با نام `Android Release APK (signed)` را اجرا کنید. در اجرای موفق، از بخش `Artifacts`، فایل `SchoolFinanceApp-release-signed` را دانلود کنید. APK قابل نصب داخل آن با نام `SchoolFinanceApp-release-signed.apk` است.

اگر هر Secret وجود نداشته باشد یا کلید اشتباه باشد، Workflow متوقف می‌شود و APK امضانشده را به‌عنوان خروجی نهایی منتشر نمی‌کند.

## نکات

- فایل `app-release-unsigned.apk` خروجی میانی است؛ آن را نصب نکنید و منتشر نکنید.
- امضا تضمین نمی‌کند هر خطای نصب دیگری رفع شده باشد. ناسازگاری نسخه اندروید، یا امضای متفاوت نسبت به برنامه نصب‌شده نیز می‌تواند مانع نصب شود.
- اگر نصب خطا می‌دهد، متن دقیق خطا یا خروجی `adb install` را بررسی کنید.
