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
const CANONICAL_SCHOOLS = [
  "دبستان نور ۱",
  "دبستان نور ۲",
  "دبستان تبیان ۱",
  "دبستان تبیان ۲",
  "مهد مرکزی صبح",
  "مهد مرکزی عصر",
  "مهد ابراهیم خلیل",
  "مهد سروستان",
  "مهد منظریه"
];
function isCanonicalSchool(s) { return CANONICAL_SCHOOLS.includes(String(s || "").trim()); }
const PARSIAN_SCHOOL_TUITION = {
  "دبستان نور ۱": {code:"0-1-40", name:"درآمد شهريه دبستان نور 1"},
  "دبستان نور ۲": {code:"0-2-40", name:"درآمد شهريه دبستان نور 2"},
  "دبستان تبیان ۱": {code:"0-3-40", name:"درآمد شهريه دبستان تبيان 1"},
  "دبستان تبیان ۲": {code:"0-4-40", name:"درآمد شهريه دبستان تبيان 2"},
  "مهد ابراهیم خلیل": {code:"0-5-40", name:"درآمد شهريه پيش دبستاني ابراهيم خليل"},
  "مهد مرکزی عصر": {code:"0-8-40", name:"درآمد شهريه پيش دبستاني نوبت عصر مدرسه القران"},
  "مهد منظریه": {code:"0-9-40", name:"درآمد شهريه پيش دبستاني منظريه"},
  "مهد مرکزی صبح": {code:"0-10-40", name:"درآمد شهريه پيش دبستاني نوبت صبح مدرسه القران"},
  "مهد سروستان": {code:"0-7-40", name:"درآمد شهريه پيش دبستاني سروستان"}
};
const PARSIAN_EXPENSE_CODES = {
  "دبستان نور ۱": {"هزینه ی تخفیف":"0-3-68","هزینه تخفیف":"0-3-68","هزینه ی پذیرایی":"0-4-68","هزینه پذیرایی":"0-4-68","تخفیف":"0-3-68","پذیرایی":"0-4-68","تلفن":"0-6-68","اینترنت":"0-7-68","متفرقه":"0-2-68"},
  "دبستان نور ۲": {"تخفیف":"0-3-69","پذیرایی":"0-4-69","تلفن":"0-6-69","اینترنت":"0-7-69","متفرقه":"0-2-69"},
  "دبستان تبیان ۱": {"تخفیف":"0-3-70","پذیرایی":"0-4-70","تلفن":"0-6-70","اینترنت":"0-7-70","متفرقه":"0-2-70"},
  "دبستان تبیان ۲": {"تخفیف":"0-3-71","پذیرایی":"0-4-71","تلفن":"0-6-71","اینترنت":"0-7-71","متفرقه":"0-2-71"},
  "مهد مرکزی صبح": {"تخفیف":"0-1-73","متفرقه":"0-2-73","تلفن":"0-3-73"},
  "مهد مرکزی عصر": {"تخفیف":"0-1-75"},
  "مهد ابراهیم خلیل": {"تخفیف":"0-1-76","تلفن":"0-3-76"},
  "مهد سروستان": {"تخفیف":"0-1-78","تلفن":"0-3-78","متفرقه":"0-4-78"},
  "مهد منظریه": {"تخفیف":"0-1-74","تلفن":"0-2-74"}
};
function parseParsianCode(code){const p=String(code||"").trim().split("-");if(p.length!==3||!p.every(x=>/^\d+$/.test(x)))return null;return {kol:p[2],moeen:p[1],tafsili:p[0]};}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||""));}

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

app.get("/", (req,res)=>res.json({success:true,message:"School Finance API is running",version:"2.1.0"}));
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

app.get("/api/schools",requireAuth,async(req,res)=>{try{const q=req.session.role==="admin"?"":"&id=eq."+enc(req.session.schoolId);const r=await db(`/rest/v1/schools?select=id,name,type,code,active&order=id.asc${q}`);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت مدارس");const all=(r.data||[]).filter(s=>isCanonicalSchool(s.name));const data=CANONICAL_SCHOOLS.map(n=>all.find(x=>String(x.name).trim()===n)).filter(Boolean);res.json({success:true,data});}catch(e){console.error("SCHOOLS GET",e.message);jsonError(res,500,"خطای داخلی سرور");}});
app.post("/api/schools",requireAuth,requireAdmin,async(req,res)=>{try{const {name,type="مدرسه",code,active=true}=req.body||{};const cleanName=String(name||"").trim();const cleanCode=String(code||"").trim();if(!cleanName||!cleanCode)return jsonError(res,400,"نام و کد مدرسه الزامی است");if(!isCanonicalSchool(cleanName))return jsonError(res,400,"این نام مدرسه در فهرست ۹ مدرسه مجاز نیست");const r=await db("/rest/v1/schools",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{name:cleanName,type:String(type||"مدرسه").trim(),code:cleanCode,active:!!active}])});if(!r.response.ok)return jsonError(res,400,"ثبت مدرسه انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){console.error("SCHOOL POST",e.message);jsonError(res,500,"ثبت مدرسه انجام نشد");}});
app.patch("/api/schools/:id",requireAuth,requireAdmin,async(req,res)=>{try{const body={};for(const k of ["name","type","code","active"])if(req.body?.[k]!==undefined)body[k]=k==="active"?!!req.body[k]:String(req.body[k]).trim();if(body.name!==undefined&&!isCanonicalSchool(body.name))return jsonError(res,400,"این نام مدرسه در فهرست ۹ مدرسه مجاز نیست");const r=await db(`/rest/v1/schools?id=eq.${enc(req.params.id)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(body)});if(!r.response.ok)return jsonError(res,400,"ویرایش مدرسه انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){jsonError(res,500,"ویرایش مدرسه انجام نشد");}});
app.delete("/api/schools/:id",requireAuth,requireAdmin,async(req,res)=>{try{const r=await db(`/rest/v1/schools?id=eq.${enc(req.params.id)}`,{method:"DELETE",headers:{Prefer:"return=representation"}});if(!r.response.ok)return jsonError(res,400,"مدرسه قابل حذف نیست؛ ابتدا اطلاعات وابسته را بررسی کنید");res.json({success:true});}catch(e){jsonError(res,500,"حذف مدرسه انجام نشد");}});
app.get("/api/managers",requireAuth,requireAdmin,async(req,res)=>{try{const r=await db(`/rest/v1/managers?select=id,name,username,school_id,role,active&order=id.asc`);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت مدیران");res.json({success:true,data:r.data});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});
app.post("/api/managers",requireAuth,requireAdmin,async(req,res)=>{try{const {name,username,password,school_id,role="manager",active=true}=req.body||{};if(!name||!username||!password||!school_id)return jsonError(res,400,"اطلاعات مدیر ناقص است");const hash=await bcrypt.hash(String(password),12);const r=await db("/rest/v1/managers",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{name:String(name).trim(),username:String(username).trim(),password_hash:hash,school_id:Number(school_id),role,active:!!active}])});if(!r.response.ok)return jsonError(res,400,"ثبت مدیر انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){console.error(e.message);jsonError(res,500,"خطای داخلی سرور");}});
app.delete("/api/managers/:id",requireAuth,requireAdmin,async(req,res)=>{try{const chk=await db(`/rest/v1/managers?id=eq.${enc(req.params.id)}&select=username&limit=1`);if(chk.response.ok&&chk.data?.[0]?.username==="admin")return jsonError(res,400,"کاربر admin قابل حذف نیست");const r=await db(`/rest/v1/managers?id=eq.${enc(req.params.id)}`,{method:"DELETE",headers:{Prefer:"return=representation"}});if(!r.response.ok)return jsonError(res,400,"حذف مدیر انجام نشد");res.json({success:true});}catch(e){jsonError(res,500,"حذف مدیر انجام نشد");}});
app.patch("/api/managers/:id",requireAuth,requireAdmin,async(req,res)=>{try{const body={};for(const k of ["name","username","school_id","role","active"])if(req.body?.[k]!==undefined)body[k]=k==="school_id"?Number(req.body[k]):req.body[k];if(req.body?.password)body.password_hash=await bcrypt.hash(String(req.body.password),12);const r=await db(`/rest/v1/managers?id=eq.${enc(req.params.id)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(body)});if(!r.response.ok)return jsonError(res,400,"ویرایش مدیر انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});


app.get("/api/parsian/school-map",requireAuth,async(req,res)=>{try{const data=CANONICAL_SCHOOLS.map(name=>({school_name:name,tuition:PARSIAN_SCHOOL_TUITION[name]||null,expenses:PARSIAN_EXPENSE_CODES[name]||{}}));res.json({success:true,data});}catch(e){jsonError(res,500,"خطا در دریافت سرفصل پارسیان");}});
app.get("/api/parsian/student-accounts",requireAuth,async(req,res)=>{try{const q=String(req.query.q||"").trim();let path="/rest/v1/accounts?select=code,name&limit=5000";const r=await db(path);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت حساب‌های پارسیان");let data=(r.data||[]).filter(a=>/^\\d+-\\d+-67$/.test(String(a.code||"")));if(q)data=data.filter(a=>String(a.code).includes(q)||String(a.name).toLowerCase().includes(q.toLowerCase()));res.json({success:true,data});}catch(e){jsonError(res,500,"خطا در دریافت حساب‌های دانش‌آموزان");}});
app.post("/api/parsian/student-account/allocate",requireAuth,async(req,res)=>{try{const name=String(req.body?.name||"").trim(),grade=String(req.body?.grade||"").trim(),moeen=String(req.body?.moeen||"").trim();if(!name||!grade||!/^\\d+$/.test(moeen))return jsonError(res,400,"اطلاعات حساب پارسیان کامل نیست");const ar=await db(`/rest/v1/accounts?select=code&limit=5000`);if(!ar.response.ok)return jsonError(res,502,"خطا در خواندن سرفصل پارسیان");const nums=(ar.data||[]).map(x=>String(x.code||"")).filter(c=>new RegExp(`^\\d+-${moeen}-67$`).test(c)).map(c=>Number(c.split("-")[0])).filter(Number.isFinite);const next=(nums.length?Math.max(...nums)+1:1);const code=`${next}-${moeen}-67`;const accountName=`${name}(${grade}1405)`;const ins=await db("/rest/v1/accounts",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{code,name:accountName}])});if(!ins.response.ok)return jsonError(res,400,"ایجاد حساب تفصیلی پارسیان انجام نشد");const parts=parseParsianCode(code);res.json({success:true,data:{code,name:accountName,...parts}});}catch(e){console.error("PARSIAN ACCOUNT",e.message);jsonError(res,500,"ایجاد حساب تفصیلی انجام نشد");}});
app.get("/api/students",requireAuth,async(req,res)=>{try{let q=`/rest/v1/students?select=id,name,code,grade,phone,national_id,school_id,parsian_account_code,parsian_account_name,parsian_kol_code,parsian_moeen_code,parsian_tafsili_code&order=name.asc&limit=1000`;const term=String(req.query.q||"").trim();if(term)q+=`&or=(name.ilike.*${enc(term)}*,code.ilike.*${enc(term)}*,national_id.ilike.*${enc(term)}*)`;if(req.session.role!=="admin")q+=`&school_id=eq.${enc(req.session.schoolId)}`;const r=await db(q);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت دانش‌آموزان");res.json({success:true,data:r.data});}catch(e){console.error(e.message);jsonError(res,500,"خطای داخلی سرور");}});
app.post("/api/students",requireAuth,async(req,res)=>{
  try{
    const name=String(req.body?.name||"").trim();
    const grade=String(req.body?.grade||"").trim();
    const phone=normalizeDigits(req.body?.phone);
    const nationalId=normalizeDigits(req.body?.national_id);
    const grades=["مهد","اول","دوم","سوم","چهارم","پنجم","ششم"];

    if(!name)return jsonError(res,400,"نام دانش‌آموز را وارد کنید");
    if(!grades.includes(grade))return jsonError(res,400,"پایه تحصیلی معتبر نیست");
    if(!/^0\d{10}$/.test(phone))return jsonError(res,400,"شماره تلفن باید مانند 09131112222 باشد");
    if(!/^\d{10}$/.test(nationalId))return jsonError(res,400,"کد ملی باید دقیقاً ۱۰ رقم انگلیسی باشد");

    const parsianCode=String(req.body?.parsian_account_code||"").trim();
    const pc=parseParsianCode(parsianCode);
    if(!pc||pc.kol!=="67")return jsonError(res,400,"کد حساب پارسیان دانش‌آموز باید دقیقاً مانند 48-4-67 باشد");
    const accountCheck=await db(`/rest/v1/accounts?select=code,name&code=eq.${enc(parsianCode)}&limit=1`);
    if(!accountCheck.response.ok||!accountCheck.data?.[0])return jsonError(res,400,"این کد حساب پارسیان در سرفصل‌ها وجود ندارد");
    const schoolId=req.session.role==="admin"?Number(req.body?.school_id):Number(req.session.schoolId);
    if(!schoolId)return jsonError(res,400,"مدرسه را انتخاب کنید");

    const sr=await db(`/rest/v1/schools?select=id,name,active&id=eq.${enc(schoolId)}&limit=1`);
    if(!sr.response.ok||!sr.data?.[0])return jsonError(res,400,"مدرسه انتخاب‌شده معتبر نیست");
    if(!isCanonicalSchool(sr.data[0].name))return jsonError(res,400,"مدرسه انتخاب‌شده در فهرست ۹ مدرسه مجاز نیست");
    if(sr.data[0].active===false)return jsonError(res,400,"مدرسه غیرفعال است");

    const dup=await db(`/rest/v1/students?select=id,name&national_id=eq.${enc(nationalId)}&limit=1`);
    if(!dup.response.ok)return jsonError(res,502,"خطا در بررسی کد ملی");
    if(Array.isArray(dup.data)&&dup.data.length)return jsonError(res,400,"این کد ملی قبلاً ثبت شده است");

    const r=await db("/rest/v1/students",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{
      name,grade,phone,national_id:nationalId,school_id:schoolId,parsian_account_code:parsianCode,parsian_account_name:accountCheck.data[0].name,parsian_kol_code:pc.kol,parsian_moeen_code:pc.moeen,parsian_tafsili_code:pc.tafsili
    }])});
    if(!r.response.ok){console.error("STUDENT INSERT",r.data);return jsonError(res,400,"ثبت دانش‌آموز انجام نشد");}
    res.json({success:true,data:r.data?.[0]});
  }catch(e){console.error("STUDENT POST",e.message);jsonError(res,500,"خطای داخلی در ثبت دانش‌آموز");}
});
app.patch("/api/students/:id",requireAuth,async(req,res)=>{
  try{
    const body={};
    if(req.body?.name!==undefined){
      const name=String(req.body.name).trim();
      if(!name)return jsonError(res,400,"نام دانش‌آموز را وارد کنید");
      body.name=name;
    }
    if(req.body?.grade!==undefined){
      const grades=["مهد","اول","دوم","سوم","چهارم","پنجم","ششم"];
      if(!grades.includes(String(req.body.grade).trim()))return jsonError(res,400,"پایه تحصیلی معتبر نیست");
      body.grade=String(req.body.grade).trim();
    }
    if(req.body?.phone!==undefined){
      const p=normalizeDigits(req.body.phone);
      if(!/^0\d{10}$/.test(p))return jsonError(res,400,"شماره تلفن باید مانند 09131112222 باشد");
      body.phone=p;
    }
    if(req.body?.national_id!==undefined){
      const n=normalizeDigits(req.body.national_id);
      if(!/^\d{10}$/.test(n))return jsonError(res,400,"کد ملی باید دقیقاً ۱۰ رقم انگلیسی باشد");
      const dup=await db(`/rest/v1/students?select=id&national_id=eq.${enc(n)}&id=neq.${enc(req.params.id)}&limit=1`);
      if(!dup.response.ok)return jsonError(res,502,"خطا در بررسی کد ملی");
      if(Array.isArray(dup.data)&&dup.data.length)return jsonError(res,400,"این کد ملی قبلاً ثبت شده است");
      body.national_id=n;
    }
    if(req.session.role==="admin"&&req.body?.school_id!==undefined){
      const sid=Number(req.body.school_id);
      if(!sid)return jsonError(res,400,"مدرسه را انتخاب کنید");
      const sr=await db(`/rest/v1/schools?select=id,name,active&id=eq.${enc(sid)}&limit=1`);
      if(!sr.response.ok||!sr.data?.[0]||!isCanonicalSchool(sr.data[0].name))return jsonError(res,400,"مدرسه انتخاب‌شده معتبر نیست");
      if(sr.data[0].active===false)return jsonError(res,400,"مدرسه غیرفعال است");
      body.school_id=sid;
    }
    const school=req.session.role==="admin"?"":`&school_id=eq.${enc(req.session.schoolId)}`;
    if(req.body?.parsian_account_code!==undefined){const pc=parseParsianCode(req.body.parsian_account_code);if(!pc||pc.kol!=="67")return jsonError(res,400,"کد حساب پارسیان نامعتبر است");const ac=await db(`/rest/v1/accounts?select=code,name&code=eq.${enc(req.body.parsian_account_code)}&limit=1`);if(!ac.response.ok||!ac.data?.[0])return jsonError(res,400,"کد حساب پارسیان در سرفصل‌ها یافت نشد");body.parsian_account_code=req.body.parsian_account_code;body.parsian_account_name=ac.data[0].name;body.parsian_kol_code=pc.kol;body.parsian_moeen_code=pc.moeen;body.parsian_tafsili_code=pc.tafsili;}
    const r=await db(`/rest/v1/students?id=eq.${enc(req.params.id)}${school}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(body)});
    if(!r.response.ok)return jsonError(res,400,"ویرایش دانش‌آموز انجام نشد");
    res.json({success:true,data:r.data?.[0]});
  }catch(e){console.error("STUDENT PATCH",e.message);jsonError(res,500,"خطای داخلی در ویرایش دانش‌آموز");}
});
app.post("/api/students/import",requireAuth,upload.single("file"),async(req,res)=>{
  try{
    if(!req.file)return jsonError(res,400,"فایل Excel ارسال نشده است");
    const rows=rowsFromFile(req.file);
    if(rows.length<2)return jsonError(res,400,"فایل خالی است");
    const hs=rows[0].map(x=>String(x||"").trim());
    const data=rows.slice(1).map(r=>rowObject(hs,r));
    const grades=["مهد","اول","دوم","سوم","چهارم","پنجم","ششم"];
    const schoolId=req.session.role==="admin"?Number(req.body?.school_id):Number(req.session.schoolId);
    if(!schoolId)return jsonError(res,400,"مدرسه را انتخاب کنید");

    const sr=await db(`/rest/v1/schools?select=id,name,active&id=eq.${enc(schoolId)}&limit=1`);
    if(!sr.response.ok||!sr.data?.[0]||!isCanonicalSchool(sr.data[0].name))return jsonError(res,400,"مدرسه انتخاب‌شده معتبر نیست");
    if(sr.data[0].active===false)return jsonError(res,400,"مدرسه غیرفعال است");

    const accountsR=await db("/rest/v1/accounts?select=code,name&limit=10000");
    const accountList=accountsR.response.ok?(accountsR.data||[]):[];
    const out=[], skipped=[];
    for(let rowNo=0;rowNo<data.length;rowNo++){
      const o=data[rowNo];
      const name=String(first(o,["name","نام","نام و نام خانوادگی","نام خانوادگی"])||"").trim();
      const grade=String(first(o,["grade","پایه","پایه تحصیلی"])||"").trim();
      const phone=normalizeDigits(first(o,["phone","تلفن","شماره تلفن","موبایل"]));
      const nationalId=normalizeDigits(first(o,["national_id","کد ملی","کدملی"]));
      let parsianCode=String(first(o,["parsian_account_code","کد حساب پارسیان","کد پارسیان"])||"").trim();
      if(!parsianCode){const hit=accountList.find(a=>/^\d+-\d+-67$/.test(String(a.code||""))&&String(a.name||"").includes(name)&&String(a.name||"").includes(grade));if(hit)parsianCode=hit.code;}
      const pc=parseParsianCode(parsianCode);
      if(!name||!grades.includes(grade)||!/^0\d{10}$/.test(phone)||!/^\d{10}$/.test(nationalId)||!pc||pc.kol!=="67"){skipped.push(rowNo+2);continue;}
      const acc=accountList.find(a=>String(a.code)===parsianCode);
      out.push({name,grade,phone,national_id:nationalId,school_id:schoolId,parsian_account_code:parsianCode,parsian_account_name:acc?.name||null,parsian_kol_code:pc.kol,parsian_moeen_code:pc.moeen,parsian_tafsili_code:pc.tafsili});
    }
    if(!out.length)return jsonError(res,400,"هیچ ردیف معتبر قابل ورود پیدا نشد");

    const ids=out.map(x=>x.national_id);
    const existing=[];
    for(const nid of ids){
      const q=await db(`/rest/v1/students?select=national_id&national_id=eq.${enc(nid)}&limit=1`);
      if(q.response.ok&&q.data?.length)existing.push(nid);
    }
    const seen=new Set();
    const clean=out.filter(x=>{
      if(existing.includes(x.national_id)||seen.has(x.national_id)){skipped.push(x.national_id);return false;}
      seen.add(x.national_id);return true;
    });
    if(!clean.length)return jsonError(res,400,"همه ردیف‌ها تکراری یا نامعتبر هستند");

    const r=await db("/rest/v1/students",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(clean)});
    if(!r.response.ok){console.error("STUDENT IMPORT",r.data);return jsonError(res,400,"ورود دانش‌آموزان انجام نشد");}
    res.json({success:true,count:Array.isArray(r.data)?r.data.length:0,skipped:skipped.length});
  }catch(e){console.error("STUDENT IMPORT",e.message);jsonError(res,400,"خواندن فایل دانش‌آموزان انجام نشد");}
});
app.get("/api/students/:id",requireAuth,async(req,res)=>{
  try{
    const sf=req.session.role==="admin"?"":`&school_id=eq.${enc(req.session.schoolId)}`;
    const r=await db(`/rest/v1/students?select=*&id=eq.${enc(req.params.id)}${sf}&limit=1`);
    if(!r.response.ok||!r.data?.[0])return jsonError(res,404,"دانش‌آموز پیدا نشد");
    res.json({success:true,data:r.data[0]});
  }catch(e){jsonError(res,500,"خطای داخلی سرور");}
});
app.get("/api/students/:id/balance",requireAuth,async(req,res)=>{
  try{
    const sf=req.session.role==="admin"?"":`&school_id=eq.${enc(req.session.schoolId)}`;
    const r=await db(`/rest/v1/transactions?select=kind,debit,credit&student_id=eq.${enc(req.params.id)}${sf}&limit=1000`);
    if(!r.response.ok)return jsonError(res,502,"خطا در دریافت بدهی");
    let due=0,paid=0;
    for(const x of r.data||[]){
      if(x.kind==="شهریه_بدهی")due+=Number(x.debit||0);
      if(x.kind==="شهریه")paid+=Number(x.credit||0);
    }
    res.json({success:true,due,paid,balance:Math.max(0,due-paid)});
  }catch(e){jsonError(res,500,"خطای داخلی سرور");}
});
app.get("/api/expense-categories",requireAuth,async(req,res)=>{try{const r=await db(`/rest/v1/expense_categories?select=id,name,active&order=id.asc`);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت لیست هزینه‌ها");res.json({success:true,data:r.data});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});
app.post("/api/expense-categories",requireAuth,requireAdmin,async(req,res)=>{try{if(!req.body?.name)return jsonError(res,400,"نام هزینه الزامی است");const r=await db("/rest/v1/expense_categories",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{name:String(req.body.name).trim(),active:req.body.active!==false}])});if(!r.response.ok)return jsonError(res,400,"ثبت نوع هزینه انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});
app.patch("/api/expense-categories/:id",requireAuth,requireAdmin,async(req,res)=>{try{const body={};if(req.body?.name!==undefined)body.name=String(req.body.name).trim();if(req.body?.active!==undefined)body.active=!!req.body.active;const r=await db(`/rest/v1/expense_categories?id=eq.${enc(req.params.id)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(body)});if(!r.response.ok)return jsonError(res,400,"ویرایش نوع هزینه انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});

app.post("/api/tuition/debt",requireAuth,async(req,res)=>{
  try{
    const amount=money(req.body?.amount),studentId=Number(req.body?.student_id);
    if(!validDate(req.body?.date))return jsonError(res,400,"تاریخ ثبت الزامی و باید معتبر باشد");
    if(!studentId||amount<=0)return jsonError(res,400,"مبلغ یا دانش‌آموز معتبر نیست");
    const sr=await db(`/rest/v1/students?select=id,school_id&id=eq.${enc(studentId)}&limit=1`);
    if(!sr.response.ok||!sr.data?.[0])return jsonError(res,400,"دانش‌آموز پیدا نشد");
    const studentSchool=Number(sr.data[0].school_id);
    if(req.session.role!=="admin"&&studentSchool!==Number(req.session.schoolId))return jsonError(res,403,"دسترسی به این دانش‌آموز مجاز نیست");
    const schoolId=req.session.role==="admin"?(Number(req.body?.school_id)||studentSchool):Number(req.session.schoolId);
    if(schoolId!==studentSchool)return jsonError(res,400,"مدرسه دانش‌آموز با مدرسه انتخاب‌شده یکسان نیست");

    const r=await db("/rest/v1/transactions",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{
      date:req.body.date,
      account:req.body.account||"مطالبات شهریه",
      debit:amount,credit:0,comment:req.body.comment||"ثبت بدهی شهریه",
      kind:"شهریه_بدهی",payment_method:null,tracking_code:null,
      student_id:studentId,school_id:schoolId,reconciled:false
    }])});
    if(!r.response.ok)return jsonError(res,400,"ثبت بدهی انجام نشد");
    res.json({success:true,data:r.data?.[0]});
  }catch(e){console.error("TUITION DEBT",e.message);jsonError(res,400,"مبلغ معتبر نیست");}
});

app.post("/api/tuition/payment",requireAuth,async(req,res)=>{
  try{
    const amount=money(req.body?.amount),studentId=Number(req.body?.student_id);
    if(!validDate(req.body?.date))return jsonError(res,400,"تاریخ ثبت الزامی و باید معتبر باشد");
    if(!studentId||amount<=0)return jsonError(res,400,"مبلغ یا دانش‌آموز معتبر نیست");
    const sr=await db(`/rest/v1/students?select=id,school_id&id=eq.${enc(studentId)}&limit=1`);
    if(!sr.response.ok||!sr.data?.[0])return jsonError(res,400,"دانش‌آموز پیدا نشد");
    const studentSchool=Number(sr.data[0].school_id);
    if(req.session.role!=="admin"&&studentSchool!==Number(req.session.schoolId))return jsonError(res,403,"دسترسی به این دانش‌آموز مجاز نیست");
    const schoolId=req.session.role==="admin"?(Number(req.body?.school_id)||studentSchool):Number(req.session.schoolId);
    if(schoolId!==studentSchool)return jsonError(res,400,"مدرسه دانش‌آموز با مدرسه انتخاب‌شده یکسان نیست");

    const tr=await db(`/rest/v1/transactions?select=kind,debit,credit&student_id=eq.${enc(studentId)}&school_id=eq.${enc(schoolId)}&limit=5000`);
    if(!tr.response.ok)return jsonError(res,502,"خطا در محاسبه بدهی دانش‌آموز");
    let due=0,paid=0;
    for(const x of tr.data||[]){
      if(x.kind==="شهریه_بدهی")due+=Number(x.debit||0);
      if(x.kind==="شهریه")paid+=Number(x.credit||0);
    }
    const balance=Math.max(0,due-paid);
    if(amount>balance)return jsonError(res,400,`مبلغ پرداختی بیشتر از بدهی است. بدهی فعلی: ${balance}`);

    const r=await db("/rest/v1/transactions",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{
      date:req.body.date,
      account:req.body.account||"بانک",debit:0,credit:amount,
      comment:req.body.comment||"پرداخت شهریه",kind:"شهریه",
      payment_method:req.body.payment_method||"بانک",
      tracking_code:req.body.tracking_code||null,
      student_id:studentId,school_id:schoolId,reconciled:false
    }])});
    if(!r.response.ok)return jsonError(res,400,"ثبت شهریه انجام نشد");
    res.json({success:true,data:r.data?.[0],balance_after:balance-amount});
  }catch(e){console.error("TUITION PAYMENT",e.message);jsonError(res,400,"مبلغ معتبر نیست");}
});
app.post("/api/expenses",requireAuth,async(req,res)=>{try{const amount=money(req.body?.amount),categoryId=Number(req.body?.category_id);if(!validDate(req.body?.date))return jsonError(res,400,"تاریخ ثبت الزامی است");if(amount<=0||!categoryId)return jsonError(res,400,"نوع هزینه و مبلغ الزامی است");const schoolId=req.session.role==="admin"?Number(req.body.school_id):req.session.schoolId;const r=await db("/rest/v1/transactions",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{date:req.body.date,account:req.body.account||"هزینه",debit:amount,credit:0,comment:req.body.comment||"",kind:"هزینه",payment_method:req.body.payment_method||"بانک",tracking_code:req.body.tracking_code||null,student_id:null,school_id:schoolId,reconciled:false}])});if(!r.response.ok)return jsonError(res,400,"ثبت هزینه انجام نشد");const tx=r.data?.[0];const patch={comment:`[expense_category_id=${categoryId}] ${req.body.comment||""}`};await db(`/rest/v1/transactions?id=eq.${enc(tx.id)}`,{method:"PATCH",body:JSON.stringify(patch)});res.json({success:true,data:tx});}catch(e){jsonError(res,400,"مبلغ معتبر نیست");}});

app.post("/api/attachments",requireAuth,imageUpload.single("file"),async(req,res)=>{try{if(!req.file)return jsonError(res,400,"فایل ارسال نشده است");const type=req.body.entity_type, id=Number(req.body.entity_id);if(!["tuition","expense"].includes(type)||!id)return jsonError(res,400,"اطلاعات پیوست نامعتبر است");const meta=await sharp(req.file.buffer).metadata();if(!String(meta.format||"").match(/jpeg|jpg|png|webp/i))return jsonError(res,400,"فقط تصویر مجاز است");const buffer=await sharp(req.file.buffer).rotate().resize({width:1600,height:1600,fit:"inside",withoutEnlargement:true}).jpeg({quality:60,mozjpeg:true}).withMetadata({density:96}).toBuffer();const path=`${req.session.schoolId||"admin"}/${type}/${id}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}.jpg`;const url=await storageUpload(path,buffer,"image/jpeg");const r=await db("/rest/v1/attachments",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify([{entity_type:type,entity_id:id,school_id:req.session.schoolId||null,file_url:url,file_name:req.file.originalname||"image.jpg",mime_type:"image/jpeg",size_bytes:buffer.length,dpi:96}])});if(!r.response.ok)return jsonError(res,400,"ذخیره پیوست انجام نشد");res.json({success:true,data:r.data?.[0]});}catch(e){console.error("UPLOAD",e.message);jsonError(res,400,"آپلود تصویر انجام نشد");}});

app.post("/api/bank/upload",requireAuth,requireAdmin,upload.single("file"),async(req,res)=>{try{if(!req.file)return jsonError(res,400,"فایل بانک ارسال نشده است");const rows=rowsFromFile(req.file);if(!rows.length)return jsonError(res,400,"فایل خالی است");const hs=rows[0].map(x=>String(x).trim());const data=rows.slice(1).map(r=>rowObject(hs,r));const inserted=[];for(const o of data){const amount=Math.abs(Number(String(first(o,["Bed","بدهکار","مبلغ","Amount","credit"])).replace(/,/g,""))||0);if(!amount)continue;inserted.push({bank_date:first(o,["SanadDate","تاریخ","Date"]),amount,account:first(o,["HesabName","حساب"]),comment:first(o,["Comment","شرح"]),tracking_code:first(o,["TrackingCode","tracking_code","پیگیری"]),raw:o,school_id:req.body.school_id?Number(req.body.school_id):null});}if(!inserted.length)return jsonError(res,400,"تراکنش قابل استفاده‌ای در فایل پیدا نشد");const r=await db("/rest/v1/bank_transactions",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(inserted)});if(!r.response.ok)return jsonError(res,400,"ذخیره فایل بانک انجام نشد");res.json({success:true,count:r.data?.length||0});}catch(e){console.error("BANK",e.message);jsonError(res,400,"خواندن فایل بانک انجام نشد");}});
app.post("/api/bank/reconcile",requireAuth,requireAdmin,async(req,res)=>{try{const school=req.body?.school_id?`&school_id=eq.${enc(req.body.school_id)}`:"";const br=await db(`/rest/v1/bank_transactions?select=*&reconciled=eq.false&order=id.asc&limit=5000${school}`);if(!br.response.ok)return jsonError(res,502,"خطا در دریافت تراکنش‌های بانک");const tr=await db(`/rest/v1/transactions?select=*&kind=in.(شهریه,هزینه)&reconciled=eq.false&limit=10000${school}`);if(!tr.response.ok)return jsonError(res,502,"خطا در دریافت تراکنش‌ها");const used=new Set(),matched=[],unmatched=[];const norm=s=>String(s||"").replace(/[\\s‌\-()]/g,"").replace(/ي/g,"ی").replace(/ك/g,"ک").toLowerCase();for(const b of br.data||[]){let candidate=null;for(const t of tr.data||[]){if(used.has(t.id))continue;const ta=Number(t.kind==="هزینه"?t.debit:t.credit);if(ta!==Number(b.amount))continue;const track=String(b.tracking_code||"").trim(),tt=String(t.tracking_code||"").trim();const bc=norm(b.comment),tc=norm(t.comment);if(track&&tt&&track===tt){candidate=t;break;}if(bc&&tc&&(bc.includes(tc)||tc.includes(bc))){candidate=t;break;}}if(candidate){used.add(candidate.id);matched.push([b.id,candidate.id]);}else unmatched.push(b.id);}for(const [bid,tid] of matched){await db(`/rest/v1/bank_transactions?id=eq.${enc(bid)}`,{method:"PATCH",body:JSON.stringify({reconciled:true,matched_transaction_id:tid})});await db(`/rest/v1/transactions?id=eq.${enc(tid)}`,{method:"PATCH",body:JSON.stringify({reconciled:true})});}res.json({success:true,matched:matched.length,unmatched:unmatched.length,unmatched_ids:unmatched});}catch(e){console.error("RECONCILE",e.message);jsonError(res,500,"تطبیق تراکنش‌ها انجام نشد");}});
app.get("/api/bank/unmatched",requireAuth,requireAdmin,async(req,res)=>{try{const r=await db(`/rest/v1/bank_transactions?select=*&reconciled=eq.false&order=id.desc&limit=500`);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت تراکنش‌ها");res.json({success:true,data:r.data});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});
app.post("/api/bank/:id/return",requireAuth,requireAdmin,async(req,res)=>{try{const message="این تراکنش در داده های دریافتی از بانک یافت نشد، لطفا پیگیری بفرمایید.";const r=await db(`/rest/v1/bank_transactions?id=eq.${enc(req.params.id)}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({status:"returned",return_message:message})});if(!r.response.ok)return jsonError(res,400,"مرجوع کردن تراکنش انجام نشد");res.json({success:true,message});}catch(e){jsonError(res,500,"خطای داخلی سرور");}});

app.patch("/api/transactions/:id",requireAuth,async(req,res)=>{
  try{
    const id=Number(req.params.id);
    if(!id)return jsonError(res,400,"شناسه تراکنش نامعتبر است");
    const sf=req.session.role==="admin"?"":`&school_id=eq.${enc(req.session.schoolId)}`;
    const current=await db(`/rest/v1/transactions?select=*&id=eq.${enc(id)}${sf}&limit=1`);
    if(!current.response.ok||!current.data?.[0])return jsonError(res,404,"تراکنش پیدا نشد");
    const t=current.data[0];
    const body={reconciled:false};
    if(req.body?.date!==undefined){if(!validDate(req.body.date))return jsonError(res,400,"تاریخ نامعتبر است");body.date=req.body.date;}
    if(t.kind==="شهریه_بدهی"){
      const amount=money(req.body?.amount);
      if(amount<=0)return jsonError(res,400,"مبلغ بدهی معتبر نیست");
      body.debit=amount; body.credit=0;
      if(req.body?.comment!==undefined)body.comment=String(req.body.comment||"ثبت بدهی شهریه");
    }else if(t.kind==="شهریه"){
      const amount=money(req.body?.amount);
      if(amount<=0)return jsonError(res,400,"مبلغ پرداختی معتبر نیست");
      const all=await db(`/rest/v1/transactions?select=id,kind,debit,credit&student_id=eq.${enc(t.student_id)}&school_id=eq.${enc(t.school_id)}&limit=5000`);
      if(!all.response.ok)return jsonError(res,502,"خطا در محاسبه بدهی دانش‌آموز");
      let due=0,otherPaid=0;
      for(const x of all.data||[]){if(x.kind==="شهریه_بدهی")due+=Number(x.debit||0);if(x.kind==="شهریه"&&Number(x.id)!==id)otherPaid+=Number(x.credit||0);}
      if(amount>Math.max(0,due-otherPaid))return jsonError(res,400,`مبلغ پرداختی بیشتر از بدهی مجاز است. سقف پرداخت: ${Math.max(0,due-otherPaid)}`);
      body.credit=amount; body.debit=0;
      if(req.body?.comment!==undefined)body.comment=String(req.body.comment||"پرداخت شهریه");
      if(req.body?.tracking_code!==undefined)body.tracking_code=String(req.body.tracking_code||"");
    }else if(t.kind==="هزینه"){
      const amount=money(req.body?.amount);
      const categoryId=Number(req.body?.category_id);
      if(amount<=0||!categoryId)return jsonError(res,400,"نوع هزینه و مبلغ الزامی است");
      const cat=await db(`/rest/v1/expense_categories?select=id,name&id=eq.${enc(categoryId)}&limit=1`);
      if(!cat.response.ok||!cat.data?.[0])return jsonError(res,400,"نوع هزینه معتبر نیست");
      const oldComment=String(req.body?.comment||"");
      body.debit=amount; body.credit=0;
      body.comment=`[expense_category_id=${categoryId}] ${oldComment}`;
    }else{
      return jsonError(res,400,"این نوع تراکنش قابل ویرایش نیست");
    }
    const r=await db(`/rest/v1/transactions?id=eq.${enc(id)}${sf}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(body)});
    if(!r.response.ok)return jsonError(res,400,"ویرایش تراکنش انجام نشد");
    res.json({success:true,data:r.data?.[0]});
  }catch(e){console.error("TRANSACTION PATCH",e.message);jsonError(res,400,"ویرایش تراکنش انجام نشد");}
});

app.delete("/api/transactions/:id",requireAuth,async(req,res)=>{try{const id=Number(req.params.id);const sf=req.session.role==="admin"?"":`&school_id=eq.${enc(req.session.schoolId)}`;const cur=await db(`/rest/v1/transactions?select=id,kind,reconciled&id=eq.${enc(id)}${sf}&limit=1`);if(!cur.response.ok||!cur.data?.[0])return jsonError(res,404,"تراکنش پیدا نشد");if(cur.data[0].reconciled)return jsonError(res,400,"تراکنش تطبیق‌شده قابل حذف نیست");if(!["شهریه","شهریه_بدهی","هزینه"].includes(cur.data[0].kind))return jsonError(res,400,"این تراکنش قابل حذف نیست");const r=await db(`/rest/v1/transactions?id=eq.${enc(id)}${sf}`,{method:"DELETE",headers:{Prefer:"return=representation"}});if(!r.response.ok)return jsonError(res,400,"حذف تراکنش انجام نشد");res.json({success:true});}catch(e){jsonError(res,500,"حذف تراکنش انجام نشد");}});
app.get("/api/bank/review",requireAuth,requireAdmin,async(req,res)=>{try{const r=await db(`/rest/v1/transactions?select=*&order=id.desc&limit=5000`);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت تراکنش‌ها");res.json({success:true,data:r.data||[]});}catch(e){jsonError(res,500,"خطا در دریافت تراکنش‌ها");}});
app.get("/api/transactions",requireAuth,async(req,res)=>{try{
  let q=`/rest/v1/transactions?select=*&order=id.desc&limit=5000`;
  if(req.query.kind)q+=`&kind=eq.${enc(req.query.kind)}`;
  if(req.query.student_id)q+=`&student_id=eq.${enc(req.query.student_id)}`;
  if(req.session.role!=="admin")q+=`&school_id=eq.${enc(req.session.schoolId)}`;
  const r=await db(q);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت تراکنش‌ها");
  const data=r.data||[];
  const cats=await db("/rest/v1/expense_categories?select=id,name&limit=5000");
  const catMap=new Map((cats.data||[]).map(x=>[Number(x.id),x.name]));
  const ids=[...new Set(data.map(x=>Number(x.student_id)).filter(Boolean))];
  let students=[];
  if(ids.length){const sq=ids.map(id=>`id.eq.${enc(id)}`).join(",");const sr=await db(`/rest/v1/students?select=id,name,grade&or=(${sq})&limit=5000`);students=sr.data||[];}
  const smap=new Map(students.map(x=>[Number(x.id),x]));
  for(const x of data){
    const m=String(x.comment||"").match(/expense_category_id=(\d+)/);
    if(m)x.expense_category_name=catMap.get(Number(m[1]))||"هزینه‌های متفرقه";
    const st=smap.get(Number(x.student_id));if(st){x.student_name=st.name;x.student_grade=st.grade;}
  }
  res.json({success:true,data});
}catch(e){console.error("TRANSACTIONS GET",e.message);jsonError(res,500,"خطا در دریافت تراکنش‌ها");}});

app.get("/api/export/parsiان",requireAuth,requireAdmin,async(req,res)=>exportParsian(req,res));
app.get("/api/export/parsian",requireAuth,requireAdmin,async(req,res)=>exportParsian(req,res));
async function exportParsian(req,res){
  try{
    let q="/rest/v1/transactions?select=*&order=id.asc&limit=10000&reconciled=eq.true&kind=in.(شهریه,هزینه)";
    if(req.query.school_id)q+=`&school_id=eq.${enc(req.query.school_id)}`;
    const r=await db(q);if(!r.response.ok)return jsonError(res,502,"خطا در دریافت اطلاعات حسابداری");
    const accountsR=await db("/rest/v1/accounts?select=code,name&limit=10000");if(!accountsR.response.ok)return jsonError(res,502,"خطا در دریافت سرفصل حساب‌ها");
    const accounts=accountsR.data||[];const byCode=new Map(accounts.map(a=>[String(a.code||"").trim(),a]));const byName=new Map(accounts.map(a=>[String(a.name||"").trim(),a]));
    const studentsR=await db("/rest/v1/students?select=id,name,grade,school_id,parsian_account_code,parsian_account_name,parsian_kol_code,parsian_moeen_code,parsian_tafsili_code&limit=10000");const students=new Map((studentsR.data||[]).map(x=>[Number(x.id),x]));
    const schoolsR=await db("/rest/v1/schools?select=id,name&limit=100");const schools=new Map((schoolsR.data||[]).map(x=>[Number(x.id),String(x.name||"").trim()]));
    const catsR=await db("/rest/v1/expense_categories?select=id,name&limit=500");const cats=new Map((catsR.data||[]).map(x=>[Number(x.id),String(x.name||"").trim()]));
    const header=["ID","KolCode","MoeenCode","TafsiliCode","HesabName","Comment","Bed","Bes","Factor_Num","Tick","SanadComment","ChkNum","IsRecPayChk","CostCenterCode"];const rows=[];let id=1;
    function parts(code){const p=String(code||"").split("-");if(p.length!==3)return ["","",""];return [p[2],p[1],p[0]];}
    function add(name,comment,bed,bes){const a=byName.get(String(name||"").trim())||byCode.get(String(name||"").trim());if(!a)return jsonError(res,400,`حساب پارسیان «${name}» در سرفصل‌ها یافت نشد`);const [kol,moe,taf]=parts(a.code);rows.push({ID:id++,KolCode:kol,MoeenCode:moe,TafsiliCode:taf,HesabName:a.name,Comment:comment||"",Bed:Number(bed||0),Bes:Number(bes||0),Factor_Num:0,Tick:false,SanadComment:"",ChkNum:"",IsRecPayChk:"",CostCenterCode:""});}
    function categoryKey(cat){const n=String(cat||"");if(n.includes("تخفیف"))return "تخفیف";if(n.includes("پذیرایی"))return "پذیرایی";if(n.includes("تلفن"))return "تلفن";if(n.includes("اینترنت"))return "اینترنت";if(n.includes("متفرقه"))return "متفرقه";if(n.includes("عمرانی"))return "عمرانی";if(n.includes("آب")||n.includes("برق")||n.includes("گاز"))return "آب";return n;}
    const generic={"آب":"0-4-50","برق":"0-4-50","گاز":"0-4-50","پذیرایی":"0-305-50","عمرانی":"0-309-50","متفرقه":"0-8-50","اینترنت":"0-311-50","تلفن":"0-5-50","تخفیف":"0-302-50"};
    function expenseCode(cat,school){const k=categoryKey(cat);const map=PARSIAN_EXPENSE_CODES[school]||{};return map[k]||generic[k]||null;}
    for(const t of r.data||[]){const amount=Number(t.debit||0)||Number(t.credit||0);if(amount<=0)continue;let comment=String(t.comment||"").trim();if(t.kind==="هزینه"){const m=comment.match(/^\\[expense_category_id=(\\d+)\\]\\s*(.*)$/);const cat=m?cats.get(Number(m[1]))||"":t.account||"هزینه";comment=m?m[2]||"":comment;const school=schools.get(Number(t.school_id))||"";const code=expenseCode(cat,school);if(!code)return jsonError(res,400,`کد پارسیان برای هزینه «${cat}» در مدرسه «${school}» تعریف نشده است`);add(code,comment||"پرداخت هزینه",amount,0);add("0-1-11",comment||"پرداخت هزینه",0,amount);}else if(t.kind==="شهریه"){const st=students.get(Number(t.student_id));if(!st)return jsonError(res,400,"دانش‌آموز تراکنش شهریه پیدا نشد");const code=st.parsian_account_code;if(!parseParsianCode(code))return jsonError(res,400,`کد پارسیان دانش‌آموز «${st.name||"نامشخص"}» تعریف نشده است`);add("0-1-11",comment||"بابت پرداخت شهریه",amount,0);add(code,comment||"بابت پرداخت شهریه",0,amount);}}
    const ws=XLSX.utils.json_to_sheet(rows,{header});const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Sheet1");const buf=XLSX.write(wb,{type:"buffer",bookType:"xlsx"});res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");res.setHeader("Content-Disposition",`attachment; filename="parsian-${Date.now()}.xlsx"`);res.send(buf);
  }catch(e){console.error("PARSian EXPORT",e.message);jsonError(res,500,"ساخت فایل حسابداری انجام نشد");}
}
