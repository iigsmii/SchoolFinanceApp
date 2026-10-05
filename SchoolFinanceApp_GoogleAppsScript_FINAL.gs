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
  SESSION_HOURS: 8,
  SHEETS: [
    'Managers','Schools','Students','Tuition','Expenses','Transactions',
    'Bank','BankAccounts','ExpenseCategories','Messages','Attachments','ParsianAccounts','Settings','ActivityLogs'
  ]
};

const HEADERS = {
  Managers: ['id','name','username','password','school_id','role','active','created_at'],
  Schools: ['id','name','code','active','created_at','moeen_code'],
  Students: ['id','name','grade','phone','national_id','school_id','kol_code','moeen_code','tafsili_code','active','created_at'],
  Tuition: ['id','date','student_id','school_id','type','amount','description','tracking_code','image_url','created_by','created_at','reconciled','approved'],
  Expenses: ['id','date','school_id','category','amount','description','tracking_code','image_url','created_by','created_at','reconciled','approved','payment_source','payment_account'],
  Transactions: ['id','date','school_id','kind','amount','description','tracking_code','image_url','created_by','created_at','reconciled','approved','source_id','payment_source','payment_account'],
  Bank: ['id','date','school_id','amount','description','tracking_code','bank_account','created_at','matched_transaction_id','matched','approved'],
  BankAccounts: ['id','school_id','name','account_number','active','created_at'],
  ExpenseCategories: ['id','name','active','created_at'],
  Messages: ['id','message','created_by','created_at','active'],
  Attachments: ['id','source_type','source_id','file_name','mime_type','drive_file_id','url','created_by','created_at'],
  ParsianAccounts: ['id','account_name','account_code','school_id','category','active'],
  Settings: ['key','value','updated_at'],
  ActivityLogs: ['id','date','user_id','username','user_name','role','school_id','action','entity_type','entity_id','description','details']
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

const ATTACHED_MANAGERS = [
  {
    "name": "محمدرضا آقاسی",
    "username": "محمدرضا آقاسی",
    "password_hash": "81926c93fd1a4a8b6a94e6fd62bde8d14695d609358910faf8f87ba4c174efe6",
    "school_id": 1,
    "source_center": "نور 1"
  },
  {
    "name": "محمد عربی",
    "username": "محمد عربی",
    "password_hash": "b608cbd77863c5cf775c8ba9d8e4ae603ef14e9985bf9d7e886fc153d0517312",
    "school_id": 2,
    "source_center": "نور 2"
  },
  {
    "name": "آرزو میرزایی",
    "username": "آرزو میرزایی",
    "password_hash": "346dc9a9cdadb637d10492b264be914c5a45490f96f258f61acf3e407eecafb0",
    "school_id": 3,
    "source_center": "تبیان 1"
  },
  {
    "name": "فریبا سبزواری",
    "username": "فریبا سبزواری",
    "password_hash": "50de9b33189ecf51452048e277bd300ecd5084309a7241fdc27b0a8fc6165e66",
    "school_id": 4,
    "source_center": "تبیان 2"
  },
  {
    "name": "ام البنین صدری",
    "username": "ام البنین صدری",
    "password_hash": "36a62f5ba7beda8657cbe6c891e2cc2876b71c64d82832c67e39e0df2afb2f95",
    "school_id": 5,
    "source_center": "مهد مرکزی صبح"
  },
  {
    "name": "مریم سروری",
    "username": "مریم سروری",
    "password_hash": "f06d3fc0ec735ebc7d257448dd20904ed8393a89ed549ee45003032603fc2a62",
    "school_id": 6,
    "source_center": "مهد مرکزی عصر"
  },
  {
    "name": "زهرا گلزار",
    "username": "زهرا گلزار",
    "password_hash": "4c72722c35406acc6987ff669b89d2725ad3c83b786ee12871f5b3ef98869f0c",
    "school_id": 7,
    "source_center": "مهد ابراهیم خلیل"
  },
  {
    "name": "خدیجه عمرانپور",
    "username": "خدیجه عمرانپور",
    "password_hash": "a13514ea36daf730b8c24ca223a07600774ac9bb701ac82d90f6ddc30a2d9f39",
    "school_id": 8,
    "source_center": "مهد سروستان"
  },
  {
    "name": "آرزو طالب پور",
    "username": "آرزو طالب پور",
    "password_hash": "4f12aab72444972af28afc9e3ce610ecbb032fa6ca6cd141206e7d9ec3a8ca7e",
    "school_id": null,
    "source_center": "مهد تبیان 2"
  },
  {
    "name": "زهرا ستاری",
    "username": "زهرا ستاری",
    "password_hash": "7d950570e385db54ffe244da88abd510c54e65b10047ce69334926de81c6333a",
    "school_id": 9,
    "source_center": "مهد منظریه"
  },
  {
    "name": "سیدمحمدرضا گلزاری",
    "username": "گلزاری",
    "password_hash": "dbe501ef6880a80e99f04131108ae7285daebac0dad9f3e5b7d94c50821784f4",
    "school_id": null,
    "source_center": "تن خواه گردان"
  },
  {
    "name": "عبدالعلی بوانی",
    "username": "بوانی",
    "password_hash": "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",
    "school_id": null,
    "source_center": ""
  },
  {
    "name": "علی هاشمیان",
    "username": "هاشمیان",
    "password_hash": "205ee5f9d6edf37ed1740c9ed4c2e8be3ababec39885c42cc06eb1ae4b2047a9",
    "school_id": null,
    "source_center": ""
  },
  {
    "name": "ذبیح الله کرمانپور",
    "username": "کرمانپور",
    "password_hash": "4bbc45cb2c3a0be615a35f2af8350174d495dd08645b6d0d668fcec65deb692e",
    "school_id": null,
    "source_center": ""
  }
];

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
      const existingHeaders=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(x=>String(x||'').trim());
      h.forEach((header,idx)=>{ if(existingHeaders.indexOf(header)<0) sh.getRange(1,sh.getLastColumn()+1).setValue(header); });
    }
    sh.setFrozenRows(1);
  });

  // Add missing canonical schools without touching existing rows.
  const schools = sheet_('Schools');
  const existingSchools = {};
  rows_('Schools').forEach(x => { existingSchools[String(x.obj.id)] = x.obj; });
  SCHOOLS.forEach(x => {
    if (!existingSchools[String(x[0])]) {
      schools.appendRow([x[0],x[1],x[2],x[3],now_(),'']);
    } else {
      const hit=findRow_('Schools',x[0]);
      if (hit && String(x[0])==='10') {
        updateRow_('Schools',hit.row,[x[0],x[1],x[2],x[3],hit.obj.created_at||now_()]);
      }
    }
  });

  const ba = sheet_('BankAccounts');
  if(ba) {
    const existingBA={}; rows_('BankAccounts').forEach(x=>existingBA[String(x.obj.name||'').trim()]=true);
    [
      ['بانک ملی',''],['بانک صادرات',''],['بانک ملت',''],['بانک تجارت',''],['بانک رفاه',''],['بانک سامان','']
    ].forEach(x=>{ if(!existingBA[x[0]]) ba.appendRow([nextId_('BankAccounts'),'',x[0],x[1],true,now_()]); });
  }

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
    managers.appendRow([1,'مدیر ارشد','admin',sha256_('Admin@123456'),'','senior',true,now_()]);
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
  [['schoolfinance_version','2.12-expense-bank-statement-nid-fix'],['bank_account_code','0-1-11'],['currency','IRR']].forEach(x=>{
    if(!settingKeys[x[0]]) settings.appendRow([x[0],x[1],now_()]);
  });

  SpreadsheetApp.flush();
  return {success:true,message:'Setup completed safely',school_added:'مهد برهان',manager_synced:'آرزو طالب پور'};
}

function findManagerByUsername_(username) {
  const rows=rows_('Managers');
  for(let i=0;i<rows.length;i++) if(String(rows[i].obj.username||'').trim()===String(username).trim()) return rows[i];
  return null;
}

function doGet(e) {
  try {
    ensureStructure_();
    ensureCoreData_();
    const params=(e&&e.parameter)||{};
    const action=String(params.action||'').replace(/^\/+|\/+$/g,'').toLowerCase();
    const b={};
    Object.keys(params).forEach(k=>{if(k!=='action') b[k]=params[k];});
    if(action==='parsian_export') return json_(parsianExport_(b));
    if(action==='categories' || action==='expense_categories' || action==='expense-categories') return json_(categories_(b));
    if(action==='transactions') return json_(transactions_(b));
    if(action==='students'){ return json_(students_(b)); }
    if(action==='schools') return json_(schools_(b));
    if(action==='managers') return json_(managers_(b));
    if(action==='expenses') return json_(expenses_(b));
    if(action==='tuition') return json_(tuition_(b));
    if(action==='messages') return json_(messages_(b));
    if(action==='bank_review') return json_(bankReview_(b));
    if(action==='bank_accounts') return json_(bankAccounts_(b));
    if(action==='parsian_school_map') return json_(parsianSchoolMap_(b));
    if(action==='parsian_student_accounts') return json_(parsianStudentAccounts_(b));
    if(action==='summary') return json_(summary_(b));
    if(action==='activity_logs'){ ensureStructure_(); return json_(activityLogs_(b)); }
    if(action==='attachment_view') return json_(attachmentView_(b));
    return json_({success:true,service:'SchoolFinanceApp Google Backend',version:'2.12-expense-bank-statement-nid-fix',time:now_()});
  } catch(err) { return json_({success:false,error:String(err.message||err)}); }
}

function ensureStructure_() {
  const cache=CacheService.getScriptCache();
  const ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
  if(cache.get('structure_ready_v23')==='1' && ss.getSheetByName('ActivityLogs')) return;
  CFG.SHEETS.forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const h = HEADERS[name];
    if (sh.getLastRow() === 0) sh.getRange(1,1,1,h.length).setValues([h]);
    else {
      const existingHeaders=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(x=>String(x||'').trim());
      h.forEach((header,idx)=>{ if(existingHeaders.indexOf(header)<0) sh.getRange(1,sh.getLastColumn()+1).setValue(header); });
    }
    sh.setFrozenRows(1);
  });
  cache.put('structure_ready_v23','1',300);
}

function doPost(e) {
  try {
    ensureStructure_();
    ensureCoreData_();
    const body = parseBody_(e);
    let action = String(body.action || body.endpoint || '').replace(/^\/+/, '').toLowerCase();
    const actionAliases = {'students/import':'students_import','api/students/import':'students_import','student_import':'students_import','api/student/import':'students_import','expense_categories':'categories','expense-categories':'categories','api/expense-categories':'categories','api/expense_categories':'categories'};
    action = actionAliases[action] || action;
    let result;
    switch(action) {
      case 'login': result=login_(body); break;
      case 'logout': result=logout_(body); break;
      case 'schools': result=schools_(body); break;
      case 'school_add': result=schoolAdd_(body); break;
      case 'school_update': result=schoolUpdate_(body); break;
      case 'school_delete': result=schoolDelete_(body); break;
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
      case 'transaction_delete': result=transactionDelete_(body); break;
      case 'bank': result=bank_(body); break;
      case 'bank_accounts': result=bankAccounts_(body); break;
      case 'bank_review': result=bankReview_(body); break;
      case 'bank_match': result=bankMatch_(body); break;
      case 'bank_reconcile': result=bankReconcile_(body); break;
      case 'bank_upload': result=bankUpload_(body); break;
      case 'transaction_review': result=transactionReview_(body); break;
      case 'categories': result=categories_(body); break;
      case 'category_add': result=categoryAdd_(body); break;
      case 'category_update': result=categoryUpdate_(body); break;
      case 'category_delete': result=categoryDelete_(body); break;
      case 'messages': result=messages_(body); break;
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
      case 'health': result={success:true}; break;
      default: result={success:false,error:'Unknown action',action:action,backend_version:'2026-10-05-v2.12-expense-bank-statement-nid-fix'};
    }
    // Audit successful write/actions without storing passwords, base64 files, or raw request bodies.
    if(result && result.success && action!=='activity_logs' && action!=='summary' && action!=='students' && action!=='tuition' && action!=='expenses' && action!=='transactions' && action!=='bank_review' && action!=='schools' && action!=='managers' && action!=='categories' && action!=='messages' && action!=='parsian_school_map' && action!=='parsian_student_accounts') {
      try { auditAfterAction_(action, body, result); } catch(_) {}
    }
    return json_(result);
  } catch(err) {
    return json_({success:false,error:'Server error',message:String(err.message || err)});
  }
}

/* ---------- AUTH ---------- */

function login_(b) {
  const username = String(b.username || '').trim();
  const password = String(b.password || '');
  if (!username || !password) return {success:false,error:'نام کاربری و رمز عبور الزامی است.'};

  const rows = rows_('Managers');
  for (let i=0;i<rows.length;i++) {
    const r=rows[i].obj;
    if (String(r.username)===username && String(r.active)!=='false') {
      if (String(r.password) !== sha256_(password)) {
        return {success:false,error:'نام کاربری یا رمز عبور اشتباه است.'};
      }
      const token = Utilities.getUuid()+'-'+Utilities.getUuid();
      CacheService.getScriptCache().put('sess_'+token, JSON.stringify({
        id:r.id,name:r.name,username:r.username,school_id:r.school_id,role:(String(r.role)==='senior'?'admin':r.role)
      }), CFG.SESSION_HOURS*3600);
      const user={id:r.id,name:r.name,username:r.username,school_id:r.school_id,role:(String(r.role)==='senior'?'admin':r.role)};
      try { sheet_('ActivityLogs').appendRow([nextId_('ActivityLogs'),now_(),user.id,user.username,user.name,user.role,user.school_id,'login','system','','ورود به سامانه','']); } catch(_) {}
      return {success:true,token:token,user:user};
    }
  }
  return {success:false,error:'نام کاربری یا رمز عبور اشتباه است.'};
}

function logout_(b) {
  let u=null; try {u=auth_(b);} catch(_) {}
  if (b.token) CacheService.getScriptCache().remove('sess_'+String(b.token));
  if(u) try { sheet_('ActivityLogs').appendRow([nextId_('ActivityLogs'),now_(),u.id,u.username||'',u.name||'',u.role||'',u.school_id||'','logout','system','','خروج از سامانه','']); } catch(_) {}
  return {success:true};
}

function auth_(b, roles) {
  const token=String(b.token||'');
  if(!token) throw new Error('نشست کاربر معتبر نیست.');
  const raw=CacheService.getScriptCache().get('sess_'+token);
  if(!raw) throw new Error('نشست منقضی شده است. دوباره وارد شوید.');
  const u=JSON.parse(raw);
  if (roles && roles.length && roles.indexOf(u.role)<0) throw new Error('دسترسی مجاز نیست.');
  return u;
}

/* ---------- CORE SEED SAFETY ---------- */
function ensureCoreData_() {
  const cache=CacheService.getScriptCache();
  if(cache.get('core_ready_v23')==='1') return;
  // Keep the backend self-healing: every API call makes sure the canonical
  // schools, managers and expense categories exist, without deleting data.
  const schools = sheet_('Schools');
  const existingSchools = {};
  rows_('Schools').forEach(x => existingSchools[String(x.obj.id)] = x.obj);
  SCHOOLS.forEach(x => {
    if (!existingSchools[String(x[0])]) schools.appendRow([x[0],x[1],x[2],x[3],now_(),'']);
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
  if (!existingManagers['admin']) managers.appendRow([1,'مدیر ارشد','admin',sha256_('Admin@123456'),'','senior',true,now_()]);
  ATTACHED_MANAGERS.forEach(m => {
    const u=String(m.username||'').trim(); if(!u) return;
    const hit=findManagerByUsername_(u);
    if(!hit) managers.appendRow([nextId_('Managers'),String(m.name||''),u,String(m.password_hash||''),m.school_id==null?'':String(m.school_id),'manager',true,now_()]);
    else if(u==='آرزو طالب پور' && String(hit.obj.school_id||'')!=='10') updateRow_('Managers',hit.row,[hit.obj.id,hit.obj.name,hit.obj.username,hit.obj.password,'10',hit.obj.role||'manager',hit.obj.active,hit.obj.created_at]);
  });
  // Rebuild Parsian codes for existing students from the canonical rules: 67 / school moeen / national ID.
  try {
    const seenInvalid={};
    rows_('Students').forEach(x=>{
      const r=x.obj; const nid=digits_(r.national_id||'');
      if(String(r.active)!=='false' && !/^\d{10}$/.test(nid)){
        const key=String(r.school_id)+'|'+String(r.name||'').trim().toLowerCase()+'|'+nid;
        if(seenInvalid[key]) { sheet_('Students').getRange(x.row,10).setValue(false); return; }
        seenInvalid[key]=true;
      }
      const codes=studentAccountCodes_(r.id,r.grade,r.national_id,r.school_id);
      if(String(r.kol_code||'')!==codes.kol || String(r.moeen_code||'')!==codes.moeen || String(r.tafsili_code||'')!==codes.tafsili){
        updateRow_('Students',x.row,[r.id,r.name,r.grade,r.phone,r.national_id,r.school_id,codes.kol,codes.moeen,codes.tafsili,r.active,r.created_at]);
      }
    });
  } catch(_) {}
  cache.put('core_ready_v23','1',300);
}

/* ---------- SCHOOLS ---------- */

function schools_(b) {
  const u=auth_(b);
  ensureCoreData_();
  const data=rows_('Schools').map(x=>x.obj).filter(x=>String(x.active)!=='false');
  if(u.role!=='senior' && u.role!=='admin') return {success:true,data:data.filter(x=>String(x.id)===String(u.school_id))};
  return {success:true,data:data};
}

function schoolAdd_(b){ auth_(b,['senior','admin']); const id=nextId_('Schools'); sheet_('Schools').appendRow([id,String(b.name||''),String(b.code||''),b.active!==false,now_(),String(b.moeen_code||'')]); return {success:true,id:id}; }
function schoolUpdate_(b){ auth_(b,['senior','admin']); const hit=findRow_('Schools',b.id); if(!hit) throw new Error('مدرسه یافت نشد.'); const r=hit.obj; updateRow_('Schools',hit.row,[r.id,b.name!==undefined?b.name:r.name,b.code!==undefined?b.code:r.code,b.active!==undefined?b.active:r.active,r.created_at,b.moeen_code!==undefined?b.moeen_code:(r.moeen_code||'')]); return {success:true}; }
function schoolDelete_(b){ auth_(b,['senior','admin']); const hit=findRow_('Schools',b.id); if(!hit) throw new Error('مدرسه یافت نشد.'); sheet_('Schools').getRange(hit.row,4).setValue(false); return {success:true}; }

/* ---------- STUDENTS ---------- */

function students_(b) {
  const u=auth_(b);
  let data=rows_('Students').map(x=>x.obj).filter(x=>String(x.active)!=='false');
  if(u.role!=='senior') data=data.filter(x=>String(x.school_id)===String(u.school_id));
  if(b.school_id) data=data.filter(x=>String(x.school_id)===String(b.school_id));
  if(b.id) data=data.filter(x=>String(x.id)===String(b.id));
  if(b.q) {
    const q=String(b.q).toLowerCase();
    data=data.filter(x=>String(x.name).toLowerCase().indexOf(q)>=0 || String(x.national_id).indexOf(q)>=0);
  }
  return {success:true,data:data};
}

function studentAdd_(b) {
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const u=auth_(b);
  ensureCoreData_();
  const schoolId=(u.role==='senior' || u.role==='admin') ? b.school_id : u.school_id;
  if(!schoolId) throw new Error('مدرسه مشخص نشده است.');
  const nid=digits_(b.national_id);
  if(!/^\d{10}$/.test(nid)) throw new Error('کد ملی باید دقیقاً ۱۰ رقم انگلیسی باشد.');
  const phone=digits_(b.phone);
  if(phone && !/^0\d{10}$/.test(phone)) throw new Error('شماره تلفن باید ۱۱ رقم و با ۰ شروع شود.');
  const duplicate=rows_('Students').some(x=>digits_(x.obj.national_id||'')===nid);
  if(duplicate) throw new Error('این کد ملی قبلاً در سیستم برای یک دانش‌آموز ثبت شده است و در هیچ مدرسه دیگری نیز قابل ثبت نیست.');
  const id=nextId_('Students');
  const grade=normalizeGrade_(b.grade||'');
  const codes=studentAccountCodes_(id,grade,nid,schoolId);
  sheet_('Students').appendRow([
    id,String(b.name||'').trim(),grade,phone,nid,String(schoolId),
    codes.kol,codes.moeen,codes.tafsili,true,now_()
  ]);
  return {success:true,id:id};
  } finally {
    lock.releaseLock();
  }
}

function studentsImport_(b) {
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const u=auth_(b);
    ensureCoreData_();
    const schoolId=(u.role==='senior' || u.role==='admin') ? String(b.school_id||'') : String(u.school_id||'');
    if(!schoolId) throw new Error('مدرسه برای ورود دانش‌آموزان مشخص نشده است.');
    if(!b.base64) throw new Error('فایل Excel ارسال نشده است.');

    const imported=readStudentXlsx_(b.base64);
    if(!imported.length) throw new Error('هیچ دانش‌آموز قابل خواندن از فایل Excel پیدا نشد.');

    let added=0, skipped=0, invalid=0;
    let validNid=0, invalidNid=0, validGrade=0, invalidGrade=0, missingName=0;
    const gradeCounts={};
    const gradeSamples=[];
    const reasons=[];
    const invalidStudents=[];
    const existing=rows_('Students').map(x=>x.obj);
    const seen={};

    imported.forEach((r,idx)=>{
      const rowNo=Number(r.row_number||idx+1);
      const first=String(r.first_name||'').trim();
      const last=String(r.last_name||'').trim();
      const name=String(r.name||[first,last].filter(Boolean).join(' ')).replace(/\s+/g,' ').trim();
      const nid=digits_(r.national_id||'');
      const grade=normalizeGrade_(r.grade||'');
      const rowErrors=[];
      if(name){} else { missingName++; }
      const rawGrade=String(r.grade||'').trim();
      if(rawGrade && gradeSamples.length<12) gradeSamples.push({row:rowNo,raw:rawGrade,normalized:grade});
      if(grade) { validGrade++; gradeCounts[grade]=(gradeCounts[grade]||0)+1; } else { invalidGrade++; }

      if(!name) { rowErrors.push('نام خالی'); }
      if(!grade) { rowErrors.push('پایه/کلاس نامعتبر یا خالی'); }

      // Invalid national IDs are retained once so repeated Excel imports do not clone the same student.
      const importKey=String(schoolId)+'|'+name.toLowerCase()+'|'+nid;
      const alreadyImportedInvalid=existing.some(x=>String(x.school_id)===String(schoolId) && String(x.name||'').trim().toLowerCase()===name.toLowerCase() && digits_(x.national_id||'')===nid);
      if(!/^\d{10}$/.test(nid)) {
        if(alreadyImportedInvalid) { skipped++; reasons.push('ردیف '+rowNo+' — '+name+' — دانش‌آموز نامعتبر قبلاً وارد شده است'); return; }
        invalidNid++;
        rowErrors.push('کد ملی نامعتبر ('+(nid ? nid.length+' رقمی' : 'خالی')+')');
      } else if(seen[nid] || existing.some(x=>digits_(x.national_id||'')===nid)) {
        skipped++;
        reasons.push('ردیف '+rowNo+' — '+name+' — کد ملی تکراری');
        return;
      } else {
        validNid++;
      }

      if(!name) {
        invalid++;
        reasons.push('ردیف '+rowNo+' — نام خالی — دانش‌آموز ساخته نشد');
        return;
      }

      // Keep a row even when its national ID or grade needs correction.
      // The result reports the exact problem so the manager can edit it afterwards.
      const storedGrade=grade || String(r.grade||'').trim() || 'نیازمند اصلاح';
      const id=nextId_('Students');
      const codes=studentAccountCodes_(id,storedGrade,nid,schoolId);
      sheet_('Students').appendRow([
        id,name,storedGrade,digits_(r.phone||''),nid,schoolId,
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

function schoolMoeenCode_(schoolId){
  const hit=findRow_('Schools',schoolId);
  if(hit && hit.obj.moeen_code!==undefined && String(hit.obj.moeen_code||'').trim()) return String(hit.obj.moeen_code).trim();
  const setting=rows_('Settings').find(x=>String(x.obj.key||'')==='school_moeen_'+String(schoolId));
  return setting?String(setting.obj.value||'').trim():'';
}
function studentAccountCodes_(studentId,grade,nationalId,schoolId){
  return {kol:'67',moeen:schoolMoeenCode_(schoolId),tafsili:String(nationalId||'').trim()};
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
  const map={
    'مهد':'مهد','مهدکودک':'مهد','مهدکودکی':'مهد',
    'پیشدبستانی':'مهد','پیشدبستان':'مهد','پیشدبستانی۱':'مهد','پیشدبستانی۲':'مهد',
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
  const phoneCol=map['شمارهدی']||map['شمارهتلفن']||map['موبایل']||map['شمارهتماس'];
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
    out.push({
      first_name:first,
      last_name:last,
      name:name,
      national_id:digits_(r[nidCol]||''),
      phone:phoneCol?digits_(r[phoneCol]||''):'',
      grade:gradeCol?String(r[gradeCol]||'').trim():'',
      birth_date:birthCol?String(r[birthCol]||'').trim():'',
      row_number:i+1
    });
  }
  return out;
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
  const amountCol=map['مبلغ']||map['amount']||map['مبلغ تراکنش']; const dateCol=map['تاریخ']||map['date']; const descCol=map['شرح']||map['description']; const trackCol=map['شماره پیگیری']||map['tracking_code']||map['پیگیری'];
  if(!amountCol) throw new Error('ستون مبلغ در فایل بانک پیدا نشد.');
  let added=0,skipped=0; const sh=sheet_('Bank');
  for(let i=1;i<out.length;i++){const r=out[i];const amount=Number(String(r[amountCol]||'').replace(/,/g,''));if(!amount){skipped++;continue;}const track=String(r[trackCol]||'');const dup=rows_('Bank').some(x=>Number(x.obj.amount)===amount&&String(x.obj.tracking_code||'')===track&&String(x.obj.school_id||'')===String(schoolId||''));if(dup){skipped++;continue;}sh.appendRow([nextId_('Bank'),String(r[dateCol]||''),String(schoolId||''),amount,String(r[descCol]||''),track,'',now_(),'','false','false']);added++;}
  return {added:added,skipped:skipped};
}
function importBankCsv_(base64,schoolId){ return {added:0,skipped:0}; }

function studentUpdate_(b) {
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const u=auth_(b);
    const hit=findRow_('Students',b.id);
    if(!hit) throw new Error('دانش‌آموز یافت نشد.');
    const old=hit.obj;
    if(u.role!=='senior' && String(old.school_id)!==String(u.school_id)) throw new Error('دسترسی مجاز نیست.');
    const targetSchool=(u.role==='senior' || u.role==='admin') ? String(b.school_id!==undefined?b.school_id:old.school_id) : String(u.school_id);
    const targetNid=digits_(b.national_id!==undefined?b.national_id:old.national_id);
    if(!/^\d{10}$/.test(targetNid)) throw new Error('کد ملی باید دقیقاً ۱۰ رقم انگلیسی باشد.');
    const duplicate=rows_('Students').some(x=>String(x.obj.id)!==String(old.id) && digits_(x.obj.national_id||'')===targetNid);
    if(duplicate) throw new Error('این کد ملی قبلاً در سیستم برای یک دانش‌آموز ثبت شده است و در هیچ مدرسه دیگری نیز قابل ثبت نیست.');
    const phone=digits_(b.phone!==undefined?b.phone:old.phone);
    if(phone && !/^0\d{10}$/.test(phone)) throw new Error('شماره تلفن نامعتبر است.');
    const grade=normalizeGrade_(b.grade!==undefined?b.grade:old.grade);
    const codes=studentAccountCodes_(old.id,grade,targetNid,targetSchool);
    updateRow_('Students',hit.row,[
      old.id,b.name!==undefined?b.name:old.name,grade,
      phone,targetNid,targetSchool,codes.kol,codes.moeen,codes.tafsili,
      old.active,old.created_at
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
  const type=String(b.type||'payment');
  const amount=amount_(b.amount);
  if(amount<=0) throw new Error('مبلغ نامعتبر است.');
  if(type==='payment' && !String(b.tracking_code||'').trim()) throw new Error('شماره پیگیری الزامی است.');
  const image=saveAttachmentIfAny_(b,'tuition',Utilities.getUuid(),u.id);
  const id=nextId_('Tuition');
  sheet_('Tuition').appendRow([
    id,date_(b.date),String(b.student_id),String(schoolId),type,amount,
    String(b.description||''),String(b.tracking_code||''),image.url||'',
    u.id,now_(),false,false
  ]);
  // Every tuition record also becomes a transaction.
  sheet_('Transactions').appendRow([
    nextId_('Transactions'),date_(b.date),String(schoolId),type,amount,
    String(b.description||''),String(b.tracking_code||''),image.url||'',
    u.id,now_(),false,false,id
  ]);
  return {success:true,id:id,image_url:image.url||''};
}


function tuitionBulkDebt_(b) {
  const lock=LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const u=auth_(b);
    const schoolId=(u.role==='senior' || u.role==='admin') ? String(b.school_id||'') : String(u.school_id||'');
    if(!schoolId) throw new Error('مدرسه مشخص نشده است.');
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
    if(selected.length!==ids.length && u.role!=='senior' && u.role!=='admin') throw new Error('یک یا چند دانش‌آموز متعلق به مدرسه شما نیستند.');
    if(!selected.length) throw new Error('دانش‌آموز انتخاب‌شده‌ای در این مدرسه پیدا نشد.');
    let added=0;
    const tuition=sheet_('Tuition');
    const tx=sheet_('Transactions');
    let nextTuition=nextId_('Tuition');
    let nextTx=nextId_('Transactions');
    selected.forEach(s=>{
      tuition.appendRow([nextTuition++,date,String(s.id),String(schoolId),'debt',amount,description,'','',u.id,now_(),false,false]);
      tx.appendRow([nextTx++,date,String(schoolId),'debt',amount,description,'','',u.id,now_(),false,false,nextTuition-1]);
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
  const amount=b.amount!==undefined?amount_(b.amount):Number(r.amount);
  if(String(r.type)==='payment' && String(b.tracking_code!==undefined?b.tracking_code:r.tracking_code).trim()==='') throw new Error('شماره پیگیری الزامی است.');
  updateRow_('Tuition',hit.row,[
    r.id,b.date!==undefined?date_(b.date):r.date,r.student_id,r.school_id,r.type,
    amount,b.description!==undefined?b.description:r.description,
    b.tracking_code!==undefined?b.tracking_code:r.tracking_code,r.image_url,
    r.created_by,r.created_at,r.reconciled,r.approved
  ]);
  return {success:true};
}

function tuitionDelete_(b) {
  const u=auth_(b);
  const hit=findRow_('Tuition',b.id);
  if(!hit) throw new Error('رکورد شهریه یافت نشد.');
  if(u.role!=='senior' && String(hit.obj.created_by)!==String(u.id)) throw new Error('فقط ثبت‌کننده یا مدیر ارشد می‌تواند حذف کند.');
  softDeleteBySource_('Tuition',b.id);
  softDeleteTransaction_(b.id);
  return {success:true};
}

/* ---------- EXPENSES ---------- */

function expenses_(b) {
  const u=auth_(b);
  let data=rows_('Expenses').map(x=>x.obj).filter(x=>String(x.approved)!=='deleted');
  if(u.role!=='senior') data=data.filter(x=>String(x.school_id)===String(u.school_id));
  return {success:true,data:data.map(e=>{
    const o=Object.assign({},e);
    o.expense_category_name=e.category||'';
    o.attachment_url=e.image_url||'';
    const att=rows_('Attachments').find(a=>String(a.obj.source_type)==='expense'&&String(a.obj.source_id)===String(e.id));
    o.attachment_file_id=att?String(att.obj.drive_file_id||''):'';
    o.payment_source=e.payment_source||'';
    o.payment_account=e.payment_account||'';
    o.school_name=schoolName_(e.school_id);
    return o;
  })};
}

function bankAccounts_(b){
  const u=auth_(b);
  let data=rows_('BankAccounts').map(x=>x.obj).filter(x=>String(x.active)!=='false');
  if(u.role!=='senior' && u.role!=='admin') data=data.filter(x=>!x.school_id || String(x.school_id)===String(u.school_id));
  return {success:true,data:data};
}

function expenseAdd_(b) {
  const u=auth_(b);
  ensureCoreData_();
  const schoolId=(u.role==='senior' || u.role==='admin') ? String(b.school_id||'') : String(u.school_id||'');
  let category=String(b.category||'').trim();
  if(!category && b.category_id){ const cat=findRow_('ExpenseCategories',b.category_id); if(cat) category=String(cat.obj.name||'').trim(); }
  const amount=amount_(b.amount);
  if(!schoolId || !category || amount<=0) throw new Error('مدرسه، دسته هزینه و مبلغ الزامی است.');
  if(!String(b.tracking_code||'').trim()) throw new Error('شماره پیگیری الزامی است.');
  const source=String(b.payment_source||'').trim();
  if(!source) throw new Error('منبع پرداخت را انتخاب کنید.');
  const account=String(b.payment_account||'').trim();
  const id=nextId_('Expenses');
  const image=saveAttachmentIfAny_(b,'expense',id,u.id);
  sheet_('Expenses').appendRow([
    id,date_(b.date),String(schoolId),category,amount,String(b.description||''),
    String(b.tracking_code||''),image.url||'',u.id,now_(),false,false,source,account
  ]);
  sheet_('Transactions').appendRow([
    nextId_('Transactions'),date_(b.date),String(schoolId),'expense',amount,String(b.description||''),
    String(b.tracking_code||''),image.url||'',u.id,now_(),false,false,id,source,account
  ]);
  return {success:true,id:id,image_url:image.url||'',payment_source:source,payment_account:account};
}

function expenseUpdate_(b) {
  const u=auth_(b);
  const hit=findRow_('Expenses',b.id);
  if(!hit) throw new Error('هزینه یافت نشد.');
  if(u.role!=='senior' && String(hit.obj.created_by)!==String(u.id)) throw new Error('فقط ثبت‌کننده یا مدیر ارشد می‌تواند ویرایش کند.');
  const r=hit.obj;
  const tracking=b.tracking_code!==undefined?String(b.tracking_code):String(r.tracking_code);
  if(!tracking.trim()) throw new Error('شماره پیگیری الزامی است.');
  let newCategory=b.category!==undefined?String(b.category):String(r.category||'');
  if(!newCategory && b.category_id){ const cat=findRow_('ExpenseCategories',b.category_id); if(cat) newCategory=String(cat.obj.name||''); }
  const source=b.payment_source!==undefined?String(b.payment_source):String(r.payment_source||'');
  const account=b.payment_account!==undefined?String(b.payment_account):String(r.payment_account||'');
  let imageUrl=r.image_url||'';
  if(b.base64){ const saved=saveAttachment_(b.base64,b.file_name||('expense_'+r.id+'.jpg'),b.mime_type||'image/jpeg',Utilities.getUuid(),u.id,'expense',r.id); imageUrl=saved.url; }
  updateRow_('Expenses',hit.row,[
    r.id,b.date!==undefined?date_(b.date):r.date,r.school_id,newCategory,
    b.amount!==undefined?amount_(b.amount):Number(r.amount),b.description!==undefined?b.description:r.description,
    tracking,imageUrl,r.created_by,r.created_at,r.reconciled,r.approved,source,account
  ]);
  const tx=rows_('Transactions').map(x=>x).find(x=>String(x.obj.source_id)===String(r.id));
  if(tx){ const t=tx.obj; updateRow_('Transactions',tx.row,[t.id,b.date!==undefined?date_(b.date):t.date,t.school_id,t.kind,b.amount!==undefined?amount_(b.amount):t.amount,b.description!==undefined?b.description:t.description,tracking,imageUrl,t.created_by,t.created_at,t.reconciled,t.approved,t.source_id,source,account]); }
  return {success:true,image_url:imageUrl};
}

function expenseDelete_(b) {
  const u=auth_(b);
  const hit=findRow_('Expenses',b.id);
  if(!hit) throw new Error('هزینه یافت نشد.');
  if(u.role!=='senior' && String(hit.obj.created_by)!==String(u.id)) throw new Error('فقط ثبت‌کننده یا مدیر ارشد می‌تواند حذف کند.');
  softDeleteBySource_('Expenses',b.id);
  softDeleteTransaction_(b.id);
  return {success:true};
}

/* ---------- TRANSACTIONS ---------- */

function transactions_(b) {
  const u=auth_(b);
  let data=rows_('Transactions').map(x=>x.obj).filter(x=>String(x.approved)!=='deleted');
  if(u.role!=='senior') data=data.filter(x=>String(x.school_id)===String(u.school_id));
  if(b.student_id) data=data.filter(x=>{
    const hit=findRow_('Tuition',x.source_id); return String(hit&&hit.obj.student_id)===String(b.student_id);
  });
  if(b.kind_query) data=data.filter(x=>b.kind_query==='هزینه' ? String(x.kind)==='expense' : (b.kind_query==='شهریه' ? String(x.kind)==='payment' : String(x.kind)===b.kind_query));
  const students=rows_('Students').map(x=>x.obj); const tuition=rows_('Tuition').map(x=>x.obj); const expenses=rows_('Expenses').map(x=>x.obj); const attachments=rows_('Attachments').map(x=>x.obj);
  data=data.map(t=>{
    const out=Object.assign({},t); out.school_name=schoolName_(t.school_id); out.attachment_url=t.image_url||''; const att=attachments.find(a=>String(a.source_id)===String(t.source_id)&&String(a.source_type)==='expense') || attachments.find(a=>String(a.source_id)===String(t.source_id)&&String(a.source_type)==='tuition'); out.attachment_file_id=att?String(att.drive_file_id||''):'';
    out.payment_source=t.payment_source||''; out.payment_account=t.payment_account||'';
    if(String(t.kind)==='payment'||String(t.kind)==='debt') { const q=tuition.find(x=>String(x.id)===String(t.source_id)); if(q){out.student_id=q.student_id; const st=students.find(x=>String(x.id)===String(q.student_id)); if(st){out.student_name=st.name;out.student_grade=st.grade;out.student_national_id=st.national_id;out.student_phone=st.phone;}} }
    if(String(t.kind)==='expense') { const e=expenses.find(x=>String(x.id)===String(t.source_id)); if(e){out.expense_category_name=e.category;out.payment_source=e.payment_source||out.payment_source;out.payment_account=e.payment_account||out.payment_account;out.attachment_url=e.image_url||out.attachment_url;} }
    return out;
  });
  return {success:true,data:data};
}

/* ---------- BANK ---------- */

function bank_(b) {
  const u=auth_(b);
  let data=rows_('Bank').map(x=>x.obj);
  if(u.role!=='senior') data=data.filter(x=>String(x.school_id)===String(u.school_id));
  return {success:true,data:data};
}

function bankReview_(b) {
  const u=auth_(b,['senior','admin']);
  const banks=rows_('Bank').map(x=>x.obj);
  const tx=rows_('Transactions').map(x=>x.obj);
  const schools={}; rows_('Schools').forEach(x=>schools[String(x.obj.id)]=x.obj.name);
  const data=tx.map(t=>{
    const candidates=banks.filter(x=>Number(x.amount)===Number(t.amount) && String(x.school_id)===String(t.school_id));
    const hit=candidates.length?candidates[0]:null;
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
  const u=auth_(b,['senior','admin']);
  const hit=findRow_('Bank',b.id);
  if(!hit) throw new Error('تراکنش بانکی یافت نشد.');
  const transactionId=String(b.transaction_id||'');
  const tx=findRow_('Transactions',transactionId);
  if(!tx) throw new Error('تراکنش اپ یافت نشد.');
  const bankAmount=Number(hit.obj.amount);
  const txAmount=Number(tx.obj.amount);
  const matched=bankAmount===txAmount;
  updateRow_('Bank',hit.row,[
    hit.obj.id,hit.obj.date,hit.obj.school_id,hit.obj.amount,hit.obj.description,
    hit.obj.tracking_code,hit.obj.bank_account,hit.obj.created_at,transactionId,
    matched,true
  ]);
  updateRow_('Transactions',tx.row,[
    tx.obj.id,tx.obj.date,tx.obj.school_id,tx.obj.kind,tx.obj.amount,tx.obj.description,
    tx.obj.tracking_code,tx.obj.image_url,tx.obj.created_by,tx.obj.created_at,
    matched,true,tx.obj.source_id
  ]);
  return {success:true,matched:matched};
}

function transactionReview_(b){ const u=auth_(b,['senior','admin']); const hit=findRow_('Transactions',b.id); if(!hit) throw new Error('تراکنش یافت نشد.'); const r=hit.obj; const approved=String(b.status||'')==='approved'; updateRow_('Transactions',hit.row,[r.id,r.date,r.school_id,r.kind,r.amount,r.description,r.tracking_code,r.image_url,r.created_by,r.created_at,r.reconciled,approved,r.source_id]); return {success:true,approved:approved}; }
function bankReconcile_(b){
  auth_(b,['senior','admin']);
  const banks=rows_('Bank').map(x=>x.obj);
  const txRows=rows_('Transactions'); let matched=0,unmatched=0;
  txRows.forEach(x=>{
    const t=x.obj;
    const hit=banks.find(z=>Number(z.amount)===Number(t.amount) && String(z.school_id)===String(t.school_id));
    const ok=!!hit;
    if(ok){ matched++; updateRow_('Transactions',x.row,[t.id,t.date,t.school_id,t.kind,t.amount,t.description,t.tracking_code,t.image_url,t.created_by,t.created_at,true,t.approved,t.source_id]); }
    else { unmatched++; updateRow_('Transactions',x.row,[t.id,t.date,t.school_id,t.kind,t.amount,t.description,t.tracking_code,t.image_url,t.created_by,t.created_at,false,t.approved,t.source_id]); }
  });
  return {success:true,matched:matched,unmatched:unmatched};
}
function bankUpload_(b){
  auth_(b,['senior','admin']);
  if(!b.base64) throw new Error('فایل بانک ارسال نشده است.');
  const name=String(b.file_name||'bank_upload.xlsx').toLowerCase();
  let result={added:0,skipped:0};
  if(name.endsWith('.xlsx')) result=importBankXlsx_(b.base64,b.school_id||'');
  else result=importBankCsv_(b.base64,b.school_id||'');
  return {success:true,message:'فایل بانک وارد شد.',count:result.added,skipped:result.skipped};
}

function transactionDelete_(b){
  const u=auth_(b);
  const hit=findRow_('Transactions',b.id);
  if(!hit) throw new Error('تراکنش یافت نشد.');
  if(u.role!=='senior' && String(hit.obj.created_by)!==String(u.id)) throw new Error('فقط ثبت‌کننده یا مدیر ارشد می‌تواند حذف کند.');
  const r=hit.obj;
  updateRow_('Transactions',hit.row,[r.id,r.date,r.school_id,r.kind,r.amount,r.description,r.tracking_code,r.image_url,r.created_by,r.created_at,r.reconciled,'deleted',r.source_id,r.payment_source||'',r.payment_account||'']);
  if(String(r.source_id||'')){ const e=findRow_('Expenses',r.source_id); if(e) softDeleteBySource_('Expenses',r.source_id); const q=findRow_('Tuition',r.source_id); if(q) softDeleteBySource_('Tuition',r.source_id); }
  return {success:true};
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
  auth_(b);
  ensureCoreData_();
  return {success:true,data:rows_('Messages').map(x=>x.obj).filter(x=>String(x.active)!=='false').reverse()};
}

function messageAdd_(b) {
  const u=auth_(b,['senior','admin']);
  const msg=String(b.message||'').trim();
  if(!msg) throw new Error('پیام خالی است.');
  const id=Utilities.getUuid();
  sheet_('Messages').appendRow([id,msg,u.id,now_(),true]);
  return {success:true,id:id};
}

function messageDelete_(b) {
  auth_(b,['senior','admin']);
  const hit=findRow_('Messages',b.id);
  if(!hit) throw new Error('پیام یافت نشد.');
  sheet_('Messages').getRange(hit.row,5).setValue(false);
  return {success:true};
}

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
    String(b.school_id||''),String(b.role||'manager'),true,now_()
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
    b.role!==undefined?b.role:r.role,b.active!==undefined?b.active:r.active,r.created_at
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

function attachmentView_(b){
  const u=auth_(b);
  const fileId=String(b.file_id||'').trim();
  if(!fileId) throw new Error('شناسه تصویر ارسال نشده است.');
  const f=DriveApp.getFileById(fileId);
  const blob=f.getBlob();
  return {success:true,base64:Utilities.base64Encode(blob.getBytes()),mime_type:blob.getContentType(),file_name:f.getName()};
}

function attachment_(b) {
  const u=auth_(b);
  if(!b.base64) throw new Error('فایل ارسال نشده است.');
  const id=Utilities.getUuid();
  const saved=saveAttachment_(b.base64,b.file_name||('file_'+id+'.jpg'),b.mime_type||'image/jpeg',id,u.id,b.source_type||'general',b.source_id||'');
  return {success:true,url:saved.url,file_id:saved.file_id};
}

function saveAttachmentIfAny_(b,type,sourceId,userId) {
  if(!b.base64) return {url:'',file_id:''};
  return saveAttachment_(b.base64,b.file_name||('image_'+sourceId+'.jpg'),b.mime_type||'image/jpeg',sourceId,userId,type,sourceId);
}

function saveAttachment_(base64,fileName,mimeType,id,userId,sourceType,sourceId) {
  let clean=String(base64);
  if(clean.indexOf(',')>=0) clean=clean.substring(clean.indexOf(',')+1);
  const bytes=Utilities.base64Decode(clean);
  const blob=Utilities.newBlob(bytes,mimeType,fileName);
  const folder=getDriveFolder_();
  const file=folder.createFile(blob);
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
function parsianStudentAccounts_(b){ auth_(b); let data=rows_('Students').map(x=>x.obj).map(s=>({code:[s.kol_code||'67',s.moeen_code||'',s.tafsili_code||s.national_id||''].join('-'),name:s.name,id:s.id})); if(b.q){const q=String(b.q).toLowerCase();data=data.filter(x=>String(x.code).toLowerCase().includes(q)||String(x.name).toLowerCase().includes(q));} return {success:true,data:data}; }
function parsianAllocate_(b){ auth_(b); const nid=String(b.national_id||'').trim(); const mo=String(b.moeen||'').trim(); return {success:true,data:{code:'67-'+mo+'-'+nid,name:String(b.name||'حساب دانش‌آموز')}}; }

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
      const student=students[String(t.source_id)] || students[String(t.student_id)];
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
  ['id','school_id','amount','type','status','category_id','added','skipped','invalid','matched','unmatched'].forEach(k=>{if(b[k]!==undefined)safe[k]=b[k];});
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

/* ---------- SUMMARY ---------- */

function summary_(b) {
  const u=auth_(b);
  let students=rows_('Students').map(x=>x.obj).filter(x=>String(x.active)!=='false');
  let tuition=rows_('Tuition').map(x=>x.obj).filter(x=>String(x.approved)!=='deleted');
  let expenses=rows_('Expenses').map(x=>x.obj).filter(x=>String(x.approved)!=='deleted');
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
  let own=rows_('Transactions').map(x=>x.obj).filter(t=>String(t.payment_source||'')==='own' && String(t.approved)!=='deleted');
  if(u.role!=='senior') own=own.filter(t=>String(t.school_id)===String(u.school_id));
  const ownTotal=own.reduce((n,t)=>n+(Number(t.amount)||0),0);
  return {success:true,total_students:students.length,total_debt:totalDebt,expenses_by_category:byCat,own_claim_total:ownTotal,own_claim_transactions:own.slice(-100).reverse()};
}

/* ---------- HELPERS ---------- */

function nextId_(name){ const all=rows_(name); let max=0; all.forEach(x=>{const n=Number(x.obj.id);if(isFinite(n)&&n>max)max=n;}); return max+1; }

function sheet_(name) {
  return SpreadsheetApp.openById(CFG.SPREADSHEET_ID).getSheetByName(name);
}

function rows_(name) {
  const sh=sheet_(name);
  if(!sh || sh.getLastRow()<2) return [];
  const values=sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues();
  const headers=HEADERS[name];
  return values.map((v,i)=>{
    const obj={};
    headers.forEach((h,j)=>obj[h]=v[j]);
    return {row:i+2,obj:obj};
  });
}

function findRow_(name,id) {
  const all=rows_(name);
  for(let i=0;i<all.length;i++) if(String(all[i].obj.id)===String(id)) return all[i];
  return null;
}

function updateRow_(name,row,values) {
  sheet_(name).getRange(row,1,1,values.length).setValues([values]);
}

function softDeleteBySource_(name,id) {
  const hit=findRow_(name,id);
  if(hit) {
    const r=hit.obj;
    if(name==='Tuition') updateRow_(name,hit.row,[r.id,r.date,r.student_id,r.school_id,r.type,r.amount,r.description,r.tracking_code,r.image_url,r.created_by,r.created_at,r.reconciled,'deleted']);
    if(name==='Expenses') updateRow_(name,hit.row,[r.id,r.date,r.school_id,r.category,r.amount,r.description,r.tracking_code,r.image_url,r.created_by,r.created_at,r.reconciled,'deleted',r.payment_source||'',r.payment_account||'']);
  }
}

function softDeleteTransaction_(sourceId) {
  rows_('Transactions').forEach(x=>{
    if(String(x.obj.source_id)===String(sourceId)) {
      const r=x.obj;
      updateRow_('Transactions',x.row,[r.id,r.date,r.school_id,r.kind,r.amount,r.description,r.tracking_code,r.image_url,r.created_by,r.created_at,r.reconciled,'deleted',r.source_id,r.payment_source||'',r.payment_account||'']);
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
  return v ? String(v) : Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
}

function amount_(v) {
  const s=digits_(String(v||'')).replace(/,/g,'');
  const n=Number(s);
  if(!isFinite(n)) return 0;
  return Math.round(n);
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
