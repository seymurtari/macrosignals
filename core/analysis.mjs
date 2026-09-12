import {DAY,addDays,monthIndex,monthEnd,average,stdev,monthly,transformPoints,paired,regression} from './series.mjs';

const sigmoid=z=>1/(1+Math.exp(-Math.max(-35,Math.min(35,z))));
export function fitLogistic(rows,lambda=.1) {
  const n=rows.length,p=rows[0].x.length,mu=[],sigma=[];
  for(let j=0;j<p;j++){const a=rows.map(r=>r.x[j]);mu[j]=average(a);sigma[j]=stdev(a)||1;}
  const X=rows.map(r=>r.x.map((v,j)=>(v-mu[j])/sigma[j]));
  const rate=(rows.reduce((s,r)=>s+r.y,0)+.5)/(n+1),w=Array(p).fill(0);let intercept=Math.log(rate/(1-rate));
  for(let it=0;it<350;it++){
    const g=Array(p).fill(0);let gb=0;
    for(let i=0;i<n;i++){const e=sigmoid(intercept+X[i].reduce((s,v,j)=>s+v*w[j],0))-rows[i].y;gb+=e;for(let j=0;j<p;j++)g[j]+=e*X[i][j];}
    intercept-=.12*gb/n;for(let j=0;j<p;j++)w[j]-=.12*(g[j]/n+lambda*w[j]);
  }
  return {mu,sigma,w,intercept,baseRate:rate};
}
export function predict(model,x){return sigmoid(model.intercept+x.reduce((s,v,j)=>s+(v-model.mu[j])/model.sigma[j]*model.w[j],0));}
export function forwardDrawdown(points,start,end,threshold=.1){
  let base;for(const p of points){if(p.date<=start)base=p;else break;}
  if(!base||base.value<=0||Date.parse(start)-Date.parse(base.date)>7*DAY)return null;
  let peak=base.value,maxDrawdown=0,breachDate=null,seen=0,previous=base.date;
  for(const p of points){if(p.date<=start)continue;if(p.date>end)break;if(p.value<=0||Date.parse(p.date)-Date.parse(previous)>7*DAY)return null;previous=p.date;seen++;peak=Math.max(peak,p.value);const dd=1-p.value/peak;if(dd>maxDrawdown)maxDrawdown=dd;if(!breachDate&&dd>=threshold-1e-12)breachDate=p.date;}
  return seen&&Date.parse(end)-Date.parse(previous)<=7*DAY?{y:maxDrawdown>=threshold-1e-12?1:0,maxDrawdown,breachDate}:null;
}
export function asOfValue(series,def,date,{exploratory=false}={}){
  // Date-only vintages enter at least one day later to avoid intraday look-ahead.
  let found=null;
  for(const p of series.observations){
    if(p.date>date)break;
    const known=p.availableDate?addDays(p.availableDate,1):exploratory?addDays(p.date,def.lagDays):null;
    if(known&&known<=date&&(!found||p.date>found.date))found=p;
  }
  if(!found||Date.parse(date)-Date.parse(found.date)>def.freshnessDays*DAY)return null;
  return found.value;
}
export function averagePrecision(rows){
  const positives=rows.reduce((s,r)=>s+r.y,0);if(!positives)return null;
  const sorted=[...rows].sort((a,b)=>b.probability-a.probability);let tp=0,fp=0,ap=0;
  for(let i=0;i<sorted.length;){let j=i,newTp=0;while(j<sorted.length&&sorted[j].probability===sorted[i].probability){if(sorted[j].y){tp++;newTp++;}else fp++;j++;}ap+=(newTp/positives)*(tp/(tp+fp));i=j;}
  return ap;
}
export function metrics(rows,threshold=.5){
  if(!rows.length)return null;
  let tp=0,fp=0,fn=0,tn=0,episodes=0,falseEpisodes=0,inEvent=false,currentAlert=null;const alertGroups=[];
  for(const r of rows){const alert=r.probability>=threshold;if(alert&&r.y)tp++;else if(alert)fp++;else if(r.y)fn++;else tn++;
    if(r.y&&!inEvent)episodes++;inEvent=!!r.y;
    if(alert){if(!currentAlert)currentAlert={rows:[]};currentAlert.rows.push(r);}else if(currentAlert){alertGroups.push(currentAlert);currentAlert=null;}}
  if(currentAlert)alertGroups.push(currentAlert);falseEpisodes=alertGroups.filter(g=>g.rows.every(r=>!r.y)).length;
  const lead=rows.filter(r=>r.y&&r.probability>=threshold&&r.breachDate).map(r=>(Date.parse(r.breachDate)-Date.parse(r.date))/DAY);
  const bins=Array.from({length:5},(_,i)=>{const a=rows.filter(r=>Math.min(4,Math.floor(r.probability*5))===i);return {low:i*.2,high:(i+1)*.2,n:a.length,predicted:a.length?average(a.map(r=>r.probability)):null,observed:a.length?average(a.map(r=>r.y)):null};});
  return {n:rows.length,positiveMonths:tp+fn,eventClusters:episodes,tp,fp,fn,tn,precision:tp+fp?tp/(tp+fp):null,recall:tp+fn?tp/(tp+fn):null,brier:average(rows.map(r=>(r.probability-r.y)**2)),baselineBrier:average(rows.map(r=>(r.baseRate-r.y)**2)),averagePrecision:averagePrecision(rows),falseAlertsPerYear:falseEpisodes/(rows.length/12),alertEpisodes:alertGroups.length,meanLeadDays:lead.length?average(lead):null,bins};
}
function brierInterval(rows){let seed=27;const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const out=[];for(let i=0;i<200;i++){let sample=[];while(sample.length<rows.length){const start=Math.floor(rng()*rows.length);for(let j=0;j<12&&sample.length<rows.length;j++)sample.push(rows[(start+j)%rows.length]);}out.push(average(sample.map(r=>(r.probability-r.y)**2)));}out.sort((a,b)=>a-b);return {low:out[10],high:out[189],level:.9,method:'12-month circular block bootstrap of fixed predictions; excludes model-selection uncertainty'};}

export function runBacktest({catalogue,cache,featureIds,horizon=6,drawdown=.1,target='market',exploratory=false,threshold=.5,featureMode='level',startDate='2000-01-01'}) {
  if(!Array.isArray(featureIds)||featureIds.length<1||featureIds.length>6)throw Error('Choose between one and six predictors.');
  if(new Set(featureIds).size!==featureIds.length||featureIds.some(id=>['market','recession'].includes(id)))throw Error('Outcome series cannot be used as predictors.');
  if(![3,6,12].includes(horizon)||![.1,.2].includes(drawdown)||!['market','recession'].includes(target)||!['level','change'].includes(featureMode))throw Error('Invalid test configuration.');
  const defs=featureIds.map(id=>catalogue.find(k=>k.id===id));
  for(const def of defs){if(!def||!cache[def.id]?.observations?.length)throw Error('Every predictor needs data before testing.');if(!exploratory&&!['fred-first-release','user-first-release'].includes(cache[def.id].historyQuality))throw Error(`${def.name}: first-release history is required. Load it with a FRED key or explicitly choose exploratory revised-history mode.`);}
  const market=cache.market?.observations;if(!market?.length)throw Error('Load or import the market benchmark first.');
  const outcome=target==='recession'?cache.recession?.observations:market;
  if(!outcome?.length)throw Error('Load the recession outcome series first.');
  const earliest=Math.max(monthIndex(startDate),monthIndex(market[0].date));
  const last=monthIndex(outcome.at(-1).date)-horizon;
  const rows=[];let skipped=0;
  for(let m=earliest;m<=last;m++){
    const date=monthEnd(m),end=monthEnd(m+horizon);
    if(end>outcome.at(-1).date)continue;
    const x=defs.map(def=>{const v=asOfValue(cache[def.id],def,date,{exploratory});if(featureMode==='level'||v===null)return v;const old=asOfValue(cache[def.id],def,monthEnd(m-1),{exploratory});return old===null?null:v-old;});
    if(x.some(v=>v===null||!Number.isFinite(v))){skipped++;continue;}
    let label;
    if(target==='market')label=forwardDrawdown(market,date,end,drawdown);
    else {const a=outcome.filter(p=>p.date>date&&p.date<=end);label=a.length===horizon?{y:a.some(p=>p.value>=.5)?1:0,breachDate:a.find(p=>p.value>=.5)?.date||null,maxDrawdown:null}:null;}
    if(label)rows.push({date,end,x,...label});
  }
  if(rows.length<96)throw Error(`Only ${rows.length} complete monthly observations (${skipped} skipped for missing/stale inputs). At least 96 are required: 60+ training months, a horizon gap and 24-month final holdout. Import longer history or choose fewer predictors.`);
  // The last 24 calendar months form a fixed final holdout. Its model is never refit on its labels.
  const holdoutStart=monthEnd(monthIndex(rows.at(-1).date)-23),firstTest=60+horizon+1;
  const predictions=[],folds=[];let model=null,foldStart=null,foldEnd=-1;
  for(let i=firstTest;i<rows.length;i++){
    const row=rows[i],isHoldout=row.date>=holdoutStart;
    if(!model||monthIndex(row.date)>foldEnd||isHoldout&&foldStart<holdoutStart){
      const boundary=isHoldout?holdoutStart:row.date;
      const train=rows.filter(r=>r.end<boundary&&r.date<holdoutStart);
      const positives=train.filter(r=>r.y).length;
      if(train.length<60||positives<5||train.length-positives<5){model=null;continue;}
      model=fitLogistic(train);foldStart=boundary;foldEnd=isHoldout?Infinity:Math.min(monthIndex(row.date)+11,monthIndex(holdoutStart)-1);
      folds.push({start:boundary,trainingStart:train[0].date,trainingEnd:train.at(-1).date,latestTrainingOutcomeEnd:train.at(-1).end,trainingN:train.length,positiveN:positives,holdout:isHoldout,means:model.mu,scales:model.sigma,weights:model.w});
    }
    predictions.push({...row,probability:predict(model,row.x),baseRate:model.baseRate,split:isHoldout?'holdout':'walk-forward'});
  }
  if(predictions.length<12)throw Error('Not enough evaluable test months with both outcomes in the training sample. Add more history or change the outcome.');
  return {createdAt:new Date().toISOString(),mode:exploratory?'exploratory-revised':'first-release',target,horizon,drawdown,threshold,featureMode,featureIds,featureNames:defs.map(d=>d.name),rows:predictions,folds,skipped,holdoutStart,summary:metrics(predictions,threshold),holdout:metrics(predictions.filter(r=>r.split==='holdout'),threshold),walkForward:metrics(predictions.filter(r=>r.split==='walk-forward'),threshold),brierInterval:brierInterval(predictions),sourceQuality:defs.map(d=>({id:d.id,quality:cache[d.id].historyQuality,retrievedAt:cache[d.id].retrievedAt})),warnings:[...(exploratory?['Revised-history simulation with assumed publication delays. Not a point-in-time validation.']:['First-release inputs only; date-only availability is delayed by one day. No subsequent revisions are used.']), 'This is a research evaluation, not a calibrated live downturn forecast.','Overlapping forecast horizons create dependent labels. Event clusters are only a diagnostic, not an independent crisis count.','Changing features after inspecting the holdout invalidates its untouched status.','Benchmarks use the actual imported/provider price series. The default S&P 500 series excludes dividends.']};
}
export function evaluateRules(rules,cache,catalogue,now=new Date()){
  const items=rules.map(rule=>{const def=catalogue.find(k=>k.id===rule.kpiId),s=cache[rule.kpiId],a=monthly(s?.observations||[]);const count=Math.max(1,Math.min(12,Number(rule.months)||1)),last=a.at(-1),stale=!last||now-new Date(s.observations.at(-1).date)>def.freshnessDays*DAY;const recent=a.slice(-count);const consecutive=recent.length===count&&recent.every((p,i)=>!i||monthIndex(p.date)===monthIndex(recent[i-1].date)+1);const matches=v=>rule.operator==='above'?v>rule.threshold:v<rule.threshold;return {...rule,name:def?.name||rule.kpiId,category:def?.category,unit:def?.unit,value:last?.value??null,date:s?.observations?.at(-1)?.date||null,stale,status:stale?'stale':!consecutive?'insufficient':recent.every(p=>matches(p.value))?'triggered':'clear'};});
  const groups=new Map();for(const r of items){if(!['clear','triggered'].includes(r.status))continue;if(!groups.has(r.category))groups.set(r.category,[]);groups.get(r.category).push(r);}
  const scores=[...groups].map(([category,a])=>({category,score:a.filter(r=>r.status==='triggered').length/a.length}));
  return {items,groups:scores,score:scores.length?100*average(scores.map(s=>s.score)):null,coverage:items.filter(r=>['clear','triggered'].includes(r.status)).length,total:items.length};
}
export function eventStudy(ratePoints,marketPoints){
  if(!ratePoints?.length||!marketPoints?.length)return [];
  return ratePoints.flatMap((p,i)=>{if(!i||Math.abs(p.value-ratePoints[i-1].value)<.001)return [];const at=marketPoints.findIndex(x=>x.date>=p.date);if(at<10||at+20>=marketPoints.length)return [];const base=marketPoints[at-1].value;if(base<=0)return [];return [{date:p.date,changeBp:(p.value-ratePoints[i-1].value)*100,before10:100*(base/marketPoints[at-10].value-1),after5:100*(marketPoints[at+4].value/base-1),after20:100*(marketPoints[at+19].value/base-1)}];});
}
export function factorScenario(points,market,shock){const p=paired(transformPoints(points,'change'),transformPoints(market,'pct')),fit=regression(p);return fit?{...fit,shock,estimatedChange:fit.beta*shock}:null;}
