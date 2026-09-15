import {validDate,today} from './series.mjs';
export const PE_URL='https://www.multpl.com/s-p-500-pe-ratio/table/by-month';
export const PCF_URL='https://www.ssga.com/us/en/individual/etfs/state-street-spdr-sp-500-etf-trust-spy';
const plain=s=>s.replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|ensp|emsp);|&#160;/g,' ').replace(/\s+/g,' ').trim();
function sourceDate(s){
 const m=plain(s).match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}),? (\d{4})$/);
 if(!m)throw Error('Valuation source date is missing or invalid.');
 const date=`${m[3]}-${String(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(m[1])+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`;
 if(!validDate(date)||date>today())throw Error('Valuation source date is invalid or in the future.');return date;
}
function ratio(s){const v=plain(s).replace(/†/g,'').trim();if(!/^\d+(?:\.\d+)?$/.test(v)||!Number.isFinite(Number(v))||Number(v)<=0)throw Error('Valuation ratio is missing or invalid.');return Number(v);}
export function parsePE(html){
 const table=html.match(/<table\b[^>]*\bid=["']datatable["'][^>]*>([\s\S]*?)<\/table>/i)?.[1];
 if(!table||!html.includes('S&P 500 PE Ratio')&&!html.includes('S&amp;P 500 PE Ratio'))throw Error('P/E source format changed. Cached data is preserved.');
 const points=[];
 for(const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>x[1]);if(!cells.length)continue;
  if(cells.length!==2)throw Error('P/E source row format changed.');
  // Explicit historical gaps are allowed; never turn them into zeroes.
  if(/^(?:N\/A|NA|—|-)$/.test(plain(cells[1])))continue;
  points.push({date:sourceDate(cells[0]),value:ratio(cells[1])});
 }
 if(points.length<12||new Set(points.map(p=>p.date)).size!==points.length)throw Error('P/E history is incomplete or duplicated.');
 const from=new Date();from.setUTCFullYear(from.getUTCFullYear()-20);
 return points.filter(p=>p.date>=from.toISOString().slice(0,10)).sort((a,b)=>a.date.localeCompare(b.date));
}
export function parsePCF(html){
 const sections=[...html.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/gi)].map(m=>m[1]).filter(s=>/<h2\b[^>]*>\s*Index Characteristics\b/.test(s));
 if(sections.length!==1)throw Error('Index characteristics are missing or ambiguous. Cached data is preserved.');
 const s=sections[0],stamp=s.match(/<span\b[^>]*class=["']date["'][^>]*>\s*as of ([\s\S]*?)<\/span>/i)?.[1];
 const rows=[...s.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]).filter(r=>plain(r.match(/<th\b[^>]*>([\s\S]*?)<\/th>/i)?.[1]||'')==='Price/Cash Flow');
 if(!stamp||rows.length!==1)throw Error('Index cash-flow ratio or its date is missing.');
 return [{date:sourceDate(stamp),value:ratio(rows[0].match(/<td\b[^>]*>([\s\S]*?)<\/td>/i)?.[1]||'')}];
}
export async function fetchValuation(def,{fetcher=fetch,signal,previousSeries}={}){
 if(previousSeries&&['user-first-release','import-revised'].includes(previousSeries.historyQuality))throw Error('Imported valuation history is preserved. Remove it before enabling provider refresh.');
 const url=def.adapter==='multpl'?PE_URL:PCF_URL;
 let response;try{response=await fetcher(url,{signal:signal||AbortSignal.timeout(30000),headers:{'User-Agent':'MacroSignals/0.1 (personal economic research)'}});}catch{throw Error('Could not reach the valuation source. Cached data is preserved.');}
 if(!response.ok)throw Error(`Valuation source returned HTTP ${response.status}. Retry later; cached data is preserved.`);
 const html=await response.text();if(html.length>4_000_000)throw Error('Valuation response is too large.');
 let observations=def.adapter==='multpl'?parsePE(html):parsePCF(html);
 const last=observations.at(-1);if(!last||Date.now()-Date.parse(last.date)>45*86400000)throw Error('Valuation source has not published recent data. Cached data is preserved.');
 if(def.adapter==='ssga'&&previousSeries?.sourceUrl===url&&previousSeries.historyQuality==='latest-revised'){
  const byDate=new Map(previousSeries.observations.map(p=>[p.date,p]));for(const p of observations)byDate.set(p.date,p);
  observations=[...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
 }
 return {id:def.id,observations,historyQuality:'latest-revised',sourceUrl:url,source:def.source,unit:def.unit,frequency:def.frequency,retrievedAt:new Date().toISOString(),missing:0,components:[],transform:'level'};
}
