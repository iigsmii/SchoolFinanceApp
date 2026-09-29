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
    ApiClient api; LinearLayout root, content; JSONObject me; Uri pendingImage, pendingBank;
    final String[] grades={"مهد","اول","دوم","سوم","چهارم","پنجم","ششم"};
    final int navy=Color.rgb(35,55,95), teal=Color.rgb(20,130,125), gold=Color.rgb(220,155,45), ink=Color.rgb(45,55,70);
    android.content.SharedPreferences prefs;
    float fontScale=1f;
    final String KEY_ALIAS="SchoolFinanceLoginKey";
    boolean homeVisible=false;

    @Override public void onCreate(Bundle b){super.onCreate(b);prefs=getSharedPreferences("school_finance",MODE_PRIVATE);fontScale=prefs.getFloat("font_scale",1f);api=new ApiClient(this);autoLogin();}

    @Override public void onBackPressed(){
        if(!homeVisible){ showHome(); } else { super.onBackPressed(); }
    }

    float fs(float n){return n*fontScale;}
    TextView tv(String s,float size){TextView t=new TextView(this);t.setText(s);t.setTextSize(fs(size));t.setTextColor(ink);t.setPadding(18,15,18,15);t.setGravity(Gravity.RIGHT|Gravity.CENTER_VERTICAL);return t;}
    GradientDrawable bg(int c,float r){GradientDrawable g=new GradientDrawable();g.setColor(c);g.setCornerRadius(r);return g;}
    Button btn(String s){Button b=new Button(this);b.setText(s);b.setAllCaps(false);b.setTextSize(fs(16));b.setTextColor(Color.WHITE);b.setTypeface(Typeface.create("sans",Typeface.BOLD));b.setMinHeight((int)fs(58));b.setPadding(14,10,14,10);b.setBackground(bg(teal,24));return b;}
    Button cardBtn(String s){Button b=btn(s);b.setTextSize(fs(17));b.setMinHeight((int)fs(135));b.setGravity(Gravity.CENTER);b.setBackground(bg(Color.WHITE,30));b.setTextColor(navy);return b;}
    void gap(){Space s=new Space(this);content.addView(s,new LinearLayout.LayoutParams(1,18));}
    void gapView(LinearLayout l){Space s=new Space(this);l.addView(s,new LinearLayout.LayoutParams(1,18));}
    void base(String title){
        homeVisible=false;
        root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(14,14,14,14);root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
        GradientDrawable shell=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{Color.rgb(238,248,249),Color.rgb(255,249,232),Color.rgb(235,240,250)});root.setBackground(shell);
        TextView h=tv(title,24);h.setTextColor(navy);h.setTypeface(Typeface.DEFAULT_BOLD);h.setGravity(Gravity.RIGHT);root.addView(h);
        content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);content.setPadding(3,5,3,12);
        ScrollView sv=new ScrollView(this);sv.setFillViewport(true);sv.addView(content);root.addView(sv,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
    }
    EditText field(String hint){EditText e=new EditText(this);e.setHint(hint);e.setTextSize(fs(16));e.setTextColor(ink);e.setHintTextColor(Color.rgb(125,135,145));e.setPadding(18,14,18,14);e.setBackground(bg(Color.WHITE,22));return e;}
    EditText amountField(){EditText e=field("مبلغ به ریال");e.setInputType(2);final boolean[] lock={false};e.addTextChangedListener(new TextWatcher(){public void beforeTextChanged(CharSequence s,int st,int c,int a){}public void onTextChanged(CharSequence s,int st,int b,int c){}public void afterTextChanged(Editable x){if(lock[0])return;String d=x.toString().replace(",","");if(d.length()==0)return;try{String f=NumberFormat.getNumberInstance(Locale.US).format(Long.parseLong(d));lock[0]=true;x.replace(0,x.length(),f);lock[0]=false;}catch(Exception ignored){}}});return e;}
    EditText edit(String hint){EditText e=field(hint);content.addView(e,new LinearLayout.LayoutParams(-1,-2));gap();return e;}
    EditText amount(){EditText e=amountField();content.addView(e,new LinearLayout.LayoutParams(-1,-2));gap();return e;}
    long money(EditText e){return Long.parseLong(e.getText().toString().replace(",",""));}
    void toast(String s){Toast.makeText(this,s,Toast.LENGTH_LONG).show();}
    void autoLogin(){
        String u=decrypt(prefs.getString("login_user","")), p=decrypt(prefs.getString("login_pass",""));
        if(u.length()==0||p.length()==0){showLogin();return;}
        JSONObject x=new JSONObject();try{x.put("username",u);x.put("password",p);}catch(Exception ignored){}
        api.request("POST","/api/login",x,new ApiClient.Callback(){public void ok(JSONObject o){try{api.setToken(o.getString("token"));me=o.getJSONObject("user");showHome();}catch(Exception e){showLogin();}}public void fail(String m){showLogin();}});
    }
    void showLogin(){
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
        base("داشبورد");
        homeVisible=true;
        LinearLayout welcome=new LinearLayout(this);welcome.setOrientation(LinearLayout.VERTICAL);welcome.setPadding(8,8,8,8);welcome.setBackground(bg(Color.WHITE,28));
        welcome.addView(tv("خوش آمدید، "+me.optString("name","مدیر"),20));welcome.addView(tv("مدرسه: "+me.optString("school_name","همه مدارس"),15));content.addView(welcome);gap();
        String[][] ms={{"👨‍🎓\nدانش‌آموزان","students"},{"💳\nشهریه و درآمد","tuition"},{"🧾\nهزینه‌ها","expenses"},{"🏦\nتطبیق بانک","bank"},{"📊\nگزارش مالی","report"},{"⚙️\nتنظیمات","settings"}};
        if("admin".equals(me.optString("role")))ms=new String[][]{{"👨‍🎓\nدانش‌آموزان","students"},{"💳\nشهریه و درآمد","tuition"},{"🧾\nهزینه‌ها","expenses"},{"🏦\nتطبیق بانک","bank"},{"👤\nمدیران","managers"},{"🏫\nمدارس","schools"},{"📊\nگزارش مالی","report"},{"⚙️\nتنظیمات","settings"}};
        GridLayout grid=new GridLayout(this);grid.setColumnCount(2);grid.setUseDefaultMargins(false);content.addView(grid);
        for(String[] m:ms){Button b=cardBtn(m[0]);GridLayout.LayoutParams gp=new GridLayout.LayoutParams();gp.width=0;gp.height=(int)fs(145);gp.columnSpec=GridLayout.spec(GridLayout.UNDEFINED,1f);gp.setMargins(7,21,7,21);grid.addView(b,gp);b.setOnClickListener(v->{switch(m[1]){case"students":students();break;case"tuition":tuition();break;case"expenses":expenses();break;case"bank":bank();break;case"managers":managers();break;case"schools":schools();break;case"report":report();break;default:settings();}});}
    }
    void back(){gap();Button b=btn("↩ بازگشت به داشبورد");content.addView(b);b.setOnClickListener(v->showHome());}
    void students(){
        base("دانش‌آموزان");
        Button add=btn("➕ افزودن دانش‌آموز");content.addView(add);gap();
        Button imp=btn("📥 ورود دانش‌آموزان از Excel");content.addView(imp);gap();
        EditText q=edit("جست‌وجوی نام یا کد ملی (اختیاری)");
        Button search=btn("🔎 جست‌وجو");content.addView(search);gap();
        LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);
        Runnable load=()->api.request("GET","/api/students?q="+Uri.encode(q.getText().toString()),null,new ApiClient.Callback(){
            public void ok(JSONObject o){
                list.removeAllViews();JSONArray a=o.optJSONArray("data");
                if(a==null||a.length()==0){list.addView(tv("دانش‌آموزی یافت نشد.",16));return;}
                for(int i=0;i<a.length();i++){
                    JSONObject st=a.optJSONObject(i);if(st==null)continue;
                    Button r=btn("👤 "+st.optString("name")+"\n"+st.optString("grade")+" | کد ملی: "+st.optString("national_id")+"\n"+st.optString("phone"));
                    list.addView(r);gapView(list);r.setOnClickListener(v->studentEdit(st));
                }
            }
            public void fail(String m){toast(m);}
        });
        search.setOnClickListener(v->load.run());
        add.setOnClickListener(v->studentEdit(null));
        imp.setOnClickListener(v->pickStudentExcel());
        load.run();
        back();
    }
    void studentEdit(JSONObject old){
        LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);l.setPadding(10,4,10,4);
        TextView error=tv("",15);error.setTextColor(Color.rgb(190,0,0));error.setVisibility(View.GONE);l.addView(error);
        EditText n=field("نام و نام خانوادگی");
        Spinner g=new Spinner(this);g.setAdapter(new ArrayAdapter<String>(this,android.R.layout.simple_spinner_dropdown_item,grades));
        EditText phone=field("09131112222");phone.setInputType(2);phone.setKeyListener(DigitsKeyListener.getInstance("0123456789"));phone.setFilters(new InputFilter[]{new InputFilter.LengthFilter(11)});
        EditText national=field("کد ملی - فقط اعداد انگلیسی، مثال 1190000000");national.setInputType(2);national.setKeyListener(DigitsKeyListener.getInstance("0123456789"));national.setFilters(new InputFilter[]{new InputFilter.LengthFilter(10)});
        Spinner school=new Spinner(this);ArrayList<String> schoolNames=new ArrayList<>();ArrayList<Long> schoolIds=new ArrayList<>();
        if(old!=null){n.setText(old.optString("name"));phone.setText(old.optString("phone"));national.setText(old.optString("national_id"));for(int i=0;i<grades.length;i++)if(grades[i].equals(old.optString("grade")))g.setSelection(i);}
        l.addView(n);l.addView(g);l.addView(phone);l.addView(national);
        boolean admin="admin".equals(me.optString("role"));
        if(admin){l.addView(tv("مدرسه دانش‌آموز",15));l.addView(school);}
        final AlertDialog dlg=new AlertDialog.Builder(this).setTitle(old==null?"افزودن دانش‌آموز":"ویرایش دانش‌آموز").setView(l).setPositiveButton("ذخیره",null).setNegativeButton("انصراف",null).create();
        dlg.setOnShowListener(x->{
            if(admin){
                api.request("GET","/api/schools",null,new ApiClient.Callback(){
                    public void ok(JSONObject o){
                        schoolNames.clear();schoolIds.clear();JSONArray a=o.optJSONArray("data");
                        for(int i=0;i<(a==null?0:a.length());i++){JSONObject z=a.optJSONObject(i);if(z==null)continue;schoolNames.add(z.optString("name")+" | "+z.optString("code"));schoolIds.add(z.optLong("id"));}
                        school.setAdapter(new ArrayAdapter<String>(MainActivity.this,android.R.layout.simple_spinner_dropdown_item,schoolNames));
                        if(old!=null){long id=old.optLong("school_id");for(int i=0;i<schoolIds.size();i++)if(schoolIds.get(i)==id){school.setSelection(i);break;}}
                    }
                    public void fail(String m){error.setText("خطا در دریافت مدارس: "+m);error.setVisibility(View.VISIBLE);}
                });
            }
            dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
                String name=n.getText().toString().trim();String p=phone.getText().toString().trim();String nid=national.getText().toString().trim();
                if(name.isEmpty()){error.setText("نام و نام خانوادگی الزامی است.");error.setVisibility(View.VISIBLE);n.requestFocus();return;}
                if(!p.matches("0\\d{10}")){error.setText("شماره تلفن باید مانند 09131112222 باشد.");error.setVisibility(View.VISIBLE);phone.requestFocus();return;}
                if(!nid.matches("\\d{10}")){error.setText("کد ملی باید دقیقاً ۱۰ رقم انگلیسی باشد.");error.setVisibility(View.VISIBLE);national.requestFocus();return;}
                if(admin && schoolIds.isEmpty()){error.setText("لطفاً یک مدرسه انتخاب کنید.");error.setVisibility(View.VISIBLE);return;}
                JSONObject z=new JSONObject();try{z.put("name",name);z.put("grade",grades[g.getSelectedItemPosition()]);z.put("phone",p);z.put("national_id",nid);if(admin)z.put("school_id",schoolIds.get(school.getSelectedItemPosition()));}
                catch(Exception e){error.setText("اطلاعات واردشده معتبر نیست.");error.setVisibility(View.VISIBLE);return;}
                v.setEnabled(false);
                String path=old==null?"/api/students":"/api/students/"+old.optLong("id");
                api.request(old==null?"POST":"PATCH",path,z,new ApiClient.Callback(){
                    public void ok(JSONObject o){v.setEnabled(true);dlg.dismiss();students();}
                    public void fail(String m){v.setEnabled(true);error.setText(m==null||m.trim().isEmpty()?"ثبت اطلاعات انجام نشد.":m);error.setVisibility(View.VISIBLE);}
                });
            });
        });
        dlg.show();
    }
    void pickStudentExcel(){Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.setType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,89);}
    void tuition(){
        base("شهریه و درآمد");
        EditText search=edit("نام، کد یا کد ملی (اختیاری)");Button find=btn("🔎 نمایش و انتخاب دانش‌آموز");content.addView(find);gap();
        TextView selected=tv("دانش‌آموزی انتخاب نشده",17);selected.setBackground(bg(Color.WHITE,22));content.addView(selected);gap();
        Button debt=btn("➕ ثبت بدهی شهریه");Button pay=btn("💳 ثبت پرداخت شهریه");content.addView(debt);gap();content.addView(pay);gap();Button image=btn("📷 انتخاب عکس فیش");content.addView(image);gap();image.setOnClickListener(v->pickImage());
        final JSONObject[] student={null};
        Runnable choose=()->api.request("GET","/api/students?q="+Uri.encode(search.getText().toString()),null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");if(a==null||a.length()==0){toast("دانش‌آموزی پیدا نشد");return;}String[] names=new String[a.length()];for(int i=0;i<a.length();i++){JSONObject s=a.optJSONObject(i);names[i]=s.optString("name")+" | "+s.optString("grade")+" | "+s.optString("national_id");}new AlertDialog.Builder(MainActivity.this).setTitle("انتخاب دانش‌آموز").setItems(names,(d,which)->{student[0]=a.optJSONObject(which);selected.setText("انتخاب: "+student[0].optString("name")+" | "+student[0].optString("grade")+"\nکد ملی: "+student[0].optString("national_id"));loadBalance(student[0],selected);}).show();}public void fail(String m){toast(m);}});
        find.setOnClickListener(v->choose.run());debt.setOnClickListener(v->{if(student[0]==null){toast("ابتدا دانش‌آموز را انتخاب کنید");return;}amountDialog("ثبت بدهی شهریه","/api/tuition/debt",student[0],false);});pay.setOnClickListener(v->{if(student[0]==null){toast("ابتدا دانش‌آموز را انتخاب کنید");return;}amountDialog("ثبت پرداخت شهریه","/api/tuition/payment",student[0],true);});choose.run();back();
    }
    void loadBalance(JSONObject s,TextView t){api.request("GET","/api/students/"+s.optLong("id")+"/balance",null,new ApiClient.Callback(){public void ok(JSONObject o){t.setText("انتخاب: "+s.optString("name")+"\nبدهی باقی‌مانده: "+fmt(o.optLong("balance"))+" ریال");}public void fail(String m){}});}
    void amountDialog(String title,String path,JSONObject student,boolean payment){
        LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);
        TextView error=tv("",15);error.setTextColor(Color.rgb(190,0,0));error.setVisibility(View.GONE);l.addView(error);
        EditText a=amountField();EditText tr=field("شماره پیگیری (اختیاری)");l.addView(a);l.addView(tr);
        AlertDialog dlg=new AlertDialog.Builder(this).setTitle(title).setView(l).setPositiveButton("ثبت",null).setNegativeButton("انصراف",null).create();
        dlg.setOnShowListener(x->dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
            try{long amount=money(a);if(amount<=0)throw new Exception();JSONObject z=new JSONObject();z.put("student_id",student.optLong("id"));z.put("amount",amount);if(payment)z.put("tracking_code",tr.getText().toString().trim());if("admin".equals(me.optString("role")))z.put("school_id",student.optLong("school_id"));
                v.setEnabled(false);api.request("POST",path,z,new ApiClient.Callback(){public void ok(JSONObject o){v.setEnabled(true);JSONObject data=o.optJSONObject("data");long id=data==null?0:data.optLong("id");if(pendingImage!=null&&id>0){uploadAttachment("tuition",id,pendingImage);pendingImage=null;}dlg.dismiss();toast("ثبت شد");}public void fail(String m){v.setEnabled(true);error.setText(m==null||m.trim().isEmpty()?"ثبت انجام نشد.":m);error.setVisibility(View.VISIBLE);}});
            }catch(Exception e){error.setText("مبلغ را به ریال وارد کنید.");error.setVisibility(View.VISIBLE);a.requestFocus();}
        }));
        dlg.show();
    }
    void expenses(){base("هزینه‌ها");Button add=btn("➕ ثبت هزینه");content.addView(add);gap();Button cats=btn("⚙ مدیریت لیست هزینه‌ها");if("admin".equals(me.optString("role")))content.addView(cats);gap();LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);api.request("GET","/api/transactions?kind="+Uri.encode("هزینه"),null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");for(int i=0;i<(a==null?0:a.length());i++){JSONObject t=a.optJSONObject(i);list.addView(tv(fmt(t.optLong("debit"))+" ریال | "+t.optString("comment"),15));gapView(list);}}public void fail(String m){toast(m);}});add.setOnClickListener(v->expenseDialog());cats.setOnClickListener(v->categories());back();}
    void expenseDialog(){api.request("GET","/api/expense-categories",null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");ArrayList<JSONObject> active=new ArrayList<>();ArrayList<String> names=new ArrayList<>();for(int i=0;i<(a==null?0:a.length());i++){JSONObject x=a.optJSONObject(i);if(x.optBoolean("active",true)){active.add(x);names.add(x.optString("name"));}}LinearLayout l=new LinearLayout(MainActivity.this);l.setOrientation(LinearLayout.VERTICAL);Spinner sp=new Spinner(MainActivity.this);sp.setAdapter(new ArrayAdapter<String>(MainActivity.this,android.R.layout.simple_spinner_dropdown_item,names));EditText amount=amountField();EditText comment=field("شرح (اختیاری)");l.addView(sp);l.addView(amount);l.addView(comment);Button image=btn("📷 انتخاب عکس فاکتور");l.addView(image);image.setOnClickListener(v->pickImage());new AlertDialog.Builder(MainActivity.this).setTitle("ثبت هزینه").setView(l).setPositiveButton("ثبت",(d,w)->{try{JSONObject x=new JSONObject();x.put("category_id",active.get(sp.getSelectedItemPosition()).optLong("id"));x.put("amount",money(amount));x.put("comment",comment.getText().toString());api.request("POST","/api/expenses",x,new ApiClient.Callback(){public void ok(JSONObject r){long id=r.optJSONObject("data").optLong("id");if(pendingImage!=null){uploadAttachment("expense",id,pendingImage);pendingImage=null;}toast("هزینه ثبت شد");expenses();}public void fail(String m){toast(m);}});}catch(Exception e){toast("مبلغ را وارد کنید");}}).setNegativeButton("انصراف",null).show();}public void fail(String m){toast(m);}});}
    void categories(){base("لیست هزینه‌ها");Button add=btn("➕ افزودن نوع هزینه");content.addView(add);gap();LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);api.request("GET","/api/expense-categories",null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");for(int i=0;i<(a==null?0:a.length());i++){JSONObject x=a.optJSONObject(i);Button b=btn(x.optString("name")+(x.optBoolean("active",true)?"":" | غیرفعال"));list.addView(b);gapView(list);b.setOnClickListener(v->{if("admin".equals(me.optString("role")))categoryEdit(x);});}}public void fail(String m){toast(m);}});add.setOnClickListener(v->{EditText n=new EditText(this);n.setHint("نام هزینه");new AlertDialog.Builder(this).setTitle("افزودن نوع هزینه").setView(n).setPositiveButton("ذخیره",(d,w)->{JSONObject x=new JSONObject();try{x.put("name",n.getText().toString());}catch(Exception ignored){}api.request("POST","/api/expense-categories",x,new ApiClient.Callback(){public void ok(JSONObject o){categories();}public void fail(String m){toast(m);}});}).setNegativeButton("انصراف",null).show();});back();}
    void categoryEdit(JSONObject old){LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);EditText n=new EditText(this);n.setText(old.optString("name"));CheckBox a=new CheckBox(this);a.setText("فعال");a.setChecked(old.optBoolean("active",true));l.addView(n);l.addView(a);new AlertDialog.Builder(this).setTitle("ویرایش نوع هزینه").setView(l).setPositiveButton("ذخیره",(d,w)->{JSONObject x=new JSONObject();try{x.put("name",n.getText().toString());x.put("active",a.isChecked());}catch(Exception ignored){}api.request("PATCH","/api/expense-categories/"+old.optLong("id"),x,new ApiClient.Callback(){public void ok(JSONObject o){categories();}public void fail(String m){toast(m);}});}).setNegativeButton("انصراف",null).show();}
    void uploadAttachment(String type,long id,Uri uri){JSONObject f=new JSONObject();try{f.put("entity_type",type);f.put("entity_id",id);}catch(Exception ignored){}api.upload(uri,"file","/api/attachments",f,new ApiClient.Callback(){public void ok(JSONObject o){toast("تصویر کم‌حجم با DPI=96 ذخیره شد");}public void fail(String m){toast(m);}});}
    void pickImage(){Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.setType("image/*");i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,77);}
    @Override protected void onActivityResult(int r,int c,Intent d){super.onActivityResult(r,c,d);if(c!=RESULT_OK||d==null)return;if(r==77){pendingImage=d.getData();toast("تصویر انتخاب شد؛ هنگام ثبت ذخیره می‌شود");}else if(r==88){pendingBank=d.getData();uploadBank();}else if(r==89){uploadStudentExcel(d.getData());}}
    void uploadBank(){JSONObject f=new JSONObject();try{f.put("school_id",me.optLong("school_id"));}catch(Exception ignored){}api.uploadFile(pendingBank,"file","/api/bank/upload",f,"bank-file","application/octet-stream",new ApiClient.Callback(){public void ok(JSONObject o){toast("فایل بانک وارد شد: "+o.optInt("count")+" تراکنش");pendingBank=null;}public void fail(String m){toast(m);}});}
    void uploadStudentExcel(Uri uri){if(!"admin".equals(me.optString("role"))){doStudentExcelUpload(uri,me.optLong("school_id"));return;}api.request("GET","/api/schools",null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");if(a==null||a.length()==0){toast("مدرسه‌ای برای ورود دانش‌آموزان وجود ندارد");return;}String[] names=new String[a.length()];for(int i=0;i<a.length();i++){JSONObject s=a.optJSONObject(i);names[i]=s.optString("name")+" | "+s.optString("code");}new AlertDialog.Builder(MainActivity.this).setTitle("انتخاب مدرسه برای Excel").setItems(names,(d,w)->doStudentExcelUpload(uri,a.optJSONObject(w).optLong("id"))).show();}public void fail(String m){toast(m);}});}
    void doStudentExcelUpload(Uri uri,long schoolId){JSONObject f=new JSONObject();try{f.put("school_id",schoolId);}catch(Exception ignored){}api.uploadFile(uri,"file","/api/students/import",f,"students.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",new ApiClient.Callback(){public void ok(JSONObject o){toast("ورود دانش‌آموزان انجام شد: "+o.optInt("count"));students();}public void fail(String m){toast(m);}});}
    void bank(){base("تطبیق بانک");content.addView(tv("مدیر ارشد می‌تواند فایل CSV یا Excel بانک را وارد و با شهریه‌های ثبت‌شده تطبیق دهد.",16));gap();Button upload=btn("📄 انتخاب فایل بانک");content.addView(upload);gap();Button rec=btn("🔄 تطبیق تراکنش‌ها");content.addView(rec);gap();LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);upload.setOnClickListener(v->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.setType("*/*");i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,88);});rec.setOnClickListener(v->api.request("POST","/api/bank/reconcile",new JSONObject(),new ApiClient.Callback(){public void ok(JSONObject o){toast("تطبیق شد: "+o.optInt("matched")+" | بدون تطبیق: "+o.optInt("unmatched"));unmatched(list);}public void fail(String m){toast(m);}}));unmatched(list);back();}
    void unmatched(LinearLayout list){api.request("GET","/api/bank/unmatched",null,new ApiClient.Callback(){public void ok(JSONObject o){list.removeAllViews();JSONArray a=o.optJSONArray("data");for(int i=0;i<(a==null?0:a.length());i++){JSONObject x=a.optJSONObject(i);LinearLayout r=new LinearLayout(MainActivity.this);r.setOrientation(LinearLayout.VERTICAL);r.addView(tv(fmt(x.optLong("amount"))+" ریال | "+x.optString("comment"),14));Button b=btn("مرجوع به مدیر");r.addView(b);list.addView(r);gapView(list);b.setOnClickListener(v->api.request("POST","/api/bank/"+x.optLong("id")+"/return",new JSONObject(),new ApiClient.Callback(){public void ok(JSONObject z){toast(z.optString("message"));unmatched(list);}public void fail(String m){toast(m);}}));}}public void fail(String m){toast(m);}});}
    void report(){base("گزارش مالی");api.request("GET","/api/transactions",null,new ApiClient.Callback(){public void ok(JSONObject o){long d=0,c=0;JSONArray a=o.optJSONArray("data");for(int i=0;i<(a==null?0:a.length());i++){JSONObject x=a.optJSONObject(i);d+=x.optLong("debit");c+=x.optLong("credit");}content.addView(tv("جمع هزینه/بدهکار: "+fmt(d)+" ریال",19));gap();content.addView(tv("جمع درآمد/بستانکار: "+fmt(c)+" ریال",19));gap();content.addView(tv("مانده: "+fmt(c-d)+" ریال",19));}public void fail(String m){toast(m);}});back();}
    void managers(){base("مدیریت مدیران");Button add=btn("➕ افزودن مدیر");content.addView(add);gap();LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);api.request("GET","/api/managers",null,new ApiClient.Callback(){public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");for(int i=0;i<(a==null?0:a.length());i++){JSONObject m=a.optJSONObject(i);Button b=btn("👤 "+m.optString("name")+"\n"+m.optString("username")+" | "+m.optString("role"));list.addView(b);gapView(list);b.setOnClickListener(v->managerEdit(m));}}public void fail(String m){toast(m);}});add.setOnClickListener(v->managerEdit(null));back();}
    void managerEdit(JSONObject old){
        LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);
        TextView error=tv("",15);error.setTextColor(Color.rgb(190,0,0));error.setVisibility(View.GONE);l.addView(error);
        EditText n=field("نام مدیر"),u=field("نام کاربری"),p=field(old==null?"رمز عبور":"رمز جدید (خالی = بدون تغییر)");
        p.setInputType(129);l.addView(n);l.addView(u);l.addView(p);
        Spinner school=new Spinner(this);ArrayList<String> schoolNames=new ArrayList<>();ArrayList<Long> schoolIds=new ArrayList<>();
        l.addView(tv("مدرسه مدیر",15));l.addView(school);
        if(old!=null){n.setText(old.optString("name"));u.setText(old.optString("username"));}
        AlertDialog.Builder ab=new AlertDialog.Builder(this).setTitle(old==null?"افزودن مدیر":"ویرایش مدیر").setView(l).setPositiveButton("ذخیره",null).setNegativeButton("انصراف",null);
        if(old!=null&&!"admin".equals(old.optString("username")))ab.setNeutralButton("حذف مدیر",(d,w)->api.request("DELETE","/api/managers/"+old.optLong("id"),null,new ApiClient.Callback(){public void ok(JSONObject o){toast("مدیر حذف شد");managers();}public void fail(String m){toast(m);}}));
        AlertDialog dlg=ab.create();
        dlg.setOnShowListener(x->{
            api.request("GET","/api/schools",null,new ApiClient.Callback(){
                public void ok(JSONObject o){JSONArray a=o.optJSONArray("data");schoolNames.clear();schoolIds.clear();for(int i=0;i<(a==null?0:a.length());i++){JSONObject z=a.optJSONObject(i);if(z==null)continue;schoolNames.add(z.optString("name")+" | "+z.optString("code"));schoolIds.add(z.optLong("id"));}school.setAdapter(new ArrayAdapter<String>(MainActivity.this,android.R.layout.simple_spinner_dropdown_item,schoolNames));if(old!=null){long id=old.optLong("school_id");for(int i=0;i<schoolIds.size();i++)if(schoolIds.get(i)==id){school.setSelection(i);break;}}}
                public void fail(String m){error.setText("خطا در دریافت مدارس: "+m);error.setVisibility(View.VISIBLE);}
            });
            dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
                String name=n.getText().toString().trim(),username=u.getText().toString().trim(),password=p.getText().toString();
                if(name.isEmpty()){error.setText("نام مدیر الزامی است.");error.setVisibility(View.VISIBLE);n.requestFocus();return;}
                if(username.isEmpty()){error.setText("نام کاربری الزامی است.");error.setVisibility(View.VISIBLE);u.requestFocus();return;}
                if(old==null&&password.isEmpty()){error.setText("رمز عبور الزامی است.");error.setVisibility(View.VISIBLE);p.requestFocus();return;}
                if(schoolIds.isEmpty()){error.setText("لطفاً مدرسه مدیر را انتخاب کنید.");error.setVisibility(View.VISIBLE);return;}
                JSONObject z=new JSONObject();try{z.put("name",name);z.put("username",username);z.put("school_id",schoolIds.get(school.getSelectedItemPosition()));if(!password.isEmpty())z.put("password",password);}catch(Exception e){error.setText("اطلاعات مدیر کامل نیست.");error.setVisibility(View.VISIBLE);return;}
                v.setEnabled(false);String path=old==null?"/api/managers":"/api/managers/"+old.optLong("id");api.request(old==null?"POST":"PATCH",path,z,new ApiClient.Callback(){public void ok(JSONObject o){v.setEnabled(true);dlg.dismiss();managers();}public void fail(String m){v.setEnabled(true);error.setText(m==null||m.trim().isEmpty()?"ذخیره مدیر انجام نشد.":m);error.setVisibility(View.VISIBLE);}});
            });
        });
        dlg.show();
    }
    void schools(){base("مدیریت مدارس");Button add=btn("➕ افزودن مدرسه");content.addView(add);gap();LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);content.addView(list);final Runnable[] load=new Runnable[1];load[0]=()->api.request("GET","/api/schools",null,new ApiClient.Callback(){public void ok(JSONObject o){list.removeAllViews();JSONArray a=o.optJSONArray("data");for(int i=0;i<(a==null?0:a.length());i++){JSONObject s=a.optJSONObject(i);Button b=btn("🏫 "+s.optString("name")+"\nکد: "+s.optString("code")+" | "+(s.optBoolean("active",true)?"فعال":"غیرفعال"));list.addView(b);gapView(list);b.setOnClickListener(v->schoolEdit(s,load[0]));}}public void fail(String m){toast(m);}});add.setOnClickListener(v->schoolEdit(null,load[0]));load[0].run();back();}
    void schoolEdit(JSONObject old,Runnable reload){
        LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);
        TextView error=tv("",15);error.setTextColor(Color.rgb(190,0,0));error.setVisibility(View.GONE);l.addView(error);
        EditText n=field("نام مدرسه"),type=field("نوع مدرسه"),code=field("کد مدرسه");CheckBox active=new CheckBox(this);active.setText("فعال");active.setChecked(old==null||old.optBoolean("active",true));
        l.addView(n);l.addView(type);l.addView(code);l.addView(active);
        if(old!=null){n.setText(old.optString("name"));type.setText(old.optString("type"));code.setText(old.optString("code"));}
        AlertDialog.Builder ab=new AlertDialog.Builder(this).setTitle(old==null?"افزودن مدرسه":"ویرایش مدرسه").setView(l).setPositiveButton("ذخیره",null).setNegativeButton("انصراف",null);
        if(old!=null)ab.setNeutralButton("حذف مدرسه",(d,w)->api.request("DELETE","/api/schools/"+old.optLong("id"),null,new ApiClient.Callback(){public void ok(JSONObject o){toast("مدرسه حذف شد");reload.run();}public void fail(String m){error.setText(m);error.setVisibility(View.VISIBLE);}}));
        AlertDialog dlg=ab.create();
        dlg.setOnShowListener(x->dlg.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{
            String name=n.getText().toString().trim(),schoolCode=code.getText().toString().trim();
            if(name.isEmpty()){error.setText("نام مدرسه الزامی است.");error.setVisibility(View.VISIBLE);n.requestFocus();return;}
            if(schoolCode.isEmpty()){error.setText("کد مدرسه الزامی است.");error.setVisibility(View.VISIBLE);code.requestFocus();return;}
            JSONObject z=new JSONObject();try{z.put("name",name);z.put("type",type.getText().toString().trim());z.put("code",schoolCode);z.put("active",active.isChecked());}catch(Exception e){error.setText("اطلاعات مدرسه معتبر نیست.");error.setVisibility(View.VISIBLE);return;}
            v.setEnabled(false);String path=old==null?"/api/schools":"/api/schools/"+old.optLong("id");api.request(old==null?"POST":"PATCH",path,z,new ApiClient.Callback(){public void ok(JSONObject o){v.setEnabled(true);dlg.dismiss();reload.run();}public void fail(String m){v.setEnabled(true);error.setText(m==null||m.trim().isEmpty()?"ذخیره مدرسه انجام نشد.":m);error.setVisibility(View.VISIBLE);}});
        }));
        dlg.show();
    }
    void settings(){base("تنظیمات");content.addView(tv("ارتباط با سرور: Render\nپایگاه داده: Supabase\nنسخه API: 2.1.0",16));gap();content.addView(tv("اندازه نوشته‌ها",18));LinearLayout row=new LinearLayout(this);row.setGravity(Gravity.CENTER);Button minus=btn("A−"),plus=btn("A+");row.addView(minus,new LinearLayout.LayoutParams(0,60,1));row.addView(plus,new LinearLayout.LayoutParams(0,60,1));content.addView(row);gap();minus.setOnClickListener(v->{fontScale=Math.max(.85f,fontScale-.05f);prefs.edit().putFloat("font_scale",fontScale).apply();settings();});plus.setOnClickListener(v->{fontScale=Math.min(1.25f,fontScale+.05f);prefs.edit().putFloat("font_scale",fontScale).apply();settings();});Button out=btn("خروج از حساب");content.addView(out);gap();out.setOnClickListener(v->{api.request("POST","/api/logout",null,new ApiClient.Callback(){public void ok(JSONObject o){api.clearToken();showLogin();}public void fail(String m){api.clearToken();showLogin();}});});back();}
    String fmt(long n){return NumberFormat.getNumberInstance(Locale.US).format(n);}
    String encrypt(String plain){try{KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);if(!ks.containsAlias(KEY_ALIAS)){KeyGenerator kg=KeyGenerator.getInstance("AES","AndroidKeyStore");kg.init(new android.security.keystore.KeyGenParameterSpec.Builder(KEY_ALIAS,android.security.keystore.KeyProperties.PURPOSE_ENCRYPT|android.security.keystore.KeyProperties.PURPOSE_DECRYPT).setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE).build());kg.generateKey();}SecretKey key=((KeyStore.SecretKeyEntry)ks.getEntry(KEY_ALIAS,null)).getSecretKey();Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key);byte[] iv=c.getIV(),ct=c.doFinal(plain.getBytes(StandardCharsets.UTF_8));return Base64.encodeToString(iv,2)+":"+Base64.encodeToString(ct,2);}catch(Exception e){return "";}}
    String decrypt(String enc){try{if(enc==null||enc.isEmpty())return "";String[] p=enc.split(":",2);KeyStore ks=KeyStore.getInstance("AndroidKeyStore");ks.load(null);SecretKey key=((KeyStore.SecretKeyEntry)ks.getEntry(KEY_ALIAS,null)).getSecretKey();Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,Base64.decode(p[0],2)));return new String(c.doFinal(Base64.decode(p[1],2)),StandardCharsets.UTF_8);}catch(Exception e){return "";}}
}
