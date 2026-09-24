# پروژه حسابداری مدارس — نسخه سازگار با محیط قدیمی

این نسخه از پروژه برای کار با Android Studio Arctic Fox 2020.3.1 و Android Gradle Plugin 7.0.4 آماده شده است.

## محیط پیشنهادی
- Windows 7 64-bit
- Android Studio Arctic Fox 2020.3.1
- JDK 11 (نه JDK 8)
- Gradle 7.0.x / AGP 7.0.4
- compileSdk/targetSdk: 31

طبق جدول رسمی سازگاری گوگل، Arctic Fox با AGP 3.1 تا 7.0 سازگار است.

## ورود پیش‌فرض
- نام کاربری: `admin`
- رمز عبور: `1234`

## اطلاعات اولیه
داده‌های استخراج‌شده از فایل‌های Excel ارسال‌شده در assets/data قرار گرفته‌اند.

## ساخت APK
1. پروژه را در Android Studio باز کنید.
2. JDK پروژه را روی JDK 11 قرار دهید.
3. اگر Android Studio درخواست دانلود Gradle/SDK کرد، اجازه دهید ابزارهای موردنیاز نصب شوند.
4. Build > Make Project
5. Build > Build Bundle(s) / APK(s) > Build APK(s)

خروجی معمولاً در مسیر `app/build/outputs/apk/debug/app-debug.apk` ایجاد می‌شود.

### نکته مهم درباره Windows 7
نسخه‌های جدید Android Studio برای Windows 7 مناسب نیستند؛ این پروژه عمداً با ابزارهای قدیمی‌تر تنظیم شده تا روی محیط قدیمی‌تر شانس سازگاری بیشتری داشته باشد.
