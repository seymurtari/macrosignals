import type {Api,Reply,Bootstrap} from './types';
const listeners=new Set<(p:any)=>void>();
const emit=(p:any)=>listeners.forEach(fn=>fn(p));
async function call(name:string,arg:any=null):Promise<Reply>{try{const r=await fetch('/api/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(arg)});return await r.json();}catch{return {ok:false,error:'The server could not be reached. Please retry.'};}}
function pick(accept:string,max:number):Promise<string|null>{return new Promise(resolve=>{const input=document.createElement('input');input.type='file';input.accept=accept;input.oncancel=()=>resolve(null);input.onchange=async()=>{const file=input.files?.[0];if(!file)return resolve(null);if(file.size>max){alert('The selected file is too large.');return resolve(null);}resolve(await file.text());};input.click();});}
function download(name:string,text:string,type:string){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);return {ok:true,result:name};}
let refreshing=false,cancelled=false,lastResearch:any=null,latest:Bootstrap|null=null;
export const webApi:Api={
 bootstrap:async()=>{const r=await call('bootstrap');if(r.ok)latest=r.result;return r;},
 save:async patch=>{const r=await call('save',patch);if(r.ok&&latest)latest.state=r.result;return r;},
 refresh:async ids=>{
   if(refreshing)return {ok:false,error:'A refresh is already running.'};refreshing=true;cancelled=false;
   const unique=[...new Set(ids)],updated:string[]=[],errors:any[]=[];
   try{for(const [done,id] of unique.entries()){if(cancelled)break;emit({phase:'refresh',id,done,total:unique.length,name:latest?.catalogue.find(k=>k.id===id)?.name});const r=await call('refresh-one',{id});if(r.ok)updated.push(id);else errors.push({id,error:r.error});}
   const r=await webApi.bootstrap();if(!r.ok)return r;return {ok:true,result:{...r.result,updated,errors,cancelled}};
   }finally{refreshing=false;emit({phase:'idle'});}
 },
 cancelRefresh:async()=>{cancelled=true;return {ok:true,result:true};},
 setKey:async()=>({ok:false,error:'Manage FRED_API_KEY in Replit Secrets, then restart or republish the app.'}),
 importCSV:async(id,firstRelease)=>{const text=await pick('.csv',12000000);return text===null?{ok:true,result:null}:call('import',{id,firstRelease,text});},
 exportSeries:async id=>{const r=await call('export-series',id);return r.ok?download('MacroSignals-'+id+'.csv',r.result,'text/csv'):r;},
 exportResearch:async result=>{if(!lastResearch||result?.createdAt!==lastResearch.analysis.createdAt)return {ok:false,error:'Run a historical test before exporting.'};return download('MacroSignals-research.json',JSON.stringify({application:'MacroSignals',version:'0.2.0-web',exportedAt:new Date().toISOString(),...lastResearch,notes:'Frozen analysis inputs. Credentials excluded. Provider rights apply.'},null,2),'application/json');},
 exportSettings:async()=>{const r=await webApi.bootstrap();return r.ok?download('MacroSignals-settings.json',JSON.stringify({application:'MacroSignals',settings:r.result!.state},null,2),'application/json'):r;},
 restoreSettings:async()=>{const text=await pick('.json',100000);if(text===null)return {ok:true,result:null};try{return await call('restore-settings',JSON.parse(text));}catch{return {ok:false,error:'Choose a valid JSON settings export.'};}},
 openSource:async url=>{const allowed=[...(latest?.sources.map(s=>s.url)||[]),...(latest?.catalogue.map(k=>k.url)||[]),'https://fred.stlouisfed.org/docs/api/api_key.html'];if(!allowed.includes(url)||!url.startsWith('https://'))return {ok:false,error:'Source link not allowed.'};window.open(url,'_blank','noopener,noreferrer');return {ok:true,result:true};},
 backtest:async options=>{const r=await call('backtest',options);if(!r.ok)return r;lastResearch=r.result;return {ok:true,result:lastResearch.analysis};},
 onProgress:fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};}
};
// The server checks for due indicators even without an open browser tab. Poll
// while viewing so background updates become visible without a page reload.
let polling=false;
async function sync(){
  if(document.visibilityState!=='visible'||refreshing||polling||!latest)return;
  polling=true;
  try{const before=latest;const r=await webApi.bootstrap();if(r.ok&&r.result&&
    (r.result.state.lastRefresh!==before.state.lastRefresh||r.result.state.autoRefresh!==before.state.autoRefresh))emit({phase:'updated',...r.result});}
  finally{polling=false;}
}
setInterval(sync,60000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync();});
