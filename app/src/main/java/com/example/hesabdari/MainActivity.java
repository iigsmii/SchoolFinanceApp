package com.example.hesabdari;

import android.app.*;
import android.os.*;
import android.graphics.Color;
import android.graphics.Typeface;
import android.text.InputType;
import android.view.*;
import android.widget.*;
import android.database.*;
import android.content.*;
import java.util.*;

public class MainActivity extends Activity {

    DB db;

    LinearLayout root;
    LinearLayout content;

    int blue = Color.rgb(25, 82, 145);
    int blueDark = Color.rgb(15, 55, 105);
    int lightBlue = Color.rgb(232, 241, 250);
    int green = Color.rgb(46, 125, 50);
    int orange = Color.rgb(239, 126, 34);
    int red = Color.rgb(198, 40, 40);
    int gray = Color.rgb(245, 247, 250);

    String currentManager = "مدیر سیستم";
    String currentUsername = "";

    int currentSchoolId = 0;
    String currentSchoolName = "";

    String currentRole = "manager";

    ArrayList<String> pageHistory =
        new ArrayList<String>();


    // =====================================================
    // شروع برنامه
    // =====================================================

    @Override
    public void onCreate(Bundle b) {

        super.onCreate(b);

        db = new DB(this);

        showLogin();
    }


    // =====================================================
    // Back گوشی
    // =====================================================

    @Override
    public void onBackPressed() {

        if (pageHistory.size() > 0) {

            pageHistory.remove(
                pageHistory.size() - 1
            );

            if (pageHistory.size() == 0) {

                showHome
