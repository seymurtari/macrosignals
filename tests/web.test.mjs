import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {JSDOM} from 'jsdom';
import {createApp} from '../web/server.mjs';
import {createStore} from '../web/store.mjs';
import {fixture} from './fixtures.mjs';
import {PGlite} from '@electric-sql/pglite';
const password='test-only-long-workspace-password-123';
const start=async env=>{const app=await createApp({env});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));return {...app,url:`http://127.0.0.1:${app.server.address().port}`};};
const login=async app=>{const r=await fetch(app.url+'/login',{method:'POST',headers:{Origin:app.url,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password}),redirect:'manual'});assert.equal(r.status,303);return r.headers.get('set-cookie').split(';')[0];};
const rpc=async(app,cookie,name,arg=null,origin=app.url)=>fetch(app.url+'/api/'+name,{method:'POST',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(arg)});
test('Web authentication protects assets and data; imports/settings survive restart; browser bridge renders grouped catalogue',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'ms-web-'));let app,dom;
 try{
  const env={APP_PASSWORD:password,DATA_DIR:dir};app=await start(env);
  for(const route of ['/','/main.js','/main.css'])assert.equal((await fetch(app.url+route,{redirect:'manual'})).status,303);
  assert.equal((await rpc(app,'','bootstrap')).status,401);
  const loginPage=await fetch(app.url+'/login');
  assert.equal(loginPage.headers.get('referrer-policy'),'same-origin');
  for(const origin of ['null','https://attacker.invalid']){
    const denied=await fetch(app.url+'/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password}),redirect:'manual'});
    assert.equal(denied.status,403);assert.equal(denied.headers.get('set-cookie'),null);
  }
  const cookie=await login(app);
  assert.equal((await rpc(app,cookie,'save',{theme:'dark'},'https://attacker.invalid')).status,403);
  assert.equal((await rpc(app,cookie+'x','bootstrap')).status,401);
  assert.equal((await rpc(app,cookie,'save',{selected:['bad']})).status,400);
  const save=await rpc(app,cookie,'save',{selected:['1','13'],theme:'dark',trend:{ids:['1'],window:240,transform:'native'}});assert.equal(save.status,200);
  const imported=await (await rpc(app,cookie,'import',{id:'1',text:'date,value\n2006-01-01,4.5\n2026-01-01,4.1',firstRelease:false})).json();assert.equal(imported.result.observations.length,2);
  assert.match((await (await rpc(app,cookie,'export-series','1')).json()).result,/2006-01-01/);
  const snapshot=await (await rpc(app,cookie,'bootstrap')).json();assert.equal(snapshot.result.state.trend.window,240);assert.equal(snapshot.result.platform,'web');assert.ok(!JSON.stringify(snapshot).includes(password));
  const oldUrl=app.url;await app.close();app=await start(env);const cookie2=await login(app);
  const reopened=await (await rpc(app,cookie2,'bootstrap')).json();assert.deepEqual(reopened.result.state.selected,['1','13']);assert.equal(reopened.result.cache['1'].observations.length,2);
  const html=await (await fetch(app.url,{headers:{Cookie:cookie2}})).text();assert.match(html,/connect-src 'self'/);
  dom=new JSDOM('<!doctype html><div id="root"></div>',{url:app.url,runScripts:'outside-only',pretendToBeVisual:true});
  dom.window.fetch=(url,options={})=>fetch(app.url+url,{...options,headers:{...options.headers,Origin:app.url,Cookie:cookie2}});
  dom.window.ResizeObserver=class{constructor(cb){this.cb=cb;}observe(){this.cb([{contentRect:{width:390}}]);}disconnect(){}};
  dom.window.eval(await readFile(new URL('../dist-web/main.js',import.meta.url),'utf8'));
  const wait=async fn=>{for(let n=0;n<100;n++){if(fn())return;await new Promise(r=>setTimeout(r,20));}assert.fail('Web UI did not render');};
  await wait(()=>[...dom.window.document.querySelectorAll('button')].some(b=>b.textContent.trim()==='KPI catalogue'));
  const button=text=>[...dom.window.document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
  button('KPI catalogue').click();await wait(()=>dom.window.document.querySelectorAll('.group-header').length===9);
  button('Settings & backup').click();await wait(()=>dom.window.document.querySelector('form[action="/logout"]'));
  assert.match(dom.window.document.body.textContent,/Manage FRED_API_KEY in Replit Secrets/);
  assert.ok(!dom.window.document.querySelector('input[placeholder="32-character key"]'));
  const logout=await fetch(app.url+'/logout',{method:'POST',headers:{Origin:app.url,Cookie:cookie2},redirect:'manual'});assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
 }finally{dom?.window.close();await app?.close();await rm(dir,{recursive:true,force:true});}
});
test('Deployment fails closed without credentials, HTTPS origin, or persistent database',async()=>{
 await assert.rejects(createApp({env:{}}),/APP_PASSWORD/);
 await assert.rejects(createApp({env:{APP_PASSWORD:password,NODE_ENV:'production'}}),/APP_ORIGIN/);
 await assert.rejects(createApp({env:{APP_PASSWORD:password,NODE_ENV:'production',APP_ORIGIN:'https://test.invalid'}}),/DATABASE_URL/);
});
test('PostgreSQL store keeps concurrent setting patches and series across connections',async()=>{
 const db=new PGlite();const pool={query:(q,values)=>db.query(q,values),end:async()=>{}};
 try{
  const a=await createStore({selected:['1'],theme:'light'},{DATABASE_URL:'test'},pool);
  const b=await createStore({},{DATABASE_URL:'test'},pool);
  await Promise.all([a.update({theme:'dark'}),b.update({selected:['1','13']}),a.putSeries('1',{observations:[{date:'2026-01-01',value:4.1}]})]);
  const c=await createStore({},{DATABASE_URL:'test'},pool);const s=await c.snapshot();assert.equal(s.state.theme,'dark');assert.deepEqual(s.state.selected,['1','13']);assert.equal(s.cache['1'].observations[0].value,4.1);
 }finally{await db.close();}
});

test('Web worker returns a frozen research snapshot and server refresh preserves imports',async()=>{
 const f=fixture();let state={version:2,selected:['9'],mode:'latest',autoRefresh:false,theme:'light',rules:[],memberships:[],watchlists:[],trend:{ids:['9'],window:240,transform:'native'},lastRefresh:null};
 const cache={'9':f.cache.a,market:f.cache.market};const store={warnings:[],snapshot:async()=>structuredClone({state,cache}),update:async patch=>(state={...state,...patch}),putSeries:async(id,value)=>{cache[id]=value;},close:async()=>{}};
 const app=await createApp({env:{APP_PASSWORD:password},store,fetcher:async url=>{const id=new URL(url).searchParams.get('id');return new Response('observation_date,'+id+'\n2026-01-01,4.5\n2026-01-02,4.6');}});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));app.url=`http://127.0.0.1:${app.server.address().port}`;
 try{
 const cookie=await login(app);
 const testResult=await (await rpc(app,cookie,'backtest',{featureIds:['9'],horizon:6,drawdown:.1})).json();
 assert.equal(testResult.ok,true,testResult.error);assert.equal(testResult.result.analysis.holdout.n,24);assert.deepEqual(testResult.result.observations['9'],f.cache.a);
 assert.equal((await rpc(app,cookie,'refresh-one',{id:'9'})).status,400);
 const refresh=await (await rpc(app,cookie,'refresh-one',{id:'13'})).json();assert.equal(refresh.ok,true,refresh.error);assert.equal(cache['13'].observations.length,2);
 }finally{await app.close();}
});
