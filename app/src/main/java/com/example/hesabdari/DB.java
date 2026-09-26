package com.example.hesabdari;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

public class DB extends SQLiteOpenHelper {

    // =====================================================
    // تنظیمات دیتابیس
    // =====================================================

    private static final String DB_NAME = "hesabdari.db";
    private static final int DB_VERSION = 3;

    final Context context;

    public DB(Context c) {
        super(c, DB_NAME, null, DB_VERSION);
        context = c.getApplicationContext();
    }


    // =====================================================
    // ساخت دیتابیس برای نصب جدید
    // =====================================================

    @Override
    public void onCreate(SQLiteDatabase d) {

        // -------------------------------------------------
        // جدول مراکز
        // -------------------------------------------------

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS schools (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "name TEXT NOT NULL," +
            "type TEXT," +
            "code TEXT)"
        );


        // -------------------------------------------------
        // جدول مدیران
        // -------------------------------------------------

        d.execSQL(
            "CREATE TABLE IF NOT EXISTS managers (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "name TEXT NOT NULL," +
            "username TEXT UNIQUE NOT NULL," +
            "password TEXT NOT NULL," +
            "school_id INTEGER NOT NULL)"
        );


        // -------------------------------------------------
        // ثبت ۹ مرکز
        // -------------------------------------------------

        addSchoolIfNotExists(d, "دبستان نور ۱");
        addSchoolIfNotExists(d, "دبستان نور ۲");
        addSchoolIfNotExists(d, "دبستان تبیان ۱");
        addSchoolIfNotExists(d, "دبستان تبیان ۲");
        addSchoolIfNotExists(d, "مهدالرضا مرکزی شیفت صبح");
        addSchoolIfNotExists(d, "مهدالرضا مرکزی شیفت عصر");
        addSchoolIfNotExists(d, "مهدالرضا ابراهیم خلیل");
        addSchoolIfNotExists(d, "مهدالرضا سروستان");
        addSchoolIfNotExists(d, "مهدالرضا منظریه");


        // -------------------------------------------------
        // مدیر دبستان نور ۱
        // -------------------------------------------------

        addManagerIfNotExists(
            d,
            "آقای محمدرضا اقاسی",
            "محمدرضا اقاسی",
            "25424801",
            getSchoolId(d, "دبستان نور ۱")
        );


        // -------------------------------------------------
        // مدیر دبستان نور ۲
        // -------------------------------------------------

        addManagerIfNotExists(
            d,
            "آقای محمد عربی",
            "محمد عربی",
            "4092272",
            getSchoolId(d, "دبستان نور ۲")
        );
    }


    // =====================================================
    // ارتقای دیتابیس
    // اطلاعات قبلی حفظ می‌شود
    // =====================================================

    @Override
    public void onUpgrade(
            SQLiteDatabase d,
            int oldVersion,
            int newVersion) {

        // -------------------------------------------------
        // ارتقا به نسخه ۳
        // -------------------------------------------------

        if (oldVersion < 3) {

            // اطمینان از وجود جدول مدارس
            d.execSQL(
                "CREATE TABLE IF NOT EXISTS schools (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "name TEXT NOT NULL," +
                "type TEXT," +
                "code TEXT)"
            );


            // اطمینان از وجود جدول مدیران
            d.execSQL(
                "CREATE TABLE IF NOT EXISTS managers (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "name TEXT NOT NULL," +
                "username TEXT UNIQUE NOT NULL," +
                "password TEXT NOT NULL," +
                "school_id INTEGER NOT NULL)"
            );


            // -------------------------------------------------
            // اضافه کردن ۹ مرکز
            // -------------------------------------------------

            addSchoolIfNotExists(
                d,
                "دبستان نور ۱"
            );

            addSchoolIfNotExists(
                d,
                "دبستان نور ۲"
            );

            addSchoolIfNotExists(
                d,
                "دبستان تبیان ۱"
            );

            addSchoolIfNotExists(
                d,
                "دبستان تبیان ۲"
            );

            addSchoolIfNotExists(
                d,
                "مهدالرضا مرکزی شیفت صبح"
            );

            addSchoolIfNotExists(
                d,
                "مهدالرضا مرکزی شیفت عصر"
            );

            addSchoolIfNotExists(
                d,
                "مهدالرضا ابراهیم خلیل"
            );

            addSchoolIfNotExists(
                d,
                "مهدالرضا سروستان"
            );

            addSchoolIfNotExists(
                d,
                "مهدالرضا منظریه"
            );


            // -------------------------------------------------
            // مدیر دبستان نور ۱
            // -------------------------------------------------

            addManagerIfNotExists(
                d,
                "آقای محمدرضا اقاسی",
                "محمدرضا اقاسی",
                "25424801",
                getSchoolId(
                    d,
                    "دبستان نور ۱"
                )
            );


            // -------------------------------------------------
            // مدیر دبستان نور ۲
            // -------------------------------------------------

            addManagerIfNotExists(
                d,
                "آقای محمد عربی",
                "محمد عربی",
                "4092272",
                getSchoolId(
                    d,
                    "دبستان نور ۲"
                )
            );
        }
    }


    // =====================================================
    // اضافه کردن مرکز در صورت نبودن
    // =====================================================

    private void addSchoolIfNotExists(
            SQLiteDatabase d,
            String name) {

        Cursor c = d.rawQuery(
            "SELECT id FROM schools WHERE name = ? LIMIT 1",
            new String[]{name}
        );

        boolean exists = c.moveToFirst();

        c.close();


        if (!exists) {

            ContentValues values =
                new ContentValues();

            values.put(
                "name",
                name
            );

            d.insert(
                "schools",
                null,
                values
            );
        }
    }


    // =====================================================
    // گرفتن ID مرکز
    // =====================================================

    private int getSchoolId(
            SQLiteDatabase d,
            String name) {

        Cursor c = d.rawQuery(
            "SELECT id FROM schools " +
            "WHERE name = ? LIMIT 1",
            new String[]{name}
        );

        int id = -1;

        if (c.moveToFirst()) {

            id = c.getInt(
                c.getColumnIndexOrThrow("id")
            );
        }

        c.close();

        return id;
    }


    // =====================================================
    // اضافه کردن مدیر در صورت نبودن
    // =====================================================

    private void addManagerIfNotExists(
            SQLiteDatabase d,
            String name,
            String username,
            String password,
            int schoolId) {

        // اگر مرکز پیدا نشد
        if (schoolId == -1) {
            return;
        }


        Cursor c = d.rawQuery(
            "SELECT id FROM managers " +
            "WHERE username = ? LIMIT 1",
            new String[]{username}
        );

        boolean exists = c.moveToFirst();

        c.close();


        if (!exists) {

            ContentValues values =
                new ContentValues();

            values.put(
                "name",
                name
            );

            values.put(
                "username",
                username
            );

            values.put(
                "password",
                password
            );

            values.put(
                "school_id",
                schoolId
            );


            d.insert(
                "managers",
                null,
                values
            );
        }
    }
}
