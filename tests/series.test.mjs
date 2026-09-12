import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSeriesCSV,deriveMetric,transformPoints,correlation,paired,rollingCorrelation,exportCSV,historyWindow,historyCoverage,monthKey} from '../core/series.mjs';
const p=(date,value,availableDate=null)=>({date,value,availableDate});
test('CSV preserves zero, drops missing data, handles quoted CRLF and round-trips release dates',()=>{
 const s=parseSeriesCSV('\uFEFF"date","value","available_date"\r\n2024-01-01,0,2024-02-01\r\n2024-02-01,.,\r\n2024-03-01,-2.5,2024-04-01\r\n');
 assert.equal(s.missing,1);assert.deepEqual(s.observations,[p('2024-01-01',0,'2024-02-01'),p('2024-03-01',-2.5,'2024-04-01')]);
 assert.deepEqual(parseSeriesCSV(exportCSV(s.observations),{firstRelease:true}).observations,s.observations);
});
test('CSV rejects impossible dates, duplicate periods, malformed numbers and unsupported first-release assertions',()=>{
 for(const text of ['date,value\n2024-02-30,1','date,value\n2024-01-01,1\n2024-01-01,2','date,value\n2024-01-01,1e','date,value\n2024-01-01,"1,200"'])assert.throws(()=>parseSeriesCSV(text));
 assert.throws(()=>parseSeriesCSV('date,value\n2024-01-01,1',{firstRelease:true}),/available_date/);
 assert.throws(()=>parseSeriesCSV('date,value,available_date\n2024-01-01,1,2023-12-31',{firstRelease:true}),/available_date/);
});
test('Derived metrics respect exact calendar periods and latest constituent availability',()=>{
 const a=[p('2023-01-01',100,'2023-02-10'),p('2023-04-01',103,'2023-05-10'),p('2024-01-01',110,'2024-02-10')];
 const out=deriveMetric({transform:'yoy',frequency:'monthly'},[a]);assert.equal(out.length,1);assert.ok(Math.abs(out[0].value-10)<1e-9);assert.equal(out[0].availableDate,'2024-02-10');
 assert.equal(deriveMetric({transform:'payroll3'},[a])[0].value,1);
 const q=deriveMetric({transform:'qoqAnnualized',frequency:'quarterly'},[a]);assert.ok(Math.abs(q[0].value-((1.03**4-1)*100))<1e-9);
 const ratio=deriveMetric({transform:'ratio'},[[p('2024-01-01',6,'2024-02-01')],[p('2024-01-01',3,'2024-03-01')]]);assert.deepEqual(ratio,[p('2024-01-01',2,'2024-03-01')]);
 assert.deepEqual(deriveMetric({transform:'ratio'},[[p('2024-01-01',6)],[p('2024-01-01',0)]]),[]);
});
test('Missing months never become adjacent monthly changes or lag pairs',()=>{
 const a=[p('2024-01-31',2),p('2024-03-31',8),p('2024-04-30',11)];
 assert.deepEqual(transformPoints(a,'change').map(p=>[p.date,p.value]),[['2024-04-30',3]]);
 const b=[p('2024-02-29',4),p('2024-04-30',16)];assert.deepEqual(paired(a,b,1).map(p=>[p.x,p.y]),[[2,4],[8,16]]);
});
test('Correlations handle tied ranks and degenerate samples',()=>{
 assert.ok(Math.abs(correlation([1,2,3],[3,2,1])+1)<1e-10);
 assert.equal(correlation([1,1,1],[1,2,3]),null);assert.equal(correlation([1,2],[1,2]),null);
 assert.ok(Math.abs(correlation([1,1,2,3],[1,2,3,4],'spearman')-.9486832980505138)<1e-10);
 const short=[p('2024-01-31',1),p('2024-02-29',2),p('2024-03-31',3)];assert.deepEqual(rollingCorrelation(short,short),[]);
});
test('20-year views bound the displayed calendar months while retaining growth-rate warmup data',()=>{
 const points=Array.from({length:400},(_,i)=>p(monthKey(1993*12+6+i)+'-01',100+i));
 const view=historyWindow(points,'native',240,'2026-09-12');
 assert.equal(view.length,240);assert.equal(view[0].date,'2006-10-31');assert.equal(view.at(-1).date,'2026-09-30');
 const growth=historyWindow(points,'yoy',240,'2026-09-12');assert.equal(growth.length,240);
 const first=points.findIndex(p=>p.date==='2006-10-01');assert.ok(Math.abs(growth[0].value-100*(points[first].value/points[first-12].value-1))<1e-10);
 const altered=structuredClone(points);altered[0].value=1e12;
 assert.deepEqual(historyWindow(points,'zscore',240,'2026-09-12'),historyWindow(altered,'zscore',240,'2026-09-12'));
 assert.deepEqual(historyCoverage(points,240,'2026-09-12'),{from:'2006-10-01',to:'2026-09-01',n:240,requestedFrom:'2006-10-01'});
});
test('Short histories remain short and future observations are excluded from display coverage',()=>{
 const points=[p('2024-01-05',2),p('2024-03-11',4),p('2026-10-01',99)];
 const view=historyWindow(points,'native',240,'2026-09-12');assert.equal(view.length,2);assert.deepEqual(view.map(p=>p.value),[2,4]);
 assert.deepEqual(historyCoverage(points,240,'2026-09-12'),{from:'2024-01-05',to:'2024-03-11',n:2,requestedFrom:'2006-10-01'});
 assert.equal(historyCoverage([],240,'2026-09-12').n,0);
});
