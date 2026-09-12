import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import {fileURLToPath} from 'node:url';
import {createStore} from './store.mjs';
import {validatedPatch,restorePreferences} from '../core/settings.cjs';
import {fetchMetric} from '../core/providers.mjs';
import {parseSeriesCSV,exportCSV} from '../core/series.mjs';
const readJSON=async p=>JSON.parse(await readFile(new URL(p,import.meta.url),'utf8'));
const catalogue=await readJSON('../data/catalogue.json'),sources=await readJSON('../data/sources.json');
const defaults={version:2,selected:catalogue.filter(k=>k.default).map(k=>k.id),mode:'latest',autoRefresh:false,theme:'light',rules:[],memberships:[],watchlists:[],trend:{ids:['1','2','3'],window:240,transform:'zscore'},lastRefresh:null};
const equal=(a,b)=>timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest());
const loginPage=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>MacroSignals sign in</title><style>body{font:17px system-ui;background:#eef3f5;color:#193b42;margin:0;display:grid;place-items:center;min-height:100vh}main{width:min(85vw,360px);padding:28px;background:white;border-radius:20px}input,button{box-sizing:border-box;width:100%;padding:14px;margin-top:12px;font:inherit;border-radius:8px;border:1px solid #aebfc4}button{background:#17665f;color:white}p{line-height:1.5}</style></head><body><main><h1>MacroSignals</h1><p>Your private macroeconomic research workspace.</p><form method="post" action="/login"><label>Workspace password<input name="password" type="password" autocomplete="current-password" required autofocus></label><button>Sign in</button></form></main></body></html>`;
export async function createApp({env=process.env,fetcher=fetch,store:givenStore}={}){
  const password=env.APP_PASSWORD||'';
  if(password.length<20)throw Error('Set APP_PASSWORD in Secrets to a unique password of at least 20 characters.');
  const production=env.NODE_ENV==='production'||env.REPLIT_DEPLOYMENT==='1';
  const origin=env.APP_ORIGIN?new URL(env.APP_ORIGIN).origin:null;
  if(production&&(!origin||!origin.startsWith('https://')))throw Error('Set APP_ORIGIN to the exact HTTPS published address.');
  const store=givenStore||await createStore(defaults,{...env,NODE_ENV:production?'production':env.NODE_ENV});
  const signature=value=>createHmac('sha256',password).update('macrosignals-session:'+value).digest('hex');
  const cookieName=production?'__Host-ms_session':'ms_session';
  const cookie=(value,maxAge)=>`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${production?'; Secure':''}`;
  const authenticated=req=>{const token=(req.headers.cookie||'').split('; ').find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1)||'';const [expires,sig]=token.split('.');return /^\d+$/.test(expires||'')&&Number(expires)>Date.now()&&Number(expires)<Date.now()+8*86400000&&!!sig&&equal(sig,signature(expires));};
  let attempts=0,attemptWindow=Date.now(),workers=0;
  async function body(req,limit=13000000){let size=0;const chunks=[];for await(const part of req){size+=part.length;if(size>limit)throw Error('Upload exceeds the allowed size.');chunks.push(part);}return Buffer.concat(chunks).toString('utf8');}
  const send=(res,status,data,type='application/json')=>{res.writeHead(status,{'Content-Type':type});res.end(type==='application/json'?JSON.stringify(data):data);};
  const api=async(name,arg)=>{
    if(name==='bootstrap'){const snapshot=await store.snapshot();return {catalogue,sources,...snapshot,state:restorePreferences(snapshot.state,defaults),hasKey:!!env.FRED_API_KEY,secureVault:false,warnings:store.warnings,version:'0.2.0-web',platform:'web'};}
    if(name==='save')return store.update(validatedPatch(arg));
    if(name==='refresh-one'){
      const def=catalogue.find(k=>k.id===arg?.id);if(!def||def.adapter!=='fred')throw Error('This KPI requires CSV import.');
      const {state,cache}=await store.snapshot();
      if(['user-first-release','import-revised'].includes(cache[def.id]?.historyQuality))throw Error('Imported history is preserved. Remove it or select a different series.');
      const series=await fetchMetric(def,{mode:state.mode,apiKey:env.FRED_API_KEY||'',fetcher,signal:AbortSignal.timeout(55000)},new Map());
      await store.putSeries(def.id,series);await store.update({lastRefresh:new Date().toISOString()});return series;
    }
    if(name==='import'){
      const def=catalogue.find(k=>k.id===arg?.id);if(!def)throw Error('Unknown indicator.');
      if(typeof arg.text!=='string'||Buffer.byteLength(arg.text)>12000000)throw Error('CSV must be smaller than 12 MB.');
      const parsed=parseSeriesCSV(arg.text,{firstRelease:!!arg.firstRelease});
      const series={id:def.id,...parsed,historyQuality:arg.firstRelease?'user-first-release':'import-revised',source:'Imported CSV',sourceUrl:'',unit:def.unit,frequency:def.frequency,retrievedAt:new Date().toISOString(),transform:'already-in-displayed-units'};
      await store.putSeries(def.id,series);return series;
    }
    if(name==='export-series'){const {cache}=await store.snapshot();if(!cache[arg])throw Error('Load data before exporting.');return exportCSV(cache[arg].observations);}
    if(name==='restore-settings'){if(arg?.application!=='MacroSignals')throw Error('Choose a MacroSignals settings export.');return store.update(validatedPatch(arg.settings));}
    if(name==='backtest'){
      if(workers>=2)throw Error('An analysis is already running. Try again shortly.');
      const snapshot=await store.snapshot();workers++;
      try{return await new Promise((resolve,reject)=>{
        const worker=new Worker(new URL('../core/worker.mjs',import.meta.url),{workerData:{...arg,catalogue,cache:snapshot.cache},resourceLimits:{maxOldGenerationSizeMb:256}});
        let settled=false;const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);worker.terminate();error?reject(error):resolve({analysis:result,settings:snapshot.state,observations:snapshot.cache,catalogue});};
        const timer=setTimeout(()=>finish(Error('Analysis timed out. Choose fewer predictors.')),90000);
        worker.once('message',m=>finish(m.ok?null:Error(m.error),m.result));worker.once('error',()=>finish(Error('Analysis worker failed.')));worker.once('exit',()=>finish(Error('Analysis stopped before completion.')));
      });}finally{workers--;}
    }
    throw Error('Unknown operation.');
  };
  // no-referrer makes native form POST origins opaque (Origin: null).
  // same-origin preserves login/logout origin checks without disclosing referrers to other sites.
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
    if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
    try{
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/healthz'&&req.method==='GET')return send(res,200,{ok:true});
      if(req.method==='POST'){
        const expected=origin||`http://${req.headers.host}`;
        if(req.headers.origin!==expected||req.headers['sec-fetch-site']==='cross-site')return send(res,403,{ok:false,error:'Request origin rejected. Open the application at its configured address.'});
      }
      if(url.pathname==='/login'&&req.method==='GET')return send(res,200,loginPage,'text/html');
      if(url.pathname==='/login'&&req.method==='POST'){
        if(Date.now()-attemptWindow>60000){attempts=0;attemptWindow=Date.now();}
        if(++attempts>10)return send(res,429,'Too many sign-in attempts. Wait one minute.','text/plain');
        const submitted=new URLSearchParams(await body(req,4096)).get('password')||'';
        if(!equal(submitted,password))return send(res,401,'Incorrect password. Go back and try again.','text/plain');
        const expires=String(Date.now()+7*86400000);res.setHeader('Set-Cookie',cookie(expires+'.'+signature(expires),7*86400));res.writeHead(303,{Location:'/'});return res.end();
      }
      if(!authenticated(req)){if(url.pathname.startsWith('/api/'))return send(res,401,{ok:false,error:'Session expired. Reload and sign in.'});res.writeHead(303,{Location:'/login'});return res.end();}
      if(url.pathname==='/logout'&&req.method==='POST'){res.setHeader('Set-Cookie',cookie('',0));res.writeHead(303,{Location:'/login'});return res.end();}
      if(url.pathname.startsWith('/api/')&&req.method==='POST'){
        if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{ok:false,error:'JSON required.'});
        return send(res,200,{ok:true,result:await api(url.pathname.slice(5),JSON.parse(await body(req)))});
      }
      const files={'/':['index.html','text/html'],'/index.html':['index.html','text/html'],'/main.js':['main.js','text/javascript'],'/main.css':['main.css','text/css']};
      if(req.method==='GET'&&files[url.pathname]){const [file,type]=files[url.pathname];return send(res,200,await readFile(new URL('../dist-web/'+file,import.meta.url)),type);}
      return send(res,404,{ok:false,error:'Not found.'});
    }catch(error){const message=/database|password|connection|relation|SQL|certificate/i.test(error.message)?'Storage connection failed. Check the database configuration.':error.message;return send(res,400,{ok:false,error:message});}
  });
  server.requestTimeout=120000;server.headersTimeout=15000;
  return {server,close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await store.close();}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const {server}=await createApp();server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('MacroSignals web server ready.'));
}
