const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {NextRequest,NextResponse}=require('next/server');
for (const sunday of [false,true]) test(`weekly range and day mapping, Sunday start=${sunday}`,async()=>{
 const pipelines=[];
 const modules={
  'next/server':{NextResponse},mongoose:require('mongoose'),'date-fns':require('date-fns'),
  '@/lib/db':{connectDB:async()=>{}},
  '@/lib/getAuthUser':{getAuthUser:async()=>({userId:'507f1f77bcf86cd799439011'})},
  '@/lib/apiResponse':{apiErrorResponse:e=>{throw e}},
  '@/models/UserActivityLogs':{UserActivityLogs:{aggregate:async p=>{pipelines.push(p);return pipelines.length===1?[{_id:7,totalWatched:12},{_id:1,totalWatched:5}]:[]}}},
 };
 const context={exports:{},require:n=>modules[n]};
 const source=ts.transpileModule(fs.readFileSync('src/app/api/users/total-meditation/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 vm.runInNewContext(source,context);
 const response=await context.exports.GET(new NextRequest('http://localhost/api/users/total-meditation'+(sunday?'?weekStartsOn=0':'')));
 const {data}=await response.json();
 const range=pipelines[0][0].$match.createdAt;
 assert.equal(range.$gte.getDay(),sunday?0:1);
 assert.equal(range.$lte.getDay(),sunday?6:0);
 assert.equal(data.week[0].day,sunday?'Sun':'Mon');
 assert.equal(data.week[6].day,sunday?'Sat':'Sun');
 assert.equal(data.week.find(d=>d.day==='Sun').value,12);
 assert.equal(data.week.find(d=>d.day==='Mon').value,5);
 assert.equal(pipelines[1][0].$match.createdAt.$gte.getTime(),range.$gte.getTime());
});
