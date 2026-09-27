package com.example.hesabdari;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
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
import java.util.Locale;

public class MainActivity extends Activity {

    private DB db;

    private LinearLayout root;
    private LinearLayout content;

    private int currentSchoolId = 0;
    private String currentUser = "";
    private String currentName = "";
    private String currentRole = "manager";

    private boolean isLoggedIn = false;

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
            fontSize = Integer.parseInt(
                    db.getSetting("font_size", "16")
            );
        } catch (Exception e) {
            fontSize = 16;
        }

        showLogin();
    }

    // =========================================================
    // عمومی
    // =========================================================

    private void showToast(String text) {
        Toast.makeText(
                MainActivity.this,
                text,
                Toast.LENGTH_SHORT
        ).show();
    }

    private TextView text(String value, float size) {

        TextView t =
                new TextView(MainActivity.this);

        t.setText(value);
        t.setTextSize(size);
        t.setTextColor(Color.DKGRAY);
        t.setGravity(Gravity.CENTER_VERTICAL);

        t.setPadding(
                20,
                18,
                20,
                18
        );

        return t;
    }

    private Button button(String title) {

        Button b =
                new Button(MainActivity.this);

        b.setText(title);
        b.setTextSize(fontSize);
        b.setTextColor(Color.WHITE);
        b.setAllCaps(false);
        b.setGravity(Gravity.CENTER);

        b.setPadding(
                18,
                16,
                18,
                16
        );

        b.setBackgroundColor(blue);

        LinearLayout.LayoutParams p =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        p.setMargins(
                12,
                12,
                12,
                12
        );

        b.setLayoutParams(p);

        return b;
    }

    private EditText edit(String hint) {

        EditText e =
                new EditText(MainActivity.this);

        e.setHint(hint);
        e.setTextSize(fontSize);

        e.setPadding(
                20,
                16,
                20,
                16
        );

        LinearLayout.LayoutParams p =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        p.setMargins(
                12,
                10,
                12,
                10
        );

        e.setLayoutParams(p);

        return e;
    }

    private void setupRoot() {

        root =
                new LinearLayout(MainActivity.this);

        root.setOrientation(
                LinearLayout.VERTICAL
        );

        root.setBackgroundColor(light);

        setContentView(root);
    }

    private LinearLayout createContent() {

        LinearLayout box =
                new LinearLayout(MainActivity.this);

        box.setOrientation(
                LinearLayout.VERTICAL
        );

        box.setPadding(
                10,
                10,
                10,
                25
        );

        ScrollView scroll =
                new ScrollView(MainActivity.this);

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

        TextView t =
                text(
                        title,
                        fontSize + 5
                );

        t.setTextColor(Color.WHITE);

        t.setTypeface(
                Typeface.DEFAULT,
                Typeface.BOLD
        );

        t.setGravity(Gravity.CENTER);

        t.setBackgroundColor(darkBlue);

        t.setPadding(
                10,
                24,
                10,
                24
        );

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

        Button back =
                button("← بازگشت");

        back.setBackgroundColor(gray);

        back.setOnClickListener(
                new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        onBackPressed();
                    }
                }
        );

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

        TextView t =
                text(
                        s,
                        fontSize + 2
                );

        t.setTypeface(
                Typeface.DEFAULT,
                Typeface.BOLD
        );

        t.setTextColor(darkBlue);

        t.setPadding(
                18,
                25,
                18,
                15
        );

        content.addView(t);
    }

    // =========================================================
    // ابزارهای مبلغ
    // =========================================================

    private String convertPersianDigits(String value) {

        if (value == null) {
            return "";
        }

        return value
                .replace('۰', '0')
                .replace('۱', '1')
                .replace('۲', '2')
                .replace('۳', '3')
                .replace('۴', '4')
                .replace('۵', '5')
                .replace('۶', '6')
                .replace('۷', '7')
                .replace('۸', '8')
                .replace('۹', '9')
                .replace("٬", "")
                .replace(",", "")
                .replace("،", "")
                .replace(" ", "");
    }

    private long parseMoney(String value)
            throws NumberFormatException {

        String clean =
                convertPersianDigits(value);

        if (clean.length() == 0) {
            throw new NumberFormatException();
        }

        return Long.parseLong(clean);
    }

    private String formatNumber(long value) {

        String s =
                String.valueOf(value);

        boolean negative =
                s.startsWith("-");

        if (negative) {
            s = s.substring(1);
        }

        StringBuilder result =
                new StringBuilder();

        int count = 0;

        for (int i = s.length() - 1;
             i >= 0;
             i--) {

            result.insert(
                    0,
                    s.charAt(i)
            );

            count++;

            if (count == 3 && i > 0) {

                result.insert(
                        0,
                        ','
                );

                count = 0;
            }
        }

        if (negative) {
            result.insert(0, "-");
        }

        return result.toString();
    }

    private String formatMoney(long value) {

        return formatNumber(value) +
                " ریال";
    }

    private void setupMoneyEditText(
            final EditText amount) {

        amount.setInputType(
                InputType.TYPE_CLASS_NUMBER
        );

        amount.addTextChangedListener(
                new TextWatcher() {

                    private boolean editing = false;

                    @Override
                    public void beforeTextChanged(
                            CharSequence s,
                            int start,
                            int count,
                            int after) {
                    }

                    @Override
                    public void onTextChanged(
                            CharSequence s,
                            int start,
                            int before,
                            int count) {
                    }

                    @Override
                    public void afterTextChanged(
                            Editable s) {

                        if (editing) {
                            return;
                        }

                        String raw =
                                convertPersianDigits(
                                        s.toString()
                                );

                        if (raw.length() == 0) {
                            return;
                        }

                        try {

                            long value =
                                    Long.parseLong(raw);

                            String formatted =
                                    formatNumber(value);

                            if (!formatted.equals(
                                    s.toString()
                            )) {

                                editing = true;

                                amount.setText(
                                        formatted
                                );

                                amount.setSelection(
                                        formatted.length()
                                );

                                editing = false;
                            }

                        } catch (Exception ignored) {
                        }
                    }
                }
        );
    }

    // =========================================================
    // ورود
    // =========================================================

    private void showLogin() {

        setupRoot();

        LinearLayout box =
                new LinearLayout(MainActivity.this);

        box.setOrientation(
                LinearLayout.VERTICAL
        );

        box.setGravity(
                Gravity.CENTER_HORIZONTAL
        );

        box.setPadding(
                30,
                50,
                30,
                30
        );

        root.addView(
                box,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        TextView logo =
                text(
                        "سیستم حسابداری مجموعه\nمدرسه القرآن شهرضا",
                        fontSize + 7
                );

        logo.setTextColor(darkBlue);

        logo.setTypeface(
                Typeface.DEFAULT,
                Typeface.BOLD
        );

        logo.setGravity(Gravity.CENTER);

        logo.setPadding(
                10,
                20,
                10,
                35
        );

        box.addView(logo);

        final EditText username =
                edit("نام کاربری");

        final EditText password =
                edit("رمز عبور");

        password.setInputType(
                InputType.TYPE_CLASS_TEXT |
                        InputType.TYPE_TEXT_VARIATION_PASSWORD
        );

        box.addView(username);
        box.addView(password);

        Button login =
                button("ورود به سیستم");

        login.setBackgroundColor(green);

        box.addView(login);

        TextView info =
                text(
                        "لطفاً نام کاربری و رمز عبور خود را وارد کنید.",
                        fontSize - 1
                );

        info.setGravity(Gravity.CENTER);
        info.setTextColor(gray);

        box.addView(info);

        login.setOnClickListener(
                new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {

                        String u =
                                username
                                        .getText()
                                        .toString()
                                        .trim();

                        String p =
                                password
                                        .getText()
                                        .toString();

                        if (u.length() == 0 ||
                                p.length() == 0) {

                            showToast(
                                    "نام کاربری و رمز عبور را وارد کنید."
                            );

                            return;
                        }

                        loginUser(u, p);
                    }
                }
        );
    }

    private void loginUser(
            String username,
            String password) {

        SQLiteDatabase d =
                db.getReadableDatabase();

        Cursor c =
                d.rawQuery(
                        "SELECT id,name,school_id,role,active " +
                                "FROM managers " +
                                "WHERE username=? AND password=? LIMIT 1",
                        new String[]{
                                username,
                                password
                        }
                );

        if (!c.moveToFirst()) {

            c.close();

            showToast(
                    "نام کاربری یا رمز عبور اشتباه است."
            );

            return;
        }

        int active =
                c.getInt(4);

        if (active == 0) {

            c.close();

            showToast(
                    "این حساب غیرفعال است."
            );

            return;
        }

        currentUser =
                username;

        currentName =
                c.getString(1);

        currentSchoolId =
                c.getInt(2);

        currentRole =
                c.getString(3);

        c.close();

        isLoggedIn = true;

        showDashboard();
    }

    // =========================================================
    // داشبورد
    // =========================================================

    private void showDashboard() {

        setupRoot();

        String schoolName =
                getSchoolName(
                        currentSchoolId
                );

        title(
                "سیستم حسابداری مجموعه مدرسه القرآن شهرضا"
        );

        LinearLayout header =
                new LinearLayout(MainActivity.this);

        header.setOrientation(
                LinearLayout.VERTICAL
        );

        header.setPadding(
                15,
                15,
                15,
                15
        );

        header.setBackgroundColor(
                Color.WHITE
        );

        TextView user =
                text(
                        "کاربر: " +
                                currentName,
                        fontSize
                );

        user.setTypeface(
                Typeface.DEFAULT,
                Typeface.BOLD
        );

        header.addView(user);

        TextView school =
                text(
                        currentRole.equals("admin")
                                ? "سطح دسترسی: مدیر کل سیستم"
                                : "مرکز: " + schoolName,
                        fontSize
                );

        header.addView(school);

        root.addView(header);

        createContent();

        if (currentRole.equals("admin")) {

            addSectionTitle(
                    "مدیریت کل سیستم"
            );

            Button schools =
                    button("🏫 مدیریت مراکز");

            Button managers =
                    button("👤 مدیریت مدیران");

            Button allTransactions =
                    button("📊 همه تراکنش‌ها");

            content.addView(schools);
            content.addView(managers);
            content.addView(allTransactions);

            schools.setOnClickListener(
                    new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {
                            showSchools();
                        }
                    }
            );

            managers.setOnClickListener(
                    new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {
                            showManagers();
                        }
                    }
            );

            allTransactions.setOnClickListener(
                    new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {
                            showTransactions(0);
                        }
                    }
            );
        }

        addSectionTitle(
                "عملیات حسابداری"
        );

        Button income =
                button("💰 ثبت درآمد / شهریه");

        Button expense =
                button("💸 ثبت هزینه");

        Button transactions =
                button("📋 دفتر تراکنش‌ها");

        Button students =
                button("👨‍🎓 دانش‌آموزان");

        Button reconciliation =
                button("✅ مغایرت‌گیری و تطبیق");

        Button reports =
                button("📈 گزارش‌ها");

        content.addView(income);
        content.addView(expense);
        content.addView(transactions);
        content.addView(students);
        content.addView(reconciliation);
        content.addView(reports);

        income.setOnClickListener(
                new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        showTransactionForm(true);
                    }
                }
        );

        expense.setOnClickListener(
                new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        showTransactionForm(false);
                    }
                }
        );

        transactions.setOnClickListener(
                new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        showTransactions(
                                currentSchoolId
                        );
                    }
                }
        );

        students.setOnClickListener(
                new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        showStudents();
                    }
                }
        );

        reconciliation.setOnClickListener(
                new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        showReconciliation();
                    }
                }
        );

        reports.setOnClickListener(
                new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        showReports();
                    }
                }
        );

        addSectionTitle("تنظیمات");

        Button settings =
                button("⚙ تنظیمات");

        Button logout =
                button("🚪 خروج از حساب");

        content.addView(settings);
        content.addView(logout);

        settings.setOnClickListener(
                new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        showSettings();
                    }
                }
        );

        logout.setOnClickListener(
                new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {

                        currentUser = "";
                        currentName = "";
                        currentRole = "manager";
                        currentSchoolId = 0;

                        isLoggedIn = false;

                        showLogin();
                    }
                }
        );
    }

    // =========================================================
    // مراکز
    // =========================================================

    private void showSchools() {

        setupRoot();
        title("مدیریت مراکز");
        addBackButton();
        createContent();

        SQLiteDatabase d =
                db.getReadableDatabase();

        Cursor c =
                d.rawQuery(
                        "SELECT id,name,active " +
                                "FROM schools ORDER BY id",
                        null
                );

        while (c.moveToNext()) {

            final int id =
                    c.getInt(0);

            String name =
                    c.getString(1);

            int active =
                    c.getInt(2);

            LinearLayout row =
                    new LinearLayout(MainActivity.this);

            row.setOrientation(
                    LinearLayout.VERTICAL
            );

            row.setPadding(
                    15,
                    15,
                    15,
                    15
            );

            row.setBackgroundColor(
                    Color.WHITE
            );

            TextView t =
                    text(
                            id + " - " +
                                    name +
                                    "\nوضعیت: " +
                                    (
                                            active == 1
                                                    ? "فعال"
                                                    : "غیرفعال"
                                    ),
                            fontSize
                    );

            row.addView(t);

            Button edit =
                    button("ویرایش مرکز");

            edit.setOnClickListener(
                    new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {
                            editSchool(id);
                        }
                    }
            );

            row.addView(edit);
            content.addView(row);
        }

        c.close();

        Button add =
                button("➕ افزودن مرکز جدید");

        content.addView(add);

        add.setOnClickListener(
                new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        addSchoolDialog();
                    }
                }
        );
    }

    private void addSchoolDialog() {

        final EditText name =
                edit("نام مرکز");

        new AlertDialog.Builder(MainActivity.this)
                .setTitle("افزودن مرکز")
                .setView(name)
                .setPositiveButton(
                        "ثبت",
                        (dialog, which) -> {

                            String n =
                                    name.getText()
                                            .toString()
                                            .trim();

                            if (n.length() == 0) {

                                showToast(
                                        "نام مرکز را وارد کنید."
                                );

                                return;
                            }

                            ContentValues v =
                                    new ContentValues();

                            v.put("name", n);
                            v.put("type", "");
                            v.put("code", "");
                            v.put("active", 1);

                            db.getWritableDatabase()
                                    .insert(
                                            "schools",
                                            null,
                                            v
                                    );

                            showSchools();
                        }
                )
                .setNegativeButton(
                        "انصراف",
                        null
                )
                .show();
    }

    private void editSchool(final int id) {

        SQLiteDatabase d =
                db.getReadableDatabase();

        Cursor c =
                d.rawQuery(
                        "SELECT name,active " +
                                "FROM schools WHERE id=?",
                        new String[]{
                                String.valueOf(id)
                        }
                );

        if (!c.moveToFirst()) {

            c.close();
            return;
        }

        final EditText name =
                edit("نام مرکز");

        name.setText(
                c.getString(0)
        );

        final int active =
                c.getInt(1);

        c.close();

        new AlertDialog.Builder(MainActivity.this)
                .setTitle("ویرایش مرکز")
                .setView(name)
                .setPositiveButton(
                        "ذخیره",
                        (dialog, which) -> {

                            ContentValues v =
                                    new ContentValues();

                            v.put(
                                    "name",
                                    name.getText()
                                            .toString()
                                            .trim()
                            );

                            db.getWritableDatabase()
                                    .update(
                                            "schools",
                                            v,
                                            "id=?",
                                            new String[]{
                                                    String.valueOf(id)
                                            }
                                    );

                            showSchools();
                        }
                )
                .setNeutralButton(
                        active == 1
                                ? "غیرفعال کردن"
                                : "فعال کردن",
                        (dialog, which) -> {

                            ContentValues v =
                                    new ContentValues();

                            v.put(
                                    "active",
                                    active == 1
                                            ? 0
                                            : 1
                            );

                            db.getWritableDatabase()
                                    .update(
                                            "schools",
                                            v,
                                            "id=?",
                                            new String[]{
                                                    String.valueOf(id)
                                            }
                                    );

                            showSchools();
                        }
                )
                .setNegativeButton(
                        "انصراف",
                        null
                )
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

        SQLiteDatabase d =
                db.getReadableDatabase();

        Cursor c =
                d.rawQuery(
                        "SELECT m.id,m.name,m.username," +
                                "m.school_id,m.role,m.active," +
                                "COALESCE(s.name,'همه مراکز') " +
                                "FROM managers m " +
                                "LEFT JOIN schools s " +
                                "ON s.id=m.school_id " +
                                "ORDER BY m.id",
                        null
                );

        while (c.moveToNext()) {

            final int id =
                    c.getInt(0);

            String name =
                    c.getString(1);

            String username =
                    c.getString(2);

            int schoolId =
                    c.getInt(3);

            String role =
                    c.getString(4);

            int active =
                    c.getInt(5);

            String schoolName =
                    c.getString(6);

            LinearLayout row =
                    new LinearLayout(MainActivity.this);

            row.setOrientation(
                    LinearLayout.VERTICAL
            );

            row.setPadding(
                    15,
                    15,
                    15,
                    15
            );

            row.setBackgroundColor(
                    Color.WHITE
            );

            String info =
                    "نام: " + name +
                            "\nنام کاربری: " +
                            username +
                            "\nمرکز: " +
                            schoolName +
                            "\nنقش: " +
                            (
                                    role.equals("admin")
                                            ? "مدیر کل"
                                            : "مدیر مرکز"
                            ) +
                            "\nوضعیت: " +
                            (
                                    active == 1
                                            ? "فعال"
                                            : "غیرفعال"
                            );

            row.addView(
                    text(
                            info,
                            fontSize
                    )
            );

            Button edit =
                    button("ویرایش مدیر");

            edit.setOnClickListener(
                    new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {
                            editManager(id);
                        }
                    }
            );

            row.addView(edit);

            content.addView(row);
        }

        c.close();

        Button add =
                button("➕ افزودن مدیر");

        content.addView(add);

        add.setOnClickListener(
                new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        addManagerDialog();
                    }
                }
        );
    }

    private void addManagerDialog() {

        LinearLayout box =
                new LinearLayout(MainActivity.this);

        box.setOrientation(
                LinearLayout.VERTICAL
        );

        final EditText name =
                edit("نام و نام خانوادگی");

        final EditText username =
                edit("نام کاربری");

        final EditText password =
                edit("رمز عبور");

        box.addView(name);
        box.addView(username);
        box.addView(password);

        TextView label =
                text(
                        "مرکز",
                        fontSize
                );

        box.addView(label);

        final Spinner schoolSpinner =
                new Spinner(MainActivity.this);

        final ArrayList<String> schoolNames =
                new ArrayList<>();

        final ArrayList<Integer> schoolIds =
                new ArrayList<>();

        schoolNames.add(
                "مدیر کل سیستم"
        );

        schoolIds.add(0);

        Cursor c =
                db.getReadableDatabase()
                        .rawQuery(
                                "SELECT id,name " +
                                        "FROM schools ORDER BY id",
                                null
                        );

        while (c.moveToNext()) {

            schoolIds.add(
                    c.getInt(0)
            );

            schoolNames.add(
                    c.getString(1)
            );
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
                .setPositiveButton(
                        "ثبت",
                        (dialog, which) -> {

                            String n =
                                    name.getText()
                                            .toString()
                                            .trim();

                            String u =
                                    username.getText()
                                            .toString()
                                            .trim();

                            String p =
                                    password.getText()
                                            .toString();

                            if (n.length() == 0 ||
                                    u.length() == 0 ||
                                    p.length() == 0) {

                                showToast(
                                        "تمام اطلاعات را وارد کنید."
                                );

                                return;
                            }

                            int schoolId =
                                    schoolIds.get(
                                            schoolSpinner
                                                    .getSelectedItemPosition()
                                    );

                            ContentValues v =
                                    new ContentValues();

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
                                    db.getWritableDatabase()
                                            .insert(
                                                    "managers",
                                                    null,
                                                    v
                                            );

                            if (result == -1) {

                                showToast(
                                        "نام کاربری تکراری است."
                                );

                            } else {

                                showManagers();
                            }
                        }
                )
                .setNegativeButton(
                        "انصراف",
                        null
                )
                .show();
    }

    private void editManager(final int id) {

        SQLiteDatabase d =
                db.getReadableDatabase();

        Cursor c =
                d.rawQuery(
                        "SELECT name,username,password," +
                                "school_id,role,active " +
                                "FROM managers WHERE id=?",
                        new String[]{
                                String.valueOf(id)
                        }
                );

        if (!c.moveToFirst()) {

            c.close();
            return;
        }

        final EditText name =
                edit("نام");

        final EditText username =
                edit("نام کاربری");

        final EditText password =
                edit("رمز عبور");

        name.setText(
                c.getString(0)
        );

        username.setText(
                c.getString(1)
        );

        password.setText(
                c.getString(2)
        );

        final int oldSchoolId =
                c.getInt(3);

        final int oldActive =
                c.getInt(5);

        c.close();

        LinearLayout box =
                new LinearLayout(MainActivity.this);

        box.setOrientation(
                LinearLayout.VERTICAL
        );

        box.addView(name);
        box.addView(username);
        box.addView(password);

        final Spinner schoolSpinner =
                new Spinner(MainActivity.this);

        final ArrayList<String> schoolNames =
                new ArrayList<>();

        final ArrayList<Integer> schoolIds =
                new ArrayList<>();

        schoolNames.add(
                "مدیر کل سیستم"
        );

        schoolIds.add(0);

        c =
                d.rawQuery(
                        "SELECT id,name " +
                                "FROM schools ORDER BY id",
                        null
                );

        while (c.moveToNext()) {

            schoolIds.add(
                    c.getInt(0)
            );

            schoolNames.add(
                    c.getString(1)
            );
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

        for (int i = 0;
             i < schoolIds.size();
             i++) {

            if (schoolIds.get(i) ==
                    oldSchoolId) {

                position = i;
                break;
            }
        }

        schoolSpinner.setSelection(
                position
        );

        box.addView(schoolSpinner);

        new AlertDialog.Builder(MainActivity.this)
                .setTitle("ویرایش مدیر")
                .setView(box)
                .setPositiveButton(
                        "ذخیره",
                        (dialog, which) -> {

                            int schoolId =
                                    schoolIds.get(
                                            schoolSpinner
                                                    .getSelectedItemPosition()
                                    );

                            ContentValues v =
                                    new ContentValues();

                            v.put(
                                    "name",
                                    name.getText()
                                            .toString()
                                            .trim()
                            );

                            v.put(
                                    "username",
                                    username.getText()
                                            .toString()
                                            .trim()
                            );

                            v.put(
                                    "password",
                                    password.getText()
                                            .toString()
                            );

                            v.put(
                                    "school_id",
                                    schoolId
                            );

                            v.put(
                                    "role",
                                    schoolId == 0
                                            ? "admin"
                                            : "manager"
                            );

                            db.getWritableDatabase()
                                    .update(
                                            "managers",
                                            v,
                                            "id=?",
                                            new String[]{
                                                    String.valueOf(id)
                                            }
                                    );

                            showManagers();
                        }
                )
                .setNeutralButton(
                        oldActive == 1
                                ? "غیرفعال کردن"
                                : "فعال کردن",
                        (dialog, which) -> {

                            ContentValues v =
                                    new ContentValues();

                            v.put(
                                    "active",
                                    oldActive == 1
                                            ? 0
                                            : 1
                            );

                            db.getWritableDatabase()
                                    .update(
                                            "managers",
                                            v,
                                            "id=?",
                                            new String[]{
                                                    String.valueOf(id)
                                            }
                                    );

                            showManagers();
                        }
                )
                .setNegativeButton(
                        "انصراف",
                        null
                )
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

        Button add =
                button("➕ افزودن دانش‌آموز");

        content.addView(add);

        add.setOnClickListener(
                new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        addStudentDialog();
                    }
                }
        );

        final EditText search =
                edit(
                        "جستجوی نام یا کد دانش‌آموز"
                );

        content.addView(search);

        Button searchButton =
                button("🔎 جستجو");

        content.addView(searchButton);

        final LinearLayout results =
                new LinearLayout(MainActivity.this);

        results.setOrientation(
                LinearLayout.VERTICAL
        );

        content.addView(results);

        searchButton.setOnClickListener(
                new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {

                        searchStudents(
                                search,
                                results
                        );
                    }
                }
        );
    }

    private void searchStudents(
            EditText search,
            LinearLayout results) {

        results.removeAllViews();

        String q =
                search.getText()
                        .toString()
                        .trim();

        SQLiteDatabase d =
                db.getReadableDatabase();

        String sql;
        String[] args;

        if (currentRole.equals("admin")) {

            sql =
                    "SELECT id,name,code,grade,phone " +
                            "FROM students " +
                            "WHERE name LIKE ? " +
                            "OR code LIKE ? " +
                            "ORDER BY name";

            args =
                    new String[]{
                            "%" + q + "%",
                            "%" + q + "%"
                    };

        } else {

            sql =
                    "SELECT id,name,code,grade,phone " +
                            "FROM students " +
                            "WHERE school_id=? " +
                            "AND (name LIKE ? " +
                            "OR code LIKE ?) " +
                            "ORDER BY name";

            args =
                    new String[]{
                            String.valueOf(
                                    currentSchoolId
                            ),
                            "%" + q + "%",
                            "%" + q + "%"
                    };
        }

        Cursor c =
                d.rawQuery(
                        sql,
                        args
                );

        int count = 0;

        while (c.moveToNext()) {

            count++;

            final int id =
                    c.getInt(0);

            String info =
                    "نام: " +
                            c.getString(1) +
                            "\nکد: " +
                            c.getString(2) +
                            "\nپایه: " +
                            c.getString(3) +
                            "\nتلفن: " +
                            c.getString(4);

            TextView studentText =
                    text(
                            info,
                            fontSize
                    );

            studentText.setBackgroundColor(
                    Color.WHITE
            );

            results.addView(
                    studentText
            );

            Button edit =
                    button(
                            "ویرایش دانش‌آموز"
                    );

            edit.setOnClickListener(
                    new View.OnClickListener() {
                        @Override
                        public void onClick(
                                View v) {

                            editStudent(id);
                        }
                    }
            );

            results.addView(edit);
        }

        c.close();

        if (count == 0) {

            results.addView(
                    text(
                            "دانش‌آموزی پیدا نشد.",
                            fontSize
                    )
            );
        }
    }

    private void addStudentDialog() {

        LinearLayout box =
                new LinearLayout(MainActivity.this);

        box.setOrientation(
                LinearLayout.VERTICAL
        );

        final EditText name =
                edit("نام دانش‌آموز");

        final EditText code =
                edit("کد دانش‌آموز");

        final EditText grade =
                edit("پایه");

        final EditText phone =
                edit("شماره تماس");

        box.addView(name);
        box.addView(code);
        box.addView(grade);
        box.addView(phone);

        new AlertDialog.Builder(MainActivity.this)
                .setTitle("افزودن دانش‌آموز")
                .setView(box)
                .setPositiveButton(
                        "ثبت",
                        (dialog, which) -> {

                            String studentName =
                                    name.getText()
                                            .toString()
                                            .trim();

                            if (studentName.length() == 0) {

                                showToast(
                                        "نام دانش‌آموز را وارد کنید."
                                );

                                return;
                            }

                            ContentValues v =
                                    new ContentValues();

                            v.put(
                                    "name",
                                    studentName
                            );

                            v.put(
                                    "code",
                                    code.getText()
                                            .toString()
                                            .trim()
                            );

                            v.put(
                                    "grade",
                                    grade.getText()
                                            .toString()
                                            .trim()
                            );

                            v.put(
                                    "phone",
                                    phone.getText()
                                            .toString()
                                            .trim()
                            );

                            v.put(
                                    "school_id",
                                    currentSchoolId
                            );

                            long result =
                                    db.getWritableDatabase()
                                            .insert(
                                                    "students",
                                                    null,
                                                    v
                                            );

                            if (result == -1) {

                                showToast(
                                        "ثبت دانش‌آموز انجام نشد."
                                );

                            } else {

                                showToast(
                                        "دانش‌آموز با موفقیت ثبت شد."
                                );

                                showStudents();
                            }
                        }
                )
                .setNegativeButton(
                        "انصراف",
                        null
                )
                .show();
    }

    private void editStudent(final int id) {

        SQLiteDatabase d =
                db.getReadableDatabase();

        Cursor c =
                d.rawQuery(
                        "SELECT name,code,grade,phone " +
                                "FROM students WHERE id=?",
                        new String[]{
                                String.valueOf(id)
                        }
                );

        if (!c.moveToFirst()) {

            c.close();
            return;
        }

        final EditText name =
                edit("نام");

        final EditText code =
                edit("کد");

        final EditText grade =
                edit("پایه");

        final EditText phone =
                edit("تلفن");

        name.setText(c.getString(0));
        code.setText(c.getString(1));
        grade.setText(c.getString(2));
        phone.setText(c.getString(3));

        c.close();

        LinearLayout box =
                new LinearLayout(MainActivity.this);

        box.setOrientation(
                LinearLayout.VERTICAL
        );

        box.addView(name);
        box.addView(code);
        box.addView(grade);
        box.addView(phone);

        new AlertDialog.Builder(MainActivity.this)
                .setTitle("ویرایش دانش‌آموز")
                .setView(box)
                .setPositiveButton(
                        "ذخیره",
                        (dialog, which) -> {

                            ContentValues v =
                                    new ContentValues();

                            v.put(
                                    "name",
                                    name.getText()
                                            .toString()
                                            .trim()
                            );

                            v.put(
                                    "code",
                                    code.getText()
                                            .toString()
                                            .trim()
                            );

                            v.put(
                                    "grade",
                                    grade.getText()
                                            .toString()
                                            .trim()
                            );

                            v.put(
                                    "phone",
                                    phone.getText()
                                            .toString()
                                            .trim()
                            );

                            db.getWritableDatabase()
                                    .update(
                                            "students",
                                            v,
                                            "id=?",
                                            new String[]{
                                                    String.valueOf(id)
                                            }
                                    );

                            showStudents();
                        }
                )
                .setNegativeButton(
                        "انصراف",
                        null
                )
                .show();
    }

    // =========================================================
    // حساب‌های بانکی
    // =========================================================

    private ArrayList<String> getBankAccounts() {

        ArrayList<String> accounts =
                new ArrayList<>();

        SQLiteDatabase d =
                db.getReadableDatabase();

        Cursor columns = null;
        Cursor rows = null;

        try {

            columns =
                    d.rawQuery(
                            "PRAGMA table_info(accounts)",
                            null
                    );

            ArrayList<String> columnNames =
                    new ArrayList<>();

            while (columns.moveToNext()) {

                String column =
                        columns.getString(1);

                if (!column.equalsIgnoreCase("id")) {

                    columnNames.add(column);
                }
            }

            if (columnNames.size() == 0) {

                accounts.add(
                        "حسابی ثبت نشده"
                );

                return accounts;
            }

            StringBuilder query =
                    new StringBuilder(
                            "SELECT * FROM accounts"
                    );

            rows =
                    d.rawQuery(
                            query.toString(),
                            null
                    );

            while (rows.moveToNext()) {

                StringBuilder display =
                        new StringBuilder();

                String[] names =
                        rows.getColumnNames();

                for (int i = 0;
                     i < names.length;
                     i++) {

                    if (names[i]
                            .equalsIgnoreCase("id")) {

                        continue;
                    }

                    String value =
                            rows.getString(i);

                    if (value == null ||
                            value.trim().length() == 0) {

                        continue;
                    }

                    if (display.length() > 0) {

                        display.append(" - ");
                    }

                    display.append(value.trim());
                }

                if (display.length() > 0) {

                    accounts.add(
                            display.toString()
                    );
                }
            }

        } catch (Exception e) {

            accounts.clear();

        } finally {

            if (columns != null) {
                columns.close();
            }

            if (rows != null) {
                rows.close();
            }
        }

        if (accounts.size() == 0) {

            accounts.add(
                    "حسابی ثبت نشده"
            );
        }

        return accounts;
    }

    // =========================================================
    // ثبت درآمد / هزینه
    // =========================================================

    private void showTransactionForm(
            boolean income) {

        setupRoot();

        title(
                income
                        ? "ثبت درآمد / شهریه"
                        : "ثبت هزینه"
        );

        addBackButton();

        createContent();

        // -----------------------------------------------------
        // مبلغ
        // -----------------------------------------------------

        final EditText amount =
                edit("مبلغ به ریال");

        setupMoneyEditText(amount);

        content.addView(amount);

        TextView amountInfo =
                text(
                        "مبلغ به ریال وارد شود؛ مثال: 12,500,000 ریال",
                        fontSize - 1
                );

        amountInfo.setTextColor(gray);

        content.addView(amountInfo);

        // -----------------------------------------------------
        // حساب بانکی
        // -----------------------------------------------------

        addSectionTitle(
                income
                        ? "حساب بانکی دریافت‌کننده"
                        : "حساب بانکی"
        );

        final Spinner accountSpinner =
                new Spinner(MainActivity.this);

        ArrayList<String> bankAccounts =
                getBankAccounts();

        ArrayAdapter<String> accountAdapter =
                new ArrayAdapter<String>(
                        MainActivity.this,
                        android.R.layout.simple_spinner_item,
                        bankAccounts
                );

        accountAdapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item
        );

        accountSpinner.setAdapter(
                accountAdapter
        );

        content.addView(
                accountSpinner
        );

        // -----------------------------------------------------
        // درآمد
        // -----------------------------------------------------

        if (income) {

            addSectionTitle(
                    "دانش‌آموز"
            );

            final Button studentButton =
                    button(
                            "👨‍🎓 جستجو و انتخاب دانش‌آموز"
                    );

            studentButton.setBackgroundColor(
                    blue
            );

            content.addView(
                    studentButton
            );

            final TextView selectedStudent =
                    text(
                            "دانش‌آموزی انتخاب نشده است.",
                            fontSize
                    );

            selectedStudent.setTextColor(
                    gray
            );

            selectedStudent.setBackgroundColor(
                    Color.WHITE
            );

            content.addView(
                    selectedStudent
            );

            final int[] selectedStudentId =
                    new int[]{0};

            final String[] selectedStudentName =
                    new String[]{""};

            studentButton.setOnClickListener(
                    new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {

                            showStudentSelectionDialog(
                                    selectedStudentId,
                                    selectedStudentName,
                                    selectedStudent
                            );
                        }
                    }
            );

            addSectionTitle(
                    "روش پرداخت"
            );

            final Spinner paymentSpinner =
                    createPaymentSpinner();

            content.addView(
                    paymentSpinner
            );

            final EditText tracking =
                    edit(
                            "شماره پیگیری / کد رهگیری"
                    );

            final EditText comment =
                    edit(
                            "شرح تراکنش"
                    );

            content.addView(tracking);
            content.addView(comment);

            Button save =
                    button("💾 ثبت درآمد");

            save.setBackgroundColor(
                    green
            );

            content.addView(save);

            save.setOnClickListener(
                    new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {

                            if (bankAccounts.size() == 0 ||
                                    bankAccounts.get(0)
                                            .equals(
                                                    "حسابی ثبت نشده"
                                            )) {

                                showToast(
                                        "ابتدا اطلاعات حساب‌های بانکی را وارد کنید."
                                );

                                return;
                            }

                            if (selectedStudentId[0] == 0) {

                                showToast(
                                        "لطفاً ابتدا دانش‌آموز را انتخاب کنید."
                                );

                                return;
                            }

                            saveIncomeTransaction(
                                    amount,
                                    accountSpinner,
                                    comment,
                                    tracking,
                                    paymentSpinner,
                                    selectedStudentId[0]
                            );
                        }
                    }
            );

        } else {

            addSectionTitle(
                    "روش پرداخت"
            );

            final Spinner paymentSpinner =
                    createPaymentSpinner();

            content.addView(
                    paymentSpinner
            );

            final EditText tracking =
                    edit(
                            "شماره پیگیری / کد رهگیری"
                    );

            final EditText comment =
                    edit(
                            "شرح تراکنش"
                    );

            content.addView(tracking);
            content.addView(comment);

            Button save =
                    button("💾 ثبت هزینه");

            save.setBackgroundColor(
                    red
            );

            content.addView(save);

            save.setOnClickListener(
                    new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {

                            if (bankAccounts.size() == 0 ||
                                    bankAccounts.get(0)
                                            .equals(
                                                    "حسابی ثبت نشده"
                                            )) {

                                showToast(
                                        "ابتدا اطلاعات حساب‌های بانکی را وارد کنید."
                                );

                                return;
                            }

                            saveExpense(
                                    amount,
                                    accountSpinner,
                                    comment,
                                    tracking,
                                    paymentSpinner
                            );
                        }
                    }
            );
        }
    }

    // =========================================================
    // انتخاب دانش‌آموز با جستجو
    // =========================================================

    private void showStudentSelectionDialog(
            final int[] selectedStudentId,
            final String[] selectedStudentName,
            final TextView selectedStudentView) {

        LinearLayout box =
                new LinearLayout(MainActivity.this);

        box.setOrientation(
                LinearLayout.VERTICAL
        );

        final EditText search =
                edit(
                        "نام یا کد دانش‌آموز را جستجو کنید"
                );

        box.addView(search);

        final LinearLayout results =
                new LinearLayout(MainActivity.this);

        results.setOrientation(
                LinearLayout.VERTICAL
        );

        ScrollView scroll =
                new ScrollView(MainActivity.this);

        scroll.setFillViewport(true);

        scroll.addView(results);

        box.addView(
                scroll,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        dp(350)
                )
        );

        final AlertDialog dialog =
                new AlertDialog.Builder(
                        MainActivity.this
                )
                        .setTitle(
                                "انتخاب دانش‌آموز"
                        )
                        .setView(box)
                        .setNegativeButton(
                                "انصراف",
                                null
                        )
                        .create();

        search.addTextChangedListener(
                new TextWatcher() {

                    @Override
                    public void beforeTextChanged(
                            CharSequence s,
                            int start,
                            int count,
                            int after) {
                    }

                    @Override
                    public void onTextChanged(
                            CharSequence s,
                            int start,
                            int before,
                            int count) {

                        searchStudentsForIncome(
                                s.toString(),
                                results,
                                selectedStudentId,
                                selectedStudentName,
                                selectedStudentView,
                                dialog
                        );
                    }

                    @Override
                    public void afterTextChanged(
                            Editable s) {
                    }
                }
        );

        searchStudentsForIncome(
                "",
                results,
                selectedStudentId,
                selectedStudentName,
                selectedStudentView,
                dialog
        );

        dialog.show();
    }

    private void searchStudentsForIncome(
            String query,
            final LinearLayout results,
            final int[] selectedStudentId,
            final String[] selectedStudentName,
            final TextView selectedStudentView,
            final AlertDialog dialog) {

        results.removeAllViews();

        String q =
                query == null
                        ? ""
                        : query.trim();

        SQLiteDatabase d =
                db.getReadableDatabase();

        String sql;
        String[] args;

        if (currentRole.equals("admin")) {

            sql =
                    "SELECT id,name,code,grade " +
                            "FROM students " +
                            "WHERE name LIKE ? " +
                            "OR code LIKE ? " +
                            "ORDER BY name";

            args =
                    new String[]{
                            "%" + q + "%",
                            "%" + q + "%"
                    };

        } else {

            sql =
                    "SELECT id,name,code,grade " +
                            "FROM students " +
                            "WHERE school_id=? " +
                            "AND (name LIKE ? " +
                            "OR code LIKE ?) " +
                            "ORDER BY name";

            args =
                    new String[]{
                            String.valueOf(
                                    currentSchoolId
                            ),
                            "%" + q + "%",
                            "%" + q + "%"
                    };
        }

        Cursor c =
                d.rawQuery(
                        sql,
                        args
                );

        int count = 0;

        while (c.moveToNext()) {

            count++;

            final int id =
                    c.getInt(0);

            final String name =
                    c.getString(1);

            String code =
                    c.getString(2);

            String grade =
                    c.getString(3);

            Button student =
                    button(
                            name +
                                    "   |   کد: " +
                                    code +
                                    "   |   پایه: " +
                                    grade
                    );

            student.setBackgroundColor(
                    Color.WHITE
            );

            student.setTextColor(
                    darkBlue
            );

            student.setOnClickListener(
                    new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {

                            selectedStudentId[0] =
                                    id;

                            selectedStudentName[0] =
                                    name;

                            selectedStudentView.setText(
                                    "✅ دانش‌آموز انتخاب‌شده: " +
                                            name
                            );

                            selectedStudentView.setTextColor(
                                    green
                            );

                            dialog.dismiss();
                        }
                    }
            );

            results.addView(student);
        }

        c.close();

        if (count == 0) {

            results.addView(
                    text(
                            "دانش‌آموزی پیدا نشد.",
                            fontSize
                    )
            );
        }
    }

    // =========================================================
    // روش پرداخت
    // =========================================================

    private Spinner createPaymentSpinner() {

        Spinner spinner =
                new Spinner(MainActivity.this);

        String[] methods =
                new String[]{
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

    // =========================================================
    // ذخیره درآمد
    // =========================================================

    private void saveIncomeTransaction(
            EditText amount,
            Spinner account,
            EditText comment,
            EditText tracking,
            Spinner payment,
            int studentId) {

        String amountText =
                amount.getText()
                        .toString()
                        .trim();

        if (amountText.length() == 0) {

            showToast(
                    "مبلغ را وارد کنید."
            );

            return;
        }

        long value;

        try {

            value =
                    parseMoney(amountText);

        } catch (Exception e) {

            showToast(
                    "مبلغ معتبر نیست."
            );

            return;
        }

        if (value <= 0) {

            showToast(
                    "مبلغ باید بیشتر از صفر باشد."
            );

            return;
        }

        String accountName =
                account.getSelectedItem()
                        .toString();

        if (accountName.equals(
                "حسابی ثبت نشده"
        )) {

            showToast(
                    "حساب بانکی را انتخاب کنید."
            );

            return;
        }

        String method =
                payment.getSelectedItem()
                        .toString();

        ContentValues v =
                new ContentValues();

        v.put(
                "date",
                new SimpleDateFormat(
                        "yyyy/MM/dd HH:mm",
                        Locale.US
                ).format(new Date())
        );

        v.put(
                "account",
                accountName
        );

        v.put(
                "debit",
                0
        );

        v.put(
                "credit",
                value
        );

        v.put(
                "comment",
                comment.getText()
                        .toString()
                        .trim()
        );

        v.put(
                "kind",
                "income"
        );

        v.put(
                "payment_method",
                method
        );

        v.put(
                "tracking_code",
                tracking.getText()
                        .toString()
                        .trim()
        );

        v.put(
                "student_id",
                studentId
        );

        v.put(
                "school_id",
                currentSchoolId
        );

        v.put(
                "reconciled",
                0
        );

        long result =
                db.getWritableDatabase()
                        .insert(
                                "transactions",
                                null,
                                v
                        );

        if (result == -1) {

            showToast(
                    "ثبت تراکنش انجام نشد."
            );

        } else {

            showToast(
                    "درآمد با موفقیت ثبت شد."
            );

            showDashboard();
        }
    }

    // =========================================================
    // ذخیره هزینه
    // =========================================================

    private void saveExpense(
            EditText amount,
            Spinner account,
            EditText comment,
            EditText tracking,
            Spinner payment) {

        String amountText =
                amount.getText()
                        .toString()
                        .trim();

        if (amountText.length() == 0) {

            showToast(
                    "مبلغ را وارد کنید."
            );

            return;
        }

        long value;

        try {

            value =
                    parseMoney(amountText);

        } catch (Exception e) {

            showToast(
                    "مبلغ معتبر نیست."
            );

            return;
        }

        if (value <= 0) {

            showToast(
                    "مبلغ باید بیشتر از صفر باشد."
            );

            return;
        }

        String accountName =
                account.getSelectedItem()
                        .toString();

        if (accountName.equals(
                "حسابی ثبت نشده"
        )) {

            showToast(
                    "حساب بانکی را انتخاب کنید."
            );

            return;
        }

        ContentValues v =
                new ContentValues();

        v.put(
                "date",
                new SimpleDateFormat(
                        "yyyy/MM/dd HH:mm",
                        Locale.US
                ).format(new Date())
        );

        v.put(
                "account",
                accountName
        );

        v.put(
                "debit",
                value
        );

        v.put(
                "credit",
                0
        );

        v.put(
                "comment",
                comment.getText()
                        .toString()
                        .trim()
        );

        v.put(
                "kind",
                "expense"
        );

        v.put(
                "payment_method",
                payment.getSelectedItem()
                        .toString()
        );

        v.put(
                "tracking_code",
                tracking.getText()
                        .toString()
                        .trim()
        );

        v.put(
                "student_id",
                0
        );

        v.put(
                "school_id",
                currentSchoolId
        );

        v.put(
                "reconciled",
                0
        );

        long result =
                db.getWritableDatabase()
                        .insert(
                                "transactions",
                                null,
                                v
                        );

        if (result == -1) {

            showToast(
                    "ثبت هزینه انجام نشد."
            );

        } else {

            showToast(
                    "هزینه با موفقیت ثبت شد."
            );

            showDashboard();
        }
    }

    // =========================================================
    // تراکنش‌ها
    // =========================================================

    private void showTransactions(
            int schoolFilter) {

        setupRoot();

        title("دفتر تراکنش‌ها");

        addBackButton();

        createContent();

        SQLiteDatabase d =
                db.getReadableDatabase();

        String sql;
        String[] args;

        if (currentRole.equals("admin") &&
                schoolFilter == 0) {

            sql =
                    "SELECT t.id,t.date,t.account," +
                            "t.debit,t.credit,t.comment," +
                            "t.payment_method,t.tracking_code," +
                            "t.reconciled,s.name " +
                            "FROM transactions t " +
                            "LEFT JOIN schools s " +
                            "ON s.id=t.school_id " +
                            "ORDER BY t.id DESC";

            args = null;

        } else {

            int sid =
                    currentRole.equals("admin")
                            ? schoolFilter
                            : currentSchoolId;

            sql =
                    "SELECT t.id,t.date,t.account," +
                            "t.debit,t.credit,t.comment," +
                            "t.payment_method,t.tracking_code," +
                            "t.reconciled,s.name " +
                            "FROM transactions t " +
                            "LEFT JOIN schools s " +
                            "ON s.id=t.school_id " +
                            "WHERE t.school_id=? " +
                            "ORDER BY t.id DESC";

            args =
                    new String[]{
                            String.valueOf(sid)
                    };
        }

        Cursor c =
                d.rawQuery(
                        sql,
                        args
                );

        long totalIncome = 0;
        long totalExpense = 0;

        while (c.moveToNext()) {

            final int id =
                    c.getInt(0);

            long debit =
                    c.getLong(3);

            long credit =
                    c.getLong(4);

            totalIncome += credit;
            totalExpense += debit;

            String reconciled =
                    c.getInt(8) == 1
                            ? "تطبیق شده"
                            : "در انتظار تطبیق";

            String school =
                    c.getString(9);

            String info =
                    "تاریخ: " +
                            c.getString(1) +
                            "\nحساب: " +
                            c.getString(2) +
                            "\nدرآمد: " +
                            formatMoney(credit) +
                            "\nهزینه: " +
                            formatMoney(debit) +
                            "\nروش پرداخت: " +
                            c.getString(6) +
                            "\nپیگیری: " +
                            c.getString(7) +
                            "\nشرح: " +
                            c.getString(5) +
                            "\nمرکز: " +
                            school +
                            "\nوضعیت: " +
                            reconciled;

            TextView t =
                    text(
                            info,
                            fontSize
                    );

            t.setBackgroundColor(
                    Color.WHITE
            );

            content.addView(t);

            final boolean isReconciled =
                    c.getInt(8) == 1;

            Button reconcile =
                    button(
                            isReconciled
                                    ? "لغو تطبیق"
                                    : "تأیید
