import test from 'node:test';
import assert from 'node:assert/strict';
import {createFmpConnection} from '../core/fmp.mjs';
import {createApp} from '../web/server.mjs';
const key='fixture-private-api-key';
test('FMP needs a key, redacts provider errors, and stops on invalid credentials',async()=>{
 let calls=0;const missing=createFmpConnection({fetcher:()=>{calls++;}});assert.equal((await missing.inspect()).configured,false);assert.equal(calls,0);
 const client=createFmpConnection({apiKey:key,fetcher:async(url,options)=>{calls++;assert.ok(!url.includes(key));assert.equal(options.headers.apikey,key);assert.equal(options.redirect,'error');return new Response(JSON.stringify({'Error Message':'Invalid API KEY '+key}),{status:401});}});
 const report=await client.inspect();assert.equal(calls,1);assert.equal(report.checks[0].status,'invalid_key');assert.equal(report.checks[1].status,'skipped');assert.ok(!JSON.stringify(report).includes(key));
});
test('FMP keeps restricted datasets separate from permitted data and caches/coalesces checks',async()=>{
 let calls=0,clock=Date.parse('2026-10-05T10:00:00Z');
 const client=createFmpConnection({apiKey:key,now:()=>clock,fetcher:async url=>{calls++;if(url.includes('/profile?'))return Response.json([{symbol:'AAPL',price:123}]);if(url.includes('/light?'))return Response.json([{symbol:'AAPL',date:'2026-10-02',price:122},{symbol:'AAPL',date:'2026-10-01',price:120}]);return Response.json({'Error Message':'Upgrade '+key},{status:403});}});
 const [a,b]=await Promise.all([client.inspect(),client.inspect()]);assert.equal(calls,6);assert.equal(a.connected,true);assert.deepEqual(a,b);assert.equal(a.checks[1].firstDate,'2026-10-01');assert.equal(a.checks[2].status,'restricted');assert.ok(!JSON.stringify(a).includes(key));assert.equal((await client.inspect()).cached,true);assert.equal(calls,6);
 clock+=3600001;await client.inspect();assert.equal(calls,12);
});
test('FMP distinguishes empty, malformed, rate-limited and network-error responses',async()=>{
 for(const [make,status] of [[()=>Response.json([]),'empty'],[()=>Response.json([{symbol:'MSFT',price:10}]),'unexpected'],[()=>new Response('quota',{status:429}),'rate_limited'],[()=>{throw Error(key);},'unavailable']]){
  let calls=0;const report=await createFmpConnection({apiKey:key,fetcher:async()=>{calls++;return make();}}).inspect();assert.equal(report.checks[0].status,status);assert.equal(report.connected,false);assert.ok(!JSON.stringify(report).includes(key));if(status==='rate_limited')assert.equal(calls,1);
 }
});
test('FMP API requires app login and same-origin POST and never exports the key',async()=>{
 let calls=0;const password='test-workspace-password-at-least-20';
 const store={close:async()=>{},warnings:[],snapshot:async()=>({state:{},cache:{}})};
 const app=await createApp({env:{APP_PASSWORD:password,FMP_API_KEY:key},store,fetcher:async()=>{calls++;return Response.json([{symbol:'AAPL',price:100}]);}});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${app.server.address().port}`;
 try{
  const post=async(cookie='',site=origin)=>fetch(origin+'/api/fmp-check',{method:'POST',headers:{Origin:site,Cookie:cookie,'Content-Type':'application/json'},body:'null'});
  assert.equal((await post()).status,401);assert.equal(calls,0);
  const login=await fetch(origin+'/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password}),redirect:'manual'});const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await post(cookie,'https://evil.invalid')).status,403);assert.equal(calls,0);
  const report=await (await post(cookie)).json();assert.equal(report.ok,true);assert.equal(report.result.connected,true);assert.equal(calls,6);assert.ok(!JSON.stringify(report).includes(key));
 }finally{await app.close();}
});
