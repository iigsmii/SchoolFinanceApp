# SchoolFinanceApp — نسخه نهایی Google

معماری نهایی: Android → Google Apps Script → Google Sheets + Google Drive

- Render و Supabase در مسیر اصلی Android استفاده نمی‌شوند.
- Google Apps Script URL در ApiClient تنظیم شده است.
- مدرسه «مهد برهان» با کد BORHAN و شناسه 10 اضافه شده است.
- «آرزو طالب پور» با مدرسه «مهد برهان» همگام می‌شود.
- setup() غیرمخرب است و داده‌های قبلی Sheet را پاک نمی‌کند.
- لیست مدیران مستقیماً از Google Sheets خوانده و قابل بروزرسانی است.
- عنوان: «حسابداری مدارس مجموعه مدرسه القرآن کریم شهرضا» با Typeface نام Neyriz.
- تم‌های رنگی و تغییر اندازه متن حفظ شده‌اند.
- Release APK در Codemagic با CM_* و signingConfig امضا می‌شود.
