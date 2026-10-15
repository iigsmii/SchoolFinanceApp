package com.example.hesabdari;

import android.content.Context;
import android.app.Activity;
import android.app.Dialog;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.TextView;
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
    private static final String BASE = "https://script.google.com/macros/s/AKfycbzsCUERpyKBOZg4z4AMua3RvWKgguw73-1ZtkzgjrJdfA4yOX2d69WqlXy1FS7NPHnxqA/exec";
    private final Context context;
    private final Handler main = new Handler(Looper.getMainLooper());
    private Dialog waitDialog;
    private final ExecutorService pool = Executors.newFixedThreadPool(6);
    private volatile String token;
    private volatile boolean closed;
    private int activeWrites;
    private static final int MAX_FILE_BYTES=5*1024*1024, MAX_RESPONSE_BYTES=8*1024*1024;
    private final java.util.Set<String> inFlight=new java.util.HashSet<>();
    public ApiClient(Context c){ context=c; }
    private void showWaiting(){
        activeWrites++;
        if(!alive())return;
        if(!(context instanceof Activity)) return; Activity a=(Activity)context; if(a.isFinishing()||a.isDestroyed()) return; if(waitDialog!=null&&waitDialog.isShowing()) return;
        waitDialog=new Dialog(a);TextView t=new TextView(a);t.setText("لطفاً منتظر بمانید...\nدر حال ثبت اطلاعات");t.setTextSize(18);t.setTextColor(Color.DKGRAY);t.setGravity(Gravity.CENTER);t.setPadding(45,35,45,35);waitDialog.setContentView(t);waitDialog.setCancelable(false);if(waitDialog.getWindow()!=null)waitDialog.getWindow().setBackgroundDrawableResource(android.R.color.white);waitDialog.show();
    }
    private void hideWaiting(){activeWrites=Math.max(0,activeWrites-1);if(activeWrites==0&&waitDialog!=null&&waitDialog.isShowing())waitDialog.dismiss();}
    private boolean alive(){return !closed&&(!(context instanceof Activity)||(!((Activity)context).isFinishing()&&!((Activity)context).isDestroyed()));}
    public void close(){closed=true;pool.shutdownNow();main.removeCallbacksAndMessages(null);if(waitDialog!=null&&waitDialog.isShowing())waitDialog.dismiss();waitDialog=null;}
    private boolean guarded(String action){return action.equals("tuition_add")||action.equals("tuition_bulk_debt")||action.equals("expense_add")||action.equals("finance_transaction")||action.equals("cheque_review");}
    private String operationKey(JSONObject b)throws Exception{
        java.util.TreeMap<String,String> sorted=new java.util.TreeMap<>();java.util.Iterator<String> keys=b.keys();
        while(keys.hasNext()){String k=keys.next();if(!k.equals("token")&&!k.equals("request_id"))sorted.put(k,b.optString(k));}
        byte[] digest=java.security.MessageDigest.getInstance("SHA-256").digest(sorted.toString().getBytes("UTF-8"));
        StringBuilder out=new StringBuilder();for(byte x:digest)out.append(String.format(java.util.Locale.US,"%02x",x&255));
        return "pending_"+out;
    }
    public void setToken(String t){token=t;}
    public String getToken(){return token;}
    public void clearToken(){token=null;context.getSharedPreferences("school_finance",Context.MODE_PRIVATE).edit().remove("login_user").remove("login_pass").apply();}

    public void request(String method,String path,JSONObject body,Callback cb){
        if(closed)return;
        final boolean write=!method.equalsIgnoreCase("GET");
        if(write) main.post(this::showWaiting);
        pool.execute(()->{String pendingKey=null;boolean claimed=false;try{
            String p=path; JSONObject b=body==null?new JSONObject():new JSONObject(body.toString());
            // Keep one request contract between Android and Apps Script.
            // Older UI forms still send comment; the backend stores description.
            if (b.has("comment") && !b.has("description")) {
                b.put("description", b.optString("comment", ""));
            }
            // The cheque review payload has its own decision (receive/favor/reject).
            // Preserve it before replacing `action` with the Apps Script route name.
            if (p.matches("/api/cheques/\\d+/review")) {
                String decision = b.optString("review_action", b.optString("decision", b.optString("action", "")));
                if (!decision.isEmpty()) b.put("review_action", decision);
            }
            String action=actionFor(method,p,b);
            b.put("action",action);
            if(guarded(action)){
                pendingKey=operationKey(b);
                synchronized(inFlight){if(!inFlight.add(pendingKey))throw new IOException("این عملیات هنوز در حال ثبت است.");claimed=true;}
                android.content.SharedPreferences pending=context.getSharedPreferences("financial_pending",Context.MODE_PRIVATE);
                String saved=pending.getString(pendingKey,null);
                String rid=saved==null?java.util.UUID.randomUUID().toString():saved;
                if(saved==null&&!pending.edit().putString(pendingKey,rid).commit())throw new IOException("ذخیره شناسه عملیات انجام نشد.");
                b.put("request_id",rid);
            }
            if(token!=null && token.length()>0)b.put("token",token);
            // Authenticated reads use POST too: session tokens never belong in URLs.
            JSONObject o=postJson(b);
            JSONObject result=adaptResponse(p,o);
            // Keep the same ID on every failure, including expired auth, until success is known.
            if(pendingKey!=null&&result.optBoolean("success",false))
                context.getSharedPreferences("financial_pending",Context.MODE_PRIVATE).edit().remove(pendingKey).commit();
            if(result.optBoolean("success",false)) main.post(()->{if(write)hideWaiting();if(alive())cb.ok(result);});
            else main.post(()->{if(write)hideWaiting();if(alive())cb.fail(result.optString("message",result.optString("error","خطا در ارتباط با سرویس گوگل")));});
        }catch(Exception e){main.post(()->{if(write)hideWaiting();if(alive())cb.fail(e instanceof IOException&&e.getMessage()!=null?e.getMessage():"ارتباط برقرار نشد؛ برای ثبت مالی، نتیجه را بررسی و همان اطلاعات را دوباره ارسال کنید.");});}
        finally{if(claimed&&pendingKey!=null)synchronized(inFlight){inFlight.remove(pendingKey);}}});
    }

    private String actionFor(String method,String path,JSONObject b){
        String p=path;
        if(p.startsWith("/api/students?")){
            String qs=p.substring(p.indexOf('?')+1);
            for(String part:qs.split("&")){int eq=part.indexOf('=');if(eq>0){String k=Uri.decode(part.substring(0,eq));String v=Uri.decode(part.substring(eq+1));put(b,k,v);}}
            return "students";
        }
        if(p.equals("/api/students")) return method.equals("GET")?"students":"student_add";
        if(p.matches("/api/students/\\d+")){put(b,"id",Long.parseLong(p.substring(p.lastIndexOf('/')+1)));return method.equals("GET")?"students":method.equals("DELETE")?"student_delete":"student_update";}
        if(p.matches("/api/students/\\d+/balance")){put(b,"student_id",Long.parseLong(p.split("/")[3]));return "tuition";}
        if(p.startsWith("/api/tuition?")){
            String qs=p.substring(p.indexOf('?')+1);
            for(String part:qs.split("&")){int eq=part.indexOf('=');if(eq>0){String k=Uri.decode(part.substring(0,eq));String v=Uri.decode(part.substring(eq+1));put(b,k,v);}}
            return "tuition";
        }
        if(p.equals("/api/tuition/debt")||p.equals("/api/tuition/payment")){put(b,"type",p.endsWith("/debt")?"debt":"payment");return "tuition_add";}
        if(p.equals("/api/tuition/bulk-debt")) return "tuition_bulk_debt";
        if(p.equals("/api/expenses"))return method.equals("GET")?"expenses": "expense_add";
        if(p.matches("/api/expense/\\d+")){put(b,"id",Long.parseLong(tail(p)));return method.equals("DELETE")?"expense_delete":"expense_update";}
        if(p.equals("/api/bank"))return "bank";
        if(p.equals("/api/my-claim"))return "my_claim";
        if(p.equals("/api/summary"))return "summary";
        if(p.equals("/api/app-version"))return "app_version";
        if(p.equals("/api/cheques/list"))return "cheque_list";
        if(p.equals("/api/cheques"))return "cheques";
        if(p.equals("/api/cheque/alerts"))return "cheque_alerts";
        if(p.matches("/api/cheques/\\d+/review")){put(b,"id",Long.parseLong(p.split("/")[3]));return "cheque_review";}
        if(p.startsWith("/api/expense-categories")){String id=p.equals("/api/expense-categories")?"":tail(p);if(id.length()>0)put(b,"id",id);return method.equals("GET")?"categories":method.equals("DELETE")?"category_delete":id.length()==0?"category_add":"category_update";}
        if(p.startsWith("/api/transactions?student_id=")){put(b,"student_id",Long.parseLong(p.substring(p.indexOf('=')+1)));return "transactions";}
        if(p.startsWith("/api/transactions?kind=")){put(b,"kind_query",Uri.decode(p.substring(p.indexOf('=')+1)));return "transactions";}
        if(p.equals("/api/transactions"))return "transactions";
        if(p.matches("/api/transactions/\\d+/review")){put(b,"id",Long.parseLong(p.split("/")[3]));return "transaction_review";}
        if(p.matches("/api/transactions/\\d+")){
            put(b,"id",Long.parseLong(tail(p)));
            if(method.equalsIgnoreCase("PATCH")) return "transaction_update";
            if(method.equalsIgnoreCase("DELETE")) return "transaction_delete";
            return "transactions";
        }
        if(p.matches("/api/tuition/\\d+")){
            put(b,"id",Long.parseLong(tail(p)));
            return method.equalsIgnoreCase("DELETE") ? "tuition_delete" : "tuition_update";
        }
        if(p.equals("/api/bank/review"))return "bank_review";
        if(p.equals("/api/bank/reconcile"))return "bank_reconcile";
        if(p.equals("/api/bank/match"))return "bank_match";
        if(p.equals("/api/bank/upload"))return "bank_upload";
        if(p.equals("/api/students/import"))return "students_import";
        if(p.equals("/api/senior-messages"))return method.equals("GET")?"messages":"message_add";
        if(p.startsWith("/api/senior-messages/")){put(b,"id",tail(p));return "message_delete";}
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
        if(p.equals("/api/attachment-read"))return "attachment_read";
        if(p.equals("/api/activity-logs")) return "activity_logs";
        if(p.startsWith("/api/activity-logs?")){int q=p.indexOf("?");String qs=p.substring(q+1);for(String part:qs.split("&")){int eq=part.indexOf('=');if(eq>0)put(b,Uri.decode(part.substring(0,eq)),Uri.decode(part.substring(eq+1)));}return "activity_logs";}
        if(p.equals("/api/login"))return "login";
        if(p.equals("/api/logout"))return "logout";
        return pathToAction(p);
    }

    private String pathToAction(String p){
        if(p.equals("/api/tuition"))return "tuition";
        if(p.equals("/api/expenses"))return "expenses";
        if(p.equals("/api/finance-transaction"))return "finance_transaction";
        throw new IllegalArgumentException("مسیر درخواست پشتیبانی نمی‌شود: "+p);
    }

    private JSONObject adaptResponse(String path,JSONObject o) throws Exception{
        if(!o.optBoolean("success",false))return o;
        if(path.equals("/api/students")||path.startsWith("/api/students?q="))return o;
        if(path.matches("/api/students/\\d+")){
            JSONArray a=o.optJSONArray("data");
            if(a!=null){
                long id=Long.parseLong(tail(path)); JSONObject found=null;
                for(int i=0;i<a.length();i++){JSONObject item=a.optJSONObject(i);if(item!=null&&item.optLong("id")==id){found=item;break;}}
                o.put("data",found==null?JSONObject.NULL:found);
            }
        }
        if(path.matches("/api/students/\\d+/balance")){
            long balance=0; JSONArray a=o.optJSONArray("data"); if(a!=null) for(int i=0;i<a.length();i++){JSONObject x=a.optJSONObject(i); if(x==null)continue; long amount=x.optLong("amount"); if("debt".equals(x.optString("type"))) balance+=amount; else if("payment".equals(x.optString("type"))) balance-=amount;} JSONObject r=new JSONObject(); r.put("success",true); r.put("balance",balance); r.put("debt",Math.max(0,balance)); r.put("credit",Math.max(0,-balance)); return r;
        }
        if(path.startsWith("/api/transactions")||path.equals("/api/bank/review")){
            JSONArray a=o.optJSONArray("data");
            if(a!=null){for(int i=0;i<a.length();i++){JSONObject t=a.optJSONObject(i);if(t==null)continue;String kind=t.optString("kind");if("debt".equals(kind))kind="شهریه_بدهی";else if("payment".equals(kind))kind="شهریه";else if("expense".equals(kind))kind="هزینه";t.put("kind",kind);long amount=t.optLong("amount");t.put("debit","هزینه".equals(kind)||"شهریه_بدهی".equals(kind)?amount:0);t.put("credit","شهریه".equals(kind)?amount:0);t.put("comment",t.optString("description"));t.put("attachment_url",t.optString("attachment_url",t.optString("image_url","")));t.put("reconciled",t.optBoolean("reconciled",false));t.put("review_status",t.optBoolean("approved",false)?"approved":"pending");}}
        }
        return o;
    }

    private static void put(JSONObject b,String k,Object v){try{b.put(k,v);}catch(Exception ignored){}}

    private JSONObject getJson(JSONObject b)throws Exception{
        if(b.has("token"))return postJson(b);
        StringBuilder q=new StringBuilder();
        JSONArray names=b.names();
        if(names!=null) for(int i=0;i<names.length();i++){
            String k=names.optString(i);
            // Keep action in the query string: Apps Script doGet routes requests by action.
            // Only the local endpoint field is omitted because it is not needed for GET.
            if("endpoint".equals(k)) continue;
            if(q.length()>0) q.append('&');
            q.append(URLEncoder.encode(k,"UTF-8")).append('=')
             .append(URLEncoder.encode(b.optString(k,""),"UTF-8"));
        }
        URL u=new URL(BASE+(q.length()>0?"?"+q:""));
        HttpURLConnection c=(HttpURLConnection)u.openConnection();
        c.setRequestMethod("GET"); c.setDoInput(true); c.setConnectTimeout(15000); c.setReadTimeout(45000);
        c.setRequestProperty("Accept","application/json");
        int code=c.getResponseCode(); InputStream in=code>=200&&code<400?c.getInputStream():c.getErrorStream();
        String text=read(in); c.disconnect();
        return text.isEmpty()?new JSONObject():new JSONObject(text);
    }

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
        if(closed)return;
        main.post(this::showWaiting);
        pool.execute(()->{try{
            byte[] data=readUri(uri);JSONObject b=fields==null?new JSONObject():new JSONObject(fields.toString());b.put("base64",android.util.Base64.encodeToString(data,android.util.Base64.NO_WRAP));b.put("file_name",fileName);b.put("mime_type",mime);b.put("content_type",mime);b.put("source_type",fields==null?"general":fields.optString("entity_type",fields.optString("source_type","general")));b.put("source_id",fields==null?"":fields.optString("entity_id",fields.optString("source_id","")));String a=uploadAction(path);b.put("action",a);b.put("endpoint",a);b.put("api_version","2.15.0");if(token!=null)b.put("token",token);JSONObject o=postJson(b);main.post(()->{hideWaiting();if(!alive())return;if(o.optBoolean("success",false))cb.ok(o);else cb.fail(o.optString("message",o.optString("error","آپلود انجام نشد")));});
        }catch(Exception e){main.post(()->{hideWaiting();if(alive())cb.fail(e.getMessage()==null?"آپلود فایل انجام نشد":e.getMessage());});}});
    }

    private String uploadAction(String path){
        if("/api/students/import".equals(path)) return "students_import";
        if("/api/bank/upload".equals(path)) return "bank_upload";
        return "attachment";
    }
    private byte[] readUri(Uri uri)throws Exception{
        try(Cursor cur=context.getContentResolver().query(uri,new String[]{OpenableColumns.SIZE},null,null,null)){if(cur!=null&&cur.moveToFirst()&&!cur.isNull(0)&&cur.getLong(0)>MAX_FILE_BYTES)throw new IOException("حجم فایل نباید بیشتر از ۵ مگابایت باشد.");}
        try(InputStream in=context.getContentResolver().openInputStream(uri);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            if(in==null)throw new IOException("فایل باز نشد.");byte[] buf=new byte[8192];int n,total=0;
            while((n=in.read(buf))!=-1){total+=n;if(total>MAX_FILE_BYTES)throw new IOException("حجم فایل نباید بیشتر از ۵ مگابایت باشد.");out.write(buf,0,n);}return out.toByteArray();
        }
    }
    private static String tail(String p){String s=p.substring(p.lastIndexOf('/')+1);int q=s.indexOf('?');return q>=0?s.substring(0,q):s;}
    private static String read(InputStream in)throws Exception{if(in==null)return "";try(InputStream source=in;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buf=new byte[8192];int n,total=0;while((n=source.read(buf))!=-1){total+=n;if(total>MAX_RESPONSE_BYTES)throw new IOException("پاسخ سرور بیش از حد بزرگ است.");out.write(buf,0,n);}return out.toString("UTF-8");}}
}

