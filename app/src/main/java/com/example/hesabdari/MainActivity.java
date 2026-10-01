package com.example.hesabdari;

import android.app.*;
import android.os.*;
import android.content.*;
import android.net.Uri;
import android.provider.MediaStore;
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
import java.text.SimpleDateFormat;
import java.util.Calendar;

public class MainActivity extends Activity {
    boolean isAdminRole(){ return "admin".equals(me.optString("role")) || "senior".equals(me.optString("role")); }
    ApiClient api; LinearLayout root, content; JSONObject me; Uri pendingImage, pendingBank, cameraUri;
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
    TextView tv(String s,float size){TextView t=new TextView(this);t.setText(s);t.setTextSize(fs(size));t.setTextColor(ink);t.setTypeface(yekanBold());t.setPadding(18,15,18,15);t.setGravity(Gravity.RIGHT|Gravity.CENTER_VERTICAL);return t;}
    GradientDrawable bg(int c,float r){GradientDrawable g=new GradientDrawable();g.setColor(c);g.setCornerRadius(r);return g;}
    Button btn(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextSize(fs(16));b.setTextColor(Color.WHITE);b.setTypeface(yekanBold());b.setMinHeight((int)fs(68));b.setPadding(14,10,14,10);b.setBackground(bg(accent(),24));return b;}
    Button cardBtn(String s){Button b=btn(s);b.setTextSize(fs(17));b.setMinHeight((int)fs(145));b.setGravity(Gravity.CENTER);b.setBackground(bg(Color.WHITE,30));b.setTextColor(navy);return b;}
    void gap(){Space s=new Space(this);content.addView(s,new LinearLayout.LayoutParams(1,14));}
    void gapView(LinearLayout l){Space s=new Space(this);l.addView(s,new LinearLayout.LayoutParams(1,10));}
    void base(String title){
        root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(14,10,14,14);root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        GradientDrawable shell=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{Color.rgb(238,248,249),Color.rgb(255,249,232),Color.rgb(235,240,250)});root.setBackground(shell);
        TextView h=tv(title,23);h.setTextColor(navy);h.setTypeface(yekanBold());h.setGravity(Gravity.RIGHT);root.addView(h);
        TextView brand=tv("حسابداری مدارس مجموعه مدرسه القرآن کریم شهرضا",16);brand.setTextColor(accent());brand.setTypeface(Typeface.create("Neyriz",Typeface.BOLD));brand.setGravity(Gravity.RIGHT);root.addView(brand);
        content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);content.setPadding(3,3,3,12);
        ScrollView sv=new ScrollView(this);sv.setFillViewport(true);sv.addView(content);root.addView(sv,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
    }
    EditText field(String hint){EditText e=new EditText(this);e.setHint(hint);e.setTextSize(fs(16));e.setTextColor(ink);e.setHintTextColor(Color.rgb(125,135,145));e.setTypeface(yekanBold());e.setPadding(18,14,18,14);e.setBackground(bg(Color.WHITE,22));return e;}
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
        base("سامانه یکپارچه حسابداری مدارس");
        content.addView(tv("ورود امن مدیران",22));
        TextView sub=tv("اطلاعات ورود می‌تواند روی همین دستگاه ذخیره شود.",14);sub.setTextColor(Color.DKGRAY);content.addView(sub);gap();
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
        String[][] ms={{"👨‍🎓\nدانش‌آموزان","students"},{"💳\nشهریه و درآمد","tuition"},{"🧾\nهزینه‌ها","expenses"},{"🔄\nتراکنش‌ها","transactions"},{"📊\nگزارش مالی","report"},{"⚙️\nتنظیمات","settings"}};
        if(isAdminRole())ms=new String[][]{{"👨‍🎓\nدانش‌آموزان","students"},{"💳\nشهریه و درآمد","tuition"},{"🧾\nهزینه‌ها","expenses"},{"🏦\nتطبیق بانک","bank"},{"👤\nمدیران","managers"},{"🏫\nمدارس","schools"},{"📊\nگزارش مالی","report"},{"📥\nخروجی پارسیان","export"},{"📢\nپیام به مدیران","messages"},{"⚙️\nتنظیمات","settings"}};
        GridLayout grid=new GridLayout(this);grid.setColumnCount(2);grid.setUseDefaultMargins(false);content.addView(grid);
        for(String[] m:ms){Button b=cardBtn(m[0]);GridLayout.LayoutParams gp=new GridLayout.LayoutParams();gp.width=0;gp.height=(int)fs(145);gp.columnSpec=GridLayout.spec(GridLayout.UNDEFINED,1f);gp.setMargins(7,21,7,21);grid.addView(b,gp);b.setOnClickListener(v->{switch(m[1]){case"students":students();break;case"tuition":tuition();break;case"expenses":expenses();break;case"bank":bank();break;case"managers":managers();break;case"schools":schools();break;case"report":report();break;case"transactions":transactionsScreen();break;case"export":exportParsian();break;case"messages":messagesAdmin();break;default:settings();}});}
        gap();content.addView(tv("پیام کاربر ارشد به مدیران",19));LinearLayout msgBox=new LinearLayout(this);msgBox.setOrientation(LinearLayout.VERTICAL);msgBox.setPadding(8,4,8,8);msgBox.setBackground(bg(Color.WHITE,24));content.addView(msgBox);loadMessages(msgBox);
    }
    void back(){gap();Button b=btn("↩ بازگشت به داشبورد");content.addView(b);b.setOnClickListener(v->showHome());}
    void students(){
        base("دانش‌آموزان");
        Button add=btn("➕ افزودن دانش‌آموز");content.addView(add);gap();Button imp=btn("📥 ورود دانش‌آموزان از Excel");content.addView(imp);gap();
        EditText q=edit("جست‌وجوی نام، کد یا کد ملی (اختیاری)");Button search=btn("🔎 جست‌وجو");content.addView(search);gap();
        LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);
        Runnable load=()->api.request("GET","/api/students?q="+Uri.encode(q.getText().toString()),null,new ApiClient.Callback(){public void ok(JSONObject o){list.removeAllViews();JSONArray a=o.optJSONArray("data");if(a==null||a.length()==0){list.addView(tv("دانش‌آموزی یافت نشد.",16));return;}for(int i=0;i<a.length();i++){JSONObject s=a.optJSONObject(i);Button r=btn("👤 "+s.optString("name")+"\n"+s.optString("grade")+"  |  "+s.optString("national_id")+"\n"+s.optString("phone"));list.addView(r);gapView(list);r.setOnClickListener(v->studentEdit(s));}}public void fail(String m){toast(m);}});search.setOnClickListener(v->load.run());add.setOnClickListener(v->studentEdit(null));imp.setOnClickListener(v->pickStudentExcel());load.run();back();
    }
    void studentEdit(JSONObject old){
        LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);l.setPadding(10,4,10,4);
        TextView error=new TextView(this);error.setTextColor(Color.rgb(190,30,30));error.setTextSize(fs(15));error.setVisibility(View.GONE);l.addView(error);
        EditText n=field("نام و نام خانوادگی *");Spinner g=new Spinner(this);g.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,grades));
        EditText phone=field("شماره تلفن، مثال 09131112222 *");phone.setInputType(2);phone.setKeyListener(DigitsKeyListener.getInstance("0123456789"));phone.setFilters(new InputFilter[]{new InputFilter.LengthFilter(11)});
        EditText national=field("کد ملی، دقیقاً ۱۰ رقم انگلیسی *");national.setInputType(2);national.setKeyListener(DigitsKeyListener.getInstance("0123456789"));national.setFilters(new InputFilter[]{new InputFilter.LengthFilter(10)});
        final String[] parsianCode={old==null?"":old.optString("parsian_account_code","")};TextView codeInfo=tv("کد پارسیان دانش‌آموز هنوز انتخاب نشده است.",14);codeInfo.setBackground(bg(Color.WHITE,20));
        Button chooseCode=btn("🔢 انتخاب حساب پارسیان");Button newCode=btn("➕ ساخت حساب تفصیلی جدید بر اساس سرفصل پارسیان");
        LinearLayout schoolBox=new LinearLayout(this);schoolBox.setOrientation(LinearLayout.VERTICAL);Spinner school=new Spinner(this);TextView schoolAccount=tv("",14);schoolAccount.setBackground(bg(Color.WHITE,20));
        ArrayList<String> schoolNames=new ArrayList<>();ArrayList<Long> schoolIds=new ArrayList<>();
        l.addView(n);l.addView(tv("پایه تحصیلی *",14));l.addView(g);l.addView(phone);l.addView(national);l.addView(tv("حساب تفصیلی پارسیان *",14));l.addView(codeInfo);l.addView(chooseCode);gapView(l);l.addView(newCode);gapView(l);
        if(old!=null){n.setText(old.optString("name"));phone.setText(old.optString("phone"));national.setText(old.optString("national_id"));for(int i=0;i<grades.length;i++)if(grades[i].equals(old.optString("grade")))g.setSelection(i);}
        Runnable updateCodeInfo=()->{String c=parsianCode[0];if(c.matches("\\d+-\\d+-\\d+")){String[] p=c.split("-");codeInfo.setText("کد کامل: "+c+"\nکد کلی: "+p[2]+"   |   کد معین: "+p[1]+"   |   کد تفصیلی: "+p[0]);}else codeInfo.setText("کد پارسیان دانش‌آموز هنوز انتخاب نشده است.");};updateCodeInfo.run();
        if(isAdminRole()){l.addView(tv("مدرسه دانش‌آموز *",14));l.addView(school);l.addView(schoolAccount);}else{l.addView(schoolAccount);}
        Runnable loadSchoolMap=()->api.request("GET","/api/parsian/school-map",null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");String wanted=me.optString("school_name","");if(isAdminRole()&&!schoolIds.isEmpty())wanted=schoolNames.get(school.getSelectedItemPosition());for(int i=0;i<(a==null?0:a.length());i++){JSONObject x=a.optJSONObject(i);if(wanted.equals(x.optString("school_name"))){JSONObject t=x.optJSONObject("tuition");schoolAccount.setText(t==null?"سرفصل شهریه پارسیان برای این مدرسه تعریف نشده است":"سرفصل درآمد شهریه مدرسه در پارسیان: "+t.optString("code")+"\n"+t.optString("name"));break;}}}public void fail(String m){}});
        AlertDialog dlg=new AlertDialog.Builder(this).setTitle(old==null?"افزودن دانش‌آموز":"ویرایش دانش‌آموز").setView(l).setPositiveButton("ذخیره",null).setNegativeButton("انصراف",null).create();
        chooseCode.setOnClickListener(v->{LinearLayout ql=new LinearLayout(this);ql.setOrientation(LinearLayout.VERTICAL);EditText q=field("جست‌وجو با کد یا نام حساب");ql.addView(q);LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);ScrollView sv=new ScrollView(this);sv.addView(list);ql.addView(sv,new LinearLayout.LayoutParams(-1,0,1));AlertDialog ad=new AlertDialog.Builder(this).setTitle("حساب‌های تفصیلی پارسیان").setView(ql).setNegativeButton("بستن",null).create();Runnable load=()->api.request("GET","/api/parsian/student-accounts?q="+Uri.encode(q.getText().toString().trim()),null,new ApiClient.Callback(){public void ok(JSONObject o){list.removeAllViews();JSONArray a=o.optJSONArray("data");int n=Math.min(100,a==null?0:a.length());for(int i=0;i<n;i++){JSONObject x=a.optJSONObject(i);Button b=btn(x.optString("code")+"\n"+x.optString("name"));b.setMinHeight((int)fs(72));list.addView(b);gapView(list);b.setOnClickListener(vv->{parsianCode[0]=x.optString("code");updateCodeInfo.run();ad.dismiss();});}if(n==0)list.addView(tv("حسابی پیدا نشد.",15));}public void fail(String m){toast(m);}});q.addTextChangedListener(new TextWatcher(){public void beforeTextChanged(CharSequence s,int st,int c,int a){}public void onTextChanged(CharSequence s,int st,int b,int c){load.run();}public void afterTextChanged(Editable e){}});ad.show();load.run();});
        newCode.setOnClickListener(v->{Spinner sp=new Spinner(this);String[] opts={"1 - گروه معین 1","2 - گروه معین 2","3 - گروه معین 3","4 - گروه معین 4"};sp.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,opts));new AlertDialog.Builder(this).setTitle("گروه معین پارسیان").setMessage("کد کلی دانش‌آموزان در فایل پارسیان 67 است. کد معین را مطابق ساختار حساب‌های موجود انتخاب کنید.").setView(sp).setPositiveButton("ساخت",(d,w)->{JSONObject z=new JSONObject();try{z.put("name",n.getText().toString().trim());z.put("grade",grades[g.getSelectedItemPosition()]);z.put("moeen",String.valueOf(sp.getSelectedItemPosition()+1));}catch(Exception ignored){}api.request("POST","/api/parsian/student-account/allocate",z,new ApiClient.Callback(){public void ok(JSONObject o){JSONObject x=o.optJSONObject("data");if(x!=null){parsianCode[0]=x.optString("code");updateCodeInfo.run();toast("حساب پارسیان ایجاد شد: "+parsianCode[0]);}}public void fail(String m){toast(m);}});}).setNegativeButton("انصراف",null).show();});
        dlg.setOnShowListener(x->{Button save=dlg.getButton(AlertDialog.BUTTON_POSITIVE);if(isAdminRole()){save.setEnabled(false);api.request("GET","/api/schools",null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");if(a!=null){for(int i=0;i<a.length();i++){JSONObject ss=a.optJSONObject(i);if(ss==null)continue;schoolNames.add(ss.optString("name",canonicalSchoolName(i)));schoolIds.add(ss.optLong("id"));}}school.setAdapter(new ArrayAdapter<String>(MainActivity.this,android.R.layout.simple_spinner_dropdown_item,schoolNames));if(old!=null){long sid=old.optLong("school_id");for(int i=0;i<schoolIds.size();i++)if(schoolIds.get(i)==sid)school.setSelection(i);}save.setEnabled(!schoolIds.isEmpty());loadSchoolMap.run();}public void fail(String m){showFormError(error,m);}});}else loadSchoolMap.run();save.setOnClickListener(v->{String name=n.getText().toString().trim(),p=phone.getText().toString().trim(),nid=national.getText().toString().trim();if(name.isEmpty()){showFormError(error,"نام دانش‌آموز را وارد کنید.");return;}if(!p.matches("0\\d{10}")){showFormError(error,"شماره تلفن باید دقیقاً مانند 09131112222 باشد.");return;}if(!nid.matches("\\d{10}")){showFormError(error,"کد ملی باید دقیقاً ۱۰ رقم انگلیسی باشد.");return;}if(!parsianCode[0].matches("\\d+-\\d+-67")){showFormError(error,"حساب پارسیان دانش‌آموز الزامی است.");return;}if(isAdminRole()&&schoolIds.isEmpty()){showFormError(error,"مدرسه برای انتخاب وجود ندارد.");return;}try{JSONObject z=new JSONObject();z.put("name",name);z.put("grade",grades[g.getSelectedItemPosition()]);z.put("phone",p);z.put("national_id",nid);z.put("parsian_account_code",parsianCode[0]);if(isAdminRole())z.put("school_id",schoolIds.get(school.getSelectedItemPosition()));String path=old==null?"/api/students":"/api/students/"+old.optLong("id");api.request(old==null?"POST":"PATCH",path,z,new ApiClient.Callback(){public void ok(JSONObject o){dlg.dismiss();students();}public void fail(String m){showFormError(error,m);}});}catch(Exception e){showFormError(error,"اطلاعات دانش‌آموز کامل نیست.");}});});dlg.show();
    }

    void showFormError(TextView error,String message){
        error.setText(message==null||message.trim().isEmpty()?"خطا در ثبت اطلاعات":message);
        error.setVisibility(View.VISIBLE);
    }

    void pickStudentExcel(){Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.setType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,89);}
    void tuition(){
        base("شهریه و درآمد");
        EditText search=edit("جست‌وجوی نام، کد یا کد ملی");
        Button find=btn("🔎 جست‌وجوی دانش‌آموز");content.addView(find);gap();
        TextView selected=tv("دانش‌آموزی انتخاب نشده",17);selected.setBackground(bg(Color.WHITE,22));content.addView(selected);gap();
        LinearLayout history=new LinearLayout(this);history.setOrientation(LinearLayout.VERTICAL);content.addView(history);
        Button debt=btn("➕ ثبت بدهی شهریه");Button pay=btn("💳 ثبت پرداخت شهریه");content.addView(debt);gap();content.addView(pay);gap();
        final JSONObject[] student={null};
        Runnable choose=()->{String term=search.getText().toString().trim();if(term.isEmpty()){toast("نام یا کد ملی دانش‌آموز را وارد کنید.");search.requestFocus();return;}api.request("GET","/api/students?q="+Uri.encode(term),null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray ar=o.optJSONArray("data");if(ar==null||ar.length()==0){toast("دانش‌آموزی با این مشخصات پیدا نشد");return;}String[] names=new String[ar.length()];for(int i=0;i<ar.length();i++){JSONObject x=ar.optJSONObject(i);names[i]=x.optString("name")+" | "+x.optString("grade")+" | "+x.optString("national_id");}new AlertDialog.Builder(MainActivity.this).setTitle("نتیجه جست‌وجو").setItems(names,(d,w)->{student[0]=ar.optJSONObject(w);selected.setText("انتخاب: "+student[0].optString("name")+" | "+student[0].optString("grade")+"\nکد ملی: "+student[0].optString("national_id"));loadBalance(student[0],selected);loadTuitionHistory(student[0],history);}).show();}public void fail(String m){toast(m);}});};
        find.setOnClickListener(v->choose.run());
        debt.setOnClickListener(v->{if(student[0]==null){toast("ابتدا دانش‌آموز را جست‌وجو و انتخاب کنید");return;}amountDialog("ثبت بدهی شهریه","/api/tuition/debt",student[0],false,null);});
        pay.setOnClickListener(v->{if(student[0]==null){toast("ابتدا دانش‌آموز را جست‌وجو و انتخاب کنید");return;}amountDialog("ثبت پرداخت شهریه","/api/tuition/payment",student[0],true,null);});
        back();
    }
    void loadTuitionHistory(JSONObject student,LinearLayout history){history.removeAllViews();api.request("GET","/api/transactions?student_id="+student.optLong("id"),null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");history.addView(tv("سوابق شهریه",18));if(a==null||a.length()==0){history.addView(tv("هنوز تراکنشی ثبت نشده است.",15));return;}for(int i=0;i<a.length();i++){JSONObject t=a.optJSONObject(i);String k=t.optString("kind");if(!"شهریه".equals(k)&&!"شهریه_بدهی".equals(k))continue;String title="شهریه_بدهی".equals(k)?"بدهی":"پرداخت";LinearLayout row=new LinearLayout(MainActivity.this);row.setOrientation(LinearLayout.VERTICAL);row.setPadding(8,8,8,8);row.setBackground(bg(Color.WHITE,20));row.addView(tv(title+" | "+fmt(t.optLong("debit")+t.optLong("credit"))+" ریال | "+jalaliFromGregorian(t.optString("date")),16));row.addView(tv("توضیحات: "+t.optString("comment","").replaceFirst("^\\[expense_category_id=\\d+\\]\\s*",""),14));addAttachmentPreview(row,t);LinearLayout actions=new LinearLayout(MainActivity.this);Button edit=btn("✏ ویرایش"),del=btn("🗑 حذف");actions.addView(edit,new LinearLayout.LayoutParams(0,62,1));actions.addView(del,new LinearLayout.LayoutParams(0,62,1));row.addView(actions);history.addView(row);gapView(history);edit.setOnClickListener(v->studentForEdit(t));del.setOnClickListener(v->deleteTransaction(t,history,student));}}public void fail(String m){toast(m);}});}
    String jalaliFromGregorian(String iso){try{String[] p=iso.substring(0,10).split("-");int[] j=gregorianToJalali(Integer.parseInt(p[0]),Integer.parseInt(p[1]),Integer.parseInt(p[2]));return String.format(Locale.US,"%04d/%02d/%02d",j[0],j[1],j[2]);}catch(Exception e){return iso==null?"":iso;}}
    void deleteTransaction(JSONObject t,LinearLayout history,JSONObject student){new AlertDialog.Builder(this).setTitle("حذف تراکنش").setMessage("این تراکنش حذف شود؟").setPositiveButton("حذف",(d,w)->api.request("DELETE","/api/transactions/"+t.optLong("id"),null,new ApiClient.Callback(){public void ok(JSONObject o){toast("تراکنش حذف شد");loadTuitionHistory(student,history);}public void fail(String m){toast(m);}})).setNegativeButton("انصراف",null).show();}
    
    void loadBalance(JSONObject s,TextView t){api.request("GET","/api/students/"+s.optLong("id")+"/balance",null,new ApiClient.Callback(){public void ok(JSONObject o){t.setText("انتخاب: "+s.optString("name")+"\nبدهی باقی‌مانده: "+fmt(o.optLong("balance"))+" ریال");}public void fail(String m){}});}
    void amountDialog(String title,String path,JSONObject student,boolean payment,JSONObject old){
        pendingImage=null;LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);TextView error=new TextView(this);error.setTextColor(Color.rgb(190,30,30));error.setVisibility(View.GONE);l.addView(error);
        EditText a=amountField();EditText comment=field("توضیحات");TextView date=dateButton(old==null?todayJalali():jalaliFromGregorian(old.optString("date")));l.addView(tv("تاریخ ثبت *",14));l.addView(date);gapView(l);l.addView(a);l.addView(comment);EditText tr=null;
        if(payment){tr=field("شماره پیگیری *");l.addView(tr);}
        if(payment&&old==null){LinearLayout photoRow=new LinearLayout(this);photoRow.setOrientation(LinearLayout.HORIZONTAL);Button camera=btn("📷\nدوربین");Button gallery=btn("🖼\nانتخاب از گالری");photoRow.addView(camera,new LinearLayout.LayoutParams(0,112,1));photoRow.addView(gallery,new LinearLayout.LayoutParams(0,112,1));l.addView(photoRow);camera.setOnClickListener(v->takePhoto());gallery.setOnClickListener(v->pickImage());}
        if(old!=null){a.setText(fmt(payment?old.optLong("credit"):old.optLong("debit")));comment.setText(old.optString("comment","").replaceFirst("^ثبت بدهی شهریه$",""));if(payment&&tr!=null)tr.setText(old.optString("tracking_code",""));}
        AlertDialog dlg=new AlertDialog.Builder(this).setTitle(title).setView(l).setPositiveButton(old==null?"ثبت":"ذخیره",null).setNegativeButton("انصراف",null).create();final EditText trackingField=tr;
        dlg.setOnShowListener(x->dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{try{long amount=money(a);if(amount<=0){showFormError(error,"مبلغ را وارد کنید.");return;}String ds=date.getText().toString().trim();if(!ds.matches("\\d{4}/\\d{2}/\\d{2}")){showFormError(error,"تاریخ الزامی است.");return;}if(payment&&(trackingField==null||trackingField.getText().toString().trim().isEmpty())){showFormError(error,"شماره پیگیری پرداخت شهریه الزامی است.");return;}JSONObject z=new JSONObject();z.put("amount",amount);z.put("student_id",student.optLong("id"));z.put("date",jalaliToGregorianString(ds));z.put("comment",comment.getText().toString().trim());if(student.has("school_id"))z.put("school_id",student.optLong("school_id"));if(payment)z.put("tracking_code",trackingField.getText().toString().trim());String method=old==null?"POST":"PATCH",endpoint=old==null?path:"/api/transactions/"+old.optLong("id");api.request(method,endpoint,z,new ApiClient.Callback(){public void ok(JSONObject o){if(old==null&&payment&&o.optJSONObject("data")!=null){long id=o.optJSONObject("data").optLong("id");if(pendingImage!=null){uploadAttachment("tuition",id,pendingImage);pendingImage=null;}}dlg.dismiss();toast(old==null?"ثبت شد":"ویرایش شد");tuition();}public void fail(String m){showFormError(error,m);}});}catch(Exception e){showFormError(error,"مبلغ یا تاریخ معتبر نیست.");}}));dlg.show();}

    void expenses(){
        base("هزینه‌ها");Button add=btn("➕ ثبت هزینه");content.addView(add);gap();
        Button cats=btn("⚙ مدیریت لیست هزینه‌ها");if(isAdminRole())content.addView(cats);gap();
        LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);
        api.request("GET","/api/transactions?kind="+Uri.encode("هزینه"),null,new ApiClient.Callback(){
            public void ok(JSONObject o){JSONArray ar=o.optJSONArray("data");for(int i=0;i<(ar==null?0:ar.length());i++){JSONObject t=ar.optJSONObject(i);Button r=btn(fmt(t.optLong("debit"))+" ریال\n"+expenseComment(t));list.addView(r);gapView(list);r.setOnClickListener(v->expenseEdit(t));}}
            public void fail(String m){toast(m);}
        });
        add.setOnClickListener(v->expenseDialog());cats.setOnClickListener(v->categories());back();
    }
    String expenseComment(JSONObject t){String c=t.optString("comment","");return c.replaceFirst("^\\[expense_category_id=\\d+\\]\\s*","");}
    void expenseDialog(){expenseEdit(null);}
    void expenseEdit(JSONObject old){pendingImage=null;api.request("GET","/api/expense-categories",null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray ar=o.optJSONArray("data");ArrayList<JSONObject> cats=new ArrayList<>();ArrayList<String> names=new ArrayList<>();for(int i=0;i<(ar==null?0:ar.length());i++){JSONObject x=ar.optJSONObject(i);if(x.optBoolean("active",true)||old!=null){cats.add(x);names.add(x.optString("name"));}}LinearLayout l=new LinearLayout(MainActivity.this);l.setOrientation(LinearLayout.VERTICAL);TextView error=new TextView(MainActivity.this);error.setTextColor(Color.rgb(190,30,30));error.setVisibility(View.GONE);l.addView(error);Spinner sp=new Spinner(MainActivity.this);sp.setAdapter(new ArrayAdapter<String>(MainActivity.this,android.R.layout.simple_spinner_dropdown_item,names));EditText amount=amountField();EditText comment=field("توضیحات");EditText tracking=field("شماره پیگیری *");TextView date=dateButton(old==null?todayJalali():jalaliFromGregorian(old.optString("date")));l.addView(tv("تاریخ ثبت *",14));l.addView(date);l.addView(sp);l.addView(amount);l.addView(comment);l.addView(tracking);if(old!=null){amount.setText(fmt(old.optLong("debit")));comment.setText(expenseComment(old));tracking.setText(old.optString("tracking_code",""));String marker=old.optString("comment","");java.util.regex.Matcher mm=java.util.regex.Pattern.compile("expense_category_id=(\\d+)").matcher(marker);if(mm.find()){int id=Integer.parseInt(mm.group(1));for(int i=0;i<cats.size();i++)if(cats.get(i).optInt("id")==id)sp.setSelection(i);}}if(old==null){LinearLayout photo=new LinearLayout(MainActivity.this);photo.setOrientation(LinearLayout.HORIZONTAL);Button camera=btn("📷\nدوربین");Button gallery=btn("🖼\nانتخاب از گالری");photo.addView(camera,new LinearLayout.LayoutParams(0,112,1));photo.addView(gallery,new LinearLayout.LayoutParams(0,112,1));l.addView(photo);camera.setOnClickListener(v->takePhoto());gallery.setOnClickListener(v->pickImage());}AlertDialog dlg=new AlertDialog.Builder(MainActivity.this).setTitle(old==null?"ثبت هزینه":"ویرایش هزینه").setView(l).setPositiveButton(old==null?"ثبت":"ذخیره",null).setNegativeButton("انصراف",null).create();dlg.setOnShowListener(x->dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{try{long val=money(amount);if(val<=0){showFormError(error,"مبلغ را وارد کنید.");return;}if(cats.isEmpty()){showFormError(error,"نوع هزینه انتخاب نشده است.");return;}String ds=date.getText().toString();if(!ds.matches("\\d{4}/\\d{2}/\\d{2}")){showFormError(error,"تاریخ الزامی است.");return;}String tr=tracking.getText().toString().trim();if(tr.isEmpty()){showFormError(error,"شماره پیگیری هزینه الزامی است.");return;}JSONObject z=new JSONObject();z.put("category_id",cats.get(sp.getSelectedItemPosition()).optLong("id"));z.put("amount",val);z.put("comment",comment.getText().toString().trim());z.put("tracking_code",tr);z.put("date",jalaliToGregorianString(ds));String method=old==null?"POST":"PATCH",endpoint=old==null?"/api/expenses":"/api/transactions/"+old.optLong("id");api.request(method,endpoint,z,new ApiClient.Callback(){public void ok(JSONObject r){if(old==null&&r.optJSONObject("data")!=null){long id=r.optJSONObject("data").optLong("id");if(pendingImage!=null){uploadAttachment("expense",id,pendingImage);pendingImage=null;}}dlg.dismiss();toast(old==null?"هزینه ثبت شد":"هزینه ویرایش شد");expenses();}public void fail(String m){showFormError(error,m);}});}catch(Exception e){showFormError(error,"مبلغ یا تاریخ معتبر نیست.");}}));dlg.show();}public void fail(String m){toast(m);}});}

    void categories(){base("لیست هزینه‌ها");Button add=btn("➕ افزودن نوع هزینه");content.addView(add);gap();LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);api.request("GET","/api/expense-categories",null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");for(int i=0;i<(a==null?0:a.length());i++){JSONObject x=a.optJSONObject(i);Button b=btn(x.optString("name")+(x.optBoolean("active",true)?"":" | غیرفعال"));list.addView(b);gapView(list);b.setOnClickListener(v->{if(isAdminRole())categoryEdit(x);});}}public void fail(String m){toast(m);}});add.setOnClickListener(v->{EditText n=new EditText(this);n.setHint("نام هزینه");new AlertDialog.Builder(this).setTitle("افزودن نوع هزینه").setView(n).setPositiveButton("ذخیره",(d,w)->{JSONObject x=new JSONObject();try{x.put("name",n.getText().toString());}catch(Exception ignored){}api.request("POST","/api/expense-categories",x,new ApiClient.Callback(){public void ok(JSONObject o){categories();}public void fail(String m){toast(m);}});}).setNegativeButton("انصراف",null).show();});back();}
    void categoryEdit(JSONObject old){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);EditText n=new EditText(this);n.setText(old.optString("name"));CheckBox a=new CheckBox(this);a.setText("فعال");a.setChecked(old.optBoolean("active",true));l.addView(n);l.addView(a);new AlertDialog.Builder(this).setTitle("ویرایش نوع هزینه").setView(l).setPositiveButton("ذخیره",(d,w)->{JSONObject x=new JSONObject();try{x.put("name",n.getText().toString());x.put("active",a.isChecked());}catch(Exception ignored){}api.request("PATCH","/api/expense-categories/"+old.optLong("id"),x,new ApiClient.Callback(){public void ok(JSONObject o){categories();}public void fail(String m){toast(m);}});}).setNegativeButton("انصراف",null).show();}
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
    @Override protected void onActivityResult(int r,int c,Intent d){super.onActivityResult(r,c,d);if(c!=RESULT_OK)return;if(r==77&&d!=null){pendingImage=d.getData();toast("تصویر انتخاب شد؛ هنگام ثبت ذخیره می‌شود");}else if(r==90){pendingImage=cameraUri;cameraUri=null;toast("عکس دوربین آماده ثبت است");}else if(r==88&&d!=null){pendingBank=d.getData();uploadBank();}else if(r==89&&d!=null){uploadStudentExcel(d.getData());}}
    void uploadBank(){JSONObject f=new JSONObject();try{f.put("school_id",me.optLong("school_id"));}catch(Exception ignored){}api.uploadFile(pendingBank,"file","/api/bank/upload",f,"bank-file","application/octet-stream",new ApiClient.Callback(){public void ok(JSONObject o){toast("فایل بانک وارد شد: "+o.optInt("count")+" تراکنش");pendingBank=null;}public void fail(String m){toast(m);}});}
    void uploadStudentExcel(Uri uri){if(!isAdminRole()){doStudentExcelUpload(uri,me.optLong("school_id"));return;}api.request("GET","/api/schools",null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");if(a==null||a.length()==0){toast("مدرسه‌ای برای ورود دانش‌آموزان وجود ندارد");return;}String[] names=new String[a.length()];for(int i=0;i<a.length();i++){JSONObject s=a.optJSONObject(i);names[i]=s.optString("name")+" | "+s.optString("code");}new AlertDialog.Builder(MainActivity.this).setTitle("انتخاب مدرسه برای Excel").setItems(names,(d,w)->doStudentExcelUpload(uri,a.optJSONObject(w).optLong("id"))).show();}public void fail(String m){toast(m);}});}
    void doStudentExcelUpload(Uri uri,long schoolId){
        Spinner grade=new Spinner(this);
        grade.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,grades));
        LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(18,8,18,8);
        box.addView(tv("پایه دانش‌آموزان این فایل را انتخاب کنید",15));box.addView(grade);
        new AlertDialog.Builder(this).setTitle("ورود دانش‌آموزان از Excel").setView(box)
            .setPositiveButton("شروع ورود",(d,w)->{
                JSONObject f=new JSONObject();try{f.put("school_id",schoolId);f.put("grade",grade.getSelectedItem().toString());}catch(Exception ignored){}
                api.uploadFile(uri,"file","/api/students/import",f,"students.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",new ApiClient.Callback(){
                    public void ok(JSONObject o){toast("ورود انجام شد: "+o.optInt("added")+" دانش‌آموز جدید؛ "+o.optInt("skipped")+" مورد تکراری");students();}
                    public void fail(String m){toast(m);}
                });
            }).setNegativeButton("انصراف",null).show();
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
        if(!isAdminRole()){toast("فقط مدیر ارشد به خروجی پارسیان دسترسی دارد");return;}
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

    void loadMessages(LinearLayout box){api.request("GET","/api/senior-messages",null,new ApiClient.Callback(){public void ok(JSONObject o){box.removeAllViews();JSONArray a=o.optJSONArray("data");if(a==null||a.length()==0){box.addView(tv("پیامی از مدیر ارشد ثبت نشده است.",15));return;}for(int i=0;i<a.length();i++){JSONObject m=a.optJSONObject(i);box.addView(tv("📢 "+m.optString("message")+"\n"+jalaliFromGregorian(m.optString("created_at")),15));if(i<a.length()-1)gapView(box);}}public void fail(String m){box.addView(tv("پیام‌ها در دسترس نیستند.",14));}});}
    void messagesAdmin(){base("پیام به مدیران");EditText msg=field("متن پیام مدیر ارشد برای همه مدیران");content.addView(msg);gap();Button send=btn("📢 ارسال پیام");content.addView(send);gap();LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);final Runnable[] loadRef=new Runnable[1]; loadRef[0]=()->api.request("GET","/api/senior-messages",null,new ApiClient.Callback(){public void ok(JSONObject o){list.removeAllViews();JSONArray a=o.optJSONArray("data");for(int i=0;i<(a==null?0:a.length());i++){JSONObject m=a.optJSONObject(i);LinearLayout row=new LinearLayout(MainActivity.this);row.setOrientation(LinearLayout.VERTICAL);row.setBackground(bg(Color.WHITE,20));row.addView(tv(m.optString("message"),16));row.addView(tv("تاریخ: "+jalaliFromGregorian(m.optString("created_at")),13));Button del=btn("🗑 غیرفعال کردن پیام");row.addView(del);list.addView(row);gapView(list);del.setOnClickListener(v->api.request("DELETE","/api/senior-messages/"+m.optLong("id"),null,new ApiClient.Callback(){public void ok(JSONObject x){loadRef[0].run();}public void fail(String z){toast(z);}}));}}public void fail(String m){toast(m);}});send.setOnClickListener(v->{String text=msg.getText().toString().trim();if(text.isEmpty()){toast("متن پیام را وارد کنید");return;}JSONObject z=new JSONObject();try{z.put("message",text);}catch(Exception ignored){}api.request("POST","/api/senior-messages",z,new ApiClient.Callback(){public void ok(JSONObject o){msg.setText("");toast("پیام برای مدیران ارسال شد");loadRef[0].run();}public void fail(String m){toast(m);}});});loadRef[0].run();back();}

    void settings(){base("تنظیمات");content.addView(tv("ارتباط با سرویس: Google Apps Script\nپایگاه داده: Google Sheets / Google Drive",16));gap();content.addView(tv("تم رنگی",18));String[] names={"سبز فیروزه‌ای","آبی","بنفش","نارنجی","سبز","سبز تیره"};Spinner themeSpinner=new Spinner(this);themeSpinner.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,names));themeSpinner.setSelection(themeIndex);content.addView(themeSpinner,new LinearLayout.LayoutParams(-1,(int)fs(68)));themeSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener(){public void onNothingSelected(AdapterView<?> p){}public void onItemSelected(AdapterView<?> p,View v,int pos,long id){if(pos!=themeIndex){themeIndex=pos;prefs.edit().putInt("theme_index",themeIndex).apply();settings();}}});gap();content.addView(tv("اندازه نوشته‌ها",18));LinearLayout row=new LinearLayout(this);row.setGravity(Gravity.CENTER);Button minus=btn("➖\nA");Button plus=btn("➕\nA");minus.setTextSize(fs(21));plus.setTextSize(fs(21));int wh=(int)fs(105);row.addView(minus,new LinearLayout.LayoutParams(wh,wh));Space sp=new Space(this);row.addView(sp,new LinearLayout.LayoutParams(18,1));row.addView(plus,new LinearLayout.LayoutParams(wh,wh));content.addView(row);gap();content.addView(tv("اندازه فعلی: "+Math.round(fontScale*100)+"٪",15));minus.setOnClickListener(v->{fontScale=Math.max(.85f,fontScale-.05f);prefs.edit().putFloat("font_scale",fontScale).apply();settings();});plus.setOnClickListener(v->{fontScale=Math.min(1.25f,fontScale+.05f);prefs.edit().putFloat("font_scale",fontScale).apply();settings();});Button out=btn("خروج از حساب");content.addView(out);gap();out.setOnClickListener(v->{api.request("POST","/api/logout",null,new ApiClient.Callback(){public void ok(JSONObject o){api.clearToken();showLogin();}public void fail(String m){api.clearToken();showLogin();}});});back();}

    String fmt(long n){return NumberFormat.getNumberInstance(Locale.US).format(n);}
    String encrypt(String plain){try{KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);if(!ks.containsAlias(KEY_ALIAS)){KeyGenerator kg=KeyGenerator.getInstance("AES","AndroidKeyStore");kg.init(new android.security.keystore.KeyGenParameterSpec.Builder(KEY_ALIAS,android.security.keystore.KeyProperties.PURPOSE_ENCRYPT|android.security.keystore.KeyProperties.PURPOSE_DECRYPT).setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE).build());kg.generateKey();}SecretKey key=((KeyStore.SecretKeyEntry)ks.getEntry(KEY_ALIAS,null)).getSecretKey();Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key);byte[] iv=c.getIV(),ct=c.doFinal(plain.getBytes(StandardCharsets.UTF_8));return Base64.encodeToString(iv,2)+":"+Base64.encodeToString(ct,2);}catch(Exception e){return "";}}
    String decrypt(String enc){try{if(enc==null||enc.isEmpty())return "";String[] p=enc.split(":",2);KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);SecretKey key=((KeyStore.SecretKeyEntry)ks.getEntry(KEY_ALIAS,null)).getSecretKey();Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,Base64.decode(p[0],2)));return new String(c.doFinal(Base64.decode(p[1],2)),StandardCharsets.UTF_8);}catch(Exception e){return "";}}
}
