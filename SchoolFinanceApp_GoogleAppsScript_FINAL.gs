/**
 * SchoolFinanceApp - Google Apps Script Backend
 * Architecture:
 * Android -> Apps Script Web App -> Google Sheets + Google Drive
 *
 * IMPORTANT:
 * 1) Put this entire file into Extensions > Apps Script.
 * 2) Run setup() once manually and authorize.
 * 3) Deploy as Web app:
 *    Execute as: Me
 *    Who has access: Anyone
 * 4) Copy the /exec URL into Android ApiClient.java.
 */

const CFG = {
  SPREADSHEET_ID: '1bFTL1edC-btgjp2KvvkwIM5WaJnycVFylTmFQQFRixk',
  DRIVE_FOLDER_NAME: 'SchoolFinanceApp_Attachments',
  SESSION_HOURS: 6,
  SHEETS: [
    'Managers','Schools','Students','Tuition','Expenses','Transactions',
    'Bank','BankDetails','ExpenseCategories','Messages','Attachments','ParsianAccounts','Settings','ActivityLogs','Cheques','Requests','Staff','AppData'
  ]
};

const HEADERS = {
  Requests: ['id','user_id','action','payload_hash','status','result','created_at'],
  AppData: ['key','value_json','updated_at','updated_by'],
  Managers: ['id','name','username','password','school_id','role','active','created_at','petty_cash_card','petty_cash_bank','petty_cash_shaba','petty_cash_limit','petty_cash_balance','gender'],
  Schools: ['id','name','code','active','created_at','petty_cash_card','type','moeen_code'],
  Staff: ['id','school_id','school_name','name','national_id','phone','role_title','contract_type','hourly_rate','base_salary','insurance_employer_share','insurance_employee_share','bank_card_or_sheba','kol_code','moeen_code','tafsili_code','active','created_at'],
  Students: ['id','name','grade','phone','national_id','school_id','kol_code','moeen_code','tafsili_code','active','created_at','father_phone','mother_phone'],
  Tuition: ['id','date','student_id','school_id','type','amount','description','tracking_code','image_url','created_by','created_at','reconciled','approved','payment_source'],
  Expenses: ['id','date','school_id','category','amount','description','tracking_code','image_url','created_by','created_at','reconciled','approved','payment_source'],
  Transactions: ['id','date','school_id','kind','amount','description','tracking_code','image_url','created_by','created_at','reconciled','approved','source_id','payment_source'],
  Bank: ['id','date','school_id','amount','description','tracking_code','bank_account','created_at','matched_transaction_id','matched','approved'],
  BankDetails: ['bank_id','source_card_number','destination_card_number','terminal_number','direction','balance','reference_number','pos_reference_code','fee_amount','account_suffix','transaction_time','settlement_date'],
  BankAnnotations: ['id','school_id','date','amount','tracking_code','bank_account','student_id','student_name','purpose','manager_id','updated_at','direction','balance','card_number'],
  ExpenseCategories: ['id','name','active','created_at'],
  Messages: ['id','message','created_by','created_at','active','target_school_id','target_role'],
  Attachments: ['id','source_type','source_id','file_name','mime_type','drive_file_id','url','created_by','created_at'],
  ParsianAccounts: ['id','account_name','account_code','school_id','category','active'],
  Settings: ['key','value','updated_at'],
  ActivityLogs: ['id','date','user_id','username','user_name','role','school_id','action','entity_type','entity_id','description','details'],
  Cheques: ['id','date','student_id','school_id','amount','sayad_id','due_date','description','created_by','created_at','payment_method','received_confirmed','in_favor_confirmed','status','approved_at','approved_by','bank_reconciled','bank_status','bank_date','image_url']
};

const DEFAULT_CATEGORIES = [
  'قبض آب','قبض برق','قبض گاز','قبض تلفن','اینترنت',
  'هزینه ی پذیرایی مدرسه','هزینه ی عمرانی مدرسه','هزینه ی تخفیف','هزینه های متفرقه'
];

const SCHOOLS = [
  [1,'دبستان نور ۱','NOOR1',true],
  [2,'دبستان نور ۲','NOOR2',true],
  [3,'دبستان تبیان ۱','TABYAN1',true],
  [4,'دبستان تبیان ۲','TABYAN2',true],
  [5,'مهد مرکزی صبح','MEHR1',true],
  [6,'مهد مرکزی عصر','MEHR2',true],
  [7,'مهد ابراهیم خلیل','MEHR3',true],
  [8,'مهد سروستان','MEHR4',true],
  [9,'مهد منظریه','MEHR5',true],
  [10,'مهد برهان','BORHAN',true]
];

// Existing Managers rows are preserved. Never embed password hashes in source.
const ATTACHED_MANAGERS = [];

const SCHOOL_TUITION = {
  1:'0-1-40', 2:'0-2-40', 3:'0-3-40', 4:'0-4-40',
  7:'0-5-40', 8:'0-7-40', 6:'0-8-40', 9:'0-9-40', 5:'0-10-40'
};

const EXPENSE_CODES = {
  1:{'هزینه های متفرقه':'0-2-68','هزینه ی تخفیف':'0-3-68','هزینه ی پذیرایی مدرسه':'0-4-68','قبض تلفن':'0-6-68','اینترنت':'0-7-68'},
  2:{'هزینه های متفرقه':'0-2-69','هزینه ی تخفیف':'0-3-69','هزینه ی پذیرایی مدرسه':'0-4-69','قبض تلفن':'0-6-69','اینترنت':'0-7-69'},
  3:{'هزینه های متفرقه':'0-2-70','هزینه ی تخفیف':'0-3-70','هزینه ی پذیرایی مدرسه':'0-4-70','قبض تلفن':'0-6-70','اینترنت':'0-7-70'},
  4:{'هزینه های متفرقه':'0-2-71','هزینه ی تخفیف':'0-3-71','هزینه ی پذیرایی مدرسه':'0-4-71','قبض تلفن':'0-6-71','اینترنت':'0-7-71'},
  5:{'هزینه ی تخفیف':'0-1-73','هزینه های متفرقه':'0-2-73','قبض تلفن':'0-3-73'},
  6:{'هزینه ی تخفیف':'0-1-75'},
  7:{'هزینه ی تخفیف':'0-1-76','قبض تلفن':'0-3-76'},
  8:{'هزینه ی تخفیف':'0-1-78','قبض تلفن':'0-3-78','هزینه های متفرقه':'0-4-78'},
  9:{'هزینه ی تخفیف':'0-1-74','قبض تلفن':'0-2-74'}
};

const GENERIC_EXPENSE = {
  'قبض آب':'0-4-50','قبض برق':'0-4-50','قبض گاز':'0-4-50',
  'هزینه ی پذیرایی مدرسه':'0-305-50','هزینه ی عمرانی مدرسه':'0-309-50',
  'هزینه های متفرقه':'0-8-50','اینترنت':'0-311-50','قبض تلفن':'0-5-50'
};

function setup() {
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);

  // Non-destructive/idempotent setup: NEVER clear existing financial data.
  CFG.SHEETS.forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const h = HEADERS[name];
    if (sh.getLastRow() === 0) sh.getRange(1,1,1,h.length).setValues([h]);
    else {
      const current=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(String);
      h.forEach((nameHeader,idx)=>{ if(current.indexOf(nameHeader)<0) sh.getRange(1,sh.getLastColumn()+1).setValue(nameHeader); });
    }
    sh.setFrozenRows(1);
  });

  // Add missing canonical schools without touching existing rows.
  const schools = sheet_('Schools');
  const existingSchools = {};
  rows_('Schools').forEach(x => { existingSchools[String(x.obj.id)] = x.obj; });
  SCHOOLS.forEach(x => {
    if (!existingSchools[String(x[0])]) {
      schools.appendRow([x[0],x[1],x[2],x[3],now_()]);
    } else {
      const hit=findRow_('Schools',x[0]);
      if (hit && String(x[0])==='10') {
        updateRow_('Schools',hit.row,[x[0],x[1],x[2],x[3],hit.obj.created_at||now_()]);
      }
    }
  });

  const cats = sheet_('ExpenseCategories');
  const existingCats = {};
  rows_('ExpenseCategories').forEach(x => { existingCats[String(x.obj.name)] = true; });
  DEFAULT_CATEGORIES.forEach(name => {
    if (!existingCats[String(name)]) cats.appendRow([nextId_('ExpenseCategories'),name,true,now_()]);
  });

  // Default senior manager only if it does not already exist.
  const managers = sheet_('Managers');
  const managerRows = rows_('Managers');
  const usernames = {};
  managerRows.forEach(x => { usernames[String(x.obj.username||'').trim()] = x; });
  if (!usernames['admin']) {
    const initial=PropertiesService.getScriptProperties().getProperty('INITIAL_ADMIN_PASSWORD');
    if(!initial || initial.length<12) throw new Error('برای نصب تازه INITIAL_ADMIN_PASSWORD را در Script Properties با حداقل ۱۲ نویسه تنظیم کنید.');
    managers.appendRow([nextId_('Managers'),'مدیر ارشد','admin',sha256_(initial),'','senior',true,now_()]);
    PropertiesService.getScriptProperties().deleteProperty('INITIAL_ADMIN_PASSWORD');
  }

  // Import missing attached managers and synchronize the requested manager/school link.
  ATTACHED_MANAGERS.forEach(m => {
    const username=String(m.username||'').trim();
    if(!username) return;
    const existing=findManagerByUsername_(username);
    if(!existing) {
      managers.appendRow([nextId_('Managers'),String(m.name||''),username,String(m.password_hash||''),m.school_id==null?'':String(m.school_id),'manager',true,now_()]);
    } else if(username==='آرزو طالب پور') {
      const schoolId='10';
      updateRow_('Managers',existing.row,[existing.obj.id,existing.obj.name,existing.obj.username,existing.obj.password,schoolId,existing.obj.role||'manager',existing.obj.active,existing.obj.created_at]);
    }
  });

  const settings = sheet_('Settings');
  const settingKeys={};
  rows_('Settings').forEach(x=>settingKeys[String(x.obj.key||'').trim()]=true);
  [['schoolfinance_version','2.15.0'],['android_version','2.15.0'],['android_apk_url',''],['bank_account_code','0-1-11'],['currency','IRR']].forEach(x=>{
    if(!settingKeys[x[0]]) { settings.appendRow([x[0],x[1],now_()]); }
    else if(x[0]==='schoolfinance_version' || x[0]==='android_version') {
      const rr=rows_('Settings').find(y=>String(y.obj.key||'')===x[0]);
      if(rr) settings.getRange(rr.row,2).setValue(x[1]);
    }
  });

  SpreadsheetApp.flush();
  return {success:true,message:'Setup completed safely',school_added:'مهد برهان',manager_synced:'آرزو طالب پور'};
}


/**
 * Generic durable storage for app fields that do not belong to a dedicated
 * accounting table yet (payroll detail, work logs, bank account setup, SMS
 * preferences/logs, UI preferences, and future fields). One JSON record per
 * collection key; never deletes or overwrites other collections.
 */
function appDataGet_(b) {
  auth_(b);
  ensureStructure_();
  const wanted=String(b.key||'').trim();
  const all=rows_('AppData').map(x=>x.obj);
  if(wanted) {
    const item=all.find(x=>String(x.key)===wanted);
    return {success:true,key:wanted,value:item?parseJsonSafe_(item.value_json, null):null,updated_at:item?item.updated_at||'': ''};
  }
  const data={};
  all.forEach(x=>{data[String(x.key)]=parseJsonSafe_(x.value_json,null);});
  return {success:true,data};
}
function appDataSave_(b) {
  const user=auth_(b);
  const key=String(b.key||'').trim();
  if(!key || key.length>120) throw new Error('کلید اطلاعات نامعتبر است.');
  ensureStructure_();
  const sh=sheet_('AppData');
  const found=rows_('AppData').find(x=>String(x.obj.key)===key);
  const value=JSON.stringify(b.value===undefined?null:b.value);
  const row=[key,value,now_(),String(user.username||user.name||user.id||'')];
  if(found) updateRow_('AppData',found.row,row); else sh.appendRow(row);
  SpreadsheetApp.flush();
  return {success:true,key,updated_at:row[2]};
}
function appDataDelete_(b) {
  const user=auth_(b);
  if(user.role!=='senior'&&user.role!=='admin') throw new Error('فقط مدیر ارشد اجازه حذف این داده را دارد.');
  const key=String(b.key||'').trim();
  const found=rows_('AppData').find(x=>String(x.obj.key)===key);
  if(found) sheet_('AppData').deleteRow(found.row);
  return {success:true,key};
}
function parseJsonSafe_(value,fallback) {
  try { return JSON.parse(String(value||'')); } catch (_) { return fallback; }
}

function findManagerByUsername_(username) {
  const rows=rows_('Managers');
  for(let i=0;i<rows.length;i++) if(String(rows[i].obj.username||'').trim()===String(username).trim()) return rows[i];
  return null;
}

function doGet(e) {
  try {
    const params=(e&&e.parameter)||{};
    const action=String(params.action||'').replace(/^\/+|\/+$/g,'').toLowerCase();
    // Preserve query parameters (especially token/authToken) so GET fallback uses
    // the same authenticated request context as POST. Handlers still enforce auth_.
    const b=Object.assign({},params);
    if(action==='sync' || action==='all') {
      return json_({
        success: true,
        students: (students_(b)||{}).data || [],
        schools: (schools_(b)||{}).data || [],
        staff: (staff_(b)||{}).data || [],
        tuition: (tuition_(b)||{}).data || [],
        expenses: (expenses_(b)||{}).data || [],
        cheques: (cheques_(b)||{}).data || [],
        categories: (categories_(b)||{}).data || [],
        // Manager records are restricted to senior/admin; ordinary managers still sync other data.
        managers: (function(){ const u=auth_(b); return (u.role==='senior'||u.role==='admin') ? ((managers_(b)||{}).data||[]) : []; })(),
      });
    }
    if(action==='parsian_export') return json_(parsianExport_(b));
    if(action==='categories' || action==='expense_categories' || action==='expense-categories') return json_(categories_(b));
    if(action==='transactions') return json_(transactions_(b));
    if(action==='students'){ return json_(students_(b)); }
    if(action==='schools') return json_(schools_(b));
    if(action==='staff') return json_(staff_(b));
    if(action==='managers') return json_(managers_(b));
    if(action==='expenses') return json_(expenses_(b));
    if(action==='bank') return json_(bank_(b));
    if(action==='tuition') return json_(tuition_(b));
    if(action==='messages') return json_(messages_(b));
    if(action==='cheques') return json_(cheques_(b));
    if(action==='cheque_list') return json_(chequeList_(b));
    if(action==='cheque_alerts') return json_(chequeAlerts_(b));
    if(action==='bank_review') return json_(bankReview_(b));
    if(action==='parsian_school_map') return json_(parsianSchoolMap_(b));
    if(action==='parsian_student_accounts') return json_(parsianStudentAccounts_(b));
    if(action==='summary') return json_(summary_(b));
    if(action==='my_claim') return json_(myClaim_(b));
    if(action==='app_version') return json_(appVersion_(b));
    if(action==='activity_logs')return json_(activityLogs_(b));
    if(action==='app_data_get') return json_(appDataGet_(b));
    return json_({success:true,service:'SchoolFinanceApp Google Backend',version:'2.15.0',time:now_()});
  } catch(err) { return json_({success:false,error:String(err.message||err)}); }
}

function ensureStructure_() {
  const cache=CacheService.getScriptCache();
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  if(cache.get('structure_ready_v217')==='1' && ss.getSheetByName('Requests')) return;
  CFG.SHEETS.forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const h = HEADERS[name];
    if (sh.getLastRow() === 0) sh.getRange(1,1,1,h.length).setValues([h]);
    else {
      const current=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(String);
      h.forEach((nameHeader,idx)=>{ if(current.indexOf(nameHeader)<0) sh.getRange(1,sh.getLastColumn()+1).setValue(nameHeader); });
    }
    sh.setFrozenRows(1);
  });
  cache.put('structure_ready_v216','1',300);
}

let writeLockHeld_=false;
function writeLock_(){
  if(writeLockHeld_)return {waitLock:function(){},releaseLock:function(){}};
  return LockService.getScriptLock();
}
function doPost(e) {
  const lock=LockService.getScriptLock();
  let locked=false,requestRow=0;
  try {
    const body = parseBody_(e);
    let action = String(body.action || body.endpoint || '').replace(/^\/+/, '').toLowerCase();
    const actionAliases = {'students/import':'students_import','api/students/import':'students_import','student_import':'students_import','api/student/import':'students_import','expense_categories':'categories','expense-categories':'categories','api/expense-categories':'categories','api/expense_categories':'categories','api/finance-transaction':'finance_transaction'};
    action = actionAliases[action] || action;

    if (action === 'sync' || action === 'all') {
      const sessionUser = auth_(body);
      const managerData = (sessionUser.role === 'senior' || sessionUser.role === 'admin') ? ((managers_(body)||{}).data || []) : [];
      return json_({
        success: true,
        students: (students_(body)||{}).data || [],
        schools: (schools_(body)||{}).data || [],
        staff: (staff_(body)||{}).data || [],
        tuition: (tuition_(body)||{}).data || [],
        expenses: (expenses_(body)||{}).data || [],
        cheques: (cheques_(body)||{}).data || [],
        categories: (categories_(body)||{}).data || [],
        managers: managerData,
        bank: (bank_(body)||{}).data || [],
        bankTransactions: (bank_(body)||{}).data || [],
        transactions: (transactions_(body)||{}).data || [],
      });
    }

    // POST carries tokens in its body, but read-only actions do not need a write lock.
    const reads={schools:schools_,staff:staff_,students:students_,tuition:tuition_,expenses:expenses_,transactions:transactions_,bank:bank_,bank_review:bankReview_,bank_rules_get:bankRulesGet_,categories:categories_,messages:messages_,managers:managers_,cheques:cheques_,cheque_list:chequeList_,cheque_alerts:chequeAlerts_,summary:summary_,my_claim:myClaim_,app_version:appVersion_,activity_logs:activityLogs_,parsian_export:parsianExport_,parsian_school_map:parsianSchoolMap_,parsian_student_accounts:parsianStudentAccounts_,attachment_read:attachmentRead_,app_data_get:appDataGet_};
    if(reads[action])return json_(reads[action](body));
    lock.waitLock(30000);locked=true;writeLockHeld_=true;
    ensureStructure_();
    ensureCoreData_();
    if (!body.request_id) body.request_id = Utilities.getUuid() + '-' + Utilities.getUuid();
    // Durable deduplication survives app restarts and lost network responses.
    const guarded=['tuition_add','tuition_bulk_debt','expense_add','finance_transaction','cheque_review'];
    if(guarded.indexOf(action)>=0){
      const user=auth_(body);
      const fingerprint=Object.keys(body).filter(k=>k!=='token'&&k!=='request_id').sort().map(k=>[k,body[k]]);
      const hash=sha256_(JSON.stringify(fingerprint));
      const old=rows_('Requests').find(x=>String(x.obj.id)===String(body.request_id)&&String(x.obj.user_id)===String(user.id));
      if(old){
        if(old.obj.action!==action||old.obj.payload_hash!==hash)throw new Error('شناسه عملیات با اطلاعات دیگری استفاده شده است.');
        if(old.obj.status==='DONE'){
          try{return json_(JSON.parse(old.obj.result));}
          catch(_){requestRow=old.row;throw new Error('پاسخ ذخیره‌شده عملیات قابل خواندن نیست؛ بررسی مدیر ارشد لازم است.');}
        }
        return json_({success:false,needs_review:true,error:'نتیجه ثبت قبلی نیاز به بررسی مدیر ارشد دارد. شناسه عملیات: '+body.request_id});
      }
      sheet_('Requests').appendRow([body.request_id,user.id,action,hash,'PENDING','',now_()]);
      requestRow=sheet_('Requests').getLastRow();
      SpreadsheetApp.flush();
    }
    let result;
    switch(action) {
      case 'app_data_save': result=appDataSave_(body); break;
      case 'app_data_delete': result=appDataDelete_(body); break;
      case 'login': result=login_(body); break;
      case 'logout': result=logout_(body); break;
      case 'schools': result=schools_(body); break;
      case 'school_add': result=schoolAdd_(body); break;
      case 'school_update': result=schoolUpdate_(body); break;
      case 'school_delete': result=schoolDelete_(body); break;
      case 'staff': result=staff_(body); break;
      case 'staff_add': result=staffAdd_(body); break;
      case 'staff_update': result=staffUpdate_(body); break;
      case 'staff_delete': result=staffDelete_(body); break;
      case 'students': result=students_(body); break;
      case 'student_add': result=studentAdd_(body); break;
      case 'students_import': result=studentsImport_(body); break;
      case 'student_update': result=studentUpdate_(body); break;
      case 'student_delete': result=studentDelete_(body); break;
      case 'tuition': result=tuition_(body); break;
      case 'tuition_add': result=tuitionAdd_(body); break;
      case 'tuition_bulk_debt': result=tuitionBulkDebt_(body); break;
      case 'tuition_update': result=tuitionUpdate_(body); break;
      case 'tuition_delete': result=tuitionDelete_(body); break;
      case 'expenses': result=expenses_(body); break;
      case 'expense_add': result=expenseAdd_(body); break;
      case 'expense_update': result=expenseUpdate_(body); break;
      case 'expense_delete': result=expenseDelete_(body); break;
      case 'transactions': result=transactions_(body); break;
      case 'finance_transaction': result=financeTransactionAdd_(body); break;
      case 'transaction_delete': result=transactionDelete_(body); break;
      case 'transaction_update': result=transactionUpdate_(body); break;
      case 'bank': result=bank_(body); break;
      case 'bank_review': result=bankReview_(body); break;
      case 'bank_match': result=bankMatch_(body); break;
      case 'bank_reconcile': result=bankReconcile_(body); break;
      case 'bank_upload': result=bankUpload_(body); break;
      case 'bank_rules_save': result=bankRulesSave_(body); break;
      case 'bank_annotation': result=bankAnnotationSave_(body); break;
      case 'transaction_review': result=transactionReview_(body); break;
      case 'categories': result=categories_(body); break;
      case 'category_add': result=categoryAdd_(body); break;
      case 'category_update': result=categoryUpdate_(body); break;
      case 'category_delete': result=categoryDelete_(body); break;
      case 'messages': result=messages_(body); break;
      case 'cheques': result=cheques_(body); break;
      case 'cheque_list': result=chequeList_(body); break;
      case 'cheque_review': result=chequeReview_(body); break;
      case 'message_add': result=messageAdd_(body); break;
      case 'message_delete': result=messageDelete_(body); break;
      case 'managers': result=managers_(body); break;
      case 'manager_add': result=managerAdd_(body); break;
      case 'manager_update': result=managerUpdate_(body); break;
      case 'manager_delete': result=managerDelete_(body); break;
      case 'manager_import_attached': result=managerImportAttached_(body); break;
      case 'attachment': result=attachment_(body); break;
      case 'parsian_export': result=parsianExport_(body); break;
      case 'parsian_school_map': result=parsianSchoolMap_(body); break;
      case 'parsian_student_accounts': result=parsianStudentAccounts_(body); break;
      case 'parsian_allocate': result=parsianAllocate_(body); break;
      case 'activity_logs': result=activityLogs_(body); break;
      case 'summary': result=summary_(body); break;
      case 'my_claim': result=myClaim_(body); break;
      case 'app_version': result=appVersion_(body); break;
      case 'update_settings': result=updateSettings_(body); break;
      case 'health': result={success:true}; break;
      default: result={success:false,error:'Unknown action',action:action,backend_version:'2026-10-05-v2.12-expense-statement-update'};
    }
    // Audit successful write/actions without storing passwords, base64 files, or raw request bodies.
    if(result && result.success && action!=='activity_logs' && action!=='summary' && action!=='students' && action!=='tuition' && action!=='expenses' && action!=='transactions' && action!=='bank_review' && action!=='schools' && action!=='managers' && action!=='categories' && action!=='messages' && action!=='parsian_school_map' && action!=='parsian_student_accounts') {
      try { auditAfterAction_(action, body, result); } catch(_) {}
    }
    if(requestRow){sheet_('Requests').getRange(requestRow,5,1,2).setValues([['DONE',JSON.stringify(result)]]);SpreadsheetApp.flush();}
    return json_(result);
  } catch(err) {
    if(requestRow)try{sheet_('Requests').getRange(requestRow,5).setValue('REVIEW');SpreadsheetApp.flush();}catch(_){}
    return json_({success:false,needs_review:!!requestRow,error:'Server error',message:String(err.message || err)+(requestRow?' | ثبت مجدد انجام نشود؛ ردیف Requests باید بررسی شود.':'')});
  } finally {
    writeLockHeld_=false;if(locked)lock.releaseLock();
  }
}

/* ---------- AUTH ---------- */

function login_(b) {
  const username = String(b.username || '').trim();
  const password = String(b.password || '');
  if (!username || !password) return {success:false,error:'نام کاربری و رمز عبور الزامی است.'};
  const loginCache=CacheService.getScriptCache(),attemptKey='login_fail_'+sha256_(username);
  const attempts=Number(loginCache.get(attemptKey)||0);
  if(attempts>=8)return {success:false,error:'تلاش‌های ورود بیش از حد مجاز است؛ ۱۵ دقیقه بعد دوباره تلاش کنید.'};

  const rows = rows_('Managers');
  for (let i=0;i<rows.length;i++) {
    const r=rows[i].obj;
    if (String(r.username)===username && String(r.active)!=='false') {
      const storedPassword=String(r.password||'');
      const passwordMatches = storedPassword === sha256_(password) || storedPassword === password;
      if (!passwordMatches) {
        loginCache.put(attemptKey,String(attempts+1),900);
        return {success:false,error:'نام کاربری یا رمز عبور اشتباه است.'};
      }
      loginCache.remove(attemptKey);
      const token = Utilities.getUuid()+'-'+Utilities.getUuid();
      CacheService.getScriptCache().put('sess_'+token, JSON.stringify({
        id:r.id,name:r.name,username:r.username,school_id:r.school_id,role:(String(r.role)==='senior'?'admin':r.role),
        expires_at:Date.now()+CFG.SESSION_HOURS*3600000,password_fingerprint:sha256_(String(r.password))
      }), CFG.SESSION_HOURS*3600);
      const user={id:r.id,name:r.name,username:r.username,school_id:r.school_id,role:(String(r.role)==='senior'?'admin':r.role)};
      try { sheet_('ActivityLogs').appendRow([nextId_('ActivityLogs'),now_(),user.id,user.username,user.name,user.role,user.school_id,'login','system','','ورود به سامانه','']); } catch(_) {}
      return {success:true,token:token,user:user};
    }
  }
  loginCache.put(attemptKey,String(attempts+1),900);
  return {success:false,error:'نام کاربری یا رمز عبور اشتباه است.'};
}

function logout_(b) {
  let u=null; try {u=auth_(b);} catch(_) {}
  if (b.token) CacheService.getScriptCache().remove('sess_'+String(b.token));
  if(u) try { sheet_('ActivityLogs').appendRow([nextId_('ActivityLogs'),now_(),u.id,u.username||'',u.name||'',u.role||'',u.school_id||'','logout','system','','خروج از سامانه','']); } catch(_) {}
  return {success:true};
}

function auth_(b, roles) {
  const token = String(b.token || b.authToken || '');
  // Fail closed: syncing or writing data requires a real login session.
  if (!token || token === 'sync_direct' || token === 'guest') {
    throw new Error('برای ادامه ابتدا با نام کاربری و رمز عبور وارد سامانه شوید.');
  }
  const raw = CacheService.getScriptCache().get('sess_' + token);
  if (!raw) {
    throw new Error('نشست ورود معتبر نیست یا منقضی شده است؛ دوباره وارد سامانه شوید.');
  }
  try {
    const u = JSON.parse(raw);
    if (u.expires_at && Number(u.expires_at) <= Date.now()) throw new Error('نشست ورود منقضی شده است.');
    const current = findRow_('Managers', u.id);
    if (!current || String(current.obj.active).toLowerCase() === 'false') {
      throw new Error('حساب کاربری غیرفعال است؛ دوباره وارد سامانه شوید.');
    }
    if (u.password_fingerprint && u.password_fingerprint !== sha256_(String(current.obj.password || ''))) throw new Error('اطلاعات ورود تغییر کرده است؛ دوباره وارد شوید.');
    u.role = String(current.obj.role);
    u.school_id = current.obj.school_id;
    u.name = current.obj.name;
    u.username = current.obj.username;
    if (u.role === 'admin') u.role = 'senior';
    if (roles && roles.length && roles.indexOf(u.role) < 0) {
      throw new Error('شما مجوز انجام این عملیات را ندارید.');
    }
    return u;
  } catch (_) {
    throw new Error('نشست ورود قابل بررسی نیست؛ دوباره وارد سامانه شوید.');
  }
}

/* ---------- CORE SEED SAFETY ---------- */
function ensureCoreData_() {
  const cache=CacheService.getScriptCache();
  if(cache.get('core_ready_v24')==='1') return;
  // Keep the backend self-healing: every API call makes sure the canonical
  // schools, managers and expense categories exist, without deleting data.
  const schools = sheet_('Schools');
  const existingSchools = {};
  rows_('Schools').forEach(x => existingSchools[String(x.obj.id)] = x.obj);
  SCHOOLS.forEach(x => {
    if (!existingSchools[String(x[0])]) schools.appendRow([x[0],x[1],x[2],x[3],now_()]);
  });
  const cats = sheet_('ExpenseCategories');
  const existingCats = {};
  rows_('ExpenseCategories').forEach(x => existingCats[String(x.obj.name||'').trim()] = true);
  DEFAULT_CATEGORIES.forEach(name => {
    if(!existingCats[String(name).trim()]) cats.appendRow([nextId_('ExpenseCategories'),name,true,now_()]);
  });

  const managers = sheet_('Managers');
  const existingManagers = {};
  rows_('Managers').forEach(x => existingManagers[String(x.obj.username||'').trim()] = x.obj);
  // Accounts are only created explicitly in setup() or by a senior user.
  ATTACHED_MANAGERS.forEach(m => {
    const u=String(m.username||'').trim(); if(!u) return;
    const hit=findManagerByUsername_(u);
    if(!hit) managers.appendRow([nextId_('Managers'),String(m.name||''),u,String(m.password_hash||''),m.school_id==null?'':String(m.school_id),'manager',true,now_()]);
    else if(u==='آرزو طالب پور' && String(hit.obj.school_id||'')!=='10') updateRow_('Managers',hit.row,[hit.obj.id,hit.obj.name,hit.obj.username,hit.obj.password,'10',hit.obj.role||'manager',hit.obj.active,hit.obj.created_at]);
  });
  // Data migrations are explicit maintenance tasks, never side effects of login/read.
  cache.put('core_ready_v24','1',300);
}

/* ---------- SCHOOLS ---------- */

function schools_(b) {
  ensureStructure_();
  const u=auth_(b);
  const posMap={};
  rows_('Settings').forEach(x=>{const key=String(x.obj.key||'');if(key.indexOf('pos_terminal_')===0)posMap[key.slice('pos_terminal_'.length)]=String(x.obj.value||'');});
  const data=rows_('Schools').map(x=>Object.assign({},x.obj,{pos_terminal_number:posMap[String(x.obj.id)]||''})).filter(x=>String(x.active)!=='false');
  if(u.role!=='senior' && u.role!=='admin') return {success:true,data:data.filter(x=>String(x.id)===String(u.school_id))};
  return {success:true,data:data};
}

function schoolAdd_(b){
  auth_(b,['senior','admin']); ensureStructure_();
  const id=nextId_('Schools');
  const row=[id,String(b.name||''),String(b.code||''),b.active!==false,now_(),String(b.petty_cash_card||''),String(b.type||''),String(b.moeen_code||'')];
  sheet_('Schools').appendRow(row); if(b.pos_terminal_number!==undefined) saveSetting_('pos_terminal_'+String(id),String(b.pos_terminal_number||'').trim()); return {success:true,id:id};
}
function schoolUpdate_(b){
  auth_(b,['senior','admin']); ensureStructure_();
  const hit=findRow_('Schools',b.id); if(!hit) throw new Error('مدرسه یافت نشد.');
  const r=hit.obj;
  updateRow_('Schools',hit.row,[r.id,b.name!==undefined?b.name:r.name,b.code!==undefined?b.code:r.code,b.active!==undefined?b.active:r.active,r.created_at,b.petty_cash_card!==undefined?b.petty_cash_card:(r.petty_cash_card||''),b.type!==undefined?b.type:(r.type||''),b.moeen_code!==undefined?b.moeen_code:(r.moeen_code||'')]);
  if(b.pos_terminal_number!==undefined) saveSetting_('pos_terminal_'+String(r.id),String(b.pos_terminal_number||'').trim());
  return {success:true};
}
function schoolDelete_(b){ auth_(b,['senior','admin']); const hit=findRow_('Schools',b.id); if(!hit) throw new Error('مدرسه یافت نشد.'); sheet_('Schools').getRange(hit.row,4).setValue(false); return {success:true}; }

function staff_(b){
  ensureStructure_();
  const u=auth_(b);
  const data=rows_('Staff').map(x=>x.obj).filter(x=>String(x.active)!=='false').map(x=>{
    x.id=Number(x.id);x.school_id=Number(x.school_id);
    ['hourly_rate','base_salary','insurance_employer_share','insurance_employee_share'].forEach(k=>x[k]=Number(x[k]||0));
    x.active=x.active!==false && String(x.active)!=='false';
    if(u.role!=='senior' && u.role!=='admin' && String(x.school_id)!==String(u.school_id)) return null;
    x.school_name=x.school_name||schoolName_(x.school_id);
    return x;
  }).filter(Boolean);
  return {success:true,data:data};
}
function staffAdd_(b){
  const u=auth_(b,['senior','admin']);
  const schoolId=String(b.school_id||'');
  if(!schoolId || !String(b.name||'').trim()) throw new Error('مدرسه و نام معلم/پرسنل الزامی است.');
  const id=nextId_('Staff'), schoolName=schoolName_(schoolId);
  sheet_('Staff').appendRow([id,schoolId,schoolName,String(b.name||'').trim(),String(b.national_id||''),String(b.phone||''),String(b.role_title||''),String(b.contract_type||'hourly'),Number(b.hourly_rate||0),Number(b.base_salary||0),Number(b.insurance_employer_share||0),Number(b.insurance_employee_share||0),String(b.bank_card_or_sheba||''),String(b.kol_code||''),String(b.moeen_code||''),String(b.tafsili_code||''),b.active!==false,now_()]);
  return {success:true,id:id};
}
function staffUpdate_(b){
  const u=auth_(b,['senior','admin']);
  const hit=findRow_('Staff',b.id); if(!hit) throw new Error('معلم/پرسنل یافت نشد.');
  const r=hit.obj, schoolId=b.school_id!==undefined?String(b.school_id):String(r.school_id||'');
  const schoolName=schoolName_(schoolId);
  const v=k=>b[k]!==undefined?b[k]:(r[k]!==undefined?r[k]:'');
  updateRow_('Staff',hit.row,[r.id,schoolId,schoolName,v('name'),v('national_id'),v('phone'),v('role_title'),v('contract_type'),Number(v('hourly_rate')||0),Number(v('base_salary')||0),Number(v('insurance_employer_share')||0),Number(v('insurance_employee_share')||0),v('bank_card_or_sheba'),v('kol_code'),v('moeen_code'),v('tafsili_code'),v('active')!==false && String(v('active'))!=='false',r.created_at||now_()]);
  return {success:true};
}
function staffDelete_(b){
  auth_(b,['senior','admin']);
  const hit=findRow_('Staff',b.id); if(!hit) throw new Error('معلم/پرسنل یافت نشد.');
  const h=HEADERS.Staff.indexOf('active')+1; sheet_('Staff').getRange(hit.row,h).setValue(false);
  return {success:true};
}

/* ---------- STUDENTS ---------- */

function students_(b) {
  const u=auth_(b);
  const studentRows=rows_('Students');
  let data=[];
  studentRows.forEach(hit=>{
    const x=hit.obj;
    if(String(x.active)==='false') return;
    // Excel/Sheets can drop leading zeroes from numeric identifiers. Recover the
    // canonical 10-digit national ID and 11-digit mobile where the pattern is known.
    const nid=normalizeNationalId_(x.national_id||'');
    const phone=normalizeImportedPhone_(x.phone||x.father_phone||x.mother_phone||'');
    const fatherPhone=normalizeImportedPhone_(x.father_phone||phone||'');
    const motherPhone=normalizeImportedPhone_(x.mother_phone||'');
    // Return normalized values only. Reads must never mutate spreadsheet data.
    x.phone=phone;x.father_phone=fatherPhone;x.mother_phone=motherPhone;x.national_id=nid;
    if(u.role!=='senior' && String(x.school_id)!==String(u.school_id)) return;
    if(b.school_id && String(x.school_id)!==String(b.school_id)) return;
    if(b.id && String(x.id)!==String(b.id)) return;
    if(b.q) {
      const normalizeStudentSearch_ = value => String(value===undefined||value===null?'':value)
        .normalize('NFKC').toLocaleLowerCase('fa')
        .replace(/[يىئ]/g,'ی').replace(/ك/g,'ک')
        .replace(/[أإآٱ]/g,'ا').replace(/[ۀة]/g,'ه').replace(/ؤ/g,'و')
        .replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
        .replace(/[\u064B-\u065F\u0670\u0640\u200b-\u200f\u202a-\u202e\ufeff]/g,'')
        .replace(/[^\p{L}\p{N}]/gu,'');
      const q=normalizeStudentSearch_(b.q);
      const searchText=normalizeStudentSearch_([x.name,x.national_id,x.grade,x.phone,x.father_phone,x.mother_phone].join(' '));
      if(q && searchText.indexOf(q)<0) return;
    }
    data.push(x);
  });
  const schoolNames={}; rows_('Schools').forEach(x=>schoolNames[String(x.obj.id)]=x.obj.name);
  data=data.map(x=>{ x.school_name=schoolNames[String(x.school_id)]||''; const nid=normalizeNationalId_(x.national_id||''); const phone=normalizeImportedPhone_(x.phone||''); const badNid=!/^\d{10}$/.test(nid); const badGrade=!normalizeGrade_(x.grade||''); const badPhone=String(phone||'').trim()!=='' && !/^0\d{10}$/.test(phone); x.national_id=nid; x.phone=phone; x.needs_fix=badNid||badGrade||badPhone; return x; });
  if(String(b.needs_fix||'').toLowerCase()==='1' || String(b.needs_fix||'').toLowerCase()==='true') data=data.filter(x=>x.needs_fix);
  return {success:true,data:data};
}

function normalizeStudentName_(value){ return String(value===undefined||value===null?'':value).normalize('NFC').trim(); }

function ensureStudentPhoneColumns_(){
  const sh=sheet_('Students');
  let headers=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getDisplayValues()[0].map(h=>String(h||'').trim());
  ['father_phone','mother_phone'].forEach(name=>{
    if(headers.indexOf(name)<0){ const col=sh.getLastColumn()+1; sh.getRange(1,col).setValue(name); headers.push(name); }
  });
}

function studentAdd_(b) {
  const lock=writeLock_();
  lock.waitLock(30000);
  try {
    const u=auth_(b);
    ensureCoreData_();
    ensureStudentPhoneColumns_();
    const schoolId=Number(b.school_id) || (u.school_id ? Number(u.school_id) : 1);
    const fullName=normalizeStudentName_(b.name);
    if(!fullName) throw new Error('نام و نام خانوادگی دانش‌آموز الزامی است.');

    let nid=digits_(b.national_id || '');
    if(nid && nid.length < 10) nid = nid.padStart(10, '0');
    const fatherPhone=normalizeImportedPhone_(b.father_phone!==undefined ? b.father_phone : b.phone || '');
    const motherPhone=normalizeImportedPhone_(b.mother_phone || '');
    const phone=normalizeImportedPhone_(b.phone || fatherPhone || motherPhone || '');
    [fatherPhone,motherPhone].forEach(p=>{ if(p && !/^0\d{10}$/.test(p)) throw new Error('شماره تلفن پدر یا مادر باید ۱۱ رقم و با ۰ شروع شود.'); });

    const existingRows=rows_('Students');
    const existing=nid ? existingRows.find(x=>normalizeNationalId_(x.obj.national_id || '')===nid) : null;
    const requestedId=Number(b.id)||0;
    if(existing) {
      // Idempotent retry: if this exact student ID already exists, return success.
      // A different student ID using the same national ID must be rejected, never overwritten.
      if (requestedId > 0 && String(existing.obj.id) === String(requestedId)) {
        return {success:true,id:existing.obj.id,duplicate:true,message:'این دانش‌آموز قبلاً ثبت شده است.'};
      }
      throw new Error('این کد ملی قبلاً برای دانش‌آموز دیگری ثبت شده است.');
    }

    
    const grade=normalizeGrade_(b.grade || 'اول');
    const codes=studentAccountCodes_(id, grade, schoolId, nid);
    const sh=sheet_('Students');
    try { sh.getRange(2, 2, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat('@'); sh.getRange(2, 4, Math.max(1, sh.getMaxRows() - 1), 2).setNumberFormat('@'); } catch(_) {}
    const createdAt=now_();
    sh.appendRow([id]);
    const appendedRow=sh.getLastRow();
    updateRow_('Students',appendedRow,[id,fullName,grade,phone,nid,String(schoolId),codes.kol,codes.moeen,codes.tafsili,true,createdAt,fatherPhone,motherPhone]);
    try { const nameCol=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].indexOf('name')+1; if(nameCol>0) sh.getRange(appendedRow,nameCol).setNumberFormat('@').setValue(fullName); } catch(_) {}
    SpreadsheetApp.flush();
    return {
      success:true,
      id:id,
      student:{
        id:id,
        name:fullName,
        grade:grade,
        phone:phone,
        father_phone:fatherPhone,
        mother_phone:motherPhone,
        national_id:nid,
        school_id:schoolId,
        kol_code:codes.kol,
        moeen_code:codes.moeen,
        tafsili_code:codes.tafsili,
        active:true
      }
    };
  } finally {
    lock.releaseLock();
  }
}

function studentsImport_(b) {
  const lock=writeLock_();
  lock.waitLock(30000);
  try {
    const u=auth_(b);
    ensureCoreData_();
    const schoolId=(u.role==='senior' || u.role==='admin') ? String(b.school_id||'') : String(u.school_id||'');
    if(!schoolId) throw new Error('مدرسه برای ورود دانش‌آموزان مشخص نشده است.');
    if(!b.base64) throw new Error('فایل Excel ارسال نشده است.');

    const imported=readStudentXlsx_(b.base64);
    if(!imported.length) throw new Error('هیچ دانش‌آموز قابل خواندن از فایل Excel پیدا نشد.');

    let added=0, skipped=0, invalid=0, updatedPhones=0;
    let validNid=0, invalidNid=0, validGrade=0, invalidGrade=0, missingName=0;
    const gradeCounts={};
    const gradeSamples=[];
    const reasons=[];
    const invalidStudents=[];
    const existing=rows_('Students').map(x=>x.obj);
    const studentsSheet=sheet_('Students');
    try { studentsSheet.getRange(2,4,Math.max(1,studentsSheet.getMaxRows()-1),2).setNumberFormat('@'); } catch(ignoreFormat) {}
    const seen={};

    imported.forEach((r,idx)=>{
      const rowNo=Number(r.row_number||idx+1);
      const first=String(r.first_name||'').trim();
      const last=String(r.last_name||'').trim();
      const name=String(r.name||[first,last].filter(Boolean).join(' ')).replace(/\s+/g,' ').trim();
      const nid=normalizeNationalId_(r.national_id||'');
      const grade=normalizeGrade_(r.grade||'');
      const rowErrors=[];
      if(name){} else { missingName++; }
      const rawGrade=String(r.grade||'').trim();
      if(rawGrade && gradeSamples.length<12) gradeSamples.push({row:rowNo,raw:rawGrade,normalized:grade});
      if(grade) { validGrade++; gradeCounts[grade]=(gradeCounts[grade]||0)+1; } else { invalidGrade++; }

      if(!name) { rowErrors.push('نام خالی'); }
      if(!grade) { rowErrors.push('پایه/کلاس نامعتبر یا خالی'); }

      // National ID is checked globally only when it is a complete 10-digit ID.
      // Invalid IDs are STILL imported so the manager can open/edit the student later.
      const invalidKey=(name+'|'+nid+'|'+digits_(r.phone||'')+'|'+grade+'|'+schoolId).toLowerCase();
      if(!/^\d{10}$/.test(nid)) {
        invalidNid++;
        rowErrors.push('کد ملی نامعتبر ('+(nid ? nid.length+' رقمی' : 'خالی')+')');
        if(seen['bad:'+invalidKey] || existing.some(x=>(String(x.name||'').trim()+'|'+digits_(x.national_id||'')+'|'+digits_(x.phone||'')+'|'+normalizeGrade_(x.grade||'')+'|'+String(x.school_id||'')).toLowerCase()===invalidKey)){
          skipped++; reasons.push('ردیف '+rowNo+' — '+name+' — رکورد نامعتبر تکراری'); return;
        }
        seen['bad:'+invalidKey]=true;
      } else if(seen[nid] || existing.some(x=>normalizeNationalId_(x.national_id||'')===nid)) {
        // Repair missing mobile numbers on previously imported students when the same
        // student is imported again with a valid phone number.
        const importedPhone=normalizeImportedPhone_(r.phone||'');
        if(importedPhone && /^0\d{10}$/.test(importedPhone)){
          const match=existing.find(x=>normalizeNationalId_(x.national_id||'')===nid && !digits_(x.phone||''));
          if(match){
            const hit=findRow_('Students',match.id);
            if(hit){
              const m=hit.obj;
              updateRow_('Students',hit.row,[m.id,m.name,m.grade,importedPhone,m.national_id,m.school_id,m.kol_code,m.moeen_code,m.tafsili_code,m.active,m.created_at]);
              match.phone=importedPhone;
              updatedPhones++;
            }
          }
        }
        skipped++; reasons.push('ردیف '+rowNo+' — '+name+' — کد ملی تکراری'+(importedPhone?' (شماره موبایل بررسی/اصلاح شد)':'')); return;
      } else { validNid++; }

      if(!name) {
        invalid++;
        reasons.push('ردیف '+rowNo+' — نام خالی — دانش‌آموز ساخته نشد');
        return;
      }

      // Keep a row even when its national ID or grade needs correction.
      // The result reports the exact problem so the manager can edit it afterwards.
      const storedGrade=grade || String(r.grade||'').trim() || 'نیازمند اصلاح';
      const id=nextId_('Students');
      const codes=studentAccountCodes_(id,storedGrade,schoolId,nid);
      sheet_('Students').appendRow([
        id,name,storedGrade,normalizeImportedPhone_(r.phone||''),nid,schoolId,
        codes.kol,codes.moeen,codes.tafsili,true,now_()
      ]);
      existing.push({name:name,national_id:nid,school_id:schoolId});
      if(/^\d{10}$/.test(nid)) seen[nid]=true;
      added++;

      if(rowErrors.length) {
        invalid++;
        const reasonText=rowErrors.join('، ');
        reasons.push('ردیف '+rowNo+' — '+name+' — '+reasonText+' — دانش‌آموز ساخته شد و باید اصلاح شود');
        invalidStudents.push({
          student_id:id,
          row:rowNo,
          name:name,
          grade:storedGrade,
          national_id:nid,
          reason:reasonText
        });
      }
    });

    return {
      success:true,
      added:added,
      skipped:skipped,
      updated_phones:updatedPhones,
      invalid:invalid,
      total:imported.length,
      message:'ورود Excel انجام شد. موارد نامعتبر نیز ساخته شدند تا بعداً قابل اصلاح باشند.',
      details:reasons.slice(0,20),
      invalid_students:invalidStudents,
      diagnostics:{parsed:imported.length,valid_nid:validNid,invalid_nid:invalidNid,valid_grade:validGrade,invalid_grade:invalidGrade,missing_name:missingName,grade_counts:gradeCounts,grade_samples:gradeSamples,backend_version:'2.10-invalid-student-details'}
    };
  } finally {
    lock.releaseLock();
  }
}

function schoolMoeen_(schoolId){
  const map={'3':'1','4':'2','1':'3','2':'4','9':'9','5':'10','6':'11','7':'12','10':'13','8':'14'};
  return map[String(schoolId||'')]||'';
}
function studentAccountCodes_(studentId,grade,schoolId,nationalId){
  return {kol:'67',moeen:schoolMoeen_(schoolId),tafsili:String(nationalId||'').trim()};
}
function dedupeStudents_(){
  const seen={}; let deactivated=0;
  rows_('Students').forEach(x=>{ const r=x.obj; if(String(r.active)==='false') return; const nid=normalizeNationalId_(r.national_id||''); const key=/^\d{10}$/.test(nid)?'nid:'+nid:'bad:'+(String(r.name||'').trim()+'|'+nid+'|'+digits_(r.phone||'')+'|'+normalizeGrade_(r.grade||'')+'|'+String(r.school_id||'')).toLowerCase(); if(seen[key]){ sheet_('Students').getRange(x.row,10).setValue(false); deactivated++; } else seen[key]=r.id; });
  return deactivated;
}

function migrateStudentParsianCodes_(){
  const sh=sheet_('Students'); const all=rows_('Students');
  all.forEach(x=>{ const r=x.obj; const nid=String(r.national_id||'').trim(); const c=studentAccountCodes_(r.id,r.grade,r.school_id,nid);
    if(String(r.kol_code||'')!==c.kol || String(r.moeen_code||'')!==c.moeen || String(r.tafsili_code||'')!==c.tafsili){
      updateRow_('Students',x.row,[r.id,r.name,r.grade,r.phone,r.national_id,r.school_id,c.kol,c.moeen,c.tafsili,r.active,r.created_at]);
    }
  });
}
function normalizeGrade_(v){
  let x=String(v===undefined||v===null?'':v);
  x=x.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
       .replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))
       .replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[ۀة]/g,'ه')
       .replace(/[ـ]/g,'')
       .replace(/[\u200c\u200d\u200f\u202a-\u202e]/g,'')
       .replace(/[()\[\]{}،,.:؛;\-_\/\\]/g,' ')
       .replace(/\s+/g,' ').trim();
  const compact=x.replace(/\s/g,'');
  // Keep the two preschool levels distinct. Older versions collapsed both into "مهد",
  // which caused the selected grade to be lost in Google Sheets.
  const preschoolOne=['پیشیک','پیش۱','پیش1','پیشدبستانی۱','پیشدبستانی1','پیشدبستانیک'];
  const preschoolTwo=['پیشدو','پیش۲','پیش2','پیشدبستانی۲','پیشدبستانی2','پیشدبستانیدو'];
  if(preschoolOne.indexOf(compact)>=0) return 'پیش یک';
  if(preschoolTwo.indexOf(compact)>=0) return 'پیش دو';
  const map={
    'مهد':'مهد','مهدکودک':'مهد','مهدکودکی':'مهد',
    'پیشدبستانی':'مهد','پیشدبستان':'مهد',
    'اول':'اول','دوم':'دوم','سوم':'سوم','چهارم':'چهارم','پنجم':'پنجم','ششم':'ششم',
    'پایه1':'اول','پایه2':'دوم','پایه3':'سوم','پایه4':'چهارم','پایه5':'پنجم','پایه6':'ششم',
    'کلاس1':'اول','کلاس2':'دوم','کلاس3':'سوم','کلاس4':'چهارم','کلاس5':'پنجم','کلاس6':'ششم',
    '1':'اول','2':'دوم','3':'سوم','4':'چهارم','5':'پنجم','6':'ششم',
    'اولابتدایی':'اول','دومابتدایی':'دوم','سومابتدایی':'سوم','چهارمابتدایی':'چهارم','پنجمابتدایی':'پنجم','ششمابتدایی':'ششم'
  };
  if(map[compact]) return map[compact];
  if(/^(مهد|پیشدبستان)/.test(compact)) return 'مهد';
  const words={'اول':'اول','دوم':'دوم','سوم':'سوم','چهارم':'چهارم','پنجم':'پنجم','ششم':'ششم'};
  for(const k in words) if(compact.indexOf(k)>=0) return words[k];
  const m=compact.match(/(?:پایه|کلاس)?([1-6])(?:ابتدایی)?$/);
  if(m) return map[m[1]]||'';
  return '';
}

function readStudentXlsx_(base64) {
  let clean=String(base64||'').trim();
  if(clean.indexOf(',')>=0) clean=clean.substring(clean.indexOf(',')+1);
  clean=clean.replace(/\s/g,'');
  let bytes;
  try { bytes=Utilities.base64Decode(clean); } catch(e) { throw new Error('محتوای فایل Excel معتبر نیست.'); }
  if(!bytes || bytes.length<4 || bytes[0]!==80 || bytes[1]!==75) throw new Error('فایل انتخاب‌شده XLSX معتبر نیست یا فایل کامل ارسال نشده است.');
  // XLSX یک ZIP واقعی است؛ نوع Blob را صریحاً ZIP می‌کنیم تا Utilities.unzip
  // به MIME انتخاب‌شده توسط Android وابسته نباشد.
  const blob=Utilities.newBlob(bytes,'application/zip','students.xlsx');
  blob.setContentType('application/zip');
  let files;
  try { files=Utilities.unzip(blob); } catch(e) { throw new Error('خواندن فایل Excel انجام نشد. فایل باید XLSX معتبر باشد.'); }
  const by={}; files.forEach(f=>by[f.getName()]=f);
  const shared=[];
  if(by['xl/sharedStrings.xml']) {
    const root=XmlService.parse(by['xl/sharedStrings.xml'].getDataAsString()).getRootElement();
    root.getChildren().forEach(si=>{ let txt=''; si.getDescendants().forEach(n=>{ if(n.getType()===XmlService.ContentTypes.TEXT) txt+=n.asText(); }); shared.push(txt); });
  }
  const sheet=by['xl/worksheets/sheet1.xml']; if(!sheet) throw new Error('برگه اول Excel پیدا نشد.');
  const root=XmlService.parse(sheet.getDataAsString()).getRootElement();
  const sheetData=root.getChildren().filter(x=>x.getName()==='sheetData')[0]; if(!sheetData) return [];
  const rows=[];
  sheetData.getChildren().filter(x=>x.getName()==='row').forEach(row=>{
    const cells={};
    row.getChildren().filter(x=>x.getName()==='c').forEach(c=>{
      const ref=String(c.getAttribute('r').getValue()); const col=ref.replace(/\d/g,'');
      const vEl=c.getChildren().filter(x=>x.getName()==='v')[0]; let v=vEl?vEl.getText():'';
      const typ=c.getAttribute('t');
      if(typ && typ.getValue()==='s' && v!=='') v=shared[Number(v)]||'';
      if(typ && typ.getValue()==='inlineStr'){ const is=c.getChildren().filter(x=>x.getName()==='is')[0]; v=is?is.getDescendants().filter(n=>n.getType()===XmlService.ContentTypes.TEXT).map(n=>n.asText()).join(''):''; }
      cells[col]=v;
    });
    rows.push(cells);
  });
  if(rows.length<2) return [];

  const norm=x=>String(x||'').replace(/[\u200c\u200f\u202a-\u202e]/g,'').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/\s+/g,'').trim();
  let headerIndex=-1;
  for(let i=0;i<Math.min(rows.length,20);i++){
    const vals=Object.keys(rows[i]).map(k=>norm(rows[i][k]));
    if(vals.indexOf('نام')>=0 && vals.indexOf('نامخانوادگی')>=0){ headerIndex=i; break; }
  }
  if(headerIndex<0) throw new Error('ردیف عنوان‌های «نام» و «نام خانوادگی» در فایل Excel پیدا نشد.');

  const header=rows[headerIndex]; const map={};
  Object.keys(header).forEach(k=>{ const h=norm(header[k]); if(h) map[h]=k; });
  const nameCol=map['نام'];
  const lastCol=map['نامخانوادگی'];
  const nidCol=map['کدملی'];
  const phoneCol=map['شمارهدی']||map['شمارهتلفن']||map['موبایل']||map['شمارهتماس']||
     map['شمارهموبایل']||map['تلفنهمراه']||map['موبایلولی']||map['شمارههمراه']||map['تلفن']||map['شمارهتماسهمراه']||map['شمارههمراهولی']||
     Object.keys(map).filter(h=>h.indexOf('موبایل')>=0||h.indexOf('تلفنهمراه')>=0||h.indexOf('شمارههمراه')>=0).map(h=>map[h])[0];
  const gradeCol=map['کلاس']||map['پایه']||map['پایهدبستان']||map['پایهتحصیلی'];
  const birthCol=map['تاریختولد'];
  if(!nameCol || !lastCol) throw new Error('ستون‌های «نام» و «نام خانوادگی» پیدا نشدند.');
  if(!nidCol) throw new Error('ستون «کد ملی» در فایل Excel پیدا نشد.');

  const out=[];
  for(let i=headerIndex+1;i<rows.length;i++){
    const r=rows[i];
    const first=String(r[nameCol]||'').trim();
    const last=String(r[lastCol]||'').trim();
    if(!first && !last) continue;
    const name=[first,last].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
    const rawNid=String(r[nidCol]||'').trim();
    const nationalId=digits_(rawNid);
    // A non-empty national-ID cell containing no digits usually means the source row
    // is malformed or its columns shifted. Do not create a misleading student record.
    if(rawNid && !nationalId) continue;
    if(nationalId.length>10) continue;
    out.push({
      first_name:first,
      last_name:last,
      name:name,
      national_id:nationalId,
      phone:phoneCol?normalizeImportedPhone_(r[phoneCol]):'',
      grade:gradeCol?String(r[gradeCol]||'').trim():'',
      birth_date:birthCol?String(r[birthCol]||'').trim():'',
      row_number:i+1
    });
  }
  return out;
}

function normalizeNationalId_(value){
  let n=digits_(value==null?'':value);
  // Numeric Excel cells may lose leading zeroes; national IDs are exactly 10 digits.
  if(n && n.length<10 && n.length<=10) n=n.padStart(10,'0');
  return n;
}
function normalizeImportedPhone_(value){
  let p=digits_(value||'');
  // Excel/Sheets may store a leading-zero mobile as a 10-digit numeric value.
  if(/^9\d{9}$/.test(p)) p='0'+p;
  return p;
}
function importBankXlsx_(base64,schoolId){
  let clean=String(base64); if(clean.indexOf(',')>=0) clean=clean.substring(clean.indexOf(',')+1);
  const blob=Utilities.newBlob(Utilities.base64Decode(clean),'application/zip','bank.xlsx');
  const files=Utilities.unzip(blob); const by={}; files.forEach(f=>by[f.getName()]=f);
  const shared=[]; if(by['xl/sharedStrings.xml']){const sr=XmlService.parse(by['xl/sharedStrings.xml'].getDataAsString()).getRootElement();sr.getChildren().forEach(si=>{let txt='';si.getDescendants().forEach(n=>{if(n.getType()===XmlService.ContentTypes.TEXT)txt+=n.asText();});shared.push(txt);});}
  const sheet=by['xl/worksheets/sheet1.xml']; if(!sheet) throw new Error('برگه اول Excel پیدا نشد.');
  const root=XmlService.parse(sheet.getDataAsString()).getRootElement(); const sd=root.getChildren().filter(x=>x.getName()==='sheetData')[0]; if(!sd) return {added:0,skipped:0};
  const out=[]; sd.getChildren().filter(x=>x.getName()==='row').forEach(row=>{const c={};row.getChildren().filter(x=>x.getName()==='c').forEach(cell=>{const ref=String(cell.getAttribute('r').getValue()).replace(/\d/g,'');const v=cell.getChildren().filter(x=>x.getName()==='v')[0];let val=v?v.getText():'';const typ=cell.getAttribute('t');if(typ&&typ.getValue()==='s'&&val!=='')val=shared[Number(val)]||'';c[ref]=val;});out.push(c);});
  if(out.length<2)return {added:0,skipped:0};
  const h=out[0]; const map={};Object.keys(h).forEach(k=>map[String(h[k]).trim().toLowerCase()]=k);
  const amountCol=map['مبلغ']||map['amount']||map['مبلغ تراکنش']; const dateCol=map['تاریخ']||map['date']; const descCol=map['شرح']||map['description']; const trackCol=map['شماره پیگیری']||map['tracking_code']||map['پیگیری']; const accountCol=map['شماره کارت']||map['شماره حساب']||map['حساب']||map['bank account']||map['account'];
  if(!amountCol) throw new Error('ستون مبلغ در فایل بانک پیدا نشد.');
  let added=0,skipped=0; const sh=sheet_('Bank');
  for(let i=1;i<out.length;i++){const r=out[i];const amount=Number(String(r[amountCol]||'').replace(/,/g,''));if(!amount){skipped++;continue;}const track=String(r[trackCol]||'');const dup=rows_('Bank').some(x=>Number(x.obj.amount)===amount&&String(x.obj.tracking_code||'')===track&&String(x.obj.school_id||'')===String(schoolId||''));if(dup){skipped++;continue;}sh.appendRow([nextId_('Bank'),String(r[dateCol]||''),String(schoolId||''),amount,String(r[descCol]||''),track,String(r[accountCol]||''),now_(),'','false','false']);added++;}
  return {added:added,skipped:skipped};
}
function importBankCsv_(base64,schoolId){throw new Error('ورود بانک در این نسخه فقط با فایل XLSX و ستون‌های مبلغ، تاریخ و شماره پیگیری پشتیبانی می‌شود؛ فایل CSV را به XLSX تبدیل کنید.');}

function studentUpdate_(b) {
  const lock=writeLock_();
  lock.waitLock(30000);
  try {
    const u=auth_(b);
    const hit=findRow_('Students',b.id);
    if(!hit) throw new Error('دانش‌آموز یافت نشد.');
    const old=hit.obj;
    if(u.role!=='senior' && String(old.school_id)!==String(u.school_id)) throw new Error('دسترسی مجاز نیست.');
    const targetSchool=(u.role==='senior' || u.role==='admin') ? String(b.school_id!==undefined?b.school_id:old.school_id) : String(u.school_id);
    activeSchool_(targetSchool);
    const fullName=normalizeStudentName_(b.name!==undefined?b.name:old.name); if(!fullName)throw new Error('نام دانش‌آموز الزامی است.');
    const targetNid=b.national_id!==undefined?digits_(b.national_id):normalizeNationalId_(old.national_id);
    if(!/^\d{10}$/.test(targetNid)) throw new Error('کد ملی باید دقیقاً ۱۰ رقم انگلیسی باشد.');
    const duplicate=rows_('Students').some(x=>String(x.obj.id)!==String(old.id) && normalizeNationalId_(x.obj.national_id||'')===targetNid);
    if(duplicate) throw new Error('این کد ملی قبلاً در سیستم برای یک دانش‌آموز ثبت شده است و در هیچ مدرسه دیگری نیز قابل ثبت نیست.');
    const fatherPhone=normalizeImportedPhone_(b.father_phone!==undefined?b.father_phone:old.father_phone||old.phone||'');
    const motherPhone=normalizeImportedPhone_(b.mother_phone!==undefined?b.mother_phone:old.mother_phone||'');
    const phone=normalizeImportedPhone_(b.phone!==undefined?b.phone:fatherPhone||motherPhone||old.phone||'');
    [phone,fatherPhone,motherPhone].forEach(p=>{ if(p && !/^0\d{10}$/.test(p)) throw new Error('شماره تلفن پدر یا مادر باید ۱۱ رقم و با ۰ شروع شود.'); });
    const grade=normalizeGrade_(b.grade!==undefined?b.grade:old.grade);
    const codes=studentAccountCodes_(old.id,grade,targetSchool,targetNid);
    try { sheet_('Students').getRange(hit.row,2,1,1).setNumberFormat('@'); sheet_('Students').getRange(hit.row,4,1,2).setNumberFormat('@'); } catch(ignoreTextFormat) {}
    updateRow_('Students',hit.row,[
      old.id,fullName,grade,
      phone,targetNid,targetSchool,codes.kol,codes.moeen,codes.tafsili,
      b.active!==undefined?b.active:old.active,old.created_at,fatherPhone,motherPhone
    ]);
    return {success:true};
  } finally {
    lock.releaseLock();
  }
}

function studentDelete_(b) {
  const u=auth_(b);
  const hit=findRow_('Students',b.id);
  if(!hit) throw new Error('دانش‌آموز یافت نشد.');
  if(u.role!=='senior' && String(hit.obj.school_id)!==String(u.school_id)) throw new Error('دسترسی مجاز نیست.');
  sheet_('Students').getRange(hit.row,10).setValue(false);
  return {success:true};
}

/* ---------- TUITION ---------- */

function tuition_(b) {
  const u=auth_(b);
  let data=rows_('Tuition').map(x=>x.obj);
  if(u.role!=='senior') data=data.filter(x=>String(x.school_id)===String(u.school_id));
  if(b.student_id) data=data.filter(x=>String(x.student_id)===String(b.student_id));
  if(b.school_id) data=data.filter(x=>String(x.school_id)===String(b.school_id));
  return {success:true,data:data};
}

function tuitionAdd_(b) {
  const u=auth_(b);
  const schoolId=u.role==='senior'?b.school_id:u.school_id;
  if(!schoolId || !b.student_id) throw new Error('مدرسه و دانش‌آموز الزامی است.');
  activeSchool_(schoolId);activeStudentForSchool_(b.student_id,schoolId);
  const type=String(b.type||'payment');
  if(type!=='payment'&&type!=='debt')throw new Error('نوع ثبت شهریه معتبر نیست.');
  const recordDate=date_(b.date);
  const amount=amount_(b.amount);
  if(amount<=0) throw new Error('مبلغ نامعتبر است.');
  const paymentMethod=String(b.payment_method||'').trim();
  if(type==='payment' && !paymentMethod) throw new Error('نوع پرداخت را انتخاب کنید.');

  // Cheques are kept in a separate workflow and do NOT reduce student debt until senior approval.
  if(type==='payment' && paymentMethod==='چک') {
    const sayad=digits_(b.sayad_id);
    if(!/^\d{16}$/.test(sayad)) throw new Error('شناسه صیاد چک باید دقیقاً ۱۶ رقمی باشد.');
    const due=String(b.due_date||'').trim();
    date_(due);
    if(rows_('Cheques').some(x=>String(x.obj.sayad_id)===sayad))throw new Error('این شناسه صیادی قبلاً ثبت شده است.');
    if(String(b.in_favor_school)!=='true') throw new Error('برای ثبت چک باید گزینه «ثبت چک در وجه مدرسه القرآن» انتخاب شود.');
    const id=nextId_('Cheques');
    sheet_('Cheques').appendRow([id,date_(b.date),String(b.student_id),String(schoolId),amount,sayad,due,String(b.description||''),u.id,now_(),'چک',false,false,'pending','', '',false,'','']);
    return {success:true,cheque:true,id:id,pending:true,message:'چک برای تأیید کاربر ارشد ثبت شد.'};
  }

  if(type==='payment' && !String(b.tracking_code||'').trim() && paymentMethod!=='پول نقد') throw new Error('شماره پیگیری برای این روش پرداخت الزامی است.');
  const id=nextId_('Tuition');
  const image=saveAttachmentIfAny_(b,'tuition',id,u.id);
  appendFinancialPair_('Tuition',[id,recordDate,String(b.student_id),String(schoolId),type,amount,String(b.description||''),String(b.tracking_code||''),image.url||'',u.id,now_(),false,false,paymentMethod],
    [nextId_('Transactions'),recordDate,String(schoolId),type,amount,String(b.description||''),String(b.tracking_code||''),image.url||'',u.id,now_(),false,false,id,paymentMethod]);
  return {success:true,id:id,image_url:image.url||'',payment_method:paymentMethod};
}

function tuitionBulkDebt_(b) {
  const lock=writeLock_();
  lock.waitLock(30000);
  try {
    const u=auth_(b);
    const schoolId=(u.role==='senior' || u.role==='admin') ? String(b.school_id||'') : String(u.school_id||'');
    if(!schoolId) throw new Error('مدرسه مشخص نشده است.');
    activeSchool_(schoolId);
    const amount=amount_(b.amount);
    if(amount<=0) throw new Error('مبلغ بدهی باید بیشتر از صفر باشد.');
    const date=date_(b.date);
    const description=String(b.description||'').trim();
    if(!description) throw new Error('عنوان/توضیح بدهی را وارد کنید.');
    let ids=b.student_ids;
    if(typeof ids==='string') { try { ids=JSON.parse(ids); } catch(_) { ids=String(ids).split(',').map(x=>x.trim()).filter(Boolean); } }
    if(!Array.isArray(ids) || !ids.length) throw new Error('حداقل یک دانش‌آموز باید انتخاب شود.');
    const wanted={}; ids.forEach(id=>{wanted[String(id)]=true;});
    const students=rows_('Students').map(x=>x.obj).filter(x=>String(x.active)!=='false');
    const selected=students.filter(s=>wanted[String(s.id)] && String(s.school_id)===String(schoolId));
    if(selected.length!==Object.keys(wanted).length) throw new Error('یک یا چند دانش‌آموز فعال در مدرسه انتخابی پیدا نشد.');
    if(!selected.length) throw new Error('دانش‌آموز انتخاب‌شده‌ای در این مدرسه پیدا نشد.');
    let added=0;
    const tuition=sheet_('Tuition');
    const tx=sheet_('Transactions');
    let nextTuition=nextId_('Tuition');
    let nextTx=nextId_('Transactions');
    selected.forEach(s=>{
      const tid=nextTuition++;
      appendFinancialPair_('Tuition',[tid,date,String(s.id),String(schoolId),'debt',amount,description,'','',u.id,now_(),false,false,''],
        [nextTx++,date,String(schoolId),'debt',amount,description,'','',u.id,now_(),false,false,tid,'']);
      added++;
    });
    return {success:true,added:added,amount:amount,description:description,school_id:schoolId,student_ids:selected.map(s=>s.id)};
  } finally { lock.releaseLock(); }
}

function tuitionUpdate_(b) {
  const u=auth_(b);
  const hit=findRow_('Tuition',b.id);
  if(!hit) throw new Error('رکورد شهریه یافت نشد.');
  if(u.role!=='senior' && String(hit.obj.created_by)!==String(u.id)) throw new Error('فقط ثبت‌کننده یا مدیر ارشد می‌تواند ویرایش کند.');
  const r=hit.obj;
  assertEditable_('Tuition',r);
  const amount=b.amount!==undefined?amount_(b.amount):Number(r.amount);
  if(!Number.isSafeInteger(amount)||amount<=0)throw new Error('مبلغ نامعتبر است.');
  if(String(r.type)==='payment' && r.payment_source!=='پول نقد' && String(b.tracking_code!==undefined?b.tracking_code:r.tracking_code).trim()==='') throw new Error('شماره پیگیری الزامی است.');
  updateRow_('Tuition',hit.row,[
    r.id,b.date!==undefined?date_(b.date):r.date,r.student_id,r.school_id,r.type,
    amount,b.description!==undefined?b.description:r.description,
    b.tracking_code!==undefined?b.tracking_code:r.tracking_code,r.image_url,
    r.created_by,r.created_at,r.reconciled,r.approved,r.payment_source||''
  ]);
  rows_('Transactions').forEach(x=>{const t=x.obj;if(String(t.source_id)===String(r.id)&&(t.kind==='payment'||t.kind==='debt'))updateRow_('Transactions',x.row,[t.id,b.date!==undefined?date_(b.date):r.date,t.school_id,t.kind,amount,b.description!==undefined?b.description:r.description,b.tracking_code!==undefined?b.tracking_code:r.tracking_code,r.image_url,t.created_by,t.created_at,t.reconciled,t.approved,t.source_id,r.payment_source||'']);});
  return {success:true};
}

function tuitionDelete_(b) {
  const u=auth_(b);
  const hit=findRow_('Tuition',b.id);
  if(!hit) throw new Error('رکورد شهریه یافت نشد.');
  if(u.role!=='senior' && String(hit.obj.created_by)!==String(u.id)) throw new Error('فقط ثبت‌کننده یا مدیر ارشد می‌تواند حذف کند.');
  softDeleteBySource_('Tuition',b.id);
  softDeleteTransaction_(b.id,'tuition');
  return {success:true};
}

/* ---------- EXPENSES ---------- */

function expenses_(b) {
  const u=auth_(b);
  let data=rows_('Expenses').map(x=>x.obj);
  if(u.role!=='senior') data=data.filter(x=>String(x.school_id)===String(u.school_id));
  return {success:true,data:data};
}

function expenseAdd_(b) {
  const u=auth_(b);
  ensureCoreData_();
  const schoolId=(u.role==='senior' || u.role==='admin') ? String(b.school_id||'') : String(u.school_id||'');
  let category=String(b.category||'').trim();
  if(!category && b.category_id){
    const cat=findRow_('ExpenseCategories',b.category_id);
    if(cat) category=String(cat.obj.name||'').trim();
  }
  const amount=amount_(b.amount);
  if(!schoolId || !category || amount<=0) throw new Error('مدرسه، دسته هزینه و مبلغ الزامی است.');
  activeSchool_(schoolId);const recordDate=date_(b.date);
  if(!String(b.tracking_code||'').trim()) throw new Error('شماره پیگیری الزامی است.');
  const id=nextId_('Expenses');
  const image=saveAttachmentIfAny_(b,'expense',id,u.id);
  appendFinancialPair_('Expenses',[
    id,recordDate,String(schoolId),category,amount,String(b.description||''),
    String(b.tracking_code||''),image.url||'',u.id,now_(),false,false,String(b.payment_source||'bank')
  ],[
    nextId_('Transactions'),recordDate,String(schoolId),'expense',amount,String(b.description||''),
    String(b.tracking_code||''),image.url||'',u.id,now_(),false,false,id,String(b.payment_source||'bank')
  ]);
  return {success:true,id:id,image_url:image.url||''};
}

function expenseUpdate_(b) {
  const u=auth_(b);
  const hit=findRow_('Expenses',b.id);
  if(!hit) throw new Error('هزینه یافت نشد.');
  if(u.role!=='senior' && String(hit.obj.created_by)!==String(u.id)) throw new Error('فقط ثبت‌کننده یا مدیر ارشد می‌تواند ویرایش کند.');
  const r=hit.obj;
  assertEditable_('Expenses',r);
  const tracking=b.tracking_code!==undefined?String(b.tracking_code):String(r.tracking_code);
  if(!tracking.trim()) throw new Error('شماره پیگیری الزامی است.');
  let newCategory=b.category!==undefined?String(b.category):String(r.category||'');
  if(!newCategory && b.category_id){ const cat=findRow_('ExpenseCategories',b.category_id); if(cat) newCategory=String(cat.obj.name||''); }
  const newDate=b.date!==undefined?date_(b.date):r.date;
  const newAmount=b.amount!==undefined?amount_(b.amount):Number(r.amount);
  if(!newCategory.trim()||!Number.isSafeInteger(newAmount)||newAmount<=0)throw new Error('دسته و مبلغ هزینه معتبر نیست.');
  const newDescription=b.description!==undefined?b.description:r.description;
  const newSource=b.payment_source!==undefined?String(b.payment_source):String(r.payment_source||'bank');
  updateRow_('Expenses',hit.row,[r.id,newDate,r.school_id,newCategory,newAmount,newDescription,tracking,r.image_url,r.created_by,r.created_at,r.reconciled,r.approved,newSource]);
  rows_('Transactions').forEach(x=>{ if(String(x.obj.source_id)===String(r.id) && String(x.obj.kind)==='expense'){ const t=x.obj; updateRow_('Transactions',x.row,[t.id,newDate,t.school_id,t.kind,newAmount,newDescription,tracking,r.image_url,t.created_by,t.created_at,t.reconciled,t.approved,t.source_id,newSource]); }});
  return {success:true};
}

function expenseDelete_(b) {
  const u=auth_(b);
  const hit=findRow_('Expenses',b.id);
  if(!hit) throw new Error('هزینه یافت نشد.');
  if(u.role!=='senior' && String(hit.obj.created_by)!==String(u.id)) throw new Error('فقط ثبت‌کننده یا مدیر ارشد می‌تواند حذف کند.');
  softDeleteBySource_('Expenses',b.id);
  softDeleteTransaction_(b.id,'expense');
  return {success:true};
}

/* ---------- TRANSACTIONS ---------- */


function financeTransactionAdd_(b) {
  const u=auth_(b);
  const kind=String(b.kind||'');
  const allowed=['cash_receipt','cash_payment','cheque_receipt','cheque_payment'];
  if(allowed.indexOf(kind)<0) throw new Error('نوع سند مالی معتبر نیست.');
  const amount=amount_(b.amount);
  if(amount<=0) throw new Error('مبلغ باید بیشتر از صفر باشد.');
  const person=String(b.person||'').trim();
  const description=String(b.description||'').trim();
  if(!person) throw new Error('طرف حساب الزامی است.');
  if(!description) throw new Error('شرح عملیات الزامی است.');
  const cheque=kind.indexOf('cheque_')===0;
  const sayad=String(b.tracking_code||'').replace(/\D/g,'');
  if(cheque && !/^\d{16}$/.test(sayad)) throw new Error('شناسه صیادی باید ۱۶ رقم باشد.');
  const date=date_(b.date);
  const dueDate=cheque?date_(b.due_date):'';
  const schoolId=u.role==='senior'?(Number(b.school_id)||Number(u.school_id)||0):Number(u.school_id)||0;
  activeSchool_(schoolId);
  const detail=(kind==='cash_receipt'?'دریافت از: ':kind==='cash_payment'?'پرداخت به: ':kind==='cheque_receipt'?'دریافت چک از: ':'پرداخت چک به: ')+person+' | '+description+(cheque?' | بانک: '+String(b.bank_name||'')+' | سررسید: '+dueDate:'');
  const id=nextId_('Transactions');
  sheet_('Transactions').appendRow([id,date,String(schoolId),kind,amount,detail,String(b.tracking_code||''),'',u.id,now_(),false,false,'',cheque?'چک':'نقدی']);
  return {success:true,id:id,kind:kind};
}

function transactions_(b) {
  const u=auth_(b);
  let data=rows_('Transactions').map(x=>x.obj);
  if(u.role!=='senior') data=data.filter(x=>String(x.school_id)===String(u.school_id));
  if(b.student_id) data=data.filter(x=>{if(x.kind!=='payment'&&x.kind!=='debt')return false;const hit=findRow_('Tuition',x.source_id); return String(hit&&hit.obj.student_id)===String(b.student_id); });
  if(b.kind_query) data=data.filter(x=>b.kind_query==='هزینه' ? String(x.kind)==='expense' : (b.kind_query==='شهریه' ? String(x.kind)==='payment' : String(x.kind)===b.kind_query));
  const students=rows_('Students').map(x=>x.obj); const tuition=rows_('Tuition').map(x=>x.obj); const expenses=rows_('Expenses').map(x=>x.obj);
  data=data.map(t=>{
    const out=Object.assign({},t); out.school_name=schoolName_(t.school_id); out.attachment_url=t.image_url||'';
    if(String(t.kind)==='payment'||String(t.kind)==='debt') { const q=tuition.find(x=>String(x.id)===String(t.source_id)); if(q){out.student_id=q.student_id; out.payment_method=q.payment_source||t.payment_source||''; const st=students.find(x=>String(x.id)===String(q.student_id)); if(st){out.student_name=st.name;out.student_grade=st.grade;}} }
    if(String(t.kind)==='expense') { const e=expenses.find(x=>String(x.id)===String(t.source_id)); if(e){out.expense_category_name=e.category; out.payment_source=e.payment_source||t.payment_source||'bank';} } else out.payment_source=t.payment_source||'';
    return out;
  });
  return {success:true,data:data};
}

function transactionUpdate_(b) {
  const u=auth_(b);
  const hit=findRow_('Transactions',b.id);
  if(!hit) throw new Error('تراکنش یافت نشد.');
  assertEditable_('Transactions',hit.obj);
  if(u.role!=='senior' && String(hit.obj.created_by)!==String(u.id)) throw new Error('دسترسی مجاز نیست.');
  const kind=String(hit.obj.kind||'');
  const sourceId=hit.obj.source_id;
  const amount=b.amount!==undefined?amount_(b.amount):Number(hit.obj.amount);
  if(amount<=0) throw new Error('مبلغ نامعتبر است.');
  const description=String(b.description!==undefined?b.description:(b.comment!==undefined?b.comment:hit.obj.description));
  const date=b.date!==undefined?date_(b.date):hit.obj.date;
  if(kind==='payment'||kind==='debt') {
    const src=findRow_('Tuition',sourceId);
    if(!src) throw new Error('رکورد اصلی شهریه یافت نشد.');
    if(u.role!=='senior' && String(src.obj.created_by)!==String(u.id)) throw new Error('دسترسی مجاز نیست.');
    updateRow_('Tuition',src.row,[src.obj.id,date,src.obj.student_id,src.obj.school_id,src.obj.type,amount,description,b.tracking_code!==undefined?String(b.tracking_code):src.obj.tracking_code,src.obj.image_url,src.obj.created_by,src.obj.created_at,src.obj.reconciled,src.obj.approved,src.obj.payment_source||'']);
  } else if(kind==='expense') {
    const src=findRow_('Expenses',sourceId);
    if(!src) throw new Error('رکورد اصلی هزینه یافت نشد.');
    updateRow_('Expenses',src.row,[src.obj.id,date,src.obj.school_id,src.obj.category,amount,description,b.tracking_code!==undefined?String(b.tracking_code):src.obj.tracking_code,src.obj.image_url,src.obj.created_by,src.obj.created_at,src.obj.reconciled,src.obj.approved,src.obj.payment_source||'bank']);
  } else throw new Error('ویرایش این نوع تراکنش پشتیبانی نمی‌شود.');
  updateRow_('Transactions',hit.row,[hit.obj.id,date,hit.obj.school_id,kind,amount,description,b.tracking_code!==undefined?String(b.tracking_code):hit.obj.tracking_code,hit.obj.image_url,hit.obj.created_by,hit.obj.created_at,hit.obj.reconciled,hit.obj.approved,sourceId,hit.obj.payment_source||'bank']);
  return {success:true};
}

function transactionDelete_(b) {
  const u=auth_(b);
  const hit=findRow_('Transactions',b.id);
  if(!hit) throw new Error('تراکنش یافت نشد.');
  assertEditable_('Transactions',hit.obj);
  if(u.role!=='senior' && String(hit.obj.created_by)!==String(u.id)) throw new Error('دسترسی مجاز نیست.');
  const kind=String(hit.obj.kind||'');
  const sourceId=hit.obj.source_id;
  if(kind==='expense') softDeleteBySource_('Expenses',sourceId);
  if(kind==='payment'||kind==='debt') softDeleteBySource_('Tuition',sourceId);
  voidRecord_('Transactions',hit.row);
  return {success:true};
}

/* ---------- BANK ---------- */

function bankAnnotationKey_(x){
  const tracking=String(x.tracking_code||'').trim();
  const base=[String(x.school_id||''),String(Number(x.amount)||0)];
  // Prefer the bank's reference number because some Excel exports encode dates as serials.
  if(tracking) return base.concat([tracking]).join('|');
  return base.concat([String(x.date||'').trim(),String(x.bank_account||'').replace(/\D/g,'')]).join('|');
}
function bank_(b) {
  const u=auth_(b);
  let data=rows_('Bank').map(x=>Object.assign({},x.obj,{
    reconciled:String(x.obj.matched)==='true',
    matched_transaction_id:x.obj.matched_transaction_id?Number(x.obj.matched_transaction_id):undefined
  }));
  const detailById={}; rows_('BankDetails').forEach(x=>detailById[String(x.obj.bank_id)]=x.obj);
  data=data.map(x=>{const d=detailById[String(x.id)];return d?Object.assign({},x,{
    source_card_number:d.source_card_number||'',
    destination_card_number:d.destination_card_number||'',
    terminal_number:d.terminal_number||'',
    direction:d.direction||'unknown',
    balance:d.balance!==''&&d.balance!==undefined?Number(d.balance):undefined,
    reference_number:d.reference_number||'',
    pos_reference_code:d.pos_reference_code||'',
    fee_amount:d.fee_amount!==''&&d.fee_amount!==undefined?Number(d.fee_amount):undefined,
    account_suffix:d.account_suffix||'',
    transaction_time:d.transaction_time||'',
    settlement_date:d.settlement_date||''
  }):x;});
  const annotations=rows_('BankAnnotations').map(x=>x.obj);
  const byKey={}; annotations.forEach(a=>byKey[bankAnnotationKey_(a)]=a);
  data=data.map(x=>{const a=byKey[bankAnnotationKey_(x)];return a?Object.assign({},x,{assigned_student_id:a.student_id?Number(a.student_id):undefined,assigned_student_name:a.student_name||'',assigned_purpose:a.purpose||'',annotation_updated_at:a.updated_at,direction:a.direction||'unknown',balance:a.balance!==''&&a.balance!==undefined?Number(a.balance):undefined,card_number:a.card_number||a.bank_account||''}):x;});
  if(u.role!=='senior' && u.role!=='admin') data=data.filter(x=>String(x.school_id)===String(u.school_id));
  return {success:true,data:data};
}
function bankAnnotationSave_(b){
  const u=auth_(b);
  const schoolId=String(b.school_id||u.school_id||'');
  if(u.role!=='senior' && u.role!=='admin' && schoolId!==String(u.school_id)) throw new Error('دسترسی به این مدرسه مجاز نیست.');
  const date=String(b.date||'').trim(), amount=Number(b.amount||0), tracking=String(b.tracking_code||'').trim(), account=String(b.bank_account||'').trim();
  if(!date || !amount) throw new Error('تاریخ و مبلغ تراکنش برای ثبت تخصیص الزامی است.');
  const key=bankAnnotationKey_({school_id:schoolId,date:date,amount:amount,tracking_code:tracking,bank_account:account});
  const sh=sheet_('BankAnnotations');
  const hit=rows_('BankAnnotations').find(x=>bankAnnotationKey_(x.obj)===key);
  const studentId=String(b.student_id||'');
  if(studentId){const student=findRow_('Students',studentId);if(!student)throw new Error('دانش‌آموز انتخاب‌شده یافت نشد.');if(u.role!=='senior'&&String(student.obj.school_id)!==String(u.school_id))throw new Error('دانش‌آموز متعلق به مدرسه دیگری است.');}
  const values=[hit?hit.obj.id:Utilities.getUuid(),schoolId,date,amount,tracking,account,studentId,String(b.student_name||''),String(b.purpose||''),u.id,now_(),String(b.direction||'unknown'),b.balance===undefined?'':Number(b.balance||0),String(b.card_number||account)];
  if(hit) updateRow_('BankAnnotations',hit.row,values); else sh.appendRow(values);
  return {success:true,message:'تخصیص تراکنش بانکی ذخیره شد.'};
}

function bankReview_(b) {
  const u=auth_(b,['senior','admin']);
  const banks=rows_('Bank').map(x=>x.obj);
  const tx=rows_('Transactions').map(x=>x.obj);
  const schools={}; rows_('Schools').forEach(x=>schools[String(x.obj.id)]=x.obj.name);
  const data=tx.filter(bankEligible_).map(t=>{
    const linked=banks.find(x=>String(x.matched_transaction_id||'')===String(t.id));
    const candidates=banks.filter(x=>!String(x.matched_transaction_id||'')&&String(x.matched)!=='true'&&Number(x.amount)===Number(t.amount)&&String(x.school_id)===String(t.school_id)&&String(t.tracking_code||'')!==''&&String(x.tracking_code)===String(t.tracking_code));
    const hit=linked||(candidates.length===1?candidates[0]:null);
    const o=Object.assign({},t);
    o.school_name=schools[String(t.school_id)]||'';
    o.bank_found=!!hit;
    o.bank_id=hit?hit.id:'';
    o.bank_amount=hit?hit.amount:'';
    o.bank_tracking_code=hit?hit.tracking_code:'';
    o.reconciled=String(t.reconciled)==='true' && String(t.approved)==='true';
    return o;
  });
  return {success:true,data:data,bank_count:banks.length,transaction_count:tx.length};
}

function bankMatch_(b) {
  auth_(b,['senior','admin']);
  const hit=findRow_('Bank',b.id);
  if(!hit) throw new Error('تراکنش بانکی یافت نشد.');
  const transactionId=String(b.transaction_id||'');
  const tx=findRow_('Transactions',transactionId);
  if(!tx) throw new Error('تراکنش اپ یافت نشد.');
  if(String(tx.obj.payment_source)==='چک')throw new Error('چک باید از مسیر تطبیق خودکار چک با شناسه صیادی بررسی شود.');
  if(!bankEligible_(tx.obj))throw new Error('این تراکنش نقدی یا بدهی، قابل تطبیق بانکی نیست.');
  if(rows_('Bank').some(x=>String(x.obj.matched_transaction_id||'')===transactionId&&String(x.obj.id)!==String(hit.obj.id)))
    throw new Error('این تراکنش به ردیف بانکی دیگری متصل است.');
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
    true,tx.obj.approved,tx.obj.source_id,tx.obj.payment_source||''
  ]);
  return {success:true,matched:true};
}
function transactionReview_(b){ const u=auth_(b,['senior','admin']); const hit=findRow_('Transactions',b.id); if(!hit) throw new Error('تراکنش یافت نشد.'); const r=hit.obj; const approved=String(b.status||'')==='approved'; updateRow_('Transactions',hit.row,[r.id,r.date,r.school_id,r.kind,r.amount,r.description,r.tracking_code,r.image_url,r.created_by,r.created_at,r.reconciled,approved,r.source_id,r.payment_source||'']); return {success:true,approved:approved}; }
function bankReconcile_(b){
  auth_(b,['senior','admin']);
  const bankRows=rows_('Bank');
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
    if(!bankEligible_(t)||String(t.payment_source)==='چک')return;
    // Keep a previously saved link stable on subsequent reconciliation runs.
    const existing=bankRows.find(z=>String(z.obj.matched_transaction_id||'')===String(t.id));
    if(existing){
      usedBankIds[String(existing.obj.id)]=true;
      matched++;
      if(String(t.reconciled)!=='true') updateRow_('Transactions',x.row,[t.id,t.date,t.school_id,t.kind,t.amount,t.description,t.tracking_code,t.image_url,t.created_by,t.created_at,true,t.approved,t.source_id,t.payment_source||'']);
      return;
    }
    const available=z=>!usedBankIds[String(z.id)] && String(z.school_id)===String(t.school_id) && Number(z.amount)===Number(t.amount);
    const exact=bankRows.filter(z=>available(z.obj)&&String(t.tracking_code||'')!==''&&String(z.obj.tracking_code||'')===String(t.tracking_code));
    // Amount alone cannot identify a deposit. Ambiguous/no-reference entries stay manual.
    const hitRow=exact.length===1?exact[0]:null;
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
  // Resolve approved cheques from bank rows. A bank description containing return/bounce terms marks the cheque as unpaid.
  const chequeRows=rows_('Cheques');
  chequeRows.forEach(x=>{
    const c=x.obj; if(String(c.status)!=='approved' || String(c.bank_reconciled)==='true') return;
    const hits=banks.filter(z=>!usedBankIds[String(z.id)] && String(z.tracking_code||'')===String(c.sayad_id||'') && String(z.school_id)===String(c.school_id) && Number(z.amount)===Number(c.amount));
    const hit=hits.length===1?hits[0]:null;
    if(!hit) return;
    usedBankIds[String(hit.id)]=true;
    const ledger=rows_('Transactions').find(z=>String(z.obj.kind)==='payment'&&String(z.obj.payment_source)==='چک'&&String(z.obj.tracking_code)===String(c.sayad_id)&&String(z.obj.school_id)===String(c.school_id));
    const bankRecord=bankRows.find(z=>String(z.obj.id)===String(hit.id));
    if(bankRecord&&ledger){
      const z=bankRecord.obj,t=ledger.obj;
      updateRow_('Bank',bankRecord.row,[z.id,z.date,z.school_id,z.amount,z.description,z.tracking_code,z.bank_account,z.created_at,String(t.id),true,z.approved]);
      updateRow_('Transactions',ledger.row,[t.id,t.date,t.school_id,t.kind,t.amount,t.description,t.tracking_code,t.image_url,t.created_by,t.created_at,true,t.approved,t.source_id,t.payment_source]);
    }
    const desc=String(hit.description||''); const bounced=/(برگشت|برگشتی|بلامحل|پاس نشده|پاس نشد|عدم پرداخت|عودت)/i.test(desc);
    if(bounced&&ledger){
      const tuition=findRow_('Tuition',ledger.obj.source_id);
      if(tuition)voidRecord_('Tuition',tuition.row);
      const t=ledger.obj;
      updateRow_('Transactions',ledger.row,[t.id,t.date,t.school_id,t.kind,t.amount,t.description,t.tracking_code,t.image_url,t.created_by,t.created_at,false,t.approved,t.source_id,t.payment_source]);
      voidRecord_('Transactions',ledger.row);
    }
    updateRow_('Cheques',x.row,[c.id,c.date,c.student_id,c.school_id,c.amount,c.sayad_id,c.due_date,c.description,c.created_by,c.created_at,c.payment_method,c.received_confirmed,c.in_favor_confirmed,bounced?'bounced':'paid',c.approved_at,c.approved_by,true,bounced?'bounced':'paid',hit.date]);
    if(bounced) addSystemMessage_('⚠️ چک صیادی '+c.sayad_id+' دانش‌آموز با سررسید '+c.due_date+' پاس نشده/برگشت خورده است. مدیر مدرسه و کاربر ارشد باید پیگیری کنند.',c.school_id);
  });
  return {success:true,matched:matched,unmatched:unmatched};
}
function defaultBankRules_(){
  return {
    version:1,
    excludedAccountSuffixes:['009'],
    schoolAccounts:[
      {suffix:'001',purpose:'petty_cash'},
      {suffix:'002',purpose:'pos_aggregate_and_petty_cash'}
    ],
    pettyCashCards:[
      {card:'6037691263360788',managerName:'محمد عربی',active:true},
      {card:'6037691263360796',managerName:'آرزو میرزایی',active:true},
      {card:'6037691263360804',managerName:'فریبا سبزواری',active:true},
      {card:'6037691263360812',managerName:'علی هاشمیان',active:true},
      {card:'6037691263360770',managerName:'محمدرضا آقاسی',active:true},
      {card:'6037691263360762',managerName:'مدیر - غیرفعال',active:false},
      {card:'6037691261822597',managerName:'سید محمدرضا گلزاری',active:true},
      {card:'6037691261822589',managerName:'سید محمدرضا گلزاری - غیرفعال',active:false},
      {card:'6037691263357097',managerName:'سید محمدرضا گلزاری',active:true},
      {card:'6037691263357089',managerName:'کارت غیرفعال',active:false},
      {card:'6037691263357071',managerName:'علی هاشمیان',active:true}
    ],
    posTerminals:[],
    matching:{dateWindowDays:3,requireExactAmount:true,requireSourceCardWhenKnown:true}
  };
}
function bankRulesGet_(b){
  auth_(b,['senior','admin']);
  const hit=rows_('Settings').find(x=>String(x.obj.key||'')==='bank_reconciliation_rules');
  if(!hit)return {success:true,rules:defaultBankRules_(),configured:false};
  try{return {success:true,rules:Object.assign(defaultBankRules_(),JSON.parse(String(hit.obj.value||'{}'))),configured:true};}
  catch(e){return {success:false,error:'قواعد تطبیق ذخیره‌شده قابل خواندن نیست؛ مدیر ارشد باید آن را اصلاح کند.'};}
}
function bankRulesSave_(b){
  auth_(b,['senior','admin']);
  const rules=b.rules;
  if(!rules || typeof rules!=='object' || Array.isArray(rules))throw new Error('ساختار قواعد تطبیق نامعتبر است.');
  const cards=Array.isArray(rules.pettyCashCards)?rules.pettyCashCards:[];
  const terminals=Array.isArray(rules.posTerminals)?rules.posTerminals:[];
  if(cards.length>500 || terminals.length>500)throw new Error('حداکثر ۵۰۰ کارت و ۵۰۰ پایانه قابل تعریف است.');
  const days=Number(rules.matching&&rules.matching.dateWindowDays);
  if(!Number.isFinite(days)||days<0||days>30)throw new Error('بازه تطبیق تاریخ باید بین صفر تا ۳۰ روز باشد.');
  const normalized=Object.assign(defaultBankRules_(),rules,{version:1,pettyCashCards:cards,posTerminals:terminals,matching:Object.assign(defaultBankRules_().matching,rules.matching||{})});
  const serialized=JSON.stringify(normalized);
  if(serialized.length>45000)throw new Error('حجم قواعد بیش از حد مجاز است.');
  const hit=rows_('Settings').find(x=>String(x.obj.key||'')==='bank_reconciliation_rules');
  if(hit){sheet_('Settings').getRange(hit.row,2).setValue(serialized);sheet_('Settings').getRange(hit.row,3).setValue(now_());}
  else sheet_('Settings').appendRow(['bank_reconciliation_rules',serialized,now_()]);
  SpreadsheetApp.flush();
  return {success:true,message:'قواعد تطبیق در Google Sheets ذخیره شد.',rules:normalized};
}

function bankUpload_(b){
  auth_(b,['senior','admin']);
  if(Array.isArray(b.rows)){
    if(b.rows.length>10000)throw new Error('حداکثر ۱۰٬۰۰۰ ردیف در هر بار ورود مجاز است.');
    const schools=rows_('Schools').map(x=>x.obj);
    const settings={};rows_('Settings').forEach(x=>{const k=String(x.obj.key||'');if(k.indexOf('pos_terminal_')===0)settings[k.slice(13)]=String(x.obj.value||'').replace(/\D/g,'').replace(/^0+/,'');});
    const savedRules=rows_('Settings').find(x=>String(x.obj.key||'')==='bank_reconciliation_rules');
    let bankRules=defaultBankRules_();
    if(savedRules){try{bankRules=Object.assign(bankRules,JSON.parse(String(savedRules.obj.value||'{}')));}catch(e){}}
    let added=0,skipped=0;const existing=rows_('Bank').map(x=>x.obj);
    b.rows.forEach(r=>{
      const amount=Number(r.amount)||0,track=String(r.tracking_code||'').trim();
      if(!amount||(!track&&!String(r.description||'').trim())){skipped++;return;}
      const terminal=String(r.terminal_number||'').replace(/\D/g,'').replace(/^0+/,'');
      let schoolId=String(r.school_id||'');
      if(terminal){
        const configured=schools.find(s=>settings[String(s.id)]===terminal);
        const custom=(Array.isArray(bankRules.posTerminals)?bankRules.posTerminals:[]).find(x=>String(x.terminal||'').replace(/\D/g,'').replace(/^0+/,'')===terminal&&Number(x.schoolId)>0);
        if(custom)schoolId=String(custom.schoolId);
        else if(configured)schoolId=String(configured.id);
        // If no terminal rule exists, preserve the school ID supplied by the client;
        // an unresolved terminal with school_id 0 remains unassigned for manual review.
      }
      const direction=String(r.direction||'unknown');
      const sourceCard=String(r.source_card_number||'').replace(/\D/g,'');
      const dup=existing.some(x=>Number(x.amount)===amount&&String(x.tracking_code||'').trim()===track&&String(x.school_id||'')===schoolId&&String(x.date||'')===String(r.date||'')&&String(x.direction||'unknown')===direction&&String(x.source_card_number||'').replace(/\D/g,'')===sourceCard);
      if(dup){skipped++;return;}
      const bankId=nextId_('Bank');
      appendByHeaders_('Bank',[bankId,String(r.date||''),schoolId,amount,String(r.description||''),track,String(r.bank_account||r.card_number||''),now_(),'','false','false']);
      appendByHeaders_('BankDetails',[
        bankId,String(r.source_card_number||''),String(r.destination_card_number||''),String(r.terminal_number||''),
        String(r.direction||'unknown'),r.balance===''?'':Number(r.balance||0),String(r.reference_number||''),
        String(r.pos_reference_code||''),r.fee_amount===''?'':Number(r.fee_amount||0),String(r.account_suffix||''),
        String(r.transaction_time||''),String(r.settlement_date||'')
      ]);
      existing.push({amount:amount,tracking_code:track,school_id:schoolId,date:String(r.date||''),direction:direction,source_card_number:sourceCard});added++;
    });
    SpreadsheetApp.flush();
    let reconciliation={matched:0,unmatched:added};
    let reconcileWarning='';
    try { reconciliation=bankReconcile_(b)||reconciliation; }
    catch(reconcileError) { reconcileWarning=' اطلاعات ذخیره شد، اما تطبیق خودکار نیازمند بررسی است: '+String(reconcileError&&reconcileError.message||reconcileError); }
    return {success:true,message:'فایل بانک پردازش شد.',count:added,skipped:skipped,matched:reconciliation.matched||0,unmatched:reconciliation.unmatched??added,warning:reconcileWarning};
  }
  if(!b.base64) throw new Error('فایل بانک ارسال نشده است.');
  if(b.school_id) activeSchool_(b.school_id);
  if(String(b.base64).length>Math.ceil(5*1024*1024*4/3)+4)throw new Error('حداکثر حجم فایل بانک ۵ مگابایت است.');
  const name=String(b.file_name||'bank_upload.xlsx').toLowerCase();
  let result={added:0,skipped:0};
  if(name.endsWith('.xlsx')) result=importBankXlsx_(b.base64,b.school_id||'');
  else result=importBankCsv_(b.base64,b.school_id||'');
  return {success:true,message:'فایل بانک وارد شد.',count:result.added,skipped:result.skipped};
}

/* ---------- CATEGORIES ---------- */

function categories_(b) {
  auth_(b);
  ensureCoreData_();
  return {success:true,data:rows_('ExpenseCategories').map(x=>x.obj).filter(x=>String(x.active)!=='false')};
}

function categoryAdd_(b) {
  auth_(b,['senior','admin']);
  const name=String(b.name||'').trim();
  if(!name) throw new Error('نام دسته هزینه الزامی است.');
  const id=Utilities.getUuid();
  sheet_('ExpenseCategories').appendRow([id,name,true,now_()]);
  return {success:true,id:id};
}

function categoryUpdate_(b) {
  auth_(b,['senior','admin']);
  const hit=findRow_('ExpenseCategories',b.id);
  if(!hit) throw new Error('دسته هزینه یافت نشد.');
  updateRow_('ExpenseCategories',hit.row,[hit.obj.id,b.name!==undefined?b.name:hit.obj.name,b.active!==undefined?b.active:hit.obj.active,hit.obj.created_at]);
  return {success:true};
}

function categoryDelete_(b) {
  auth_(b,['senior','admin']);
  const hit=findRow_('ExpenseCategories',b.id);
  if(!hit) throw new Error('دسته هزینه یافت نشد.');
  sheet_('ExpenseCategories').getRange(hit.row,3).setValue(false);
  return {success:true};
}

/* ---------- MESSAGES ---------- */

function messages_(b) {
  const u=auth_(b);
  ensureCoreData_();
  const data=rows_('Messages').map(x=>x.obj).filter(x=>String(x.active)!=='false').filter(x=>{ const school=String(x.target_school_id||'').trim(); const role=String(x.target_role||'').trim(); const roleOk=!role || role.split(',').indexOf(String(u.role))>=0; const schoolOk=!school || String(u.school_id)===school || u.role==='senior' || u.role==='admin'; return roleOk&&schoolOk; }).reverse();
  return {success:true,data:data};
}

function messageAdd_(b) {
  const u=auth_(b,['senior','admin']);
  const msg=String(b.message||'').trim();
  if(!msg) throw new Error('پیام خالی است.');
  const id=Utilities.getUuid();
  sheet_('Messages').appendRow([id,msg,u.id,now_(),true,'','']);
  return {success:true,id:id};
}

function messageDelete_(b) {
  auth_(b,['senior','admin']);
  const hit=findRow_('Messages',b.id);
  if(!hit) throw new Error('پیام یافت نشد.');
  sheet_('Messages').getRange(hit.row,5).setValue(false);
  return {success:true};
}


/* ---------- CHEQUES ---------- */
function cheques_(b){
  const u=auth_(b,['senior','admin']);
  const schools={}; rows_('Schools').forEach(x=>schools[String(x.obj.id)]=x.obj.name);
  const students={}; rows_('Students').forEach(x=>students[String(x.obj.id)]=x.obj);
  let data=rows_('Cheques').map(x=>Object.assign({},x.obj));
  if(u.role!=='senior' && u.role!=='admin') data=data.filter(x=>String(x.school_id)===String(u.school_id));
  data=data.filter(x=>String(x.status||'pending')==='pending').map(x=>{x.school_name=schools[String(x.school_id)]||'';x.student_name=students[String(x.student_id)]?.name||'';x.student_grade=students[String(x.student_id)]?.grade||'';return x;});
  return {success:true,data:data};
}
function chequeList_(b){
  const u=auth_(b);
  const schools={}; rows_('Schools').forEach(x=>schools[String(x.obj.id)]=x.obj.name);
  const students={}; rows_('Students').forEach(x=>students[String(x.obj.id)]=x.obj);
  let data=rows_('Cheques').map(x=>Object.assign({},x.obj))
    .filter(x=>['approved','bounced','rejected','paid'].indexOf(String(x.status))>=0);
  if(u.role!=='senior' && u.role!=='admin') data=data.filter(x=>String(x.school_id)===String(u.school_id));
  data=data.map(x=>{const s=students[String(x.student_id)]||{};x.school_name=schools[String(x.school_id)]||'';x.student_name=s.name||'';x.student_grade=s.grade||'';return x;})
    .sort((a,b)=>String(a.due_date||'').localeCompare(String(b.due_date||'')));
  return {success:true,data:data};
}
function chequeAlerts_(b){
  const u=auth_(b);
  const today=todayIso_();
  const students={}; rows_('Students').forEach(x=>students[String(x.obj.id)]=x.obj);
  let data=rows_('Cheques').map(x=>x.obj).filter(x=>['approved','bounced'].indexOf(String(x.status))>=0);
  if(u.role!=='senior' && u.role!=='admin') data=data.filter(x=>String(x.school_id)===String(u.school_id));
  const alerts=[];
  data.forEach(c=>{
    const name=students[String(c.student_id)]?.name||'دانش‌آموز';
    if(String(c.status)==='bounced') alerts.push({level:'danger',message:'⚠️ چک '+c.sayad_id+' دانش‌آموز '+name+' پاس نشده/برگشت خورده است.'});
    else if(String(c.bank_reconciled)!=='true' && String(c.due_date) && String(c.due_date)<=today) alerts.push({level:'warning',message:'⏰ سررسید چک '+c.sayad_id+' دانش‌آموز '+name+' فرا رسیده است و هنوز با بانک تطبیق نشده.'});
    else if(String(c.bank_reconciled)!=='true' && daysBetween_(today,String(c.due_date))<=3 && daysBetween_(today,String(c.due_date))>=0) alerts.push({level:'info',message:'⏰ سررسید چک '+c.sayad_id+' دانش‌آموز '+name+' نزدیک است.'});
  });
  return {success:true,data:alerts};
}
function chequeReview_(b){
  const lock=writeLock_();
  lock.waitLock(30000);
  try {
    const u=auth_(b,['senior','admin']);
    const hit=findRow_('Cheques',b.id);
    if(!hit) throw new Error('چک یافت نشد.');
    const c=hit.obj;
    // `action` is the API route after Android routing; `review_action` is the user's decision.
    const action=String(b.review_action||b.decision||'');
    const currentStatus=String(c.status||'pending');
    if(['receive','favor','reject'].indexOf(action)<0) throw new Error('نوع عملیات چک نامعتبر است. لطفاً برنامه را به‌روزرسانی کنید.');

    // Idempotency: never create a second tuition payment for an already decided cheque.
    if(currentStatus==='approved' || currentStatus==='rejected' || currentStatus==='bounced' || currentStatus==='paid') {
      return {success:true,status:currentStatus,already_processed:true,
        received_confirmed:String(c.received_confirmed)==='true',
        in_favor_confirmed:String(c.in_favor_confirmed)==='true'};
    }

    let received=String(c.received_confirmed)==='true';
    let favor=String(c.in_favor_confirmed)==='true';
    if(action==='receive') received=true;
    else if(action==='favor') favor=true;
    else if(action==='reject') {
      updateRow_('Cheques',hit.row,[c.id,c.date,c.student_id,c.school_id,c.amount,c.sayad_id,c.due_date,c.description,c.created_by,c.created_at,c.payment_method,received,favor,'rejected',c.approved_at,u.id,c.bank_reconciled,c.bank_status,c.bank_date]);
      SpreadsheetApp.flush();
      addSystemMessage_('❌ چک صیادی '+c.sayad_id+' رد شد و به‌عنوان پرداخت شهریه ثبت نشد.',c.school_id);
      SpreadsheetApp.flush();
      return {success:true,status:'rejected',received_confirmed:received,in_favor_confirmed:favor};
    }

    const status=(received&&favor)?'approved':'pending';
    if(status==='approved'){activeSchool_(c.school_id);activeStudentForSchool_(c.student_id,c.school_id);}
    updateRow_('Cheques',hit.row,[c.id,c.date,c.student_id,c.school_id,c.amount,c.sayad_id,c.due_date,c.description,c.created_by,c.created_at,c.payment_method,received,favor,status,status==='approved'?now_():c.approved_at,status==='approved'?u.id:c.approved_by,c.bank_reconciled,c.bank_status,c.bank_date]);

    if(status==='approved') {
      // Final approval creates one student payment and one matching ledger transaction.
      // The script lock plus status guard above prevents duplicate records on repeated taps.
      const tid=nextId_('Tuition');
      const description='پرداخت با چک صیادی - '+c.sayad_id;
      const txid=nextId_('Transactions');
      try{
        appendFinancialPair_('Tuition',[tid,c.date,c.student_id,c.school_id,'payment',c.amount,description,c.sayad_id,c.image_url||'',c.created_by,c.created_at,false,true,'چک'],
          [txid,c.date,c.school_id,'payment',c.amount,description,c.sayad_id,c.image_url||'',c.created_by,c.created_at,false,true,tid,'چک']);
      }catch(error){
        updateRow_('Cheques',hit.row,[c.id,c.date,c.student_id,c.school_id,c.amount,c.sayad_id,c.due_date,c.description,c.created_by,c.created_at,c.payment_method,c.received_confirmed,c.in_favor_confirmed,'pending',c.approved_at,c.approved_by,c.bank_reconciled,c.bank_status,c.bank_date]);
        throw error;
      }
      SpreadsheetApp.flush();
      addSystemMessage_('✅ چک صیادی '+c.sayad_id+' تأیید شد و پرداخت آن در ریز گردش دانش‌آموز ثبت گردید.',c.school_id);
      return {success:true,status:'approved',received_confirmed:true,in_favor_confirmed:true,tuition_id:tid,transaction_id:txid};
    }
    SpreadsheetApp.flush();
    return {success:true,status:'pending',received_confirmed:received,in_favor_confirmed:favor,message:'تأیید اول ثبت شد؛ برای نهایی‌شدن، تأیید دیگر نیز لازم است.'};
  } finally {
    lock.releaseLock();
  }
}
function addSystemMessage_(msg,schoolId){ const id='SYS-'+Utilities.getUuid(); sheet_('Messages').appendRow([id,msg,'system',now_(),true,String(schoolId||''),'manager,senior,admin']); }
function todayIso_(){ return Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Tehran','yyyy-MM-dd'); }
function daysBetween_(a,b){ try{return Math.round((new Date(b+'T00:00:00').getTime()-new Date(a+'T00:00:00').getTime())/86400000);}catch(e){return 99999;} }

/* ---------- MANAGERS ---------- */

function managers_(b) {
  auth_(b,['senior','admin']);
  ensureCoreData_();
  return {success:true,data:rows_('Managers').map(x=>{
    const r=Object.assign({},x.obj);
    delete r.password;
    r.school_name = r.school_id ? schoolName_(r.school_id) : '';
    return r;
  })};
}

function managerAdd_(b) {
  auth_(b,['senior','admin']);
  if(!b.username || !b.password) throw new Error('نام کاربری و رمز عبور الزامی است.');
  const id=nextId_('Managers');
  sheet_('Managers').appendRow([
    id,String(b.name||''),String(b.username),sha256_(String(b.password)),
    String(b.school_id||''),String(b.role||'manager'),true,now_(),String(b.petty_cash_card||''),String(b.petty_cash_bank||''),String(b.petty_cash_shaba||''),Number(b.petty_cash_limit||0),Number(b.petty_cash_balance||0)
  ]);
  return {success:true,id:id};
}

function managerUpdate_(b) {
  auth_(b,['senior','admin']);
  const hit=findRow_('Managers',b.id);
  if(!hit) throw new Error('مدیر یافت نشد.');
  const r=hit.obj;
  const pass=b.password ? sha256_(String(b.password)) : r.password;
  updateRow_('Managers',hit.row,[
    r.id,b.name!==undefined?b.name:r.name,b.username!==undefined?b.username:r.username,
    pass,b.school_id!==undefined?b.school_id:r.school_id,
    b.role!==undefined?b.role:r.role,b.active!==undefined?b.active:r.active,r.created_at,
    b.petty_cash_card!==undefined?b.petty_cash_card:(r.petty_cash_card||''),
    b.petty_cash_bank!==undefined?b.petty_cash_bank:(r.petty_cash_bank||''),
    b.petty_cash_shaba!==undefined?b.petty_cash_shaba:(r.petty_cash_shaba||''),
    b.petty_cash_limit!==undefined?Number(b.petty_cash_limit||0):Number(r.petty_cash_limit||0),
    b.petty_cash_balance!==undefined?Number(b.petty_cash_balance||0):Number(r.petty_cash_balance||0)
  ]);
  return {success:true};
}

function managerDelete_(b) {
  auth_(b,['senior','admin']);
  const hit=findRow_('Managers',b.id);
  if(!hit) throw new Error('مدیر یافت نشد.');
  sheet_('Managers').getRange(hit.row,7).setValue(false);
  return {success:true};
}

function managerImportAttached_(b) {
  auth_(b,['senior','admin']);
  let added=0, updated=0, skipped=0;
  ATTACHED_MANAGERS.forEach(m=>{
    const username=String(m.username||'').trim();
    if(!username) return;
    const hit=findManagerByUsername_(username);
    if(!hit){
      sheet_('Managers').appendRow([nextId_('Managers'),String(m.name||''),username,String(m.password_hash||''),m.school_id==null?'':String(m.school_id),'manager',true,now_()]);
      added++;
      return;
    }
    if(username==='آرزو طالب پور' && String(hit.obj.school_id||'')!=='10'){
      updateRow_('Managers',hit.row,[hit.obj.id,hit.obj.name,hit.obj.username,hit.obj.password,'10',hit.obj.role||'manager',hit.obj.active,hit.obj.created_at]);
      updated++;
    } else skipped++;
  });
  return {success:true,added:added,updated:updated,skipped:skipped,total:ATTACHED_MANAGERS.length};
}

/* ---------- ATTACHMENTS / DRIVE ---------- */

function attachment_(b) {
  const u=auth_(b);
  if(!b.base64) throw new Error('فایل ارسال نشده است.');
  const id=Utilities.getUuid();
  const sourceType=String(b.source_type||b.entity_type||'general').toLowerCase();
  const sourceId=String(b.source_id||b.entity_id||'');
  const table=['expense','expenses'].indexOf(sourceType)>=0?'Expenses':(['tuition','payment','debt'].indexOf(sourceType)>=0?'Tuition':(sourceType==='cheque'?'Cheques':''));
  if(table){
    const target=findRow_(table,sourceId);
    if(!target)throw new Error('رکورد مقصد پیوست یافت نشد.');
    if(u.role!=='senior'&&String(target.obj.school_id)!==String(u.school_id))throw new Error('پیوست متعلق به مدرسه دیگری است.');
  }else if(sourceType!=='general')throw new Error('نوع پیوست پشتیبانی نمی‌شود.');
  const saved=saveAttachment_(b.base64,b.file_name||('file_'+id+'.jpg'),b.mime_type||'image/jpeg',id,u.id,sourceType,sourceId);
  // Persist the Drive URL on the business record and its ledger transaction;
  // merely creating a Drive file is not enough for managers to see the image later.
  if(sourceType==='cheque'){
    const target=findRow_('Cheques',sourceId);
    const values=HEADERS.Cheques.map(k=>k==='image_url'?saved.url:target.obj[k]);
    updateRow_('Cheques',target.row,values);
  }else if(sourceId && (sourceType==='expense' || sourceType==='expenses')) {
    const hit=findRow_('Expenses',sourceId);
    if(hit) updateRow_('Expenses',hit.row,[hit.obj.id,hit.obj.date,hit.obj.school_id,hit.obj.category,hit.obj.amount,hit.obj.description,hit.obj.tracking_code,saved.url,hit.obj.created_by,hit.obj.created_at,hit.obj.reconciled,hit.obj.approved,hit.obj.payment_source||'bank']);
    rows_('Transactions').forEach(x=>{const t=x.obj;if(String(t.source_id)===sourceId&&String(t.kind)==='expense')updateRow_('Transactions',x.row,[t.id,t.date,t.school_id,t.kind,t.amount,t.description,t.tracking_code,saved.url,t.created_by,t.created_at,t.reconciled,t.approved,t.source_id,t.payment_source||'bank']);});
  } else if(sourceId && (sourceType==='tuition' || sourceType==='payment' || sourceType==='debt')) {
    const hit=findRow_('Tuition',sourceId);
    if(hit) updateRow_('Tuition',hit.row,[hit.obj.id,hit.obj.date,hit.obj.student_id,hit.obj.school_id,hit.obj.type,hit.obj.amount,hit.obj.description,hit.obj.tracking_code,saved.url,hit.obj.created_by,hit.obj.created_at,hit.obj.reconciled,hit.obj.approved,hit.obj.payment_source||'']);
    rows_('Transactions').forEach(x=>{const t=x.obj;if(String(t.source_id)===sourceId&&(String(t.kind)==='payment'||String(t.kind)==='debt'))updateRow_('Transactions',x.row,[t.id,t.date,t.school_id,t.kind,t.amount,t.description,t.tracking_code,saved.url,t.created_by,t.created_at,t.reconciled,t.approved,t.source_id,t.payment_source||'']);});
  }
  return {success:true,url:saved.url,file_id:saved.file_id};
}

function attachmentRead_(b){
  const u=auth_(b);
  const hit=rows_('Attachments').find(x=>String(x.obj.url)===String(b.url||''));
  if(!hit)throw new Error('پیوست ثبت‌شده یافت نشد.');
  const a=hit.obj;
  const table=['expense','expenses'].indexOf(a.source_type)>=0?'Expenses':(['tuition','payment','debt'].indexOf(a.source_type)>=0?'Tuition':(a.source_type==='cheque'?'Cheques':''));
  let allowed=u.role==='senior';
  if(table){
    const record=findRow_(table,a.source_id);
    allowed=allowed||!!(record&&String(record.obj.school_id)===String(u.school_id));
    // An approved cheque image is also visible through its generated tuition record.
  }else allowed=allowed||String(a.created_by)===String(u.id);
  if(!allowed)throw new Error('دسترسی به این پیوست مجاز نیست.');
  if(!String(a.mime_type).startsWith('image/'))throw new Error('پیش‌نمایش فقط برای تصویر پشتیبانی می‌شود.');
  const file=DriveApp.getFileById(String(a.drive_file_id));
  if(file.getSize()>5*1024*1024)throw new Error('پیوست برای پیش‌نمایش بیش از حد بزرگ است.');
  return {success:true,mime_type:a.mime_type,base64:Utilities.base64Encode(file.getBlob().getBytes())};
}

function saveAttachmentIfAny_(b,type,sourceId,userId) {
  if(!b.base64) return {url:'',file_id:''};
  return saveAttachment_(b.base64,b.file_name||('image_'+sourceId+'.jpg'),b.mime_type||'image/jpeg',sourceId,userId,type,sourceId);
}

function saveAttachment_(base64,fileName,mimeType,id,userId,sourceType,sourceId) {
  let clean=String(base64);
  if(clean.indexOf(',')>=0) clean=clean.substring(clean.indexOf(',')+1);
  if(clean.length>Math.ceil(5*1024*1024*4/3)+4)throw new Error('حداکثر حجم پیوست ۵ مگابایت است.');
  if(['image/jpeg','image/png','image/webp','application/pdf'].indexOf(String(mimeType))<0)throw new Error('نوع فایل مجاز نیست.');
  fileName=String(fileName).replace(/[\\/\u0000-\u001f]/g,'_').slice(0,120);
  const bytes=Utilities.base64Decode(clean);
  if(bytes.length>5*1024*1024)throw new Error('حداکثر حجم پیوست ۵ مگابایت است.');
  const blob=Utilities.newBlob(bytes,mimeType,fileName);
  const folder=getDriveFolder_();
  const file=folder.createFile(blob);
  // New financial attachments stay private. Share the folder explicitly with authorized staff.
  const url=file.getUrl();
  sheet_('Attachments').appendRow([id,sourceType,sourceId,fileName,mimeType,file.getId(),url,userId,now_()]);
  return {url:url,file_id:file.getId()};
}

function getDriveFolder_() {
  const it=DriveApp.getFoldersByName(CFG.DRIVE_FOLDER_NAME);
  if(it.hasNext()) return it.next();
  return DriveApp.createFolder(CFG.DRIVE_FOLDER_NAME);
}

function parsianSchoolMap_(b){ auth_(b); const out=[]; Object.keys(SCHOOL_TUITION).forEach(k=>out.push({school_id:Number(k),school_name:schoolName_(Number(k)),tuition:{code:SCHOOL_TUITION[k],name:'سرفصل درآمد شهریه مدرسه'}})); return {success:true,data:out}; }
function parsianStudentAccounts_(b){const u=auth_(b);let data=rows_('Students').map(x=>x.obj).filter(s=>String(s.active)!=='false'&&(u.role==='senior'||String(s.school_id)===String(u.school_id))).map(s=>({code:[s.tafsili_code,s.moeen_code,s.kol_code||'67'].join('-'),name:s.name,id:s.id}));if(b.q){const q=String(b.q).toLowerCase();data=data.filter(x=>String(x.code).toLowerCase().includes(q)||String(x.name).toLowerCase().includes(q));}return {success:true,data:data};}
function parsianAllocate_(b){ auth_(b); return {success:true,data:{code:'0-'+String(b.moeen||1)+'-67',name:String(b.name||'حساب دانش‌آموز')}}; }

/* ---------- PARSIAN ---------- */

function parsianExport_(b) {
  const u=auth_(b,['senior','admin']);
  const cols=['ID','KolCode','MoeenCode','TafsiliCode','HesabName','Comment','Bed','Bes','Factor_Num','Tick','SanadComment','ChkNum','IsRecPayChk','CostCenterCode'];
  const out=[cols];

  let txs=rows_('Transactions').map(x=>x.obj)
    .filter(x=>String(x.reconciled)==='true' && String(x.approved)==='true');
  if(b.school_id) txs=txs.filter(x=>String(x.school_id)===String(b.school_id));

  const students={};
  rows_('Students').forEach(x=>students[String(x.obj.id)]=x.obj);

  txs.forEach(t=>{
    const amount=Number(t.amount)||0;
    if(amount<=0) return;
    const schoolId=Number(t.school_id);

    if(String(t.kind)==='expense') {
      const src=findRow_('Expenses',t.source_id);
      const cat=src?String(src.obj.category):'هزینه های متفرقه';
      const account=(EXPENSE_CODES[schoolId]&&EXPENSE_CODES[schoolId][cat])||GENERIC_EXPENSE[cat]||'0-8-50';
      const parts=account.split('-');
      const bank='0-1-11'.split('-');
      out.push(parsianRow_(t.id,parts[2],parts[1],parts[0],cat,t.description,amount,0,t.tracking_code,'',t.tracking_code,'',0,''));
      out.push(parsianRow_(t.id,bank[2],bank[1],bank[0],'بانک صادرات 002',t.description,0,amount,t.tracking_code,'',t.tracking_code,'',0,''));
    } else {
      const tuitionHit=findRow_('Tuition',t.source_id);
      const tuitionRecord=tuitionHit?tuitionHit.obj:null;
      const studentId=tuitionRecord?tuitionRecord.student_id:(t.student_id||'');
      const student=students[String(studentId)] || students[String(t.student_id)];
      if(!student) return;
            const taf=String(student.tafsili_code||'');
      const moe=String(student.moeen_code||'');
      const kol=String(student.kol_code||'67');
      if(!taf || !moe || !kol) return;
      const schoolCode=SCHOOL_TUITION[schoolId];
      if(!schoolCode) return;
      const sp=schoolCode.split('-');
      if(String(t.kind)==='payment') {
        out.push(parsianRow_(t.id,kol,moe,taf,student.name,t.description,amount,0,t.tracking_code,'',t.tracking_code,'',0,''));
        out.push(parsianRow_(t.id,sp[2],sp[1],sp[0],schoolName_(schoolId),t.description,0,amount,t.tracking_code,'',t.tracking_code,'',0,''));
      }
    }
  });

  const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss');
  const temp=SpreadsheetApp.create('Parsian_temp_'+stamp);
  const tsh=temp.getSheets()[0];
  tsh.setName('Sheet1');
  tsh.getRange(1,1,out.length,cols.length).setValues(out);
  SpreadsheetApp.flush();
  const exportUrl='https://docs.google.com/spreadsheets/d/'+temp.getId()+'/export?format=xlsx';
  const response=UrlFetchApp.fetch(exportUrl,{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});
  if(response.getResponseCode()<200||response.getResponseCode()>=300){DriveApp.getFileById(temp.getId()).setTrashed(true);throw new Error('ساخت فایل Excel پارسیان انجام نشد.');}
  const file=getDriveFolder_().createFile(response.getBlob().setName('Parsian_'+stamp+'.xlsx'));
  DriveApp.getFileById(temp.getId()).setTrashed(true);
  return {success:true,file_url:file.getUrl(),file_id:file.getId(),rows:out.length-1,columns:cols};
}

function parsianRow_(id,kol,moeen,taf,name,comment,bed,bes,factor,tick,sanad,chk,isrec,cost) {
  return [id,kol,moeen,taf,name,comment,bed,bes,factor,tick,sanad,chk,isrec,cost];
}


/* ---------- ACTIVITY LOG ---------- */
function auditAfterAction_(action,b,result) {
  let u=null;
  try { u=auth_(b); } catch(_) {}
  if(!u) return;
  let entityType='system', entityId='';
  if(action.indexOf('student')>=0) entityType='student';
  else if(action.indexOf('tuition')>=0) entityType='tuition';
  else if(action.indexOf('expense')>=0) entityType='expense';
  else if(action.indexOf('manager')>=0) entityType='manager';
  else if(action.indexOf('school')>=0) entityType='school';
  else if(action.indexOf('bank')>=0) entityType='bank';
  else if(action.indexOf('message')>=0) entityType='message';
  else if(action.indexOf('category')>=0) entityType='category';
  else if(action.indexOf('transaction')>=0) entityType='transaction';
  if(result && result.id!==undefined) entityId=String(result.id);
  if(action==='tuition_bulk_debt') entityId=String(result.added||0)+' students';
  let description=auditDescription_(action,b,result);
  const sh=sheet_('ActivityLogs');
  sh.appendRow([nextId_('ActivityLogs'),now_(),u.id,u.username||'',u.name||'',u.role||'',u.school_id||'',action,entityType,entityId,description,JSON.stringify(auditDetails_(action,b,result))]);
}
function auditDescription_(action,b,r){
  const map={student_add:'افزودن دانش‌آموز',student_update:'ویرایش دانش‌آموز',student_delete:'حذف/غیرفعال‌کردن دانش‌آموز',students_import:'ورود دانش‌آموزان از Excel',tuition_add:'ثبت بدهی/پرداخت شهریه',tuition_bulk_debt:'ثبت گروهی بدهی شهریه',tuition_update:'ویرایش رکورد شهریه',tuition_delete:'حذف رکورد شهریه',expense_add:'ثبت هزینه',expense_update:'ویرایش هزینه',expense_delete:'حذف هزینه',transaction_delete:'حذف تراکنش',transaction_review:'بررسی تراکنش',bank_reconcile:'تطبیق تراکنش‌های بانک',bank_upload:'ورود فایل بانک',manager_add:'افزودن مدیر',manager_update:'ویرایش مدیر',manager_delete:'حذف/غیرفعال‌کردن مدیر',manager_import_attached:'همگام‌سازی مدیران',school_add:'افزودن مدرسه',school_update:'ویرایش مدرسه',school_delete:'غیرفعال‌کردن مدرسه',message_add:'ارسال پیام به مدیران',message_delete:'حذف پیام',category_add:'افزودن دسته هزینه',category_update:'ویرایش دسته هزینه',category_delete:'غیرفعال‌کردن دسته هزینه',parsian_export:'خروجی Excel پارسیان'};
  let d=map[action]||action;
  if(action==='tuition_bulk_debt') d+=' | '+String(r.added||0)+' نفر | '+String(r.amount||0)+' ریال | '+String(r.description||'');
  else if(action==='students_import') d+=' | '+String(r.added||0)+' اضافه | '+String(r.skipped||0)+' تکراری | '+String(r.invalid||0)+' نیازمند اصلاح';
  return d;
}
function auditDetails_(action,b,r){
  const safe={};
  ['request_id','id','school_id','amount','type','status','category_id','added','skipped','invalid','matched','unmatched'].forEach(k=>{if(b[k]!==undefined)safe[k]=b[k];});
  if(r && r.added!==undefined)safe.result_added=r.added;
  if(r && r.student_ids)safe.student_count=r.student_ids.length;
  return safe;
}
function activityLogs_(b){
  const u=auth_(b);
  let data=rows_('ActivityLogs').map(x=>x.obj).reverse();
  if(u.role!=='senior' && u.role!=='admin') data=data.filter(x=>String(x.user_id)===String(u.id));
  else if(!String(b.all||'').toLowerCase().match(/^(1|true|yes)$/)) data=data.filter(x=>String(x.user_id)===String(u.id));
  if(b.user_id) data=data.filter(x=>String(x.user_id)===String(b.user_id));
  return {success:true,data:data.slice(0,500)};
}

function saveSetting_(key,value){
  const sh=sheet_('Settings');
  const hit=rows_('Settings').find(x=>String(x.obj.key||'')===String(key));
  if(hit) updateRow_('Settings',hit.row,[hit.obj.key,String(value),hit.obj.updated_at||now_()]);
  else appendByHeaders_('Settings',[String(key),String(value),now_()]);
}

function appVersion_(b){
  auth_(b);
  const settings={};
  rows_('Settings').forEach(x=>settings[String(x.obj.key||'')]=String(x.obj.value||''));
  return {
    success:true,
    version:settings['android_version']||'2.16.0',
    apk_url:settings['android_apk_url']||'',
    notes:settings['android_update_notes']||'',
    force_update:String(settings['android_force_update']||'false').toLowerCase()==='true',
    backend_version:'2.16.0'
  };
}

function updateSettings_(b){
  const u=auth_(b,['senior']);
  const version=String(b.version||'').trim();
  const apkUrl=String(b.apk_url||'').trim();
  const notes=String(b.notes||'').trim().slice(0,2000);
  const force=String(b.force_update||'false').toLowerCase()==='true';
  if(!version.split('.')[0] || version.split('.').length < 3 || !/^[0-9A-Za-z.+-]+$/.test(version))
    throw new Error('شماره نسخه باید مانند 2.17.0 باشد.');
  if(apkUrl.indexOf('https://')!==0 || apkUrl.toLowerCase().indexOf('.apk')<0)
    throw new Error('لینک باید نشانی مستقیم و امن فایل APK باشد.');
  saveSetting_('android_version',version);
  saveSetting_('android_apk_url',apkUrl);
  saveSetting_('android_update_notes',notes);
  saveSetting_('android_force_update',force?'true':'false');
  return {success:true,message:'تنظیمات به‌روزرسانی برای همه کاربران ذخیره شد.',version:version,updated_by:u.username};
}

function myClaim_(b){
  const u=auth_(b);
  let data=rows_('Expenses').map(x=>x.obj).filter(x=>String(x.payment_source||'')==='own');
  if(u.role!=='senior' && u.role!=='admin') data=data.filter(x=>String(x.school_id)===String(u.school_id));
  const total=data.reduce((n,x)=>n+(Number(x.amount)||0),0);
  return {success:true,total:total,data:data.map(x=>({id:x.id,date:x.date,school_id:x.school_id,school_name:schoolName_(x.school_id),category:x.category,amount:x.amount,description:x.description,tracking_code:x.tracking_code,image_url:x.image_url}))};
}

/* ---------- SUMMARY ---------- */

function summary_(b) {
  const u=auth_(b);
  let students=rows_('Students').map(x=>x.obj).filter(x=>String(x.active)!=='false');
  let tuition=rows_('Tuition').map(x=>x.obj);
  let expenses=rows_('Expenses').map(x=>x.obj);
  if(u.role!=='senior') {
    students=students.filter(x=>String(x.school_id)===String(u.school_id));
    tuition=tuition.filter(x=>String(x.school_id)===String(u.school_id));
    expenses=expenses.filter(x=>String(x.school_id)===String(u.school_id));
  }

  const debt={};
  students.forEach(s=>debt[s.id]=0);
  tuition.forEach(t=>{
    if(!(t.student_id in debt)) debt[t.student_id]=0;
    if(String(t.type)==='debt') debt[t.student_id]+=Number(t.amount)||0;
    if(String(t.type)==='payment') debt[t.student_id]-=Number(t.amount)||0;
  });
  let totalDebt=0;
  Object.keys(debt).forEach(k=>{ if(debt[k]>0) totalDebt+=debt[k]; });

  const byCat={};
  expenses.forEach(e=>byCat[e.category]=(byCat[e.category]||0)+(Number(e.amount)||0));
  return {success:true,total_students:students.length,total_debt:totalDebt,expenses_by_category:byCat};
}

/* ---------- HELPERS ---------- */

function nextId_(name){ const all=rows_(name,true); let max=0; all.forEach(x=>{const n=Number(x.obj.id);if(isFinite(n)&&n>max)max=n;}); return max+1; }

function activeSchool_(id){
  const hit=findRow_('Schools',id);if(!hit||String(hit.obj.active)==='false')throw new Error('مدرسه فعال یافت نشد.');return hit.obj;
}
function activeStudentForSchool_(id,school){
  const hit=findRow_('Students',id);if(!hit||String(hit.obj.active)==='false'||String(hit.obj.school_id)!==String(school))throw new Error('دانش‌آموز فعال در مدرسه انتخابی یافت نشد.');return hit.obj;
}
function bankEligible_(t){
  return t.kind!=='debt'&&['cash_receipt','cash_payment'].indexOf(String(t.kind))<0&&['پول نقد','نقدی','cash','personal','own'].indexOf(String(t.payment_source))<0;
}

/** Run manually only after setting ROTATED_ADMIN_PASSWORD in Script Properties. */
function rotateAdminPassword(){
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try{
    const properties=PropertiesService.getScriptProperties(),password=properties.getProperty('ROTATED_ADMIN_PASSWORD');
    if(!password||password.length<12)throw new Error('ROTATED_ADMIN_PASSWORD باید حداقل ۱۲ نویسه باشد.');
    const hit=findManagerByUsername_('admin');if(!hit)throw new Error('حساب admin یافت نشد؛ ابتدا setup اجرا شود.');
    const r=hit.obj;updateRow_('Managers',hit.row,[r.id,r.name,r.username,sha256_(password),r.school_id,r.role,r.active,r.created_at]);
    properties.deleteProperty('ROTATED_ADMIN_PASSWORD');
    return {success:true,message:'رمز تغییر کرد؛ نشست‌های قبلی معتبر نیستند.'};
  }finally{lock.releaseLock();}
}
function assertEditable_(name,r){
  if(String(r.approved)==='true'||String(r.reconciled)==='true')throw new Error('سند تأیید یا تطبیق‌شده قابل ویرایش/حذف نیست؛ ابتدا فرایند اصلاح حسابداری انجام شود.');
  if(name!=='Transactions'&&rows_('Transactions').some(x=>String(x.obj.source_id)===String(r.id)&&(name==='Expenses'?x.obj.kind==='expense':['payment','debt'].indexOf(x.obj.kind)>=0)&&(String(x.obj.approved)==='true'||String(x.obj.reconciled)==='true')))
    throw new Error('تراکنش مرتبط تأیید یا تطبیق شده است.');
}
function appendByHeaders_(name,values){
  const sh=sheet_(name),headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(String);
  const canonical=HEADERS[name];sh.appendRow(headers.map(h=>{const i=canonical.indexOf(h);return i>=0&&i<values.length?values[i]:'';}));
}
function appendFinancialPair_(name,source,ledger){
  const a=sheet_(name),t=sheet_('Transactions'),ar=a.getLastRow(),tr=t.getLastRow();
  try{appendByHeaders_(name,source);appendByHeaders_('Transactions',ledger);SpreadsheetApp.flush();}
  catch(error){
    // Best-effort compensation, not a database transaction. Requests blocks unsafe replay.
    try{if(a.getLastRow()>ar)a.getRange(ar+1,1,a.getLastRow()-ar,a.getLastColumn()).clearContent();}catch(_){}
    try{if(t.getLastRow()>tr)t.getRange(tr+1,1,t.getLastRow()-tr,t.getLastColumn()).clearContent();}catch(_){}
    throw error;
  }
}
function voidRecord_(name,row){
  const sh=sheet_(name);
  ['voided','voided_at'].forEach((key,i)=>{let headers=sh.getRange(1,1,1,sh.getLastColumn()).getDisplayValues()[0].map(String);let col=headers.indexOf(key)+1;if(!col){col=sh.getLastColumn()+1;sh.getRange(1,col).setValue(key);}sh.getRange(row,col).setValue(i===0?true:now_());});
}

function getActiveSs_() {
  try {
    const act = SpreadsheetApp.getActiveSpreadsheet();
    if (act) return act;
  } catch(e) {}
  try {
    return SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  } catch(e) {
    return null;
  }
}

function sheet_(name) {
  const ss = getActiveSs_();
  if (!ss) return null;
  let sh = ss.getSheetByName(name);
  if (!sh && HEADERS[name]) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function rows_(name,includeVoided) {
  const sh=sheet_(name);
  if(!sh || sh.getLastRow()<2) return [];
  const lastCol=sh.getLastColumn();
  const headers=sh.getRange(1,1,1,lastCol).getDisplayValues()[0].map(h=>String(h||'').trim());
  const values=sh.getRange(2,1,sh.getLastRow()-1,lastCol).getValues();
  return values.map((v,i)=>{
    const obj={};
    headers.forEach((h,j)=>{ if(h) obj[h]=v[j]; });
    return {row:i+2,obj:obj};
  }).filter(x=>Object.keys(x.obj).some(k=>x.obj[k]!==''&&x.obj[k]!==undefined)&&(includeVoided||String(x.obj.voided)!=='true'));
}

function findRow_(name,id) {
  const all=rows_(name);
  for(let i=0;i<all.length;i++) if(String(all[i].obj.id)===String(id)) return all[i];
  return null;
}

// Write by header name, not physical column order. Older deployments may have
// appended newer columns at the end of a sheet, so positional writes can update
// the wrong fields while still returning success.
function updateRow_(name,row,values) {
  const sh=sheet_(name);
  const canonical=HEADERS[name]||[];
  let headers=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getDisplayValues()[0].map(h=>String(h||'').trim());
  values.forEach((value,index)=>{
    const header=canonical[index];
    if(!header) return;
    let col=headers.indexOf(header);
    if(col<0){
      col=sh.getLastColumn();
      sh.getRange(1,col+1).setValue(header);
      headers.push(header);
    }
    sh.getRange(row,col+1).setValue(value);
  });
}

function softDeleteBySource_(name,id) {
  const hit=findRow_(name,id);
  if(hit) {
    const r=hit.obj;
    assertEditable_(name,r);voidRecord_(name,hit.row);
  }
}

function softDeleteTransaction_(sourceId,sourceType) {
  rows_('Transactions').forEach(x=>{
    if(String(x.obj.source_id)===String(sourceId)&&(sourceType==='expense'?x.obj.kind==='expense':['payment','debt'].indexOf(x.obj.kind)>=0)) {
      const r=x.obj;
      assertEditable_('Transactions',r);voidRecord_('Transactions',x.row);
    }
  });
}

function parseBody_(e) {
  if(!e || !e.postData || !e.postData.contents) return {};
  try { return JSON.parse(e.postData.contents); }
  catch(_) { return e.parameter || {}; }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sha256_(s) {
  const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s),Utilities.Charset.UTF_8);
  return bytes.map(b=>('0'+(b&0xff).toString(16)).slice(-2)).join('');
}

function now_() {
  return Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd HH:mm:ss');
}

function date_(v) {
  if(v instanceof Date)return Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd');
  const s=String(v||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw new Error('تاریخ معتبر به صورت YYYY-MM-DD الزامی است.');
  const d=new Date(s+'T12:00:00Z');
  if(isNaN(d.getTime())||d.toISOString().slice(0,10)!==s)throw new Error('روز/ماه تاریخ معتبر نیست.');
  return s;
}

function amount_(v) {
  const s=String(v==null?'':v).replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[,٬\s]/g,'');
  if(!/^\d+$/.test(s))throw new Error('مبلغ باید عدد صحیح و مثبت باشد.');
  const n=Number(s);
  if(!Number.isSafeInteger(n)||n<=0)throw new Error('مبلغ نامعتبر است.');
  return n;
}

function digits_(s) {
  return String(s)
    .replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
    .replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))
    .replace(/[^\d]/g,'');
}

function schoolName_(id) {
  const hit=findRow_('Schools',id);
  return hit ? String(hit.obj.name) : String(id);
}

function csvEscape_(v) {
  const s=String(v==null?'':v);
  return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
