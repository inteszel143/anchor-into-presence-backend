const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const {NextRequest,NextResponse}=require('next/server');
function load(file,mocks={}) {
 const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};
 new Function('require','module','exports',source)(name=>name in mocks?mocks[name]:require(name),mod,mod.exports);
 return mod.exports;
}
const helper=load('lib/complimentaryBillingHistory.ts');
const grant={redemptionYearlyGrantedAt:new Date('2026-11-01'),redemptionYearlyExpiresAt:new Date('2027-11-01')};
test('grant history uses actual grant dates, zero charge and no store transaction ID',()=>{
 const row=helper.complimentaryBillingRecord('account',grant);
 assert.equal(row.source,'complimentary');
 assert.equal(row.purchaseId,'');
 assert.equal(row.planType,'yearly');
 assert.equal(row.amount,0);
 assert.equal(row.expiresAt.toISOString(),'2027-11-01T00:00:00.000Z');
 assert.equal(helper.complimentaryBillingRecord('account',null),null);
 assert.equal(helper.complimentaryBillingRecord('account',{...grant,redemptionYearlyGrantedAt:'bad'}),null);
});
function route(user,purchases) {
 return load('app/api/users/purchase/route.ts',{
  '@/lib/subscriptionPlan':load('lib/subscriptionPlan.ts'),
  'next/server':{NextResponse},'@/lib/db':{connectDB:async()=>{}},
  '@/lib/getAuthUser':{getAuthUser:async()=>({userId:'account'})},
  '@/lib/apiResponse':{apiErrorResponse:e=>{throw e;}},
  '@/lib/complimentaryBillingHistory':helper,
  '@/models/User':{User:{findById:id=>{assert.equal(id,'account');return{select:()=>({lean:async()=>user})};}}},
  '@/models/UserPurchase':{UserPurchase:{
   find:filter=>{assert.equal(filter.userId,'account');return{sort:()=>({limit:n=>({lean:async()=>purchases.slice(0,n)})})};},
   countDocuments:async()=>purchases.length,
  }},
 });
}
test('grant merges into paginated purchase history exactly once without changing store records',async()=>{
 const records=[{purchaseId:'new',createdAt:new Date('2026-11-10')},{purchaseId:'old',createdAt:new Date('2026-10-01')}];
 const api=route(grant,records);
 const pages=[];
 for(let page=1;page<=4;page++){
  const body=await(await api.GET(new NextRequest(`http://localhost/api/users/purchase?page=${page}&limit=1`))).json();
  assert.equal(body.pagination.total,3); assert.equal(body.pagination.totalPages,3);
  pages.push(body.data);
 }
 assert.deepEqual(pages.map(p=>p[0]?.purchaseId),['new','','old',undefined]);
 assert.equal(pages[1][0].source,'complimentary');
 assert.equal(records.length,2);
});
test('purchase history without a grant is unchanged',async()=>{
 const body=await(await route(null,[{purchaseId:'monthly',createdAt:new Date()}]).GET(new NextRequest('http://localhost/api/users/purchase'))).json();
 assert.equal(body.pagination.total,1);assert.equal(body.data[0].purchaseId,'monthly');
});
