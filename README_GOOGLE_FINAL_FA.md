# SchoolFinanceApp — Google Final

معماری این نسخه:

Android → Google Apps Script Web App → Google Sheets + Google Drive

## Web App
URL فعلی در `ApiClient.java` قرار داده شده است.

## مهم: به‌روزرسانی Apps Script
فایل `SchoolFinanceApp_GoogleAppsScript_FINAL.gs` را در Apps Script قرار بده.

چون نسخه نهایی ساختار ID عددی برای سازگاری با اپ اندروید دارد، اگر هنوز اطلاعات واقعی وارد نکرده‌ای، بعد از جایگزینی کد `setup()` را یک بار دیگر اجرا کن. توجه: `setup()` برگه‌های این پروژه را از نو می‌سازد و داده‌های قبلی را پاک می‌کند.

سپس:
1. Deploy → Manage deployments
2. یک deployment جدید Web app بساز یا نسخه را Update کن.
3. Execute as: Me
4. Who has access: Anyone

## ورود پیش‌فرض
username: `admin`
password: `Admin@123456`

رمز را بعد از اولین ورود تغییر بده.

## ساخت APK
فایل `codemagic.yaml` برای CodeMagic آماده است.

## نکته
Render و Supabase در مسیر اصلی اپ استفاده نمی‌شوند. پوشه‌های قدیمی backend حذف شده‌اند.
