package com.example.hesabdari;

import android.app.*;
import android.os.*;
import android.content.*;
import android.net.Uri;
import android.provider.Settings;
import android.provider.MediaStore;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.Paint;
import android.graphics.pdf.PdfDocument;
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
import java.text.SimpleDateFormat;
import java.util.Calendar;

public class MainActivity extends Activity {
    ApiClient api; LinearLayout root, content; JSONObject me; Uri pendingImage, pendingBank, cameraUri; long pendingImportSchoolId=0;
    final String[] grades={"مهد","اول","دوم","سوم","چهارم","پنجم","ششم"};
    final int navy=Color.rgb(35,55,95), teal=Color.rgb(20,130,125), gold=Color.rgb(220,155,45), ink=Color.rgb(45,55,70);
    android.content.SharedPreferences prefs;
    float fontScale=1f;
    int themeIndex=0;
    Handler clockHandler=new Handler(Looper.getMainLooper());
    TextView dashboardClock;
    boolean loginScreen=false;
    final String KEY_ALIAS="SchoolFinanceLoginKey";

    @Override public void onCreate(Bundle b){super.onCreate(b);prefs=getSharedPreferences("school_finance",MODE_PRIVATE);fontScale=prefs.getFloat("font_scale",1f);themeIndex=prefs.getInt("theme_index",0);api=new ApiClient(this);autoLogin();}
    @Override public void onBackPressed(){if(loginScreen){super.onBackPressed();return;}if(!isHomeScreen()){showHome();}else{super.onBackPressed();}}
    boolean isHomeScreen(){return root!=null && content!=null && "داشبورد".equals(((TextView)root.getChildAt(0)).getText().toString());}

    float fs(float n){return n*fontScale;}
    int accent(){int[] a={Color.rgb(20,130,125),Color.rgb(63,81,181),Color.rgb(156,39,176),Color.rgb(230,126,34),Color.rgb(46,125,50),Color.rgb(0,121,107)};return a[Math.max(0,Math.min(themeIndex,a.length-1))];}
    Typeface yekanBold(){return Typeface.create("Yekan",Typeface.BOLD);}
    TextView tv(String s,float size){TextView t=new TextView(this);t.setText(s);t.setTextSize(fs(size));t.setTextColor(ink);t.setTypeface(yekanBold());t.setPadding(14,10,14,10);t.setLineSpacing(2f,1.04f);t.setGravity(Gravity.RIGHT|Gravity.CENTER_VERTICAL);return t;}
    GradientDrawable bg(int c,float r){GradientDrawable g=new GradientDrawable();g.setColor(c);g.setCornerRadius(r);return g;}
    LinearLayout sectionBox(String title){
        LinearLayout box=new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setPadding(14,12,14,12);
        box.setBackground(bg(Color.WHITE,22));
        box.setElevation(2f);
        if(title!=null&&!title.trim().isEmpty()){TextView h=tv(title,18);h.setTextColor(navy);h.setPadding(8,6,8,12);box.addView(h);}
        return box;
    }
    LinearLayout sectionBox(LinearLayout parent,String title){LinearLayout box=sectionBox(title);parent.addView(box,new LinearLayout.LayoutParams(-1,-2));Space sp=new Space(this);parent.addView(sp,new LinearLayout.LayoutParams(1,12));return box;}
    Button btn(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextSize(fs(16));b.setTextColor(Color.WHITE);b.setTypeface(yekanBold());b.setMinHeight((int)fs(58));b.setPadding(12,8,12,8);b.setBackground(bg(accent(),24));b.setOnTouchListener((v,e)->{if(e.getAction()==MotionEvent.ACTION_DOWN){v.animate().scaleX(.975f).scaleY(.975f).setDuration(70).start();}else if(e.getAction()==MotionEvent.ACTION_UP||e.getAction()==MotionEvent.ACTION_CANCEL){v.animate().scaleX(1f).scaleY(1f).setDuration(100).start();}return false;});return b;}
    Button cardBtn(String s){Button b=btn(s);b.setTextSize(fs(17));b.setMinHeight((int)fs(145));b.setGravity(Gravity.CENTER);b.setBackground(bg(Color.WHITE,30));b.setTextColor(navy);return b;}
    void gap(){Space s=new Space(this);content.addView(s,new LinearLayout.LayoutParams(1,14));}
    void gapView(LinearLayout l){Space s=new Space(this);l.addView(s,new LinearLayout.LayoutParams(1,10));}
    void base(String title){
        root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(12,8,12,12);root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        GradientDrawable shell=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{Color.rgb(238,248,249),Color.rgb(255,249,232),Color.rgb(235,240,250)});root.setBackground(shell);
        TextView h=tv(title,23);h.setTextColor(navy);h.setTypeface(yekanBold());h.setGravity(Gravity.RIGHT);root.addView(h);
        TextView brand=tv("حسابداری مدارس مجموعه مدرسه القرآن کریم شهرضا",16);brand.setTextColor(accent());brand.setTypeface(Typeface.create("Neyriz",Typeface.BOLD));brand.setGravity(Gravity.RIGHT);root.addView(brand);
        content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);content.setPadding(2,6,2,18);
        ScrollView sv=new ScrollView(this);sv.setFillViewport(true);sv.addView(content);root.addView(sv,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
    }
    EditText field(String hint){EditText e=new EditText(this);e.setHint(hint);e.setTextSize(fs(16));e.setTextColor(ink);e.setHintTextColor(Color.rgb(125,135,145));e.setTypeface(yekanBold());e.setPadding(16,10,16,10);e.setMinHeight((int)fs(54));e.setBackground(bg(Color.WHITE,16));return e;}
    EditText amountField(){EditText e=field("مبلغ به ریال");e.setInputType(2);final boolean[] lock={false};e.addTextChangedListener(new TextWatcher(){public void beforeTextChanged(CharSequence s,int st,int c,int a){}public void onTextChanged(CharSequence s,int st,int b,int c){}public void afterTextChanged(Editable x){if(lock[0])return;String raw=x.toString().replace(",","").trim();if(raw.isEmpty())return;try{long n=Long.parseLong(raw);String f=NumberFormat.getNumberInstance(Locale.US).format(n);if(!f.equals(x.toString())){int oldPos=e.getSelectionStart();int digitsBefore=0;for(int i=0;i<Math.min(oldPos,x.length());i++)if(Character.isDigit(x.charAt(i)))digitsBefore++;lock[0]=true;x.replace(0,x.length(),f);int pos=0,seen=0;while(pos<f.length()&&seen<digitsBefore){if(Character.isDigit(f.charAt(pos)))seen++;pos++;}e.setSelection(Math.min(pos,f.length()));lock[0]=false;}}catch(Exception ignored){}}});return e;}
    EditText edit(String hint){EditText e=field(hint);content.addView(e,new LinearLayout.LayoutParams(-1,-2));gap();return e;}
    EditText amount(){EditText e=amountField();content.addView(e,new LinearLayout.LayoutParams(-1,-2));gap();return e;}
    long money(EditText e){return Long.parseLong(e.getText().toString().replace(",",""));}
    void toast(String s){Toast.makeText(this,s,Toast.LENGTH_LONG).show();}
    String todayGregorian(){return new SimpleDateFormat("yyyy-MM-dd",Locale.US).format(new Date());}
    String todayJalali(){int[] j=gregorianToJalali(Calendar.getInstance().get(Calendar.YEAR),Calendar.getInstance().get(Calendar.MONTH)+1,Calendar.getInstance().get(Calendar.DAY_OF_MONTH));return String.format(Locale.US,"%04d/%02d/%02d",j[0],j[1],j[2]);}
    TextView dateButton(String initial){TextView d=tv(initial==null||initial.isEmpty()?todayJalali():initial,17);d.setBackground(bg(Color.WHITE,22));d.setGravity(Gravity.CENTER);d.setTypeface(yekanBold());d.setOnClickListener(v->jalaliPicker(d));return d;}
    void jalaliPicker(TextView target){int[] now=gregorianToJalali(Calendar.getInstance().get(Calendar.YEAR),Calendar.getInstance().get(Calendar.MONTH)+1,Calendar.getInstance().get(Calendar.DAY_OF_MONTH));int yy=now[0],mm=now[1],dd=now[2];String[] parts=String.valueOf(target.getText()).split("/");try{yy=Integer.parseInt(parts[0]);mm=Integer.parseInt(parts[1]);dd=Integer.parseInt(parts[2]);}catch(Exception ignored){}
        LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.HORIZONTAL);l.setGravity(Gravity.CENTER);Spinner ys=new Spinner(this), ms=new Spinner(this), ds=new Spinner(this);
        ArrayList<String> yl=new ArrayList<>();for(int y=1400;y<=1415;y++)yl.add(String.valueOf(y));ArrayList<String> ml=new ArrayList<>();for(int m=1;m<=12;m++)ml.add(String.valueOf(m));ArrayList<String> dl=new ArrayList<>();for(int d=1;d<=31;d++)dl.add(String.valueOf(d));
        ys.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,yl));ms.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,ml));ds.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,dl));ys.setSelection(Math.max(0,yy-1400));ms.setSelection(mm-1);ds.setSelection(dd-1);l.addView(ds,new LinearLayout.LayoutParams(0,70,1));l.addView(ms,new LinearLayout.LayoutParams(0,70,1));l.addView(ys,new LinearLayout.LayoutParams(0,70,1));
        new AlertDialog.Builder(this).setTitle("انتخاب تاریخ شمسی").setView(l).setPositiveButton("تأیید",(di,w)->target.setText(String.format(Locale.US,"%04d/%02d/%02d",Integer.parseInt(ys.getSelectedItem().toString()),Integer.parseInt(ms.getSelectedItem().toString()),Integer.parseInt(ds.getSelectedItem().toString())))).setNegativeButton("انصراف",null).show();}
    String jalaliToGregorianString(String s){try{String[] p=s.split("/");int[] g=jalaliToGregorian(Integer.parseInt(p[0]),Integer.parseInt(p[1]),Integer.parseInt(p[2]));return String.format(Locale.US,"%04d-%02d-%02d",g[0],g[1],g[2]);}catch(Exception e){return todayGregorian();}}
    int[] jalaliToGregorian(int jy,int jm,int jd){int gy=jy+621;int[] gdm={0,31,28,31,30,31,30,31,31,30,31,30,31};int[] jdm={0,31,31,31,31,31,31,30,30,30,30,30,29};int days=365*(jy-979)+((jy-979)/33)*8+(((jy-979)%33)+3)/4;for(int i=1;i<jm;i++)days+=jdm[i];days+=jd-1;int gday=days+79;gy=1600+400*(gday/146097);gday%=146097;boolean leap=true;if(gday>=36525){gday--;gy+=100*(gday/36524);gday%=36524;if(gday>=365)gday++;}gy+=4*(gday/1461);gday%=1461;if(gday>=366){leap=false;gday--;gy+=gday/365;gday%=365;}int gm=1;while(gday>gdm[gm]+((gm==2&&leap)?1:0)){gday-=gdm[gm]+((gm==2&&leap)?1:0);gm++;}return new int[]{gy,gm,gday+1};}
    int[] gregorianToJalali(int gy,int gm,int gd){int[] gdm={0,31,28,31,30,31,30,31,31,30,31,30,31};int[] jdm={0,31,31,31,31,31,31,30,30,30,30,30,29};int gy2=gy-1600,gm2=gm-1,gd2=gd-1;int gday=365*gy2+(gy2+3)/4-(gy2+99)/100+(gy2+399)/400;for(int i=0;i<gm2;i++)gday+=gdm[i+1];if(gm>2&&((gy%4==0&&gy%100!=0)||gy%400==0))gday++;gday+=gd2;int jday=gday-79;int jy=979+33*(jday/12053);jday%=12053;jy+=4*(jday/1461);jday%=1461;if(jday>=366){jy+=(jday-1)/365;jday=(jday-1)%365;}int jm,jd;if(jday<186){jm=1+jday/31;jd=1+jday%31;}else{jm=7+(jday-186)/30;jd=1+(jday-186)%30;}return new int[]{jy,jm,jd};}
    void addDateField(LinearLayout l,String label,String initial){l.addView(tv(label+" *",14));l.addView(dateButton(initial));gapView(l);}
    void startClock(){if(dashboardClock==null)return;clockHandler.removeCallbacksAndMessages(null);Runnable r=new Runnable(){public void run(){if(dashboardClock!=null){dashboardClock.setText("تاریخ امروز: "+todayJalali()+"\nساعت: "+new SimpleDateFormat("HH:mm:ss",Locale.US).format(new Date()));clockHandler.postDelayed(this,1000);}}};clockHandler.post(r);}

    void autoLogin(){
        String u=decrypt(prefs.getString("login_user","")), p=decrypt(prefs.getString("login_pass",""));
        if(u.length()==0||p.length()==0){showLogin();return;}
        JSONObject x=new JSONObject();try{x.put("username",u);x.put("password",p);}catch(Exception ignored){}
        api.request("POST","/api/login",x,new ApiClient.Callback(){public void ok(JSONObject o){try{api.setToken(o.getString("token"));me=o.getJSONObject("user");showHome();}catch(Exception e){showLogin();}}public void fail(String m){showLogin();}});
    }
    void showLogin(){
        loginScreen=true;
        base("سامانه یکپارچه حسابداری زیر مجموعه های مدرسة القرآن الکریم شهرضا");
        // Keep the login screen focused: the page title already contains the system name.
        gap();
        EditText u=edit("نام کاربری"); EditText p=edit("رمز عبور"); p.setInputType(129);
        LinearLayout passRow=new LinearLayout(this);passRow.setOrientation(LinearLayout.HORIZONTAL);passRow.setGravity(Gravity.CENTER_VERTICAL);passRow.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        CheckBox show=new CheckBox(this);show.setText("نمایش رمز");show.setTextSize(fs(14));show.setChecked(false);passRow.addView(show,new LinearLayout.LayoutParams(-2,-2));
        CheckBox remember=new CheckBox(this);remember.setText("ذخیره نام کاربری و رمز");remember.setTextSize(fs(14));remember.setChecked(prefs.getBoolean("remember",true));passRow.addView(remember,new LinearLayout.LayoutParams(-2,-2));
        content.addView(passRow);gap();
        Button b=btn("ورود به سامانه");content.addView(b);gap();
        show.setOnCheckedChangeListener((v,checked)->p.setTransformationMethod(checked?HideReturnsTransformationMethod.getInstance():PasswordTransformationMethod.getInstance()));
        b.setOnClickListener(v->{String us=u.getText().toString().trim(),pw=p.getText().toString();if(us.isEmpty()||pw.isEmpty()){toast("نام کاربری و رمز عبور را وارد کنید");return;}JSONObject x=new JSONObject();try{x.put("username",us);x.put("password",pw);}catch(Exception ignored){}b.setEnabled(false);api.request("POST","/api/login",x,new ApiClient.Callback(){public void ok(JSONObject o){b.setEnabled(true);try{api.setToken(o.getString("token"));me=o.getJSONObject("user");prefs.edit().putBoolean("remember",remember.isChecked()).apply();if(remember.isChecked()){prefs.edit().putString("login_user",encrypt(us)).putString("login_pass",encrypt(pw)).apply();}else{prefs.edit().remove("login_user").remove("login_pass").apply();}showHome();}catch(Exception e){toast("پاسخ ورود نامعتبر است");}}public void fail(String m){b.setEnabled(true);toast(m);}});});
    }
    void showHome(){
        loginScreen=false;
        base("داشبورد");
        LinearLayout welcome=new LinearLayout(this);welcome.setOrientation(LinearLayout.VERTICAL);welcome.setPadding(8,8,8,8);welcome.setBackground(bg(Color.WHITE,28));
        welcome.addView(tv("خوش آمدید، "+me.optString("name","مدیر"),20));welcome.addView(tv("مدرسه: "+me.optString("school_name","همه مدارس"),15));dashboardClock=tv("",18);dashboardClock.setTextColor(accent());welcome.addView(dashboardClock);content.addView(welcome);startClock();gap();
        String[][] ms={{"👨‍🎓\nدانش‌آموزان","students"},{"💳\nدریافت و پرداخت","receipts"},{"🧾\nهزینه‌ها","expenses"},{"🔄\nتراکنش‌ها","transactions"},{"📒\nریز گردش حساب","statement"},{"💰\nطلب من از مدرسه","claim"},{"📊\nگزارش مالی","report"},{"📝\nگزارش فعالیت","activity"},{"⚙️\nتنظیمات","settings"}};
        if(isSeniorUser())ms=new String[][]{{"👨‍🎓\nدانش‌آموزان","students"},{"💳\nدریافت و پرداخت","receipts"},{"🧾\nهزینه‌ها","expenses"},{"🏦\nتطبیق بانک","bank"},{"🧾\nچک صیادی","cheques"},{"👤\nمدیران","managers"},{"🏫\nمدارس","schools"},{"📒\nریز گردش حساب","statement"},{"💰\nطلب من از مدرسه","claim"},{"📊\nگزارش مالی","report"},{"📝\nگزارش فعالیت","activity"},{"📥\nخروجی پارسیان","export"},{"📢\nپیام به مدیران","messages"},{"⚙️\nتنظیمات","settings"}};
        GridLayout grid=new GridLayout(this);grid.setColumnCount(2);grid.setUseDefaultMargins(false);content.addView(grid);
        for(String[] m:ms){Button b=cardBtn(m[0]);GridLayout.LayoutParams gp=new GridLayout.LayoutParams();gp.width=0;gp.height=(int)fs(145);gp.columnSpec=GridLayout.spec(GridLayout.UNDEFINED,1f);gp.setMargins(7,21,7,21);grid.addView(b,gp);b.setOnClickListener(v->{switch(m[1]){case"students":students();break;case"tuition":tuition();break;case"receipts":receiptsPayments();break;case"expenses":expenses();break;case"bank":bank();break;case"cheques":chequesScreen();break;case"managers":managers();break;case"schools":schools();break;case"report":report();break;case"transactions":transactionsScreen();break;case"export":exportParsian();break;case"messages":messagesAdmin();break;case"activity":activityLog();break;case"statement":accountStatement();break;case"claim":myClaim();break;case"update":checkForUpdate();break;default:settings();}});}
        gap();content.addView(tv("پیام کاربر ارشد به مدیران",19));LinearLayout msgBox=new LinearLayout(this);msgBox.setOrientation(LinearLayout.VERTICAL);msgBox.setPadding(8,4,8,8);msgBox.setBackground(bg(Color.WHITE,24));content.addView(msgBox);loadMessages(msgBox);
        // Check the published version when the dashboard is opened. Android still requires user confirmation for APK installation.
        checkForUpdate();
    }
    void back(){gap();Button b=btn("↩ بازگشت به داشبورد");content.addView(b);b.setOnClickListener(v->showHome());}
    void students(){
        base("دانش‌آموزان");
        Button add=btn("➕ افزودن دانش‌آموز");content.addView(add);gap();Button imp=btn("📥 ورود دانش‌آموزان از Excel");content.addView(imp);gap();Button fix=btn("⚠️ دانش‌آموزان نیازمند اصلاح");content.addView(fix);gap();
        EditText q=edit("جست‌وجوی نام، کد یا کد ملی (اختیاری)");Button search=btn("🔎 جست‌وجو");content.addView(search);gap();
        LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);
        Runnable load=()->api.request("GET","/api/students?q="+Uri.encode(q.getText().toString()),null,new ApiClient.Callback(){public void ok(JSONObject o){list.removeAllViews();JSONArray a=o.optJSONArray("data");if(a==null||a.length()==0){list.addView(tv("دانش‌آموزی یافت نشد.",16));return;}for(int i=0;i<a.length();i++){JSONObject s=a.optJSONObject(i);boolean needsFix=s.optBoolean("needs_fix",false);Button r=btn((needsFix?"⚠️ ":"👤 ")+s.optString("name")+"\n"+s.optString("grade")+"  |  "+(s.optString("national_id").isEmpty()?"بدون کد ملی":s.optString("national_id"))+"\n"+(needsFix?"نیاز به اصلاح":"اطلاعات صحیح")+" | "+s.optString("phone"));if(needsFix){r.setBackground(bg(Color.rgb(255,232,232),24));r.setTextColor(Color.rgb(190,30,30));}list.addView(r);gapView(list);r.setOnClickListener(v->studentEdit(s));}}public void fail(String m){toast(m);}});search.setOnClickListener(v->load.run());add.setOnClickListener(v->studentEdit(null));imp.setOnClickListener(v->pickStudentExcel());fix.setOnClickListener(v->api.request("GET","/api/students?needs_fix=1",null,new ApiClient.Callback(){public void ok(JSONObject o){list.removeAllViews();JSONArray a=o.optJSONArray("data");if(a==null||a.length()==0){list.addView(tv("موردی برای اصلاح وجود ندارد.",16));return;}for(int i=0;i<a.length();i++){JSONObject s=a.optJSONObject(i);Button r=btn("⚠️ "+s.optString("name")+"\n"+s.optString("grade")+" | کد ملی: "+(s.optString("national_id").isEmpty()?"خالی":s.optString("national_id"))+"\nنیازمند اصلاح");r.setBackground(bg(Color.rgb(255,210,210),24));r.setTextColor(Color.rgb(180,20,20));list.addView(r);gapView(list);r.setOnClickListener(v->studentEdit(s));}}public void fail(String m){toast(m);}}));load.run();back();
    }
    void studentEdit(JSONObject old){
        LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);l.setPadding(8,4,8,4);
        TextView error=new TextView(this);error.setTextColor(Color.rgb(190,30,30));error.setTextSize(fs(15));error.setVisibility(View.GONE);l.addView(error);
        EditText n=field("نام و نام خانوادگی *");
        Spinner g=new Spinner(this);g.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,grades));
        EditText phone=field("شماره موبایل 09131112222 *");phone.setInputType(2);phone.setKeyListener(DigitsKeyListener.getInstance("0123456789"));phone.setFilters(new InputFilter[]{new InputFilter.LengthFilter(11)});
        EditText national=field("کد ملی، دقیقاً ۱۰ رقم *");national.setInputType(2);national.setKeyListener(DigitsKeyListener.getInstance("0123456789"));national.setFilters(new InputFilter[]{new InputFilter.LengthFilter(10)});
        LinearLayout schoolBox=new LinearLayout(this);schoolBox.setOrientation(LinearLayout.VERTICAL);Spinner school=new Spinner(this);TextView codeInfo=tv("کد پارسیان به‌صورت خودکار ساخته می‌شود: کلی 67 | معین مدرسه | تفصیلی کد ملی",14);codeInfo.setBackground(bg(Color.WHITE,20));
        ArrayList<String> schoolNames=new ArrayList<>();ArrayList<Long> schoolIds=new ArrayList<>();
        LinearLayout infoBox=sectionBox(l,"مشخصات دانش‌آموز");infoBox.addView(n);infoBox.addView(tv("پایه تحصیلی *",14));infoBox.addView(g);infoBox.addView(phone);infoBox.addView(national);
        LinearLayout accountBox=sectionBox(l,"حساب پارسیان (خودکار)");accountBox.addView(codeInfo);accountBox.addView(schoolBox);accountBox.addView(tv("کد معین توسط سامانه و بر اساس مدرسه تعیین می‌شود و قابل انتخاب توسط مدیر نیست.",13));
        if(old!=null){n.setText(old.optString("name"));phone.setText(old.optString("phone"));national.setText(old.optString("national_id"));for(int i=0;i<grades.length;i++)if(grades[i].equals(old.optString("grade")))g.setSelection(i);}
        Runnable updateInfo=()->{String nid=national.getText().toString().trim();String schoolMoeen="—";long sid=0;if(isSeniorUser()&&!schoolIds.isEmpty()&&school.getSelectedItemPosition()>=0&&school.getSelectedItemPosition()<schoolIds.size())sid=schoolIds.get(school.getSelectedItemPosition());else if(old!=null)sid=old.optLong("school_id");int moeen=schoolMoeenLocal(sid);schoolMoeen=moeen>0?String.valueOf(moeen):"—";codeInfo.setText("کد کامل: "+(nid.isEmpty()?"—":nid+"-"+schoolMoeen+"-67")+"\nکد کلی: 67 | کد معین مدرسه: "+schoolMoeen+" | کد تفصیلی: "+(nid.isEmpty()?"—":nid));};
        if(isSeniorUser()){schoolBox.addView(tv("مدرسه *",14));schoolBox.addView(school);}else{schoolBox.setVisibility(View.GONE);}
        AlertDialog.Builder builder=new AlertDialog.Builder(this).setTitle(old==null?"افزودن دانش‌آموز":"ویرایش دانش‌آموز").setView(l).setPositiveButton("ذخیره",null).setNegativeButton("انصراف",null);if(old!=null)builder.setNeutralButton("حذف دانش‌آموز",null);AlertDialog dlg=builder.create();
        dlg.setOnShowListener(x->{Button save=dlg.getButton(AlertDialog.BUTTON_POSITIVE);if(old!=null){Button del=dlg.getButton(AlertDialog.BUTTON_NEUTRAL);if(del!=null)del.setOnClickListener(v->new AlertDialog.Builder(this).setTitle("حذف دانش‌آموز").setMessage("دانش‌آموز از فهرست فعال خارج شود؟").setPositiveButton("حذف",(dd,ww)->api.request("DELETE","/api/students/"+old.optLong("id"),null,new ApiClient.Callback(){public void ok(JSONObject o){dlg.dismiss();toast("دانش‌آموز حذف شد");students();}public void fail(String m){toast(m);}})).setNegativeButton("انصراف",null).show());}
            Runnable schoolsLoad=()->api.request("GET","/api/schools",null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");schoolNames.clear();schoolIds.clear();if(a!=null)for(int i=0;i<a.length();i++){JSONObject ss=a.optJSONObject(i);if(ss!=null){schoolNames.add(ss.optString("name"));schoolIds.add(ss.optLong("id"));}}school.setAdapter(new ArrayAdapter<String>(MainActivity.this,android.R.layout.simple_spinner_dropdown_item,schoolNames));if(old!=null){long sid=old.optLong("school_id");for(int i=0;i<schoolIds.size();i++)if(schoolIds.get(i)==sid)school.setSelection(i);}save.setEnabled(!isSeniorUser()||!schoolIds.isEmpty());updateInfo.run();}public void fail(String m){showFormError(error,m);}});
            if(isSeniorUser())schoolsLoad.run();else{save.setEnabled(true);updateInfo.run();}
            school.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener(){public void onNothingSelected(AdapterView<?> p){}public void onItemSelected(AdapterView<?> p,View v,int pos,long id){updateInfo.run();}});
            national.addTextChangedListener(new TextWatcher(){public void beforeTextChanged(CharSequence s,int st,int c,int a){}public void onTextChanged(CharSequence s,int st,int b,int c){}public void afterTextChanged(Editable e){updateInfo.run();}});
            save.setOnClickListener(v->{String name=n.getText().toString().trim(),p=phone.getText().toString().trim(),nid=national.getText().toString().trim();if(name.isEmpty()){showFormError(error,"نام دانش‌آموز را وارد کنید.");return;}if(!p.matches("0\\d{10}")){showFormError(error,"شماره موبایل باید ۱۱ رقم و با ۰ شروع شود.");return;}if(!nid.matches("\\d{10}")){showFormError(error,"کد ملی باید دقیقاً ۱۰ رقم باشد.");return;}if(isSeniorUser()&&schoolIds.isEmpty()){showFormError(error,"مدرسه مشخص نشده است.");return;}try{JSONObject z=new JSONObject();z.put("name",name);z.put("grade",grades[g.getSelectedItemPosition()]);z.put("phone",p);z.put("national_id",nid);if(isSeniorUser())z.put("school_id",schoolIds.get(school.getSelectedItemPosition()));String path=old==null?"/api/students": "/api/students/"+old.optLong("id");api.request(old==null?"POST":"PATCH",path,z,new ApiClient.Callback(){public void ok(JSONObject o){dlg.dismiss();toast("دانش‌آموز با موفقیت ثبت شد");students();}public void fail(String m){showFormError(error,m);}});}catch(Exception e){showFormError(error,"اطلاعات دانش‌آموز کامل نیست.");}});
        });dlg.show();
    }
    int schoolMoeenLocal(long id){switch((int)id){case 3:return 1;case 4:return 2;case 1:return 3;case 2:return 4;case 9:return 9;case 5:return 10;case 6:return 11;case 7:return 12;case 10:return 13;case 8:return 14;default:return 0;}}

    void showFormError(TextView error,String message){
        error.setText(message==null||message.trim().isEmpty()?"خطا در ثبت اطلاعات":message);
        error.setVisibility(View.VISIBLE);
    }

    void pickStudentExcel(){
        if(isSeniorUser()){
            api.request("GET","/api/schools",null,new ApiClient.Callback(){
                public void ok(JSONObject o){
                    JSONArray a=o.optJSONArray("data");
                    if(a==null||a.length()==0){toast("مدرسه‌ای برای ورود دانش‌آموزان وجود ندارد");return;}
                    String[] names=new String[a.length()];
                    for(int i=0;i<a.length();i++){
                        JSONObject x=a.optJSONObject(i);
                        names[i]=x.optString("name")+" | "+x.optString("code");
                    }
                    new AlertDialog.Builder(MainActivity.this)
                        .setTitle("ابتدا مدرسه را انتخاب کنید")
                        .setItems(names,(d,w)->chooseExcelFile(a.optJSONObject(w).optLong("id")))
                        .show();
                }
                public void fail(String m){toast(m);}
            });
        } else {
            chooseExcelFile(me.optLong("school_id"));
        }
    }

    void chooseExcelFile(long schoolId){
        if(schoolId<=0){toast("مدرسه برای ورود دانش‌آموزان مشخص نشده است");return;}
        new AlertDialog.Builder(this)
            .setTitle("ورود دانش‌آموزان از Excel")
            .setMessage("پایه و کلاس هر دانش‌آموز از ستون «کلاس» یا «پایه» خود فایل Excel خوانده می‌شود. نیازی به انتخاب پایه نیست.")
            .setPositiveButton("انتخاب فایل Excel",(d,w)->{
                Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.setType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "application/vnd.ms-excel"
                });
                pendingImportSchoolId=schoolId;
                startActivityForResult(i,89);
            })
            .setNegativeButton("انصراف",null)
            .show();
    }


    void receiptsPayments(){
        base("دریافت و پرداخت");
        content.addView(tv("عملیات مالی",20));gap();
        String[][] ops={{"⬇️ دریافت نقدی","cash_receipt"},{"⬆️ پرداخت نقدی","cash_payment"},{"🧾 دریافت چک","cheque_receipt"},{"📄 پرداخت چک","cheque_payment"}};
        for(String[] op:ops){Button b=btn(op[0]);content.addView(b);gap();b.setOnClickListener(v->generalFinanceDialog(op[1]));}
        Button history=btn("📚 سوابق دریافت و پرداخت");content.addView(history);gap();
        history.setOnClickListener(v->generalFinanceHistory());
        back();
    }

    void generalFinanceDialog(String operation){
        boolean receipt=operation.endsWith("receipt");
        boolean cheque=operation.startsWith("cheque");
        String title=operation.equals("cash_receipt")?"دریافت نقدی":operation.equals("cash_payment")?"پرداخت نقدی":operation.equals("cheque_receipt")?"دریافت چک":"پرداخت چک";
        LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);l.setPadding(12,8,12,8);
        TextView error=new TextView(this);error.setTextColor(Color.RED);error.setVisibility(View.GONE);l.addView(error);
        EditText person=field(receipt?"دریافت از *":"پرداخت به *");
        EditText amount=amountField();amount.setHint("مبلغ به ریال *");
        TextView date=dateButton(todayJalali());
        EditText purpose=field("بابت / شرح عملیات *");
        EditText tracking=field(cheque?"شناسه صیادی ۱۶ رقمی *":"شماره پیگیری (اختیاری)");
        EditText bank=field("نام بانک");
        TextView due=dateButton(todayJalali());
        l.addView(tv(receipt?"مشخصات دریافت":"مشخصات پرداخت",17));l.addView(person);l.addView(tv("تاریخ *",14));l.addView(date);l.addView(amount);l.addView(purpose);
        if(cheque){l.addView(tracking);l.addView(bank);l.addView(tv("تاریخ سررسید چک *",14));l.addView(due);}
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(false);scroll.addView(l);
        AlertDialog dlg=new AlertDialog.Builder(this).setTitle(title).setView(scroll).setPositiveButton("ثبت سند",null).setNegativeButton("انصراف",null).create();
        dlg.setOnShowListener(v->dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(w->{
            String p=person.getText().toString().trim(),a=purpose.getText().toString().trim(),ds=date.getText().toString().trim();
            if(p.isEmpty()){showFormError(error,receipt?"نام دریافت‌کننده وجه را وارد کنید.":"نام پرداخت‌گیرنده را وارد کنید.");return;}
            if(a.isEmpty()){showFormError(error,"شرح عملیات را وارد کنید.");return;}
            if(!ds.matches("\\d{4}/\\d{2}/\\d{2}")){showFormError(error,"تاریخ معتبر وارد کنید.");return;}
            long value;try{value=money(amount);}catch(Exception ex){value=0;}
            if(value<=0){showFormError(error,"مبلغ باید بیشتر از صفر باشد.");return;}
            String sayad=tracking.getText().toString().replaceAll("\\D","");
            if(cheque && !sayad.matches("\\d{16}")){showFormError(error,"شناسه صیادی باید دقیقاً ۱۶ رقم باشد.");return;}
            String dueDate=due.getText().toString().trim();
            if(cheque && !dueDate.matches("\\d{4}/\\d{2}/\\d{2}")){showFormError(error,"تاریخ سررسید معتبر وارد کنید.");return;}
            JSONObject body=new JSONObject();
            try{
                body.put("kind",operation);body.put("person",p);body.put("amount",value);
                body.put("date",jalaliToGregorianString(ds));body.put("description",a);
                body.put("tracking_code",cheque?sayad:tracking.getText().toString().trim());
                body.put("bank_name",bank.getText().toString().trim());
                if(cheque)body.put("due_date",jalaliToGregorianString(dueDate));
            }catch(Exception ex){showFormError(error,"ساخت سند انجام نشد.");return;}
            api.request("POST","/api/finance-transaction",body,new ApiClient.Callback(){
                public void ok(JSONObject result){dlg.dismiss();toast("سند "+title+" ثبت شد");generalFinanceHistory();}
                public void fail(String message){showFormError(error,message);}
            });
        }));
        dlg.show();android.view.Window win=dlg.getWindow();if(win!=null)win.setLayout((int)(getResources().getDisplayMetrics().widthPixels*0.94),(int)(getResources().getDisplayMetrics().heightPixels*0.82));
    }

    void generalFinanceHistory(){
        base("سوابق دریافت و پرداخت");
        LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);
        api.request("GET","/api/transactions",null,new ApiClient.Callback(){public void ok(JSONObject o){
            JSONArray rows=o.optJSONArray("data");int count=0;
            if(rows!=null)for(int i=rows.length()-1;i>=0;i--){JSONObject t=rows.optJSONObject(i);if(t==null)continue;String kind=t.optString("kind","");
                if(!kind.startsWith("cash_")&&!kind.startsWith("cheque_"))continue;count++;
                String title=kind.equals("cash_receipt")?"دریافت نقدی":kind.equals("cash_payment")?"پرداخت نقدی":kind.equals("cheque_receipt")?"دریافت چک":"پرداخت چک";
                LinearLayout card=new LinearLayout(MainActivity.this);card.setOrientation(LinearLayout.VERTICAL);card.setPadding(12,12,12,12);card.setBackground(bg(Color.WHITE,20));
                card.addView(tv(title+" | "+fmt(t.optLong("amount"))+" ریال",17));
                card.addView(tv("تاریخ: "+jalaliFromGregorian(t.optString("date")),14));
                card.addView(tv(t.optString("description",""),14));
                card.addView(tv("طرف حساب: "+t.optString("person","—"),14));
                if(kind.startsWith("cheque_"))card.addView(tv("شناسه صیادی: "+t.optString("tracking_code","—")+" | بانک: "+t.optString("bank_name","—")+" | سررسید: "+jalaliFromGregorian(t.optString("due_date","")),13));
                list.addView(card);gapView(list);
            }
            if(count==0)list.addView(tv("هنوز سند دریافت یا پرداختی ثبت نشده است.",16));
        }public void fail(String message){toast(message);}});
        back();
    }

    void tuition(){
        base("شهریه و درآمد");
        EditText search=edit("جست‌وجوی نام، کد یا کد ملی");
        Button find=btn("🔎 جست‌وجوی دانش‌آموز");content.addView(find);gap();
        TextView selected=tv("دانش‌آموزی انتخاب نشده",17);selected.setBackground(bg(Color.WHITE,22));content.addView(selected);gap();
        LinearLayout history=new LinearLayout(this);history.setOrientation(LinearLayout.VERTICAL);content.addView(history);
        Button debt=btn("➕ ثبت بدهی شهریه");Button bulkDebt=btn("📋 ثبت گروهی بدهی شهریه");Button pay=btn("💳 ثبت پرداخت شهریه");content.addView(debt);gap();content.addView(bulkDebt);gap();content.addView(pay);gap();
        final JSONObject[] student={null};
        Runnable choose=()->{String term=search.getText().toString().trim();if(term.isEmpty()){toast("نام یا کد ملی دانش‌آموز را وارد کنید.");search.requestFocus();return;}api.request("GET","/api/students?q="+Uri.encode(term),null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray ar=o.optJSONArray("data");if(ar==null||ar.length()==0){toast("دانش‌آموزی با این مشخصات پیدا نشد");return;}String[] names=new String[ar.length()];for(int i=0;i<ar.length();i++){JSONObject x=ar.optJSONObject(i);names[i]=x.optString("name")+" | "+x.optString("grade")+" | "+x.optString("national_id");}new AlertDialog.Builder(MainActivity.this).setTitle("نتیجه جست‌وجو").setItems(names,(d,w)->{student[0]=ar.optJSONObject(w);selected.setText("انتخاب: "+student[0].optString("name")+" | "+student[0].optString("grade")+"\nکد ملی: "+student[0].optString("national_id"));loadBalance(student[0],selected);loadTuitionHistory(student[0],history);}).show();}public void fail(String m){toast(m);}});};
        find.setOnClickListener(v->choose.run());
        debt.setOnClickListener(v->{if(student[0]==null){toast("ابتدا دانش‌آموز را جست‌وجو و انتخاب کنید");return;}amountDialog("ثبت بدهی شهریه","/api/tuition/debt",student[0],false,null);});
        pay.setOnClickListener(v->{if(student[0]==null){toast("ابتدا دانش‌آموز را جست‌وجو و انتخاب کنید");return;}amountDialog("ثبت پرداخت شهریه","/api/tuition/payment",student[0],true,null);});
        bulkDebt.setOnClickListener(v->bulkDebtDialog());
        back();
    }

    void bulkDebtDialog(){
        final Runnable openForSchool = () -> {
            final long schoolId = me==null?0:me.optLong("school_id");
            loadBulkStudentsAndShow(schoolId);
        };
        if(isSeniorUser()){
            api.request("GET","/api/schools",null,new ApiClient.Callback(){public void ok(JSONObject o){
                JSONArray ar=o.optJSONArray("data"); if(ar==null||ar.length()==0){toast("مدرسه‌ای پیدا نشد");return;}
                ArrayList<String> names=new ArrayList<>();ArrayList<Long> ids=new ArrayList<>();
                for(int i=0;i<ar.length();i++){JSONObject x=ar.optJSONObject(i);if(x!=null){names.add(x.optString("name"));ids.add(x.optLong("id"));}}
                new AlertDialog.Builder(MainActivity.this).setTitle("انتخاب مدرسه برای ثبت گروهی")
                    .setItems(names.toArray(new String[0]),(d,w)->loadBulkStudentsAndShow(ids.get(w))).show();
            }public void fail(String m){toast(m);}});
        }else openForSchool.run();
    }

    void loadBulkStudentsAndShow(long schoolId){
        if(schoolId<=0){toast("مدرسه مشخص نشده است");return;}
        String path="/api/students?school_id="+schoolId;
        api.request("GET",path,null,new ApiClient.Callback(){public void ok(JSONObject o){
            try{
                JSONArray ar=o.optJSONArray("data");
                if(ar==null||ar.length()==0){toast("دانش‌آموزی برای این مدرسه پیدا نشد");return;}

                final ArrayList<JSONObject> allStudents=new ArrayList<>();
                for(int i=0;i<ar.length();i++){
                    JSONObject x=ar.optJSONObject(i);
                    if(x!=null && x.optLong("id",0)>0) allStudents.add(x);
                }
                if(allStudents.isEmpty()){toast("دانش‌آموز معتبر برای این مدرسه پیدا نشد");return;}

                final HashSet<Long> selectedIds=new HashSet<>();
                final ArrayList<CheckBox> checks=new ArrayList<>();
                for(JSONObject x:allStudents) selectedIds.add(x.optLong("id"));

                LinearLayout box=new LinearLayout(MainActivity.this);
                box.setOrientation(LinearLayout.VERTICAL);
                box.setPadding(10,4,10,4);

                TextView error=tv("",14);
                error.setTextColor(Color.rgb(190,30,30));
                error.setVisibility(View.GONE);
                box.addView(error);

                EditText amount=amountField();
                box.addView(amount);gapView(box);
                EditText desc=field("عنوان بدهی (مثلاً اردو یا شهریه مهر) *");
                box.addView(desc);gapView(box);
                TextView date=dateButton(todayJalali());
                box.addView(tv("تاریخ ثبت *",14));box.addView(date);gapView(box);

                LinearLayout tools=new LinearLayout(MainActivity.this);
                tools.setOrientation(LinearLayout.HORIZONTAL);
                final CheckBox selectAll=new CheckBox(MainActivity.this);
                selectAll.setText("انتخاب همه");
                selectAll.setChecked(true);
                selectAll.setTextSize(fs(15));
                tools.addView(selectAll,new LinearLayout.LayoutParams(0,70,1));
                final TextView count=tv("تعداد انتخاب: "+selectedIds.size(),15);
                tools.addView(count,new LinearLayout.LayoutParams(0,70,1));
                box.addView(tools);

                EditText filter=field("جست‌وجوی دانش‌آموز برای انتخاب");
                box.addView(filter);gapView(box);

                LinearLayout list=new LinearLayout(MainActivity.this);
                list.setOrientation(LinearLayout.VERTICAL);
                ScrollView scroll=new ScrollView(MainActivity.this);
                scroll.setFillViewport(true);
                scroll.addView(list,new ScrollView.LayoutParams(-1,-2));
                box.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));

                final boolean[] changing={false};

                for(JSONObject st:allStudents){
                    final long id=st.optLong("id");
                    String name=st.optString("name","").trim();
                    String nid=st.optString("national_id","").trim();
                    String grade=st.optString("grade","").trim();
                    final CheckBox cb=new CheckBox(MainActivity.this);
                    cb.setText(name+" | "+grade+" | "+(nid.isEmpty()?"بدون کد ملی":nid));
                    cb.setTextSize(fs(15));
                    cb.setPadding(4,8,4,8);
                    cb.setChecked(true);
                    cb.setTag((name+" "+grade+" "+nid).toLowerCase(Locale.ROOT));
                    cb.setOnCheckedChangeListener((button,checked)->{
                        if(changing[0])return;
                        if(checked)selectedIds.add(id);else selectedIds.remove(id);
                        count.setText("تعداد انتخاب: "+selectedIds.size());
                        boolean all=selectedIds.size()==allStudents.size();
                        changing[0]=true;
                        selectAll.setChecked(all);
                        changing[0]=false;
                    });
                    checks.add(cb);
                    list.addView(cb);
                    gapView(list);
                }

                selectAll.setOnCheckedChangeListener((button,checked)->{
                    if(changing[0])return;
                    changing[0]=true;
                    if(checked){
                        selectedIds.clear();
                        for(JSONObject st:allStudents)selectedIds.add(st.optLong("id"));
                    }else{
                        selectedIds.clear();
                    }
                    for(CheckBox cb:checks)cb.setChecked(checked);
                    count.setText("تعداد انتخاب: "+selectedIds.size());
                    changing[0]=false;
                });

                filter.addTextChangedListener(new TextWatcher(){
                    public void beforeTextChanged(CharSequence s,int st,int c,int a){}
                    public void onTextChanged(CharSequence s,int st,int before,int count2){
                        String q=s==null?"":s.toString().trim().toLowerCase(Locale.ROOT);
                        for(CheckBox cb:checks){
                            String hay=String.valueOf(cb.getTag());
                            cb.setVisibility(q.isEmpty()||hay.contains(q)?View.VISIBLE:View.GONE);
                        }
                    }
                    public void afterTextChanged(Editable e){}
                });

                AlertDialog dlg=new AlertDialog.Builder(MainActivity.this)
                    .setTitle("ثبت گروهی بدهی شهریه — "+allStudents.size()+" دانش‌آموز")
                    .setView(box)
                    .setPositiveButton("ثبت بدهی برای انتخاب‌شده‌ها",null)
                    .setNegativeButton("انصراف",null)
                    .create();

                dlg.setOnShowListener(x->dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
                    try{
                        long m=money(amount);
                        String ds=date.getText().toString().trim();
                        String d=desc.getText().toString().trim();
                        if(m<=0){showFormError(error,"مبلغ را وارد کنید.");return;}
                        if(d.isEmpty()){showFormError(error,"عنوان بدهی را وارد کنید.");return;}
                        if(!ds.matches("\\d{4}/\\d{2}/\\d{2}")){showFormError(error,"تاریخ معتبر نیست.");return;}
                        if(selectedIds.isEmpty()){showFormError(error,"حداقل یک دانش‌آموز را انتخاب کنید.");return;}
                        JSONArray idsJson=new JSONArray();
                        for(Long id:selectedIds)idsJson.put(id);
                        JSONObject z=new JSONObject();
                        z.put("amount",m);
                        z.put("description",d);
                        z.put("date",jalaliToGregorianString(ds));
                        z.put("school_id",schoolId);
                        z.put("student_ids",idsJson);
                        api.request("POST","/api/tuition/bulk-debt",z,new ApiClient.Callback(){
                            public void ok(JSONObject o){
                                dlg.dismiss();
                                toast("بدهی برای "+o.optInt("added")+" دانش‌آموز ثبت شد");
                                tuition();
                            }
                            public void fail(String msg){showFormError(error,msg);}
                        });
                    }catch(Exception e){showFormError(error,"اطلاعات بدهی معتبر نیست.");}
                }));
                dlg.show();
            }catch(Exception e){toast("باز کردن ثبت گروهی بدهی انجام نشد");}
        }public void fail(String m){toast(m);}});
    }
    void loadTuitionHistory(JSONObject student,LinearLayout history){history.removeAllViews();api.request("GET","/api/transactions?student_id="+student.optLong("id"),null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");history.addView(tv("سوابق شهریه",18));if(a==null||a.length()==0){history.addView(tv("هنوز تراکنشی ثبت نشده است.",15));return;}for(int i=0;i<a.length();i++){JSONObject t=a.optJSONObject(i);String k=t.optString("kind");if(!"شهریه".equals(k)&&!"شهریه_بدهی".equals(k))continue;String title="شهریه_بدهی".equals(k)?"بدهی":"پرداخت";LinearLayout row=new LinearLayout(MainActivity.this);row.setOrientation(LinearLayout.VERTICAL);row.setPadding(8,8,8,8);row.setBackground(bg(Color.WHITE,20));row.addView(tv(title+" | "+fmt(t.optLong("debit")+t.optLong("credit"))+" ریال | "+jalaliFromGregorian(t.optString("date")),16));row.addView(tv("توضیحات: "+t.optString("comment","").replaceFirst("^\\[expense_category_id=\\d+\\]\\s*",""),14));addAttachmentPreview(row,t);LinearLayout actions=new LinearLayout(MainActivity.this);Button edit=btn("✏ ویرایش"),del=btn("🗑 حذف");actions.addView(edit,new LinearLayout.LayoutParams(0,62,1));actions.addView(del,new LinearLayout.LayoutParams(0,62,1));row.addView(actions);history.addView(row);gapView(history);edit.setOnClickListener(v->studentForEdit(t));del.setOnClickListener(v->deleteTransaction(t,history,student));}}public void fail(String m){toast(m);}});}
    String jalaliFromGregorian(String iso){try{String[] p=iso.substring(0,10).split("-");int[] j=gregorianToJalali(Integer.parseInt(p[0]),Integer.parseInt(p[1]),Integer.parseInt(p[2]));return String.format(Locale.US,"%04d/%02d/%02d",j[0],j[1],j[2]);}catch(Exception e){return iso==null?"":iso;}}
    void deleteTransaction(JSONObject t,LinearLayout history,JSONObject student){new AlertDialog.Builder(this).setTitle("حذف تراکنش").setMessage("این تراکنش حذف شود؟").setPositiveButton("حذف",(d,w)->api.request("DELETE","/api/transactions/"+t.optLong("id"),null,new ApiClient.Callback(){public void ok(JSONObject o){toast("تراکنش حذف شد");loadTuitionHistory(student,history);}public void fail(String m){toast(m);}})).setNegativeButton("انصراف",null).show();}
    
    void loadBalance(JSONObject s,TextView t){api.request("GET","/api/students/"+s.optLong("id")+"/balance",null,new ApiClient.Callback(){public void ok(JSONObject o){t.setText("انتخاب: "+s.optString("name")+"\nبدهی باقی‌مانده: "+fmt(o.optLong("balance"))+" ریال");}public void fail(String m){}});}
    void chequesScreen(){
        base("چک صیادی");
        content.addView(tv("چک‌های ثبت‌شده توسط مدیران مدرسه که منتظر تأیید کاربر ارشد هستند.",15));gap();
        LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);
        final Runnable[] load=new Runnable[1];load[0]=()->api.request("GET","/api/cheques",null,new ApiClient.Callback(){public void ok(JSONObject o){list.removeAllViews();JSONArray a=o.optJSONArray("data");if(a==null||a.length()==0){list.addView(tv("چک در انتظار تأیید وجود ندارد.",16));return;}for(int i=0;i<a.length();i++){JSONObject c=a.optJSONObject(i);if(c==null)continue;LinearLayout card=sectionBox("چک صیادی");card.addView(tv("دانش‌آموز: "+c.optString("student_name")+" | مدرسه: "+c.optString("school_name"),16));card.addView(tv("شناسه صیاد: "+c.optString("sayad_id"),15));card.addView(tv("مبلغ: "+fmt(c.optLong("amount"))+" ریال | "+fmt(c.optLong("amount")/10)+" تومان",15));card.addView(tv("سررسید: "+jalaliFromGregorian(c.optString("due_date")),15));card.addView(tv("دریافت چک: "+(c.optBoolean("received_confirmed")?"✓ تأیید شده":"در انتظار")+"\nدر وجه مدرسه القرآن: "+(c.optBoolean("in_favor_confirmed")?"✓ تأیید شده":"در انتظار"),15));LinearLayout acts=new LinearLayout(MainActivity.this);Button rec=btn("✓ تأیید دریافت چک");Button fav=btn("✓ تأیید در وجه مدرسه القرآن");Button rej=btn("✕ رد چک");acts.addView(rec,new LinearLayout.LayoutParams(0,70,1));acts.addView(fav,new LinearLayout.LayoutParams(0,70,1));acts.addView(rej,new LinearLayout.LayoutParams(0,70,1));card.addView(acts);list.addView(card);gapView(list);long id=c.optLong("id");rec.setOnClickListener(v->reviewCheque(id,"receive",load[0]));fav.setOnClickListener(v->reviewCheque(id,"favor",load[0]));rej.setOnClickListener(v->reviewCheque(id,"reject",load[0]));}}public void fail(String m){toast(m);}});load[0].run();back();
    }
    void reviewCheque(long id,String action,Runnable reload){JSONObject z=new JSONObject();try{z.put("action",action);}catch(Exception ignored){}api.request("POST","/api/cheques/"+id+"/review",z,new ApiClient.Callback(){public void ok(JSONObject o){toast("وضعیت چک ثبت شد");reload.run();}public void fail(String m){toast(m);}});}

    void amountDialog(String title,String path,JSONObject student,boolean payment,JSONObject old){
        pendingImage=null;LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);l.setPadding(10,8,10,8);TextView error=new TextView(this);error.setTextColor(Color.rgb(190,30,30));error.setVisibility(View.GONE);l.addView(error);
        EditText a=amountField();EditText comment=field("توضیحات");TextView date=dateButton(old==null?todayJalali():jalaliFromGregorian(old.optString("date")));LinearLayout moneyBox=sectionBox(l,payment?"ثبت پرداخت شهریه":"ثبت بدهی شهریه");moneyBox.addView(tv("تاریخ ثبت *",14));moneyBox.addView(date);moneyBox.addView(a);moneyBox.addView(comment);
        Spinner method=new Spinner(this);ArrayList<String> methods=new ArrayList<>();methods.add("پول نقد");methods.add("کارت به کارت");methods.add("کارت خوان");methods.add("چک");method.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_item,methods){{setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);}});method.setPrompt("نوع پرداخت را انتخاب کنید");
        if(payment){moneyBox.addView(tv("نوع پرداخت *",14));moneyBox.addView(method);}
        final EditText tr;if(payment){tr=field("شماره پیگیری");moneyBox.addView(tr);}else{tr=null;}
        LinearLayout chequeBox=sectionBox(l,"اطلاعات چک صیادی");chequeBox.setVisibility(View.GONE);EditText sayad=field("شناسه صیاد (دقیقاً 16 رقم)");TextView due=dateButton(todayJalali());EditText chequeAmount=amountField();chequeAmount.setHint("مبلغ چک به تومان");CheckBox favor=new CheckBox(this);favor.setText("ثبت چک در وجه مدرسه القرآن");favor.setTextSize(fs(15));TextView warn=tv("مدیر محترم ، چک ثبت نشده فاقد ارزش می باشد.",14);warn.setTextColor(Color.RED);chequeBox.addView(sayad);chequeBox.addView(tv("تاریخ چک *",14));chequeBox.addView(due);chequeBox.addView(tv("مبلغ چک (تومان) *",14));chequeBox.addView(chequeAmount);chequeBox.addView(favor);chequeBox.addView(warn);
        if(payment){method.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener(){public void onNothingSelected(android.widget.AdapterView<?> p){}public void onItemSelected(android.widget.AdapterView<?> p,View v,int pos,long id){boolean c=pos==3;chequeBox.setVisibility(c?View.VISIBLE:View.GONE);a.setVisibility(c?View.GONE:View.VISIBLE);tr.setVisibility(c?View.GONE:View.VISIBLE);}});}
        if(old==null){LinearLayout photoRow=new LinearLayout(this);photoRow.setOrientation(LinearLayout.HORIZONTAL);Button camera=btn("📷\nدوربین");Button gallery=btn("🖼\nانتخاب از گالری");photoRow.addView(camera,new LinearLayout.LayoutParams(0,112,1));photoRow.addView(gallery,new LinearLayout.LayoutParams(0,112,1));LinearLayout photoBox=sectionBox(l,payment?"تصویر رسید پرداخت":"تصویر رسید / مدرک بدهی شهریه");photoBox.addView(photoRow);camera.setOnClickListener(v->takePhoto());gallery.setOnClickListener(v->pickImage());}
        if(old!=null){a.setText(fmt(payment?old.optLong("credit"):old.optLong("debit")));comment.setText(old.optString("comment","").replaceFirst("^ثبت بدهی شهریه$",""));if(payment&&tr!=null)tr.setText(old.optString("tracking_code",""));}
        ScrollView formScroll=new ScrollView(this);formScroll.setFillViewport(false);formScroll.setPadding(4,4,4,4);formScroll.addView(l);AlertDialog dlg=new AlertDialog.Builder(this).setTitle(title).setView(formScroll).setPositiveButton(old==null?"ثبت":"ذخیره",null).setNegativeButton("انصراف",null).create();final EditText trackingField=tr;
        dlg.setOnShowListener(x->dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{try{String ds=date.getText().toString().trim();if(!ds.matches("\\d{4}/\\d{2}/\\d{2}")){showFormError(error,"تاریخ الزامی است.");return;}String selectedMethod=payment?methods.get(method.getSelectedItemPosition()):"";long amount="چک".equals(selectedMethod)?1:money(a);if(!"چک".equals(selectedMethod)&&amount<=0){showFormError(error,"مبلغ را وارد کنید.");return;}JSONObject z=new JSONObject();z.put("amount",amount);z.put("student_id",student.optLong("id"));z.put("date",jalaliToGregorianString(ds));z.put("comment",comment.getText().toString().trim());if(student.has("school_id"))z.put("school_id",student.optLong("school_id"));if(payment){z.put("payment_method",selectedMethod);if("چک".equals(selectedMethod)){String sid=sayad.getText().toString().replaceAll("\\D","");if(!sid.matches("\\d{16}")){showFormError(error,"شناسه صیاد باید دقیقاً 16 رقمی باشد.");return;}if(!favor.isChecked()){showFormError(error,"برای ثبت چک باید گزینه ثبت چک در وجه مدرسه القرآن را انتخاب کنید.");return;}String d=due.getText().toString().trim();if(!d.matches("\\d{4}/\\d{2}/\\d{2}")){showFormError(error,"تاریخ چک الزامی است.");return;}long toman=money(chequeAmount);if(toman<=0){showFormError(error,"مبلغ چک را به تومان وارد کنید.");return;}z.put("amount",toman*10L);z.put("sayad_id",sid);z.put("due_date",jalaliToGregorianString(d));z.put("in_favor_school",true);}else{if(trackingField!=null)z.put("tracking_code",trackingField.getText().toString().trim());if(!"پول نقد".equals(selectedMethod)&&z.optString("tracking_code").isEmpty()){showFormError(error,"شماره پیگیری برای این روش پرداخت الزامی است.");return;}}}String methodHttp=old==null?"POST":"PATCH",endpoint=old==null?path:"/api/transactions/"+old.optLong("id");api.request(methodHttp,endpoint,z,new ApiClient.Callback(){public void ok(JSONObject o){if(old==null&&o.optJSONObject("data")!=null){long id=o.optJSONObject("data").optLong("id");if(pendingImage!=null){Uri imageToUpload=pendingImage;pendingImage=null;uploadAttachment("tuition",id,imageToUpload);}}dlg.dismiss();toast("چک".equals(selectedMethod)?"چک برای تأیید کاربر ارشد ثبت شد":"ثبت شد");tuition();}public void fail(String m){showFormError(error,m);}});}catch(Exception e){showFormError(error,"مبلغ یا تاریخ معتبر نیست.");}}));dlg.show();android.view.Window dialogWindow=dlg.getWindow();if(dialogWindow!=null){dialogWindow.setLayout((int)(getResources().getDisplayMetrics().widthPixels*0.94),(int)(getResources().getDisplayMetrics().heightPixels*0.82));}
    }

    void expenses(){
        base("هزینه‌ها");
        Button add=btn("➕ ثبت هزینه");content.addView(add);gap();Button cats=btn("⚙ مدیریت لیست هزینه‌ها");if(isSeniorUser())content.addView(cats);gap();
        LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);
        api.request("GET","/api/transactions?kind="+Uri.encode("هزینه"),null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray ar=o.optJSONArray("data");if(ar==null||ar.length()==0){list.addView(tv("هنوز هزینه‌ای ثبت نشده است.",16));return;}for(int i=0;i<ar.length();i++){JSONObject t=ar.optJSONObject(i);LinearLayout card=new LinearLayout(MainActivity.this);card.setOrientation(LinearLayout.VERTICAL);card.setPadding(12,12,12,12);card.setBackground(bg(Color.WHITE,22));card.addView(tv("نوع هزینه: "+(t.optString("expense_category_name").isEmpty()?expenseComment(t):t.optString("expense_category_name")),16));card.addView(tv("مبلغ: "+fmt(t.optLong("amount"))+" ریال",16));card.addView(tv("تاریخ: "+jalaliFromGregorian(t.optString("date")),14));card.addView(tv("شماره پیگیری: "+(t.optString("tracking_code").isEmpty()?"—":t.optString("tracking_code")),14));card.addView(tv("پرداخت از: "+paymentSourceLabel(t.optString("payment_source")),14));String desc=expenseComment(t);if(!desc.isEmpty())card.addView(tv("توضیحات: "+desc,14));addAttachmentPreview(card,t);LinearLayout actions=new LinearLayout(MainActivity.this);Button edit=btn("✏ ویرایش"),del=btn("🗑 حذف");actions.addView(edit,new LinearLayout.LayoutParams(0,64,1));actions.addView(del,new LinearLayout.LayoutParams(0,64,1));card.addView(actions);list.addView(card);gapView(list);edit.setOnClickListener(v->expenseEdit(t));del.setOnClickListener(v->deleteExpense(t));}}public void fail(String m){toast(m);}});
        add.setOnClickListener(v->expenseDialog());cats.setOnClickListener(v->categories());back();
    }
    String paymentSourceLabel(String v){if("own".equals(v))return "از حساب خودم";if(v==null||v.isEmpty()||"bank".equals(v))return "حساب بانکی";return v;}
    void deleteExpense(JSONObject t){new AlertDialog.Builder(this).setTitle("حذف هزینه").setMessage("این هزینه حذف شود؟").setPositiveButton("حذف",(d,w)->api.request("DELETE","/api/transactions/"+t.optLong("id"),null,new ApiClient.Callback(){public void ok(JSONObject o){toast("هزینه با موفقیت حذف شد");expenses();}public void fail(String m){toast(m);}})).setNegativeButton("انصراف",null).show();}
    String expenseComment(JSONObject t){String c=t.optString("comment",t.optString("description",""));return c.replaceFirst("^\\[expense_category_id=\\d+\\]\\s*","");}
    void expenseDialog(){expenseEdit(null);}
    void expenseEdit(JSONObject old){
        pendingImage=null;api.request("GET","/api/expense-categories",null,new ApiClient.Callback(){public void ok(JSONObject o){
            JSONArray ar=o.optJSONArray("data");ArrayList<JSONObject> cats=new ArrayList<>();ArrayList<String> names=new ArrayList<>();for(int i=0;i<(ar==null?0:ar.length());i++){JSONObject x=ar.optJSONObject(i);if(x!=null&&(x.optBoolean("active",true)||old!=null)){cats.add(x);names.add(x.optString("name"));}}
            LinearLayout l=new LinearLayout(MainActivity.this);l.setOrientation(LinearLayout.VERTICAL);l.setPadding(10,8,10,8);TextView error=new TextView(MainActivity.this);error.setTextColor(Color.rgb(190,30,30));error.setVisibility(View.GONE);l.addView(error);l.addView(tv("مشخصات هزینه",18));Spinner sp=new Spinner(MainActivity.this);sp.setAdapter(new ArrayAdapter<String>(MainActivity.this,android.R.layout.simple_spinner_dropdown_item,names));TextView date=dateButton(old==null?todayJalali():jalaliFromGregorian(old.optString("date")));EditText amount=amountField(),comment=field("توضیحات"),tracking=field("شماره پیگیری *");Spinner source=new Spinner(MainActivity.this);ArrayList<String> sourceNames=new ArrayList<>();ArrayList<String> sourceValues=new ArrayList<>();sourceNames.add("حساب بانکی");sourceValues.add("bank");sourceNames.add("از حساب خودم");sourceValues.add("own");
            LinearLayout expenseInfo=sectionBox(l,"مشخصات هزینه");expenseInfo.addView(tv("نوع هزینه *",14));expenseInfo.addView(sp);expenseInfo.addView(tv("تاریخ *",14));expenseInfo.addView(date);expenseInfo.addView(amount);expenseInfo.addView(comment);expenseInfo.addView(tracking);LinearLayout paymentBox=sectionBox(l,"روش پرداخت");paymentBox.addView(tv("پرداخت از",14));paymentBox.addView(source);
            if(old!=null){amount.setText(fmt(old.optLong("amount",old.optLong("debit"))));comment.setText(expenseComment(old));tracking.setText(old.optString("tracking_code"));String cat=old.optString("expense_category_name");for(int i=0;i<cats.size();i++)if(cats.get(i).optString("name").equals(cat))sp.setSelection(i);}
            LinearLayout photo=new LinearLayout(MainActivity.this);photo.setOrientation(LinearLayout.HORIZONTAL);Button camera=btn("📷 دوربین"),gallery=btn("🖼 گالری");photo.addView(camera,new LinearLayout.LayoutParams(0,100,1));photo.addView(gallery,new LinearLayout.LayoutParams(0,100,1));LinearLayout photoBox=sectionBox(l,"تصویر فاکتور / رسید");photoBox.addView(photo);camera.setOnClickListener(v->takePhoto());gallery.setOnClickListener(v->pickImage());
            api.request("GET","/api/bank",null,new ApiClient.Callback(){public void ok(JSONObject bo){JSONArray ba=bo.optJSONArray("data");LinkedHashSet<String> seen=new LinkedHashSet<>();if(ba!=null)for(int i=0;i<ba.length();i++){JSONObject b=ba.optJSONObject(i);if(b!=null){String name=b.optString("bank_account").trim();if(!name.isEmpty()&&!seen.contains(name)){seen.add(name);sourceNames.add(name);sourceValues.add(name);}}}source.setAdapter(new ArrayAdapter<String>(MainActivity.this,android.R.layout.simple_spinner_dropdown_item,sourceNames));String ps=old==null?"own":old.optString("payment_source","own");for(int i=0;i<sourceValues.size();i++)if(sourceValues.get(i).equals(ps))source.setSelection(i);}public void fail(String m){source.setAdapter(new ArrayAdapter<String>(MainActivity.this,android.R.layout.simple_spinner_dropdown_item,sourceNames));}});
            ScrollView formScroll=new ScrollView(MainActivity.this);formScroll.setFillViewport(false);formScroll.setPadding(4,4,4,4);formScroll.addView(l);AlertDialog dlg=new AlertDialog.Builder(MainActivity.this).setTitle(old==null?"ثبت هزینه":"ویرایش هزینه").setView(formScroll).setPositiveButton(old==null?"ثبت":"ذخیره",null).setNegativeButton("انصراف",null).create();dlg.setOnShowListener(x->dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{try{long val=money(amount);if(val<=0){showFormError(error,"مبلغ را وارد کنید.");return;}if(cats.isEmpty()){showFormError(error,"نوع هزینه انتخاب نشده است.");return;}String ds=date.getText().toString().trim();if(!ds.matches("\\d{4}/\\d{2}/\\d{2}")){showFormError(error,"تاریخ الزامی است.");return;}String tr=tracking.getText().toString().trim();if(tr.isEmpty()){showFormError(error,"شماره پیگیری هزینه الزامی است.");return;}JSONObject z=new JSONObject();z.put("category_id",cats.get(sp.getSelectedItemPosition()).optString("id"));z.put("amount",val);z.put("comment",comment.getText().toString().trim());z.put("tracking_code",tr);z.put("date",jalaliToGregorianString(ds));z.put("payment_source",sourceValues.isEmpty()?"own":sourceValues.get(Math.max(0,source.getSelectedItemPosition())));String method=old==null?"POST":"PATCH";String endpoint=old==null?"/api/expenses":"/api/expense/"+old.optLong("source_id",old.optLong("id"));api.request(method,endpoint,z,new ApiClient.Callback(){public void ok(JSONObject r){long id=old==null&&r.optJSONObject("data")!=null?r.optJSONObject("data").optLong("id"):old==null?0:old.optLong("source_id",old.optLong("id"));dlg.dismiss();toast(old==null?"هزینه با موفقیت ثبت شد":"هزینه با موفقیت ویرایش شد");if(old==null&&pendingImage!=null&&id>0){Uri imageToUpload=pendingImage;pendingImage=null;uploadAttachment("expense",id,imageToUpload);}expenses();}public void fail(String m){showFormError(error,m);}});}catch(Exception e){showFormError(error,"مبلغ یا تاریخ معتبر نیست.");}}));dlg.show();android.view.Window dialogWindow=dlg.getWindow();if(dialogWindow!=null){dialogWindow.setLayout((int)(getResources().getDisplayMetrics().widthPixels*0.94),(int)(getResources().getDisplayMetrics().heightPixels*0.82));}
        }public void fail(String m){toast(m);}});
    }

    void categories(){base("لیست هزینه‌ها");Button add=btn("➕ افزودن نوع هزینه");content.addView(add);gap();LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);api.request("GET","/api/expense-categories",null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");for(int i=0;i<(a==null?0:a.length());i++){JSONObject x=a.optJSONObject(i);Button b=btn(x.optString("name")+(x.optBoolean("active",true)?"":" | غیرفعال"));list.addView(b);gapView(list);b.setOnClickListener(v->{if(isSeniorUser())categoryEdit(x);});}}public void fail(String m){toast(m);}});add.setOnClickListener(v->{EditText n=new EditText(this);n.setHint("نام هزینه");new AlertDialog.Builder(this).setTitle("افزودن نوع هزینه").setView(n).setPositiveButton("ذخیره",(d,w)->{JSONObject x=new JSONObject();try{x.put("name",n.getText().toString());}catch(Exception ignored){}api.request("POST","/api/expense-categories",x,new ApiClient.Callback(){public void ok(JSONObject o){categories();}public void fail(String m){toast(m);}});}).setNegativeButton("انصراف",null).show();});back();}
    void categoryEdit(JSONObject old){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);EditText n=new EditText(this);n.setText(old.optString("name"));CheckBox a=new CheckBox(this);a.setText("فعال");a.setChecked(old.optBoolean("active",true));l.addView(n);l.addView(a);new AlertDialog.Builder(this).setTitle("ویرایش نوع هزینه").setView(l).setPositiveButton("ذخیره",(d,w)->{JSONObject x=new JSONObject();try{x.put("name",n.getText().toString());x.put("active",a.isChecked());}catch(Exception ignored){}api.request("PATCH","/api/expense-categories/"+Uri.encode(old.optString("id")),x,new ApiClient.Callback(){public void ok(JSONObject o){categories();}public void fail(String m){toast(m);}});}).setNegativeButton("انصراف",null).show();}
    void uploadAttachment(String type,long id,Uri uri){JSONObject f=new JSONObject();try{f.put("entity_type",type);f.put("entity_id",id);}catch(Exception ignored){}api.upload(uri,"file","/api/attachments",f,new ApiClient.Callback(){public void ok(JSONObject o){toast("تصویر کم‌حجم با DPI=96 ذخیره شد");}public void fail(String m){toast(m);}});}
    void pickImage(){Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.setType("image/*");i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,77);}
    void takePhoto(){
        if(Build.VERSION.SDK_INT>=23 && checkSelfPermission(android.Manifest.permission.CAMERA)!=android.content.pm.PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{android.Manifest.permission.CAMERA},901);return;}
        try{
            android.content.ContentValues v=new android.content.ContentValues();v.put(MediaStore.Images.Media.DISPLAY_NAME,"schoolfinance-"+System.currentTimeMillis()+".jpg");v.put(MediaStore.Images.Media.MIME_TYPE,"image/jpeg");if(Build.VERSION.SDK_INT>=29)v.put(MediaStore.Images.Media.RELATIVE_PATH,"Pictures/SchoolFinance");
            cameraUri=getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,v);if(cameraUri==null){toast("دسترسی دوربین آماده نیست");return;}
            Intent i=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);i.putExtra(MediaStore.EXTRA_OUTPUT,cameraUri);i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivityForResult(i,90);
        }catch(Exception e){toast("باز کردن دوربین انجام نشد");}
    }
    @Override public void onRequestPermissionsResult(int r,String[] p,int[] g){super.onRequestPermissionsResult(r,p,g);if(r==901&&g.length>0&&g[0]==android.content.pm.PackageManager.PERMISSION_GRANTED)takePhoto();else if(r==901)toast("برای عکس گرفتن باید اجازه دوربین را بدهید");}
    @Override protected void onActivityResult(int r,int c,Intent d){super.onActivityResult(r,c,d);if(c!=RESULT_OK)return;if(r==77&&d!=null){pendingImage=d.getData();toast("تصویر انتخاب شد؛ هنگام ثبت ذخیره می‌شود");}else if(r==90){pendingImage=cameraUri;cameraUri=null;toast("عکس دوربین آماده ثبت است");}else if(r==88&&d!=null){pendingBank=d.getData();uploadBank();}else if(r==89&&d!=null){uploadStudentExcel(d.getData(),pendingImportSchoolId);}}
    void uploadBank(){JSONObject f=new JSONObject();try{f.put("school_id",me.optLong("school_id"));}catch(Exception ignored){}api.uploadFile(pendingBank,"file","/api/bank/upload",f,"bank-file","application/octet-stream",new ApiClient.Callback(){public void ok(JSONObject o){toast("فایل بانک وارد شد: "+o.optInt("count")+" تراکنش");pendingBank=null;}public void fail(String m){toast(m);}});}
    boolean isSeniorUser(){String r=me.optString("role","");return "admin".equalsIgnoreCase(r)||"senior".equalsIgnoreCase(r)||"manager_admin".equalsIgnoreCase(r);}

    void uploadStudentExcel(Uri uri,long schoolId){
        if(schoolId<=0){toast("مدرسه برای ورود دانش‌آموزان مشخص نشده است");return;}
        JSONObject f=new JSONObject();
        try{f.put("school_id",schoolId);}catch(Exception ignored){}
        api.uploadFile(uri,"file","/api/students/import",f,"students.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            new ApiClient.Callback(){
                public void ok(JSONObject o){
                    int added=o.optInt("added"), skipped=o.optInt("skipped"), invalid=o.optInt("invalid");
                    String msg="ورود Excel: "+added+" نفر اضافه شد؛ "+skipped+" تکراری؛ "+invalid+" نیازمند اصلاح";
                    toast(msg);
                    pendingImportSchoolId=0;
                    JSONArray bad=o.optJSONArray("invalid_students");
                    if(bad!=null && bad.length()>0){
                        showInvalidImportedStudents(bad);
                    } else {
                        students();
                    }
                }
                public void fail(String m){
                    toast(m.contains("Unknown action")?
                        "نسخه Web App گوگل قدیمی است؛ کد Apps Script جدید را دوباره Deploy کنید.":m);
                }
            });
    }

    void showInvalidImportedStudents(JSONArray bad){
        LinearLayout box=new LinearLayout(MainActivity.this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(10,4,10,4);
        TextView intro=tv("این دانش‌آموزان وارد شده‌اند اما باید اصلاح شوند. روی «ویرایش» بزنید.",15);
        box.addView(intro);
        ScrollView sv=new ScrollView(MainActivity.this);
        LinearLayout list=new LinearLayout(MainActivity.this);
        list.setOrientation(LinearLayout.VERTICAL);
        sv.addView(list);
        box.addView(sv,new LinearLayout.LayoutParams(-1,(int)fs(360)));
        for(int i=0;i<bad.length();i++){
            JSONObject x=bad.optJSONObject(i);
            if(x==null)continue;
            LinearLayout row=new LinearLayout(MainActivity.this);
            row.setOrientation(LinearLayout.VERTICAL);
            row.setPadding(10,10,10,10);
            row.setBackground(bg(Color.WHITE,18));
            String nid=x.optString("national_id","");
            row.addView(tv("⚠️ ردیف Excel: "+x.optInt("row")+" | "+x.optString("name"),16));
            row.addView(tv("پایه: "+x.optString("grade")+" | کد ملی: "+(nid.isEmpty()?"خالی":nid),14));
            row.addView(tv("علت: "+x.optString("reason"),14));
            Button edit=btn("✏️ ویرایش همین دانش‌آموز");
            row.addView(edit);
            edit.setOnClickListener(v->{
                long id=x.optLong("student_id");
                api.request("GET","/api/students/"+id,null,new ApiClient.Callback(){
                    public void ok(JSONObject o){
                        JSONObject st=o.optJSONObject("data");
                        if(st!=null){ studentEdit(st); } else toast("اطلاعات دانش‌آموز پیدا نشد");
                    }
                    public void fail(String m){toast(m);}
                });
            });
            list.addView(row);
            gapView(list);
        }
        AlertDialog dlg=new AlertDialog.Builder(MainActivity.this)
            .setTitle("۲ دانش‌آموز نیازمند اصلاح")
            .setView(box)
            .setPositiveButton("بستن و نمایش فهرست",(d,w)->students())
            .create();
        dlg.show();
    }

    void bank(){base("تطبیق بانک");content.addView(tv("تمام تراکنش‌های ثبت‌شده توسط مدیران در این بخش نمایش داده می‌شود. تیک سبز یعنی با بانک تطبیق شده و ضربدر قرمز یعنی مغایرت/عدم تطبیق.",16));gap();Button upload=btn("📄\nانتخاب فایل بانک");Button rec=btn("🔄\nتطبیق تراکنش‌ها");content.addView(upload);gap();content.addView(rec);gap();LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);upload.setOnClickListener(v->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.setType("*/*");i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,88);});rec.setOnClickListener(v->api.request("POST","/api/bank/reconcile",new JSONObject(),new ApiClient.Callback(){public void ok(JSONObject o){toast("تطبیق انجام شد: "+o.optInt("matched")+" مورد؛ "+o.optInt("unmatched")+" مورد بدون تطبیق");bankReview(list);}public void fail(String m){toast(m);}}));bankReview(list);back();}
    void addAttachmentPreview(LinearLayout row,JSONObject t){String url=t.optString("attachment_url","");if(url.isEmpty())return;ImageView im=new ImageView(this);im.setAdjustViewBounds(true);im.setScaleType(ImageView.ScaleType.CENTER_INSIDE);im.setPadding(8,8,8,8);row.addView(tv("📷 تصویر پیوست تراکنش",14));row.addView(im,new LinearLayout.LayoutParams(-1,(int)fs(180)));new Thread(()->{try{java.net.HttpURLConnection c=(java.net.HttpURLConnection)new java.net.URL(url).openConnection();c.setConnectTimeout(12000);c.setReadTimeout(20000);c.setRequestMethod("GET");java.io.InputStream in=c.getInputStream();final android.graphics.Bitmap bm=android.graphics.BitmapFactory.decodeStream(in);in.close();c.disconnect();if(bm!=null)runOnUiThread(()->im.setImageBitmap(bm));}catch(Exception ignored){}}).start();}
    void reviewTransaction(JSONObject t,boolean approve,LinearLayout list){EditText note=field(approve?"توضیح تأیید (اختیاری)":"دلیل رد تراکنش");new AlertDialog.Builder(this).setTitle(approve?"تأیید تراکنش":"رد تراکنش").setView(note).setPositiveButton(approve?"تأیید":"رد",(d,w)->{JSONObject z=new JSONObject();try{z.put("status",approve?"approved":"rejected");z.put("note",note.getText().toString().trim());}catch(Exception ignored){}api.request("POST","/api/transactions/"+t.optLong("id")+"/review",z,new ApiClient.Callback(){public void ok(JSONObject o){toast("وضعیت تراکنش ثبت شد");bankReview(list);}public void fail(String m){toast(m);}});}).setNegativeButton("انصراف",null).show();}

    void bankReview(LinearLayout list){api.request("GET","/api/bank/review",null,new ApiClient.Callback(){public void ok(JSONObject o){list.removeAllViews();JSONArray a=o.optJSONArray("data");for(int i=0;i<(a==null?0:a.length());i++){JSONObject t=a.optJSONObject(i);String k=t.optString("kind");String title="هزینه".equals(k)?expenseComment(t):("شهریه_بدهی".equals(k)?"بدهی شهریه":("شهریه".equals(k)?"پرداخت شهریه":k));boolean matched=t.optBoolean("reconciled",false);String rs=t.optString("review_status","pending");LinearLayout row=new LinearLayout(MainActivity.this);row.setOrientation(LinearLayout.VERTICAL);row.setPadding(10,10,10,10);row.setBackground(bg(Color.WHITE,20));row.addView(tv("نوع: "+title+" | مبلغ: "+fmt(t.optLong("debit")+t.optLong("credit"))+" ریال",16));row.addView(tv("تاریخ: "+jalaliFromGregorian(t.optString("date"))+" | مدرسه: "+t.optString("school_name",""),14));row.addView(tv("حساب: "+t.optString("account","")+" | بدهکار: "+fmt(t.optLong("debit"))+" | بستانکار: "+fmt(t.optLong("credit")),14));row.addView(tv("روش پرداخت: "+t.optString("payment_method","")+" | کد پیگیری: "+(t.optString("tracking_code","").isEmpty()?"—":t.optString("tracking_code")),14));if(!t.optString("student_name","").isEmpty())row.addView(tv("دانش‌آموز: "+t.optString("student_name")+" | پایه: "+t.optString("student_grade",""),14));row.addView(tv("توضیحات: "+t.optString("comment","").replaceFirst("^\\[expense_category_id=\\d+\\]\\s*",""),14));row.addView(tv("تطبیق بانک: "+(matched?"✓ تأیید شده":"✕ در انتظار/مغایرت")+"\nنظر مدیر ارشد: "+("approved".equals(rs)?"✓ تأیید":"rejected".equals(rs)?"✕ رد":"در انتظار بررسی"),14));addAttachmentPreview(row,t);LinearLayout actions=new LinearLayout(MainActivity.this);Button ap=btn("✓ تأیید");Button re=btn("✕ رد");actions.addView(ap,new LinearLayout.LayoutParams(0,68,1));actions.addView(re,new LinearLayout.LayoutParams(0,68,1));row.addView(actions);ap.setOnClickListener(v->reviewTransaction(t,true,list));re.setOnClickListener(v->reviewTransaction(t,false,list));list.addView(row);gapView(list);}}public void fail(String m){toast(m);}});}

    void unmatched(LinearLayout list){bankReview(list);}
    
    void report(){
        base("گزارش مالی");
        api.request("GET","/api/transactions",null,new ApiClient.Callback(){public void ok(JSONObject o){
            JSONArray ar=o.optJSONArray("data");long debt=0,paid=0;java.util.LinkedHashMap<String,Long> costs=new java.util.LinkedHashMap<>();
            for(int i=0;i<(ar==null?0:ar.length());i++){JSONObject x=ar.optJSONObject(i);String k=x.optString("kind");
                if("شهریه_بدهی".equals(k))debt+=x.optLong("debit");else if("شهریه".equals(k))paid+=x.optLong("credit");
                else if("هزینه".equals(k)){String key=x.optString("expense_category_name","هزینه‌های متفرقه");Long old=costs.get(key);costs.put(key,(old==null?0:old)+x.optLong("debit"));}
            }
            content.addView(tv("جمع بدهی باقی‌مانده شهریه: "+fmt(Math.max(0,debt-paid))+" ریال",19));gap();
            content.addView(tv("جمع هزینه‌ها به تفکیک:",19));gap();
            for(java.util.Map.Entry<String,Long> e:costs.entrySet()){content.addView(tv(e.getKey()+" : "+fmt(e.getValue())+" ریال",17));gap();}
        }public void fail(String m){toast(m);}});
        back();
    }
    void transactionsScreen(){
        base("تراکنش‌ها");
        LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);
        api.request("GET","/api/transactions",null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray ar=o.optJSONArray("data");for(int i=0;i<(ar==null?0:ar.length());i++){JSONObject t=ar.optJSONObject(i);String kind=t.optString("kind");if(!"شهریه".equals(kind)&&!"شهریه_بدهی".equals(kind)&&!"هزینه".equals(kind))continue;String status=t.optBoolean("reconciled",false)?"تأیید شده توسط مدیر ارشد":"در انتظار تطبیق با بانک";String title="هزینه".equals(kind)?expenseComment(t):("شهریه_بدهی".equals(kind)?"بدهی شهریه":"پرداخت شهریه");Button b=btn(title+"\n"+fmt(t.optLong("debit")+t.optLong("credit"))+" ریال\n"+status);list.addView(b);gapView(list);b.setOnClickListener(v->{if("هزینه".equals(kind))expenseEdit(t);else {JSONObject st=new JSONObject();try{st.put("name",t.optString("student_name","دانش‌آموز"));}catch(Exception ignored){}studentForEdit(t);}});}}public void fail(String m){toast(m);}});back();
    }
    void studentForEdit(JSONObject t){
        api.request("GET","/api/students/"+t.optLong("student_id"),null,new ApiClient.Callback(){public void ok(JSONObject o){JSONObject st=o.optJSONObject("data");if(st==null){toast("دانش‌آموز پیدا نشد");return;}amountDialog("ویرایش "+("شهریه_بدهی".equals(t.optString("kind"))?"بدهی شهریه":"پرداخت شهریه"),"شهریه_بدهی".equals(t.optString("kind"))?"/api/tuition/debt":"/api/tuition/payment",st,"شهریه".equals(t.optString("kind")),t);}public void fail(String m){toast(m);}});
    }
    void exportParsian(){
        if(!isSeniorUser()){toast("فقط مدیر ارشد به خروجی پارسیان دسترسی دارد");return;}
        api.request("GET","/api/schools",null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray ar=o.optJSONArray("data");ArrayList<String> names=new ArrayList<>();ArrayList<Long> ids=new ArrayList<>();names.add("همه مدارس");ids.add(0L);for(int i=0;i<(ar==null?0:ar.length());i++){JSONObject x=ar.optJSONObject(i);names.add(x.optString("name"));ids.add(x.optLong("id"));}new AlertDialog.Builder(MainActivity.this).setTitle("خروجی Excel پارسیان").setItems(names.toArray(new String[0]),(d,w)->downloadParsian(ids.get(w))).show();}public void fail(String m){toast(m);}});
    }
    void downloadParsian(long schoolId){
        JSONObject body=new JSONObject();
        try{if(schoolId>0)body.put("school_id",schoolId);}catch(Exception ignored){}
        api.request("POST","/api/parsian/export",body,new ApiClient.Callback(){
            public void ok(JSONObject o){
                String url=o.optString("file_url","");
                if(url.isEmpty()){toast("فایل Excel پارسیان آماده نشد");return;}
                new Thread(()->{try{
                    java.net.HttpURLConnection c=(java.net.HttpURLConnection)new java.net.URL(url).openConnection();
                    c.setConnectTimeout(15000);c.setReadTimeout(60000);
                    int code=c.getResponseCode();if(code<200||code>=300)throw new Exception("download");
                    byte[] data;try(java.io.InputStream in=c.getInputStream();java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);data=out.toByteArray();}
                    android.content.ContentValues cv=new android.content.ContentValues();
                    cv.put(MediaStore.Downloads.DISPLAY_NAME,"parsian-"+System.currentTimeMillis()+".xlsx");
                    cv.put(MediaStore.Downloads.MIME_TYPE,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                    cv.put(MediaStore.Downloads.RELATIVE_PATH,"Download/SchoolFinance");
                    Uri uri=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,cv);if(uri==null)throw new Exception("save");
                    try(java.io.OutputStream out=getContentResolver().openOutputStream(uri)){out.write(data);}
                    runOnUiThread(()->toast("فایل Excel پارسیان در پوشه Download/SchoolFinance ذخیره شد"));
                }catch(Exception e){runOnUiThread(()->toast("ذخیره فایل پارسیان انجام نشد"));}}).start();
            }
            public void fail(String m){toast(m);}
        });
    }

    void managers(){
        base("لیست مدیران");
        Button importBtn=btn("📥 همگام‌سازی مدیران با Google Sheets"); content.addView(importBtn);gap();
        Button refresh=btn("🔄 بروزرسانی لیست مدیران"); content.addView(refresh);gap();
        Button add=btn("➕ افزودن مدیر جدید"); content.addView(add);gap();
        TextView note=tv("لیست مدیران فایل «مدیر ها.xlsx» در سیستم آماده ورود است. مدیرانی که قبلاً وجود داشته باشند دوباره ساخته نمی‌شوند.",14);
        note.setTextColor(Color.DKGRAY);content.addView(note);gap();
        LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);
        final Runnable[] reload=new Runnable[1];
        reload[0]=()->api.request("GET","/api/managers",null,new ApiClient.Callback(){
            public void ok(JSONObject o){
                list.removeAllViews(); JSONArray a=o.optJSONArray("data");
                if(a==null||a.length()==0){list.addView(tv("مدیری ثبت نشده است.",16));return;}
                for(int i=0;i<a.length();i++){
                    JSONObject m=a.optJSONObject(i); if(m==null)continue;
                    String school=m.optString("school_name"); if(school.isEmpty())school="مرکز/مدرسه ثبت نشده";
                    Button b=btn("👤 "+m.optString("name")+"\nنام کاربری: "+m.optString("username")+
                            "\nمدرسه/مرکز: "+school+"\nوضعیت: "+(m.optBoolean("active",true)?"فعال":"غیرفعال"));
                    list.addView(b);gapView(list);b.setOnClickListener(v->managerEdit(m));
                }
            }
            public void fail(String m){toast(m);}
        });
        importBtn.setOnClickListener(v->{
            importBtn.setEnabled(false);
            api.request("POST","/api/managers/import-attached",new JSONObject(),new ApiClient.Callback(){
                public void ok(JSONObject o){importBtn.setEnabled(true);toast("لیست مدیران اضافه شد: "+o.optInt("added")+" مدیر جدید؛ "+o.optInt("skipped")+" مورد قبلی");reload[0].run();}
                public void fail(String m){importBtn.setEnabled(true);toast(m);}
            });
        });
        refresh.setOnClickListener(v->reload[0].run()); add.setOnClickListener(v->managerEdit(null)); reload[0].run(); back();
    }
    void managerEdit(JSONObject old){
        LinearLayout l=new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(10,4,10,4);

        EditText n=field("نام مدیر");
        EditText u=field("نام کاربری");
        EditText p=field(old==null?"رمز عبور":"رمز جدید (خالی = بدون تغییر)");
        p.setInputType(129);

        Spinner school=new Spinner(this);
        ArrayList<String> schoolNames=new ArrayList<>();
        ArrayList<Long> schoolIds=new ArrayList<>();
        l.addView(n);l.addView(u);l.addView(p);
        l.addView(tv("مدرسه مدیر",15));
        l.addView(school);

        if(old!=null){
            n.setText(old.optString("name"));
            u.setText(old.optString("username"));
        }

        AlertDialog dlg=new AlertDialog.Builder(this)
            .setTitle(old==null?"افزودن مدیر":"ویرایش مدیر")
            .setView(l)
            .setPositiveButton("ذخیره",null)
            .setNegativeButton("انصراف",null)
            .create();

        dlg.setOnShowListener(x->{
            Button save=dlg.getButton(AlertDialog.BUTTON_POSITIVE);
            save.setEnabled(false);

            api.request("GET","/api/schools",null,new ApiClient.Callback(){
                public void ok(JSONObject o){
                    JSONArray a=o.optJSONArray("data");
                    if(a!=null){
                        for(int i=0;i<a.length();i++){
                            JSONObject s=a.optJSONObject(i);
                            if(s==null)continue;
                            schoolNames.add(s.optString("name",canonicalSchoolName(i)));
                            schoolIds.add(s.optLong("id"));
                        }
                    }
                    school.setAdapter(new ArrayAdapter<String>(MainActivity.this,android.R.layout.simple_spinner_dropdown_item,schoolNames));
                    if(old!=null){
                        long sid=old.optLong("school_id");
                        for(int i=0;i<schoolIds.size();i++)if(schoolIds.get(i)==sid)school.setSelection(i);
                    }
                    save.setEnabled(!schoolIds.isEmpty());
                }
                public void fail(String m){toast(m);}
            });

            save.setOnClickListener(v->{
                String name=n.getText().toString().trim();
                String username=u.getText().toString().trim();
                String password=p.getText().toString();
                if(name.isEmpty()){toast("نام مدیر را وارد کنید");return;}
                if(username.isEmpty()){toast("نام کاربری را وارد کنید");return;}
                if(old==null && password.isEmpty()){toast("رمز عبور را وارد کنید");return;}
                if(schoolIds.isEmpty()){toast("مدرسه‌ای برای انتخاب وجود ندارد");return;}

                try{
                    JSONObject z=new JSONObject();
                    z.put("name",name);
                    z.put("username",username);
                    z.put("school_id",schoolIds.get(school.getSelectedItemPosition()));
                    if(!password.isEmpty())z.put("password",password);
                    String path=old==null?"/api/managers":"/api/managers/"+old.optLong("id");
                    api.request(old==null?"POST":"PATCH",path,z,new ApiClient.Callback(){
                        public void ok(JSONObject o){dlg.dismiss();managers();}
                        public void fail(String m){toast(m);}
                    });
                }catch(Exception e){toast("اطلاعات مدیر کامل نیست");}
            });

            if(old!=null && !"admin".equals(old.optString("username"))){
                dlg.setButton(AlertDialog.BUTTON_NEUTRAL,"حذف مدیر",(d,w)->
                    api.request("DELETE","/api/managers/"+old.optLong("id"),null,new ApiClient.Callback(){
                        public void ok(JSONObject o){toast("مدیر حذف شد");managers();}
                        public void fail(String m){toast(m);}
                    })
                );
            }
        });
        dlg.show();
    }

    String canonicalSchoolName(int index){
        String[] names={
            "دبستان نور ۱",
            "دبستان نور ۲",
            "دبستان تبیان ۱",
            "دبستان تبیان ۲",
            "مهد مرکزی صبح",
            "مهد مرکزی عصر",
            "مهد ابراهیم خلیل",
            "مهد سروستان",
            "مهد منظریه"
        };
        return index>=0&&index<names.length?names[index]:"مدرسه";
    }

    void schools(){
        base("مدیریت مدارس");
        Button add=btn("➕ افزودن مدرسه");
        content.addView(add);gap();
        LinearLayout list=new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        content.addView(list);
        final Runnable[] reload=new Runnable[1];
        reload[0]=()->api.request("GET","/api/schools",null,new ApiClient.Callback(){
            public void ok(JSONObject o){
                list.removeAllViews();
                JSONArray a=o.optJSONArray("data");
                int count=a==null?0:a.length();
                for(int i=0;i<count;i++){
                    JSONObject s=a.optJSONObject(i);
                    if(s==null)continue;
                    Button b=btn("🏫 "+s.optString("name",canonicalSchoolName(i))+"\nکد: "+s.optString("code")+" | "+(s.optBoolean("active",true)?"فعال":"غیرفعال"));
                    list.addView(b);gapView(list);
                    b.setOnClickListener(v->schoolEdit(s,reload[0]));
                }
                if(count==0)list.addView(tv("مدرسه‌ای ثبت نشده است.",16));
            }
            public void fail(String m){toast(m);}
        });
        add.setOnClickListener(v->schoolEdit(null,reload[0]));
        reload[0].run();
        back();
    }

    void schoolEdit(JSONObject old,Runnable reload){
        LinearLayout l=new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(10,4,10,4);
        EditText n=field("نام مدرسه");
        EditText type=field("نوع مدرسه");
        EditText code=field("کد مدرسه");
        CheckBox active=new CheckBox(this);
        active.setText("فعال");
        active.setChecked(old==null||old.optBoolean("active",true));
        l.addView(n);l.addView(type);l.addView(code);l.addView(active);
        if(old!=null){n.setText(old.optString("name"));type.setText(old.optString("type"));code.setText(old.optString("code"));}
        AlertDialog.Builder ab=new AlertDialog.Builder(this).setTitle(old==null?"افزودن مدرسه":"ویرایش مدرسه").setView(l).setPositiveButton("ذخیره",null).setNegativeButton("انصراف",null);
        if(old!=null)ab.setNeutralButton("حذف مدرسه",(d,w)->api.request("DELETE","/api/schools/"+old.optLong("id"),null,new ApiClient.Callback(){public void ok(JSONObject o){toast("مدرسه حذف شد");reload.run();}public void fail(String m){toast(m);}}));
        AlertDialog dlg=ab.create();
        dlg.setOnShowListener(x->dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
            String name=n.getText().toString().trim();
            String c=code.getText().toString().trim();
            if(name.isEmpty()){toast("نام مدرسه را وارد کنید");return;}
            if(c.isEmpty()){toast("کد مدرسه را وارد کنید");return;}
            JSONObject z=new JSONObject();
            try{z.put("name",name);z.put("type",type.getText().toString().trim());z.put("code",c);z.put("active",active.isChecked());}catch(Exception ignored){}
            String path=old==null?"/api/schools":"/api/schools/"+old.optLong("id");
            api.request(old==null?"POST":"PATCH",path,z,new ApiClient.Callback(){public void ok(JSONObject o){dlg.dismiss();reload.run();}public void fail(String m){toast(m);}});
        }));
        dlg.show();
    }

    void loadMessages(LinearLayout box){api.request("GET","/api/senior-messages",null,new ApiClient.Callback(){public void ok(JSONObject o){box.removeAllViews();JSONArray a=o.optJSONArray("data");if(a!=null)for(int i=0;i<a.length();i++){JSONObject m=a.optJSONObject(i);box.addView(tv("📢 "+m.optString("message")+"\n"+jalaliFromGregorian(m.optString("created_at")),15));if(i<a.length()-1)gapView(box);}api.request("GET","/api/cheque/alerts",null,new ApiClient.Callback(){public void ok(JSONObject z){JSONArray aa=z.optJSONArray("data");if(aa!=null)for(int i=0;i<aa.length();i++){JSONObject al=aa.optJSONObject(i);TextView t=tv(al.optString("message"),15);t.setTextColor(Color.rgb(190,30,30));t.setBackground(bg(Color.rgb(255,235,235),18));box.addView(t);gapView(box);}}public void fail(String x){}});if((a==null||a.length()==0)&&box.getChildCount()==0)box.addView(tv("پیامی از مدیر ارشد ثبت نشده است.",15));}public void fail(String m){box.addView(tv("پیام‌ها در دسترس نیستند.",14));}});}
    void messagesAdmin(){base("پیام به مدیران");EditText msg=field("متن پیام مدیر ارشد برای همه مدیران");content.addView(msg);gap();Button send=btn("📢 ارسال پیام");content.addView(send);gap();LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);final Runnable[] loadRef=new Runnable[1]; loadRef[0]=()->api.request("GET","/api/senior-messages",null,new ApiClient.Callback(){public void ok(JSONObject o){list.removeAllViews();JSONArray a=o.optJSONArray("data");for(int i=0;i<(a==null?0:a.length());i++){JSONObject m=a.optJSONObject(i);LinearLayout row=new LinearLayout(MainActivity.this);row.setOrientation(LinearLayout.VERTICAL);row.setBackground(bg(Color.WHITE,20));row.addView(tv(m.optString("message"),16));row.addView(tv("تاریخ: "+jalaliFromGregorian(m.optString("created_at")),13));Button del=btn("🗑 غیرفعال کردن پیام");row.addView(del);list.addView(row);gapView(list);del.setOnClickListener(v->api.request("DELETE","/api/senior-messages/"+m.optLong("id"),null,new ApiClient.Callback(){public void ok(JSONObject x){loadRef[0].run();}public void fail(String z){toast(z);}}));}}public void fail(String m){toast(m);}});send.setOnClickListener(v->{String text=msg.getText().toString().trim();if(text.isEmpty()){toast("متن پیام را وارد کنید");return;}JSONObject z=new JSONObject();try{z.put("message",text);}catch(Exception ignored){}api.request("POST","/api/senior-messages",z,new ApiClient.Callback(){public void ok(JSONObject o){msg.setText("");toast("پیام برای مدیران ارسال شد");loadRef[0].run();}public void fail(String m){toast(m);}});});loadRef[0].run();back();}

    void activityLog(){
        base("گزارش فعالیت مدیر");
        LinearLayout tools=new LinearLayout(this);tools.setOrientation(LinearLayout.HORIZONTAL);
        Button mine=btn("فعالیت من");tools.addView(mine,new LinearLayout.LayoutParams(0,70,1));
        Button all=btn("همه مدیران");if(isSeniorUser())tools.addView(all,new LinearLayout.LayoutParams(0,70,1));Button each=btn("فعالیت یک مدیر");if(isSeniorUser())content.addView(each);
        content.addView(tools);gap();
        LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);
        Runnable loadMine=()->loadActivityLogs(list,false);mine.setOnClickListener(v->loadMine.run());
        if(isSeniorUser())all.setOnClickListener(v->loadActivityLogs(list,true));if(isSeniorUser())each.setOnClickListener(v->chooseManagerActivity(list));
        loadMine.run();back();
    }
    void chooseManagerActivity(LinearLayout list){api.request("GET","/api/managers",null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");if(a==null||a.length()==0){toast("مدیری برای نمایش وجود ندارد");return;}ArrayList<JSONObject> managers=new ArrayList<>();ArrayList<String> names=new ArrayList<>();for(int i=0;i<a.length();i++){JSONObject m=a.optJSONObject(i);if(m!=null){managers.add(m);names.add(m.optString("name","مدیر")+" | "+m.optString("username",""));}}new AlertDialog.Builder(MainActivity.this).setTitle("انتخاب مدیر").setItems(names.toArray(new String[0]),(d,w)->loadActivityLogs(list,true,managers.get(w).optString("id"))).setNegativeButton("انصراف",null).show();}public void fail(String m){toast("دریافت فهرست مدیران انجام نشد: "+m);}});}
    void loadActivityLogs(LinearLayout list,boolean all){loadActivityLogs(list,all,"");}
    void loadActivityLogs(LinearLayout list,boolean all,String managerId){
        String path=all?"/api/activity-logs?all=1":"/api/activity-logs";if(!managerId.isEmpty())path+="&user_id="+Uri.encode(managerId);
        api.request("GET",path,null,new ApiClient.Callback(){public void ok(JSONObject o){list.removeAllViews();JSONArray ar=o.optJSONArray("data");if(ar==null||ar.length()==0){list.addView(tv("هنوز فعالیتی ثبت نشده است.",16));return;}for(int i=0;i<ar.length();i++){JSONObject x=ar.optJSONObject(i);if(x==null)continue;LinearLayout row=new LinearLayout(MainActivity.this);row.setOrientation(LinearLayout.VERTICAL);row.setPadding(10,10,10,10);row.setBackground(bg(Color.WHITE,20));row.addView(tv("🕒 "+x.optString("date"),14));String who=x.optString("user_name","");if(all&&!who.isEmpty())row.addView(tv("مدیر: "+who+" | مدرسه: "+x.optString("school_id",""),14));row.addView(tv(x.optString("description",x.optString("action","")),16));if(!x.optString("entity_type","").isEmpty())row.addView(tv("بخش: "+x.optString("entity_type")+" | شناسه: "+x.optString("entity_id",""),13));list.addView(row);gapView(list);}}public void fail(String m){toast(m);}});
    }

    void accountStatement(){
        try{
            base("ریز گردش حساب");
            EditText q=edit("جست‌وجوی نام یا کد ملی دانش‌آموز");Button search=btn("🔎 جست‌وجوی گردش دانش‌آموز");content.addView(search);gap();Button expenseHistory=btn("🧾 نمایش تاریخچه هزینه‌ها");content.addView(expenseHistory);gap();
            LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);
            search.setOnClickListener(v->{String term=q.getText().toString().trim();if(term.isEmpty()){toast("نام یا کد ملی را وارد کنید");return;}api.request("GET","/api/students?q="+Uri.encode(term),null,new ApiClient.Callback(){public void ok(JSONObject o){try{JSONArray a=o.optJSONArray("data");if(a==null||a.length()==0){toast("دانش‌آموز پیدا نشد");return;}if(a.length()==1){loadStatement(a.optJSONObject(0),list);}else{String[] names=new String[a.length()];for(int i=0;i<a.length();i++){JSONObject x=a.optJSONObject(i);names[i]=x.optString("name")+" | "+x.optString("national_id");}new AlertDialog.Builder(MainActivity.this).setTitle("انتخاب دانش‌آموز").setItems(names,(d,w)->loadStatement(a.optJSONObject(w),list)).show();}}catch(Exception e){toast("نمایش دانش‌آموزان انجام نشد");}}public void fail(String m){toast(m);}});});
            back();
        }catch(Exception e){toast("باز کردن ریز گردش حساب انجام نشد");showHome();}
    }
    void loadExpenseStatement(LinearLayout list){
        list.removeAllViews();list.addView(tv("تاریخچه هزینه‌ها",19));
        api.request("GET","/api/transactions?kind="+Uri.encode("هزینه"),null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray rows=o.optJSONArray("data");if(rows==null||rows.length()==0){list.addView(tv("هزینه‌ای برای نمایش وجود ندارد.",15));return;}for(int i=0;i<rows.length();i++){JSONObject t=rows.optJSONObject(i);if(t==null)continue;LinearLayout card=sectionBox(list,"هزینه | "+(t.optString("expense_category_name").isEmpty()?expenseComment(t):t.optString("expense_category_name")));card.addView(tv("مبلغ: "+fmt(t.optLong("amount"))+" ریال",15));card.addView(tv("تاریخ: "+jalaliFromGregorian(t.optString("date"))+" | مدرسه: "+t.optString("school_name",""),14));String desc=expenseComment(t);if(!desc.isEmpty())card.addView(tv("توضیحات: "+desc,14));addAttachmentPreview(card,t);}}public void fail(String m){list.addView(tv("دریافت تاریخچه هزینه‌ها انجام نشد: "+m,15));}});
    }

    void loadStatement(JSONObject st,LinearLayout list){
        if(st==null){toast("دانش‌آموز انتخاب نشده است");return;}
        try{
            final long studentId=st.optLong("id"); if(studentId<=0){toast("شناسه دانش‌آموز معتبر نیست");return;}
            list.removeAllViews();
            list.addView(tv("ریز گردش: "+st.optString("name","")+" | کد ملی: "+st.optString("national_id",""),18));
            Button pdf=btn("📄 خروجی PDF"); list.addView(pdf); gapView(list);
            api.request("GET","/api/transactions?student_id="+studentId,null,new ApiClient.Callback(){
                public void ok(JSONObject o){try{
                    JSONArray a=o==null?null:o.optJSONArray("data"); ArrayList<JSONObject> rows=new ArrayList<>(); long balance=0;
                    if(a!=null) for(int i=0;i<a.length();i++){JSONObject t=a.optJSONObject(i);if(t==null)continue;String k=t.optString("kind","");if(!"شهریه".equals(k)&&!"شهریه_بدهی".equals(k))continue;long amount=t.optLong("amount",0);if(amount<0)amount=0;rows.add(t);if("شهریه_بدهی".equals(k))balance+=amount;else balance-=amount;}
                    list.addView(tv("مانده بدهی: "+fmt(Math.max(0,balance))+" ریال",17));
                    if(rows.isEmpty())list.addView(tv("گردشی ثبت نشده است.",15));
                    for(JSONObject t:rows){LinearLayout c=new LinearLayout(MainActivity.this);c.setOrientation(LinearLayout.VERTICAL);c.setPadding(10,10,10,10);c.setBackground(bg(Color.WHITE,20));String title="شهریه_بدهی".equals(t.optString("kind"))?"بدهی":"دریافت";long amount=t.optLong("amount",0);c.addView(tv(title+" | "+fmt(Math.max(0,amount))+" ریال",15));String date=t.optString("date","");String track=t.optString("tracking_code","");c.addView(tv("تاریخ: "+jalaliFromGregorian(date)+" | پیگیری: "+(track.isEmpty()?"—":track),14));String comment=t.optString("comment","");if(!comment.isEmpty())c.addView(tv("توضیحات: "+comment,14));list.addView(c);gapView(list);}
                    final ArrayList<JSONObject> rowsForPdf=new ArrayList<>(rows);final long balanceForPdf=balance;pdf.setOnClickListener(v->exportStatementPdf(st,rowsForPdf,balanceForPdf));
                }catch(Exception e){list.addView(tv("نمایش ریز گردش با مشکل روبه‌رو شد.",15));}}
                public void fail(String m){list.addView(tv("دریافت ریز گردش انجام نشد: "+(m==null?"خطای سرویس":m),15));}
            });
        }catch(Exception e){toast("باز کردن ریز گردش حساب انجام نشد");}
    }

    void exportStatementPdf(JSONObject st,ArrayList<JSONObject> rows,long balance){
        PdfDocument doc=null;java.io.FileOutputStream out=null;
        try{doc=new PdfDocument();Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);paint.setTextSize(12);int pageNo=1;PdfDocument.PageInfo info=new PdfDocument.PageInfo.Builder(595,842,pageNo).create();PdfDocument.Page page=doc.startPage(info);android.graphics.Canvas c=page.getCanvas();paint.setTextAlign(Paint.Align.RIGHT);float y=50;c.drawText("ریز گردش حساب دانش‌آموز",560,y,paint);y+=28;c.drawText("نام: "+st.optString("name",""),560,y,paint);y+=22;c.drawText("کد ملی: "+st.optString("national_id",""),560,y,paint);y+=22;c.drawText("مانده بدهی: "+fmt(Math.max(0,balance))+" ریال",560,y,paint);y+=30;if(rows!=null)for(JSONObject t:rows){if(t==null)continue;if(y>805){doc.finishPage(page);info=new PdfDocument.PageInfo.Builder(595,842,++pageNo).create();page=doc.startPage(info);c=page.getCanvas();paint.setTextAlign(Paint.Align.RIGHT);y=50;}String title="شهریه_بدهی".equals(t.optString("kind"))?"بدهی":"دریافت";c.drawText(jalaliFromGregorian(t.optString("date",""))+" | "+title+" | "+fmt(Math.max(0,t.optLong("amount",0)))+" ریال",560,y,paint);y+=22;}doc.finishPage(page);java.io.ByteArrayOutputStream pdfBytes=new java.io.ByteArrayOutputStream();doc.writeTo(pdfBytes);byte[] bytes=pdfBytes.toByteArray();String filename="riz-gardesh-"+st.optLong("id")+"-"+System.currentTimeMillis()+".pdf";if(Build.VERSION.SDK_INT>=29){ContentValues values=new ContentValues();values.put(MediaStore.Downloads.DISPLAY_NAME,filename);values.put(MediaStore.Downloads.MIME_TYPE,"application/pdf");values.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS+"/SchoolFinance");Uri saved=getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);if(saved==null)throw new Exception("ساخت فایل در پوشه دانلود انجام نشد");try(java.io.OutputStream stream=getContentResolver().openOutputStream(saved)){if(stream==null)throw new Exception("بازکردن فایل مقصد انجام نشد");stream.write(bytes);stream.flush();}Uri finalUri=saved;runOnUiThread(()->new AlertDialog.Builder(MainActivity.this).setTitle("PDF ذخیره شد").setMessage("فایل در پوشه Downloads/SchoolFinance ذخیره شد.").setPositiveButton("باز کردن",(d,w)->{try{Intent open=new Intent(Intent.ACTION_VIEW);open.setDataAndType(finalUri,"application/pdf");open.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivity(open);}catch(Exception ex){toast("فایل ذخیره شد؛ برای باز کردن آن از پوشه دانلودها استفاده کنید.");}}).setNegativeButton("باشه",null).show());}else{java.io.File dir=Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);dir=new java.io.File(dir,"SchoolFinance");if(!dir.exists()&&!dir.mkdirs())throw new Exception("ساخت پوشه دانلود انجام نشد");java.io.File file=new java.io.File(dir,filename);try(java.io.FileOutputStream stream=new java.io.FileOutputStream(file)){stream.write(bytes);stream.flush();}toast("PDF ذخیره شد: "+file.getAbsolutePath());}}
        catch(Exception e){toast("ساخت PDF ریز گردش انجام نشد");}
        finally{try{if(out!=null)out.close();}catch(Exception ignored){}try{if(doc!=null)doc.close();}catch(Exception ignored){}}
    }

    void myClaim(){base("طلب من از مدرسه");LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);content.addView(box);api.request("GET","/api/my-claim",null,new ApiClient.Callback(){public void ok(JSONObject o){box.removeAllViews();box.addView(tv("جمع طلب من از مدرسه: "+fmt(o.optLong("total"))+" ریال",20));JSONArray a=o.optJSONArray("data");if(a==null||a.length()==0){box.addView(tv("هنوز هزینه‌ای از حساب شخصی شما ثبت نشده است.",15));return;}for(int i=0;i<a.length();i++){JSONObject x=a.optJSONObject(i);LinearLayout r=new LinearLayout(MainActivity.this);r.setOrientation(LinearLayout.VERTICAL);r.setPadding(10,10,10,10);r.setBackground(bg(Color.WHITE,20));r.addView(tv("مبلغ: "+fmt(x.optLong("amount"))+" ریال | "+x.optString("category"),15));r.addView(tv("تاریخ: "+jalaliFromGregorian(x.optString("date"))+" | مدرسه: "+x.optString("school_name"),14));r.addView(tv("توضیحات: "+x.optString("description"),14));box.addView(r);gapView(box);}}public void fail(String m){toast(m);}});back();}
    void checkForUpdate(){
        api.request("GET","/api/app-version",null,new ApiClient.Callback(){
            public void ok(JSONObject o){
                String v=o.optString("version","2.14"); String url=o.optString("apk_url","").trim();
                if(!isNewerVersion(v,"2.14.0")){return;}
                if(url.isEmpty()){new AlertDialog.Builder(MainActivity.this).setTitle("آپدیت نرم‌افزار").setMessage("نسخه جدید "+v+" منتشر شده است، اما آدرس APK هنوز روی سرور ثبت نشده است.").setPositiveButton("باشه",null).show();return;}
                new AlertDialog.Builder(MainActivity.this).setTitle("آپدیت نرم‌افزار").setMessage("نسخه جدید "+v+" آماده است. برنامه فایل را دریافت و نصب آن را شروع می‌کند.").setPositiveButton("آپدیت",(d,w)->downloadAndInstallUpdate(url,v)).setNegativeButton("بعداً",null).show();
            }
            public void fail(String m){toast("بررسی نسخه جدید انجام نشد");}
        });
    }
    boolean isNewerVersion(String remote,String local){try{String[] a=remote.replace("v","").split("\\.");String[] b=local.replace("v","").split("\\.");for(int i=0;i<Math.max(a.length,b.length);i++){int x=i<a.length?Integer.parseInt(a[i]):0;int y=i<b.length?Integer.parseInt(b[i]):0;if(x!=y)return x>y;}return false;}catch(Exception e){return !remote.equals(local);}}
    void downloadAndInstallUpdate(String url,String version){
        Toast.makeText(this,"در حال دریافت نسخه "+version+"...",Toast.LENGTH_LONG).show();
        new Thread(()->{java.io.File outFile=null;try{
            java.net.URL u=new java.net.URL(url);java.net.HttpURLConnection c=(java.net.HttpURLConnection)u.openConnection();c.setInstanceFollowRedirects(true);c.setConnectTimeout(20000);c.setReadTimeout(120000);c.connect();int code=c.getResponseCode();if(code<200||code>=400)throw new Exception("HTTP "+code);
            outFile=new java.io.File(getExternalCacheDir()!=null?getExternalCacheDir():getCacheDir(),"SchoolFinanceApp-"+version+".apk");
            try(java.io.InputStream in=c.getInputStream();java.io.FileOutputStream out=new java.io.FileOutputStream(outFile)){byte[] buf=new byte[16384];int n;while((n=in.read(buf))!=-1)out.write(buf,0,n);}c.disconnect();
            java.io.File finalFile=outFile;runOnUiThread(()->installApk(finalFile));
        }catch(Exception e){runOnUiThread(()->toast("دریافت آپدیت انجام نشد. اتصال اینترنت و آدرس APK را بررسی کنید."));}}).start();
    }
    void installApk(java.io.File file){
        if(file==null||!file.exists()){toast("فایل آپدیت پیدا نشد");return;}
        if(Build.VERSION.SDK_INT>=26&&!getPackageManager().canRequestPackageInstalls()){
            new AlertDialog.Builder(this).setTitle("اجازه نصب آپدیت").setMessage("برای نصب خودکار نسخه جدید، یک‌بار اجازه «نصب برنامه‌های ناشناس» را برای این برنامه فعال کنید.").setPositiveButton("باز کردن تنظیمات",(d,w)->{try{Intent i=new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+getPackageName()));startActivity(i);}catch(Exception e){startActivity(new Intent(Settings.ACTION_SECURITY_SETTINGS));}}).setNegativeButton("بعداً",null).show();return;
        }
        try{
            Uri apkUri=androidx.core.content.FileProvider.getUriForFile(this,getPackageName()+".fileprovider",file);
            Intent i=new Intent(Intent.ACTION_VIEW);i.setDataAndType(apkUri,"application/vnd.android.package-archive");i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivity(i);
        }catch(Exception e){toast("اجرای نصب آپدیت انجام نشد");}
    }

    void settings(){base("تنظیمات");Button update=btn("🔄 بررسی و دریافت به‌روزرسانی برنامه");content.addView(update);update.setOnClickListener(v->checkForUpdate());gap();content.addView(tv("ارتباط با سرویس: Google Apps Script\nپایگاه داده: Google Sheets / Google Drive",16));gap();content.addView(tv("تم رنگی",18));String[] names={"سبز فیروزه‌ای","آبی","بنفش","نارنجی","سبز","سبز تیره"};Spinner themeSpinner=new Spinner(this);themeSpinner.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,names));themeSpinner.setSelection(themeIndex);content.addView(themeSpinner,new LinearLayout.LayoutParams(-1,(int)fs(68)));themeSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener(){public void onNothingSelected(AdapterView<?> p){}public void onItemSelected(AdapterView<?> p,View v,int pos,long id){if(pos!=themeIndex){themeIndex=pos;prefs.edit().putInt("theme_index",themeIndex).apply();settings();}}});gap();content.addView(tv("اندازه نوشته‌ها",18));LinearLayout row=new LinearLayout(this);row.setGravity(Gravity.CENTER);Button minus=btn("➖\nA");Button plus=btn("➕\nA");minus.setTextSize(fs(21));plus.setTextSize(fs(21));int wh=(int)fs(105);row.addView(minus,new LinearLayout.LayoutParams(wh,wh));Space sp=new Space(this);row.addView(sp,new LinearLayout.LayoutParams(18,1));row.addView(plus,new LinearLayout.LayoutParams(wh,wh));content.addView(row);gap();content.addView(tv("اندازه فعلی: "+Math.round(fontScale*100)+"٪",15));minus.setOnClickListener(v->{fontScale=Math.max(.85f,fontScale-.05f);prefs.edit().putFloat("font_scale",fontScale).apply();settings();});plus.setOnClickListener(v->{fontScale=Math.min(1.25f,fontScale+.05f);prefs.edit().putFloat("font_scale",fontScale).apply();settings();});Button out=btn("خروج از حساب");content.addView(out);gap();out.setOnClickListener(v->{api.request("POST","/api/logout",null,new ApiClient.Callback(){public void ok(JSONObject o){api.clearToken();showLogin();}public void fail(String m){api.clearToken();showLogin();}});});back();}

    String fmt(long n){return NumberFormat.getNumberInstance(Locale.US).format(n);}
    String encrypt(String plain){try{KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);if(!ks.containsAlias(KEY_ALIAS)){KeyGenerator kg=KeyGenerator.getInstance("AES","AndroidKeyStore");kg.init(new android.security.keystore.KeyGenParameterSpec.Builder(KEY_ALIAS,android.security.keystore.KeyProperties.PURPOSE_ENCRYPT|android.security.keystore.KeyProperties.PURPOSE_DECRYPT).setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE).build());kg.generateKey();}SecretKey key=((KeyStore.SecretKeyEntry)ks.getEntry(KEY_ALIAS,null)).getSecretKey();Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key);byte[] iv=c.getIV(),ct=c.doFinal(plain.getBytes(StandardCharsets.UTF_8));return Base64.encodeToString(iv,2)+":"+Base64.encodeToString(ct,2);}catch(Exception e){return "";}}
    String decrypt(String enc){try{if(enc==null||enc.isEmpty())return "";String[] p=enc.split(":",2);KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);SecretKey key=((KeyStore.SecretKeyEntry)ks.getEntry(KEY_ALIAS,null)).getSecretKey();Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,Base64.decode(p[0],2)));return new String(c.doFinal(Base64.decode(p[1],2)),StandardCharsets.UTF_8);}catch(Exception e){return "";}}
}
