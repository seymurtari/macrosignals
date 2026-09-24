import test from 'node:test';
import assert from 'node:assert/strict';
import catalogue from '../data/catalogue.json' with {type:'json'};
import {fetchMetric} from '../core/providers.mjs';
import {fetchTreasury,parseTreasuryXML} from '../core/treasury.mjs';
import {dueIds,observationStale} from '../core/freshness.mjs';
import {today} from '../core/series.mjs';

const def=id=>catalogue.find(k=>k.id===id);
const entry=(date,values)=>`<entry><updated>2099-01-01T00:00:00Z</updated><content><m:properties><d:NEW_DATE m:type="Edm.DateTime">${date}T00:00:00</d:NEW_DATE>${Object.entries(values).map(([key,value])=>`<d:${key} m:type="Edm.Double">${value}</d:${key}>`).join('')}</m:properties></content></entry>`;
const nominal=(date,ten=5.18)=>`<?xml version="1.0"?><feed>${entry(date,{BC_10YEAR:ten,BC_2YEAR:4.1,BC_3MONTH:3.8})}</feed>`;
const real=date=>`<?xml version="1.0"?><feed>${entry(date,{TC_10YEAR:2.85})}</feed>`;

test('Treasury parser reads dated OData observations and rejects empty or malformed feeds',()=>{
  const points=parseTreasuryXML(nominal(today()),['BC_10YEAR','BC_3MONTH']);
  assert.deepEqual(points,[{date:today(),values:[5.18,3.8]}]);
  assert.throws(()=>parseTreasuryXML('<html>Not XML</html>',['BC_10YEAR']),/invalid XML/);
  assert.throws(()=>parseTreasuryXML(`<feed>${entry(today(),{BC_2YEAR:4.1})}</feed>`,['BC_10YEAR']),/no usable rates/);
});

test('All five Treasury KPIs use official recent values and share one nominal curve fetch',async()=>{
  const calls=[],cache=new Map(),date=today();
  const fetcher=async url=>{calls.push(url);if(url.includes('home.treasury.gov'))return new Response(url.includes('real_yield')?real(date):nominal(date));
    const id=new URL(url).searchParams.get('id');return new Response(`observation_date,${id}\n2005-01-03,4.50\n`);};
  const result={};for(const id of ['1','6','10','11','12'])result[id]=await fetchMetric(def(id),{fetcher},cache);
  assert.equal(calls.filter(url=>url.includes('home.treasury.gov')).length,2);
  assert.deepEqual(['1','6','10','11','12'].map(id=>result[id].observations.at(-1).value),[1.38,1.08,2.85,5.18,4.1]);
  for(const id of Object.keys(result)){assert.equal(result[id].latestSource,'U.S. Treasury');assert.equal(result[id].observations[0].date,'2005-01-03');}
});

test('FRED and Treasury fallback preserve newer cached values and explain the source',async()=>{
  const date=today(),previous={observations:[{date:'2005-01-03',value:4.5},{date,value:5.18}],historyQuality:'latest-revised',latestSource:'U.S. Treasury',sourceUrl:'https://home.treasury.gov/treasury-daily-interest-rate-xml-feed'};
  const fredOnly=await fetchMetric(def('11'),{previousSeries:previous,fetcher:async url=>url.includes('home.treasury.gov')?new Response('error',{status:503}):new Response('observation_date,DGS10\n2005-01-03,4.50\n')});
  assert.equal(fredOnly.observations.at(-1).value,5.18);assert.equal(fredOnly.latestSource,'U.S. Treasury');assert.match(fredOnly.providerWarning,/HTTP 503/);
  const treasuryOnly=await fetchMetric(def('11'),{previousSeries:previous,fetcher:async url=>url.includes('home.treasury.gov')?new Response(nominal(date,5.19)):new Response('error',{status:503})});
  assert.equal(treasuryOnly.observations[0].date,'2005-01-03');assert.equal(treasuryOnly.observations.at(-1).value,5.19);
  assert.equal(treasuryOnly.latestSource,'U.S. Treasury');
});

test('First-release history keeps conservative first-seen dates for direct Treasury observations',async()=>{
  let ten=5.18;const date=today();
  const fetcher=async url=>url.includes('home.treasury.gov')?new Response(nominal(date,ten)):Response.json({count:1,observations:[{date:'2005-01-03',value:'4.5',realtime_start:'2005-01-04'}]});
  const options={mode:'firstRelease',apiKey:'a'.repeat(32),fetcher};
  const first=await fetchMetric(def('11'),options);
  assert.equal(first.historyQuality,'treasury-with-fred-first-release');assert.equal(first.observations.at(-1).availableDate,date);
  ten=5.25;const second=await fetchMetric(def('11'),{...options,previousSeries:first});
  assert.equal(second.observations.at(-1).value,5.18);
  assert.equal(second.observations.at(-1).availableDate,date);
});

test('Due checks are per KPI, retry failures after an hour, and protect imports',()=>{
  const now=Date.parse('2026-09-24T21:00:00Z'),cache={
    '11':{retrievedAt:'2026-09-24T19:30:00Z'},
    '1':{retrievedAt:'2026-09-24T20:30:00Z'},
    '2':{retrievedAt:'2026-09-23T20:00:00Z'},
    '6':{historyQuality:'user-first-release'},
    market:{retrievedAt:'2026-09-24T20:00:00Z'}
  };
  assert.deepEqual(dueIds(catalogue,['11','1','2','6'],cache,new Map(),now),['11','2','recession']);
  assert.deepEqual(dueIds(catalogue,['11','1','2','6'],cache,new Map([['11',now-1800000]]),now),['2','recession']);
  assert.equal(observationStale(def('11'),'2026-09-22',new Date('2026-09-24T16:00:00Z')),true);
  assert.equal(observationStale(def('11'),'2026-09-23',new Date('2026-09-24T16:00:00Z')),false);
});
