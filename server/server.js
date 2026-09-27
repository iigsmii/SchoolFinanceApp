const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const multer = require("multer");
const sharp = require("sharp");
const XLSX = require("xlsx");

const app = express();
const PORT = Number(process.env.PORT || 10000);
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });
const imageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

app.disable("x-powered-by");
app.use(cors(CORS_ORIGIN === "*" ? {} : { origin: CORS_ORIGIN }));
app.use(express.json({ limit: "128kb" }));

function configured() { return Boolean(SUPABASE_URL && SUPABASE_KEY); }
function headers(extra = {}) { return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", ...extra }; }
async function db(path, options = {}) {
  if (!configured()) throw new Error("Supabase is not configured");
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers: headers(options.headers || {}) });
  const text = await response.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { response, data };
}
function enc(v) { return encodeURIComponent(String(v)); }
function jsonError(res, status, message) { return res.status(status).json({ success: false, message }); }
function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId: user.id, role: user.role || "manager", schoolId: user.school_id || null, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}
function getToken(req) { const h = req.get("authorization") || ""; return h.startsWith("Bearer ") ? h.slice(7).trim() : ""; }
function requireAuth(req, res, next) {
  const token = getToken(req), s = sessions.get(token);
  if (!s || s.expiresAt <= Date.now()) { if (token) sessions.delete(token); return jsonError(res, 401, "نشست کاربری معتبر نیست"); }
  s.expiresAt = Date.now() + SESSION_TTL_MS; req.session = s; next();
}
function requireAdmin(req, res, next) { if (req.session.role !== "admin") return jsonError(res, 403, "دسترسی مدیر ارشد لازم است"); next(); }
function schoolFilter(req) { return req.session.role === "admin" ? "" : `&school_id=eq.${enc(req.session.schoolId)}`; }
function normalizeDigits(v) { return String(v || "").replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[^0-9]/g, ""); }
function money(v) { const n = Number(String(v ?? "").replace(/,/g, "")); if (!Number.isFinite(n) || n < 0) throw new Error("invalid amount"); return Math.round(n); }
function csvRows(text) {
  const rows = [], row = []; let cell = "", q = false;
  for (let i=0;i<text.length;i++) { const c=text[i]; if(c==='"'){ if(q && text[i+1]==='"'){cell+='"';i++;} else q=!q; } else if((c===',' || c==='\n' || c==='\r')&&!q){ if(c==='\r'&&text[i+1]==='\n')i++; row.push(cell);cell=""; if(c!=='\r'&&c!=='\n')continue; rows.push(row.splice(0)); } else cell+=c; }
  if(cell.length || row.length){row.push(cell);rows.push(row);} return rows.filter(r=>r.some(x=>String(x).trim()!==""));
}
function rowsFromFile(file) {
  const name = (file.originalname || "").toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const wb = XLSX.read(file.buffer, { type:"buffer", cellDates:false });
    const ws = wb.Sheets[wb.SheetNames[0]]; return XLSX.utils.sheet_to_json(ws, { header:1, defval:"" });
  }
  return csvRows(file.buffer.toString("utf8"));
}
function rowObject(headersRow, row) { const o={}; headersRow.forEach((h,i)=>o[String(h||"").trim()]=row[i] ?? ""); return o; }
function first(o, keys) { for (const k of keys) if (o[k] !== undefined && o[k] !== "") return o[k]; return ""; }

async function storageUpload(path, buffer, contentType) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/school-finance/${path}`, { method:"POST", headers:headers({"Content-Type":contentType || "application/octet-stream", "x-upsert":"true"}), body:buffer });
  if (!r.ok) { console.error("STORAGE ERROR", r.status, await r.text()); throw new Error("storage upload failed"); }
  return `${SUPABASE_URL}/storage/v1/object/public/school-finance/${path}`;
}

app.get("/", (req,res)=>res.json({success:true,message:"School Finance API is running",version:"2.0.0"}));
app.get("/api/test", (req,res)=>res.json({success:true,message:"API connection successful"}));
app.get("/api/test-db", async (req,res)=>{ try { const r=await db("/rest/v1/schools?select=id,name,code,active&order=id.asc"); if(!r.response.ok)return jsonError(res,502,"Supabase connection failed"); res.json({success:true,count:Array.isArray(r.data)?r.data.length:0,schools:r.data}); } catch(e){console.error(e.message);jsonError(res,500,"Database error");} });

app.post("/api/login", async (req,res)=>{
  const username=typeof req.body?.username==="string"?req.body.username.trim():"", password=typeof req.body?.password==="string"?req.body.password:"";
  if(!username||!password||username.length>120||password.length>200)return jsonError(res,400,"نام کاربری و رمز عبور معتبر الزامی است");
  try {
    const r=await db(`/rest/v1/managers?select=id,name,username,password_hash,school_id,role,active&username=eq.${enc(username)}&limit=1`);
    if(!r.response.ok)return jsonError(res,502,"خطا در ارتباط با پایگاه داده"); const u=Array.isArray(r.data)?r.data[0]:null;
    if(!u||!u.password_hash||!(u.active===true||u.active===1)||!(await bcrypt.compare(password,u.password_hash)))return jsonError(res,401,"نام کاربری یا رمز عبور اشتباه است");
    let school=null; if(u.school_id){const sr=await db(`/rest/v1/schools?select=id,name,code&id=eq.${enc(u.school_id)}&limit=1`); if(sr.response.ok)school=sr.data?.[0]||null;}
    res.json({success:true,token:createSession(u),user:{id:u.id,username:u.username,name:u.name,role:u.role||"manager",school_id:u.school_id,school_name:school?.name||null,school_code:school?.code||null}});
  }catch(e){console.error("LOGIN",e.message);jsonError(res,500,"خطای داخلی سرور");}
});
app.post("/api/logout",requireAuth,(req,res)=>{sessions.delete(getToken(req));res.json({success:true});});
app.get("/api/me",requireAuth,(req,res)=>res.json({success:true,user:req.session}));

app.get("/api/schools",requireAuth,async(req,res)=>{try{const q=req.session.role==="admin"?"":"&id=eq."+enc(req.session.schoolId);const r=await db(`/rest/v1/schools?select=id,name,type,code,active&order=id.asc${q}`);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت مدارس");res.json({success:true,data:r.data});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});
app.get("/api/managers",requireAuth,requireAdmin,async(req,res)=>{try{const r=await db(`/rest/v1/managers?select=id,name,username,school_id,role,active&order=id.asc`);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت مدیران");res.json({success:true,data:r.data});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});
app.post("/api/managers",requireAuth,requireAdmin,async(req,res)=>{try{const {name,username,password,school_id,role="manager",active=true}=req.body||{};if(!name||!username||!password||!school_id)return jsonError(res,400,"اطلاعات مدیر ناقص است");const hash=await bcrypt.hash(String(password),12);const r=await db("/rest/v1/managers",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{name:String(name).trim(),username:String(username).trim(),password_hash:hash,school_id:Number(school_id),role,active:!!active}])});if(!r.response.ok)return jsonError(res,400,"ثبت مدیر انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){console.error(e.message);jsonError(res,500,"خطای داخلی سرور");}});
app.patch("/api/managers/:id",requireAuth,requireAdmin,async(req,res)=>{try{const body={};for(const k of ["name","username","school_id","role","active"])if(req.body?.[k]!==undefined)body[k]=k==="school_id"?Number(req.body[k]):req.body[k];if(req.body?.password)body.password_hash=await bcrypt.hash(String(req.body.password),12);const r=await db(`/rest/v1/managers?id=eq.${enc(req.params.id)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(body)});if(!r.response.ok)return jsonError(res,400,"ویرایش مدیر انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});

app.get("/api/students",requireAuth,async(req,res)=>{try{let q=`/rest/v1/students?select=id,name,code,grade,phone,school_id&order=name.asc&limit=100&name=ilike.*${enc(req.query.q||"")}*`;if(req.session.role!=="admin")q+=`&school_id=eq.${enc(req.session.schoolId)}`;const r=await db(q);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت دانش‌آموزان");res.json({success:true,data:r.data});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});
app.post("/api/students",requireAuth,async(req,res)=>{try{const {name,code,grade}=req.body||{};const phone=normalizeDigits(req.body?.phone);const grades=["مهد","اول","دوم","سوم","چهارم","پنجم","ششم"];if(!name||!grades.includes(grade)||!/^0\d{10}$/.test(phone))return jsonError(res,400,"نام، پایه یا شماره تلفن معتبر نیست");const schoolId=req.session.role==="admin"?Number(req.body.school_id):req.session.schoolId;if(!schoolId)return jsonError(res,400,"مدرسه مشخص نیست");const r=await db("/rest/v1/students",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{name:String(name).trim(),code:code?String(code).trim():null,grade,phone,school_id:schoolId}])});if(!r.response.ok)return jsonError(res,400,"ثبت دانش‌آموز انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});
app.patch("/api/students/:id",requireAuth,async(req,res)=>{try{const body={};if(req.body?.name!==undefined)body.name=String(req.body.name).trim();if(req.body?.code!==undefined)body.code=req.body.code?String(req.body.code).trim():null;if(req.body?.grade!==undefined&&["مهد","اول","دوم","سوم","چهارم","پنجم","ششم"].includes(req.body.grade))body.grade=req.body.grade;if(req.body?.phone!==undefined){const p=normalizeDigits(req.body.phone);if(!/^0\d{10}$/.test(p))return jsonError(res,400,"شماره تلفن باید مانند 09131112222 باشد");body.phone=p;}const school=req.session.role==="admin"?"":`&school_id=eq.${enc(req.session.schoolId)}`;const r=await db(`/rest/v1/students?id=eq.${enc(req.params.id)}${school}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(body)});if(!r.response.ok)return jsonError(res,400,"ویرایش دانش‌آموز انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});
app.get("/api/students/:id/balance",requireAuth,async(req,res)=>{try{const sf=req.session.role==="admin"?"":`&school_id=eq.${enc(req.session.schoolId)}`;const r=await db(`/rest/v1/transactions?select=kind,debit,credit&student_id=eq.${enc(req.params.id)}${sf}&limit=1000`);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت بدهی");let due=0,paid=0;for(const x of r.data||[]){if(x.kind==="شهریه_بدهی")due+=Number(x.debit||0);if(x.kind==="شهریه")paid+=Number(x.credit||0);}res.json({success:true,due,paid,balance:Math.max(0,due-paid)});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});

app.get("/api/expense-categories",requireAuth,async(req,res)=>{try{const r=await db(`/rest/v1/expense_categories?select=id,name,active&order=id.asc`);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت لیست هزینه‌ها");res.json({success:true,data:r.data});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});
app.post("/api/expense-categories",requireAuth,requireAdmin,async(req,res)=>{try{if(!req.body?.name)return jsonError(res,400,"نام هزینه الزامی است");const r=await db("/rest/v1/expense_categories",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{name:String(req.body.name).trim(),active:req.body.active!==false}])});if(!r.response.ok)return jsonError(res,400,"ثبت نوع هزینه انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});
app.patch("/api/expense-categories/:id",requireAuth,requireAdmin,async(req,res)=>{try{const body={};if(req.body?.name!==undefined)body.name=String(req.body.name).trim();if(req.body?.active!==undefined)body.active=!!req.body.active;const r=await db(`/rest/v1/expense_categories?id=eq.${enc(req.params.id)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(body)});if(!r.response.ok)return jsonError(res,400,"ویرایش نوع هزینه انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});

app.post("/api/tuition/debt",requireAuth,async(req,res)=>{try{const amount=money(req.body?.amount);const studentId=Number(req.body?.student_id);if(!studentId||amount<=0)return jsonError(res,400,"مبلغ یا دانش‌آموز معتبر نیست");const schoolId=req.session.role==="admin"?Number(req.body.school_id):req.session.schoolId;const r=await db("/rest/v1/transactions",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{date:req.body.date||new Date().toISOString().slice(0,10),account:req.body.account||"مطالبات شهریه",debit:amount,credit:0,comment:req.body.comment||"ثبت بدهی شهریه",kind:"شهریه_بدهی",payment_method:null,tracking_code:null,student_id:studentId,school_id:schoolId,reconciled:false}])});if(!r.response.ok)return jsonError(res,400,"ثبت بدهی انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){jsonError(res,400,"مبلغ معتبر نیست");}});
app.post("/api/tuition/payment",requireAuth,async(req,res)=>{try{const amount=money(req.body?.amount),studentId=Number(req.body?.student_id);if(!studentId||amount<=0)return jsonError(res,400,"مبلغ یا دانش‌آموز معتبر نیست");const schoolId=req.session.role==="admin"?Number(req.body.school_id):req.session.schoolId;const r=await db("/rest/v1/transactions",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{date:req.body.date||new Date().toISOString().slice(0,10),account:req.body.account||"بانک",debit:0,credit:amount,comment:req.body.comment||"پرداخت شهریه",kind:"شهریه",payment_method:req.body.payment_method||"بانک",tracking_code:req.body.tracking_code||null,student_id:studentId,school_id:schoolId,reconciled:false}])});if(!r.response.ok)return jsonError(res,400,"ثبت شهریه انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){jsonError(res,400,"مبلغ معتبر نیست");}});
app.post("/api/expenses",requireAuth,async(req,res)=>{try{const amount=money(req.body?.amount),categoryId=Number(req.body?.category_id);if(amount<=0||!categoryId)return jsonError(res,400,"نوع هزینه و مبلغ الزامی است");const schoolId=req.session.role==="admin"?Number(req.body.school_id):req.session.schoolId;const r=await db("/rest/v1/transactions",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{date:req.body.date||new Date().toISOString().slice(0,10),account:req.body.account||"هزینه",debit:amount,credit:0,comment:req.body.comment||"",kind:"هزینه",payment_method:req.body.payment_method||"بانک",tracking_code:req.body.tracking_code||null,student_id:null,school_id:schoolId,reconciled:false}])});if(!r.response.ok)return jsonError(res,400,"ثبت هزینه انجام نشد");const tx=r.data?.[0];const patch={comment:`[expense_category_id=${categoryId}] ${req.body.comment||""}`};await db(`/rest/v1/transactions?id=eq.${enc(tx.id)}`,{method:"PATCH",body:JSON.stringify(patch)});res.json({success:true,data:tx});}catch(e){jsonError(res,400,"مبلغ معتبر نیست");}});

app.post("/api/attachments",requireAuth,imageUpload.single("file"),async(req,res)=>{try{if(!req.file)return jsonError(res,400,"فایل ارسال نشده است");const type=req.body.entity_type, id=Number(req.body.entity_id);if(!["tuition","expense"].includes(type)||!id)return jsonError(res,400,"اطلاعات پیوست نامعتبر است");const meta=await sharp(req.file.buffer).metadata();if(!String(meta.format||"").match(/jpeg|jpg|png|webp/i))return jsonError(res,400,"فقط تصویر مجاز است");const buffer=await sharp(req.file.buffer).rotate().resize({width:1600,height:1600,fit:"inside",withoutEnlargement:true}).jpeg({quality:60,mozjpeg:true}).withMetadata({density:96}).toBuffer();const path=`${req.session.schoolId||"admin"}/${type}/${id}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}.jpg`;const url=await storageUpload(path,buffer,"image/jpeg");const r=await db("/rest/v1/attachments",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{entity_type:type,entity_id:id,school_id:req.session.schoolId||null,file_url:url,file_name:req.file.originalname||"image.jpg",mime_type:"image/jpeg",size_bytes:buffer.length,dpi:96}])});if(!r.response.ok)return jsonError(res,400,"ذخیره پیوست انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){console.error("UPLOAD",e.message);jsonError(res,400,"آپلود تصویر انجام نشد");}});

app.post("/api/bank/upload",requireAuth,requireAdmin,upload.single("file"),async(req,res)=>{try{if(!req.file)return jsonError(res,400,"فایل بانک ارسال نشده است");const rows=rowsFromFile(req.file);if(!rows.length)return jsonError(res,400,"فایل خالی است");const hs=rows[0].map(x=>String(x).trim());const data=rows.slice(1).map(r=>rowObject(hs,r));const inserted=[];for(const o of data){const amount=Math.abs(Number(String(first(o,["Bed","بدهکار","مبلغ","Amount","credit"])).replace(/,/g,""))||0);if(!amount)continue;inserted.push({bank_date:first(o,["SanadDate","تاریخ","Date"]),amount,account:first(o,["HesabName","حساب"]),comment:first(o,["Comment","شرح"]),tracking_code:first(o,["TrackingCode","tracking_code","پیگیری"]),raw:o,school_id:req.body.school_id?Number(req.body.school_id):null});}if(!inserted.length)return jsonError(res,400,"تراکنش قابل استفاده‌ای در فایل پیدا نشد");const r=await db("/rest/v1/bank_transactions",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(inserted)});if(!r.response.ok)return jsonError(res,400,"ذخیره فایل بانک انجام نشد");res.json({success:true,count:r.data?.length||0});}catch(e){console.error("BANK",e.message);jsonError(res,400,"خواندن فایل بانک انجام نشد");}});
app.post("/api/bank/reconcile",requireAuth,requireAdmin,async(req,res)=>{try{const school=req.body?.school_id?`&school_id=eq.${enc(req.body.school_id)}`:"";const br=await db(`/rest/v1/bank_transactions?select=*&reconciled=eq.false&order=id.asc&limit=2000${school}`);if(!br.response.ok)return jsonError(res,502,"خطا در دریافت تراکنش‌های بانک");const tr=await db(`/rest/v1/transactions?select=*&kind=eq.${enc("شهریه")}&reconciled=eq.false&limit=5000${school}`);if(!tr.response.ok)return jsonError(res,502,"خطا در دریافت شهریه‌ها");const used=new Set(), matched=[], unmatched=[];for(const b of br.data||[]){let candidate=null;for(const t of tr.data||[]){if(used.has(t.id))continue;if(Math.abs(Number(t.credit)-Number(b.amount))>0)continue;const text=(b.comment||"").toString();const track=(b.tracking_code||"").toString();if(track&&t.tracking_code&&track===t.tracking_code){candidate=t;break;}if(text&&t.comment&&text.includes(t.comment)){candidate=t;break;}if(!candidate)candidate=t;}if(candidate){used.add(candidate.id);matched.push([b.id,candidate.id]);}else unmatched.push(b.id);}for(const [bid,tid] of matched){await db(`/rest/v1/bank_transactions?id=eq.${enc(bid)}`,{method:"PATCH",body:JSON.stringify({reconciled:true,matched_transaction_id:tid})});await db(`/rest/v1/transactions?id=eq.${enc(tid)}`,{method:"PATCH",body:JSON.stringify({reconciled:true})});}res.json({success:true,matched:matched.length,unmatched:unmatched.length,unmatched_ids:unmatched});}catch(e){console.error(e.message);jsonError(res,500,"تطبیق تراکنش‌ها انجام نشد");}});
app.get("/api/bank/unmatched",requireAuth,requireAdmin,async(req,res)=>{try{const r=await db(`/rest/v1/bank_transactions?select=*&reconciled=eq.false&order=id.desc&limit=500`);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت تراکنش‌ها");res.json({success:true,data:r.data});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});
app.post("/api/bank/:id/return",requireAuth,requireAdmin,async(req,res)=>{try{const message="این تراکنش در داده های دریافتی از بانک یافت نشد، لطفا پیگیری بفرمایید.";const r=await db(`/rest/v1/bank_transactions?id=eq.${enc(req.params.id)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status:"returned",return_message:message})});if(!r.response.ok)return jsonError(res,400,"مرجوع کردن تراکنش انجام نشد");res.json({success:true,message});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});

app.get("/api/transactions",requireAuth,async(req,res)=>{try{let q=`/rest/v1/transactions?select=*&order=id.desc&limit=200`;if(req.query.kind)q+=`&kind=eq.${enc(req.query.kind)}`;if(req.session.role!=="admin")q+=`&school_id=eq.${enc(req.session.schoolId)}`;const r=await db(q);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت تراکنش‌ها");res.json({success:true,data:r.data});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});

app.get("/api/export/parsiان",requireAuth,requireAdmin,async(req,res)=>exportParsian(req,res));
app.get("/api/export/parsian",requireAuth,requireAdmin,async(req,res)=>exportParsian(req,res));
async function exportParsian(req,res){try{let q="/rest/v1/transactions?select=*&order=id.asc&limit=10000";if(req.query.school_id)q+=`&school_id=eq.${enc(req.query.school_id)}`;const r=await db(q);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت اطلاعات حسابداری");const accounts=await db("/rest/v1/accounts?select=code,name&limit=5000");const byName=new Map((accounts.data||[]).map(a=>[a.name,a.code]));const rows=[];let id=1;for(const t of r.data||[]){const amountD=Number(t.debit||0),amountC=Number(t.credit||0);const accountCode=byName.get(t.account)||"";rows.push({ID:id++,KolCode:accountCode.split("-")[0]||"",MoeenCode:accountCode.split("-")[1]||"",TafsiliCode:accountCode.split("-")[2]||"",HesabName:t.account||"",Comment:t.comment||"",Bed:amountD,Bes:amountC,Factor_Num:0,Tick:false,SanadComment:"",ChkNum:"",IsRecPayChk:"",CostCenterCode:""});}const ws=XLSX.utils.json_to_sheet(rows,{header:["ID","KolCode","MoeenCode","TafsiliCode","HesabName","Comment","Bed","Bes","Factor_Num","Tick","SanadComment","ChkNum","IsRecPayChk","CostCenterCode"]});const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Sheet1");const buf=XLSX.write(wb,{type:"buffer",bookType:"xlsx"});res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");res.setHeader("Content-Disposition",`attachment; filename="parsian-${Date.now()}.xlsx"`);res.send(buf);}catch(e){console.error(e.message);jsonError(res,500,"ساخت فایل حسابداری انجام نشد");}}

app.use((error,req,res,next)=>{if(error instanceof SyntaxError&&error.status===400)return jsonError(res,400,"بدنه درخواست JSON معتبر نیست");if(error?.code==="LIMIT_FILE_SIZE")return jsonError(res,413,"حجم فایل بیش از حد مجاز است");console.error("UNHANDLED",error);return jsonError(res,500,"خطای داخلی سرور");});
app.listen(PORT,"0.0.0.0",()=>console.log(`School Finance API running on port ${PORT}`));
