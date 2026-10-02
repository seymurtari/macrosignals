import {csvRows,parseSeriesCSV,deriveMetric,validDate,today} from './series.mjs';

export function parseEuropeanCSV(text,provider,seriesId) {
  const rows=csvRows(text,provider==='bundesbank'?';':','),headers=rows.shift()?.map(x=>x.trim())||[];
  const di=headers.indexOf('TIME_PERIOD'),vi=headers.indexOf('OBS_VALUE');
  const ki=headers.indexOf(provider==='bundesbank'?'BBK_ID':'KEY');
  const mi=headers.indexOf(provider==='bundesbank'?'BBK_UNIT_MULT':'UNIT_MULT');
  if(di<0||vi<0||ki<0)throw Error('European provider format changed; cached data is preserved.');
  const points=rows.filter(r=>r[ki]===seriesId);
  if(!points.length)throw Error('Requested European series was not returned.');
  for(const r of points){
    if(!validDate(r[di])||r[di]>today())throw Error('Invalid European observation date.');
    if(mi>=0&&r[mi]!==''&&r[mi]!=='0')throw Error('Unexpected European series unit multiplier.');
  }
  return parseSeriesCSV('date,value\n'+points.map(r=>`${r[di]},${r[vi]}`).join('\n'));
}

export async function fetchEuropean(def,{mode='latest',startDate='1990-01-01',fetcher=fetch,signal}={},componentCache=new Map()) {
  if(mode==='firstRelease')throw Error('ECB and Bundesbank feeds provide revised history. Switch to current revised history or import verified first-release data.');
  if(!validDate(startDate))throw Error('Invalid history start date.');
  const components=[];
  for(const id of def.series){
    if(!/^[A-Z0-9_.]+$/.test(id))throw Error('Invalid European series key.');
    const key=def.adapter+':'+id+':'+startDate;
    if(!componentCache.has(key))componentCache.set(key,(async()=>{
      const split=id.indexOf('.'),flow=id.slice(0,split),series=id.slice(split+1);
      const root=def.adapter==='ecb'?'https://data-api.ecb.europa.eu/service/data/':'https://api.statistiken.bundesbank.de/rest/data/';
      const params=new URLSearchParams({startPeriod:startDate,endPeriod:today()});
      if(def.adapter==='ecb')params.set('format','csvdata');
      let response;
      try{response=await fetcher(`${root}${flow}/${series}?${params}`,{signal:signal||AbortSignal.timeout(30000),headers:{Accept:'text/csv'}});}
      catch(e){if(e.name==='AbortError')throw Error('Refresh cancelled.');throw Error(`${def.source} could not be reached; cached data is preserved.`);}
      if(!response.ok)throw Error(`${def.source} returned HTTP ${response.status}; cached data is preserved.`);
      return parseEuropeanCSV(await response.text(),def.adapter,id);
    })());
    components.push(await componentCache.get(key));
  }
  const observations=deriveMetric(def,components.map(c=>c.observations));
  if(!observations.length)throw Error('No overlapping European observations.');
  return {id:def.id,observations,historyQuality:'latest-revised',source:def.source,sourceUrl:def.url,unit:def.unit,frequency:def.frequency,retrievedAt:new Date().toISOString(),missing:components.reduce((n,c)=>n+c.missing,0),components:def.series,transform:def.transform};
}

// Returns are measured against the last observation on/before each calendar
// month anniversary. Missing or stale anchors remain missing, never zero.
export function marketPerformance(points=[]) {
  const a=points.filter(p=>Number.isFinite(p.value)&&p.value>0&&validDate(p.date)).sort((a,b)=>a.date.localeCompare(b.date));
  const last=a.at(-1);if(!last)return [];
  const out=[1,3,12].map(months=>{
    const d=new Date(last.date),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-months);
    const end=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,end));
    const target=d.toISOString().slice(0,10),prior=a.findLast(p=>p.date<=target);
    return {label:`${months}-month return`,value:prior&&Date.parse(target)-Date.parse(prior.date)<=7*86400000?100*(last.value/prior.value-1):null};
  });
  out.push({label:'Drawdown from loaded-history peak',value:100*(last.value/a.reduce((peak,p)=>Math.max(peak,p.value),0)-1)});
  return out;
}
