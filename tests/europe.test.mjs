import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fetchMetric} from '../core/providers.mjs';
import {parseEuropeanCSV,marketPerformance} from '../core/europe.mjs';
import {deriveMetric} from '../core/series.mjs';
import {refreshableIds} from '../core/freshness.mjs';
const catalogue=JSON.parse(await fs.readFile(new URL('../data/catalogue.json',import.meta.url)));
const groups=JSON.parse(await fs.readFile(new URL('../data/catalogue-groups.json',import.meta.url)));
const def=id=>catalogue.find(k=>k.id===id);
test('All 16 European KPIs have exactly one group, explicit geography and data access',()=>{
 const added=catalogue.filter(k=>k.rank>=53);assert.equal(added.length,16);
 for(const k of added){assert.equal(groups.filter(g=>g.ids.includes(k.id)).length,1);assert.ok(k.region&&k.currency&&k.historyNote);}
 assert.equal(refreshableIds(catalogue,added.map(k=>k.id),{}).filter(id=>Number(id)>=53).length,7);
 assert.ok(!refreshableIds(catalogue,['53'],{'53':{historyQuality:'import-revised'}}).includes('53'));
});
test('Sovereign spreads align dates, convert percent to basis points and preserve release timing',()=>{
 const result=deriveMetric({transform:'spreadBp'},[[{date:'2026-07-01',value:4,availableDate:'2026-08-15'},{date:'2026-08-01',value:5}],[{date:'2026-07-01',value:3,availableDate:'2026-08-20'}]]);
 assert.deepEqual(result,[{date:'2026-07-01',value:100,availableDate:'2026-08-20'}]);
});
test('Bundesbank refresh calculates a daily curve spread and skips missing holidays',async()=>{
 const result=await fetchMetric(def('54'),{fetcher:async url=>{
  const short=url.includes('A610'),id=def('54').series[short?1:0];
  return new Response(`BBK_ID;TIME_PERIOD;OBS_VALUE;BBK_UNIT_MULT\n${id};2026-09-01;${short?2:3};0\n${id};2026-09-02;.;0\n`);
 }});
 assert.equal(result.observations.length,1);assert.equal(result.observations[0].value,100);assert.equal(result.missing,2);
});
test('ECB CSV handles quoted metadata and refuses the wrong series or units',async()=>{
 const id=def('64').series[0],csv=`KEY,TIME_PERIOD,OBS_VALUE,UNIT_MULT,TITLE\n${id},2026-09-01,0.2,0,"Stress, euro area"\n`;
 const result=await fetchMetric(def('64'),{fetcher:async()=>new Response(csv)});assert.equal(result.observations[0].value,.2);
 assert.throws(()=>parseEuropeanCSV(csv,'ecb','OTHER'),/not returned/);
 assert.throws(()=>parseEuropeanCSV(csv.replace(',0,"',',3,"'),'ecb',id),/multiplier/);
 await assert.rejects(fetchMetric(def('64'),{mode:'firstRelease'}),/revised history/);
 await assert.rejects(fetchMetric(def('53'),{fetcher:async()=>new Response('error',{status:503})}),/503/);
});
test('FRED sovereign spread integration converts only overlapping monthly points',async()=>{
 const result=await fetchMetric(def('55'),{fetcher:async url=>{
  const id=new URL(url).searchParams.get('id');return new Response(`observation_date,${id}\n2026-07-01,${id.includes('IT')?4.2:3.2}\n`);
 }});assert.ok(Math.abs(result.observations[0].value-100)<1e-8);assert.equal(result.frequency,'monthly');
});
test('Total-return summaries use calendar anchors and loaded-history peaks',()=>{
 const r=marketPerformance([{date:'2025-09-30',value:100},{date:'2026-06-30',value:110},{date:'2026-08-28',value:125},{date:'2026-09-30',value:120}]);
 assert.ok(Math.abs(r[0].value+4)<1e-8);assert.ok(Math.abs(r[2].value-20)<1e-8);assert.ok(Math.abs(r[3].value+4)<1e-8);
 assert.equal(marketPerformance([{date:'2026-09-30',value:120}])[0].value,null);
});
