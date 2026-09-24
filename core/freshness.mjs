import {DAY} from './series.mjs';
import {TREASURY_FIELDS} from './treasury.mjs';

const imported=s=>['user-first-release','import-revised'].includes(s?.historyQuality);
export function refreshableIds(catalogue,selected,cache){
  return [...new Set([...selected,'market','recession'])].filter(id=>{
    const def=catalogue.find(k=>k.id===id);
    return def&&['fred','multpl','ssga'].includes(def.adapter)&&!imported(cache[id]);
  });
}
export function dueIds(catalogue,selected,cache,attempts=new Map(),now=Date.now()){
  return refreshableIds(catalogue,selected,cache).filter(id=>{
    const last=Math.max(Date.parse(cache[id]?.retrievedAt||'')||0,attempts.get(id)||0);
    return now-last>=(TREASURY_FIELDS[id]?60:23*60)*60_000;
  });
}
export function observationStale(def,date,now=new Date()){
  if(!date)return true;
  if(!TREASURY_FIELDS[def.id])return now.getTime()-Date.parse(date)>def.freshnessDays*DAY;
  // At 5pm New York time a weekday's closing curve should usually be available.
  // Holidays can delay it, so the UI says "Check freshness", not "provider failed".
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  const easternDate=`${parts.year}-${parts.month}-${parts.day}`;
  const todayUTC=Date.parse(easternDate);
  for(let t=Date.parse(date)+DAY;t<=todayUTC;t+=DAY){
    const day=new Date(t).getUTCDay();if(day!==0&&day!==6&&(t<todayUTC||Number(parts.hour)>=17))return true;
  }
  return false;
}
