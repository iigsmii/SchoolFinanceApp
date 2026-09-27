package com.example.hesabdari;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

import java.security.MessageDigest;

public class DB extends SQLiteOpenHelper {

    private static final String DB_NAME = "hesabdari.db";
    private static final int DB_VERSION = 8;

    private final Context context;


    public DB(Context c) {

        super(
                c,
                DB_NAME,
                null,
                DB_VERSION
        );

        context =
                c.getApplicationContext();
    }


    // =====================================================
    // هش کردن رمز عبور (SHA-256)
    // =====================================================

    public static String hashPassword(String password) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] messageDigest = md.digest(password.getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : messageDigest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            Log.e("DB", "رمز هش نشد", e);
            return password;
        }
    }


    // =====================================================
    // ایجاد دیتابیس
    // =====================================================

    @Override
    public void onCreate(SQLiteDatabase d) {

        // -------------------------------------------------
        // مراکز
        // -------------------------------------------------

        d.execSQL(
                "CREATE TABLE IF NOT EXISTS schools (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "name TEXT NOT NULL," +
                        "type TEXT," +
                        "code TEXT," +
                        "active INTEGER DEFAULT 1" +
                        ")"
        );


        // -------------------------------------------------
        // مدیران
        // -------------------------------------------------

        d.execSQL(
                "CREATE TABLE IF NOT EXISTS managers (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "name TEXT NOT NULL," +
                        "username TEXT UNIQUE NOT NULL," +
                        "password_hash TEXT NOT NULL," +
                        "school_id INTEGER DEFAULT 0," +
                        "role TEXT DEFAULT 'manager'," +
                        "active INTEGER DEFAULT 1" +
                        ")"
        );


        // -------------------------------------------------
        // دانش‌آموزان
        // -------------------------------------------------

        d.execSQL(
                "CREATE TABLE IF NOT EXISTS students (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "name TEXT," +
                        "code TEXT," +
                        "grade TEXT," +
                        "phone TEXT," +
                        "school_id INTEGER DEFAULT 0" +
                        ")"
        );


        // -------------------------------------------------
        // حساب‌ها
        // -------------------------------------------------

        d.execSQL(
                "CREATE TABLE IF NOT EXISTS accounts (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "code TEXT," +
                        "name TEXT," +
                        "school_id INTEGER DEFAULT 0" +
                        ")"
        );


        // -------------------------------------------------
        // تراکنش‌ها
        // -------------------------------------------------

        d.execSQL(
                "CREATE TABLE IF NOT EXISTS transactions (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "date TEXT," +
                        "account TEXT," +
                        "debit INTEGER DEFAULT 0," +
                        "credit INTEGER DEFAULT 0," +
                        "comment TEXT," +
                        "kind TEXT," +
                        "payment_method TEXT," +
                        "tracking_code TEXT," +
                        "student_id INTEGER DEFAULT 0," +
                        "school_id INTEGER DEFAULT 0," +
                        "reconciled INTEGER DEFAULT 0" +
                        ")"
        );


        // -------------------------------------------------
        // تنظیمات
        // -------------------------------------------------

        d.execSQL(
                "CREATE TABLE IF NOT EXISTS settings (" +
                        "key TEXT PRIMARY KEY," +
                        "value TEXT" +
                        ")"
        );


        // -------------------------------------------------
        // تنظیمات پیش‌فرض
        // -------------------------------------------------

        setDefaultSetting(
                d,
                "font_size",
                "16"
        );


        // -------------------------------------------------
        // مراکز
        // -------------------------------------------------

        insertDefaultSchools(d);


        // -------------------------------------------------
        // مدیران
        // -------------------------------------------------

        insertDefaultManagers(d);
    }


    // =====================================================
    // ارتقای دیتابیس
    // =====================================================

    @Override
    public void onUpgrade(
            SQLiteDatabase d,
            int oldVersion,
            int newVersion) {

        // schools
        d.execSQL(
                "CREATE TABLE IF NOT EXISTS schools (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "name TEXT NOT NULL," +
                        "type TEXT," +
                        "code TEXT" +
                        ")"
        );

        addColumnIfMissing(
                d,
                "schools",
                "active",
                "INTEGER DEFAULT 1"
        );


        // managers
        d.execSQL(
                "CREATE TABLE IF NOT EXISTS managers (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "name TEXT NOT NULL," +
                        "username TEXT UNIQUE NOT NULL," +
                        "password_hash TEXT NOT NULL," +
                        "school_id INTEGER DEFAULT 0" +
                        ")"
        );

        addColumnIfMissing(
                d,
                "managers",
                "role",
                "TEXT DEFAULT 'manager'"
        );

        addColumnIfMissing(
                d,
                "managers",
                "active",
                "INTEGER DEFAULT 1"
        );

        // اگر ستون قدیمی وجود دارد، آن را به password_hash تبدیل کن
        try {
            Cursor cursor = d.rawQuery("PRAGMA table_info(managers)", null);
            boolean hasPlainPassword = false;
            while (cursor.moveToNext()) {
                String col = cursor.getString(1);
                if ("password".equalsIgnoreCase(col)) {
                    hasPlainPassword = true;
                    break;
                }
            }
            cursor.close();

            if (hasPlainPassword) {
                d.execSQL("ALTER TABLE managers RENAME TO managers_old");
                d.execSQL(
                        "CREATE TABLE managers (" +
                                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                                "name TEXT NOT NULL," +
                                "username TEXT UNIQUE NOT NULL," +
                                "password_hash TEXT NOT NULL," +
                                "school_id INTEGER DEFAULT 0," +
                                "role TEXT DEFAULT 'manager'," +
                                "active INTEGER DEFAULT 1" +
                                ")"
                );
                d.execSQL(
                        "INSERT INTO managers (id, name, username, password_hash, school_id, role, active) " +
                                "SELECT id, name, username, password, school_id, role, active FROM managers_old"
                );
                d.execSQL("DROP TABLE managers_old");
            }
        } catch (Exception e) {
            Log.e("DB", "Migration managers failed", e);
        }


        // students
        d.execSQL(
                "CREATE TABLE IF NOT EXISTS students (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "name TEXT," +
                        "code TEXT," +
                        "grade TEXT," +
                        "phone TEXT" +
                        ")"
        );

        addColumnIfMissing(
                d,
                "students",
                "school_id",
                "INTEGER DEFAULT 0"
        );


        // accounts
        d.execSQL(
                "CREATE TABLE IF NOT EXISTS accounts (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "code TEXT," +
                        "name TEXT" +
                        ")"
        );

        addColumnIfMissing(
                d,
                "accounts",
                "school_id",
                "INTEGER DEFAULT 0"
        );


        // transactions
        d.execSQL(
                "CREATE TABLE IF NOT EXISTS transactions (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "date TEXT," +
                        "account TEXT," +
                        "debit INTEGER DEFAULT 0," +
                        "credit INTEGER DEFAULT 0," +
                        "comment TEXT," +
                        "kind TEXT" +
                        ")"
        );

        addColumnIfMissing(
                d,
                "transactions",
                "payment_method",
                "TEXT"
        );

        addColumnIfMissing(
                d,
                "transactions",
                "tracking_code",
                "TEXT"
        );

        addColumnIfMissing(
                d,
                "transactions",
                "student_id",
                "INTEGER DEFAULT 0"
        );

        addColumnIfMissing(
                d,
                "transactions",
                "school_id",
                "INTEGER DEFAULT 0"
        );

        addColumnIfMissing(
                d,
                "transactions",
                "reconciled",
                "INTEGER DEFAULT 0"
        );


        // settings
        d.execSQL(
                "CREATE TABLE IF NOT EXISTS settings (" +
                        "key TEXT PRIMARY KEY," +
                        "value TEXT" +
                        ")"
        );

        setDefaultSetting(
                d,
                "font_size",
                "16"
        );

        // اطلاعات اولیه
        insertDefaultSchools(d);
        insertDefaultManagers(d);
        repairManagerSchools(d);
    }


    // =====================================================
    // بررسی وجود ستون
    // =====================================================

    private void addColumnIfMissing(
            SQLiteDatabase d,
            String table,
            String column,
            String definition) {

        Cursor c =
                d.rawQuery(
                        "PRAGMA table_info(" +
                                table +
                                ")",
                        null
                );

        boolean exists = false;

        while (c.moveToNext()) {
            String name = c.getString(1);
            if (column.equalsIgnoreCase(name)) {
                exists = true;
                break;
            }
        }

        c.close();

        if (!exists) {
            d.execSQL(
                    "ALTER TABLE " +
                            table +
                            " ADD COLUMN " +
                            column +
                            " " +
                            definition
            );
        }
    }


    // =====================================================
    // تنظیم پیش‌فرض
    // =====================================================

    private void setDefaultSetting(
            SQLiteDatabase d,
            String key,
            String value) {

        Cursor c =
                d.rawQuery(
                        "SELECT key " +
                                "FROM settings " +
                                "WHERE key=?",
                        new String[]{
                                key
                        }
                );

        boolean exists = c.moveToFirst();
        c.close();

        if (!exists) {
            ContentValues v = new ContentValues();
            v.put("key", key);
            v.put("value", value);
            d.insert("settings", null, v);
        }
    }


    // =====================================================
    // خواندن تنظیمات
    // =====================================================

    public String getSetting(
            String key,
            String defaultValue) {

        SQLiteDatabase d = getReadableDatabase();

        Cursor c =
                d.rawQuery(
                        "SELECT value " +
                                "FROM settings " +
                                "WHERE key=?",
                        new String[]{
                                key
                        }
                );

        String value = defaultValue;

        if (c.moveToFirst()) {
            String x = c.getString(0);
            if (x != null) {
                value = x;
            }
        }

        c.close();
        return value;
    }


    // =====================================================
    // ذخیره تنظیمات
    // =====================================================

    public void setSetting(
            String key,
            String value) {

        SQLiteDatabase d = getWritableDatabase();
        ContentValues v = new ContentValues();
        v.put("key", key);
        v.put("value", value);

        d.insertWithOnConflict(
                "settings",
                null,
                v,
                SQLiteDatabase.CONFLICT_REPLACE
        );
    }


    // =====================================================
    // مراکز پیش‌فرض
    // =====================================================

    private void insertDefaultSchools(
            SQLiteDatabase d) {

        addSchool(d, "دبستان نور ۱");
        addSchool(d, "دبستان نور ۲");
        addSchool(d, "دبستان تبیان ۱");
        addSchool(d, "دبستان تبیان ۲");
        addSchool(d, "مهدالرضا مرکزی شیفت صبح");
        addSchool(d, "مهدالرضا مرکزی شیفت عصر");
        addSchool(d, "مهدالرضا ابراهیم خلیل");
        addSchool(d, "مهدالرضا سروستان");
        addSchool(d, "مهدالرضا منظریه");
    }


    // =====================================================
    // اضافه کردن مرکز
    // =====================================================

    private void addSchool(
            SQLiteDatabase d,
            String name) {

        Cursor c = d.rawQuery(
                "SELECT id FROM schools WHERE name=? LIMIT 1",
                new String[]{ name }
        );

        boolean exists = c.moveToFirst();
        c.close();

        if (!exists) {
            ContentValues v = new ContentValues();
            v.put("name", name);
            v.put("type", "");
            v.put("code", "");
            v.put("active", 1);
            d.insert("schools", null, v);
        }
    }


    // =====================================================
    // مدیران پیش‌فرض
    // =====================================================

    private void insertDefaultManagers(
            SQLiteDatabase d) {

        addManager(d, "مدیر کل سیستم", "admin", "Admin@123456", 0, "admin");

        int school1 = getSchoolId(d, "دبستان نور ۱");
        if (school1 != -1) {
            addManager(d, "آقای محمدرضا اقاسی", "محمدرضا اقاسی", "School@1234", school1, "manager");
        }

        int school2 = getSchoolId(d, "دبستان نور ۲");
        if (school2 != -1) {
            addManager(d, "آقای محمد عربی", "محمد عربی", "School@5678", school2, "manager");
        }
    }


    // =====================================================
    // اضافه کردن مدیر
    // =====================================================

    private void addManager(
            SQLiteDatabase d,
            String name,
            String username,
            String password,
            int schoolId,
            String role) {

        Cursor c = d.rawQuery(
                "SELECT id FROM managers WHERE username=? LIMIT 1",
                new String[]{ username }
        );

        boolean exists = c.moveToFirst();
        c.close();

        if (!exists) {
            ContentValues v = new ContentValues();
            v.put("name", name);
            v.put("username", username);
            v.put("password_hash", hashPassword(password));
            v.put("school_id", schoolId);
            v.put("role", role);
            v.put("active", 1);
            d.insert("managers", null, v);
        }
    }


    // =====================================================
    // اصلاح اتصال مدیران به مراکز
    // =====================================================

    private void repairManagerSchools(
            SQLiteDatabase d) {

        int school1 = getSchoolId(d, "دبستان نور ۱");
        int school2 = getSchoolId(d, "دبستان نور ۲");

        if (school1 != -1) {
            d.execSQL(
                    "UPDATE managers SET school_id=? WHERE username=?",
                    new Object[]{ school1, "محمدرضا اقاسی" }
            );
        }

        if (school2 != -1) {
            d.execSQL(
                    "UPDATE managers SET school_id=? WHERE username=?",
                    new Object[]{ school2, "محمد عربی" }
            );
        }

        d.execSQL(
                "UPDATE managers SET role='admin', school_id=0 WHERE username='admin'"
        );
    }


    // =====================================================
    // گرفتن شناسه مرکز
    // =====================================================

    private int getSchoolId(
            SQLiteDatabase d,
            String name) {

        Cursor c = d.rawQuery(
                "SELECT id FROM schools WHERE name=? LIMIT 1",
                new String[]{ name }
        );

        int id = -1;
        if (c.moveToFirst()) {
            id = c.getInt(0);
        }

        c.close();
        return id;
    }
}


































































































































































































































































































































