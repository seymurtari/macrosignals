import {EXTRA_METRICS,fetchFmpExtra} from './fmp-extra.mjs';
import {validDate} from './series.mjs';
export const FMP_SYMBOLS=['AAPL','NVDA','GOOG','BRK.A','ASML','TSM'];
const numeric=x=>typeof x==='number'&&Number.isFinite(x);
const paths={prices:'historical-price-eod/light',income:'income-statement',cash:'cash-flow-statement',estimates:'analyst-estimates',balance:'balance-sheet-statement',ratios:'ratios'};
const fields={prices:['price'],income:['revenue','netIncome','operatingIncome','grossProfit','ebit','ebitda'],cash:['operatingCashFlow','freeCashFlow'],estimates:['epsAvg'],balance:['netDebt','inventory','netReceivables'],ratios:['priceToFreeCashFlowRatio']};
export function createFmpKpis({apiKey='',fetcher=fetch,now=Date.now}={}){
 const cache=new Map();let blockedUntil=0;
 async function dataset(symbol,kind){
  const key=symbol+':'+kind,old=cache.get(key);
  if(old&&now()<old.until)return old.promise;
  const promise=(async()=>{
   if(!apiKey.trim())throw Error('FMP_API_KEY is not configured on this server.');
   if(now()<blockedUntil)throw Error('FMP authentication or rate limit pause; retry tomorrow.');
   const url=new URL('https://financialmodelingprep.com/stable/'+paths[kind]);url.searchParams.set('symbol',symbol);
   if(kind==='prices'){const start=new Date(now());start.setUTCFullYear(start.getUTCFullYear()-5);url.searchParams.set('from',start.toISOString().slice(0,10));url.searchParams.set('to',new Date(now()).toISOString().slice(0,10));}
   else{url.searchParams.set('period','annual');url.searchParams.set('limit','5');}
   const response=await fetcher(url.toString(),{headers:{apikey:apiKey.trim(),Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});
   if([401,429].includes(response.status))blockedUntil=now()+86400000;
   if(!response.ok)throw Error([402,403].includes(response.status)?'FMP access restricted for this symbol or endpoint.':response.status===429?'FMP request rate or allowance reached.':response.status===401?'FMP rejected the API key.':'FMP provider request failed.');
   let text='',bytes=0;const reader=response.body.getReader(),decoder=new TextDecoder();
   while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>4000000){await reader.cancel();throw Error('FMP response too large.');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
   let payload;try{payload=JSON.parse(text);}catch{throw Error('FMP returned invalid JSON.');}
   if(!Array.isArray(payload))throw Error('FMP did not return an entitled dataset.');
   const today=new Date(now()).toISOString().slice(0,10),seen=new Set();
   const rows=payload.filter(r=>r&&r.symbol===symbol&&validDate(r.date)&&(kind==='estimates'||r.date<=today)&&fields[kind].some(f=>numeric(r[f]))&&(kind==='prices'||kind==='estimates'||r.period==='FY')).sort((a,b)=>a.date.localeCompare(b.date)).filter(r=>{if(seen.has(r.date))return false;seen.add(r.date);return true;});
   if(!rows.length)throw Error('No valid dated rows for the requested symbol and annual period.');
   return {rows,rejected:payload.length-rows.length,checkedAt:new Date(now()).toISOString()};
  })().catch(e=>{throw Error(e.message.startsWith('FMP')||e.message.startsWith('No valid')?e.message:'FMP network request failed.');});
  cache.set(key,{until:now()+86400000,promise});return promise;
 }
 async function fetchMetric(def,{previousSeries,mode='latest'}={}){
  if(def.fmpMetric!=='basketBreadth'&&!FMP_SYMBOLS.includes(def.symbol))throw Error('Unsupported FMP symbol.');
  if(mode==='firstRelease')throw Error('FMP KPIs require current/revised history mode; first-release history is not verified.');
  if(EXTRA_METRICS.includes(def.fmpMetric))return fetchFmpExtra(def,dataset,FMP_SYMBOLS,now);
  const metric=def.fmpMetric,prices=['ma200','drawdown','volatility'].includes(metric),revision=metric==='epsRevision';
  const input=await dataset(def.symbol,prices?'prices':revision?'estimates':'income');
  const rows=input.rows;let observations=[],missing=input.rejected,snapshots=previousSeries?.fmpSnapshots||[],note='';
  const add=(date,value,extra={})=>{if(numeric(value))observations.push({date,value,availableDate:null,...extra});else missing++;};
  if(prices){
   const clean=rows.filter(r=>numeric(r.price)&&r.price>0);missing+=rows.length-clean.length;
   for(let i=0;i<clean.length;i++){
    if(metric==='ma200'&&i>=199)add(clean[i].date,100*(clean[i].price/(clean.slice(i-199,i+1).reduce((a,r)=>a+r.price,0)/200)-1));
    if(metric==='drawdown'&&i>=251)add(clean[i].date,100*(clean[i].price/Math.max(...clean.slice(i-251,i+1).map(r=>r.price))-1));
    if(metric==='volatility'&&i>=20){const returns=clean.slice(i-19,i+1).map((r,j)=>Math.log(r.price/clean[i-20+j].price)),mean=returns.reduce((a,b)=>a+b,0)/20;add(clean[i].date,100*Math.sqrt(252*returns.reduce((a,r)=>a+(r-mean)**2,0)/19));}
   }
   note='Daily FMP price field; adjustment status unverified, not total return. Corporate actions may distort price-derived metrics. Windows use available sessions; warm-up omitted.';
  }else if(revision){
   const date=input.checkedAt.slice(0,10),estimates=rows.filter(r=>r.date>date&&numeric(r.epsAvg)).map(r=>({period:r.date,eps:r.epsAvg}));
   if(!estimates.length)throw Error('No valid future annual epsAvg estimates.');
   if(!snapshots.some(s=>s.date===date))snapshots=[...snapshots,{date,estimates}];
   snapshots=snapshots.slice(-7500);
   for(let i=1;i<snapshots.length;i++){
    const current=snapshots[i],prior=snapshots[i-1];const target=current.estimates.find(e=>e.period>current.date&&prior.estimates.some(p=>p.period===e.period));
    if(!target)continue;const base=prior.estimates.find(e=>e.period===target.period);
    if(base.eps>0&&target.eps>0)add(current.date,100*(target.eps/base.eps-1),{availableDate:current.date,targetPeriod:target.period});else missing++;
   }
   note='Change since the preceding saved daily snapshot, matching the same nearest future fiscal year. Positive EPS only; no historical revision backfill. '+snapshots.length+' snapshot(s) saved.';
  }else{
   let cash=null;
   if(['fcfMargin','cashConversion'].includes(metric)){const c=await dataset(def.symbol,'cash');cash=new Map(c.rows.map(r=>[r.date,r]));missing+=c.rejected;}
   for(let i=0;i<rows.length;i++){
    const r=rows[i],prev=rows[i-1];let value=NaN;
    if(metric==='revenueGrowth'||metric==='incomeGrowth'){
     const f=metric==='revenueGrowth'?'revenue':'netIncome';const days=prev?(Date.parse(r.date)-Date.parse(prev.date))/86400000:0;
     if(prev&&days>=330&&days<=400&&r.reportedCurrency&&r.reportedCurrency===prev.reportedCurrency&&numeric(r[f])&&numeric(prev[f])&&prev[f]>0&&(metric!=='incomeGrowth'||r[f]>=0))value=100*(r[f]/prev[f]-1);
    }
    if(metric==='netMargin'&&numeric(r.netIncome)&&numeric(r.revenue)&&r.revenue>0)value=100*r.netIncome/r.revenue;
    const c=cash?.get(r.date),matching=c&&r.reportedCurrency&&r.reportedCurrency===c.reportedCurrency;
    if(metric==='fcfMargin'&&matching&&numeric(c.freeCashFlow)&&numeric(r.revenue)&&r.revenue>0)value=100*c.freeCashFlow/r.revenue;
    if(metric==='cashConversion'&&matching&&numeric(c.operatingCashFlow)&&numeric(r.netIncome)&&r.netIncome>0)value=c.operatingCashFlow/r.netIncome;
    add(r.date,value);
   }
   note='Annual fiscal periods, latest revised statements. Up to 5 annual rows requested (Starter); entitlement may shorten coverage. Matched dates/currencies for cross-statement ratios. Invalid or missing fields, nonpositive growth bases and loss transitions are omitted.';
  }
  const cutoff=new Date(now());cutoff.setUTCFullYear(cutoff.getUTCFullYear()-20);observations=observations.filter(p=>p.date>=cutoff.toISOString().slice(0,10));
  const status=observations.length?'available':revision?'collecting':'insufficient';
  return {id:def.id,observations,historyQuality:revision?'fmp-snapshots':'latest-revised',source:'Financial Modeling Prep · '+def.symbol,sourceUrl:def.url,unit:def.unit,frequency:def.frequency,retrievedAt:input.checkedAt,missing,fmpSnapshots:revision?snapshots:undefined,coverageStatus:status,providerWarning:note,coverageNote:`${status}: ${observations.length} calculated observations${observations.length?' · '+observations[0].date+' to '+observations.at(-1).date:''}. Input: ${rows.length} rows · ${rows[0].date} to ${rows.at(-1).date}. ${missing} invalid/unusable row(s). ${note}`};
 }
 return {fetchMetric};
}
