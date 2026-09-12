export const DAY = 86400000;
export function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s; }
export const today = () => new Date().toISOString().slice(0,10);
export const addDays = (s,n) => new Date(Date.parse(s)+n*DAY).toISOString().slice(0,10);
export const monthIndex = s => +s.slice(0,4)*12 + +s.slice(5,7)-1;
export function monthKey(n) { return `${Math.floor(n/12)}-${String(n%12+1).padStart(2,'0')}`; }
export function monthEnd(n) { return new Date(Date.UTC(Math.floor(n/12),n%12+1,0)).toISOString().slice(0,10); }

// Small RFC4180 parser. Missing numbers remain missing; they never become zero.
export function csvRows(text) {
  if (typeof text !== 'string' || text.length > 12_000_000) throw Error('CSV must be smaller than 12 MB.');
  const rows=[]; let row=[],field='',quoted=false;
  const s=text.replace(/^\uFEFF/,'');
  for(let i=0;i<s.length;i++) {
    const c=s[i];
    if(c==='"') { if(quoted && s[i+1]==='"'){field+='"';i++;} else if(!quoted && field!=='')throw Error('Unexpected quote in CSV.');else quoted=!quoted; }
    else if(c===','&&!quoted){row.push(field);field='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&s[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);field='';row=[];}
    else field+=c;
  }
  if(quoted)throw Error('Unclosed quote in CSV.');
  row.push(field);if(row.some(x=>x.trim()))rows.push(row);
  return rows;
}
export function parseSeriesCSV(text, {firstRelease=false, valueColumn}={}) {
  const rows=csvRows(text);if(rows.length<2)throw Error('CSV needs a header and at least one observation.');
  const headers=rows.shift().map(x=>x.trim());
  const di=headers.findIndex(x=>['date','observation_date'].includes(x.toLowerCase()));
  const ai=headers.findIndex(x=>x.toLowerCase()==='available_date');
  const vi=valueColumn ? headers.indexOf(valueColumn) : headers.findIndex((x,i)=>i!==di&&i!==ai&&x.toLowerCase()!=='vintage_date');
  if(di<0||vi<0)throw Error('CSV requires date (YYYY-MM-DD) and value columns.');
  if(firstRelease&&ai<0)throw Error('First-release imports require an available_date column.');
  const observations=[],seen=new Set();let missing=0;
  for(let i=0;i<rows.length;i++) {
    const r=rows[i],date=r[di]?.trim(),v=r[vi]?.trim();
    if(!validDate(date))throw Error(`Invalid date on CSV row ${i+2}. Use YYYY-MM-DD.`);
    if(seen.has(date))throw Error(`Duplicate observation date ${date}. Import one first release per observation period.`);
    seen.add(date);
    if(v===undefined||['','.','NA','N/A','null'].includes(v)){missing++;continue;}
    if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(v)||!Number.isFinite(Number(v)))throw Error(`Invalid numeric value on CSV row ${i+2}.`);
    const availableDate=ai>=0?r[ai]?.trim():null;
    if(availableDate&&(!validDate(availableDate)||availableDate<date))throw Error(`Invalid available_date on CSV row ${i+2}.`);
    if(firstRelease&&!availableDate)throw Error(`Missing available_date on CSV row ${i+2}.`);
    observations.push({date,value:Number(v),availableDate:availableDate||null});
  }
  if(!observations.length)throw Error('CSV contains no numeric observations.');
  if(observations.length>100_000)throw Error('Limit: 100,000 observations per series.');
  observations.sort((a,b)=>a.date.localeCompare(b.date));
  return {observations,missing};
}
const availability = rows => rows.every(x=>validDate(x.availableDate)) ? rows.reduce((m,x)=>x.availableDate>m?x.availableDate:m,'') : null;
export function deriveMetric(def,components) {
  const first=components[0]||[];
  if(def.transform==='level')return first.map(x=>({...x}));
  const maps=components.map(a=>new Map(a.map(x=>[x.date,x])));
  if(['midpoint','ratio'].includes(def.transform))return first.flatMap(p=>{
    const b=maps[1]?.get(p.date);if(!b||(def.transform==='ratio'&&b.value===0))return [];
    return [{date:p.date,value:def.transform==='ratio'?p.value/b.value:(p.value+b.value)/2,availableDate:availability([p,b])}];
  });
  const byMonth=new Map(first.map(x=>[monthIndex(x.date),x]));
  return first.flatMap((p,i)=>{
    let old;
    if(def.transform==='yoy') {
      if(def.frequency==='weekly'||def.frequency==='daily') { const target=addDays(p.date,-365); let j=i-1;while(j>=0&&first[j].date>target)j--;old=first[j];if(old&&Date.parse(target)-Date.parse(old.date)>14*DAY)old=null; }
      else old=byMonth.get(monthIndex(p.date)-12);
    } else old=byMonth.get(monthIndex(p.date)-3);
    if(!old)return [];
    let value;
    if(def.transform==='payroll3')value=(p.value-old.value)/3;
    else {if(old.value<=0||p.value<0)return [];value=def.transform==='qoqAnnualized'?((p.value/old.value)**4-1)*100:(p.value/old.value-1)*100;}
    return [{date:p.date,value,availableDate:availability([p,old])}];
  });
}
export function monthly(points) {
  const map=new Map();for(const p of points||[])if(Number.isFinite(p.value))map.set(p.date.slice(0,7),p);
  return [...map].sort(([a],[b])=>a.localeCompare(b)).map(([key,p])=>({...p,month:key,date:monthEnd(monthIndex(key))}));
}
export function transformPoints(points,mode='native') {
  const a=monthly(points),map=new Map(a.map(p=>[monthIndex(p.date),p]));
  if(mode==='native')return a;
  if(mode==='zscore') {const m=average(a.map(p=>p.value)),s=stdev(a.map(p=>p.value));return a.map(p=>({...p,value:s?(p.value-m)/s:0}));}
  return a.flatMap(p=>{const prior=map.get(monthIndex(p.date)-(mode==='yoy'?12:1));if(!prior)return [];if(mode==='change')return [{...p,value:p.value-prior.value}];if(prior.value===0)return [];return [{...p,value:100*(p.value/prior.value-1)}];});
}
// Include the current calendar month and at most 239 preceding months.
// Keep earlier inputs for growth calculations, but fit display z-scores only
// over the visible observations. No data is invented for shorter histories.
export function historyWindow(points,mode='native',months=240,asOf=today()) {
  if(!Number.isInteger(months)||months<1||months>240||!validDate(asOf))throw Error('Choose a history window of up to 20 years.');
  const cutoff=monthIndex(asOf)-months+1,known=(points||[]).filter(p=>p.date<=asOf);
  const visible=p=>monthIndex(p.date)>=cutoff;
  return mode==='zscore'?transformPoints(known.filter(visible),mode):transformPoints(known,mode).filter(visible);
}
export function historyCoverage(points,months=240,asOf=today()) {
  if(!Number.isInteger(months)||months<1||months>240||!validDate(asOf))throw Error('Choose a history window of up to 20 years.');
  const cutoff=monthIndex(asOf)-months+1;
  const available=(points||[]).filter(p=>p.date<=asOf&&monthIndex(p.date)>=cutoff);
  return {from:available[0]?.date||null,to:available.at(-1)?.date||null,n:available.length,requestedFrom:monthKey(cutoff)+'-01'};
}
export const average = a => a.length?a.reduce((s,v)=>s+v,0)/a.length:NaN;
export function stdev(a) {const m=average(a);return Math.sqrt(average(a.map(v=>(v-m)**2)));}
export function ranks(a){const s=a.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v),out=[];for(let i=0;i<s.length;){let j=i;while(j+1<s.length&&s[j+1].v===s[i].v)j++;for(let k=i;k<=j;k++)out[s[k].i]=(i+j)/2+1;i=j+1;}return out;}
export function correlation(a,b,method='pearson') {
  if(a.length!==b.length||a.length<3)return null;
  if(method==='spearman'){a=ranks(a);b=ranks(b);}
  const ma=average(a),mb=average(b),sa=stdev(a),sb=stdev(b);
  if(sa<1e-12||sb<1e-12)return null;
  return Math.max(-1,Math.min(1,average(a.map((v,i)=>(v-ma)*(b[i]-mb)))/(sa*sb)));
}
export function paired(a,b,lag=0) {
  const map=new Map(b.map(p=>[monthIndex(p.date),p]));
  return a.flatMap(p=>{const q=map.get(monthIndex(p.date)+lag);return q?[{date:q.date,x:p.value,y:q.value,xDate:p.date}]:[];});
}
export function rollingCorrelation(a,b,window=36,method='pearson') {
  const pairs=paired(a,b);return pairs.map(p=>{const n=monthIndex(p.date);const sample=pairs.filter(q=>monthIndex(q.date)<=n&&monthIndex(q.date)>n-window);return {date:p.date,value:sample.length>=12?correlation(sample.map(p=>p.x),sample.map(p=>p.y),method):null,n:sample.length};}).filter(p=>p.value!==null);
}
export function regression(pairs){if(pairs.length<12)return null;const x=pairs.map(p=>p.x),y=pairs.map(p=>p.y),mx=average(x),my=average(y);const den=x.reduce((s,v)=>s+(v-mx)**2,0);if(den<1e-12)return null;const beta=x.reduce((s,v,i)=>s+(v-mx)*(y[i]-my),0)/den;const r=correlation(x,y);return {beta,intercept:my-beta*mx,r2:r===null?null:r*r,n:x.length};}
export function exportCSV(observations) { return 'date,value,available_date\n'+observations.map(p=>`${p.date},${p.value},${p.availableDate||''}`).join('\n')+'\n'; }
