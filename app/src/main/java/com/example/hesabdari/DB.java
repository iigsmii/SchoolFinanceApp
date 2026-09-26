package com.example.hesabdari;

import android.content.*;
import android.database.sqlite.*;
import android.database.*;
import java.util.*;

public class DB extends SQLiteOpenHelper {

    private static final String DB_NAME = "hesabdari.db";
    private static final int DB_VERSION = 2;

    final Context context;

    public DB(Context c) {
        super(c, DB_NAME, null, DB_VERSION);
        context = c.getApplicationContext();
    }

    @Override
    public void onCreate(SQLiteDatabase d) {

        // جدول مراکز
        d.execSQL(
            "CREATE TABLE schools (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "name TEXT NOT NULL," +
            "type TEXT," +
            "code TEXT)"
        );

        // جدول مدیران
        d.execSQL(
            "CREATE TABLE managers (" +
            "id INTEGER PRIMARY KEY AUTOINCREMENT," +
            "name TEXT NOT NULL," +
            "username TEXT UNIQUE NOT NULL," +
            "password TEXT NOT NULL," +
            "school_id INTEGER NOT NULL," +
            "FOREIGN KEY(school_id) REFERENCES schools(id))"
        );

        // =========================
        // ثبت ۹ مرکز
        // =========================

        String[] schools = {
            "دبستان نور ۱",
            "دبستان نور ۲",
            "دبستان تبیان ۱",
            "دبستان تبیان ۲",
            "مهدالرضا مرکزی شیفت صبح",
            "مهدالرضا مرکزی شیفت عصر",
            "مهدالرضا ابراهیم خلیل",
            "مهدالرضا سروستان",
            "مهدالرضا منظریه"
        };

        for (String school : schools) {
            ContentValues v = new ContentValues();
            v.put("name", school);
            d.insert("schools", null, v);
        }

        // =========================
        // مدیر دبستان نور ۱
        // =========================

        ContentValues manager1 = new ContentValues();
        manager1.put("name", "آقای محمدرضا اقاسی");
        manager1.put("username", "محمدرضا اقاسی");
        manager1.put("password", "25424801");
        manager1.put("school_id", 1);
        d.insert("managers", null, manager1);

        // =========================
        // مدیر دبستان نور ۲
        // =========================

        ContentValues manager2 = new ContentValues();
        manager2.put("name", "آقای محمد عربی");
        manager2.put("username", "محمد عربی");
        manager2.put("password", "4092272");
        manager2.put("school_id", 2);
        d.insert("managers", null, manager2);
    }

    @Override
    public void onUpgrade(
            SQLiteDatabase d,
            int oldVersion,
            int newVersion) {

        if (oldVersion < 2) {

            // اگر جدول مدیران وجود نداشته باشد ایجاد می‌شود
            d.execSQL(
                "CREATE TABLE IF NOT EXISTS managers (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                "name TEXT NOT NULL," +
                "username TEXT UNIQUE NOT NULL," +
                "password TEXT NOT NULL," +
                "school_id INTEGER NOT NULL," +
                "FOREIGN KEY(school_id) REFERENCES schools(id))"
            );

            // اطمینان از وجود ۹ مرکز
            addSchoolIfNotExists(d, "دبستان نور ۱");
            addSchoolIfNotExists(d, "دبستان نور ۲");
            addSchoolIfNotExists(d, "دبستان تبیان ۱");
            addSchoolIfNotExists(d, "دبستان تبیان ۲");
            addSchoolIfNotExists(d, "مهدالرضا مرکزی شیفت صبح");
            addSchoolIfNotExists(d, "مهدالرضا مرکزی شیفت عصر");
            addSchoolIfNotExists(d, "مهدالرضا ابراهیم خلیل");
            addSchoolIfNotExists(d, "مهدالرضا سروستان");
            addSchoolIfNotExists(d, "مهدالرضا منظریه");

            // مدیر نور ۱
            addManagerIfNotExists(
                d,
                "آقای محمدرضا اقاسی",
                "محمدرضا اقاسی",
                "25424801",
                getSchoolId(d, "دبستان نور ۱")
            );

            // مدیر نور ۲
            addManagerIfNotExists(
                d,
                "آقای محمد عربی",
                "محمد عربی",
                "4092272",
                getSchoolId(d, "دبستان نور ۲")
            );
        }
    }

    private void addSchoolIfNotExists(
            SQLiteDatabase d,
            String name) {

        Cursor c = d.rawQuery(
            "SELECT id FROM schools WHERE name=?",
            new String[]{name}
        );

        boolean exists = c.moveToFirst();
        c.close();

        if (!exists) {
            ContentValues v = new ContentValues();
            v.put("name", name);
            d.insert("schools", null, v);
        }
    }

    private int getSchoolId(
            SQLiteDatabase d,
            String name) {

        Cursor c = d.rawQuery(
            "SELECT id FROM schools WHERE name=? LIMIT 1",
            new String[]{name}
        );

        int id = -1;

        if (c.moveToFirst()) {
            id = c.getInt(0);
        }

        c.close();
        return id;
    }

    private void addManagerIfNotExists(
            SQLiteDatabase d,
            String name,
            String username,
            String password,
            int schoolId) {

        if (schoolId == -1) return;

        Cursor c = d.rawQuery(
            "SELECT id FROM managers WHERE username=?",
            new String[]{username}
        );

        boolean exists = c.moveToFirst();
        c.close();

        if (!exists) {

            ContentValues v = new ContentValues();

            v.put("name", name);
            v.put("username", username);
            v.put("password", password);
            v.put("school_id", schoolId);

            d.insert("managers", null, v);
        }
    }
}
