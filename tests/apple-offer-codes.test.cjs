const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const jwt = require('jsonwebtoken');
const {NextResponse} = require('next/server');
function load(file, mocks) {
 const mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync('src/'+file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 new Function('require','module','exports',code)(name=>name in mocks?mocks[name]:require(name),mod,mod.exports);
 return mod.exports;
}
const helpers=load('lib/appleOfferCodes.ts',{});
test('only the two exact Apple offer-code identifiers qualify, never regular yearly plans or other offer types',()=>{
 for(const type of [undefined,null,1,2,3,4]) for(const code of [null,'','ANCHORVIP','ANCHORAMBASSADOR','OTHER','ANCHORVIP-extra']){
  assert.equal(helpers.anchorOfferCode(type,code),type===3&&['ANCHORVIP','ANCHORAMBASSADOR'].includes(code)?code:null);
 }
 const sub=(offerType,offerIdentifier)=>({productId:'yearly',offerType,offerIdentifier});
 const rows=helpers.anchorOfferSubscribers([
  {id:'ordinary',subscriptions:[sub(null,null)]},
  {id:'mixed',subscriptions:[sub(null,null),sub(3,'ANCHORVIP'),sub(3,'OTHER')]},
  {id:'ambassador',subscriptions:[sub(3,'ANCHORAMBASSADOR')]},
  {id:'conflict',conflict:true,subscriptions:[sub(3,'ANCHORVIP')]},
 ]);
 assert.deepEqual(rows.map(r=>r.id),['mixed','ambassador']);
 assert.equal(rows[0].subscriptions.length,1);
});
const tx={transactionId:'123',originalTransactionId:'100',productId:'yearly',bundleId:'app.test',environment:'Production',offerType:3,offerIdentifier:'ANCHORVIP'};
function checker(responses) {
 return load('lib/applePurchaseOffer.ts',{
  './appleOfferCodes':helpers,
  './appStoreOffers':{AppStoreError:Error,createAppStoreClient:async env=>async()=>{
   const next=responses.shift();assert.equal(env,next.env??'production');
   return Response.json(next.body??{signedTransactionInfo:jwt.sign(next.tx??tx,'test')},{status:next.status??200});
  }},
 }).checkApplePurchaseOffer;
}
test('server records Apple evidence and validates transaction, product, app, environment and revocation',async()=>{
 const old=process.env.APPLE_BUNDLE_ID;process.env.APPLE_BUNDLE_ID='app.test';
 try{
  const result=await checker([{}])('123','yearly');assert.equal(result.code,'ANCHORVIP');assert.equal(result.environment,'production');
  assert.equal((await checker([{tx:{...tx,offerType:undefined,offerIdentifier:undefined}}])('123','yearly')).code,null);
  for(const extra of [{transactionId:'999'},{productId:'other'},{bundleId:'wrong'},{environment:'Sandbox'},{revocationDate:1}]){
   await assert.rejects(checker([{tx:{...tx,...extra}}])('123','yearly'));
  }
  await assert.rejects(checker([{status:503}])('123','yearly'));
  const sandbox=await checker([{status:404},{env:'sandbox',tx:{...tx,environment:'Sandbox',offerIdentifier:'ANCHORAMBASSADOR'}}])('123','yearly');
  assert.equal(sandbox.code,'ANCHORAMBASSADOR');assert.equal(sandbox.environment,'sandbox');
 }finally{if(old===undefined)delete process.env.APPLE_BUNDLE_ID;else process.env.APPLE_BUNDLE_ID=old;}
});
test('app purchase and restore persist server-checked indicators; outages preserve evidence and client code cannot forge it',async()=>{
 let saved, fail=false, calls=0;
 const {POST}=load('app/api/users/purchase/route.ts',{
  '@/lib/applePurchaseOffer':{checkApplePurchaseOffer:async(id,product)=>{calls++;assert.equal(id,'123');assert.equal(product,'yearly');if(fail)throw Error('offline');return {code:'ANCHORVIP',offerType:3,offerIdentifier:'ANCHORVIP'};}},
  '@/lib/subscriptionPlan':{subscriptionPlan:()=> 'yearly'},
  '@/lib/complimentaryBillingHistory':{},'@/models/User':{},'@/models/Advertising':{},
  'next/server':{NextResponse},'@/lib/db':{connectDB:async()=>{}},
  '@/lib/getAuthUser':{getAuthUser:async()=>({userId:'u'})},
  '@/lib/apiResponse':{apiErrorResponse:e=>{throw e;}},
  '@/models/UserPurchase':{UserPurchase:{init:async()=>{},
   findOne:()=>({select:()=>({lean:async()=>saved??null})}),
   findOneAndUpdate:async(q,u)=>{saved={...(saved??u.$setOnInsert),...u.$set,_id:'p'};return saved;},
  }},
 });
 const req={json:async()=>({purchaseId:'123',productId:'yearly',amount:0,purchaseDate:'2026-01-01',planType:'yearly',currencySymbol:'USD',platform:'ios',offerCode:'ANCHORAMBASSADOR'})};
 assert.equal((await POST(req)).status,201);assert.equal(saved.appleOffer.code,'ANCHORVIP');assert.equal(saved.appleOfferCheckPending,false);
 fail=true;assert.equal((await POST(req)).status,201);assert.equal(saved.appleOffer.code,'ANCHORVIP');assert.equal(saved.appleOfferCheckPending,true);assert.equal(calls,2);
});
