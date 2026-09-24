import {validDate,today} from './series.mjs';

export const TREASURY_FIELDS={
  '1':{kind:'daily_treasury_yield_curve',fields:['BC_10YEAR','BC_3MONTH'],spread:true},
  '6':{kind:'daily_treasury_yield_curve',fields:['BC_10YEAR','BC_2YEAR'],spread:true},
  '10':{kind:'daily_treasury_real_yield_curve',fields:['TC_10YEAR']},
  '11':{kind:'daily_treasury_yield_curve',fields:['BC_10YEAR']},
  '12':{kind:'daily_treasury_yield_curve',fields:['BC_2YEAR']}
};
export const treasuryURL=(kind,year)=>`https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=${kind}&field_tdr_date_value=${year}`;

// The Treasury's Atom/OData feed uses fixed field names. Scope extraction to each
// entry's properties: an updated feed timestamp is not an observation date.
export function parseTreasuryXML(xml,fields){
  if(typeof xml!=='string'||xml.length>4_000_000||!/<feed\b/.test(xml))throw Error('Treasury returned an invalid XML feed.');
  const entries=[...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/g)],points=[];
  if(!entries.length)throw Error('Treasury returned no rate observations.');
  for(const [,entry] of entries){
    const properties=entry.match(/<m:properties>([\s\S]*?)<\/m:properties>/)?.[1];
    if(!properties)continue;
    const field=name=>properties.match(new RegExp(`<d:${name}(?:\\s[^>]*)?>([^<]*)<\\/d:${name}>`))?.[1]?.trim();
    const date=field('NEW_DATE')?.slice(0,10);
    if(!validDate(date)||date>today())continue;
    const values=fields.map(field).map(v=>v===undefined||v===''?NaN:Number(v));
    if(values.some(v=>!Number.isFinite(v)))continue;
    points.push({date,values});
  }
  if(!points.length)throw Error('Treasury returned no usable rates for this maturity.');
  const unique=new Map(points.map(p=>[p.date,p]));
  return [...unique.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

export async function fetchTreasury(def,{fetcher=fetch,signal}={},cache=new Map()){
  const config=TREASURY_FIELDS[def.id];if(!config)throw Error('No Treasury curve is configured for this indicator.');
  const years=[Number(today().slice(0,4))];if(today().slice(5,7)==='01')years.unshift(years[0]-1);
  const groups=await Promise.all(years.map(async year=>{
    const url=treasuryURL(config.kind,year),key='treasury:'+url;
    if(!cache.has(key))cache.set(key,(async()=>{
      let response;try{response=await fetcher(url,{signal:signal||AbortSignal.timeout(30000)});}catch(e){if(e.name==='AbortError')throw Error('Refresh cancelled.');throw Error('Could not reach U.S. Treasury. Cached data is preserved.');}
      if(!response.ok)throw Error(`U.S. Treasury returned HTTP ${response.status}.`);
      return response.text();
    })());
    return parseTreasuryXML(await cache.get(key),config.fields);
  }));
  const points=groups.flat().map(p=>({date:p.date,value:config.spread?Math.round((p.values[0]-p.values[1])*100)/100:p.values[0]}));
  return {observations:points,sourceUrl:treasuryURL(config.kind,years.at(-1))};
}
