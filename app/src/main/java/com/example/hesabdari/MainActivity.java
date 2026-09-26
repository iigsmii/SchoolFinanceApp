package com.example.hesabdari;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Typeface;
import android.text.InputType;
import android.view.View;
import android.widget.*;
import android.database.Cursor;

import java.util.ArrayList;

public class MainActivity extends Activity {

    DB db;

    LinearLayout root;
    LinearLayout content;

    int blue = Color.rgb(25, 82, 145);
    int darkBlue = Color.rgb(13, 54, 100);
    int lightBlue = Color.rgb(232, 241, 250);
    int lightGray = Color.rgb(247, 249, 252);
    int green = Color.rgb(46, 125, 50);
    int red = Color.rgb(198, 40, 40);

    String currentManager = "";
    String currentUsername = "";

    int currentSchoolId = 0;
    String currentSchoolName = "";

    String currentRole = "manager";

    ArrayList<String> history =
            new ArrayList<String>();


    // =====================================================
    // شروع
    // =====================================================

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        db = new DB(this);

        showLogin();
    }


    // =====================================================
    // دکمه Back گوشی
    // =====================================================

    @Override
    public void onBackPressed() {

        if (history.size() > 1) {

            history.remove(
                    history.size() - 1
            );

            String previous =
                    history.get(
                            history.size() - 1
                    );

            openPage(previous);

        } else if (history.size() == 1) {

            String page =
                    history.get(0);

            if (!page.equals("home")) {

                history.clear();
                history.add("home");

                showHome();

            } else {

                super.onBackPressed();
            }

        } else {

            super.onBackPressed();
        }
    }


    // =====================================================
    // باز کردن صفحه
    // =====================================================

    void go(String page) {

        if (history.size() == 0 ||
                !history.get(
                        history.size() - 1
                ).equals(page)) {

            history.add(page);
        }

        openPage(page);
    }


    void openPage(String page) {

        if (page.equals("home")) {

            showHome();

        } else if (page.equals("schools")) {

            schools();

        } else if (page.equals("managers")) {

            managers();

        } else if (page.equals("students")) {

            students();

        } else if (page.equals("accounts")) {

            accounts();

        } else if (page.equals("income")) {

            transactions("شهریه");

        } else if (page.equals("expense")) {

            transactions("هزینه");

        } else if (page.equals("report")) {

            report();

        } else if (page.equals("reconcile")) {

            reconciliation();

        } else if (page.equals("settings")) {

            settings();
        }
    }


    // =====================================================
    // اندازه فونت
    // =====================================================

    float fontSize() {

        try {

            return Float.parseFloat(
                    db.getSetting(
                            "font_size",
                            "16"
                    )
            );

        } catch (Exception e) {

            return 16;
        }
    }


    // =====================================================
    // ساخت صفحه پایه
    // =====================================================

    void base(String title) {

        root =
                new LinearLayout(this);

        root.setOrientation(
                LinearLayout.VERTICAL
        );

        root.setBackgroundColor(
                Color.WHITE
        );

        root.setLayoutDirection(
                View.LAYOUT_DIRECTION_RTL
        );


        // سربرگ

        LinearLayout header =
                new LinearLayout(this);

        header.setOrientation(
                LinearLayout.VERTICAL
        );

        header.setPadding(
                18,
                14,
                18,
                14
        );

        header.setBackgroundColor(
                blue
        );


        TextView appName =
                new TextView(this);

        appName.setText(
                "سیستم حسابداری مجموعه مدرسه القرآن شهرضا"
        );

        appName.setTextColor(
                Color.WHITE
        );

        appName.setTextSize(
                fontSize() + 1
        );

        appName.setTypeface(
                Typeface.DEFAULT,
                Typeface.BOLD
        );

        header.addView(appName);


        TextView pageTitle =
                new TextView(this);

        pageTitle.setText(title);

        pageTitle.setTextColor(
                Color.WHITE
        );

        pageTitle.setTextSize(
                fontSize()
        );

        pageTitle.setPadding(
                0,
                7,
                0,
                0
        );

        header.addView(pageTitle);


        root.addView(header);


        // محتوای قابل اسکرول

        ScrollView scroll =
                new ScrollView(this);

        content =
                new LinearLayout(this);

        content.setOrientation(
                LinearLayout.VERTICAL
        );

        content.setPadding(
                10,
                10,
                10,
                20
        );

        content.setLayoutDirection(
                View.LAYOUT_DIRECTION_RTL
        );

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


    // =====================================================
    // متن
    // =====================================================

    TextView text(
            String value,
            float size) {

        TextView t =
                new TextView(this);

        t.setText(value);

        t.setTextSize(size);

        t.setTextColor(
                Color.rgb(
                        45,
                        45,
                        45
                )
        );

        t.setPadding(
                12,
                10,
                12,
                10
        );

        t.setLayoutDirection(
                View.LAYOUT_DIRECTION_RTL
        );

        return t;
    }


    // =====================================================
    // دکمه
    // =====================================================

    Button button(String value) {

        Button b =
                new Button(this);

        b.setText(value);

        b.setAllCaps(false);

        b.setTextSize(
                fontSize()
        );

        b.setTextColor(
                darkBlue
       
