#!/usr/bin/env python3
"""Install the background-alerts Capacitor bridge (notifications while the app is closed) after cap sync.

A WorkManager job runs about every 15 minutes, asks Apps Script `alerts_summary` with a long-lived
read-only alert token and shows a notification for items it has not shown yet.
Run after scripts/install-native-sms.py (which creates/patches MainActivity)."""
from pathlib import Path

root = Path("android/app/src/main")
nl = chr(10)

# ---- permission
manifest = root / "AndroidManifest.xml"
content = manifest.read_text()
if "android.permission.POST_NOTIFICATIONS" not in content:
    content = content.replace(
        "<application",
        '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />' + nl + "    <application",
        1,
    )
manifest.write_text(content)

# ---- WorkManager dependency
gradle = Path("android/app/build.gradle")
if not gradle.exists():
    raise SystemExit("android/app/build.gradle not found")
g = gradle.read_text()
if "androidx.work:work-runtime" not in g:
    if "dependencies {" not in g:
        raise SystemExit("dependencies block not found in android/app/build.gradle")
    g = g.replace("dependencies {", 'dependencies {' + nl + '    implementation "androidx.work:work-runtime:2.9.1"', 1)
    gradle.write_text(g)

pkg = root / "java/com/iigsmii/schoolfinance"
pkg.mkdir(parents=True, exist_ok=True)

(pkg / "AlertsWorker.java").write_text("""package com.iigsmii.schoolfinance;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

public class AlertsWorker extends Worker {
 static final String PREFS = "bg_alerts";
 static final String CHANNEL = "school_alerts";

 public AlertsWorker(@NonNull Context context, @NonNull WorkerParameters params) { super(context, params); }

 private static String persianDigits(String s) {
  StringBuilder b = new StringBuilder();
  for (char c : s.toCharArray()) b.append(c >= '0' && c <= '9' ? (char) ('\\u06F0' + (c - '0')) : c);
  return b.toString();
 }

 private String post(String url, String body) throws Exception {
  HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
  c.setRequestMethod("POST");
  c.setConnectTimeout(20000);
  c.setReadTimeout(40000);
  c.setInstanceFollowRedirects(true);
  c.setDoOutput(true);
  c.setRequestProperty("Content-Type", "text/plain;charset=utf-8");
  try (OutputStream os = c.getOutputStream()) { os.write(body.getBytes(StandardCharsets.UTF_8)); }
  int code = c.getResponseCode();
  InputStream is = code >= 400 ? c.getErrorStream() : c.getInputStream();
  if (is == null) throw new Exception("empty response " + code);
  StringBuilder sb = new StringBuilder();
  try (BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
   String line; while ((line = r.readLine()) != null) sb.append(line);
  }
  if (code >= 400) throw new Exception("http " + code);
  return sb.toString();
 }

 @NonNull @Override public Result doWork() {
  Context ctx = getApplicationContext();
  SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
  String url = sp.getString("url", "");
  String token = sp.getString("token", "");
  if (url.isEmpty() || token.isEmpty()) return Result.success();
  try {
   JSONObject req = new JSONObject();
   req.put("action", "alerts_summary");
   req.put("alert_token", token);
   JSONObject res = new JSONObject(post(url, req.toString()));
   if (!res.optBoolean("success")) {
    String err = res.optString("error", "");
    // An expired or revoked alert token is dropped; the app registers a new one the next time it opens.
    if (err.contains("توکن") || err.contains("غیرفعال")) sp.edit().remove("token").apply();
    return Result.success();
   }
   JSONArray items = res.optJSONArray("items");
   if (items == null) items = new JSONArray();
   boolean baseline = !sp.contains("keys");
   Set<String> previous = new HashSet<>(sp.getStringSet("keys", new HashSet<String>()));
   Set<String> current = new HashSet<>();
   Map<String, Integer> fresh = new LinkedHashMap<>();
   String firstRejected = "";
   for (int i = 0; i < items.length(); i++) {
    JSONObject it = items.getJSONObject(i);
    String key = it.optString("key");
    current.add(key);
    if (!baseline && !previous.contains(key)) {
     String label = it.optString("label");
     Integer n = fresh.get(label);
     fresh.put(label, n == null ? 1 : n + 1);
     if (firstRejected.isEmpty() && !it.optString("text").isEmpty()) firstRejected = it.optString("text");
    }
   }
   sp.edit().putStringSet("keys", current).apply();
   if (fresh.isEmpty()) return Result.success();
   if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return Result.success();

   StringBuilder text = new StringBuilder();
   for (Map.Entry<String, Integer> e : fresh.entrySet()) {
    if (text.length() > 0) text.append("\\u060C ");
    text.append(persianDigits(String.valueOf(e.getValue()))).append(" ").append(e.getKey());
   }
   if (!firstRejected.isEmpty()) text.append(" \\u2014 ").append(firstRejected);

   NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
   if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
    NotificationChannel ch = new NotificationChannel(CHANNEL, "\\u0647\\u0634\\u062F\\u0627\\u0631\\u0647\\u0627\\u06CC \\u0645\\u0627\\u0644\\u06CC", NotificationManager.IMPORTANCE_HIGH);
    nm.createNotificationChannel(ch);
   }
   Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
   if (launch != null) launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
   PendingIntent pi = launch == null ? null : PendingIntent.getActivity(ctx, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
   NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL)
    .setSmallIcon(ctx.getApplicationInfo().icon)
    .setContentTitle("\\u0646\\u06CC\\u0627\\u0632 \\u0628\\u0647 \\u0627\\u0642\\u062F\\u0627\\u0645 \\u2014 \\u0633\\u06CC\\u0633\\u062A\\u0645 \\u0645\\u0627\\u0644\\u06CC \\u0645\\u062F\\u0631\\u0633\\u0647")
    .setContentText(text.toString())
    .setStyle(new NotificationCompat.BigTextStyle().bigText(text.toString()))
    .setPriority(NotificationCompat.PRIORITY_HIGH)
    .setAutoCancel(true)
    .setContentIntent(pi);
   NotificationManagerCompat.from(ctx).notify(4001, b.build());
   return Result.success();
  } catch (Exception e) {
   return Result.retry();
  }
 }
}
""")

(pkg / "BackgroundAlertsPlugin.java").write_text("""package com.iigsmii.schoolfinance;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "BackgroundAlerts", permissions = {
 @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public class BackgroundAlertsPlugin extends Plugin {
 private static final String WORK = "school_bg_alerts";

 @PluginMethod public void requestPermission(PluginCall call) {
  if (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED) {
   JSObject r = new JSObject(); r.put("granted", true); call.resolve(r); return;
  }
  requestPermissionForAlias("notifications", call, "permissionResult");
 }

 @PermissionCallback private void permissionResult(PluginCall call) {
  JSObject r = new JSObject();
  r.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
  call.resolve(r);
 }

 @PluginMethod public void start(PluginCall call) {
  String url = call.getString("url", "");
  String token = call.getString("token", "");
  String userId = call.getString("userId", "");
  if (url == null || url.isEmpty() || token == null || token.isEmpty()) { call.reject("address or token is empty"); return; }
  Context ctx = getContext();
  SharedPreferences sp = ctx.getSharedPreferences(AlertsWorker.PREFS, Context.MODE_PRIVATE);
  SharedPreferences.Editor ed = sp.edit();
  // A different user on the same phone starts from a clean baseline.
  if (!userId.equals(sp.getString("user", ""))) ed.remove("keys");
  ed.putString("url", url).putString("token", token).putString("user", userId).apply();
  Constraints constraints = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
  PeriodicWorkRequest periodic = new PeriodicWorkRequest.Builder(AlertsWorker.class, 15, TimeUnit.MINUTES)
   .setConstraints(constraints).build();
  WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.UPDATE, periodic);
  OneTimeWorkRequest once = new OneTimeWorkRequest.Builder(AlertsWorker.class).setConstraints(constraints).build();
  WorkManager.getInstance(ctx).enqueueUniqueWork(WORK + "_now", ExistingWorkPolicy.REPLACE, once);
  call.resolve();
 }

 @PluginMethod public void stop(PluginCall call) {
  Context ctx = getContext();
  WorkManager.getInstance(ctx).cancelUniqueWork(WORK);
  ctx.getSharedPreferences(AlertsWorker.PREFS, Context.MODE_PRIVATE).edit().clear().apply();
  call.resolve();
 }
}
""")

activities = list(root.glob("java/**/MainActivity.java"))
if not activities:
    raise SystemExit("MainActivity.java not found; run install-native-sms.py first")
activity = activities[0]
source = activity.read_text()
if "BackgroundAlertsPlugin" not in source:
    if "super.onCreate(savedInstanceState);" not in source:
        raise SystemExit("MainActivity.onCreate not found; run install-native-sms.py first")
    source = source.replace(
        "import com.getcapacitor.BridgeActivity;",
        "import com.getcapacitor.BridgeActivity;" + nl + "import com.iigsmii.schoolfinance.BackgroundAlertsPlugin;",
        1,
    )
    source = source.replace(
        "super.onCreate(savedInstanceState);",
        "registerPlugin(BackgroundAlertsPlugin.class);" + nl + "        super.onCreate(savedInstanceState);",
        1,
    )
activity.write_text(source)
print("Background alerts plugin, WorkManager dependency and POST_NOTIFICATIONS permission installed.")
