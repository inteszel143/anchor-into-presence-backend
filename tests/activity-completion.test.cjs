const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const mongoose=require('mongoose');
const {NextResponse}=require('next/server');
function load(file,modules){
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 const context={exports:{},require:name=>{assert.ok(name in modules,name);return modules[name]}};
 vm.runInNewContext(code,context);return context.exports;
}
test('activity log model can reload without OverwriteModelError',()=>{
 const registry=new mongoose.Mongoose();
 const first=load('src/models/UserActivityLogs.ts',{mongoose:registry}).UserActivityLogs;
 assert.equal(first.modelName,'user_activity_logs');
 assert.equal(load('src/models/UserActivityLogs.ts',{mongoose:registry}).UserActivityLogs,first);
});
test('Track returns authenticated recent completions without server-day cutoff',async()=>{
 const userId='507f1f77bcf86cd799439011';
 let completionPipeline;
 const completed={_id:'log',name:'Evening calm',completedAt:'2026-10-11T23:55:00Z',totalVideoTime:'10:00'};
 const {GET}=load('src/app/api/users/user-track/route.ts',{
  'next/server':{NextResponse},mongoose,'date-fns':require('date-fns'),
  '@/lib/db':{connectDB:async()=>{}},
  '@/lib/getAuthUser':{getAuthUser:async()=>({userId})},
  '@/lib/apiResponse':{apiErrorResponse:error=>{throw error}},
  '@/models/UserLoginStreak':{UserLoginStreak:{aggregate:async()=>[]}},
  '@/models/UserActivityLogs':{UserActivityLogs:{aggregate:async pipeline=>{
   if(pipeline[0].$match.isCompleted){completionPipeline=pipeline;return [completed]}
   return [];
  }}},
 });
 const response=await GET({});const body=await response.json();
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.equal(body.data.completedActivities[0].name,'Evening calm');
 assert.equal(String(completionPipeline[0].$match.userId),userId);
 assert.equal(completionPipeline[0].$match.createdAt,undefined);
 assert.equal(completionPipeline[2].$limit,20);
 assert.equal(completionPipeline[1].$sort.createdAt,-1);
 assert.equal(completionPipeline[4].$unwind.preserveNullAndEmptyArrays,true);
});
