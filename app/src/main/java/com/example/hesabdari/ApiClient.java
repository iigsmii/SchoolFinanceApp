package com.example.hesabdari;

import android.content.Context;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ApiClient {
    public interface Callback { void ok(JSONObject data); void fail(String message); }
    private final String base;
    private final Context context;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService pool = Executors.newFixedThreadPool(3);
    private volatile String token;
    public ApiClient(Context c){ context=c.getApplicationContext(); base="https://schoolfinanceapp.onrender.com"; }
    public void setToken(String t){token=t;}
    public String getToken(){return token;}
    public void clearToken(){token=null;}
    private void finish(Callback cb, JSONObject o){main.post(()->cb.ok(o));}
    private void error(Callback cb,String m){main.post(()->cb.fail(m));}
    public void request(String method,String path,JSONObject body,Callback cb){pool.execute(()->{HttpURLConnection c=null;try{
        URL u=new URL(base+path); c=(HttpURLConnection)u.openConnection(); c.setRequestMethod(method); c.setConnectTimeout(15000); c.setReadTimeout(30000); c.setDoInput(true); c.setRequestProperty("Accept","application/json");
        if(token!=null)c.setRequestProperty("Authorization","Bearer "+token);
        if(body!=null){c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json; charset=UTF-8");try(OutputStream os=c.getOutputStream()){os.write(body.toString().getBytes("UTF-8"));}}
        int code=c.getResponseCode(); InputStream in=code>=200&&code<400?c.getInputStream():c.getErrorStream(); String text=read(in); JSONObject o=text.isEmpty()?new JSONObject():new JSONObject(text);
        if(code>=200&&code<300&&o.optBoolean("success",true)){finish(cb,o);}else error(cb,o.optString("message","خطا در ارتباط با سرور"));
    }catch(Exception e){error(cb,"ارتباط با سرور برقرار نشد");}finally{if(c!=null)c.disconnect();}});}
    public void upload(Uri uri,String field,String path,JSONObject fields,Callback cb){ uploadFile(uri, field, path, fields, "file", "application/octet-stream", cb); }
    public void uploadFile(Uri uri,String field,String path,JSONObject fields,String fileName,String mime,Callback cb){pool.execute(()->{HttpURLConnection c=null;String boundary="----SchoolFinance"+System.currentTimeMillis();try{
        URL u=new URL(base+path);c=(HttpURLConnection)u.openConnection();c.setRequestMethod("POST");c.setDoOutput(true);c.setConnectTimeout(15000);c.setReadTimeout(60000);c.setRequestProperty("Authorization","Bearer "+token);c.setRequestProperty("Content-Type","multipart/form-data; boundary="+boundary);
        OutputStream out=c.getOutputStream(); if(fields!=null){JSONArray names=fields.names();if(names!=null)for(int i=0;i<names.length();i++){String n=names.getString(i);part(out,boundary,n,fields.optString(n));}}
        out.write(("--"+boundary+"\r\nContent-Disposition: form-data; name=\""+field+"\"; filename=\""+fileName+"\"\r\nContent-Type: "+mime+"\r\n\r\n").getBytes("UTF-8"));
        try(InputStream in=context.getContentResolver().openInputStream(uri)){if(in==null)throw new IOException();byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);}out.write("\r\n".getBytes());out.write(("--"+boundary+"--\r\n").getBytes());out.flush();out.close();
        int code=c.getResponseCode();String text=read(code>=200&&code<400?c.getInputStream():c.getErrorStream());JSONObject o=text.isEmpty()?new JSONObject():new JSONObject(text);if(code>=200&&code<300&&o.optBoolean("success",true))finish(cb,o);else error(cb,o.optString("message","آپلود انجام نشد"));
    }catch(Exception e){error(cb,"آپلود فایل انجام نشد");}finally{if(c!=null)c.disconnect();}});}
    private static void part(OutputStream out,String b,String n,String v)throws Exception{out.write(("--"+b+"\r\nContent-Disposition: form-data; name=\""+n+"\"\r\n\r\n"+v+"\r\n").getBytes("UTF-8"));}
    private static String read(InputStream in)throws Exception{if(in==null)return "";BufferedReader r=new BufferedReader(new InputStreamReader(in,"UTF-8"));StringBuilder s=new StringBuilder();String x;while((x=r.readLine())!=null)s.append(x);return s.toString();}
}
