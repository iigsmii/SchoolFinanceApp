package com.example.hesabdari;

import android.content.*;
import android.database.sqlite.*;
import android.database.*;
import java.io.*;
import java.util.*;

public class DB extends SQLiteOpenHelper {

    final Context context;

    public DB(Context c) {
        super(c, "hesabdari.db", null, 1);
        context = c.getApplicationContext();
    }

    public void onCreate(SQLiteDatabase d) {
        d.execSQL("CREATE TABLE schools(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,type TEXT,code TEXT,manager_id INTEGER,active INTEGER DEFAULT 1)");
        d.execSQL("CREATE TABLE managers(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,username TEXT UNIQUE,password TEXT,school_id INTEGER,active INTEGER DEFAULT 1)");
        d.execSQL("CREATE TABLE students(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,code TEXT,school_id INTEGER,grade TEXT,phone TEXT,active INTEGER DEFAULT 1)");
        d.execSQL("CREATE TABLE accounts(id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT,name TEXT,phone TEXT,address TEXT,mobile TEXT,other TEXT)");
        d.execSQL("CREATE TABLE transactions(id INTEGER PRIMARY KEY AUTOINCREMENT,date TEXT,account TEXT,debit INTEGER DEFAULT 0,credit INTEGER DEFAULT 0,comment TEXT,kind TEXT,school_id INTEGER)");
        d.execSQL("CREATE TABLE settings(k TEXT PRIMARY KEY,v TEXT)");

        String[][] schools = {
            {"مهد بیان ۱","مهد","MB1"},
            {"مهد بیان ۲","مهد","MB2"},
            {"منظریه","مرکز آموزشی","MNZ"},
            {"نور ۱","دبستان","N1"},
            {"نور ۲","دبستان","N2"},
            {"مهدالرضا","مهد","MR"}
        };

        for (String[] s : schools) {
            d.execSQL(
                "INSERT INTO schools(name,type,code) VALUES(?,?,?)",
                s
            );
        }

        d.execSQL(
            "INSERT INTO managers(name,username,password,school_id) VALUES('مدیر سیستم','admin','1234',1)"
        );

        d.execSQL(
            "INSERT INTO settings(k,v) VALUES('schoolYear','1405-1406')"
        );

        importCsv(d, "accounts.csv", "accounts");
        importCsv(d, "bank.csv", "bank");
        importCsv(d, "fees.csv", "fees");
        importCsv(d, "costs.csv", "costs");
    }

    void importCsv(SQLiteDatabase d, String file, String kind) {
        try {
            InputStream in = context.getAssets().open("data/" + file);
            BufferedReader r = new BufferedReader(
                new InputStreamReader(in, "UTF-8")
            );

            String line;
            boolean head = true;

            while ((line = r.readLine()) != null) {
                if (head) {
                    head = false;
                    continue;
                }

                List<String> a = parse(line);

                if (kind.equals("accounts") && a.size() >= 2) {
                    d.execSQL(
                        "INSERT INTO accounts(code,name,phone,address,mobile,other) VALUES(?,?,?,?,?,?)",
                        new Object[]{
                            a.get(0),
                            a.get(1),
                            val(a, 2),
                            val(a, 3),
                            val(a, 4),
                            val(a, 5)
                        }
                    );

                } else if (kind.equals("bank") && a.size() >= 10) {
                    d.execSQL(
                        "INSERT INTO transactions(date,account,debit,credit,comment,kind) VALUES(?,?,?,?,?,?)",
                        new Object[]{
                            val(a, 3),
                            val(a, 10),
                            num(a, 7),
                            num(a, 8),
                            val(a, 9),
                            "بانک"
                        }
                    );

                } else if ((kind.equals("fees") || kind.equals("costs")) && a.size() >= 8) {
                    d.execSQL(
                        "INSERT INTO transactions(date,account,debit,credit,comment,kind) VALUES(?,?,?,?,?,?)",
                        new Object[]{
                            "",
                            val(a, 4),
                            num(a, 6),
                            num(a, 7),
                            val(a, 5),
                            kind.equals("fees") ? "شهریه" : "هزینه"
                        }
                    );
                }
            }

            r.close();

        } catch (Exception ignored) {
        }
    }

    static String val(List<String> a, int i) {
        return i < a.size() ? a.get(i) : "";
    }

    static long num(List<String> a, int i) {
        try {
            return Long.parseLong(
                val(a, i).replace(",", "")
            );
        } catch (Exception e) {
            return 0;
        }
    }

    static List<String> parse(String s) {
        ArrayList<String> o = new ArrayList<>();
        StringBuilder b = new StringBuilder();
        boolean q = false;

        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);

            if (c == '"') {
                if (q && i + 1 < s.length() && s.charAt(i + 1) == '"') {
                    b.append('"');
                    i++;
                } else {
                    q = !q;
                }

            } else if (c == ',' && !q) {
                o.add(b.toString());
                b.setLength(0);

            } else {
                b.append(c);
            }
        }

        o.add(b.toString());
        return o;
    }

    public void onUpgrade(SQLiteDatabase d, int a, int b) {
    }
}
