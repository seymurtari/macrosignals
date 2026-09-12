import test from 'node:test';
import assert from 'node:assert/strict';
import {asOfValue,forwardDrawdown,runBacktest,evaluateRules,eventStudy,averagePrecision} from '../core/analysis.mjs';
import {DAY,addDays,monthEnd,monthIndex} from '../core/series.mjs';
const p=(date,value,availableDate=null)=>({date,value,availableDate});
import {fixture} from './fixtures.mjs';
test('As-of features exclude releases on the prediction day and enforce staleness',()=>{
 const d={lagDays:15,freshnessDays:60},s={observations:[p('2024-01-01',1,'2024-02-15')]};
 assert.equal(asOfValue(s,d,'2024-02-15'),null);assert.equal(asOfValue(s,d,'2024-02-16'),1);assert.equal(asOfValue(s,d,'2024-04-01'),null);
 s.observations[0].availableDate=null;assert.equal(asOfValue(s,d,'2024-02-01'),null);assert.equal(asOfValue(s,d,'2024-02-01',{exploratory:true}),1);
});
test('Drawdown labels use forward running peaks, include exact 10%, reject gaps',()=>{
 const a=[p('2024-01-01',100),p('2024-01-02',120),p('2024-01-03',108),p('2024-01-04',110)];
 const r=forwardDrawdown(a,'2024-01-01','2024-01-04',.1);assert.equal(r.y,1);assert.equal(r.breachDate,'2024-01-03');assert.ok(Math.abs(r.maxDrawdown-.1)<1e-10);
 assert.equal(forwardDrawdown([a[0],p('2024-02-01',90)],'2024-01-01','2024-02-01'),null);
 assert.equal(forwardDrawdown(a,'2024-01-01','2024-02-01'),null);
});
test('Backtest refuses revised predictors by default and outcomes as features',()=>{
 const f=fixture();f.cache.a.historyQuality='latest-revised';assert.throws(()=>runBacktest(f),/first-release history/);
 assert.throws(()=>runBacktest({...f,featureIds:['market']}),/Outcome series/);
});
test('Walk-forward labels are purged, training scalers exclude the future, final holdout is frozen',()=>{
 const f=fixture(),r=runBacktest(f);assert.ok(r.rows.length>100);assert.equal(r.holdout.n,24);assert.equal(r.folds.filter(f=>f.holdout).length,1);
 for(const fold of r.folds){assert.ok(fold.latestTrainingOutcomeEnd<fold.start);assert.ok(fold.trainingEnd<r.holdoutStart);}
 const modified=structuredClone(f);for(const pt of modified.cache.a.observations)if(pt.date>=r.holdoutStart)pt.value=10000;
 const r2=runBacktest(modified);assert.deepEqual(r.folds,r2.folds);
 assert.deepEqual(r.rows.filter(p=>p.split==='walk-forward'),r2.rows.filter(p=>p.split==='walk-forward'));
 assert.ok(r.summary.brier>=0&&r.summary.brier<=1);assert.equal(r.brierInterval.level,.9);
 const bad=structuredClone(f);bad.cache.a.observations.forEach(p=>p.availableDate='2099-01-01');assert.throws(()=>runBacktest(bad),/Only 0 complete/);
});
test('Rules require consecutive months, ignore stale series, and group related indicators',()=>{
 const catalogue=[{id:'a',name:'A',category:'rates',freshnessDays:65},{id:'b',name:'B',category:'rates',freshnessDays:65},{id:'c',name:'C',category:'jobs',freshnessDays:65}];
 const rules=catalogue.map(d=>({id:d.id,kpiId:d.id,operator:'above',threshold:0,months:2}));
 const cache={a:{observations:[p('2024-01-31',2),p('2024-02-29',2)]},b:{observations:[p('2024-01-31',-1),p('2024-02-29',-1)]},c:{observations:[p('2024-01-31',2),p('2024-02-29',2)]}};
 const r=evaluateRules(rules,cache,catalogue,new Date('2024-03-01'));assert.equal(r.score,75);assert.equal(r.coverage,3);
 cache.c.observations[0].date='2023-12-31';assert.equal(evaluateRules(rules,cache,catalogue,new Date('2024-03-01')).items[2].status,'insufficient');
 assert.equal(evaluateRules(rules,cache,catalogue,new Date('2025-01-01')).score,null);
});
test('Average precision groups tied scores, policy events skip unchanged decisions',()=>{
 assert.equal(averagePrecision([{y:1,probability:.5},{y:0,probability:.5}]),.5);
 const market=Array.from({length:60},(_,i)=>p(addDays('2024-01-01',i),100+i));
 const rates=[p('2024-01-01',5),p('2024-01-02',5),p('2024-01-20',5.25)];
 const r=eventStudy(rates,market);assert.equal(r.length,1);assert.equal(r[0].changeBp,25);assert.ok(Math.abs(r[0].after5-100*(123/118-1))<1e-9);
});
