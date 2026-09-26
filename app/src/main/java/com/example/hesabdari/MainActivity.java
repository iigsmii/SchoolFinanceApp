package com.example.hesabdari;

import android.app.AlertDialog;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
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

import androidx.appcompat.app.AppCompatActivity;

import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private DB db;

    private int currentUserId = 0;
    private int currentSchoolId = 0;

    private String currentUserName = "";
    private String currentRole = "manager";

    private LinearLayout root;
    private LinearLayout content;

    private final ArrayList<String> pageHistory = new ArrayList<>();

    private int darkBlue = Color.rgb(18, 55, 95);
    private int blue = Color.rgb(35, 110, 180);
    private int green = Color.rgb(38, 130, 80);
    private int red = Color.rgb(190, 55, 55);
    private int orange = Color.rgb(220, 130, 35);
    private int gray = Color.rgb(245, 247, 250);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        db = new DB(this);

        showLogin();
    }

    // =====================================================
    // ابزارهای عمومی
    // =====================================================

    private int fontSize() {
        try {
            return Integer.parseInt(
                    db.getSetting("font_size", "16")
            );
        } catch (Exception e) {
            return 16;
        }
    }

    private TextView text(String value, int size) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextSize(size);
        t.setTextColor(Color.DKGRAY);
        t.setGravity(Gravity.RIGHT | Gravity.CENTER_VERTICAL);
        t.setPadding(20, 15, 20, 15);
        return t;
    }

    private Button button(String title, int color) {
        Button b = new Button(this);
        b.setText(title);
        b.setTextSize(fontSize());
        b.setTextColor(Color.WHITE);
        b.setGravity(Gravity.CENTER);
        b.setBackgroundColor(color);

        LinearLayout.LayoutParams p =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                );

        p.setMargins(8, 7, 8, 7);
        b.setLayoutParams(p);

        return b;
    }

    private EditText edit(String hint) {
        EditText e = new EditText(this);
        e.setHint(hint);
        e.setTextSize(fontSize());
        e.setGravity(Gravity.RIGHT);
        e.setPadding(20, 12, 20, 12);

        e.setLayoutParams(
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                )
        );

        return e;
    }

    private LinearLayout vertical() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(15, 15, 15, 15);
        return l;
    }

    private ScrollView scroll(LinearLayout inside) {
        ScrollView s = new ScrollView(this);
        s.setFillViewport(true);
        s.addView(inside);
        return s;
    }

    private void baseLayout() {

        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);

        setContentView(root);
    }

    private void header(String title) {

        TextView h = new TextView(this);

        h.setText(title);
        h.setTextSize(fontSize() + 3);
        h.setTextColor(Color.WHITE);
        h.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        h.setGravity(Gravity.CENTER);

        h.setPadding(10, 25, 10, 25);
        h.setBackgroundColor(darkBlue);

        root.addView(
                h,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT
                )
        );
    }

    private void addContent(View v) {

        root.addView(
                v,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        0,
                        1
                )
        );
    }

    private void addBackButton() {

        Button b =
                button(
                        "← بازگشت",
                        darkBlue
                );

        b.setOnClickListener(
                v -> goBackPage()
        );

        root.addView(b);
    }

    private void toast(String message) {
        Toast.makeText(
                this,
                message,
                Toast.LENGTH_SHORT
        ).show();
    }

    private String money(long n) {

        return NumberFormat
                .getInstance(new Locale("fa", "IR"))
                .format(n);
    }

    private long number(String s) {

        if (s == null) {
            return 0;
        }

        s = s.replace(",", "")
                .replace("٬", "")
                .replace(" ", "")
                .trim();

        try {
            return Long.parseLong(s);
        } catch (Exception e) {
            return 0;
        }
    }

    private String today() {

        return new SimpleDateFormat(
                "yyyy/MM/dd",
                Locale.US
        ).format(new Date());
    }

    // =====================================================
    // ورود
    // =====================================================

    private void showLogin() {

        pageHistory.clear();

        baseLayout();

        LinearLayout box = vertical();

        TextView title =
                text(
                        "سیستم حسابداری مجموعه مدرسه القرآن شهرضا",
                        fontSize() + 4
                );

        title.setTypeface(
                Typeface.DEFAULT,
                Typeface.BOLD
        );

        title.setGravity(Gravity.CENTER);

        box.addView(title);

        box.addView(
                text(
                        "ورود به سامانه",
                        fontSize() + 2
                )
        );

        EditText username =
                edit("نام کاربری");

        EditText password =
                edit("رمز عبور");

        password.setInputType(
                0x00000081
        );

        box.addView(username);
        box.addView(password);

        Button login =
                button(
                        "ورود",
                        blue
                );

        box.addView(login);

        login.setOnClickListener(v -> {

            String u =
                    username.getText()
                            .toString()
                            .trim();

            String p =
                    password.getText()
                            .toString()
                            .trim();

            if (u.isEmpty() || p.isEmpty()) {

                toast("نام کاربری و رمز عبور را وارد کنید");

                return;
            }

            loginUser(u, p);
        });

        addContent(scroll(box));
    }

    private void loginUser(
            String username,
            String password) {

        SQLiteDatabase d =
                db.getReadableDatabase();

        Cursor c =
                d.rawQuery(
                        "SELECT m.id,m.name,m.school_id," +
                                "COALESCE(m.role,'manager')," +
                                "s.name " +
                                "FROM managers m " +
                                "LEFT JOIN schools s " +
                                "ON m.school_id=s.id " +
                                "WHERE m.username=? " +
                                "AND m.password=? " +
                                "AND m.active=1 " +
                                "LIMIT 1",
                        new String[]{
                                username,
                                password
                        }
                );

        if (c.moveToFirst()) {

            currentUserId =
                    c.getInt(0);

            currentUserName =
                    c.getString(1);

            currentSchoolId =
                    c.getInt(2);

            currentRole =
                    c.getString(3);

            if (currentRole == null) {
                currentRole = "manager";
            }

            c.close();

            showHome();

        } else {

            c.close();

            toast(
                    "نام کاربری یا رمز عبور اشتباه است"
            );
        }
    }

    // =====================================================
    // صفحه اصلی
    // =====================================================

    private void showHome() {

        pageHistory.clear();

        baseLayout();

        header(
                "سیستم حسابداری مجموعه مدرسه القرآن شهرضا"
        );

        LinearLayout box = vertical();

        TextView welcome =
                text(
                        "خوش آمدید " +
                                currentUserName,
                        fontSize() + 2
                );

        welcome.setTypeface(
                Typeface.DEFAULT,
                Typeface.BOLD
        );

        box.addView(welcome);

        if (isAdmin()) {

            Button schools =
                    button(
                            "🏫 مدیریت مراکز",
                            darkBlue
                    );

            box.addView(schools);

            schools.setOnClickListener(
                    v -> go("schools")
            );

            Button managers =
                    button(
                            "👤 مدیریت مدیران",
                            blue
                    );

            box.addView(managers);

            managers.setOnClickListener(
                    v -> go("managers")
            );
        }

        Button students =
                button(
                        "👨‍🎓 دانش‌آموزان",
                        green
                );

        box.addView(students);

        students.setOnClickListener(
                v -> go("students")
        );

        Button tuition =
                button(
                        "💰 ثبت شهریه / درآمد",
                        blue
                );

        box.addView(tuition);

        tuition.setOnClickListener(
                v -> go("tuition")
        );

        Button expenses =
                button(
                        "💸 ثبت هزینه",
                        red
                );

        box.addView(expenses);

        expenses.setOnClickListener(
                v -> go("expenses")
        );

        Button accounts =
                button(
                        "📒 حساب‌ها",
                        orange
                );

        box.addView(accounts);

        accounts.setOnClickListener(
                v -> go("accounts")
        );

        Button report =
                button(
                        "📊 گزارش مالی",
                        darkBlue
                );

        box.addView(report);

        report.setOnClickListener(
                v -> go("report")
        );

        Button reconcile =
                button(
                        "✅ تطبیق تراکنش‌ها",
                        green
                );

        box.addView(reconcile);

        reconcile.setOnClickListener(
                v -> go("reconcile")
        );

        Button settings =
                button(
                        "⚙️ تنظیمات",
                        Color.DKGRAY
                );

        box.addView(settings);

        settings.setOnClickListener(
                v -> go("settings")
        );

        Button logout =
                button(
                        "🚪 خروج از حساب",
                        red
                );

        box.addView(logout);

        logout.setOnClickListener(
                v -> logout()
        );

        addContent(scroll(box));
    }

    private boolean isAdmin() {
        return "admin".equalsIgnoreCase(
                currentRole
        );
    }

    // =====================================================
    // مدیریت صفحات
    // =====================================================

    private void go(String page) {

        pageHistory.add(page);

        openPage(page);
    }

    private void openPage(String page) {

        if ("schools".equals(page)) {
            schools();
        } else if ("managers".equals(page)) {
            managers();
        } else if ("students".equals(page)) {
            students();
        } else if ("tuition".equals(page)) {
            transactionForm(true);
        } else if ("expenses".equals(page)) {
            transactionForm(false);
        } else if ("accounts".equals(page)) {
            accounts();
        } else if ("report".equals(page)) {
            report();
        } else if ("reconcile".equals(page)) {
            reconcile();
        } else if ("settings".equals(page)) {
            settings();
        }
    }

    private void goBackPage() {

        if (pageHistory.size() > 0) {

            pageHistory.remove(
                    pageHistory.size() - 1
            );
        }

        if (pageHistory.size() == 0) {

            showHome();

        } else {

            openPage(
                    pageHistory.get(
                            pageHistory.size() - 1
                    )
            );
        }
    }

    @Override
    public void onBackPressed() {

        if (pageHistory.size() > 0) {

            goBackPage();

        } else {

            super.onBackPressed();
        }
    }

    // =====================================================
    // مراکز
    // =====================================================

    private void schools() {

        baseLayout();

        header("🏫 مدیریت مراکز");

        LinearLayout box = vertical();

        SQLiteDatabase d =
                db.getReadableDatabase();

        Cursor c =
                d.rawQuery(
                        "SELECT id,name,active " +
                                "FROM schools " +
                                "ORDER BY id",
                        null
                );

        while (c.moveToNext()) {

            int id =
                    c.getInt(0);

            String name =
                    c.getString(1);

            int active =
                    c.getInt(2);

            TextView row =
                    text(
                            id +
                                    " - " +
                                    name +
                                    "\nوضعیت: " +
                                    (active == 1 ?
                                            "فعال" :
                                            "غیرفعال"),
                            fontSize()
                    );

            box.addView(row);

            Button edit =
                    button(
                            "ویرایش " + name,
                            blue
                    );

            box.addView(edit);

            edit.setOnClickListener(
                    v -> schoolEditDialog(
                            id,
                            name
                    )
            );
        }

        c.close();

        Button add =
                button(
                        "➕ افزودن مرکز",
                        green
                );

        box.addView(add);

        add.setOnClickListener(
                v -> schoolEditDialog(
                        -1,
                        ""
                )
        );

        addContent(scroll(box));

        addBackButton();
    }

    private void schoolEditDialog(
            int id,
            String oldName) {

        LinearLayout box = vertical();

        EditText name =
                edit("نام مرکز");

        name.setText(oldName);

        box.addView(name);

        new AlertDialog.Builder(this)
                .setTitle(
                        id == -1 ?
                                "افزودن مرکز" :
                                "ویرایش مرکز"
                )
                .setView(box)
                .setPositiveButton(
                        "ذخیره",
                        (dialog, which) -> {

                            String n =
                                    name.getText()
                                            .toString()
                                            .trim();

                            if (n.isEmpty()) {

                                toast(
                                        "نام مرکز را وارد کنید"
                                );

                                return;
                            }

                            SQLiteDatabase d =
                                    db.getWritableDatabase();

                            ContentValues v =
                                    new ContentValues();

                            v.put(
                                    "name",
                                    n
                            );

                            v.put(
                                    "active",
                                    1
                            );

                            if (id == -1) {

                                d.insert(
                                        "schools",
                                        null,
                                        v
                                );

                            } else {

                                d.update(
                                        "schools",
                                        v,
                                        "id=?",
                                        new String[]{
                                                String.valueOf(id)
                                        }
                                );
                            }

                            schools();
                        }
                )
                .setNegativeButton(
                        "انصراف",
                        null
                )
                .show();
    }

    // =====================================================
    // مدیران
    // =====================================================

    private void managers() {

        baseLayout();

        header("👤 مدیریت مدیران");

        LinearLayout box = vertical();

        SQLiteDatabase d =
                db.getReadableDatabase();

        Cursor c =
                d.rawQuery(
                        "SELECT m.id,m.name,m.username," +
                                "m.role,m.school_id," +
                                "COALESCE(s.name,'همه مراکز') " +
                                "FROM managers m " +
                                "LEFT JOIN schools s " +
                                "ON m.school_id=s.id " +
                                "ORDER BY m.id",
                        null
                );

        while (c.moveToNext()) {

            int id =
                    c.getInt(0);

            String name =
                    c.getString(1);

            String username =
                    c.getString(2);

            String role =
                    c.getString(3);

            String school =
                    c.getString(5);

            TextView row =
                    text(
                            "نام: " + name +
                                    "\nنام کاربری: " + username +
                                    "\nنقش: " +
                                    ("admin".equals(role) ?
                                            "مدیر کل" :
                                            "مدیر مرکز") +
                                    "\nمرکز: " + school,
                            fontSize()
                    );

            box.addView(row);

            Button edit =
                    button(
                            "ویرایش",
                            blue
                    );

            box.addView(edit);

            edit.setOnClickListener(
                    v -> managerDialog(id)
            );
        }

        c.close();

        Button add =
                button(
                        "➕ افزودن مدیر",
                        green
                );

        box.addView(add);

        add.setOnClickListener(
                v -> managerDialog(-1)
        );

        addContent(scroll(box));

        addBackButton();
    }

    private void managerDialog(int managerId) {

        LinearLayout box = vertical();

        EditText name =
                edit("نام مدیر");

        EditText username =
                edit("نام کاربری");

        EditText password =
                edit("رمز عبور");

        Spinner role =
                new Spinner(this);

        ArrayList<String> roles =
                new ArrayList<>();

        roles.add("مدیر مرکز");
        roles.add("مدیر کل");

        role.setAdapter(
                new ArrayAdapter<>(
                        this,
                        android.R.layout.simple_spinner_dropdown_item,
                        roles
                )
        );

        Spinner school =
                new Spinner(this);

        ArrayList<String> schoolNames =
                new ArrayList<>();

        ArrayList<Integer> schoolIds =
                new ArrayList<>();

        SQLiteDatabase d =
                db.getReadableDatabase();

        Cursor sc =
                d.rawQuery(
                        "SELECT id,name " +
                                "FROM schools " +
                                "ORDER BY id",
                        null
                );

        while (sc.moveToNext()) {

            schoolIds.add(
                    sc.getInt(0)
            );

            schoolNames.add(
                    sc.getString(1)
            );
        }

        sc.close();

        school.setAdapter(
                new ArrayAdapter<>(
                        this,
                        android.R.layout.simple_spinner_dropdown_item,
                        schoolNames
                )
        );

        box.addView(name);
        box.addView(username);
        box.addView(password);

        box.addView(
                text(
                        "نوع حساب",
                        fontSize()
                )
        );

        box.addView(role);

        box.addView(
                text(
                        "مرکز",
                        fontSize()
                )
        );

        box.addView(school);

        if (managerId != -1) {

            Cursor c =
                    d.rawQuery(
                            "SELECT name,username,password," +
                                    "role,school_id " +
                                    "FROM managers " +
                                    "WHERE id=?",
                            new String[]{
                                    String.valueOf(managerId)
                            }
                    );

            if (c.moveToFirst()) {

                name.setText(
                        c.getString(0)
                );

                username.setText(
                        c.getString(1)
                );

                password.setText(
                        c.getString(2)
                );

                String r =
                        c.getString(3);

                int sid =
                        c.getInt(4);

                if ("admin".equals(r)) {

                    role.setSelection(1);

                } else {

                    role.setSelection(0);
                }

                for (int i = 0;
                     i < schoolIds.size();
                     i++) {

                    if (schoolIds.get(i) == sid) {

                        school.setSelection(i);

                        break;
                    }
                }
            }

            c.close();
        }

        new AlertDialog.Builder(this)
                .setTitle(
                        managerId == -1 ?
                                "افزودن مدیر" :
                                "ویرایش مدیر"
                )
                .setView(box)
                .setPositiveButton(
                        "ذخیره",
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
                                            .toString()
                                            .trim();

                            if (n.isEmpty() ||
                                    u.isEmpty() ||
                                    p.isEmpty()) {

                                toast(
                                        "همه اطلاعات مدیر را وارد کنید"
                                );

                                return;
                            }

                            String r =
                                    role.getSelectedItemPosition() == 1 ?
                                            "admin" :
                                            "manager";

                            int sid = 0;

                            if (r.equals("manager") &&
                                    schoolIds.size() > 0) {

                                sid =
                                        schoolIds.get(
                                                school.getSelectedItemPosition()
                                        );
                            }

                            ContentValues v =
                                    new ContentValues();

                            v.put(
                                    "name",
                                    n
                            );

                            v.put(
                                    "username",
                                    u
                            );

                            v.put(
                                    "password",
                                    p
                            );

                            v.put(
                                    "school_id",
                                    sid
                            );

                            v.put(
                                    "role",
                                    r
                            );

                            v.put(
                                    "active",
                                    1
                            );

                            SQLiteDatabase writable =
                                    db.getWritableDatabase();

                            if (managerId == -1) {

                                writable.insert(
                                        "managers",
                                        null,
                                        v
                                );

                            } else {

                                writable.update(
                                        "managers",
                                        v,
                                        "id=?",
                                        new String[]{
                                                String.valueOf(managerId)
                                        }
                                );
                            }

                            managers();
                        }
                )
                .setNegativeButton(
                        "انصراف",
                        null
                )
                .show();
    }

    // =====================================================
    // دانش‌آموزان
    // =====================================================

    private void students() {

        baseLayout();

        header("👨‍🎓 دانش‌آموزان");

        LinearLayout box = vertical();

        Button add =
                button(
                        "➕ افزودن دانش‌آموز",
                        green
                );

        box.addView(add);

        add.setOnClickListener(
                v -> studentDialog(-1)
        );

        EditText search =
                edit("جستجوی نام یا کد دانش‌آموز");

        box.addView(search);

        Button searchButton =
                button(
                        "🔎 جستجو",
                        blue
                );

        box.addView(searchButton);

        LinearLayout results =
                vertical();

        box.addView(results);

        Runnable load =
                () -> loadStudents(
                        search.getText()
                                .toString()
                                .trim(),
                        results
                );

        searchButton.setOnClickListener(
                v -> load.run()
        );

        load.run();

        addContent(scroll(box));

        addBackButton();
    }

    private void loadStudents(
            String query,
            LinearLayout results) {

        results.removeAllViews();

        SQLiteDatabase d =
                db.getReadableDatabase();

        String sql =
                "SELECT id,name,code,grade,phone " +
                        "FROM students " +
                        "WHERE school_id=? ";

        ArrayList<String> args =
                new ArrayList<>();

        args.add(
                String.valueOf(
                        currentSchoolId
                )
        );

        if (isAdmin()) {

            sql =
                    "SELECT id,name,code,grade,phone " +
                            "FROM students " +
                            "WHERE 1=1 ";
            args.clear();
        }

        if (!query.isEmpty()) {

            sql +=
                    "AND (name LIKE ? OR code LIKE ?) ";

            args.add(
                    "%" + query + "%"
            );

            args.add(
                    "%" + query + "%"
            );
        }

        sql +=
                "ORDER BY id DESC";

        Cursor c =
                d.rawQuery(
                        sql,
                        args.toArray(
                                new String[0]
                        )
                );

        while (c.moveToNext()) {

            int id =
                    c.getInt(0);

            String name =
                    c.getString(1);

            String code =
                    c.getString(2);

            String grade =
                    c.getString(3);

            String phone =
                    c.getString(4);

            TextView row =
                    text(
                            "نام: " + safe(name) +
                                    "\nکد: " + safe(code) +
                                    "\nپایه: " + safe(grade) +
                                    "\nتلفن: " + safe(phone),
                            fontSize()
                    );

            results.addView(row);

            Button edit =
                    button(
                            "ویرایش",
                            blue
                    );

            results.addView(edit);

            edit.setOnClickListener(
                    v -> studentDialog(id)
            );
        }

        c.close();
    }

    private String safe(String s) {

        return s == null ? "" : s;
    }

    private void studentDialog(int studentId) {

        LinearLayout box = vertical();

        EditText name =
                edit("نام و نام خانوادگی");

        EditText code =
                edit("کد دانش‌آموزی");

        EditText grade =
                edit("پایه");

        EditText phone =
                edit("شماره تلفن");

        box.addView(name);
        box.addView(code);
        box.addView(grade);
        box.addView(phone);

        if (studentId != -1) {

            SQLiteDatabase d =
                    db.getReadableDatabase();

            Cursor c =
                    d.rawQuery(
                            "SELECT name,code,grade,phone " +
                                    "FROM students " +
                                    "WHERE id=?",
                            new String[]{
                                    String.valueOf(studentId)
                            }
                    );

            if (c.moveToFirst()) {

                name.setText(c.getString(0));
                code.setText(c.getString(1));
                grade.setText(c.getString(2));
                phone.setText(c.getString(3));
            }

            c.close();
        }

        new AlertDialog.Builder(this)
                .setTitle(
                        studentId == -1 ?
                                "دانش‌آموز جدید" :
                                "ویرایش دانش‌آموز"
                )
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
                            );

                            v.put(
                                    "code",
                                    code.getText()
                                            .toString()
                            );

                            v.put(
                                    "grade",
                                    grade.getText()
                                            .toString()
                            );

                            v.put(
                                    "phone",
                                    phone.getText()
                                            .toString()
                            );

                            v.put(
                                    "school_id",
                                    currentSchoolId
                            );

                            SQLiteDatabase d =
                                    db.getWritableDatabase();

                            if (studentId == -1) {

                                d.insert(
                                        "students",
                                        null,
                                        v
                                );

                            } else {

                                d.update(
                                        "students",
                                        v,
                                        "id=?",
                                        new String[]{
                                                String.valueOf(studentId)
                                        }
                                );
                            }

                            students();
                        }
                )
                .setNegativeButton(
                        "انصراف",
                        null
                )
                .show();
    }

    // =====================================================
    // ثبت درآمد / هزینه
    // =====================================================

    private void transactionForm(
            boolean tuition) {

        baseLayout();

        header(
                tuition ?
                        "💰 ثبت شهریه / درآمد" :
                        "💸 ثبت هزینه"
        );

        LinearLayout box = vertical();

        EditText amount =
                edit("مبلغ");

        EditText tracking =
                edit("کد پیگیری / شماره رسید");

        EditText comment =
                edit("شرح");

        Spinner payment =
                new Spinner(this);

        ArrayList<String> methods =
                new ArrayList<>();

        methods.add("نقدی");
        methods.add("کارت‌به‌کارت");
        methods.add("کارتخوان");
        methods.add("واریز بانکی");
        methods.add("چک");
        methods.add("سایر");

        payment.setAdapter(
                new ArrayAdapter<>(
                        this,
                        android.R.layout.simple_spinner_dropdown_item,
                        methods
                )
        );

        box.addView(
                text(
                        "مبلغ",
                        fontSize()
                )
        );

        box.addView(amount);

        box.addView(
                text(
                        "روش پرداخت",
                        fontSize()
                )
        );

        box.addView(payment);

        box.addView(tracking);
        box.addView(comment);

        Spinner studentSpinner = null;

        if (tuition) {

            studentSpinner =
                    new Spinner(this);

            ArrayList<String> studentNames =
                    new ArrayList<>();

            ArrayList<Integer> studentIds =
                    new ArrayList<>();

            SQLiteDatabase d =
                    db.getReadableDatabase();

            String sql =
                    isAdmin() ?
                            "SELECT id,name FROM students ORDER BY name" :
                            "SELECT id,name FROM students " +
                                    "WHERE school_id=? " +
                                    "ORDER BY name";

            Cursor c;

            if (isAdmin()) {

                c =
                        d.rawQuery(
                                sql,
                                null
                        );

            } else {

                c =
                        d.rawQuery(
                                sql,
                                new String[]{
                                        String.valueOf(
                                                currentSchoolId
                                        )
                                }
                        );
            }

            while (c.moveToNext()) {

                studentIds.add(
                        c.getInt(0)
                );

                studentNames.add(
                        c.getString(1)
                );
            }

            c.close();

            studentSpinner.setAdapter(
                    new ArrayAdapter<>(
                            this,
                            android.R.layout.simple_spinner_dropdown_item,
                            studentNames
                    )
            );

            box.addView(
                    text(
                            "دانش‌آموز",
                            fontSize()
                    )
            );

            box.addView(
                    studentSpinner
            );

            Button save =
                    button(
                            "💾 ثبت شهریه",
                            green
                    );

            box.addView(save);

            Spinner finalStudentSpinner =
                    studentSpinner;

            ArrayList<Integer> finalStudentIds =
                    studentIds;

            save.setOnClickListener(
                    v -> {

                        saveTransaction(
                                true,
                                amount,
                                payment,
                                tracking,
                                comment,
                                finalStudentSpinner,
                                finalStudentIds
                        );
                    }
            );

        } else {

            Button save =
                    button(
                            "💾 ثبت هزینه",
                            red
                    );

            box.addView(save);

            save.setOnClickListener(
                    v -> {

                        saveTransaction(
                                false,
                                amount,
                                payment,
                                tracking,
                                comment,
                                null,
                                null
                        );
                    }
            );
        }

        addContent(scroll(box));

        addBackButton();
    }

    private void saveTransaction(
            boolean tuition,
            EditText amount,
            Spinner payment,
            EditText tracking,
            EditText comment,
            Spinner studentSpinner,
            ArrayList<Integer> studentIds) {

        long value =
                number(
                        amount.getText()
                                .toString()
                );

        if (value <= 0) {

            toast("مبلغ صحیح وارد کنید");

            return;
        }

        int studentId = 0;

        if (tuition &&
                studentIds != null &&
                studentIds.size() > 0) {

            int position =
                    studentSpinner
                            .getSelectedItemPosition();

            if (position >= 0 &&
                    position < studentIds.size()) {

                studentId =
                        studentIds.get(position);
            }
        }

        String method =
                payment.getSelectedItem()
                        .toString();

        ContentValues v =
                new ContentValues();

        v.put(
                "date",
                today()
        );

        v.put(
                "account",
                tuition ?
                        "شهریه" :
                        "هزینه"
        );

        if (tuition) {

            v.put(
                    "credit",
                    value
            );

            v.put(
                    "debit",
                    0
            );

            v.put(
                    "kind",
                    "tuition"
            );

        } else {

            v.put(
                    "debit",
                    value
            );

            v.put(
                    "credit",
                    0
            );

            v.put(
                    "kind",
                    "expense"
            );
        }

        v.put(
                "comment",
                comment.getText()
                        .toString()
        );

        v.put(
                "payment_method",
                method
        );

        v.put(
                "tracking_code",
                tracking.getText()
                        .toString()
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

        SQLiteDatabase d =
                db.getWritableDatabase();

        long result =
                d.insert(
                        "transactions",
                        null,
                        v
                );

        if (result != -1) {

            toast(
                    "تراکنش با موفقیت ثبت شد"
            );

            if (tuition) {

                transactionForm(true);

            } else {

                transactionForm(false);
            }

        } else {

            toast(
                    "ثبت تراکنش انجام نشد"
            );
        }
    }

    // =====================================================
    // حساب‌ها
    // =====================================================

    private void accounts() {

        baseLayout();

        header("📒 حساب‌ها");

        LinearLayout box = vertical();

        Button add =
                button(
                        "➕ افزودن حساب",
                        green
                );

        box.addView(add);

        add.setOnClickListener(
                v -> accountDialog(-1)
        );

        SQLiteDatabase d =
                db.getReadableDatabase();

        String sql =
                isAdmin() ?
                        "SELECT id,code,name FROM accounts ORDER BY id" :
                        "SELECT id,code,name FROM accounts " +
                                "WHERE school_id=? " +
                                "ORDER BY id";

        Cursor c;

        if (isAdmin()) {

            c =
                    d.rawQuery(
                            sql,
                            null
                    );

        } else {

            c =
                    d.rawQuery(
                            sql,
                            new String[]{
                                    String.valueOf(
                                            currentSchoolId
                                    )
                            }
                    );
        }

        while (c.moveToNext()) {

            int id =
                    c.getInt(0);

            String code =
                    c.getString(1);

            String name =
                    c.getString(2);

            TextView row =
                    text(
                            "کد: " + safe(code) +
                                    "\nحساب: " + safe(name),
                            fontSize()
                    );

            box.addView(row);

            Button edit =
                    button(
                            "ویرایش",
                            blue
                    );

            box.addView(edit);

            edit.setOnClickListener(
                    v -> accountDialog(id)
            );
        }

        c.close();

        addContent(scroll(box));

        addBackButton();
    }

    private void accountDialog(int accountId) {

        LinearLayout box = vertical();

        EditText code =
                edit("کد حساب");

        EditText name =
                edit("نام حساب");

        box.addView(code);
        box.addView(name);

        if (accountId != -1) {

            SQLiteDatabase d =
                    db.getReadableDatabase();

            Cursor c =
                    d.rawQuery(
                            "SELECT code,name " +
                                    "FROM accounts " +
                                    "WHERE id=?",
                            new String[]{
                                    String.valueOf(accountId)
                            }
                    );

            if (c.moveToFirst()) {

                code.setText(
                        c.getString(0)
                );

                name.setText(
                        c.getString(1)
                );
            }

            c.close();
        }

        new AlertDialog.Builder(this)
                .setTitle(
                        accountId == -1 ?
                                "حساب جدید" :
                                "ویرایش حساب"
                )
                .setView(box)
                .setPositiveButton(
                        "ذخیره",
                        (dialog, which) -> {

                            ContentValues v =
                                    new ContentValues();

                            v.put(
                                    "code",
                                    code.getText()
                                            .toString()
                            );

                            v.put(
                                    "name",
                                    name.getText()
                                            .toString()
                            );

                            v.put(
                                    "school_id",
                                    currentSchoolId
                            );

                            SQLiteDatabase d =
                                    db.getWritableDatabase();

                            if (accountId == -1) {

                                d.insert(
                                        "accounts",
                                        null,
                                        v
                                );

                            } else {

                                d.update(
                                        "accounts",
                                        v,
                                        "id=?",
                                        new String[]{
                                                String.valueOf(accountId)
                                        }
                                );
                            }

                            accounts();
                        }
                )
                .setNegativeButton(
                        "انصراف",
                        null
                )
                .show();
    }

    // =====================================================
    // گزارش مالی
    // =====================================================

    private void report() {

        baseLayout();

        header("📊 گزارش مالی");

        LinearLayout box = vertical();

        SQLiteDatabase d =
                db.getReadableDatabase();

        String where =
                isAdmin() ?
                        "" :
                        " WHERE school_id=? ";

        Cursor c;

        if (isAdmin()) {

            c =
                    d.rawQuery(
                            "SELECT " +
                                    "COALESCE(SUM(credit),0)," +
                                    "COALESCE(SUM(debit),0)," +
                                    "COUNT(*) " +
                                    "FROM transactions",
                            null
                    );

        } else {

            c =
                    d.rawQuery(
                            "SELECT " +
                                    "COALESCE(SUM(credit),0)," +
                                    "COALESCE(SUM(debit),0)," +
                                    "COUNT(*) " +
                                    "FROM transactions " +
                                    "WHERE school_id=?",
                            new String[]{
                                    String.valueOf(
                                            currentSchoolId
                                    )
                            }
                    );
        }

        long income = 0;
        long expense = 0;
        long count = 0;

        if (c.moveToFirst()) {

            income =
                    c.getLong(0);

            expense =
                    c.getLong(1);

            count =
                    c.getLong(2);
        }

        c.close();

        long balance =
                income - expense;

        TextView result =
                text(
                        "مجموع درآمد: " +
                                money(income) +
                                "\n\nمجموع هزینه: " +
                                money(expense) +
                                "\n\nمانده: " +
                                money(balance) +
                                "\n\nتعداد تراکنش‌ها: " +
                                money(count),
                        fontSize() + 1
                );

        result.setTypeface(
                Typeface.DEFAULT,
                Typeface.BOLD
        );

        box.addView(result);

        addContent(scroll(box));

        addBackButton();
    }

    // =====================================================
    // تطبیق تراکنش‌ها
    // =====================================================

    private void reconcile() {

        baseLayout();

        header("✅ تطبیق تراکنش‌ها");

        LinearLayout box = vertical();

        SQLiteDatabase d =
                db.getReadableDatabase();

        String sql;

        Cursor c;

        if (isAdmin()) {

            sql =
                    "SELECT id,date,account,debit,credit," +
                            "payment_method,tracking_code," +
                            "reconciled,comment " +
                            "FROM transactions " +
                            "ORDER BY id DESC";

            c =
                    d.rawQuery(
                            sql,
                            null
                    );

        } else {

            sql =
                    "SELECT id,date,account,debit,credit," +
                            "payment_method,tracking_code," +
                            "reconciled,comment " +
                            "FROM transactions " +
                            "WHERE school_id=? " +
                            "ORDER BY id DESC";

            c =
                    d.rawQuery(
                            sql,
                            new String[]{
                                    String.valueOf(
                                            currentSchoolId
                                    )
                            }
                    );
        }

        while (c.moveToNext()) {

            int id =
                    c.getInt(0);

            String date =
                    c.getString(1);

            String account =
                    c.getString(2);

            long debit =
                    c.getLong(3);

            long credit =
                    c.getLong(4);

            String method =
                    c.getString(5);

            String tracking =
                    c.getString(6);

            int reconciled =
                    c.getInt(7);

            String comment =
                    c.getString(8);

            TextView row =
                    text(
                            "تاریخ: " + safe(date) +
                                    "\nحساب: " + safe(account) +
                                    "\nبدهکار: " + money(debit) +
                                    "\nبستانکار: " + money(credit) +
                                    "\nروش: " + safe(method) +
                                    "\nکد پیگیری: " + safe(tracking) +
                                    "\nشرح: " + safe(comment) +
                                    "\nوضعیت: " +
                                    (reconciled == 1 ?
                                            "تطبیق شده ✅" :
                                            "تطبیق نشده ❌"),
                            fontSize()
                    );

            box.addView(row);

            if (reconciled == 0) {

                Button ok =
                        button(
                                "✅ تأیید و تطبیق",
                                green
                        );

                box.addView(ok);

                ok.setOnClickListener(
                        v -> {

                            ContentValues values =
                                    new ContentValues();

                            values.put(
                                    "reconciled",
                                    1
                            );

                            d.update(
                                    "transactions",
                                    values,
                                    "id=?",
                                    new String[]{
                                            String.valueOf(id)
                                    }
                            );

                            reconcile();
                        }
                );
            }
        }

        c.close();

        addContent(scroll(box));

        addBackButton();
    }

    // =====================================================
    // تنظیمات
    // =====================================================

    private void settings() {

        baseLayout();

        header("⚙️ تنظیمات");

        LinearLayout box = vertical();

        box.addView(
                text(
                        "اندازه نوشته‌ها",
                        fontSize() + 1
                )
        );

        Button small =
                button(
                        "🔹 کوچک",
                        blue
                );

        Button medium =
                button(
                        "🔹 متوسط",
                        green
                );

        Button large =
                button(
                        "🔹 بزرگ",
                        orange
                );

        box.addView(small);
        box.addView(medium);
        box.addView(large);

        small.setOnClickListener(
                v -> {

                    db.setSetting(
                            "font_size",
                            "14"
                    );

                    toast(
                            "اندازه فونت روی کوچک تنظیم شد"
                    );

                    settings();
                }
        );

        medium.setOnClickListener(
                v -> {

                    db.setSetting(
                            "font_size",
                            "16"
                    );

                    toast(
                            "اندازه فونت روی متوسط تنظیم شد"
                    );

                    settings();
                }
        );

        large.setOnClickListener(
                v -> {

                    db.setSetting(
                            "font_size",
                            "20"
                    );

                    toast(
                            "اندازه فونت روی بزرگ تنظیم شد"
                    );

                    settings();
                }
        );

        box.addView(
                text(
                        "\nنام نرم‌افزار:\n" +
                                "سیستم حسابداری مجموعه مدرسه القرآن شهرضا",
                        fontSize()
                )
        );

        addContent(scroll(box));

        addBackButton();
    }

    // =====================================================
    // خروج
    // =====================================================

    private void logout() {

        currentUserId = 0;
        currentSchoolId = 0;
        currentUserName = "";
        currentRole = "manager";

        pageHistory.clear();

        showLogin();
    }
}
