const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../teacher-notes.html','utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
async function load(options={}){
 const els={},queries=[];const get=id=>els[id]??={hidden:true,innerHTML:'',textContent:''};
 const notes=options.notes||[{category:'نسيان الكتاب',kind:'غير سلوكية',date:'2026-11-25'},{category:'التحدث الجانبي',kind:'سلوكية',date:'2026-11-24'},{category:'نسيان الكتاب',kind:'غير سلوكية',date:'2026-11-23'},{category:' نسيان  الكتاب ',kind:'غير سلوكية',date:'2026-11-22'},{category:'التحدث الجانبي',kind:'سلوكية',date:'2026-11-21'},{category:'نشاط متميز',kind:'إيجابية',date:'2026-11-20'}];
 const db={collection:name=>({doc:()=>({get:async()=>({exists:options.exists!==false,data:()=>name==='students'?{name:'طالب تجريبي',grade:'3',section:'أ'}:{enabled:options.enabled!==false}})}),where:(field,op,value)=>({get:async()=>{queries.push({field,op,value});if(options.fail)throw Error('offline');return {docs:notes.map(n=>({data:()=>n}))}}})})};
 const ctx=vm.createContext({document:{getElementById:get},window:{RasedStudentSSO:{getSession:()=>options.signedOut?null:{code:'student-one'}}},firebase:{initializeApp(){},firestore:()=>db}});
 vm.runInContext(script,ctx);await vm.runInContext('loadNotes()',ctx);return {ctx,els,queries,get};
}
module.exports=(async()=>{
 const normal=await load();assert.equal(normal.get('notesSummary').hidden,false,'summary shown below records');const summary=normal.get('notesSummary').innerHTML;assert(summary.includes('نسيان الكتاب'));assert(summary.includes('التحدث الجانبي'));assert(!summary.includes('نشاط متميز'),'only displayed notes counted');assert(summary.includes('<td>3</td>'));assert(summary.includes('<td>2</td>'));assert.equal(normal.get('totalNotes').textContent,5);assert(summary.includes('إجمالي الملاحظات: 5'));assert(summary.includes('عدد الأنواع: 2'));assert(summary.indexOf('نسيان الكتاب')<summary.indexOf('التحدث الجانبي'));assert.deepEqual(normal.queries,[{field:'studentCode',op:'==',value:'student-one'}]);
 const malicious=await load({notes:[{category:'<img src=x onerror=alert(1)>',kind:'سلوكية'}]});assert(!malicious.get('notesSummary').innerHTML.includes('<img'));assert(malicious.get('notesSummary').innerHTML.includes('&lt;img'));
 for(const options of [{notes:[]},{enabled:false},{signedOut:true},{exists:false},{fail:true}]){const result=await load(options);assert.equal(result.get('notesSummary').hidden,true,'no summary for unavailable notes');assert.equal(result.get('notesSummary').innerHTML,'');}
 normal.ctx.window.RasedStudentSSO.getSession=()=>null;await vm.runInContext('loadNotes()',normal.ctx);assert.equal(normal.get('notesSummary').hidden,true,'stale summary cleared on reload');assert.equal(normal.get('notesSummary').innerHTML,'');
 assert(html.indexOf('id="notesSummary"')>html.indexOf('id="notes"'),'summary follows the full history');
 assert(fs.readFileSync(__dirname+'/../index.html','utf8').includes('teacher-notes.html?v=20261126-notes-summary-1'));
 console.log('PASS: per-type counts, whitespace normalization, displayed-note scope, sorting, total, escaped labels, empty/hidden/error/signed-out states, reset and summary placement.');
})();
