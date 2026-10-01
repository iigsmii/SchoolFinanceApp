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
    'Bank','ExpenseCategories','Messages','Attachments','ParsianAccounts','Settings'
  ]
};

const HEADERS = {
  Managers: ['id','name','username','password','school_id','role','active','created_at'],
  Schools: ['id','name','code','active','created_at'],
  Students: ['id','name','grade','phone','national_id','school_id','kol_code','moeen_code','tafsili_code','active','created_at'],
  Tuition: ['id','date','student_id','school_id','type','amount','description','tracking_code','image_url','created_by','created_at','reconciled','approved'],
  Expenses: ['id','date','school_id','category','amount','description','tracking_code','image_url','created_by','created_at','reconciled','approved'],
  Transactions: ['id','date','school_id','kind','amount','description','tracking_code','image_url','created_by','created_at','reconciled','approved','source_id'],
  Bank: ['id','date','school_id','amount','description','tracking_code','bank_account','created_at','matched_transaction_id','matched','approved'],
  ExpenseCategories: ['id','name','active','created_at'],
  Messages: ['id','message','created_by','created_at','active'],
  Attachments: ['id','source_type','source_id','file_name','mime_type','drive_file_id','url','created_by','created_at'],
  ParsianAccounts: ['id','account_name','account_code','school_id','category','active'],
  Settings: ['key','value','updated_at']
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
  [9,'مهد منظریه','MEHR5',true]
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
  CFG.SHEETS.forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.clear();
    const h = HEADERS[name];
    sh.getRange(1,1,1,h.length).setValues([h]);
    sh.setFrozenRows(1);
  });

  const schools = sheet_('Schools');
  schools.getRange(2,1,SCHOOLS.length,4).setValues(
    SCHOOLS.map(x => [x[0],x[1],x[2],x[3]])
  );
  schools.getRange(2,5,SCHOOLS.length,1).setValues(
    SCHOOLS.map(() => [now_()])
  );

  const cats = sheet_('ExpenseCategories');
  cats.getRange(2,1,DEFAULT_CATEGORIES.length,4).setValues(
    DEFAULT_CATEGORIES.map((x,i) => [i+1,x,true,now_()])
  );

  // Default senior manager. Change this password immediately.
  const managers = sheet_('Managers');
  managers.appendRow([1,'مدیر ارشد','admin',sha256_('Admin@123456'),'', 'senior', true, now_()]);

  const settings = sheet_('Settings');
  settings.getRange(2,1,3,3).setValues([
    ['schoolfinance_version','1.0-google',now_()],
    ['bank_account_code','0-1-11',now_()],
    ['currency','IRR',now_()]
  ]);

  SpreadsheetApp.flush();
  return {success:true,message:'Setup completed'};
}

function doGet(e) { try { const action=String((e&&e.parameter&&e.parameter.action)||'').toLowerCase(); if(action==='parsian_export') return json_(parsianExport_({token:String(e.parameter.token||'')})); return json_({success:true,service:'SchoolFinanceApp Google Backend',version:'1.1-google',time:now_()}); } catch(err) { return json_({success:false,error:String(err.message||err)}); } }

function doPost(e) {
  try {
    const body = parseBody_(e);
    const action = String(body.action || body.endpoint || '').replace(/^\/+/,'').toLowerCase();

    switch(action) {
      case 'login': return json_(login_(body));
      case 'logout': return json_(logout_(body));
      case 'schools': return json_(schools_(body));
      case 'school_add': return json_(schoolAdd_(body));
      case 'school_update': return json_(schoolUpdate_(body));
      case 'school_delete': return json_(schoolDelete_(body));
      case 'students': return json_(students_(body));
      case 'student_add': return json_(studentAdd_(body));
      case 'student_update': return json_(studentUpdate_(body));
      case 'student_delete': return json_(studentDelete_(body));
      case 'tuition': return json_(tuition_(body));
      case 'tuition_add': return json_(tuitionAdd_(body));
      case 'tuition_update': return json_(tuitionUpdate_(body));
      case 'tuition_delete': return json_(tuitionDelete_(body));
      case 'expenses': return json_(expenses_(body));
      case 'expense_add': return json_(expenseAdd_(body));
      case 'expense_update': return json_(expenseUpdate_(body));
      case 'expense_delete': return json_(expenseDelete_(body));
      case 'transactions': return json_(transactions_(body));
      case 'transaction_delete': return json_(transactionDelete_(body));
      case 'bank': return json_(bank_(body));
      case 'bank_match': return json_(bankMatch_(body));
      case 'bank_reconcile': return json_(bankReconcile_(body));
      case 'bank_upload': return json_(bankUpload_(body));
      case 'transaction_review': return json_(transactionReview_(body));
      case 'categories': return json_(categories_(body));
      case 'category_add': return json_(categoryAdd_(body));
      case 'category_update': return json_(categoryUpdate_(body));
      case 'category_delete': return json_(categoryDelete_(body));
      case 'messages': return json_(messages_(body));
      case 'message_add': return json_(messageAdd_(body));
      case 'message_delete': return json_(messageDelete_(body));
      case 'managers': return json_(managers_(body));
      case 'manager_add': return json_(managerAdd_(body));
      case 'manager_update': return json_(managerUpdate_(body));
      case 'manager_delete': return json_(managerDelete_(body));
      case 'attachment': return json_(attachment_(body));
      case 'parsian_export': return json_(parsianExport_(body));
      case 'parsian_school_map': return json_(parsianSchoolMap_(body));
      case 'parsian_student_accounts': return json_(parsianStudentAccounts_(body));
      case 'parsian_allocate': return json_(parsianAllocate_(body));
      case 'summary': return json_(summary_(body));
      case 'health': return json_({success:true});
      default: return json_({success:false,error:'Unknown action',action:action});
    }
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
      return {success:true,token:token,user:{
        id:r.id,name:r.name,username:r.username,school_id:r.school_id,role:(String(r.role)==='senior'?'admin':r.role)
      }};
    }
  }
  return {success:false,error:'نام کاربری یا رمز عبور اشتباه است.'};
}

function logout_(b) {
  if (b.token) CacheService.getScriptCache().remove('sess_'+String(b.token));
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

/* ---------- SCHOOLS ---------- */

function schools_(b) {
  const u=auth_(b);
  const data=rows_('Schools').map(x=>x.obj).filter(x=>String(x.active)!=='false');
  if(u.role!=='senior') return {success:true,data:data.filter(x=>String(x.id)===String(u.school_id))};
  return {success:true,data:data};
}

function schoolAdd_(b){ auth_(b,['senior']); const id=nextId_('Schools'); sheet_('Schools').appendRow([id,String(b.name||''),String(b.code||''),b.active!==false,now_()]); return {success:true,id:id}; }
function schoolUpdate_(b){ auth_(b,['senior']); const hit=findRow_('Schools',b.id); if(!hit) throw new Error('مدرسه یافت نشد.'); const r=hit.obj; updateRow_('Schools',hit.row,[r.id,b.name!==undefined?b.name:r.name,b.code!==undefined?b.code:r.code,b.active!==undefined?b.active:r.active,r.created_at]); return {success:true}; }
function schoolDelete_(b){ auth_(b,['senior']); const hit=findRow_('Schools',b.id); if(!hit) throw new Error('مدرسه یافت نشد.'); sheet_('Schools').getRange(hit.row,4).setValue(false); return {success:true}; }

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
  const u=auth_(b);
  const schoolId=u.role==='senior' ? b.school_id : u.school_id;
  if(!schoolId) throw new Error('مدرسه مشخص نشده است.');
  const nid=digits_(b.national_id);
  if(!/^\d{10}$/.test(nid)) throw new Error('کد ملی باید دقیقاً ۱۰ رقم انگلیسی باشد.');
  const phone=digits_(b.phone);
  if(phone && !/^0\d{10}$/.test(phone)) throw new Error('شماره تلفن باید ۱۱ رقم و با ۰ شروع شود.');
  const id=nextId_('Students');
  sheet_('Students').appendRow([
    id,String(b.name||'').trim(),String(b.grade||''),phone,nid,String(schoolId),
    String(b.kol_code||'67'),String(b.moeen_code||''),String(b.tafsili_code||''),
    true,now_()
  ]);
  return {success:true,id:id};
}

function studentUpdate_(b) {
  const u=auth_(b);
  const hit=findRow_('Students',b.id);
  if(!hit) throw new Error('دانش‌آموز یافت نشد.');
  const old=hit.obj;
  if(u.role!=='senior' && String(old.school_id)!==String(u.school_id)) throw new Error('دسترسی مجاز نیست.');
  const nid=digits_(b.national_id || old.national_id);
  const phone=digits_(b.phone || old.phone);
  if(!/^\d{10}$/.test(nid)) throw new Error('کد ملی باید دقیقاً ۱۰ رقم باشد.');
  if(phone && !/^0\d{10}$/.test(phone)) throw new Error('شماره تلفن نامعتبر است.');
  updateRow_('Students',hit.row,[
    old.id,b.name!==undefined?b.name:old.name,b.grade!==undefined?b.grade:old.grade,
    phone,nid,old.school_id,b.kol_code!==undefined?b.kol_code:old.kol_code,
    b.moeen_code!==undefined?b.moeen_code:old.moeen_code,
    b.tafsili_code!==undefined?b.tafsili_code:old.tafsili_code,old.active,old.created_at
  ]);
  return {success:true};
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
  let data=rows_('Expenses').map(x=>x.obj);
  if(u.role!=='senior') data=data.filter(x=>String(x.school_id)===String(u.school_id));
  return {success:true,data:data};
}

function expenseAdd_(b) {
  const u=auth_(b);
  const schoolId=u.role==='senior'?b.school_id:u.school_id;
  const category=String(b.category||'').trim();
  const amount=amount_(b.amount);
  if(!schoolId || !category || amount<=0) throw new Error('مدرسه، دسته هزینه و مبلغ الزامی است.');
  if(!String(b.tracking_code||'').trim()) throw new Error('شماره پیگیری الزامی است.');
  const id=nextId_('Expenses');
  const image=saveAttachmentIfAny_(b,'expense',id,u.id);
  sheet_('Expenses').appendRow([
    id,date_(b.date),String(schoolId),category,amount,String(b.description||''),
    String(b.tracking_code||''),image.url||'',u.id,now_(),false,false
  ]);
  sheet_('Transactions').appendRow([
    nextId_('Transactions'),date_(b.date),String(schoolId),'expense',amount,String(b.description||''),
    String(b.tracking_code||''),image.url||'',u.id,now_(),false,false,id
  ]);
  return {success:true,id:id,image_url:image.url||''};
}

function expenseUpdate_(b) {
  const u=auth_(b);
  const hit=findRow_('Expenses',b.id);
  if(!hit) throw new Error('هزینه یافت نشد.');
  if(u.role!=='senior' && String(hit.obj.created_by)!==String(u.id)) throw new Error('فقط ثبت‌کننده یا مدیر ارشد می‌تواند ویرایش کند.');
  const r=hit.obj;
  const tracking=b.tracking_code!==undefined?String(b.tracking_code):String(r.tracking_code);
  if(!tracking.trim()) throw new Error('شماره پیگیری الزامی است.');
  updateRow_('Expenses',hit.row,[
    r.id,b.date!==undefined?date_(b.date):r.date,r.school_id,
    b.category!==undefined?b.category:r.category,
    b.amount!==undefined?amount_(b.amount):Number(r.amount),
    b.description!==undefined?b.description:r.description,tracking,r.image_url,
    r.created_by,r.created_at,r.reconciled,r.approved
  ]);
  return {success:true};
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
  let data=rows_('Transactions').map(x=>x.obj);
  if(u.role!=='senior') data=data.filter(x=>String(x.school_id)===String(u.school_id));
  if(b.student_id) data=data.filter(x=>{ const hit=findRow_('Tuition',x.source_id); return String(hit&&hit.obj.student_id)===String(b.student_id); });
  if(b.kind_query) data=data.filter(x=>b.kind_query==='هزینه' ? String(x.kind)==='expense' : (b.kind_query==='شهریه' ? String(x.kind)==='payment' : String(x.kind)===b.kind_query));
  const students=rows_('Students').map(x=>x.obj); const tuition=rows_('Tuition').map(x=>x.obj); const expenses=rows_('Expenses').map(x=>x.obj);
  data=data.map(t=>{
    const out=Object.assign({},t); out.school_name=schoolName_(t.school_id); out.attachment_url=t.image_url||'';
    if(String(t.kind)==='payment'||String(t.kind)==='debt') { const q=tuition.find(x=>String(x.id)===String(t.source_id)); if(q){out.student_id=q.student_id; const st=students.find(x=>String(x.id)===String(q.student_id)); if(st){out.student_name=st.name;out.student_grade=st.grade;}} }
    if(String(t.kind)==='expense') { const e=expenses.find(x=>String(x.id)===String(t.source_id)); if(e){out.expense_category_name=e.category;} }
    return out;
  });
  return {success:true,data:data};
}

function transactionDelete_(b) {
  const u=auth_(b);
  const hit=findRow_('Transactions',b.id);
  if(!hit) throw new Error('تراکنش یافت نشد.');
  if(u.role!=='senior' && String(hit.obj.created_by)!==String(u.id)) throw new Error('دسترسی مجاز نیست.');
  sheet_('Transactions').deleteRow(hit.row);
  return {success:true};
}

/* ---------- BANK ---------- */

function bank_(b) {
  const u=auth_(b);
  let data=rows_('Bank').map(x=>x.obj);
  if(u.role!=='senior') data=data.filter(x=>String(x.school_id)===String(u.school_id));
  return {success:true,data:data};
}

function bankMatch_(b) {
  const u=auth_(b,['senior']);
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

function transactionReview_(b){ const u=auth_(b,['senior']); const hit=findRow_('Transactions',b.id); if(!hit) throw new Error('تراکنش یافت نشد.'); const r=hit.obj; const approved=String(b.status||'')==='approved'; updateRow_('Transactions',hit.row,[r.id,r.date,r.school_id,r.kind,r.amount,r.description,r.tracking_code,r.image_url,r.created_by,r.created_at,r.reconciled,approved,r.source_id]); return {success:true,approved:approved}; }
function bankReconcile_(b){ auth_(b,['senior']); const tx=rows_('Transactions').map(x=>x.obj); let matched=0,unmatched=0; tx.forEach(t=>String(t.reconciled)==='true'?matched++:unmatched++); return {success:true,matched:matched,unmatched:unmatched}; }
function bankUpload_(b){ auth_(b,['senior']); if(b.base64) saveAttachment_(b.base64,b.file_name||'bank_upload.csv',b.mime_type||'text/csv',Utilities.getUuid(),'','bank',''); return {success:true,message:'فایل بانک دریافت شد.'}; }

/* ---------- CATEGORIES ---------- */

function categories_(b) {
  auth_(b);
  return {success:true,data:rows_('ExpenseCategories').map(x=>x.obj).filter(x=>String(x.active)!=='false')};
}

function categoryAdd_(b) {
  auth_(b,['senior']);
  const name=String(b.name||'').trim();
  if(!name) throw new Error('نام دسته هزینه الزامی است.');
  const id=Utilities.getUuid();
  sheet_('ExpenseCategories').appendRow([id,name,true,now_()]);
  return {success:true,id:id};
}

function categoryUpdate_(b) {
  auth_(b,['senior']);
  const hit=findRow_('ExpenseCategories',b.id);
  if(!hit) throw new Error('دسته هزینه یافت نشد.');
  updateRow_('ExpenseCategories',hit.row,[hit.obj.id,b.name!==undefined?b.name:hit.obj.name,b.active!==undefined?b.active:hit.obj.active,hit.obj.created_at]);
  return {success:true};
}

function categoryDelete_(b) {
  auth_(b,['senior']);
  const hit=findRow_('ExpenseCategories',b.id);
  if(!hit) throw new Error('دسته هزینه یافت نشد.');
  sheet_('ExpenseCategories').getRange(hit.row,3).setValue(false);
  return {success:true};
}

/* ---------- MESSAGES ---------- */

function messages_(b) {
  auth_(b);
  return {success:true,data:rows_('Messages').map(x=>x.obj).filter(x=>String(x.active)!=='false').reverse()};
}

function messageAdd_(b) {
  const u=auth_(b,['senior']);
  const msg=String(b.message||'').trim();
  if(!msg) throw new Error('پیام خالی است.');
  const id=Utilities.getUuid();
  sheet_('Messages').appendRow([id,msg,u.id,now_(),true]);
  return {success:true,id:id};
}

function messageDelete_(b) {
  auth_(b,['senior']);
  const hit=findRow_('Messages',b.id);
  if(!hit) throw new Error('پیام یافت نشد.');
  sheet_('Messages').getRange(hit.row,5).setValue(false);
  return {success:true};
}

/* ---------- MANAGERS ---------- */

function managers_(b) {
  auth_(b,['senior']);
  return {success:true,data:rows_('Managers').map(x=>{
    const r=x.obj; delete r.password; return r;
  })};
}

function managerAdd_(b) {
  auth_(b,['senior']);
  if(!b.username || !b.password) throw new Error('نام کاربری و رمز عبور الزامی است.');
  const id=nextId_('Managers');
  sheet_('Managers').appendRow([
    id,String(b.name||''),String(b.username),sha256_(String(b.password)),
    String(b.school_id||''),String(b.role||'manager'),true,now_()
  ]);
  return {success:true,id:id};
}

function managerUpdate_(b) {
  auth_(b,['senior']);
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
  auth_(b,['senior']);
  const hit=findRow_('Managers',b.id);
  if(!hit) throw new Error('مدیر یافت نشد.');
  sheet_('Managers').getRange(hit.row,7).setValue(false);
  return {success:true};
}

/* ---------- ATTACHMENTS / DRIVE ---------- */

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
function parsianStudentAccounts_(b){ auth_(b); let data=rows_('Students').map(x=>x.obj).map(s=>({code:[s.tafsili_code,s.moeen_code,s.kol_code||'67'].join('-'),name:s.name,id:s.id})); if(b.q){const q=String(b.q).toLowerCase();data=data.filter(x=>String(x.code).toLowerCase().includes(q)||String(x.name).toLowerCase().includes(q));} return {success:true,data:data}; }
function parsianAllocate_(b){ auth_(b); return {success:true,data:{code:'0-'+String(b.moeen||1)+'-67',name:String(b.name||'حساب دانش‌آموز')}}; }

/* ---------- PARSIAN ---------- */

function parsianExport_(b) {
  const u=auth_(b,['senior']);
  const cols=['ID','KolCode','MoeenCode','TafsiliCode','HesabName','Comment','Bed','Bes','Factor_Num','Tick','SanadComment','ChkNum','IsRecPayChk','CostCenterCode'];
  const out=[cols];

  const txs=rows_('Transactions').map(x=>x.obj)
    .filter(x=>String(x.reconciled)==='true' && String(x.approved)==='true');

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

  const name='Parsian_'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmmss')+'.csv';
  const csv=out.map(r=>r.map(csvEscape_).join(',')).join('\n');
  const file=getDriveFolder_().createFile(name,csv,MimeType.CSV);
  return {success:true,file_url:file.getUrl(),file_id:file.getId(),rows:out.length-1,columns:cols};
}

function parsianRow_(id,kol,moeen,taf,name,comment,bed,bes,factor,tick,sanad,chk,isrec,cost) {
  return [id,kol,moeen,taf,name,comment,bed,bes,factor,tick,sanad,chk,isrec,cost];
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
    // Keep data but mark approval false and reconciled false.
    const r=hit.obj;
    if(name==='Tuition') updateRow_(name,hit.row,[r.id,r.date,r.student_id,r.school_id,r.type,r.amount,r.description,r.tracking_code,r.image_url,r.created_by,r.created_at,false,false]);
    if(name==='Expenses') updateRow_(name,hit.row,[r.id,r.date,r.school_id,r.category,r.amount,r.description,r.tracking_code,r.image_url,r.created_by,r.created_at,false,false]);
  }
}

function softDeleteTransaction_(sourceId) {
  rows_('Transactions').forEach(x=>{
    if(String(x.obj.source_id)===String(sourceId)) {
      const r=x.obj;
      updateRow_('Transactions',x.row,[r.id,r.date,r.school_id,r.kind,r.amount,r.description,r.tracking_code,r.image_url,r.created_by,r.created_at,false,false,r.source_id]);
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
