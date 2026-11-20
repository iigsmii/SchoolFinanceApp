#!/usr/bin/env python3
"""Install the native direct-SMS Capacitor bridge after cap sync."""
from pathlib import Path
import re

root = Path("android/app/src/main")
nl = chr(10)
manifest = root / "AndroidManifest.xml"
content = manifest.read_text()
if "android.permission.SEND_SMS" not in content:
    content = content.replace("<application", '    <uses-permission android:name="android.permission.SEND_SMS" />' + nl + '    <application', 1)
manifest.write_text(content)

java = root / "java/com/iigsmii/schoolfinance/NativeSmsPlugin.java"
java.parent.mkdir(parents=True, exist_ok=True)
java.write_text("""package com.iigsmii.schoolfinance;
import android.Manifest;
import android.content.pm.PackageManager;
import android.telephony.SmsManager;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.util.ArrayList;

@CapacitorPlugin(name = "NativeSms", permissions = {
 @Permission(alias = "sms", strings = { Manifest.permission.SEND_SMS })
})
public class NativeSmsPlugin extends Plugin {
 @PluginMethod public void requestPermission(PluginCall call) {
  requestPermissionForAlias("sms", call, "permissionResult");
 }
 @PermissionCallback private void permissionResult(PluginCall call) {
  JSObject result = new JSObject();
  result.put("granted", getPermissionState("sms") == PermissionState.GRANTED);
  call.resolve(result);
 }
 @PluginMethod public void send(PluginCall call) {
  String phone = call.getString("phone", "");
  String message = call.getString("message", "");
  if (getContext().checkSelfPermission(Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
   call.reject("مجوز ارسال پیامک صادر نشده است."); return;
  }
  if (phone.isEmpty() || message.isEmpty()) { call.reject("شماره یا متن پیام خالی است."); return; }
  try {
   SmsManager manager;
   if (android.os.Build.VERSION.SDK_INT >= 31) manager = getContext().getSystemService(SmsManager.class);
   else manager = SmsManager.getDefault();
   if (manager == null) { call.reject("سرویس پیامک اندروید در دسترس نیست."); return; }
   ArrayList<String> parts = manager.divideMessage(message);
   if (parts.size() > 1) manager.sendMultipartTextMessage(phone, null, parts, null, null);
   else manager.sendTextMessage(phone, null, message, null, null);
   JSObject result = new JSObject(); result.put("accepted", true); call.resolve(result);
  } catch (Exception e) { call.reject("ارسال توسط سیستم اندروید انجام نشد: " + e.getMessage(), e); }
 }
}
""")

activities = list(root.glob("java/**/MainActivity.java"))
if not activities:
    raise SystemExit("MainActivity.java not found after Capacitor sync")
activity = activities[0]
source = activity.read_text()
if "NativeSmsPlugin" not in source:
    source = source.replace(
        "import com.getcapacitor.BridgeActivity;",
        "import com.getcapacitor.BridgeActivity;" + nl + "import com.iigsmii.schoolfinance.NativeSmsPlugin;"
    )
    pattern = r"(public class MainActivity extends BridgeActivity \\{)"
    replacement = r"\\1" + nl + "    @Override" + nl + "    public void onCreate(android.os.Bundle savedInstanceState) {" + nl + "        registerPlugin(NativeSmsPlugin.class);" + nl + "        super.onCreate(savedInstanceState);" + nl + "    }"
    source, count = re.subn(pattern, replacement, source, count=1)
    if count != 1:
        raise SystemExit("Could not register NativeSmsPlugin in MainActivity")
activity.write_text(source)
print("Native SMS plugin and SEND_SMS permission installed.")
