package com.example.hesabdari;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class DB extends SQLiteOpenHelper {

    private static final String DB_NAME = "hesabdari.db";
    private static final int DB_VERSION = 8;

    final Context context;

    public DB(Context c) {
        super(c, DB_NAME, null, DB_VERSION);
        context = c.getApplicationContext();
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
            "active INTEGER DEFAULT 1)"
        );

        // -------------------------------------------------
        // مدیران
        // -------------------------------------------------

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS managers (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "name TEXT NOT NULL," +
            "username TEXT UNIQUE NOT NULL," +
            "password TEXT NOT NULL," +
            "school_id INTEGER NOT NULL," +
            "role TEXT DEFAULT 'manager'," +
            "active INTEGER DEFAULT 1)"
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
            "school_id INTEGER DEFAULT 0)"
        );

        // -------------------------------------------------
        // حساب‌ها
        // -------------------------------------------------

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS accounts (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "code TEXT," +
            "name TEXT," +
            "school_id INTEGER DEFAULT 0)"
        );

        // -------------------------------------------------
        // تراکنش‌های مالی
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
            "reconciled INTEGER DEFAULT 0)"
        );

        // -------------------------------------------------
        // تنظیمات
        // -------------------------------------------------

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS settings (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "setting_key TEXT UNIQUE," +
            "setting_value TEXT)"
        );

        // -------------------------------------------------
        // مراکز پیش‌فرض
        // -------------------------------------------------

        insertDefaultSchools(d);

        // -------------------------------------------------
        // مدیران پیش‌فرض
        // -------------------------------------------------

        insertDefaultManagers(d);

        // -------------------------------------------------
        // تنظیمات پیش‌فرض
        // -------------------------------------------------

        insertDefaultSettings(d);
    }


    // =====================================================
    // ارتقای دیتابیس
    // =====================================================

    @Override
    public void onUpgrade(
            SQLiteDatabase d,
            int oldVersion,
            int newVersion) {

        // -------------------------------------------------
        // مدارس
        // -------------------------------------------------

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS schools (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "name TEXT NOT NULL," +
            "type TEXT," +
            "code TEXT," +
            "active INTEGER DEFAULT 1)"
        );

        addColumnIfMissing(
            d,
            "schools",
            "active",
            "INTEGER DEFAULT 1"
        );


        // -------------------------------------------------
        // مدیران
        // -------------------------------------------------

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS managers (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "name TEXT NOT NULL," +
            "username TEXT UNIQUE NOT NULL," +
            "password TEXT NOT NULL," +
            "school_id INTEGER NOT NULL," +
            "role TEXT DEFAULT 'manager'," +
            "active INTEGER DEFAULT 1)"
        );

        addColumnIfMissing(
            d,
            "managers",
            "active",
            "INTEGER DEFAULT 1"
        );

        addColumnIfMissing(
            d,
            "managers",
            "role",
            "TEXT DEFAULT 'manager'"
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
            "school_id INTEGER DEFAULT 0)"
        );

        addColumnIfMissing(
            d,
            "students",
            "school_id",
            "INTEGER DEFAULT 0"
        );


        // -------------------------------------------------
        // حساب‌ها
        // -------------------------------------------------

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS accounts (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "code TEXT," +
            "name TEXT," +
            "school_id INTEGER DEFAULT 0)"
        );

        addColumnIfMissing(
            d,
            "accounts",
            "school_id",
            "INTEGER DEFAULT 0"
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
            "reconciled INTEGER DEFAULT 0)"
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


        // -------------------------------------------------
        // تنظیمات
        // -------------------------------------------------

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS settings (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "setting_key TEXT UNIQUE," +
            "setting_value TEXT)"
        );


        // -------------------------------------------------
        // مراکز
        // -------------------------------------------------

        insertDefaultSchools(d);


        // -------------------------------------------------
        // مدیران
        // -------------------------------------------------

        insertDefaultManagers(d);


        // -------------------------------------------------
        // تنظیمات
        // -------------------------------------------------

        insertDefaultSettings(d);


        // -------------------------------------------------
        // انتقال اطلاعات قدیمی
        // -------------------------------------------------

        migrateOldDataToDefaultSchool(d);
    }


    // =====================================================
    // اضافه کردن ستون در صورت نبودن
    // =====================================================

    private void addColumnIfMissing(
            SQLiteDatabase d,
            String table,
            String column,
            String definition) {

        Cursor c = d.rawQuery(
            "PRAGMA table_info(" + table + ")",
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
    // ثبت ۹ مرکز
    // =====================================================

    private void insertDefaultSchools(
            SQLiteDatabase d) {

        addSchool(
            d,
            "دبستان نور ۱"
        );

        addSchool(
            d,
            "دبستان نور ۲"
        );

        addSchool(
            d,
            "دبستان تبیان ۱"
        );

        addSchool(
            d,
            "دبستان تبیان ۲"
        );

        addSchool(
            d,
            "مهدالرضا مرکزی شیفت صبح"
        );

        addSchool(
            d,
            "مهدالرضا مرکزی شیفت عصر"
        );

        addSchool(
            d,
            "مهدالرضا ابراهیم خلیل"
        );

        addSchool(
            d,
            "مهدالرضا سروستان"
        );

        addSchool(
            d,
            "مهدالرضا منظریه"
        );
    }


    // =====================================================
    // اضافه کردن مرکز
    // =====================================================

    private void addSchool(
            SQLiteDatabase d,
            String name) {

        Cursor c =
            d.rawQuery(
                "SELECT id FROM schools " +
                "WHERE name=? LIMIT 1",
                new String[]{name}
            );

        boolean exists =
            c.moveToFirst();

        c.close();

        if (!exists) {

            ContentValues v =
                new ContentValues();

            v.put("name", name);
            v.put("type", "");
            v.put("code", "");
            v.put("active", 1);

            d.insert(
                "schools",
                null,
                v
            );
        }
    }


    // =====================================================
    // مدیران اولیه
    // =====================================================

    private void insertDefaultManagers(
            SQLiteDatabase d) {

        int school1 =
            getSchoolId(
                d,
                "دبستان نور ۱"
            );

        int school2 =
            getSchoolId(
                d,
                "دبستان نور ۲"
            );


        // -------------------------------------------------
        // مدیر کل
        // -------------------------------------------------

        addAdmin(
            d,
            "مدیر کل سیستم",
            "admin",
            "1234"
        );


        // -------------------------------------------------
        // مدیر دبستان نور ۱
        // -------------------------------------------------

        if (school1 != -1) {

            addManager(
                d,
                "آقای محمدرضا اقاسی",
                "محمدرضا اقاسی",
                "25424801",
                school1
            );
        }


        // -------------------------------------------------
        // مدیر دبستان نور ۲
        // -------------------------------------------------

        if (school2 != -1) {

            addManager(
                d,
                "آقای محمد عربی",
                "محمد عربی",
                "4092272",
                school2
            );
        }
    }


    // =====================================================
    // مدیر کل
    // =====================================================

    private void addAdmin(
            SQLiteDatabase d,
            String name,
            String username,
            String password) {

        Cursor c =
            d.rawQuery(
                "SELECT id FROM managers " +
                "WHERE username=? LIMIT 1",
                new String[]{username}
            );

        boolean exists =
            c.moveToFirst();

        c.close();


        if (!exists) {

            ContentValues v =
                new ContentValues();

            v.put("name", name);
            v.put("username", username);
            v.put("password", password);
            v.put("school_id", 0);
            v.put("role", "admin");
            v.put("active", 1);

            d.insert(
                "managers",
                null,
                v
            );
        }
    }


    // =====================================================
    // مدیر مرکز
    // =====================================================

    private void addManager(
            SQLiteDatabase d,
            String name,
            String username,
            String password,
            int schoolId) {

        Cursor c =
            d.rawQuery(
                "SELECT id FROM managers " +
                "WHERE username=? LIMIT 1",
                new String[]{username}
            );

        boolean exists =
            c.moveToFirst();

        c.close();


        if (!exists) {

            ContentValues v =
                new ContentValues();

            v.put("name", name);
            v.put("username", username);
            v.put("password", password);
            v.put("school_id", schoolId);
            v.put("role", "manager");
            v.put("active", 1);

            d.insert(
                "managers",
                null,
                v
            );
        }
    }


    // =====================================================
    // شناسه مرکز
    // =====================================================

    private int getSchoolId(
            SQLiteDatabase d,
            String name) {

        Cursor c =
            d.rawQuery(
                "SELECT id FROM schools " +
                "WHERE name=? LIMIT 1",
                new String[]{name}
            );

        int id = -1;

        if (c.moveToFirst()) {
            id = c.getInt(0);
        }

        c.close();

        return id;
    }


    // =====================================================
    // تنظیمات پیش‌فرض
    // =====================================================

    private void insertDefaultSettings(
            SQLiteDatabase d) {

        setSettingIfMissing(
            d,
            "font_size",
            "16"
        );

        setSettingIfMissing(
            d,
            "app_name",
            "سیستم حسابداری مجموعه مدرسه القرآن شهرضا"
        );
    }


    // =====================================================
    // ثبت تنظیم در صورت نبودن
    // =====================================================

    private void setSettingIfMissing(
            SQLiteDatabase d,
            String key,
            String value) {

        Cursor c =
            d.rawQuery(
                "SELECT id FROM settings " +
                "WHERE setting_key=? LIMIT 1",
                new String[]{key}
            );

        boolean exists =
            c.moveToFirst();

        c.close();


        if (!exists) {

            ContentValues v =
                new ContentValues();

            v.put(
                "setting_key",
                key
            );

            v.put(
                "setting_value",
                value
            );

            d.insert(
                "settings",
                null,
                v
            );
        }
    }


    // =====================================================
    // گرفتن تنظیم
    // =====================================================

    public String getSetting(
            String key,
            String defaultValue) {

        Cursor c =
            getReadableDatabase()
            .rawQuery(
                "SELECT setting_value " +
                "FROM settings " +
                "WHERE setting_key=? " +
                "LIMIT 1",
                new String[]{key}
            );

        String result =
            defaultValue;

        if (c.moveToFirst()) {

            String x =
                c.getString(0);

            if (x != null) {
                result = x;
            }
        }

        c.close();

        return result;
    }


    // =====================================================
    // ذخیره تنظیم
    // =====================================================

    public void setSetting(
            String key,
            String value) {

        ContentValues v =
            new ContentValues();

        v.put(
            "setting_key",
            key
        );

        v.put(
            "setting_value",
            value
        );

        getWritableDatabase()
        .insertWithOnConflict(
            "settings",
            null,
            v,
            SQLiteDatabase.CONFLICT_REPLACE
        );
    }


    // =====================================================
    // انتقال اطلاعات قدیمی
    // =====================================================

    private void migrateOldDataToDefaultSchool(
            SQLiteDatabase d) {

        int schoolId =
            getSchoolId(
                d,
                "دبستان نور ۱"
            );

        if (schoolId == -1) {
            return;
        }


        // اطلاعات قدیمی بدون مرکز
        d.execSQL(
            "UPDATE students " +
            "SET school_id=? " +
            "WHERE school_id IS NULL OR school_id=0",
            new Object[]{schoolId}
        );


        d.execSQL(
            "UPDATE accounts " +
            "SET school_id=? " +
            "WHERE school_id IS NULL OR school_id=0",
            new Object[]{schoolId}
        );


        d.execSQL(
            "UPDATE transactions " +
            "SET school_id=? " +
            "WHERE school_id IS NULL OR school_id=0",
            new Object[]{schoolId}
        );
    }
}
