package com.example.hesabdari;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class DB extends SQLiteOpenHelper {

    private static final String DB_NAME = "hesabdari.db";
    private static final int DB_VERSION = 4;

    final Context context;

    public DB(Context c) {
        super(c, DB_NAME, null, DB_VERSION);
        context = c.getApplicationContext();
    }

    @Override
    public void onCreate(SQLiteDatabase d) {

        // =========================
        // مراکز
        // =========================

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS schools (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "name TEXT NOT NULL," +
            "type TEXT," +
            "code TEXT," +
            "active INTEGER DEFAULT 1)"
        );

        // =========================
        // مدیران
        // =========================

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS managers (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "name TEXT NOT NULL," +
            "username TEXT UNIQUE NOT NULL," +
            "password TEXT NOT NULL," +
            "school_id INTEGER NOT NULL," +
            "active INTEGER DEFAULT 1)"
        );

        // =========================
        // دانش‌آموزان
        // =========================

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS students (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "name TEXT," +
            "code TEXT," +
            "grade TEXT," +
            "phone TEXT)"
        );

        // =========================
        // حساب‌ها
        // =========================

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS accounts (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "code TEXT," +
            "name TEXT)"
        );

        // =========================
        // تراکنش‌ها
        // =========================

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS transactions (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "date TEXT," +
            "account TEXT," +
            "debit INTEGER DEFAULT 0," +
            "credit INTEGER DEFAULT 0," +
            "comment TEXT," +
            "kind TEXT)"
        );

        insertDefaultSchools(d);
        insertDefaultManagers(d);
    }

    // =====================================================
    // Migration
    // =====================================================

    @Override
    public void onUpgrade(
            SQLiteDatabase d,
            int oldVersion,
            int newVersion) {

        // ---------------------------------------------
        // جدول schools
        // ---------------------------------------------

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS schools (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "name TEXT NOT NULL," +
            "type TEXT," +
            "code TEXT)"
        );

        // اضافه کردن active در صورت نبودن
        addColumnIfMissing(
            d,
            "schools",
            "active",
            "INTEGER DEFAULT 1"
        );

        // ---------------------------------------------
        // جدول managers
        // ---------------------------------------------

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS managers (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "name TEXT NOT NULL," +
            "username TEXT UNIQUE NOT NULL," +
            "password TEXT NOT NULL," +
            "school_id INTEGER NOT NULL)"
        );

        addColumnIfMissing(
            d,
            "managers",
            "active",
            "INTEGER DEFAULT 1"
        );

        // ---------------------------------------------
        // جدول‌های دیگر
        // ---------------------------------------------

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS students (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "name TEXT," +
            "code TEXT," +
            "grade TEXT," +
            "phone TEXT)"
        );

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS accounts (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "code TEXT," +
            "name TEXT)"
        );

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS transactions (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "date TEXT," +
            "account TEXT," +
            "debit INTEGER DEFAULT 0," +
            "credit INTEGER DEFAULT 0," +
            "comment TEXT," +
            "kind TEXT)"
        );

        // ---------------------------------------------
        // مراکز پیش‌فرض
        // ---------------------------------------------

        insertDefaultSchools(d);

        // ---------------------------------------------
        // مدیران پیش‌فرض
        // ---------------------------------------------

        insertDefaultManagers(d);
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

    private void insertDefaultSchools(SQLiteDatabase d) {

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

        Cursor c = d.rawQuery(
            "SELECT id FROM schools WHERE name=? LIMIT 1",
            new String[]{name}
        );

        boolean exists = c.moveToFirst();

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
    // ثبت مدیران اولیه
    // =====================================================

    private void insertDefaultManagers(SQLiteDatabase d) {

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

        // محمدرضا اقاسی
        if (school1 != -1) {

            addManager(
                d,
                "آقای محمدرضا اقاسی",
                "محمدرضا اقاسی",
                "25424801",
                school1
            );
        }

        // محمد عربی
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
    // اضافه کردن مدیر
    // =====================================================

    private void addManager(
            SQLiteDatabase d,
            String name,
            String username,
            String password,
            int schoolId) {

        Cursor c = d.rawQuery(
            "SELECT id FROM managers " +
            "WHERE username=? LIMIT 1",
            new String[]{username}
        );

        boolean exists = c.moveToFirst();

        c.close();

        if (!exists) {

            ContentValues v =
                new ContentValues();

            v.put("name", name);
            v.put("username", username);
            v.put("password", password);
            v.put("school_id", schoolId);
            v.put("active", 1);

            d.insert(
                "managers",
                null,
                v
            );
        }
    }

    // =====================================================
    // گرفتن شناسه مرکز
    // =====================================================

    private int getSchoolId(
            SQLiteDatabase d,
            String name) {

        Cursor c = d.rawQuery(
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
}
