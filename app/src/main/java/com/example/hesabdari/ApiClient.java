package com.example.hesabdari;

import android.content.Context;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;
import android.database.Cursor;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Google Apps Script adapter. Keeps the existing MainActivity API paths while
 * translating them to action-based Google Apps Script calls. */
public class ApiClient {
    public interface Callback { void ok(JSONObject data); void fail(String message); }
    private static final String BASE = "https://script.google.com/macros/s/AKfycbzgQ7xg0xIT5BMNEGenVNYtmMyfIGZZkdFVy5IqHrV22y4nzXubs3yAsh7jeewwhwixmA/exec";
    private final Context context;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService pool = Executors.newFixedThreadPool(3);
    private volatile String token;
    public ApiClient(Context c){ context=c.getApplicationContext(); }
    public void setToken(String t){token=t;}
    public String getToken(){return token;}
    public void clearToken(){token=null;}

    public void request(String method,String path,JSONObject body,Callback cb){
        pool.execute(()->{try{
            String p=path; JSONObject b=body==null?new JSONObject():new JSONObject(body.toString());
            String action=actionFor(method,p,b);
            b.put("action",action);
            if(token!=null && token.length()>0)b.put("token",token);
            JSONObject o=postJson(b);
            JSONObject result=adaptResponse(p,o);
            if(result.optBoolean("success",false)) main.post(()->cb.ok(result));
            else main.post(()->cb.fail(result.optString("message",result.optString("error","خطا در ارتباط با سرویس گوگل"))));
        }catch(Exception e){main.post(()->cb.fail("ارتباط با سرویس گوگل برقرار نشد"));}});
    }

    private String actionFor(String method,String path,JSONObject b){
        String p=path;
        if(p.startsWith("/api/students?q=")){put(b,"q",Uri.decode(p.substring(p.indexOf('=')+1)));return "students";}
        if(p.equals("/api/students")) return method.equals("GET")?"students":"student_add";
        if(p.matches("/api/students/\\d+")){put(b,"id",Long.parseLong(p.substring(p.lastIndexOf('/')+1)));return method.equals("GET")?"students":method.equals("DELETE")?"student_delete":"student_update";}
        if(p.matches("/api/students/\\d+/balance")){put(b,"student_id",Long.parseLong(p.split("/")[3]));return "tuition";}
        if(p.equals("/api/tuition/debt")||p.equals("/api/tuition/payment")){put(b,"type",p.endsWith("/debt")?"debt":"payment");return "tuition_add";}
        if(p.equals("/api/expenses"))return method.equals("GET")?"expenses": "expense_add";
        if(p.startsWith("/api/expense-categories")){String id=tail(p);if(id.length()>0)put(b,"id",Long.parseLong(id));return method.equals("GET")?"categories":method.equals("DELETE")?"category_delete":id.length()==0?"category_add":"category_update";}
        if(p.startsWith("/api/transactions?student_id=")){put(b,"student_id",Long.parseLong(p.substring(p.indexOf('=')+1)));return "transactions";}
        if(p.startsWith("/api/transactions?kind=")){put(b,"kind_query",Uri.decode(p.substring(p.indexOf('=')+1)));return "transactions";}
        if(p.equals("/api/transactions"))return "transactions";
        if(p.matches("/api/transactions/\\d+/review")){put(b,"id",Long.parseLong(p.split("/")[3]));return "transaction_review";}
        if(p.matches("/api/transactions/\\d+")){put(b,"id",Long.parseLong(tail(p)));return "transaction_delete";}
        if(p.equals("/api/bank/review"))return "transactions";
        if(p.equals("/api/bank/reconcile"))return "bank_reconcile";
        if(p.equals("/api/bank/upload"))return "bank_upload";
        if(p.equals("/api/senior-messages"))return method.equals("GET")?"messages":"message_add";
        if(p.startsWith("/api/senior-messages/")){put(b,"id",Long.parseLong(tail(p)));return "message_delete";}
        if(p.equals("/api/managers"))return method.equals("GET")?"managers":"manager_add";
        if(p.equals("/api/managers/import-attached"))return "manager_import_attached";
        if(p.startsWith("/api/managers/")){put(b,"id",Long.parseLong(tail(p)));return method.equals("DELETE")?"manager_delete":"manager_update";}
        if(p.equals("/api/schools"))return method.equals("GET")?"schools":"school_add";
        if(p.startsWith("/api/schools/")){put(b,"id",Long.parseLong(tail(p)));return method.equals("DELETE")?"school_delete":"school_update";}
        if(p.equals("/api/parsian/export"))return "parsian_export";
        if(p.equals("/api/parsian/school-map"))return "parsian_school_map";
        if(p.startsWith("/api/parsian/student-accounts")){int q=p.indexOf("?q=");if(q>=0)put(b,"q",Uri.decode(p.substring(q+3)));return "parsian_student_accounts";}
        if(p.equals("/api/parsian/student-account/allocate"))return "parsian_allocate";
        if(p.equals("/api/attachments"))return "attachment";
        if(p.equals("/api/login"))return "login";
        if(p.equals("/api/logout"))return "logout";
        return pathToAction(p);
    }

    private String pathToAction(String p){
        if(p.equals("/api/tuition"))return "tuition";
        if(p.equals("/api/expenses"))return "expenses";
        return "health";
    }

    private JSONObject adaptResponse(String path,JSONObject o) throws Exception{
        if(!o.optBoolean("success",false))return o;
        if(path.equals("/api/students")||path.startsWith("/api/students?q="))return o;
        if(path.matches("/api/students/\\d+")){
            JSONArray a=o.optJSONArray("data"); if(a!=null){long id=Long.parseLong(tail(path));for(int i=0;i<a.length();i++)if(a.optJSONObject(i).optLong("id")!=id)a.remove(i--);}
        }
        if(path.matches("/api/students/\\d+/balance")){
            long balance=0; JSONArray a=o.optJSONArray("data"); if(a!=null) for(int i=0;i<a.length();i++){JSONObject x=a.optJSONObject(i); if(x==null)continue; long amount=x.optLong("amount"); if("debt".equals(x.optString("type"))) balance+=amount; else if("payment".equals(x.optString("type"))) balance-=amount;} JSONObject r=new JSONObject(); r.put("success",true); r.put("balance",Math.max(0,balance)); return r;
        }
        if(path.startsWith("/api/transactions")){
            JSONArray a=o.optJSONArray("data");
            if(a!=null){for(int i=0;i<a.length();i++){JSONObject t=a.optJSONObject(i);if(t==null)continue;String kind=t.optString("kind");if("debt".equals(kind))kind="شهریه_بدهی";else if("payment".equals(kind))kind="شهریه";else if("expense".equals(kind))kind="هزینه";t.put("kind",kind);long amount=t.optLong("amount");t.put("debit","هزینه".equals(kind)||"شهریه_بدهی".equals(kind)?amount:0);t.put("credit","شهریه".equals(kind)?amount:0);t.put("comment",t.optString("description"));t.put("attachment_url",t.optString("attachment_url",t.optString("image_url","")));t.put("reconciled",t.optBoolean("reconciled",false));t.put("review_status",t.optBoolean("approved",false)?"approved":"pending");}}
        }
        return o;
    }

    private static void put(JSONObject b,String k,Object v){try{b.put(k,v);}catch(Exception ignored){}}

    private JSONObject postJson(JSONObject b)throws Exception{
        HttpURLConnection c=null;
        try{
            URL u=new URL(BASE);c=(HttpURLConnection)u.openConnection();c.setRequestMethod("POST");c.setDoOutput(true);c.setDoInput(true);c.setConnectTimeout(20000);c.setReadTimeout(60000);c.setRequestProperty("Content-Type","application/json; charset=UTF-8");c.setRequestProperty("Accept","application/json");
            try(OutputStream os=c.getOutputStream()){os.write(b.toString().getBytes("UTF-8"));}
            int code=c.getResponseCode();InputStream in=code>=200&&code<400?c.getInputStream():c.getErrorStream();String text=read(in);return text.isEmpty()?new JSONObject():new JSONObject(text);
        }finally{if(c!=null)c.disconnect();}
    }

    public void upload(Uri uri,String field,String path,JSONObject fields,Callback cb){uploadFile(uri,field,path,fields,"file","image/jpeg",cb);}
    public void uploadFile(Uri uri,String field,String path,JSONObject fields,String fileName,String mime,Callback cb){
        pool.execute(()->{try{
            byte[] data=readUri(uri);JSONObject b=fields==null?new JSONObject():new JSONObject(fields.toString());b.put("base64",android.util.Base64.encodeToString(data,android.util.Base64.NO_WRAP));b.put("file_name",fileName);b.put("mime_type",mime);b.put("source_type",fields==null?"general":fields.optString("entity_type",fields.optString("source_type","general")));b.put("source_id",fields==null?"":fields.optString("entity_id",fields.optString("source_id","")));b.put("action","attachment");if(token!=null)b.put("token",token);JSONObject o=postJson(b);if(o.optBoolean("success",false))main.post(()->cb.ok(o));else main.post(()->cb.fail(o.optString("message",o.optString("error","آپلود انجام نشد"))));
        }catch(Exception e){main.post(()->cb.fail("آپلود فایل انجام نشد"));}});
    }
    private byte[] readUri(Uri uri)throws Exception{try(InputStream in=context.getContentResolver().openInputStream(uri);ByteArrayOutputStream out=new ByteArrayOutputStream()){if(in==null)throw new IOException();byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1)out.write(buf,0,n);return out.toByteArray();}}
    private static String tail(String p){String s=p.substring(p.lastIndexOf('/')+1);int q=s.indexOf('?');return q>=0?s.substring(0,q):s;}
    private static String read(InputStream in)throws Exception{if(in==null)return "";BufferedReader r=new BufferedReader(new InputStreamReader(in,"UTF-8"));StringBuilder s=new StringBuilder();String x;while((x=r.readLine())!=null)s.append(x);return s.toString();}
}

