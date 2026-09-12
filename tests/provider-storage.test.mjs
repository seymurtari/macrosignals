import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fetchFred,fetchMetric} from '../core/providers.mjs';
import {LocalStore} from '../core/storage.cjs';
import {validatedPatch,restorePreferences} from '../core/settings.cjs';
test('Provider normalizes the public FRED CSV with missing values excluded',async()=>{
 const r=await fetchFred('DGS10',{fetcher:async url=>{assert.match(url,/fredgraph.csv/);assert.doesNotMatch(url,/api_key/);return new Response('observation_date,DGS10\n2024-01-01,.\n2024-01-02,4.1\n');}});
 assert.equal(r.historyQuality,'latest-revised');assert.equal(r.missing,1);assert.equal(r.observations[0].value,4.1);
});
test('First-release requests preserve initial-release timestamps and exclude null values',async()=>{
 const r=await fetchFred('TEST',{mode:'firstRelease',apiKey:'a'.repeat(32),fetcher:async url=>{const u=new URL(url);assert.equal(u.searchParams.get('output_type'),'4');return Response.json({count:3,observations:[{date:'2024-01-01',value:'2',realtime_start:'2024-02-15'},{date:'2024-02-01',value:'.'},{date:'2024-03-01',value:null}]});}});
 assert.equal(r.observations.length,1);assert.equal(r.observations[0].availableDate,'2024-02-15');assert.equal(r.missing,2);
 await assert.rejects(fetchFred('TEST',{mode:'firstRelease'}),/32-character/);
});
test('Provider errors are actionable and never include the API key',async()=>{
 const key='a'.repeat(32);await assert.rejects(fetchFred('TEST',{mode:'firstRelease',apiKey:key,fetcher:async()=>{throw Error('secret '+key);}}),e=>!e.message.includes(key)&&/connection/.test(e.message));
 await assert.rejects(fetchFred('TEST',{fetcher:async()=>new Response('limit',{status:429})}),/rate limit/);
 await assert.rejects(fetchFred('TEST',{fetcher:async()=>new Response('<html>Sign in</html>')}),/page instead of data/);
});
test('Composite metrics reuse source fetches and outcome series force actual history',async()=>{
 let calls=0;const cache=new Map(),options={mode:'latest',fetcher:async url=>{calls++;const id=new URL(url).searchParams.get('id');return new Response('observation_date,'+id+'\n2024-01-01,'+(id==='UPPER'?5.5:5)+'\n');}};
 const def={id:'13',adapter:'fred',series:['UPPER','LOWER'],transform:'midpoint'};
 assert.equal((await fetchMetric(def,options,cache)).observations[0].value,5.25);await fetchMetric(def,options,cache);assert.equal(calls,2);
 assert.equal((await fetchMetric({...def,id:'market',series:['UPPER'],transform:'level'},{...options,mode:'firstRelease'})).historyQuality,'latest-revised');
});
test('Persistent storage serializes concurrent updates and survives a restart',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ms-store-'));
 try{const store=await new LocalStore(dir,{selected:[],theme:'light'}).init();await Promise.all([store.update({selected:['1','2']}),store.update({theme:'dark'}),store.putSeries('1',{observations:[{date:'2024-01-01',value:1}]})]);const reopened=await new LocalStore(dir,{}).init();assert.deepEqual(reopened.state,{selected:['1','2'],theme:'dark'});assert.equal(reopened.cache['1'].observations[0].value,1);assert.equal((await fs.readdir(dir)).filter(f=>f.endsWith('.tmp')).length,0);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('Malformed or structurally invalid caches are preserved in recovery copies',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ms-recovery-'));
 try{await fs.writeFile(path.join(dir,'settings.json'),'{broken');await fs.writeFile(path.join(dir,'observations.json'),'null');const store=await new LocalStore(dir,{selected:[]}).init();assert.deepEqual(store.cache,{});assert.equal(store.warnings.length,2);assert.equal((await fs.readdir(dir)).filter(f=>f.includes('recovery')).length,2);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('Settings validation rejects outcome predictors, executable fields and invalid rule bounds',()=>{
 assert.throws(()=>validatedPatch({selected:['market']}));assert.throws(()=>validatedPatch({rules:[{kpiId:'1',operator:'below',threshold:0,months:0}]}));
 assert.deepEqual(validatedPatch({selected:['1','1'],theme:'dark',arbitraryCommand:'not used'}),{selected:['1'],theme:'dark'});
});
test('History upgrade preserves saved selections and preferences and applies the new range only once',()=>{
 const defaults={version:2,selected:['1'],theme:'light',trend:{ids:['1'],window:240,transform:'zscore'},lastRefresh:null};
 const old={version:1,selected:['3','9'],theme:'dark',watchlists:[{name:'My indicators',ids:['3','9']}],trend:{ids:['3'],window:120,transform:'native'},lastRefresh:'2026-09-11T09:00:00.000Z'};
 const current=restorePreferences(old,defaults);assert.equal(current.version,2);assert.equal(current.trend.window,240);assert.equal(current.trend.transform,'native');assert.equal(current.theme,'dark');assert.deepEqual(current.selected,old.selected);assert.deepEqual(current.watchlists,old.watchlists);assert.equal(current.lastRefresh,old.lastRefresh);
 current.trend.window=36;assert.equal(restorePreferences(current,defaults).trend.window,36);
 assert.equal(validatedPatch({trend:{...old.trend,window:360}}).trend.window,240);
});
