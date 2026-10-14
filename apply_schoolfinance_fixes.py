#!/usr/bin/env python3
# Apply targeted safety/accounting fixes to a clean SchoolFinanceApp main checkout.
# Run from repository root: python apply_schoolfinance_fixes.py
# Creates .bak files before modifying source and refuses mismatched source fragments.
from pathlib import Path
import sys

ROOT = Path.cwd()
MAIN = ROOT / "app/src/main/java/com/example/hesabdari/MainActivity.java"
API = ROOT / "app/src/main/java/com/example/hesabdari/ApiClient.java"
GS = ROOT / "SchoolFinanceApp_GoogleAppsScript_FINAL.gs"

for p in (MAIN, API, GS):
    if not p.is_file():
        sys.exit(f"ERROR: {p} not found. Run this from the SchoolFinanceApp repository root.")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly 1 match, found {count}; no further edits applied.")
    return text.replace(old, new, 1)

main_text = MAIN.read_text(encoding="utf-8")
api_text = API.read_text(encoding="utf-8")
gs_text = GS.read_text(encoding="utf-8")

main_text = replace_once(
    main_text,
    'if(!isNewerVersion(v,"2.14.0")){return;}',
    'if(!isNewerVersion(v,currentVersionName())){return;}',
    "dynamic app version comparison",
)
main_text = replace_once(
    main_text,
    '    boolean isNewerVersion(String remote,String local){',
    '''    String currentVersionName(){
        try {
            android.content.pm.PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
            return info.versionName == null ? "0.0.0" : info.versionName;
        } catch (Exception e) {
            return "0.0.0";
        }
    }
    boolean isNewerVersion(String remote,String local){''',
    "current app version helper",
)
main_text = replace_once(
    main_text,
    '''    void downloadAndInstallUpdate(String url,String version){
        Toast.makeText(this,"در حال دریافت نسخه "+version+"...",Toast.LENGTH_LONG).show();''',
    '''    void downloadAndInstallUpdate(String url,String version){
        Uri updateUri = Uri.parse(url == null ? "" : url.trim());
        if (!"https".equalsIgnoreCase(updateUri.getScheme()) || updateUri.getHost() == null) {
            toast("برای امنیت، نشانی آپدیت باید HTTPS معتبر باشد.");
            return;
        }
        Toast.makeText(this,"در حال دریافت نسخه "+version+"...",Toast.LENGTH_LONG).show();''',
    "HTTPS update URL guard",
)
main_text = replace_once(
    main_text,
    'c.connect();int code=c.getResponseCode();if(code<200||code>=400)throw new Exception("HTTP "+code);',
    'c.connect();if(!"https".equalsIgnoreCase(c.getURL().getProtocol()))throw new Exception("Update redirect must remain HTTPS");int code=c.getResponseCode();if(code<200||code>=400)throw new Exception("HTTP "+code);',
    "HTTPS redirect guard",
)

api_text = replace_once(
    api_text,
    '        if(p.equals("/api/bank/reconcile"))return "bank_reconcile";',
    '        if(p.equals("/api/bank/reconcile"))return "bank_reconcile";\n        if(p.equals("/api/bank/match"))return "bank_match";',
    "bank match route mapping",
)


gs_text = replace_once(
    gs_text,
    "      case 'bank_reconcile': result=bankReconcile_(body); break;",
    "      case 'bank_reconcile': result=bankReconcile_(body); break;\\n      case 'bank_match': result=bankMatch_(body); break;",
    "bank match action routing",
)

old_reconcile = '''  const banks=rows_('Bank').map(x=>x.obj);
  const txRows=rows_('Transactions'); let matched=0,unmatched=0;
  txRows.forEach(x=>{
    const t=x.obj;
    // Student debts are accounting obligations, not bank deposits and must never be reconciled with Bank.
    if(String(t.kind)==='debt') return;
    const hit=banks.find(z=>String(z.tracking_code||'') && String(z.tracking_code||'')===String(t.tracking_code||'') && String(z.school_id)===String(t.school_id)) ||
              banks.find(z=>Number(z.amount)===Number(t.amount) && String(z.school_id)===String(t.school_id));
    const ok=!!hit;
    if(ok){ matched++; updateRow_('Transactions',x.row,[t.id,t.date,t.school_id,t.kind,t.amount,t.description,t.tracking_code,t.image_url,t.created_by,t.created_at,true,t.approved,t.source_id,t.payment_source||'']); }
    else { unmatched++; updateRow_('Transactions',x.row,[t.id,t.date,t.school_id,t.kind,t.amount,t.description,t.tracking_code,t.image_url,t.created_by,t.created_at,false,t.approved,t.source_id,t.payment_source||'']); }
  });
  // Resolve approved cheques from bank rows. A bank description containing return/bounce terms marks the cheque as unpaid.'''
new_reconcile = '''  const bankRows=rows_('Bank');
  const banks=bankRows.map(x=>x.obj);
  const txRows=rows_('Transactions'); let matched=0,unmatched=0;
  const usedBankIds={};
  // Reserve bank rows that are already linked, so one deposit cannot match multiple app transactions.
  bankRows.forEach(x=>{
    const z=x.obj;
    if(String(z.matched)==='true' || String(z.matched_transaction_id||'')!=='') usedBankIds[String(z.id)]=true;
  });
  txRows.forEach(x=>{
    const t=x.obj;
    // Student debts are accounting obligations, not bank deposits and must never be reconciled with Bank.
    if(String(t.kind)==='debt'){
      const linked=bankRows.find(z=>String(z.obj.matched_transaction_id||'')===String(t.id));
      if(linked){
        const z=linked.obj;
        updateRow_('Bank',linked.row,[z.id,z.date,z.school_id,z.amount,z.description,z.tracking_code,z.bank_account,z.created_at,'',false,z.approved]);
        delete usedBankIds[String(z.id)];
      }
      if(String(t.reconciled)==='true') updateRow_('Transactions',x.row,[t.id,t.date,t.school_id,t.kind,t.amount,t.description,t.tracking_code,t.image_url,t.created_by,t.created_at,false,t.approved,t.source_id,t.payment_source||'']);
      return;
    }
    // Keep a previously saved link stable on subsequent reconciliation runs.
    const existing=bankRows.find(z=>String(z.obj.matched_transaction_id||'')===String(t.id));
    if(existing){
      usedBankIds[String(existing.obj.id)]=true;
      matched++;
      if(String(t.reconciled)!=='true') updateRow_('Transactions',x.row,[t.id,t.date,t.school_id,t.kind,t.amount,t.description,t.tracking_code,t.image_url,t.created_by,t.created_at,true,t.approved,t.source_id,t.payment_source||'']);
      return;
    }
    const available=z=>!usedBankIds[String(z.id)] && String(z.school_id)===String(t.school_id);
    const hitRow=bankRows.find(z=>available(z.obj) && String(z.obj.tracking_code||'')!=='' && String(z.obj.tracking_code||'')===String(t.tracking_code||'')) ||
                 bankRows.find(z=>available(z.obj) && Number(z.obj.amount)>0 && Number(z.obj.amount)===Number(t.amount));
    if(hitRow){
      const z=hitRow.obj;
      usedBankIds[String(z.id)]=true;
      updateRow_('Bank',hitRow.row,[z.id,z.date,z.school_id,z.amount,z.description,z.tracking_code,z.bank_account,z.created_at,String(t.id),true,z.approved]);
      matched++;
      updateRow_('Transactions',x.row,[t.id,t.date,t.school_id,t.kind,t.amount,t.description,t.tracking_code,t.image_url,t.created_by,t.created_at,true,t.approved,t.source_id,t.payment_source||'']);
    } else {
      unmatched++;
      if(String(t.reconciled)==='true') updateRow_('Transactions',x.row,[t.id,t.date,t.school_id,t.kind,t.amount,t.description,t.tracking_code,t.image_url,t.created_by,t.created_at,false,t.approved,t.source_id,t.payment_source||'']);
    }
  });
  // Resolve approved cheques from bank rows. A bank description containing return/bounce terms marks the cheque as unpaid.'''
gs_text = replace_once(gs_text, old_reconcile, new_reconcile, "one-to-one bank reconciliation")

gs_text = replace_once(
    gs_text,
    "const hit=banks.find(z=>String(z.tracking_code||'')===String(c.sayad_id||'') && String(z.school_id)===String(c.school_id)) || banks.find(z=>Number(z.amount)===Number(c.amount) && String(z.school_id)===String(c.school_id) && String(z.date||'')>=String(c.due_date||''));\n    if(!hit) return;\n    const desc=String(hit.description||'');",
    "const hit=banks.find(z=>!usedBankIds[String(z.id)] && String(z.tracking_code||'')===String(c.sayad_id||'') && String(z.school_id)===String(c.school_id)) || banks.find(z=>!usedBankIds[String(z.id)] && Number(z.amount)===Number(c.amount) && String(z.school_id)===String(c.school_id) && String(z.date||'')>=String(c.due_date||''));\n    if(!hit) return;\n    usedBankIds[String(hit.id)]=true;\n    const desc=String(hit.description||'');",
    "prevent bank row reuse for cheques",
)


start = gs_text.find("function bankMatch_(b) {")
end = gs_text.find("function transactionReview_(b)", start)
if start < 0 or end < 0:
    raise RuntimeError("manual bank-match handler: expected function boundaries not found")
new_bank_match = '''function bankMatch_(b) {
  auth_(b,['senior','admin']);
  const hit=findRow_('Bank',b.id);
  if(!hit) throw new Error('تراکنش بانکی یافت نشد.');
  const transactionId=String(b.transaction_id||'');
  const tx=findRow_('Transactions',transactionId);
  if(!tx) throw new Error('تراکنش اپ یافت نشد.');
  if(String(tx.obj.kind)==='debt') throw new Error('بدهی دانش‌آموز قابل تطبیق با بانک نیست.');
  if(String(hit.obj.school_id)!==String(tx.obj.school_id)) throw new Error('تراکنش بانکی و تراکنش نرم‌افزار باید متعلق به یک مدرسه باشند.');
  const bankAmount=Number(hit.obj.amount);
  const txAmount=Number(tx.obj.amount);
  if(!Number.isFinite(bankAmount)||!Number.isFinite(txAmount)||bankAmount<=0||txAmount<=0) throw new Error('مبلغ تراکنش معتبر نیست.');
  if(bankAmount!==txAmount) throw new Error('مبلغ تراکنش بانکی با مبلغ تراکنش نرم‌افزار برابر نیست.');
  if(String(hit.obj.matched)==='true' && String(hit.obj.matched_transaction_id)!==transactionId) throw new Error('این ردیف بانکی قبلاً به تراکنش دیگری متصل شده است.');
  if(String(tx.obj.reconciled)==='true' && String(tx.obj.approved)==='true' && String(hit.obj.matched_transaction_id)!==transactionId) throw new Error('این تراکنش قبلاً تطبیق و تأیید شده است.');
  updateRow_('Bank',hit.row,[
    hit.obj.id,hit.obj.date,hit.obj.school_id,hit.obj.amount,hit.obj.description,
    hit.obj.tracking_code,hit.obj.bank_account,hit.obj.created_at,transactionId,
    true,hit.obj.approved
  ]);
  updateRow_('Transactions',tx.row,[
    tx.obj.id,tx.obj.date,tx.obj.school_id,tx.obj.kind,tx.obj.amount,tx.obj.description,
    tx.obj.tracking_code,tx.obj.image_url,tx.obj.created_by,tx.obj.created_at,
    true,true,tx.obj.source_id,tx.obj.payment_source||''
  ]);
  return {success:true,matched:true};
}
'''
gs_text = gs_text[:start] + new_bank_match + gs_text[end:]

gs_text = replace_once(
    gs_text,
    "updateRow_('Transactions',hit.row,[r.id,r.date,r.school_id,r.kind,r.amount,r.description,r.tracking_code,r.image_url,r.created_by,r.created_at,r.reconciled,approved,r.source_id]);",
    "updateRow_('Transactions',hit.row,[r.id,r.date,r.school_id,r.kind,r.amount,r.description,r.tracking_code,r.image_url,r.created_by,r.created_at,r.reconciled,approved,r.source_id,r.payment_source||'']);",
    "preserve payment_source on transaction review",
)

for p, new_text in ((MAIN, main_text), (API, api_text), (GS, gs_text)):
    backup = p.with_suffix(p.suffix + ".before-schoolfinance-fixes.bak")
    if not backup.exists():
        backup.write_text(p.read_text(encoding="utf-8"), encoding="utf-8")
    p.write_text(new_text, encoding="utf-8")

print("Applied targeted fixes to MainActivity.java, ApiClient.java and Google Apps Script.")
print("Backups were created with .before-schoolfinance-fixes.bak suffixes.")
print("Next: run node --check SchoolFinanceApp_GoogleAppsScript_FINAL.gs and build/test Android.")
