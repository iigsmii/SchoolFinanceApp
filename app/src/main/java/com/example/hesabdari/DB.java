package com.example.hesabdari;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

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

        // =========================
        // مدارس
        // =========================
        d.execSQL(
                "CREATE TABLE schools(" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "name TEXT NOT NULL," +
                        "type TEXT," +
                        "code TEXT," +
                        "manager_id INTEGER," +
                        "active INTEGER DEFAULT 1)"
        );

        // =========================
        // مدیران
        // =========================
        d.execSQL(
                "CREATE TABLE managers(" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "name TEXT NOT NULL," +
                        "username TEXT UNIQUE," +
                        "password TEXT," +
                        "school_id INTEGER," +
                        "active INTEGER DEFAULT 1)"
        );

        // =========================
        // دانش‌آموزان
        // =========================
        d.execSQL(
                "CREATE TABLE students(" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "name TEXT NOT NULL," +
                        "code TEXT," +
                        "school_id INTEGER," +
                        "grade TEXT," +
                        "phone TEXT," +
                        "active INTEGER DEFAULT 1)"
        );

        // =========================
        // حساب‌ها
        // =========================
        d.execSQL(
                "CREATE TABLE accounts(" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "code TEXT," +
                        "name TEXT," +
                        "phone TEXT," +
                        "address TEXT," +
                        "mobile TEXT," +
                        "other TEXT)"
        );

        // =========================
        // تراکنش‌ها
        // =========================
        d.execSQL(
                "CREATE TABLE transactions(" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "date TEXT," +
                        "account TEXT," +
                        "debit INTEGER DEFAULT 0," +
                        "credit INTEGER DEFAULT 0," +
                        "comment TEXT," +
                        "kind TEXT," +
                        "school_id INTEGER)"
        );

        // =========================
        // تنظیمات
        // =========================
        d.execSQL(
                "CREATE TABLE settings(" +
                        "k TEXT PRIMARY KEY," +
                        "v TEXT)"
        );

        // =========================
        // مدارس اولیه
        // =========================
        insertInitialSchools(d);

        // =========================
        // مدیر اصلی
        // =========================
        d.execSQL(
                "INSERT INTO managers" +
                        "(name,username,password,school_id,active) " +
                        "VALUES(?,?,?,?,?)",
                new Object[]{
                        "مدیر سیستم",
                        "admin",
                        "1234",
                        null,
                        1
                }
        );

        // =========================
        // سال تحصیلی
        // =========================
        d.execSQL(
                "INSERT INTO settings(k,v) VALUES(?,?)",
                new Object[]{
                        "schoolYear",
                        "1405-1406"
                }
        );

        // =========================
        // وارد کردن اطلاعات CSV
        // =========================

        importAccountsCsv(d);
        importBankCsv(d);
        importTransactionCsv(d, "fees.csv", "شهریه");
        importTransactionCsv(d, "costs.csv", "هزینه");
    }

    // =========================================================
    // مدارس اولیه
    // =========================================================

    private void insertInitialSchools(SQLiteDatabase d) {

        String[][] schools = {
                {"مهد بیان ۱", "مهد", "MB1"},
                {"مهد بیان ۲", "مهد", "MB2"},
                {"منظریه", "مرکز آموزشی", "MNZ"},
                {"نور ۱", "دبستان", "N1"},
                {"نور ۲", "دبستان", "N2"},
                {"مهدالرضا", "مهد", "MR"}
        };

        for (String[] s : schools) {

            d.execSQL(
                    "INSERT INTO schools(name,type,code,active) VALUES(?,?,?,?)",
                    new Object[]{
                            s[0],
                            s[1],
                            s[2],
                            1
                    }
            );
        }
    }

    // =========================================================
    // حساب‌ها
    //
    // accounts.csv:
    // کد حساب,نام حساب,تلفن,آدرس,مبايل,ساير
    // =========================================================

    private void importAccountsCsv(SQLiteDatabase d) {

        try {

            InputStream in =
                    context.getAssets().open("data/accounts.csv");

            BufferedReader r =
                    new BufferedReader(
                            new InputStreamReader(in, "UTF-8")
                    );

            String line;
            boolean header = true;

            while ((line = r.readLine()) != null) {

                if (header) {
                    header = false;
                    continue;
                }

                if (line.trim().isEmpty()) {
                    continue;
                }

                List<String> a = parseCsv(line);

                if (a.size() < 2) {
                    continue;
                }

                d.execSQL(
                        "INSERT INTO accounts(" +
                                "code,name,phone,address,mobile,other" +
                                ") VALUES(?,?,?,?,?,?)",
                        new Object[]{
                                value(a, 0),
                                value(a, 1),
                                value(a, 2),
                                value(a, 3),
                                value(a, 4),
                                value(a, 5)
                        }
                );
            }

            r.close();
            in.close();

            Log.d("DB", "accounts.csv imported");

        } catch (Exception e) {

            Log.e("DB",
                    "Error importing accounts.csv",
                    e);
        }
    }

    // =========================================================
    // بانک
    //
    // bank.csv:
    // ID
    // IsNote
    // Sanad_Num
    // SanadDate
    // KolCode
    // MoeenCode
    // TafsiliCode
    // Bed
    // Bes
    // Comment
    // HesabName
    // Factor_Num
    // Remain
    // Tick
    // =========================================================

    private void importBankCsv(SQLiteDatabase d) {

        try {

            InputStream in =
                    context.getAssets().open("data/bank.csv");

            BufferedReader r =
                    new BufferedReader(
                            new InputStreamReader(in, "UTF-8")
                    );

            String line;
            boolean header = true;

            while ((line = r.readLine()) != null) {

                if (header) {
                    header = false;
                    continue;
                }

                if (line.trim().isEmpty()) {
                    continue;
                }

                List<String> a = parseCsv(line);

                // bank.csv حداقل 11 ستون دارد
                if (a.size() < 11) {
                    continue;
                }

                String date = value(a, 3);
                long debit = number(a, 7);
                long credit = number(a, 8);
                String comment = value(a, 9);
                String account = value(a, 10);

                d.execSQL(
                        "INSERT INTO transactions(" +
                                "date,account,debit,credit,comment,kind,school_id" +
                                ") VALUES(?,?,?,?,?,?,?)",
                        new Object[]{
                                date,
                                account,
                                debit,
                                credit,
                                comment,
                                "بانک",
                                null
                        }
                );
            }

            r.close();
            in.close();

            Log.d("DB", "bank.csv imported");

        } catch (Exception e) {

            Log.e("DB",
                    "Error importing bank.csv",
                    e);
        }
    }

    // =========================================================
    // شهریه و هزینه
    //
    // tuition.csv / cost.csv:
    //
    // ID
    // KolCode
    // MoeenCode
    // TafsiliCode
    // HesabName
    // Comment
    // Bed
    // Bes
    // Factor_Num
    // Tick
    // SanadComment
    // ChkNum
    // IsRecPayChk
    // CostCenterCode
    // =========================================================

    private void importTransactionCsv(
            SQLiteDatabase d,
            String fileName,
            String kind) {

        try {

            InputStream in =
                    context.getAssets().open("data/" + fileName);

            BufferedReader r =
                    new BufferedReader(
                            new InputStreamReader(in, "UTF-8")
                    );

            String line;
            boolean header = true;

            while ((line = r.readLine()) != null) {

                if (header) {
                    header = false;
                    continue;
                }

                if (line.trim().isEmpty()) {
                    continue;
                }

                List<String> a = parseCsv(line);

                if (a.size() < 8) {
                    continue;
                }

                String account = value(a, 4);
                String comment = value(a, 5);

                long debit = number(a, 6);
                long credit = number(a, 7);

                d.execSQL(
                        "INSERT INTO transactions(" +
                                "date,account,debit,credit,comment,kind,school_id" +
                                ") VALUES(?,?,?,?,?,?,?)",
                        new Object[]{
                                "",
                                account,
                                debit,
                                credit,
                                comment,
                                kind,
                                null
                        }
                );
            }

            r.close();
            in.close();

            Log.d(
                    "DB",
                    fileName + " imported as " + kind
            );

        } catch (Exception e) {

            Log.e(
                    "DB",
                    "Error importing " + fileName,
                    e
            );
        }
    }

    // =========================================================
    // مقدار امن ستون
    // =========================================================

    private static String value(
            List<String> a,
            int index) {

        if (index >= 0 && index < a.size()) {
            return a.get(index).trim();
        }

        return "";
    }

    // =========================================================
    // تبدیل مبلغ
    // =========================================================

    private static long number(
            List<String> a,
            int index) {

        try {

            String s = value(a, index);

            if (s.isEmpty()) {
                return 0;
            }

            s = s
                    .replace(",", "")
                    .replace("٬", "")
                    .replace(" ", "")
                    .replace("\"", "");

            return Long.parseLong(s);

        } catch (Exception e) {

            return 0;
        }
    }

    // =========================================================
    // CSV Parser
    // =========================================================

    private static List<String> parseCsv(String s) {

        ArrayList<String> result =
                new ArrayList<>();

        StringBuilder field =
                new StringBuilder();

        boolean quoted = false;

        for (int i = 0; i < s.length(); i++) {

            char c = s.charAt(i);

            if (c == '"') {

                if (
                        quoted &&
                        i + 1 < s.length() &&
                        s.charAt(i + 1) == '"'
                ) {

                    field.append('"');
                    i++;

                } else {

                    quoted = !quoted;
                }

            } else if (
                    c == ',' &&
                    !quoted
            ) {

                result.add(
                        field.toString()
                );

                field.setLength(0);

            } else {

                field.append(c);
            }
        }

        result.add(
                field.toString()
        );

        return result;
    }

    // =========================================================
    // ارتقای دیتابیس
    // =========================================================

    @Override
    public void onUpgrade(
            SQLiteDatabase d,
            int oldVersion,
            int newVersion) {

        // فعلاً برای نسخه آزمایشی
        // دیتابیس قبلی حذف و دوباره ساخته می‌شود.

        d.execSQL("DROP TABLE IF EXISTS transactions");
        d.execSQL("DROP TABLE IF EXISTS students");
        d.execSQL("DROP TABLE IF EXISTS managers");
        d.execSQL("DROP TABLE IF EXISTS schools");
        d.execSQL("DROP TABLE IF EXISTS accounts");
        d.execSQL("DROP TABLE IF EXISTS settings");

        onCreate(d);
    }
}
