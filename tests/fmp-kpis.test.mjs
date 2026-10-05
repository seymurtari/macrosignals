import test from 'node:test';
import assert from 'node:assert/strict';
import {createFmpKpis} from '../core/fmp-kpis.mjs';
const def=(metric,symbol='AAPL')=>({id:'test',symbol,fmpMetric:metric,unit:'%',frequency:'annual',url:'https://site.financialmodelingprep.com/developer/docs'});
const row=(year,extra={})=>({symbol:'AAPL',date:`${year}-09-30`,period:'FY',reportedCurrency:'USD',revenue:100,netIncome:20,...extra});
const now=()=>Date.parse('2026-10-05');
test('annual calculations enforce matching dates/currencies and positive denominators',async()=>{
 const income=[row(2023),row(2024,{revenue:120,netIncome:-5}),row(2025,{revenue:150,netIncome:30})];
 let calls=0;const client=createFmpKpis({apiKey:'secret',now,fetcher:async(url,opt)=>{calls++;assert.equal(opt.headers.apikey,'secret');assert.ok(!url.includes('secret'));return Response.json(url.includes('cash-flow')?[row(2023,{freeCashFlow:10,operatingCashFlow:25}),row(2024,{reportedCurrency:'EUR',freeCashFlow:20}),row(2025,{freeCashFlow:15,operatingCashFlow:45})]:income);}});
 assert.deepEqual((await client.fetchMetric(def('revenueGrowth'))).observations.map(p=>Math.round(p.value)),[20,25]);
 assert.deepEqual((await client.fetchMetric(def('netMargin'))).observations.map(p=>Math.round(p.value)),[20,-4,20]);
 assert.equal((await client.fetchMetric(def('incomeGrowth'))).observations.length,0);
 assert.deepEqual((await client.fetchMetric(def('fcfMargin'))).observations.map(p=>p.value),[10,10]);
 assert.deepEqual((await client.fetchMetric(def('cashConversion'))).observations.map(p=>p.value),[1.25,1.5]);assert.equal(calls,2);
});
test('price windows omit warm-up and use sample volatility',async()=>{
 const rows=Array.from({length:260},(_,i)=>({symbol:'NVDA',date:new Date(Date.parse('2025-01-01')+i*86400000).toISOString().slice(0,10),price:100}));
 const c=createFmpKpis({apiKey:'x',now,fetcher:async()=>Response.json(rows)});
 for(const [metric,count] of [['ma200',61],['drawdown',9],['volatility',240]]){const s=await c.fetchMetric(def(metric,'NVDA'));assert.equal(s.observations.length,count);assert.ok(s.observations.every(p=>p.value===0));}
});
test('revisions require separate days, match fiscal targets, and persist the baseline',async()=>{
 let day=Date.parse('2026-10-05'),eps=10;const c=createFmpKpis({apiKey:'x',now:()=>day,fetcher:async()=>Response.json([{symbol:'AAPL',date:'2027-09-30',epsAvg:eps}])});
 const first=await c.fetchMetric(def('epsRevision'));assert.equal(first.coverageStatus,'collecting');assert.equal(first.observations.length,0);
 const same=await c.fetchMetric(def('epsRevision'),{previousSeries:first});assert.equal(same.fmpSnapshots.length,1);
 day+=86400000;eps=11;const second=await c.fetchMetric(def('epsRevision'),{previousSeries:first});assert.ok(Math.abs(second.observations[0].value-10)<1e-10);assert.equal(second.observations[0].targetPeriod,'2027-09-30');
});
test('wrong symbols, null fields, invalid dates and quarterly rows are rejected',async()=>{
 const c=createFmpKpis({apiKey:'x',now,fetcher:async()=>Response.json([row(2025,{symbol:'GOOG'}),row(2025,{period:'Q4'}),row(2025,{revenue:null,netIncome:null}),row(2025,{date:'invalid'})])});
 await assert.rejects(c.fetchMetric(def('netMargin')),/No valid/);
});
test('restricted responses never expose provider text; rate limit stops other symbols',async()=>{
 const c=createFmpKpis({apiKey:'secret',now,fetcher:async()=>new Response('secret',{status:403})});await assert.rejects(c.fetchMetric(def('netMargin','BRK.A')),/access restricted/);
 let calls=0;const r=createFmpKpis({apiKey:'secret',now,fetcher:async()=>{calls++;return new Response('secret',{status:429});}});
 await assert.rejects(r.fetchMetric(def('netMargin')));await assert.rejects(r.fetchMetric(def('netMargin','ASML')));assert.equal(calls,1);
 await assert.rejects(c.fetchMetric(def('netMargin'),{mode:'firstRelease'}),/first-release/);
});
test('catalogue has all requested metrics for each company and each is grouped',async()=>{
 const {readFile}=await import('node:fs/promises');const catalogue=JSON.parse(await readFile(new URL('../data/catalogue.json',import.meta.url))),groups=JSON.parse(await readFile(new URL('../data/catalogue-groups.json',import.meta.url)));
 const entries=catalogue.filter(k=>k.adapter==='fmp');assert.equal(entries.length,103);for(const symbol of ['AAPL','NVDA','GOOG','BRK.A','ASML','TSM'])assert.equal(entries.filter(k=>k.symbol===symbol).length,17);for(const k of entries)assert.equal(groups.filter(g=>g.ids.includes(k.id)).length,1);
});
test('empty EPS baseline and unavailable status survive local store restart',async()=>{
 const {LocalStore}=await import('../core/storage.cjs');const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const dir=await mkdtemp(tmpdir()+'/fmp-persist-');
 try{const store=await new LocalStore(dir,{}).init();await store.putSeries('baseline',{observations:[],coverageStatus:'collecting',fmpSnapshots:[{date:'2026-10-05',estimates:[{period:'2027-09-30',eps:10}]}]});await store.putSeries('blocked',{observations:[],coverageStatus:'unavailable'});const reopened=await new LocalStore(dir,{}).init();assert.equal(reopened.cache.baseline.fmpSnapshots[0].estimates[0].eps,10);assert.equal(reopened.cache.blocked.coverageStatus,'unavailable');assert.equal(reopened.warnings.length,0);}finally{await rm(dir,{recursive:true,force:true});}
});
test('Starter requests stay within five years and five annual records',async()=>{
 const requests=[];const c=createFmpKpis({apiKey:'x',now,fetcher:async address=>{const url=new URL(address);requests.push(url);if(url.pathname.includes('/light')){assert.equal(url.searchParams.get('from'),'2021-10-05');assert.equal(url.searchParams.get('to'),'2026-10-05');return Response.json([{symbol:'AAPL',date:'2026-10-02',price:100}]);}assert.equal(url.searchParams.get('limit'),'5');assert.equal(url.searchParams.get('period'),'annual');return Response.json([row(2025)]);}});
 for(const symbol of ['AAPL','NVDA','GOOG','BRK.A','ASML','TSM']){await c.fetchMetric(def('netMargin',symbol)).catch(e=>{assert.match(e.message,/No valid/);});}
 await c.fetchMetric(def('ma200'));assert.equal(requests.length,7);assert.deepEqual(requests.slice(0,6).map(u=>u.searchParams.get('symbol')),['AAPL','NVDA','GOOG','BRK.A','ASML','TSM']);
});
