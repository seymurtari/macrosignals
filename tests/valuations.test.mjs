import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parsePE,parsePCF,PCF_URL} from '../core/valuations.mjs';
import {fetchMetric} from '../core/providers.mjs';
import {createApp} from '../web/server.mjs';
const catalogue=JSON.parse(await readFile(new URL('../data/catalogue.json',import.meta.url),'utf8'));
const stamp=d=>d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const date=new Date(),iso=date.toISOString().slice(0,10),yesterday=new Date(date.getTime()-86400000).toISOString().slice(0,10);
const pe='<h1>S&amp;P 500 PE Ratio</h1><table id="datatable">'+Array.from({length:12},(_,i)=>{const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()-i,1));return `<tr><td>${stamp(d)}</td><td>&#x2002;<abbr>†</abbr>25.2</td></tr>`;}).join('')+'</table>';
const pcf=(value='18.5',day=stamp(date))=>`<section><h2>Fund Characteristics</h2><tr><th>Price/Cash Flow</th><td>999</td></tr></section><section><h2 class="comp-title">Index Characteristics <span class="date">as of ${day}</span></h2><table><tr><th>Price/Cash Flow</th><td>${value}</td></tr><tr><th>Price/Earnings</th><td>27</td></tr></table></section>`;
test('Valuation parsers use the intended table, dated index ratio and reject malformed values',()=>{
 assert.equal(parsePE(pe).length,12);assert.equal(parsePE(pe)[0].value,25.2);
 assert.deepEqual(parsePCF(pcf()),[{date:iso,value:18.5}]);
 for(const value of ['N/A','','Infinity','18.5%'])assert.throws(()=>parsePCF(pcf(value)));
 assert.throws(()=>parsePCF(pcf().replace('Index Characteristics','Fund Characteristics')));
 assert.throws(()=>parsePCF(pcf('18.5','Feb 30, 2026')));
 assert.throws(()=>parsePE(pe.replace('datatable','other')));
});
test('Latest valuations work independently of FRED mode; cash-flow snapshots merge without duplicate dates',async()=>{
 const def=catalogue.find(k=>k.id==='52');const old={sourceUrl:PCF_URL,historyQuality:'latest-revised',observations:[{date:yesterday,value:18},{date:iso,value:18.1}]};
 const got=await fetchMetric(def,{mode:'firstRelease',previousSeries:old,fetcher:async()=>new Response(pcf())});
 assert.deepEqual(got.observations,[{date:yesterday,value:18},{date:iso,value:18.5}]);assert.equal(got.historyQuality,'latest-revised');assert.equal(old.observations[1].value,18.1);
 await assert.rejects(fetchMetric(def,{previousSeries:{...old,historyQuality:'import-revised'}}),/Imported/);
 await assert.rejects(fetchMetric(def,{fetcher:async()=>new Response('',{status:403})}),/403/);
 await assert.rejects(fetchMetric(def,{fetcher:async()=>new Response(pcf('18','Jan 1, 2000'))}),/recent/);
 const history=await fetchMetric(catalogue.find(k=>k.id==='51'),{mode:'firstRelease',fetcher:async()=>new Response(pe)});assert.equal(history.observations.length,12);
});
test('Authenticated web refresh connects both KPIs and preserves cache on provider failure',async()=>{
 let bad=false;const cache={};let state={mode:'latest',selected:['51','52']};
 const store={warnings:[],snapshot:async()=>({state,cache}),update:async p=>(state={...state,...p}),putSeries:async(id,s)=>{cache[id]=s;},close:async()=>{}};
 const password='valuation-test-long-password';const app=await createApp({env:{APP_PASSWORD:password},store,fetcher:async url=>new Response(bad?'blocked':String(url).includes('multpl')?pe:pcf(),{status:bad?403:200})});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${app.server.address().port}`;
 try{
 const logged=await fetch(url+'/login',{method:'POST',headers:{Origin:url},body:new URLSearchParams({password}),redirect:'manual'});const cookie=logged.headers.get('set-cookie').split(';')[0];
 const refresh=id=>fetch(url+'/api/refresh-one',{method:'POST',headers:{Origin:url,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({id})});
 for(const id of ['51','52'])assert.equal((await refresh(id)).status,200);
 const before=JSON.stringify(cache);bad=true;assert.equal((await refresh('52')).status,400);assert.equal(JSON.stringify(cache),before);
 }finally{await app.close();}
});
