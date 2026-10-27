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
 let practicePipeline;
 const completed={_id:'log',name:'Evening calm',completedAt:'2026-10-11T23:55:00Z',totalVideoTime:'10:00'};
 const {GET}=load('src/app/api/users/user-track/route.ts',{
  'next/server':{NextResponse},mongoose,'date-fns':require('date-fns'),
  '@/lib/db':{connectDB:async()=>{}},
  '@/lib/getAuthUser':{getAuthUser:async()=>({userId})},
  '@/lib/apiResponse':{apiErrorResponse:error=>{throw error}},
  '@/models/UserLoginStreak':{UserLoginStreak:{aggregate:async()=>[]}},
  '@/models/UserActivityLogs':{UserActivityLogs:{aggregate:async pipeline=>{
   if(pipeline[1]?.$group?._id === '$createdAt'){practicePipeline=pipeline;return [{_id:'2026-10-11T23:55:00Z'}]}
   if(pipeline[0].$match.isCompleted){completionPipeline=pipeline;return [completed]}
   return [];
  }}},
 });
 const response=await GET({});const body=await response.json();
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.equal(body.data.completedActivities[0].name,'Evening calm');
 assert.deepEqual(body.data.practiceDates,['2026-10-11T23:55:00Z']);
 assert.equal(String(practicePipeline[0].$match.userId),userId);
 assert.equal(practicePipeline[0].$match.isCompleted,true);
 assert.equal(practicePipeline[0].$match.$or,undefined);
 assert.equal(practicePipeline.some(stage=>stage.$limit),false);
 assert.equal(String(completionPipeline[0].$match.userId),userId);
 assert.equal(completionPipeline[0].$match.createdAt,undefined);
 assert.equal(completionPipeline[2].$group._id,'$activityId');
 assert.equal(completionPipeline[2].$group.latest.$first,'$$ROOT');
 assert.equal(completionPipeline[3].$replaceRoot.newRoot,'$latest');
 assert.equal(completionPipeline[4].$sort.createdAt,-1);
 assert.equal(completionPipeline[5].$limit,20);
 assert.equal(completionPipeline[1].$sort.createdAt,-1);
 assert.equal(completionPipeline[7].$unwind.preserveNullAndEmptyArrays,true);
});

test('reopening a completed practice reads account completion even after replay', async()=>{
 const activityId='507f1f77bcf86cd799439012';
 let userId='507f1f77bcf86cd799439011';
 const logs=[];
 const route=load('src/app/api/users/activities/[id]/route.ts',{
  'next/server':{NextResponse},mongoose,
  '@/lib/db':{connectDB:async()=>{}},
  '@/lib/getAuthUser':{getAuthUser:async()=>({userId})},
  '@/models/Activity':{Activity:{aggregate:async()=>[{_id:activityId,name:'Calm'}]}},
  '@/models/UserActivityLogs':{UserActivityLogs:{
   create:async log=>{logs.push(log);return log},
   exists:async query=>logs.find(log=>String(log.userId)===String(query.userId)&&String(log.activityId)===String(query.activityId)&&log.isCompleted===query.isCompleted)||null,
  }},
 });
 const params={params:Promise.resolve({id:activityId})};
 const read=()=>route.GET({},params);
 assert.equal((await (await read()).json()).data.isCompleted,false);
 await route.POST({json:async()=>({videoTimestamp:'05:00',totalVideoTime:'05:00',isCompleted:true})},params);
 let response=await read();
 assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.equal((await response.json()).data.isCompleted,true);
 await route.POST({json:async()=>({videoTimestamp:'00:01',totalVideoTime:'05:00',isCompleted:false})},params);
 assert.equal((await (await read()).json()).data.isCompleted,true);
 userId='507f1f77bcf86cd799439013';
 assert.equal((await (await read()).json()).data.isCompleted,false);
});
