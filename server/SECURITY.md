# وضعیت اصلاحات امنیتی

این شاخه شامل اصلاحات API و ورود است:

- کلید Service Role فقط روی سرور استفاده می‌شود و در پاسخ خطا چاپ نمی‌شود.
- ورود فقط با `bcrypt.compare` انجام می‌شود و رمز خام در پایگاه داده خوانده نمی‌شود.
- توکن نشست در حافظه سرور نگهداری و در logout حذف می‌شود.
- ورودی JSON محدود و اعتبارسنجی می‌شود.
- خطاهای داخلی و جزئیات Supabase به کاربر نمایش داده نمی‌شوند.
- برای اجرای سرور Node.js نسخه 18 یا جدیدتر لازم است.

متغیرهای لازم:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-key
CORS_ORIGIN=https://your-allowed-client.example
PORT=10000
```

هرگز `SUPABASE_SERVICE_ROLE_KEY` را داخل اپ اندروید، Git، README یا APK قرار نده.
