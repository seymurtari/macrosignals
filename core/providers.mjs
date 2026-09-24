import {fetchValuation} from './valuations.mjs';
import {parseSeriesCSV,deriveMetric,validDate,today} from './series.mjs';
import {TREASURY_FIELDS,fetchTreasury} from './treasury.mjs';

async function checkedFetch(url,fetcher,signal) {
  let response;
  try {response=await fetcher(url,{signal:signal||AbortSignal.timeout(30000),headers:{'User-Agent':'MacroSignals/0.1 (personal economic research)'}});}catch(e){if(e.name==='AbortError')throw Error('Refresh cancelled.');throw Error('Could not reach FRED. Check your connection and try again; cached data is preserved.');}
  if(response.status===429)throw Error('FRED rate limit reached. Wait before refreshing again.');
  if([400,401,403].includes(response.status))throw Error('FRED rejected the request. Check the series, API key and access conditions.');
  if(!response.ok)throw Error(`FRED returned HTTP ${response.status}. Cached data is preserved.`);
  const text=await response.text();if(text.length>16_000_000)throw Error('Provider response exceeds the supported size.');return text;
}
export async function fetchFred(seriesId,{mode='latest',apiKey='',startDate='1990-01-01',fetcher=fetch,signal}={}) {
  if(!/^[A-Z0-9]+$/.test(seriesId)||!validDate(startDate))throw Error('Invalid series request.');
  const end=today();
  if(mode==='firstRelease') {
    if(!/^[a-z0-9]{32}$/i.test(apiKey))throw Error('Add your free 32-character FRED API key to retrieve first-release history.');
    const params=new URLSearchParams({series_id:seriesId,api_key:apiKey,file_type:'json',observation_start:startDate,observation_end:end,realtime_start:'1776-07-04',realtime_end:end,output_type:'4',limit:'100000',sort_order:'asc'});
    const text=await checkedFetch('https://api.stlouisfed.org/fred/series/observations?'+params,fetcher,signal);
    let data;try{data=JSON.parse(text);}catch{throw Error('FRED returned an invalid JSON response.');}
    if(data.error_code||!Array.isArray(data.observations))throw Error('FRED could not return first-release history for this series.');
    if(data.count>100000)throw Error('First-release history exceeds the supported response size.');
    const observations=data.observations.filter(p=>typeof p.value==='string'&&p.value.trim()!==''&&p.value!=='.'&&Number.isFinite(Number(p.value))).map(p=>{
      if(!validDate(p.date)||!validDate(p.realtime_start)||p.realtime_start<p.date||p.realtime_start>end)throw Error('FRED first-release timing could not be verified.');
      return {date:p.date,value:Number(p.value),availableDate:p.realtime_start};
    });
    if(!observations.length)throw Error('No first-release observations are available for this period.');
    const unique=new Map();for(const p of observations){if(unique.has(p.date))throw Error('Unexpected duplicate periods in FRED initial-release history.');unique.set(p.date,p);}
    return {observations:observations.sort((a,b)=>a.date.localeCompare(b.date)),historyQuality:'fred-first-release',sourceUrl:'https://fred.stlouisfed.org/series/'+seriesId,missing:data.observations.length-observations.length};
  }
  const url='https://fred.stlouisfed.org/graph/fredgraph.csv?'+new URLSearchParams({id:seriesId,cosd:startDate,coed:end});
  const text=await checkedFetch(url,fetcher,signal);
  if(!/^(?:\uFEFF)?(?:observation_date|DATE),/i.test(text))throw Error('FRED returned a page instead of data. This series may need another source or an entitled CSV import.');
  const parsed=parseSeriesCSV(text,{valueColumn:seriesId});
  return {...parsed,historyQuality:'latest-revised',sourceUrl:'https://fred.stlouisfed.org/series/'+seriesId};
}
export async function fetchMetric(def,options={},componentCache=new Map()) {
  if(['multpl','ssga'].includes(def.adapter))return fetchValuation(def,options);
  if(def.adapter!=='fred'||!def.series.length)throw Error('Import a permitted CSV for this indicator. A direct provider connection is not configured.');
  if(TREASURY_FIELDS[def.id]){
    const mode=options.mode||'latest',previous=options.previousSeries;
    const compatible=previous?.observations?.length&&(
      mode==='firstRelease'?['fred-first-release','treasury-with-fred-first-release'].includes(previous.historyQuality):previous.historyQuality==='latest-revised');
    const reuse=compatible&&previous.historyCheckedAt&&Date.now()-Date.parse(previous.historyCheckedAt)<23*3600000;
    const historyPromise=reuse?Promise.resolve({observations:previous.observations,missing:previous.missing||0}):fetchFred(def.series[0],{...options,mode});
    const [historyResult,treasuryResult]=await Promise.allSettled([historyPromise,fetchTreasury(def,options,componentCache)]);
    const history=historyResult.status==='fulfilled'?historyResult.value:compatible?previous:null;
    const treasury=treasuryResult.status==='fulfilled'?treasuryResult.value:null;
    if(!history&&!treasury)throw Error(`Neither Treasury nor FRED could update ${def.name}: ${treasuryResult.reason.message}; ${historyResult.reason.message}`);
    if(mode==='firstRelease'&&!history)throw Error('First-release mode needs FRED history. Add a FRED key or switch to current revised history.');
    const firstRelease=mode==='firstRelease';
    const base=history?.observations||[];
    const fredLast=historyResult.status==='fulfilled'&&!reuse?base.at(-1)?.date:previous?.fredHistoryEnd;
    const oldDirect=firstRelease&&previous?.historyQuality==='treasury-with-fred-first-release'
      ?new Map(previous.observations.filter(p=>p.date>(fredLast||'')).map(p=>[p.date,p])):new Map();
    const merged=new Map(base.map(p=>[p.date,p]));
    if(compatible&&history!==previous){for(const p of previous.observations.filter(p=>p.date>(base.at(-1)?.date||'')))merged.set(p.date,p);}
    let treasuryLatest=null;
    for(const p of treasury?.observations||[]){
      if(firstRelease&&p.date<=(fredLast||base.at(-1)?.date||''))continue;
      // First-seen direct observations retain their recorded value and conservative
      // retrieval date until FRED's dated first release replaces them.
      const observed=firstRelease?(oldDirect.get(p.date)||{...p,availableDate:today()}):{...p,availableDate:null};
      merged.set(p.date,observed);treasuryLatest=p.date;
    }
    const observations=[...merged.values()].sort((a,b)=>a.date.localeCompare(b.date));
    if(!observations.length)throw Error('Neither source returned usable Treasury rates.');
    const latestSource=treasuryLatest===observations.at(-1).date||
      (!treasuryLatest&&previous?.latestSource==='U.S. Treasury'&&observations.at(-1).date===previous.observations.at(-1).date)?'U.S. Treasury':'FRED';
    const hasDirect=!!treasuryLatest||firstRelease&&oldDirect.size>0;
    const hasFredHistory=historyResult.status==='fulfilled'&&!reuse||!!previous?.historyCheckedAt||
      !!(previous?.observations?.[0]?.date<`${Number(today().slice(0,4))-1}-01-01`);
    return {id:def.id,observations,historyQuality:firstRelease?(hasDirect?'treasury-with-fred-first-release':'fred-first-release'):'latest-revised',
      source:hasFredHistory&&treasury?'U.S. Treasury (recent) / FRED (history)':treasury?'U.S. Treasury':hasFredHistory?'FRED (Treasury unavailable)':'U.S. Treasury (cached; feed unavailable)',
      latestSource,sourceUrl:latestSource==='U.S. Treasury'?(treasury?.sourceUrl||previous?.sourceUrl||def.url):`https://fred.stlouisfed.org/series/${def.series[0]}`,
      historyCheckedAt:historyResult.status==='fulfilled'&&!reuse?new Date().toISOString():previous?.historyCheckedAt||null,
      fredHistoryEnd:historyResult.status==='fulfilled'&&!reuse?base.at(-1)?.date:previous?.fredHistoryEnd||null,
      providerWarning:[treasuryResult.status==='rejected'?treasuryResult.reason.message:null,historyResult.status==='rejected'?`FRED history check: ${historyResult.reason.message}`:null].filter(Boolean).join(' ')||null,
      unit:def.unit,frequency:def.frequency,retrievedAt:new Date().toISOString(),missing:history?.missing||0,
      components:def.series,transform:def.transform};
  }
  // Outcome series always use actual observations; they are never predictors.
  const mode=['market','recession'].includes(def.id)?'latest':options.mode;
  const components=[];
  for(const id of def.series){const key=mode+':'+id;if(!componentCache.has(key))componentCache.set(key,fetchFred(id,{...options,mode}));components.push(await componentCache.get(key));}
  const observations=deriveMetric(def,components.map(c=>c.observations));
  if(!observations.length)throw Error('Not enough overlapping source history to calculate this indicator.');
  return {id:def.id,observations,historyQuality:components[0].historyQuality,sourceUrl:def.url,source:def.source,unit:def.unit,frequency:def.frequency,retrievedAt:new Date().toISOString(),missing:components.reduce((s,c)=>s+c.missing,0),components:def.series,transform:def.transform};
}
