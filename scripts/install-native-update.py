#!/usr/bin/env python3
"""Install the native APK installer Capacitor bridge (in-app update) after cap sync.

Run after scripts/install-native-sms.py (which creates/patches MainActivity)."""
from pathlib import Path
import re

root = Path("android/app/src/main")
nl = chr(10)

manifest = root / "AndroidManifest.xml"
content = manifest.read_text()
if "android.permission.REQUEST_INSTALL_PACKAGES" not in content:
    content = content.replace(
        "<application",
        '    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />' + nl + "    <application",
        1,
    )
if "fileprovider" not in content.lower():
    raise SystemExit("Capacitor FileProvider declaration not found in AndroidManifest.xml")
manifest.write_text(content)

# The APK is downloaded to the app cache dir; make sure the FileProvider can serve it.
paths = root / "res/xml/file_paths.xml"
if paths.exists():
    xml = paths.read_text()
    if "<cache-path" not in xml:
        xml = xml.replace("</paths>", '    <cache-path name="app_update_cache" path="." />' + nl + "</paths>")
        paths.write_text(xml)
else:
    raise SystemExit("res/xml/file_paths.xml not found")

java = root / "java/com/iigsmii/schoolfinance/ApkInstallerPlugin.java"
java.parent.mkdir(parents=True, exist_ok=True)
java.write_text("""package com.iigsmii.schoolfinance;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {
 @PluginMethod public void canInstall(PluginCall call) {
  boolean allowed = Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls();
  JSObject result = new JSObject();
  result.put("allowed", allowed);
  call.resolve(result);
 }

 @PluginMethod public void openInstallSettings(PluginCall call) {
  try {
   Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
   intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
   getContext().startActivity(intent);
   call.resolve();
  } catch (Exception e) {
   call.reject("باز کردن تنظیمات اجازه‌ی نصب انجام نشد: " + e.getMessage(), e);
  }
 }

 @PluginMethod public void install(PluginCall call) {
  String path = call.getString("path", "");
  if (path == null || path.isEmpty()) { call.reject("مسیر فایل برنامه خالی است."); return; }
  File file = new File(path);
  if (!file.exists() || file.length() < 1024) { call.reject("فایل نصب پیدا نشد؛ دوباره دانلود کنید."); return; }
  try {
   Context context = getContext();
   Uri uri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", file);
   Intent intent = new Intent(Intent.ACTION_VIEW);
   intent.setDataAndType(uri, "application/vnd.android.package-archive");
   intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
   context.startActivity(intent);
   call.resolve();
  } catch (Exception e) {
   call.reject("شروع نصب انجام نشد: " + e.getMessage(), e);
  }
 }
}
""")

activities = list(root.glob("java/**/MainActivity.java"))
if not activities:
    raise SystemExit("MainActivity.java not found; run install-native-sms.py first")
activity = activities[0]
source = activity.read_text()
if "ApkInstallerPlugin" not in source:
    source = source.replace(
        "import com.getcapacitor.BridgeActivity;",
        "import com.getcapacitor.BridgeActivity;" + nl + "import com.iigsmii.schoolfinance.ApkInstallerPlugin;",
        1,
    )
    if "super.onCreate(savedInstanceState);" not in source:
        raise SystemExit("MainActivity.onCreate not found; run install-native-sms.py first")
    source = source.replace(
        "super.onCreate(savedInstanceState);",
        "registerPlugin(ApkInstallerPlugin.class);" + nl + "        super.onCreate(savedInstanceState);",
        1,
    )
activity.write_text(source)
print("Native APK installer plugin and REQUEST_INSTALL_PACKAGES permission installed.")
