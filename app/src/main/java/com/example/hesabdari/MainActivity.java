package com.example.hesabdari;

import android.app.*;
import android.os.*;
import android.content.*;
import android.net.Uri;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.text.*;
import android.text.method.PasswordTransformationMethod;
import android.text.method.HideReturnsTransformationMethod;
import android.view.*;
import android.widget.*;
import android.text.InputFilter;
import android.text.method.DigitsKeyListener;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

import android.util.Base64;

import org.json.*;

import java.text.NumberFormat;
import java.util.*;
import java.util.Locale;

public class MainActivity extends Activity {

    ApiClient api;
    LinearLayout root, content;
    JSONObject me;
    Uri pendingImage, pendingBank;

    final String[] grades = {"مهد", "اول", "دوم", "سوم", "چهارم", "پنجم", "ششم"};

    android.content.SharedPreferences prefs;
    float fontScale = 1.0f;

    static final String PREFS = "school_finance_prefs";
    static final String KEY_ALIAS = "school_finance_login_key";

    int primary = Color.rgb(45, 86, 160);
    int secondary = Color.rgb(92, 67, 170);
    int background = Color.rgb(244, 247, 253);
    int cardColor = Color.WHITE;
    int textColor = Color.rgb(35, 40, 50);

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);

        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        fontScale = prefs.getFloat("font_scale", 1.0f);

        api = new ApiClient(this);

        showLogin();
    }

    void showLogin() {
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(30, 30, 30, 30);

        GradientDrawable bg = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[]{
                        Color.rgb(38, 77, 145),
                        Color.rgb(88, 62, 166),
                        Color.rgb(35, 135, 145)
                }
        );
        root.setBackground(bg);

        ScrollView scroll = new ScrollView(this);
        scroll.addView(root);

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(40, 45, 40, 45);
        card.setGravity(Gravity.CENTER_HORIZONTAL);

        GradientDrawable cardBg = new GradientDrawable();
        cardBg.setColor(Color.WHITE);
        cardBg.setCornerRadius(35);
        card.setBackground(cardBg);

        TextView title = tv("حسابداری مدارس", 27);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setTextColor(primary);
        title.setGravity(Gravity.CENTER);

        card.addView(title, lp(-1, -2));
        gap(card, 20);

        TextView subtitle = tv("ورود به سامانه مدیریت مالی", 17);
        subtitle.setTextColor(Color.DKGRAY);
        subtitle.setGravity(Gravity.CENTER);
        card.addView(subtitle, lp(-1, -2));

        gap(card, 30);

        EditText username = field("نام کاربری");
        username.setSingleLine(true);
        username.setInputType(android.text.InputType.TYPE_CLASS_TEXT);
        card.addView(username, lp(-1, 58));

        gap(card, 15);

        LinearLayout passwordRow = new LinearLayout(this);
        passwordRow.setOrientation(LinearLayout.HORIZONTAL);
        passwordRow.setGravity(Gravity.CENTER_VERTICAL);

        EditText password = field("رمز عبور");
        password.setSingleLine(true);
        password.setInputType(
                android.text.InputType.TYPE_CLASS_TEXT |
                        android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
        );
        password.setTransformationMethod(PasswordTransformationMethod.getInstance());

        Button showPassword = new Button(this);
        showPassword.setText("نمایش");
        showPassword.setTextSize(13);
        showPassword.setAllCaps(false);

        passwordRow.addView(
                password,
                new LinearLayout.LayoutParams(0, 58, 1)
        );

        passwordRow.addView(
                showPassword,
                new LinearLayout.LayoutParams(100, 58)
        );

        card.addView(passwordRow);

        showPassword.setOnClickListener(v -> {
            if (password.getTransformationMethod() == null) {
                password.setTransformationMethod(
                        PasswordTransformationMethod.getInstance()
                );
                showPassword.setText("نمایش");
            } else {
                password.setTransformationMethod(
                        HideReturnsTransformationMethod.getInstance()
                );
                showPassword.setText("مخفی");
            }

            password.setSelection(password.length());
        });

        gap(card, 12);

        CheckBox remember = new CheckBox(this);
        remember.setText("ذخیره نام کاربری و رمز برای ورود بعدی");
        remember.setTextSize(14);
        remember.setChecked(prefs.getBoolean("remember_login", false));
        card.addView(remember);

        String savedUser = prefs.getString("saved_username", "");
        String savedPassword = decrypt(
                prefs.getString("saved_password", "")
        );

        if (!savedUser.isEmpty()) {
            username.setText(savedUser);
        }

        if (!savedPassword.isEmpty()) {
            password.setText(savedPassword);
        }

        gap(card, 15);

        Button login = btn("ورود به سامانه");
        card.addView(login, lp(-1, 62));

        login.setOnClickListener(v -> {
            String u = username.getText().toString().trim();
            String p = password.getText().toString();

            if (u.isEmpty() || p.isEmpty()) {
                toast("نام کاربری و رمز عبور را وارد کنید");
                return;
            }

            login.setEnabled(false);

            JSONObject body = new JSONObject();

            try {
                body.put("username", u);
                body.put("password", p);
            } catch (Exception ignored) {
            }

            api.request(
                    "POST",
                    "/api/login",
                    body,
                    new ApiClient.Callback() {

                        public void ok(JSONObject o) {
                            login.setEnabled(true);

                            if (remember.isChecked()) {
                                prefs.edit()
                                        .putBoolean("remember_login", true)
                                        .putString("saved_username", u)
                                        .putString("saved_password", encrypt(p))
                                        .apply();
                            } else {
                                prefs.edit()
                                        .remove("remember_login")
                                        .remove("saved_username")
                                        .remove("saved_password")
                                        .apply();
                            }

                            try {
                                api.setToken(o.optString("token"));
                                me = o.optJSONObject("user");
                            } catch (Exception ignored) {
                            }

                            dashboard();
                        }

                        public void fail(String m) {
                            login.setEnabled(true);
                            toast(m);
                        }
                    }
            );
        });

        root.addView(card, lp(-1, -2));

        setContentView(scroll);
    }

    void dashboard() {
        base("داشبورد");

        TextView welcome = tv(
                "سلام " + me.optString("name", "") +
                        "\nبه سامانه حسابداری مدارس خوش آمدید",
                20
        );

        welcome.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        welcome.setTextColor(primary);
        content.addView(welcome, lp(-1, -2));

        gap();

        GridLayout grid = new GridLayout(this);
        grid.setColumnCount(2);
        grid.setUseDefaultMargins(false);

        addDashboardCard(grid, "👨‍🎓", "دانش‌آموزان", v -> students());
        addDashboardCard(grid, "💰", "ثبت شهریه", v -> tuition());
        addDashboardCard(grid, "💳", "ثبت هزینه", v -> expenses());
        addDashboardCard(grid, "📊", "گزارش مالی", v -> report());

        if ("admin".equals(me.optString("role"))) {
            addDashboardCard(grid, "🏫", "مدیریت مدارس", v -> schools());
            addDashboardCard(grid, "👥", "مدیریت مدیران", v -> managers());
            addDashboardCard(grid, "🏦", "تطبیق بانک", v -> bank());
            addDashboardCard(grid, "⚙", "تنظیمات", v -> settings());
        } else {
            addDashboardCard(grid, "⚙", "تنظیمات", v -> settings());
        }

        content.addView(
                grid,
                new LinearLayout.LayoutParams(
                        -1,
                        -2
                )
        );
    }

    void addDashboardCard(
            GridLayout grid,
            String icon,
            String title,
            View.OnClickListener listener
    ) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER);
        card.setPadding(12, 20, 12, 20);

        GradientDrawable bg = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[]{
                        Color.WHITE,
                        Color.rgb(238, 242, 252)
                }
        );

        bg.setCornerRadius(30);
        bg.setStroke(2, Color.rgb(225, 230, 240));

        card.setBackground(bg);
        card.setElevation(5);

        TextView i = tv(icon, 38);
        i.setGravity(Gravity.CENTER);

        TextView t = tv(title, 17);
        t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        t.setGravity(Gravity.CENTER);
        t.setTextColor(textColor);

        card.addView(i, lp(-1, 65));
        gap(card, 8);
        card.addView(t, lp(-1, 50));

        card.setOnClickListener(listener);

        GridLayout.LayoutParams gp = new GridLayout.LayoutParams();
        gp.width = 0;
        gp.height = 160;
        gp.columnSpec = GridLayout.spec(
                GridLayout.UNDEFINED,
                1f
        );
        gp.setMargins(8, 8, 8, 8);

        grid.addView(card, gp);
    }

    void base(String title) {
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(background);

        TextView header = tv(title, 23);
        header.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        header.setTextColor(Color.WHITE);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(20, 0, 20, 0);

        GradientDrawable headerBg = new GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                new int[]{primary, secondary}
        );

        headerBg.setCornerRadius(0);
        header.setBackground(headerBg);

        root.addView(header, lp(-1, 70));

        ScrollView scroll = new ScrollView(this);

        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(20, 20, 20, 30);

        scroll.addView(content);

        root.addView(
                scroll,
                new LinearLayout.LayoutParams(
                        -1,
                        0,
                        1
                )
        );

        setContentView(root);
    }

    TextView tv(String text, int size) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextSize(size * fontScale);
        t.setTextColor(textColor);
        t.setGravity(Gravity.CENTER_VERTICAL);
        t.setPadding(5, 5, 5, 5);
        return t;
    }

    EditText field(String hint) {
        EditText e = new EditText(this);
        e.setHint(hint);
        e.setTextSize(16 * fontScale);
        e.setSingleLine(true);
        e.setPadding(18, 0, 18, 0);

        GradientDrawable bg = new GradientDrawable();
        bg.setColor(Color.WHITE);
        bg.setCornerRadius(18);
        bg.setStroke(1, Color.rgb(215, 220, 230));

        e.setBackground(bg);

        return e;
    }

    Button btn(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setTextSize(15 * fontScale);
        b.setTextColor(Color.WHITE);
        b.setAllCaps(false);

        GradientDrawable bg = new GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                new int[]{primary, secondary}
        );

        bg.setCornerRadius(22);

        b.setBackground(bg);
        b.setPadding(10, 5, 10, 5);

        return b;
    }

    LinearLayout.LayoutParams lp(int w, int h) {
        return new LinearLayout.LayoutParams(w, h);
    }

    void gap() {
        gap(content, 18);
    }

    void gap(LinearLayout l, int h) {
        Space s = new Space(this);
        l.addView(s, new LinearLayout.LayoutParams(1, h));
    }

    void gapView(LinearLayout l) {
        gap(l, 12);
    }

    void toast(String s) {
        Toast.makeText(this, s, Toast.LENGTH_LONG).show();
    }

    void back() {
        Button b = btn("← بازگشت");
        content.addView(b, lp(-1, 58));
        b.setOnClickListener(v -> dashboard());
    }

    void students() {
        base("دانش‌آموزان");

        Button add = btn("➕ افزودن دانش‌آموز");
        content.addView(add, lp(-1, 58));
        gap();

        Button excel = btn("📊 ورود دانش‌آموزان از Excel");
        content.addView(excel, lp(-1, 58));
        gap();

        EditText search = field("جستجو بر اساس نام، کد یا کد ملی");
        content.addView(search, lp(-1, 58));
        gap();

        LinearLayout list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);

        content.addView(list);

        Runnable load = () -> {
            String q = search.getText().toString().trim();

            String path = "/api/students";

            if (!q.isEmpty()) {
                path += "?q=" + Uri.encode(q);
            }

            api.request(
                    "GET",
                    path,
                    null,
                    new ApiClient.Callback() {

                        public void ok(JSONObject o) {
                            list.removeAllViews();

                            JSONArray a = o.optJSONArray("data");

                            for (int i = 0;
                                 i < (a == null ? 0 : a.length());
                                 i++) {

                                JSONObject s = a.optJSONObject(i);

                                String text =
                                        "👨‍🎓 " +
                                                s.optString("name") +
                                                "\nپایه: " +
                                                s.optString("grade") +
                                                " | کد: " +
                                                s.optString("code") +
                                                "\nکد ملی: " +
                                                s.optString("national_id") +
                                                " | تلفن: " +
                                                s.optString("phone");

                                Button b = btn(text);

                                list.addView(b, lp(-1, 90));
                                gapView(list);

                                b.setOnClickListener(
                                        v -> studentEdit(s)
                                );
                            }

                            if (list.getChildCount() == 0) {
                                list.addView(
                                        tv("دانش‌آموزی یافت نشد", 16)
                                );
                            }
                        }

                        public void fail(String m) {
                            toast(m);
                        }
                    }
            );
        };

        add.setOnClickListener(v -> studentEdit(null));

        excel.setOnClickListener(v -> {
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.setType(
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            i.addCategory(Intent.CATEGORY_OPENABLE);
            startActivityForResult(i, 89);
        });

        search.addTextChangedListener(
                new TextWatcher() {
                    public void beforeTextChanged(
                            CharSequence s,
                            int st,
                            int c,
                            int a
                    ) {
                    }

                    public void onTextChanged(
                            CharSequence s,
                            int st,
                            int before,
                            int count
                    ) {
                        load.run();
                    }

                    public void afterTextChanged(Editable e) {
                    }
                }
        );

        load.run();

        back();
    }

    void studentEdit(JSONObject old) {

        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);

        EditText name = field("نام دانش‌آموز");
        EditText code = field("کد دانش‌آموز");
        EditText national = field("کد ملی - فقط ۱۰ رقم انگلیسی");
        EditText phone = field("شماره تلفن - مثال 09131112222");

        national.setInputType(
                android.text.InputType.TYPE_CLASS_NUMBER
        );
        national.setKeyListener(
                DigitsKeyListener.getInstance("0123456789")
        );
        national.setFilters(
                new InputFilter[]{
                        new InputFilter.LengthFilter(10)
                }
        );

        phone.setInputType(
                android.text.InputType.TYPE_CLASS_NUMBER
        );
        phone.setKeyListener(
                DigitsKeyListener.getInstance("0123456789")
        );
        phone.setFilters(
                new InputFilter[]{
                        new InputFilter.LengthFilter(11)
                }
        );

        Spinner grade = new Spinner(this);

        ArrayAdapter<String> adapter =
                new ArrayAdapter<>(
                        this,
                        android.R.layout.simple_spinner_dropdown_item,
                        grades
                );

        grade.setAdapter(adapter);

        l.addView(name, lp(-1, 58));
        gap(l, 12);

        l.addView(code, lp(-1, 58));
        gap(l, 12);

        l.addView(national, lp(-1, 58));
        gap(l, 12);

        l.addView(phone, lp(-1, 58));
        gap(l, 12);

        l.addView(grade, lp(-1, 58));

        if (old != null) {
            name.setText(old.optString("name"));
            code.setText(old.optString("code"));
            national.setText(old.optString("national_id"));
            phone.setText(old.optString("phone"));

            String g = old.optString("grade");

            for (int i = 0; i < grades.length; i++) {
                if (grades[i].equals(g)) {
                    grade.setSelection(i);
                    break;
                }
            }
        }

        AlertDialog dlg =
                new AlertDialog.Builder(this)
                        .setTitle(
                                old == null
                                        ? "افزودن دانش‌آموز"
                                        : "ویرایش دانش‌آموز"
                        )
                        .setView(l)
                        .setPositiveButton("ذخیره", null)
                        .setNegativeButton("انصراف", null)
                        .create();

        dlg.setOnShowListener(v ->
                dlg.getButton(
                        AlertDialog.BUTTON_POSITIVE
                ).setOnClickListener(x -> {

                    String n = name.getText().toString().trim();
                    String nat = national.getText().toString().trim();
                    String ph = phone.getText().toString().trim();

                    if (n.isEmpty()) {
                        toast("نام دانش‌آموز الزامی است");
                        return;
                    }

                    if (!nat.matches("\\d{10}")) {
                        toast("کد ملی باید دقیقاً ۱۰ رقم انگلیسی باشد");
                        return;
                    }

                    if (!ph.matches("0\\d{10}")) {
                        toast("شماره تلفن باید مانند 09131112222 باشد");
                        return;
                    }

                    JSONObject z = new JSONObject();

                    try {
                        z.put("name", n);
                        z.put(
                                "code",
                                code.getText().toString().trim()
                        );
                        z.put("national_id", nat);
                        z.put("phone", ph);
                        z.put(
                                "grade",
                                grades[grade.getSelectedItemPosition()]
                        );

                        if ("admin".equals(
                                me.optString("role")
                        )) {
                            z.put(
                                    "school_id",
                                    me.optLong("school_id")
                            );
                        }

                    } catch (Exception ignored) {
                    }

                    String path =
                            old == null
                                    ? "/api/students"
                                    : "/api/students/" +
                                    old.optLong("id");

                    api.request(
                            old == null ? "POST" : "PATCH",
                            path,
                            z,
                            new ApiClient.Callback() {

                                public void ok(JSONObject o) {
                                    dlg.dismiss();
                                    students();
                                }

                                public void fail(String m) {
                                    toast(m);
                                }
                            }
                    );
                })
        );

        dlg.show();
    }

    void tuition() {
        base("ثبت شهریه");

        EditText search =
                field("نام، کد یا کد ملی دانش‌آموز");

        content.addView(search, lp(-1, 58));
        gap();

        LinearLayout list =
                new LinearLayout(this);

        list.setOrientation(
                LinearLayout.VERTICAL
        );

        content.addView(list);

        EditText amount =
                field("مبلغ شهریه به ریال");

        amount.setInputType(
                android.text.InputType.TYPE_CLASS_NUMBER
        );

        content.addView(amount, lp(-1, 58));
        gap();

        EditText tracking =
                field("شماره پیگیری");

        content.addView(tracking, lp(-1, 58));
        gap();

        Button pay =
                btn("💰 ثبت پرداخت شهریه");

        content.addView(pay, lp(-1, 60));

        final JSONObject[] selected =
                new JSONObject[1];

        Runnable load = () -> {

            String q =
                    search.getText().toString().trim();

            String path =
                    "/api/students";

            if (!q.isEmpty()) {
                path += "?q=" + Uri.encode(q);
            }

            api.request(
                    "GET",
                    path,
                    null,
                    new ApiClient.Callback() {

                        public void ok(JSONObject o) {

                            list.removeAllViews();

                            JSONArray a =
                                    o.optJSONArray("data");

                            for (int i = 0;
                                 i < (a == null
                                         ? 0
                                         : a.length());
                                 i++) {

                                JSONObject s =
                                        a.optJSONObject(i);

                                Button b =
                                        btn(
                                                "👨‍🎓 " +
                                                        s.optString("name") +
                                                        "\n" +
                                                        s.optString("grade") +
                                                        " | " +
                                                        s.optString("national_id")
                                        );

                                list.addView(
                                        b,
                                        lp(-1, 80)
                                );

                                gapView(list);

                                b.setOnClickListener(v -> {
                                    selected[0] = s;

                                    for (
                                            int j = 0;
                                            j < list.getChildCount();
                                            j++
                                    ) {
                                        View child =
                                                list.getChildAt(j);

                                        if (child instanceof Button) {
                                            child.setAlpha(
                                                    child == b
                                                            ? 0.65f
                                                            : 1f
                                            );
                                        }
                                    }
                                });
                            }
                        }

                        public void fail(String m) {
                            toast(m);
                        }
                    }
            );
        };

        search.addTextChangedListener(
                new TextWatcher() {
                    public void beforeTextChanged(
                            CharSequence s,
                            int st,
                            int c,
                            int a
                    ) {
                    }

                    public void onTextChanged(
                            CharSequence s,
                            int st,
                            int before,
                            int count
                    ) {
                        load.run();
                    }

                    public void afterTextChanged(
                            Editable e
                    ) {
                    }
                }
        );

        pay.setOnClickListener(v -> {

            if (selected[0] == null) {
                toast("ابتدا دانش‌آموز را انتخاب کنید");
                return;
            }

            long amountValue;

            try {
                amountValue =
                        Long.parseLong(
                                amount.getText()
                                        .toString()
                                        .replace(",", "")
                        );
            } catch (Exception e) {
                toast("مبلغ معتبر نیست");
                return;
            }

            if (amountValue <= 0) {
                toast("مبلغ معتبر نیست");
                return;
            }

            JSONObject z =
                    new JSONObject();

            try {
                z.put(
                        "student_id",
                        selected[0].optLong("id")
                );

                z.put(
                        "amount",
                        amountValue
                );

                z.put(
                        "tracking_code",
                        tracking.getText()
                                .toString()
                                .trim()
                );

            } catch (Exception ignored) {
            }

            api.request(
                    "POST",
                    "/api/tuition/payment",
                    z,
                    new ApiClient.Callback() {

                        public void ok(JSONObject o) {
                            toast(
                                    "پرداخت شهریه ثبت شد"
                            );
                            amount.setText("");
                            tracking.setText("");
                        }

                        public void fail(String m) {
                            toast(m);
                        }
                    }
            );
        });

        load.run();

        back();
    }

    void expenses() {
        base("ثبت هزینه");

        LinearLayout list =
                new LinearLayout(this);

        list.setOrientation(
                LinearLayout.VERTICAL
        );

        content.addView(list);

        api.request(
                "GET",
                "/api/expense-categories",
                null,
                new ApiClient.Callback() {

                    public void ok(JSONObject o) {

                        JSONArray a =
                                o.optJSONArray("data");

                        for (int i = 0;
                             i < (a == null
                                     ? 0
                                     : a.length());
                             i++) {

                            JSONObject x =
                                    a.optJSONObject(i);

                            if (!x.optBoolean(
                                    "active",
                                    true
                            )) {
                                continue;
                            }

                            Button b =
                                    btn(
                                            "💳 " +
                                                    x.optString("name")
                                    );

                            list.addView(
                                    b,
                                    lp(-1, 60)
                            );

                            gapView(list);

                            b.setOnClickListener(
                                    v -> expenseForm(x)
                            );
                        }
                    }

                    public void fail(String m) {
                        toast(m);
                    }
                }
        );

        if ("admin".equals(
                me.optString("role")
        )) {
            gap();

            Button manage =
                    btn("⚙ مدیریت انواع هزینه");

            content.addView(
                    manage,
                    lp(-1, 60)
            );

            manage.setOnClickListener(
                    v -> expenseCategories()
            );
        }

        back();
    }

    void expenseForm(JSONObject category) {

        LinearLayout l =
                new LinearLayout(this);

        l.setOrientation(
                LinearLayout.VERTICAL
        );

        EditText amount =
                field("مبلغ به ریال");

        amount.setInputType(
                android.text.InputType.TYPE_CLASS_NUMBER
        );

        EditText comment =
                field("شرح هزینه");

        Button image =
                btn("📷 انتخاب تصویر فاکتور");

        l.addView(
                tv(
                        "نوع هزینه: " +
                                category.optString("name"),
                        17
                )
        );

        gap(l, 12);

        l.addView(
                amount,
                lp(-1, 58)
        );

        gap(l, 12);

        l.addView(
                comment,
                lp(-1, 58)
        );

        gap(l, 12);

        l.addView(
                image,
                lp(-1, 58)
        );

        image.setOnClickListener(
                v -> pickImage()
        );

        new AlertDialog.Builder(this)
                .setTitle("ثبت هزینه")
                .setView(l)
                .setPositiveButton(
                        "ثبت",
                        (d, w) -> {

                            long value;

                            try {
                                value =
                                        Long.parseLong(
                                                amount.getText()
                                                        .toString()
                                                        .replace(",", "")
                                        );
                            } catch (Exception e) {
                                toast(
                                        "مبلغ معتبر نیست"
                                );
                                return;
                            }

                            JSONObject z =
                                    new JSONObject();

                            try {
                                z.put(
                                        "amount",
                                        value
                                );

                                z.put(
                                        "category_id",
                                        category.optLong("id")
                                );

                                z.put(
                                        "comment",
                                        comment.getText()
                                                .toString()
                                                .trim()
                                );

                            } catch (Exception ignored) {
                            }

                            api.request(
                                    "POST",
                                    "/api/expenses",
                                    z,
                                    new ApiClient.Callback() {

                                        public void ok(JSONObject o) {
                                            toast(
                                                    "هزینه ثبت شد"
                                            );

                                            if (pendingImage != null) {
                                                long id =
                                                        o.optJSONObject("data")
                                                                .optLong("id");

                                                uploadAttachment(
                                                        pendingImage,
                                                        "expense",
                                                        id
                                                );

                                                pendingImage = null;
                                            }
                                        }

                                        public void fail(String m) {
                                            toast(m);
                                        }
                                    }
                            );
                        }
                )
                .setNegativeButton(
                        "انصراف",
                        null
                )
                .show();
    }

    void expenseCategories() {

        base("مدیریت انواع هزینه");

        Button add =
                btn("➕ افزودن نوع هزینه");

        content.addView(
                add,
                lp(-1, 60)
        );

        gap();

        LinearLayout list =
                new LinearLayout(this);

        list.setOrientation(
                LinearLayout.VERTICAL
        );

        content.addView(list);

        Runnable load = () ->
                api.request(
                        "GET",
                        "/api/expense-categories",
                        null,
                        new ApiClient.Callback() {

                            public void ok(JSONObject o) {

                                list.removeAllViews();

                                JSONArray a =
                                        o.optJSONArray("data");

                                for (int i = 0;
                                     i < (a == null
                                             ? 0
                                             : a.length());
                                     i++) {

                                    JSONObject x =
                                            a.optJSONObject(i);

                                    Button b =
                                            btn(
                                                    x.optString("name") +
                                                            " | " +
                                                            (
                                                                    x.optBoolean(
                                                                            "active",
                                                                            true
                                                                    )
                                                                            ? "فعال"
                                                                            : "غیرفعال"
                                                            )
                                            );

                                    list.addView(
                                            b,
                                            lp(-1, 60)
                                    );

                                    gapView(list);

                                    b.setOnClickListener(
                                            v -> expenseCategoryEdit(
                                                    x,
                                                    load
                                            )
                                    );
                                }
                            }

                            public void fail(String m) {
                                toast(m);
                            }
                        }
                );

        add.setOnClickListener(
                v -> expenseCategoryEdit(
                        null,
                        load
                )
        );

        load.run();

        back();
    }

    void expenseCategoryEdit(
            JSONObject old,
            Runnable reload
    ) {

        EditText n =
                field("نام نوع هزینه");

        CheckBox active =
                new CheckBox(this);

        active.setText("فعال");
        active.setChecked(
                old == null ||
                        old.optBoolean(
                                "active",
                                true
                        )
        );

        if (old != null) {
            n.setText(
                    old.optString("name")
            );
        }

        LinearLayout l =
                new LinearLayout(this);

        l.setOrientation(
                LinearLayout.VERTICAL
        );

        l.addView(
                n,
                lp(-1, 58)
        );

        gap(l, 12);

        l.addView(active);

        AlertDialog dlg =
                new AlertDialog.Builder(this)
                        .setTitle(
                                old == null
                                        ? "افزودن نوع هزینه"
                                        : "ویرایش نوع هزینه"
                        )
                        .setView(l)
                        .setPositiveButton(
                                "ذخیره",
                                null
                        )
                        .setNegativeButton(
                                "انصراف",
                                null
                        )
                        .create();

        dlg.setOnShowListener(
                v ->
                        dlg.getButton(
                                AlertDialog.BUTTON_POSITIVE
                        ).setOnClickListener(
                                x -> {

                                    JSONObject z =
                                            new JSONObject();

                                    try {
                                        z.put(
                                                "name",
                                                n.getText()
                                                        .toString()
                                                        .trim()
                                        );

                                        z.put(
                                                "active",
                                                active.isChecked()
                                        );
                                    } catch (Exception ignored) {
                                    }

                                    String path =
                                            old == null
                                                    ? "/api/expense-categories"
                                                    : "/api/expense-categories/" +
                                                    old.optLong("id");

                                    api.request(
                                            old == null
                                                    ? "POST"
                                                    : "PATCH",
                                            path,
                                            z,
                                            new ApiClient.Callback() {

                                                public void ok(JSONObject o) {
                                                    dlg.dismiss();
                                                    reload.run();
                                                }

                                                public void fail(String m) {
                                                    toast(m);
                                                }
                                            }
                                    );
                                }
                        )
        );

        dlg.show();
    }

    void uploadAttachment(
            Uri uri,
            String type,
            long id
    ) {

        JSONObject f =
                new JSONObject();

        try {
            f.put("entity_type", type);
            f.put("entity_id", id);
        } catch (Exception ignored) {
        }

        api.uploadFile(
                uri,
                "file",
                "/api/attachments",
                f,
                "image.jpg",
                "image/jpeg",
                new ApiClient.Callback() {

                    public void ok(JSONObject o) {
                        toast(
                                "تصویر فاکتور ذخیره شد"
                        );
                    }

                    public void fail(String m) {
                        toast(m);
                    }
                }
        );
    }

    void pickImage() {

        Intent i =
                new Intent(
                        Intent.ACTION_OPEN_DOCUMENT
                );

        i.setType("image/*");
        i.addCategory(
                Intent.CATEGORY_OPENABLE
        );

        startActivityForResult(i, 77);
    }

    @Override
    protected void onActivityResult(
            int requestCode,
            int resultCode,
            Intent data
    ) {

        super.onActivityResult(
                requestCode,
                resultCode,
                data
        );

        if (
                resultCode != RESULT_OK ||
                        data == null
        ) {
            return;
        }

        if (requestCode == 77) {
            pendingImage =
                    data.getData();

            toast(
                    "تصویر انتخاب شد؛ هنگام ثبت ذخیره می‌شود"
            );

        } else if (requestCode == 88) {

            pendingBank =
                    data.getData();

            uploadBank();

        } else if (requestCode == 89) {

            uploadStudentExcel(
                    data.getData()
            );
        }
    }

    void uploadBank() {

        JSONObject f =
                new JSONObject();

        try {
            f.put(
                    "school_id",
                    me.optLong("school_id")
            );
        } catch (Exception ignored) {
        }

        api.uploadFile(
                pendingBank,
                "file",
                "/api/bank/upload",
                f,
                "bank-file",
                "application/octet-stream",
                new ApiClient.Callback() {

                    public void ok(JSONObject o) {
                        toast(
                                "فایل بانک وارد شد: " +
                                        o.optInt("count") +
                                        " تراکنش"
                        );

                        pendingBank = null;
                    }

                    public void fail(String m) {
                        toast(m);
                    }
                }
        );
    }

    void uploadStudentExcel(Uri uri) {

        if (
                !"admin".equals(
                        me.optString("role")
                )
        ) {
            doStudentExcelUpload(
                    uri,
                    me.optLong("school_id")
            );

            return;
        }

        api.request(
                "GET",
                "/api/schools",
                null,
                new ApiClient.Callback() {

                    public void ok(JSONObject o) {

                        JSONArray a =
                                o.optJSONArray("data");

                        if (
                                a == null ||
                                        a.length() == 0
                        ) {
                            toast(
                                    "مدرسه‌ای برای ورود دانش‌آموزان وجود ندارد"
                            );
                            return;
                        }

                        String[] names =
                                new String[a.length()];

                        for (
                                int i = 0;
                                i < a.length();
                                i++
                        ) {

                            JSONObject s =
                                    a.optJSONObject(i);

                            names[i] =
                                    s.optString("name") +
                                            " | " +
                                            s.optString("code");
                        }

                        new AlertDialog.Builder(
                                MainActivity.this
                        )
                                .setTitle(
                                        "انتخاب مدرسه برای Excel"
                                )
                                .setItems(
                                        names,
                                        (d, w) ->
                                                doStudentExcelUpload(
                                                        uri,
                                                        a.optJSONObject(w)
                                                                .optLong("id")
                                                )
                                )
                                .show();
                    }

                    public void fail(String m) {
                        toast(m);
                    }
                }
        );
    }

    void doStudentExcelUpload(
            Uri uri,
            long schoolId
    ) {

        JSONObject f =
                new JSONObject();

        try {
            f.put(
                    "school_id",
                    schoolId
            );
        } catch (Exception ignored) {
        }

        api.uploadFile(
                uri,
                "file",
                "/api/students/import",
                f,
                "students.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new ApiClient.Callback() {

                    public void ok(JSONObject o) {
                        toast(
                                "ورود دانش‌آموزان انجام شد: " +
                                        o.optInt("count")
                        );

                        students();
                    }

                    public void fail(String m) {
                        toast(m);
                    }
                }
        );
    }

    void bank() {

        base("تطبیق بانک");

        content.addView(
                tv(
                        "مدیر ارشد می‌تواند فایل CSV یا Excel بانک را وارد و با شهریه‌های ثبت‌شده تطبیق دهد.",
                        16
                )
        );

        gap();

        Button upload =
                btn("📄 انتخاب فایل بانک");

        content.addView(
                upload,
                lp(-1, 60)
        );

        gap();

        Button rec =
                btn("🔄 تطبیق تراکنش‌ها");

        content.addView(
                rec,
                lp(-1, 60)
        );

        gap();

        LinearLayout list =
                new LinearLayout(this);

        list.setOrientation(
                LinearLayout.VERTICAL
        );

        content.addView(list);

        upload.setOnClickListener(
                v -> {

                    Intent i =
                            new Intent(
                                    Intent.ACTION_OPEN_DOCUMENT
                            );

                    i.setType("*/*");

                    i.addCategory(
                            Intent.CATEGORY_OPENABLE
                    );

                    startActivityForResult(
                            i,
                            88
                    );
                }
        );

        rec.setOnClickListener(
                v ->
                        api.request(
                                "POST",
                                "/api/bank/reconcile",
                                new JSONObject(),
                                new ApiClient.Callback() {

                                    public void ok(JSONObject o) {

                                        toast(
                                                "تطبیق شد: " +
                                                        o.optInt("matched") +
                                                        " | بدون تطبیق: " +
                                                        o.optInt("unmatched")
                                        );

                                        unmatched(list);
                                    }

                                    public void fail(String m) {
                                        toast(m);
                                    }
                                }
                        )
        );

        unmatched(list);

        back();
    }

    void unmatched(
            LinearLayout list
    ) {

        api.request(
                "GET",
                "/api/bank/unmatched",
                null,
                new ApiClient.Callback() {

                    public void ok(JSONObject o) {

                        list.removeAllViews();

                        JSONArray a =
                                o.optJSONArray("data");

                        for (
                                int i = 0;
                                i < (
                                        a == null
                                                ? 0
                                                : a.length()
                                );
                                i++
                        ) {

                            JSONObject x =
                                    a.optJSONObject(i);

                            LinearLayout r =
                                    new LinearLayout(
                                            MainActivity.this
                                    );

                            r.setOrientation(
                                    LinearLayout.VERTICAL
                            );

                            r.addView(
                                    tv(
                                            fmt(
                                                    x.optLong(
                                                            "amount"
                                                    )
                                            ) +
                                                    " ریال | " +
                                                    x.optString(
                                                            "comment"
                                                    ),
                                            14
                                    )
                            );

                            Button b =
                                    btn("مرجوع به مدیر");

                            r.addView(
                                    b,
                                    lp(-1, 55)
                            );

                            list.addView(
                                    r
                            );

                            gapView(list);

                            b.setOnClickListener(
                                    v ->
                                            api.request(
                                                    "POST",
                                                    "/api/bank/" +
                                                            x.optLong("id") +
                                                            "/return",
                                                    new JSONObject(),
                                                    new ApiClient.Callback() {

                                                        public void ok(JSONObject z) {
                                                            toast(
                                                                    z.optString(
                                                                            "message"
                                                                    )
                                                            );

                                                            unmatched(list);
                                                        }

                                                        public void fail(String m) {
                                                            toast(m);
                                                        }
                                                    }
                                            )
                            );
                        }
                    }

                    public void fail(String m) {
                        toast(m);
                    }
                }
        );
    }

    void report() {

        base("گزارش مالی");

        api.request(
                "GET",
                "/api/transactions",
                null,
                new ApiClient.Callback() {

                    public void ok(JSONObject o) {

                        long d = 0;
                        long c = 0;

                        JSONArray a =
                                o.optJSONArray("data");

                        for (
                                int i = 0;
                                i < (
                                        a == null
                                                ? 0
                                                : a.length()
                                );
                                i++
                        ) {

                            JSONObject x =
                                    a.optJSONObject(i);

                            d += x.optLong("debit");
                            c += x.optLong("credit");
                        }

                        content.addView(
                                tv(
                                        "جمع هزینه/بدهکار: " +
                                                fmt(d) +
                                                " ریال",
                                        19
                                )
                        );

                        gap();

                        content.addView(
                                tv(
                                        "جمع درآمد/بستانکار: " +
                                                fmt(c) +
                                                " ریال",
                                        19
                                )
                        );

                        gap();

                        content.addView(
                                tv(
                                        "مانده: " +
                                                fmt(c - d) +
                                                " ریال",
                                        19
                                )
                        );
                    }

                    public void fail(String m) {
                        toast(m);
                    }
                }
        );

        back();
    }

    void managers() {

        base("مدیریت مدیران");

        Button add =
                btn("➕ افزودن مدیر");

        content.addView(
                add,
                lp(-1, 60)
        );

        gap();

        LinearLayout list =
                new LinearLayout(this);

        list.setOrientation(
                LinearLayout.VERTICAL
        );

        content.addView(list);

        api.request(
                "GET",
                "/api/managers",
                null,
                new ApiClient.Callback() {

                    public void ok(JSONObject o) {

                        JSONArray a =
                                o.optJSONArray("data");

                        for (
                                int i = 0;
                                i < (
                                        a == null
                                                ? 0
                                                : a.length()
                                );
                                i++
                        ) {

                            JSONObject m =
                                    a.optJSONObject(i);

                            Button b =
                                    btn(
                                            "👤 " +
                                                    m.optString(
                                                            "name"
                                                    ) +
                                                    "\n" +
                                                    m.optString(
                                                            "username"
                                                    ) +
                                                    " | " +
                                                    m.optString(
                                                            "role"
                                                    )
                                    );

                            list.addView(
                                    b,
                                    lp(-1, 80)
                            );

                            gapView(list);

                            b.setOnClickListener(
                                    v ->
                                            managerEdit(m)
                            );
                        }
                    }

                    public void fail(String m) {
                        toast(m);
                    }
                }
        );

        add.setOnClickListener(
                v -> managerEdit(null)
        );

        back();
    }

    void managerEdit(JSONObject old) {

        LinearLayout l =
                new LinearLayout(this);

        l.setOrientation(
                LinearLayout.VERTICAL
        );

        EditText n =
                field("نام مدیر");

        EditText u =
                field("نام کاربری");

        EditText p =
                field(
                        old == null
                                ? "رمز عبور"
                                : "رمز جدید - خالی = بدون تغییر"
                );

        EditText sid =
                field("شناسه مدرسه");

        p.setInputType(129);

        l.addView(n, lp(-1, 58));
        gap(l, 12);

        l.addView(u, lp(-1, 58));
        gap(l, 12);

        l.addView(p, lp(-1, 58));
        gap(l, 12);

        l.addView(sid, lp(-1, 58));

        if (old != null) {

            n.setText(
                    old.optString("name")
            );

            u.setText(
                    old.optString("username")
            );

            sid.setText(
                    String.valueOf(
                            old.optLong("school_id")
                    )
            );
        }

        AlertDialog.Builder ab =
                new AlertDialog.Builder(this)
                        .setTitle(
                                old == null
                                        ? "افزودن مدیر"
                                        : "ویرایش مدیر"
                        )
                        .setView(l)
                        .setPositiveButton(
                                "ذخیره",
                                null
                        )
                        .setNegativeButton(
                                "انصراف",
                                null
                        );

        if (
                old != null &&
                        !"admin".equals(
                                old.optString(
                                        "username"
                                )
                        )
        ) {

            ab.setNeutralButton(
                    "حذف مدیر",
                    (d, w) ->
                            api.request(
                                    "DELETE",
                                    "/api/managers/" +
                                            old.optLong("id"),
                                    null,
                                    new ApiClient.Callback() {

                                        public void ok(JSONObject o) {
                                            toast(
                                                    "مدیر حذف شد"
                                            );
                                            managers();
                                        }

                                        public void fail(String m) {
                                            toast(m);
                                        }
                                    }
                            )
            );
        }

        AlertDialog dlg =
                ab.create();

        dlg.setOnShowListener(
                x ->
                        dlg.getButton(
                                AlertDialog.BUTTON_POSITIVE
                        ).setOnClickListener(
                                v -> {

                                    try {

                                        JSONObject z =
                                                new JSONObject();

                                        z.put(
                                                "name",
                                                n.getText()
                                                        .toString()
                                                        .trim()
                                        );

                                        z.put(
                                                "username",
                                                u.getText()
                                                        .toString()
                                                        .trim()
                                        );

                                        z.put(
                                                "school_id",
                                                Long.parseLong(
                                                        sid.getText()
                                                                .toString()
                                                )
                                        );

                                        if (
                                                p.getText()
                                                        .length() > 0
                                        ) {

                                            z.put(
                                                    "password",
                                                    p.getText()
                                                            .toString()
                                            );
                                        }

                                        String path =
                                                old == null
                                                        ? "/api/managers"
                                                        : "/api/managers/" +
                                                        old.optLong("id");

                                        api.request(
                                                old == null
                                                        ? "POST"
                                                        : "PATCH",
                                                path,
                                                z,
                                                new ApiClient.Callback() {

                                                    public void ok(JSONObject o) {
                                                        dlg.dismiss();
                                                        managers();
                                                    }

                                                    public void fail(String m) {
                                                        toast(m);
                                                    }
                                                }
                                        );

                                    } catch (Exception e) {

                                        toast(
                                                "اطلاعات مدیر کامل نیست"
                                        );
                                    }
                                }
                        )
        );

        dlg.show();
    }

    void schools() {

        base("مدیریت مدارس");

        Button add =
                btn("➕ افزودن مدرسه");

        content.addView(
                add,
                lp(-1, 60)
        );

        gap();

        LinearLayout list =
                new LinearLayout(this);

        list.setOrientation(
                LinearLayout.VERTICAL
        );

        content.addView(list);

        Runnable load =
                () ->
                        api.request(
                                "GET",
                                "/api/schools",
                                null,
                                new ApiClient.Callback() {

                                    public void ok(JSONObject o) {

                                        list.removeAllViews();

                                        JSONArray a =
                                                o.optJSONArray(
                                                        "data"
                                                );

                                        for (
                                                int i = 0;
                                                i < (
                                                        a == null
                                                                ? 0
                                                                : a.length()
                                                );
                                                i++
                                        ) {

                                            JSONObject s =
                                                    a.optJSONObject(i);

                                            Button b =
                                                    btn(
                                                            "🏫 " +
                                                                    s.optString(
                                                                            "name"
                                                                    ) +
                                                                    "\nکد: " +
                                                                    s.optString(
                                                                            "code"
                                                                    ) +
                                                                    " | " +
                                                                    (
                                                                            s.optBoolean(
                                                                                    "active",
                                                                                    true
                                                                            )
                                                                                    ? "فعال"
                                                                                    : "غیرفعال"
                                                                    )
                                                    );

                                            list.addView(
                                                    b,
                                                    lp(-1, 80)
                                            );

                                            gapView(list);

                                            b.setOnClickListener(
                                                    v ->
                                                            schoolEdit(
                                                                    s,
                                                                    load
                                                            )
                                            );
                                        }
                                    }

                                    public void fail(String m) {
                                        toast(m);
                                    }
                                }
                        );

        add.setOnClickListener(
                v ->
                        schoolEdit(
                                null,
                                load
                        )
        );

        load.run();

        back();
    }

    void schoolEdit(
            JSONObject old,
            Runnable reload
    ) {

        LinearLayout l =
                new LinearLayout(this);

        l.setOrientation(
                LinearLayout.VERTICAL
        );

        EditText n =
                field("نام مدرسه");

        EditText type =
                field("نوع مدرسه");

        EditText code =
                field("کد مدرسه");

        CheckBox active =
                new CheckBox(this);

        active.setText("فعال");

        active.setChecked(
                old == null ||
                        old.optBoolean(
                                "active",
                                true
                        )
        );

        l.addView(
                n,
                lp(-1, 58)
        );

        gap(l, 12);

        l.addView(
                type,
                lp(-1, 58)
        );

        gap(l, 12);

        l.addView(
                code,
                lp(-1, 58)
        );

        gap(l, 12);

        l.addView(active);

        if (old != null) {

            n.setText(
                    old.optString("name")
            );

            type.setText(
                    old.optString("type")
            );

            code.setText(
                    old.optString("code")
            );
        }

        AlertDialog.Builder ab =
                new AlertDialog.Builder(this)
                        .setTitle(
                                old == null
                                        ? "افزودن مدرسه"
                                        : "ویرایش مدرسه"
                        )
                        .setView(l)
                        .setPositiveButton(
                                "ذخیره",
                                null
                        )
                        .setNegativeButton(
                                "انصراف",
                                null
                        );

        if (old != null) {

            ab.setNeutralButton(
                    "حذف مدرسه",
                    (d, w) ->
                            api.request(
                                    "DELETE",
                                    "/api/schools/" +
                                            old.optLong("id"),
                                    null,
                                    new ApiClient.Callback() {

                                        public void ok(JSONObject o) {
                                            toast(
                                                    "مدرسه حذف شد"
                                            );
                                            reload.run();
                                        }

                                        public void fail(String m) {
                                            toast(m);
                                        }
                                    }
                            )
            );
        }

        AlertDialog dlg =
                ab.create();

        dlg.setOnShowListener(
                x -> {

                    Button save =
                            dlg.getButton(
                                    AlertDialog.BUTTON_POSITIVE
                            );

                    save.setOnClickListener(
                            v -> {

                                JSONObject z =
                                        new JSONObject();

                                try {

                                    z.put(
                                            "name",
                                            n.getText()
                                                    .toString()
                                                    .trim()
                                    );

                                    z.put(
                                            "type",
                                            type.getText()
                                                    .toString()
                                                    .trim()
                                    );

                                    z.put(
                                            "code",
                                            code.getText()
                                                    .toString()
                                                    .trim()
                                    );

                                    z.put(
                                            "active",
                                            active.isChecked()
                                    );

                                } catch (Exception ignored) {
                                }

                                String path =
                                        old == null
                                                ? "/api/schools"
                                                : "/api/schools/" +
                                                old.optLong("id");

                                api.request(
                                        old == null
                                                ? "POST"
                                                : "PATCH",
                                        path,
                                        z,
                                        new ApiClient.Callback() {

                                            public void ok(JSONObject o) {
                                                dlg.dismiss();
                                                reload.run();
                                            }

                                            public void fail(String m) {
                                                toast(m);
                                            }
                                        }
                                );
                            }
                    );
                }
        );

        dlg.show();
    }

    void settings() {

        base("تنظیمات");

        content.addView(
                tv(
                        "ارتباط با سرور: Render\n" +
                                "پایگاه داده: Supabase\n" +
                                "نسخه API: 2.1.0",
                        16
                )
        );

        gap();

        content.addView(
                tv(
                        "اندازه نوشته‌ها",
                        18
                )
        );

        LinearLayout row =
                new LinearLayout(this);

        row.setGravity(
                Gravity.CENTER
        );

        Button minus =
                btn("A−");

        Button plus =
                btn("A+");

        row.addView(
                minus,
                new LinearLayout.LayoutParams(
                        0,
                        60,
                        1
                )
        );

        row.addView(
                plus,
                new LinearLayout.LayoutParams(
                        0,
                        60,
                        1
                )
        );

        content.addView(row);

        gap();

        minus.setOnClickListener(
                v -> {

                    fontScale =
                            Math.max(
                                    .85f,
                                    fontScale - .05f
                            );

                    prefs.edit()
                            .putFloat(
                                    "font_scale",
                                    fontScale
                            )
                            .apply();

                    settings();
                }
        );

        plus.setOnClickListener(
                v -> {

                    fontScale =
                            Math.min(
                                    1.25f,
                                    fontScale + .05f
                            );

                    prefs.edit()
                            .putFloat(
                                    "font_scale",
                                    fontScale
                            )
                            .apply();

                    settings();
                }
        );

        Button out =
                btn("خروج از حساب");

        content.addView(
                out,
                lp(-1, 60)
        );

        gap();

        out.setOnClickListener(
                v ->
                        api.request(
                                "POST",
                                "/api/logout",
                                null,
                                new ApiClient.Callback() {

                                    public void ok(JSONObject o) {
                                        api.clearToken();
                                        showLogin();
                                    }

                                    public void fail(String m) {
                                        api.clearToken();
                                        showLogin();
                                    }
                                }
                        )
        );

        back();
    }

    String fmt(long n) {
        return NumberFormat
                .getNumberInstance(Locale.US)
                .format(n);
    }

    String encrypt(String plain) {

        try {

            KeyStore ks =
                    KeyStore.getInstance(
                            "AndroidKeyStore"
                    );

            ks.load(null);

            if (
                    !ks.containsAlias(
                            KEY_ALIAS
                    )
            ) {

                KeyGenerator kg =
                        KeyGenerator.getInstance(
                                "AES",
                                "AndroidKeyStore"
                        );

                kg.init(
                        new android.security.keystore
                                .KeyGenParameterSpec.Builder(
                                KEY_ALIAS,
                                android.security.keystore
                                        .KeyProperties
                                        .PURPOSE_ENCRYPT |
                                        android.security.keystore
                                                .KeyProperties
                                                .PURPOSE_DECRYPT
                        )
                                .setBlockModes(
                                        android.security.keystore
                                                .KeyProperties
                                                .BLOCK_MODE_GCM
                                )
                                .setEncryptionPaddings(
                                        android.security.keystore
                                                .KeyProperties
                                                .ENCRYPTION_PADDING_NONE
                                )
                                .build()
                );

                kg.generateKey();
            }

            SecretKey key =
                    (
                            (KeyStore.SecretKeyEntry)
                                    ks.getEntry(
                                            KEY_ALIAS,
                                            null
                                    )
                    ).getSecretKey();

            Cipher c =
                    Cipher.getInstance(
                            "AES/GCM/NoPadding"
                    );

            c.init(
                    Cipher.ENCRYPT_MODE,
                    key
            );

            byte[] iv =
                    c.getIV();

            byte[] ct =
                    c.doFinal(
                            plain.getBytes(
                                    StandardCharsets.UTF_8
                            )
                    );

            return Base64.encodeToString(
                    iv,
                    Base64.NO_WRAP
            ) +
                    ":" +
                    Base64.encodeToString(
                            ct,
                            Base64.NO_WRAP
                    );

        } catch (Exception e) {

            return "";
        }
    }

    String decrypt(String enc) {

        try {

            if (
                    enc == null ||
                            enc.isEmpty()
            ) {
                return "";
            }

            String[] p =
                    enc.split(
                            ":",
                            2
                    );

            if (p.length != 2) {
                return "";
            }

            KeyStore ks =
                    KeyStore.getInstance(
                            "AndroidKeyStore"
                    );

            ks.load(null);

            if (
                    !ks.containsAlias(
                            KEY_ALIAS
                    )
            ) {
                return "";
            }

            SecretKey key =
                    (
                            (KeyStore.SecretKeyEntry)
                                    ks.getEntry(
                                            KEY_ALIAS,
                                            null
                                    )
                    ).getSecretKey();

            Cipher c =
                    Cipher.getInstance(
                            "AES/GCM/NoPadding"
                    );

            c.init(
                    Cipher.DECRYPT_MODE,
                    key,
                    new GCMParameterSpec(
                            128,
                            Base64.decode(
                                    p[0],
                                    Base64.NO_WRAP
                            )
                    )
            );

            return new String(
                    c.doFinal(
                            Base64.decode(
                                    p[1],
                                    Base64.NO_WRAP
                            )
                    ),
                    StandardCharsets.UTF_8
            );

        } catch (Exception e) {

            return "";
        }
    }
}