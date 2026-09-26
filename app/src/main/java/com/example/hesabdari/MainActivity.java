package com.example.hesabdari;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {

    private DB db;

    private LinearLayout root;
    private LinearLayout content;

    private int currentSchoolId = 0;
    private String currentUser = "";
    private String currentName = "";
    private String currentRole = "manager";

    private int fontSize = 16;

    private int blue = Color.rgb(30, 90, 160);
    private int darkBlue = Color.rgb(18, 60, 110);
    private int green = Color.rgb(30, 130, 80);
    private int red = Color.rgb(190, 55, 55);
    private int orange = Color.rgb(220, 130, 25);
    private int gray = Color.rgb(100, 100, 100);
    private int light = Color.rgb(245, 247, 250);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        db = new DB(this);

        try {
            fontSize = Integer.parseInt(db.getSetting("font_size", "16"));
        } catch (Exception e) {
            fontSize = 16;
        }

        showLogin();
    }

    // =========================================================
    // عمومی
    // =========================================================

    private void showToast(String text) {
        Toast.makeText(MainActivity.this, text, Toast.LENGTH_SHORT).show();
    }

    private TextView text(String value, float size) {
        TextView t = new TextView(MainActivity.this);
        t.setText(value);
        t.setTextSize(size);
        t.setTextColor(Color.DKGRAY);
        t.setGravity(Gravity.CENTER_VERTICAL);
        t.setPadding(20, 14, 20, 14);
        return t;
    }

    private Button button(String title) {
        Button b = new Button(MainActivity.this);
        b.setText(title);
        b.setTextSize(fontSize);
        b.setTextColor(Color.WHITE);
        b.setAllCaps(false);
        b.setGravity(Gravity.CENTER);
        b.setPadding(15, 12, 15, 12);
        b.setBackgroundColor(blue);

        LinearLayout.LayoutParams p =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        p.setMargins(12, 7, 12, 7);
        b.setLayoutParams(p);

        return b;
    }

    private EditText edit(String hint) {
        EditText e = new EditText(MainActivity.this);
        e.setHint(hint);
        e.setTextSize(fontSize);
        e.setPadding(18, 12, 18, 12);

        LinearLayout.LayoutParams p =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        p.setMargins(12, 6, 12, 6);
        e.setLayoutParams(p);

        return e;
    }

    private void setupRoot() {

        root = new LinearLayout(MainActivity.this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(light);

        setContentView(root);
    }

    private LinearLayout createContent() {

        LinearLayout box = new LinearLayout(MainActivity.this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(10, 10, 10, 20);

        ScrollView scroll = new ScrollView(MainActivity.this);
        scroll.setFillViewport(true);
        scroll.addView(box);

        root.addView(
                scroll,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        0,
                        1
                )
        );

        content = box;

        return box;
    }

    private void title(String title) {

        TextView t = text(title, fontSize + 5);
        t.setTextColor(Color.WHITE);
        t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        t.setGravity(Gravity.CENTER);
        t.setBackgroundColor(darkBlue);

        t.setPadding(10, 22, 10, 22);

        root.addView(
                t,
                0,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                )
        );
    }

    private void addBackButton() {

        Button back = button("← بازگشت");

        back.setBackgroundColor(gray);

        back.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                onBackPressed();
            }
        });

        root.addView(
                back,
                1,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                )
        );
    }

    private void addSectionTitle(String s) {

        TextView t = text(s, fontSize + 2);
        t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        t.setTextColor(darkBlue);
        t.setPadding(18, 20, 18, 10);

        content.addView(t);
    }

    // =========================================================
    // ورود
    // =========================================================

    private void showLogin() {

        setupRoot();

        LinearLayout box = new LinearLayout(MainActivity.this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER_HORIZONTAL);
        box.setPadding(30, 50, 30, 30);

        root.addView(
                box,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        TextView logo = text(
                "سیستم حسابداری مجموعه\nمدرسه القرآن شهرضا",
                fontSize + 7
        );

        logo.setTextColor(darkBlue);
        logo.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        logo.setGravity(Gravity.CENTER);
        logo.setPadding(10, 20, 10, 35);

        box.addView(logo);

        final EditText username = edit("نام کاربری");
        final EditText password = edit("رمز عبور");

        password.setInputType(
                InputType.TYPE_CLASS_TEXT |
                        InputType.TYPE_TEXT_VARIATION_PASSWORD
        );

        box.addView(username);
        box.addView(password);

        Button login = button("ورود به سیستم");
        login.setBackgroundColor(green);

        box.addView(login);

        TextView info = text(
                "لطفاً نام کاربری و رمز عبور خود را وارد کنید.",
                fontSize - 1
        );

        info.setGravity(Gravity.CENTER);
        info.setTextColor(gray);

        box.addView(info);

        login.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {

                String u = username.getText().toString().trim();
                String p = password.getText().toString();

                if (u.length() == 0 || p.length() == 0) {
                    showToast("نام کاربری و رمز عبور را وارد کنید.");
                    return;
                }

                loginUser(u, p);
            }
        });
    }

    private void loginUser(String username, String password) {

        SQLiteDatabase d = db.getReadableDatabase();

        Cursor c = d.rawQuery(
                "SELECT id,name,school_id,role,active " +
                        "FROM managers " +
                        "WHERE username=? AND password=? LIMIT 1",
                new String[]{username, password}
        );

        if (!c.moveToFirst()) {
            c.close();
            showToast("نام کاربری یا رمز عبور اشتباه است.");
            return;
        }

        int active = c.getInt(4);

        if (active == 0) {
            c.close();
            showToast("این حساب غیرفعال است.");
            return;
        }

        currentUser = username;
        currentName = c.getString(1);
        currentSchoolId = c.getInt(2);
        currentRole = c.getString(3);

        c.close();

        showDashboard();
    }

    // =========================================================
    // داشبورد
    // =========================================================

    private void showDashboard() {

        setupRoot();

        String schoolName = getSchoolName(currentSchoolId);

        title("سیستم حسابداری مجموعه مدرسه القرآن شهرضا");

        LinearLayout header = new LinearLayout(MainActivity.this);
        header.setOrientation(LinearLayout.VERTICAL);
        header.setPadding(15, 15, 15, 15);
        header.setBackgroundColor(Color.WHITE);

        TextView user = text(
                "کاربر: " + currentName,
                fontSize
        );

        user.setTypeface(Typeface.DEFAULT, Typeface.BOLD);

        header.addView(user);

        TextView school = text(
                currentRole.equals("admin")
                        ? "سطح دسترسی: مدیر کل سیستم"
                        : "مرکز: " + schoolName,
                fontSize
        );

        header.addView(school);

        root.addView(header);

        createContent();

        if (currentRole.equals("admin")) {

            addSectionTitle("مدیریت کل سیستم");

            Button schools = button("🏫 مدیریت مراکز");
            Button managers = button("👤 مدیریت مدیران");
            Button allTransactions = button("📊 همه تراکنش‌ها");

            content.addView(schools);
            content.addView(managers);
            content.addView(allTransactions);

            schools.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    showSchools();
                }
            });

            managers.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    showManagers();
                }
            });

            allTransactions.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    showTransactions(0);
                }
            });
        }

        addSectionTitle("عملیات حسابداری");

        Button income = button("💰 ثبت درآمد / شهریه");
        Button expense = button("💸 ثبت هزینه");
        Button transactions = button("📋 دفتر تراکنش‌ها");
        Button students = button("👨‍🎓 دانش‌آموزان");
        Button reconciliation = button("✅ مغایرت‌گیری و تطبیق");
        Button reports = button("📈 گزارش‌ها");

        content.addView(income);
        content.addView(expense);
        content.addView(transactions);
        content.addView(students);
        content.addView(reconciliation);
        content.addView(reports);

        income.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showTransactionForm(true);
            }
        });

        expense.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showTransactionForm(false);
            }
        });

        transactions.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showTransactions(currentSchoolId);
            }
        });

        students.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showStudents();
            }
        });

        reconciliation.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showReconciliation();
            }
        });

        reports.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showReports();
            }
        });

        addSectionTitle("تنظیمات");

        Button settings = button("⚙ تنظیمات");
        Button logout = button("🚪 خروج از حساب");

        content.addView(settings);
        content.addView(logout);

        settings.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showSettings();
            }
        });

        logout.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                currentUser = "";
                currentName = "";
                currentRole = "manager";
                currentSchoolId = 0;
                showLogin();
            }
        });
    }

    // =========================================================
    // مراکز
    // =========================================================

    private void showSchools() {

        setupRoot();
        title("مدیریت مراکز");
        addBackButton();
        createContent();

        SQLiteDatabase d = db.getReadableDatabase();

        Cursor c = d.rawQuery(
                "SELECT id,name,active FROM schools ORDER BY id",
                null
        );

        while (c.moveToNext()) {

            final int id = c.getInt(0);
            String name = c.getString(1);
            int active = c.getInt(2);

            LinearLayout row = new LinearLayout(MainActivity.this);
            row.setOrientation(LinearLayout.VERTICAL);
            row.setPadding(15, 15, 15, 15);
            row.setBackgroundColor(Color.WHITE);

            TextView t = text(
                    id + " - " + name +
                            "\nوضعیت: " +
                            (active == 1 ? "فعال" : "غیرفعال"),
                    fontSize
            );

            row.addView(t);

            Button edit = button("ویرایش مرکز");

            edit.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    editSchool(id);
                }
            });

            row.addView(edit);
            content.addView(row);
        }

        c.close();

        Button add = button("➕ افزودن مرکز جدید");

        content.addView(add);

        add.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                addSchoolDialog();
            }
        });
    }

    private void addSchoolDialog() {

        final EditText name = edit("نام مرکز");

        new AlertDialog.Builder(MainActivity.this)
                .setTitle("افزودن مرکز")
                .setView(name)
                .setPositiveButton("ثبت", (dialog, which) -> {

                    String n = name.getText().toString().trim();

                    if (n.length() == 0) {
                        showToast("نام مرکز را وارد کنید.");
                        return;
                    }

                    ContentValues v = new ContentValues();
                    v.put("name", n);
                    v.put("type", "");
                    v.put("code", "");
                    v.put("active", 1);

                    db.getWritableDatabase().insert(
                            "schools",
                            null,
                            v
                    );

                    showSchools();
                })
                .setNegativeButton("انصراف", null)
                .show();
    }

    private void editSchool(final int id) {

        SQLiteDatabase d = db.getReadableDatabase();

        Cursor c = d.rawQuery(
                "SELECT name,active FROM schools WHERE id=?",
                new String[]{String.valueOf(id)}
        );

        if (!c.moveToFirst()) {
            c.close();
            return;
        }

        final EditText name = edit("نام مرکز");
        name.setText(c.getString(0));

        final int active = c.getInt(1);

        c.close();

        new AlertDialog.Builder(MainActivity.this)
                .setTitle("ویرایش مرکز")
                .setView(name)
                .setPositiveButton("ذخیره", (dialog, which) -> {

                    ContentValues v = new ContentValues();
                    v.put("name", name.getText().toString().trim());

                    db.getWritableDatabase().update(
                            "schools",
                            v,
                            "id=?",
                            new String[]{String.valueOf(id)}
                    );

                    showSchools();
                })
                .setNeutralButton(
                        active == 1 ? "غیرفعال کردن" : "فعال کردن",
                        (dialog, which) -> {

                            ContentValues v = new ContentValues();
                            v.put("active", active == 1 ? 0 : 1);

                            db.getWritableDatabase().update(
                                    "schools",
                                    v,
                                    "id=?",
                                    new String[]{String.valueOf(id)}
                            );

                            showSchools();
                        }
                )
                .setNegativeButton("انصراف", null)
                .show();
    }

    // =========================================================
    // مدیران
    // =========================================================

    private void showManagers() {

        setupRoot();
        title("مدیریت مدیران");
        addBackButton();
        createContent();

        SQLiteDatabase d = db.getReadableDatabase();

        Cursor c = d.rawQuery(
                "SELECT m.id,m.name,m.username,m.school_id,m.role,m.active," +
                        "COALESCE(s.name,'همه مراکز') " +
                        "FROM managers m " +
                        "LEFT JOIN schools s ON s.id=m.school_id " +
                        "ORDER BY m.id",
                null
        );

        while (c.moveToNext()) {

            final int id = c.getInt(0);

            String name = c.getString(1);
            String username = c.getString(2);
            int schoolId = c.getInt(3);
            String role = c.getString(4);
            int active = c.getInt(5);
            String schoolName = c.getString(6);

            LinearLayout row = new LinearLayout(MainActivity.this);
            row.setOrientation(LinearLayout.VERTICAL);
            row.setPadding(15, 15, 15, 15);
            row.setBackgroundColor(Color.WHITE);

            String info =
                    "نام: " + name +
                            "\nنام کاربری: " + username +
                            "\nمرکز: " + schoolName +
                            "\nنقش: " +
                            (role.equals("admin")
                                    ? "مدیر کل"
                                    : "مدیر مرکز") +
                            "\nوضعیت: " +
                            (active == 1 ? "فعال" : "غیرفعال");

            row.addView(text(info, fontSize));

            Button edit = button("ویرایش مدیر");

            edit.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    editManager(id);
                }
            });

            row.addView(edit);
            content.addView(row);
        }

        c.close();

        Button add = button("➕ افزودن مدیر");

        content.addView(add);

        add.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                addManagerDialog();
            }
        });
    }

    private void addManagerDialog() {

        LinearLayout box = new LinearLayout(MainActivity.this);
        box.setOrientation(LinearLayout.VERTICAL);

        final EditText name = edit("نام و نام خانوادگی");
        final EditText username = edit("نام کاربری");
        final EditText password = edit("رمز عبور");

        box.addView(name);
        box.addView(username);
        box.addView(password);

        TextView label = text("مرکز", fontSize);
        box.addView(label);

        final Spinner schoolSpinner = new Spinner(MainActivity.this);

        final ArrayList<String> schoolNames = new ArrayList<>();
        final ArrayList<Integer> schoolIds = new ArrayList<>();

        schoolNames.add("مدیر کل سیستم");
        schoolIds.add(0);

        Cursor c = db.getReadableDatabase().rawQuery(
                "SELECT id,name FROM schools ORDER BY id",
                null
        );

        while (c.moveToNext()) {
            schoolIds.add(c.getInt(0));
            schoolNames.add(c.getString(1));
        }

        c.close();

        ArrayAdapter<String> adapter =
                new ArrayAdapter<String>(
                        MainActivity.this,
                        android.R.layout.simple_spinner_item,
                        schoolNames
                );

        adapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item
        );

        schoolSpinner.setAdapter(adapter);
        box.addView(schoolSpinner);

        new AlertDialog.Builder(MainActivity.this)
                .setTitle("افزودن مدیر")
                .setView(box)
                .setPositiveButton("ثبت", (dialog, which) -> {

                    String n = name.getText().toString().trim();
                    String u = username.getText().toString().trim();
                    String p = password.getText().toString();

                    if (n.length() == 0 ||
                            u.length() == 0 ||
                            p.length() == 0) {

                        showToast("تمام اطلاعات را وارد کنید.");
                        return;
                    }

                    int schoolId =
                            schoolIds.get(
                                    schoolSpinner.getSelectedItemPosition()
                            );

                    ContentValues v = new ContentValues();

                    v.put("name", n);
                    v.put("username", u);
                    v.put("password", p);
                    v.put("school_id", schoolId);
                    v.put(
                            "role",
                            schoolId == 0
                                    ? "admin"
                                    : "manager"
                    );
                    v.put("active", 1);

                    long result =
                            db.getWritableDatabase().insert(
                                    "managers",
                                    null,
                                    v
                            );

                    if (result == -1) {
                        showToast("نام کاربری تکراری است.");
                    } else {
                        showManagers();
                    }
                })
                .setNegativeButton("انصراف", null)
                .show();
    }

    private void editManager(final int id) {

        SQLiteDatabase d = db.getReadableDatabase();

        Cursor c = d.rawQuery(
                "SELECT name,username,password,school_id,role,active " +
                        "FROM managers WHERE id=?",
                new String[]{String.valueOf(id)}
        );

        if (!c.moveToFirst()) {
            c.close();
            return;
        }

        final EditText name = edit("نام");
        final EditText username = edit("نام کاربری");
        final EditText password = edit("رمز عبور");

        name.setText(c.getString(0));
        username.setText(c.getString(1));
        password.setText(c.getString(2));

        final int oldSchoolId = c.getInt(3);
        final int oldActive = c.getInt(5);

        c.close();

        LinearLayout box = new LinearLayout(MainActivity.this);
        box.setOrientation(LinearLayout.VERTICAL);

        box.addView(name);
        box.addView(username);
        box.addView(password);

        final Spinner schoolSpinner = new Spinner(MainActivity.this);

        final ArrayList<String> schoolNames = new ArrayList<>();
        final ArrayList<Integer> schoolIds = new ArrayList<>();

        schoolNames.add("مدیر کل سیستم");
        schoolIds.add(0);

        c = d.rawQuery(
                "SELECT id,name FROM schools ORDER BY id",
                null
        );

        while (c.moveToNext()) {
            schoolIds.add(c.getInt(0));
            schoolNames.add(c.getString(1));
        }

        c.close();

        ArrayAdapter<String> adapter =
                new ArrayAdapter<String>(
                        MainActivity.this,
                        android.R.layout.simple_spinner_item,
                        schoolNames
                );

        adapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item
        );

        schoolSpinner.setAdapter(adapter);

        int position = 0;

        for (int i = 0; i < schoolIds.size(); i++) {
            if (schoolIds.get(i) == oldSchoolId) {
                position = i;
                break;
            }
        }

        schoolSpinner.setSelection(position);

        box.addView(schoolSpinner);

        new AlertDialog.Builder(MainActivity.this)
                .setTitle("ویرایش مدیر")
                .setView(box)
                .setPositiveButton("ذخیره", (dialog, which) -> {

                    int schoolId =
                            schoolIds.get(
                                    schoolSpinner.getSelectedItemPosition()
                            );

                    ContentValues v = new ContentValues();

                    v.put("name", name.getText().toString().trim());
                    v.put(
                            "username",
                            username.getText().toString().trim()
                    );
                    v.put("password", password.getText().toString());
                    v.put("school_id", schoolId);
                    v.put(
                            "role",
                            schoolId == 0
                                    ? "admin"
                                    : "manager"
                    );

                    db.getWritableDatabase().update(
                            "managers",
                            v,
                            "id=?",
                            new String[]{String.valueOf(id)}
                    );

                    showManagers();
                })
                .setNeutralButton(
                        oldActive == 1
                                ? "غیرفعال کردن"
                                : "فعال کردن",
                        (dialog, which) -> {

                            ContentValues v = new ContentValues();
                            v.put(
                                    "active",
                                    oldActive == 1 ? 0 : 1
                            );

                            db.getWritableDatabase().update(
                                    "managers",
                                    v,
                                    "id=?",
                                    new String[]{String.valueOf(id)}
                            );

                            showManagers();
                        }
                )
                .setNegativeButton("انصراف", null)
                .show();
    }

    // =========================================================
    // دانش‌آموزان
    // =========================================================

    private void showStudents() {

        setupRoot();
        title("دانش‌آموزان");
        addBackButton();
        createContent();

        Button add = button("➕ افزودن دانش‌آموز");

        content.addView(add);

        add.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                addStudentDialog();
            }
        });

        final EditText search = edit("جستجوی نام یا کد دانش‌آموز");
        content.addView(search);

        Button searchButton = button("🔎 جستجو");
        content.addView(searchButton);

        final LinearLayout results =
                new LinearLayout(MainActivity.this);

        results.setOrientation(LinearLayout.VERTICAL);

        content.addView(results);

        searchButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {

                results.removeAllViews();

                String q = search.getText().toString().trim();

                SQLiteDatabase d = db.getReadableDatabase();

                String sql;

                String[] args;

                if (currentRole.equals("admin")) {

                    sql =
                            "SELECT id,name,code,grade,phone " +
                                    "FROM students " +
                                    "WHERE name LIKE ? OR code LIKE ? " +
                                    "ORDER BY name";

                    args = new String[]{
                            "%" + q + "%",
                            "%" + q + "%"
                    };

                } else {

                    sql =
                            "SELECT id,name,code,grade,phone " +
                                    "FROM students " +
                                    "WHERE school_id=? " +
                                    "AND (name LIKE ? OR code LIKE ?) " +
                                    "ORDER BY name";

                    args = new String[]{
                            String.valueOf(currentSchoolId),
                            "%" + q + "%",
                            "%" + q + "%"
                    };
                }

                Cursor c = d.rawQuery(sql, args);

                while (c.moveToNext()) {

                    int id = c.getInt(0);

                    String info =
                            "نام: " + c.getString(1) +
                                    "\nکد: " + c.getString(2) +
                                    "\nپایه: " + c.getString(3) +
                                    "\nتلفن: " + c.getString(4);

                    results.addView(text(info, fontSize));

                    Button edit =
                            button("ویرایش دانش‌آموز");

                    final int studentId = id;

                    edit.setOnClickListener(
                            new View.OnClickListener() {
                                @Override
                                public void onClick(View v) {
                                    editStudent(studentId);
                                }
                            }
                    );

                    results.addView(edit);
                }

                c.close();
            }
        });
    }

    private void addStudentDialog() {

        LinearLayout box = new LinearLayout(MainActivity.this);
        box.setOrientation(LinearLayout.VERTICAL);

        final EditText name = edit("نام دانش‌آموز");
        final EditText code = edit("کد دانش‌آموز");
        final EditText grade = edit("پایه");
        final EditText phone = edit("شماره تماس");

        box.addView(name);
        box.addView(code);
        box.addView(grade);
        box.addView(phone);

        new AlertDialog.Builder(MainActivity.this)
                .setTitle("افزودن دانش‌آموز")
                .setView(box)
                .setPositiveButton("ثبت", (dialog, which) -> {

                    ContentValues v = new ContentValues();

                    v.put("name", name.getText().toString().trim());
                    v.put("code", code.getText().toString().trim());
                    v.put("grade", grade.getText().toString().trim());
                    v.put("phone", phone.getText().toString().trim());
                    v.put("school_id", currentSchoolId);

                    db.getWritableDatabase().insert(
                            "students",
                            null,
                            v
                    );

                    showStudents();
                })
                .setNegativeButton("انصراف", null)
                .show();
    }

    private void editStudent(final int id) {

        SQLiteDatabase d = db.getReadableDatabase();

        Cursor c = d.rawQuery(
                "SELECT name,code,grade,phone FROM students WHERE id=?",
                new String[]{String.valueOf(id)}
        );

        if (!c.moveToFirst()) {
            c.close();
            return;
        }

        final EditText name = edit("نام");
        final EditText code = edit("کد");
        final EditText grade = edit("پایه");
        final EditText phone = edit("تلفن");

        name.setText(c.getString(0));
        code.setText(c.getString(1));
        grade.setText(c.getString(2));
        phone.setText(c.getString(3));

        c.close();

        LinearLayout box = new LinearLayout(MainActivity.this);
        box.setOrientation(LinearLayout.VERTICAL);

        box.addView(name);
        box.addView(code);
        box.addView(grade);
        box.addView(phone);

        new AlertDialog.Builder(MainActivity.this)
                .setTitle("ویرایش دانش‌آموز")
                .setView(box)
                .setPositiveButton("ذخیره", (dialog, which) -> {

                    ContentValues v = new ContentValues();

                    v.put("name", name.getText().toString().trim());
                    v.put("code", code.getText().toString().trim());
                    v.put("grade", grade.getText().toString().trim());
                    v.put("phone", phone.getText().toString().trim());

                    db.getWritableDatabase().update(
                            "students",
                            v,
                            "id=?",
                            new String[]{String.valueOf(id)}
                    );

                    showStudents();
                })
                .setNegativeButton("انصراف", null)
                .show();
    }

    // =========================================================
    // ثبت درآمد / هزینه
    // =========================================================

    private void showTransactionForm(boolean income) {

        setupRoot();

        title(
                income
                        ? "ثبت درآمد / شهریه"
                        : "ثبت هزینه"
        );

        addBackButton();
        createContent();

        final EditText amount = edit("مبلغ به تومان");
        amount.setInputType(InputType.TYPE_CLASS_NUMBER);

        final EditText tracking =
                edit("شماره پیگیری / کد رهگیری");

        final EditText account =
                edit(
                        income
                                ? "حساب / عنوان درآمد"
                                : "حساب / عنوان هزینه"
                );

        final EditText comment =
                edit("شرح تراکنش");

        content.addView(amount);
        content.addView(account);

        if (income) {

            addSectionTitle("دانش‌آموز");

            final Spinner studentSpinner =
                    new Spinner(MainActivity.this);

            final ArrayList<String> studentNames =
                    new ArrayList<>();

            final ArrayList<Integer> studentIds =
                    new ArrayList<>();

            studentNames.add("بدون انتخاب");
            studentIds.add(0);

            SQLiteDatabase d =
                    db.getReadableDatabase();

            Cursor c;

            if (currentRole.equals("admin")) {

                c = d.rawQuery(
                        "SELECT id,name FROM students ORDER BY name",
                        null
                );

            } else {

                c = d.rawQuery(
                        "SELECT id,name FROM students " +
                                "WHERE school_id=? ORDER BY name",
                        new String[]{
                                String.valueOf(currentSchoolId)
                        }
                );
            }

            while (c.moveToNext()) {

                studentIds.add(c.getInt(0));
                studentNames.add(c.getString(1));
            }

            c.close();

            ArrayAdapter<String> studentAdapter =
                    new ArrayAdapter<String>(
                            MainActivity.this,
                            android.R.layout.simple_spinner_item,
                            studentNames
                    );

            studentAdapter.setDropDownViewResource(
                    android.R.layout.simple_spinner_dropdown_item
            );

            studentSpinner.setAdapter(studentAdapter);

            content.addView(studentSpinner);

            addSectionTitle("روش پرداخت");

            final Spinner paymentSpinner =
                    createPaymentSpinner();

            content.addView(paymentSpinner);

            content.addView(tracking);
            content.addView(comment);

            Button save = button("💾 ثبت درآمد");

            save.setBackgroundColor(green);
            content.addView(save);

            save.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {

                    saveTransaction(
                            true,
                            amount,
                            account,
                            comment,
                            tracking,
                            paymentSpinner,
                            studentIds,
                            studentSpinner
                    );
                }
            });

        } else {

            addSectionTitle("روش پرداخت");

            final Spinner paymentSpinner =
                    createPaymentSpinner();

            content.addView(paymentSpinner);

            content.addView(tracking);
            content.addView(comment);

            Button save = button("💾 ثبت هزینه");

            save.setBackgroundColor(red);
            content.addView(save);

            save.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {

                    saveExpense(
                            amount,
                            account,
                            comment,
                            tracking,
                            paymentSpinner
                    );
                }
            });
        }
    }

    private Spinner createPaymentSpinner() {

        Spinner spinner = new Spinner(MainActivity.this);

        String[] methods = new String[]{
                "نقدی",
                "کارت به کارت",
                "دستگاه کارتخوان",
                "واریز بانکی",
                "چک",
                "سایر"
        };

        ArrayAdapter<String> adapter =
                new ArrayAdapter<String>(
                        MainActivity.this,
                        android.R.layout.simple_spinner_item,
                        methods
                );

        adapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item
        );

        spinner.setAdapter(adapter);

        return spinner;
    }

    private void saveTransaction(
            boolean income,
            EditText amount,
            EditText account,
            EditText comment,
            EditText tracking,
            Spinner payment,
            ArrayList<Integer> studentIds,
            Spinner studentSpinner) {

        String amountText =
                amount.getText().toString().trim();

        if (amountText.length() == 0) {
            showToast("مبلغ را وارد کنید.");
            return;
        }

        long value;

        try {
            value = Long.parseLong(amountText);
        } catch (Exception e) {
            showToast("مبلغ معتبر نیست.");
            return;
        }

        int studentId =
                studentIds.get(
                        studentSpinner.getSelectedItemPosition()
                );

        String method =
                payment.getSelectedItem().toString();

        ContentValues v = new ContentValues();

        v.put(
                "date",
                new SimpleDateFormat(
                        "yyyy/MM/dd HH:mm",
                        Locale.US
                ).format(new Date())
        );

        v.put(
                "account",
                account.getText().toString().trim()
        );

        v.put("debit", 0);
        v.put("credit", value);

        v.put(
                "comment",
                comment.getText().toString().trim()
        );

        v.put("kind", "income");
        v.put("payment_method", method);

        v.put(
                "tracking_code",
                tracking.getText().toString().trim()
        );

        v.put("student_id", studentId);
        v.put("school_id", currentSchoolId);
        v.put("reconciled", 0);

        long result =
                db.getWritableDatabase().insert(
                        "transactions",
                        null,
                        v
                );

        if (result == -1) {
            showToast("ثبت تراکنش انجام نشد.");
        } else {
            showToast("درآمد با موفقیت ثبت شد.");
            showDashboard();
        }
    }

    private void saveExpense(
            EditText amount,
            EditText account,
            EditText comment,
            EditText tracking,
            Spinner payment) {

        String amountText =
                amount.getText().toString().trim();

        if (amountText.length() == 0) {
            showToast("مبلغ را وارد کنید.");
            return;
        }

        long value;

        try {
            value = Long.parseLong(amountText);
        } catch (Exception e) {
            showToast("مبلغ معتبر نیست.");
            return;
        }

        ContentValues v = new ContentValues();

        v.put(
                "date",
                new SimpleDateFormat(
                        "yyyy/MM/dd HH:mm",
                        Locale.US
                ).format(new Date())
        );

        v.put(
                "account",
                account.getText().toString().trim()
        );

        v.put("debit", value);
        v.put("credit", 0);

        v.put(
                "comment",
                comment.getText().toString().trim()
        );

        v.put("kind", "expense");

        v.put(
                "payment_method",
                payment.getSelectedItem().toString()
        );

        v.put(
                "tracking_code",
                tracking.getText().toString().trim()
        );

        v.put("student_id", 0);
        v.put("school_id", currentSchoolId);
        v.put("reconciled", 0);

        long result =
                db.getWritableDatabase().insert(
                        "transactions",
                        null,
                        v
                );

        if (result == -1) {
            showToast("ثبت هزینه انجام نشد.");
        } else {
            showToast("هزینه با موفقیت ثبت شد.");
            showDashboard();
        }
    }

    // =========================================================
    // تراکنش‌ها
    // =========================================================

    private void showTransactions(int schoolFilter) {

        setupRoot();
        title("دفتر تراکنش‌ها");
        addBackButton();
        createContent();

        SQLiteDatabase d = db.getReadableDatabase();

        String sql;
        String[] args;

        if (currentRole.equals("admin") && schoolFilter == 0) {

            sql =
                    "SELECT t.id,t.date,t.account,t.debit,t.credit," +
                            "t.comment,t.payment_method,t.tracking_code," +
                            "t.reconciled,s.name " +
                            "FROM transactions t " +
                            "LEFT JOIN schools s ON s.id=t.school_id " +
                            "ORDER BY t.id DESC";

            args = null;

        } else {

            int sid =
                    currentRole.equals("admin")
                            ? schoolFilter
                            : currentSchoolId;

            sql =
                    "SELECT t.id,t.date,t.account,t.debit,t.credit," +
                            "t.comment,t.payment_method,t.tracking_code," +
                            "t.reconciled,s.name " +
                            "FROM transactions t " +
                            "LEFT JOIN schools s ON s.id=t.school_id " +
                            "WHERE t.school_id=? " +
                            "ORDER BY t.id DESC";

            args = new String[]{
                    String.valueOf(sid)
            };
        }

        Cursor c = d.rawQuery(sql, args);

        long totalIncome = 0;
        long totalExpense = 0;

        while (c.moveToNext()) {

            final int id = c.getInt(0);

            long debit = c.getLong(3);
            long credit = c.getLong(4);

            totalIncome += credit;
            totalExpense += debit;

            String reconciled =
                    c.getInt(8) == 1
                            ? "تطبیق شده"
                            : "در انتظار تطبیق";

            String school =
                    c.getString(9);

            String info =
                    "تاریخ: " + c.getString(1) +
                            "\nحساب: " + c.getString(2) +
                            "\nدرآمد: " + formatMoney(credit) +
                            "\nهزینه: " + formatMoney(debit) +
                            "\nروش پرداخت: " + c.getString(6) +
                            "\nپیگیری: " + c.getString(7) +
                            "\nشرح: " + c.getString(5) +
                            "\nمرکز: " + school +
                            "\nوضعیت: " + reconciled;

            TextView t = text(info, fontSize);

            t.setBackgroundColor(Color.WHITE);
            content.addView(t);

            Button reconcile =
                    button(
                            c.getInt(8) == 1
                                    ? "لغو تطبیق"
                                    : "تأیید تطبیق"
                    );

            final boolean isReconciled =
                    c.getInt(8) == 1;

            reconcile.setOnClickListener(
                    new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {

                            ContentValues values =
                                    new ContentValues();

                            values.put(
                                    "reconciled",
                                    isReconciled ? 0 : 1
                            );

                            db.getWritableDatabase().update(
                                    "transactions",
                                    values,
                                    "id=?",
                                    new String[]{
                                            String.valueOf(id)
                                    }
                            );

                            showTransactions(schoolFilter);
                        }
                    }
            );

            content.addView(reconcile);
        }

        c.close();

        addSectionTitle("جمع");

        content.addView(
                text(
                        "کل درآمد: " +
                                formatMoney(totalIncome) +
                                "\nکل هزینه: " +
                                formatMoney(totalExpense) +
                                "\nمانده: " +
                                formatMoney(
                                        totalIncome -
                                                totalExpense
                                ),
                        fontSize + 1
                )
        );
    }

    private String formatMoney(long value) {

        String s = String.valueOf(value);
        StringBuilder result = new StringBuilder();

        int count = 0;

        for (int i = s.length() - 1; i >= 0; i--) {

            result.insert(0, s.charAt(i));
            count++;

            if (count == 3 && i > 0) {
                result.insert(0, ',');
                count = 0;
            }
        }

        return result + " تومان";
    }

    // =========================================================
    // مغایرت‌گیری
    // =========================================================

    private void showReconciliation() {

        setupRoot();
        title("مغایرت‌گیری و تطبیق");
        addBackButton();
        createContent();

        addSectionTitle("تراکنش‌های در انتظار تطبیق");

        SQLiteDatabase d =
                db.getReadableDatabase();

        String sql;

        String[] args;

        if (currentRole.equals("admin")) {

            sql =
                    "SELECT id,date,account,debit,credit," +
                            "payment_method,tracking_code " +
                            "FROM transactions " +
                            "WHERE reconciled=0 " +
                            "ORDER BY id DESC";

            args = null;

        } else {

            sql =
                    "SELECT id,date,account,debit,credit," +
                            "payment_method,tracking_code " +
                            "FROM transactions " +
                            "WHERE reconciled=0 AND school_id=? " +
                            "ORDER BY id DESC";

            args = new String[]{
                    String.valueOf(currentSchoolId)
            };
        }

        Cursor c =
                d.rawQuery(sql, args);

        int count = 0;

        while (c.moveToNext()) {

            count++;

            final int id = c.getInt(0);

            String info =
                    "تاریخ: " + c.getString(1) +
                            "\nحساب: " + c.getString(2) +
                            "\nمبلغ: " +
                            formatMoney(
                                    c.getLong(4) != 0
                                            ? c.getLong(4)
                                            : c.getLong(3)
                            ) +
                            "\nروش: " + c.getString(5) +
                            "\nپیگیری: " + c.getString(6);

            content.addView(
                    text(info, fontSize)
            );

            Button confirm =
                    button("✅ تأیید و تطبیق");

            confirm.setOnClickListener(
                    new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {

                            ContentValues values =
                                    new ContentValues();

                            values.put("reconciled", 1);

                            db.getWritableDatabase().update(
                                    "transactions",
                                    values,
                                    "id=?",
                                    new String[]{
                                            String.valueOf(id)
                                    }
                            );

                            showReconciliation();
                        }
                    }
            );

            content.addView(confirm);
        }

        c.close();

        if (count == 0) {

            TextView empty =
                    text(
                            "🎉 همه تراکنش‌ها تطبیق شده‌اند.",
                            fontSize + 1
                    );

            empty.setGravity(Gravity.CENTER);

            content.addView(empty);
        }
    }

    // =========================================================
    // گزارش‌ها
    // =========================================================

    private void showReports() {

        setupRoot();
        title("گزارش‌های مالی");
        addBackButton();
        createContent();

        SQLiteDatabase d =
                db.getReadableDatabase();

        String where;
        String[] args;

        if (currentRole.equals("admin")) {

            where = "";
            args = null;

        } else {

            where = " WHERE school_id=? ";

            args = new String[]{
                    String.valueOf(currentSchoolId)
            };
        }

        Cursor c =
                d.rawQuery(
                        "SELECT " +
                                "COALESCE(SUM(credit),0)," +
                                "COALESCE(SUM(debit),0)," +
                                "COUNT(*) " +
                                "FROM transactions" +
                                where,
                        args
                );

        if (c.moveToFirst()) {

            long income = c.getLong(0);
            long expense = c.getLong(1);
            int count = c.getInt(2);

            content.addView(
                    text(
                            "تعداد تراکنش‌ها: " + count +
                                    "\n\nکل درآمد:\n" +
                                    formatMoney(income) +
                                    "\n\nکل هزینه:\n" +
                                    formatMoney(expense) +
                                    "\n\nمانده:\n" +
                                    formatMoney(
                                            income - expense
                                    ),
                            fontSize + 2
                    )
            );
        }

        c.close();

        addSectionTitle("گزارش روش‌های پرداخت");

        Cursor methods;

        if (currentRole.equals("admin")) {

            methods =
                    d.rawQuery(
                            "SELECT payment_method," +
                                    "COUNT(*),SUM(credit),SUM(debit) " +
                                    "FROM transactions " +
                                    "GROUP BY payment_method",
                            null
                    );

        } else {

            methods =
                    d.rawQuery(
                            "SELECT payment_method," +
                                    "COUNT(*),SUM(credit),SUM(debit) " +
                                    "FROM transactions " +
                                    "WHERE school_id=? " +
                                    "GROUP BY payment_method",
                            new String[]{
                                    String.valueOf(currentSchoolId)
                            }
                    );
        }

        while (methods.moveToNext()) {

            content.addView(
                    text(
                            "روش: " +
                                    methods.getString(0) +
                                    "\nتعداد: " +
                                    methods.getInt(1) +
                                    "\nدریافت: " +
                                    formatMoney(
                                            methods.getLong(2)
                                    ) +
                                    "\nپرداخت: " +
                                    formatMoney(
                                            methods.getLong(3)
                                    ),
                            fontSize
                    )
            );
        }

        methods.close();
    }

    // =========================================================
    // تنظیمات
    // =========================================================

    private void showSettings() {

        setupRoot();
        title("تنظیمات");
        addBackButton();
        createContent();

        addSectionTitle("اندازه فونت");

        String[] sizes = new String[]{
                "کوچک",
                "متوسط",
                "بزرگ",
                "خیلی بزرگ"
        };

        final Spinner spinner =
                new Spinner(MainActivity.this);

        ArrayAdapter<String> adapter =
                new ArrayAdapter<String>(
                        MainActivity.this,
                        android.R.layout.simple_spinner_item,
                        sizes
                );

        adapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item
        );

        spinner.setAdapter(adapter);

        int selected = 1;

        if (fontSize <= 14) {
            selected = 0;
        } else if (fontSize <= 16) {
            selected = 1;
        } else if (fontSize <= 19) {
            selected = 2;
        } else {
            selected = 3;
        }

        spinner.setSelection(selected);

        content.addView(spinner);

        Button save = button("💾 ذخیره اندازه فونت");

        content.addView(save);

        save.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {

                int pos =
                        spinner.getSelectedItemPosition();

                if (pos == 0) {
                    fontSize = 14;
                } else if (pos == 1) {
                    fontSize = 16;
                } else if (pos == 2) {
                    fontSize = 19;
                } else {
                    fontSize = 22;
                }

                db.setSetting(
                        "font_size",
                        String.valueOf(fontSize)
                );

                showToast(
                        "اندازه فونت ذخیره شد."
                );

                showDashboard();
            }
        });

        addSectionTitle("اطلاعات حساب");

        content.addView(
                text(
                        "نام کاربر: " +
                                currentName +
                                "\nنام کاربری: " +
                                currentUser +
                                "\nسطح دسترسی: " +
                                (
                                        currentRole.equals("admin")
                                                ? "مدیر کل سیستم"
                                                : "مدیر مرکز"
                                ),
                        fontSize
                )
        );
    }

    // =========================================================
    // اطلاعات مرکز
    // =========================================================

    private String getSchoolName(int id) {

        if (id == 0) {
            return "همه مراکز";
        }

        Cursor c =
                db.getReadableDatabase().rawQuery(
                        "SELECT name FROM schools WHERE id=?",
                        new String[]{
                                String.valueOf(id)
                        }
                );

        String name = "نامشخص";

        if (c.moveToFirst()) {
            name = c.getString(0);
        }

        c.close();

        return name;
    }

    // =========================================================
    // دکمه فیزیکی Back
    // =========================================================

    @Override
    public void onBackPressed() {

        showDashboard();
    }
}
