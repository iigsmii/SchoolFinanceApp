/* Node-only, in-memory Apps Script mocks. Never connects to Google or live data. */
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'..','SchoolFinanceApp_GoogleAppsScript_FINAL.gs'),'utf8');
const store={},cache=new Map(),props=new Map();let uuid=0,held=false;
class Sheet{
  constructor(name,headers){this.name=name;this.cells=[headers.slice()];}
  getLastRow(){let n=this.cells.length;while(n>0&&this.cells[n-1].every(v=>v===''||v===undefined))n--;return n;}
  getLastColumn(){return Math.max(1,...this.cells.map(r=>r.length));}
  getMaxRows(){return 10000;}
  appendRow(row){if(this.failAppend){this.failAppend=false;throw Error('Injected append failure');}this.cells[this.getLastRow()]=row.slice();return this;}
  setFrozenRows(){}
  getRange(r,c,n=1,m=1){
    const sh=this;return{
      getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>sh.cells[r-1+i]?.[c-1+j]??'')),
      getDisplayValues(){return this.getValues().map(row=>row.map(String));},
      setValues(values){for(let i=0;i<n;i++)for(let j=0;j<m;j++){sh.cells[r-1+i]??=[];sh.cells[r-1+i][c-1+j]=values[i][j];}return this;},
      setValue(v){sh.cells[r-1]??=[];sh.cells[r-1][c-1]=v;return this;},
      setNumberFormat(){return this;},
      clearContent(){return this.setValues(Array.from({length:n},()=>Array(m).fill('')));}
    };
  }
}
const context=vm.createContext({
  console,Date,JSON,Math,
  SpreadsheetApp:{openById:()=>({getSheetByName:n=>store[n],insertSheet:n=>(store[n]=new Sheet(n,[]))}),flush(){}},
  LockService:{getScriptLock:()=>({waitLock(){if(held)throw Error('Nested write lock');held=true;},releaseLock(){held=false;}})},
  CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>props.set(k,v),deleteProperty:k=>props.delete(k)})},
  Utilities:{
    getUuid:()=>`00000000-0000-4000-8000-${String(++uuid).padStart(12,'0')}`,
    DigestAlgorithm:{SHA_256:'sha256'},Charset:{UTF_8:'utf8'},
    computeDigest:(_,s)=>Array.from(crypto.createHash('sha256').update(String(s)).digest()),
    formatDate:(d,tz,format)=>format==='yyyy-MM-dd'?d.toISOString().slice(0,10):d.toISOString().replace('T',' ').slice(0,19),
    base64Decode:s=>Array.from(Buffer.from(s,'base64')),base64Encode:s=>Buffer.from(s).toString('base64'),newBlob:()=>({})
  },
  Session:{getScriptTimeZone:()=> 'Asia/Tehran'},
  ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>s})},
  DriveApp:{getFileById:()=>({getSize:()=>1,getBlob:()=>({getBytes:()=>[0]})}),getFoldersByName:()=>({hasNext:()=>true,next:()=>({createFile:()=>({getUrl:()=> 'https://example.invalid/private',getId:()=> 'private-file'})})})}
});
vm.runInContext(source,context);
const run=code=>vm.runInContext(code,context);
const headers=run('HEADERS');
for(const [name,h]of Object.entries(headers))store[name]=new Sheet(name,h);
store.Managers.appendRow([1,'Senior','admin',run("sha256_('test-password-long')"),'','senior',true,'']);
store.Managers.appendRow([2,'Manager','manager',run("sha256_('manager-password')"),'1','manager',true,'']);
store.Schools.appendRow([1,'School 1','S1',true,'']);store.Schools.appendRow([2,'School 2','S2',true,'']);
store.Students.appendRow([1,'Student 1','اول','09120000000','0012345678','1','67','3','0012345678',true,'']);
store.Students.appendRow([2,'Student 2','اول','09120000001','0012345679','2','67','4','0012345679',true,'']);
const senior=run("login_({username:'admin',password:'test-password-long'})").token;
const manager=run("login_({username:'manager',password:'manager-password'})").token;
context.senior=senior;context.manager=manager;
let passed=0;
function test(name,f){f();passed++;console.log('PASS '+name);}
const call=(fn,b)=>{context.input=b;return run(`${fn}(input)`);};
const post=b=>JSON.parse(call('doPost',{postData:{contents:JSON.stringify(b)}}));
const base={token:manager,student_id:1,school_id:1,type:'payment',payment_method:'پول نقد',amount:100,date:'2026-10-15'};
test('strict date validation',()=>{assert.throws(()=>call('date_','2026-09-31'));assert.throws(()=>call('date_',''));assert.equal(call('date_','2026-10-15'),'2026-10-15');});
test('strict money rejects negative, decimal, junk and unsafe integers',()=>{for(const a of ['-100','1.5','abc100','9007199254740992'])assert.throws(()=>call('amount_',a));assert.equal(call('amount_','۱٬۰۰۰'),1000);});
test('cross-school tuition rejected',()=>assert.throws(()=>call('tuitionAdd_',{...base,student_id:2})));
test('source and ledger created once; real source id preserved',()=>{const a=call('tuitionAdd_',base);assert.equal(a.id,1);assert.equal(store.Tuition.getLastRow(),2);assert.equal(store.Transactions.getLastRow(),2);});
test('tuition update mirrors ledger and preserves cash method',()=>{call('tuitionUpdate_',{token:manager,id:1,amount:150,date:'2026-10-14'});assert.equal(run("findRow_('Transactions',1).obj.amount"),150);assert.equal(run("findRow_('Tuition',1).obj.payment_source"),'پول نقد');});
test('soft delete removes balances and only the correct source kind',()=>{
  store.Expenses.appendRow([1,'2026-10-15','1','test',70,'','','',2,'',false,false,'bank']);
  store.Transactions.appendRow([2,'2026-10-15','1','expense',70,'','','',2,'',false,false,1,'bank']);
  call('tuitionDelete_',{token:manager,id:1});
  assert.equal(run("rows_('Tuition').length"),0);assert.equal(run("rows_('Transactions').length"),1);
  assert.equal(run("nextId_('Tuition')"),2);
});
test('pair compensation on ledger append failure',()=>{
  const before=run("rows_('Tuition').length");store.Transactions.failAppend=true;
  assert.throws(()=>call('tuitionAdd_',base));assert.equal(run("rows_('Tuition').length"),before);
});
test('cross-school attachment rejected before creating Drive file',()=>assert.throws(()=>call('attachment_',{token:manager,base64:'AA==',source_type:'tuition',source_id:999})));
test('new attachments remain private',()=>{const a=run("saveAttachment_('AA==','receipt.jpg','image/jpeg','file1',2,'general','')");assert.equal(a.file_id,'private-file');});
test('unsupported attachment MIME rejected',()=>assert.throws(()=>run("saveAttachment_('AA==','a.exe','application/x-msdownload','x',2,'general','')")));
test('duplicate cheque ID rejected',()=>{
  const b={...base,payment_method:'چک',sayad_id:'1234567890123456',due_date:'2026-11-01',in_favor_school:true};
  call('tuitionAdd_',b);assert.throws(()=>call('tuitionAdd_',b));
});
test('approved records cannot be edited',()=>{
  store.Transactions.appendRow([5,'2026-10-15','1','expense',70,'','','',2,'',false,true,1,'bank']);
  assert.throws(()=>call('transactionUpdate_',{token:senior,id:5,amount:80}));
});
test('manual matching preserves separate approval',()=>{
  store.Transactions.appendRow([6,'2026-10-15','1','payment',500,'','T1','',2,'',false,false,8,'کارت به کارت']);
  store.Bank.appendRow([1,'2026-10-15','1',500,'','T1','','','',false,false]);
  call('bankMatch_',{token:senior,id:1,transaction_id:6});
  assert.equal(run("findRow_('Transactions',6).obj.approved"),false);
  assert.equal(run("findRow_('Bank',1).obj.matched_transaction_id"),'6');
});
test('automatic matching never guesses between duplicate references',()=>{
  store.Transactions.appendRow([7,'2026-10-15','1','payment',600,'','DUP','',2,'',false,false,9,'کارت به کارت']);
  store.Bank.appendRow([2,'2026-10-15','1',600,'','DUP','','','',false,false]);
  store.Bank.appendRow([3,'2026-10-15','1',600,'','DUP','','','',false,false]);
  call('bankReconcile_',{token:senior});
  assert.equal(run("findRow_('Transactions',7).obj.reconciled"),false);
});
test('cash is not bank eligible',()=>assert.equal(call('bankEligible_',{kind:'payment',payment_source:'پول نقد'}),false));
test('disabled accounts lose existing sessions',()=>{
  store.Managers.cells[2][6]=false;assert.throws(()=>call('auth_',{token:manager}));store.Managers.cells[2][6]=true;
});
test('expired session rejected',()=>{
  cache.set('sess_expired',JSON.stringify({id:1,expires_at:1}));assert.throws(()=>call('auth_',{token:'expired'}));
});
test('durable financial idempotency replays success, never writes twice',()=>{
  const b={...base,action:'tuition_add',request_id:'request-0000000000000001'};
  const a=post(b);assert.equal(a.success,true);
  const n=run("rows_('Tuition').length");const again=post(b);
  assert.equal(again.id,a.id);assert.equal(run("rows_('Tuition').length"),n);assert.equal(held,false);
});
test('idempotency key payload mismatch rejected',()=>{
  const a=post({...base,amount:999,action:'tuition_add',request_id:'request-0000000000000001'});
  assert.equal(a.success,false);
});
test('uncertain failed write is never replayed',()=>{
  store.Transactions.failAppend=true;
  const b={...base,action:'tuition_add',request_id:'request-0000000000000002'};
  assert.equal(post(b).needs_review,true);const n=run("rows_('Tuition').length");
  assert.equal(post(b).needs_review,true);assert.equal(run("rows_('Tuition').length"),n);
});
test('students read leaves physical cells unchanged',()=>{
  const before=JSON.stringify(store.Students.cells);call('students_',{token:manager});
  assert.equal(JSON.stringify(store.Students.cells),before);
});
test('read-only POST bypasses write lock',()=>{
  held=true;assert.equal(post({action:'summary',token:manager}).success,true);assert.equal(held,true);held=false;
});
test('corrupt DONE response becomes review instead of unsafe retry',()=>{
  const request=run("rows_('Requests').find(x=>x.obj.id==='request-0000000000000001')");
  store.Requests.getRange(request.row,6).setValue('not valid json');
  assert.equal(post({...base,action:'tuition_add',request_id:'request-0000000000000001'}).needs_review,true);
});
test('cheque attachment uses Cheques, not Tuition',()=>{
  call('attachment_',{token:manager,source_type:'cheque',source_id:1,base64:'AA==',file_name:'cheque.jpg',mime_type:'image/jpeg'});
  assert.equal(run("findRow_('Cheques',1).obj.image_url"),'https://example.invalid/private');
});
test('private attachment reader enforces school access',()=>{
  store.Attachments.appendRow(['foreign','tuition',999,'a.jpg','image/jpeg','foreign-file','https://example.invalid/foreign',99,'']);
  assert.throws(()=>call('attachmentRead_',{token:manager,url:'https://example.invalid/foreign'}));
});
test('manual bank match rejects cheque payments',()=>{
  store.Transactions.appendRow([20,'2026-10-15','1','payment',700,'','1234567890123456','',2,'',false,true,20,'چک']);
  store.Bank.appendRow([20,'2026-10-15','1',700,'برگشت چک','1234567890123456','','','',false,false]);
  assert.throws(()=>call('bankMatch_',{token:senior,id:20,transaction_id:20}));
});
test('bounced cheque payment no longer reduces the student balance',()=>{
  store.Tuition.appendRow([20,'2026-10-15',1,'1','payment',700,'','1234567890123456','',2,'',false,true,'چک']);
  const cheque=run("findRow_('Cheques',1)");store.Cheques.getRange(cheque.row,5).setValue(700);store.Cheques.getRange(cheque.row,14).setValue('approved');
  call('bankReconcile_',{token:senior});
  assert.equal(run("findRow_('Cheques',1).obj.status"),'bounced');
  assert.equal(run("findRow_('Tuition',20)"),null);assert.equal(run("findRow_('Transactions',20)"),null);
});
test('unsupported bank CSV cannot report false success',()=>assert.throws(()=>call('importBankCsv_',{})));
console.log(`\n${passed} backend regression tests passed (mocked, not live Apps Script).`);
