export const EXTRA_METRICS=['operatingMarginChange','grossMarginChange','interestCoverage','netDebtEbitda','inventoryGap','receivablesGap','capexCash','priceFcf','basketBreadth'];
const n=x=>typeof x==='number'&&Number.isFinite(x);
const aligned=(a,b)=>a&&b&&a.date===b.date&&a.reportedCurrency&&a.reportedCurrency===b.reportedCurrency;
const annual=(a,b)=>a&&b&&a.reportedCurrency===b.reportedCurrency&&a.reportedCurrency&&(Date.parse(a.date)-Date.parse(b.date))/86400000>=330&&(Date.parse(a.date)-Date.parse(b.date))/86400000<=400;
export async function fetchFmpExtra(def,dataset,symbols,now){
 const m=def.fmpMetric,inputs=[],points=[];let missing=0,note='';
 const get=async(symbol,kind)=>{const d=await dataset(symbol,kind);inputs.push({symbol,kind,...d});missing+=d.rejected;return d.rows;};
 if(m==='basketBreadth'){
  const histories=await Promise.all(symbols.map(async symbol=>{
   const rows=(await get(symbol,'prices')).filter(r=>n(r.price)&&r.price>0);const map=new Map();
   for(let i=199;i<rows.length;i++){const avg=rows.slice(i-199,i+1).reduce((sum,r)=>sum+r.price,0)/200;map.set(rows[i].date,rows[i].price>avg);}
   return map;
  }));
  for(const [date] of histories[0])if(histories.every(h=>h.has(date)))points.push({date,value:100*histories.filter(h=>h.get(date)).length/symbols.length,availableDate:null});
  note='Fixed equal-weight basket: '+symbols.join(', ')+'. All six must have valid 200-session averages on the same date; missing members never reduce the denominator. Not market-wide breadth; current selected basket has selection/survivorship bias. Price adjustment status unverified.';
 }else{
  const income=await get(def.symbol,'income');let balance=null,cash=null,ratios=null;
  if(['netDebtEbitda','inventoryGap','receivablesGap'].includes(m))balance=new Map((await get(def.symbol,'balance')).map(r=>[r.date,r]));
  if(['capexCash','priceFcf'].includes(m))cash=new Map((await get(def.symbol,'cash')).map(r=>[r.date,r]));
  if(m==='priceFcf')ratios=new Map((await get(def.symbol,'ratios')).map(r=>[r.date,r]));
  for(let i=0;i<income.length;i++){
   const r=income[i],p=income[i-1],b=balance?.get(r.date),bp=balance?.get(p?.date),c=cash?.get(r.date),ratio=ratios?.get(r.date);let value=NaN;
   if(['operatingMarginChange','grossMarginChange'].includes(m)&&annual(r,p)){
    const field=m==='operatingMarginChange'?'operatingIncome':'grossProfit';
    if(n(r[field])&&n(p[field])&&n(r.revenue)&&r.revenue>0&&n(p.revenue)&&p.revenue>0)value=100*(r[field]/r.revenue-p[field]/p.revenue);
   }
   if(m==='interestCoverage'&&n(r.ebit)&&n(r.interestExpense)&&r.interestExpense>0)value=r.ebit/r.interestExpense;
   if(m==='netDebtEbitda'&&aligned(r,b)&&n(b.netDebt)&&n(r.ebitda)&&r.ebitda>0)value=b.netDebt/r.ebitda;
   if(['inventoryGap','receivablesGap'].includes(m)&&annual(r,p)&&aligned(r,b)&&aligned(p,bp)){
    const field=m==='inventoryGap'?'inventory':'netReceivables';
    if(n(b[field])&&b[field]>=0&&n(bp[field])&&bp[field]>0&&n(r.revenue)&&r.revenue>=0&&n(p.revenue)&&p.revenue>0)value=100*(b[field]/bp[field]-r.revenue/p.revenue);
   }
   if(m==='capexCash'&&aligned(r,c)&&n(c.capitalExpenditure)&&n(c.operatingCashFlow)&&c.operatingCashFlow>0)value=100*Math.abs(c.capitalExpenditure)/c.operatingCashFlow;
   if(m==='priceFcf'&&aligned(r,c)&&ratio&&n(c.freeCashFlow)&&c.freeCashFlow>0&&n(ratio.priceToFreeCashFlowRatio)&&ratio.priceToFreeCashFlowRatio>0)value=ratio.priceToFreeCashFlowRatio;
   if(n(value))points.push({date:r.date,value,availableDate:null});else missing++;
  }
  note=m==='priceFcf'?'FMP annual priceToFreeCashFlowRatio, matched to positive annual freeCashFlow. Fiscal-period valuation, not today’s price / trailing cash flow. Vendor share-class/ADR methodology; no direct mixing of quote and reporting currencies.':m==='capexCash'?'Absolute capitalExpenditure / positive operatingCashFlow; provider expenditure sign normalized.':'Annual latest-revised financials. Same fiscal dates and reported currencies required across statements. Margin changes and growth gaps are percentage points. Net cash can produce negative net debt / EBITDA; nonpositive EBITDA or interest expense produces no ratio.';
  note+=' Up to five annual periods; missing fields and unusable denominators omitted. Not verified first-release history. Berkshire conglomerate/insurance results are not directly comparable with industrial companies.';
 }
 points.sort((a,b)=>a.date.localeCompare(b.date));const status=points.length?'available':'insufficient';
 const coverage=inputs.map(d=>`${d.symbol} ${d.kind}: ${d.rows.length} rows, ${d.rows[0].date} to ${d.rows.at(-1).date}`).join('; ');
 return {id:def.id,observations:points,historyQuality:'latest-revised',source:'Financial Modeling Prep · '+(def.symbol||'six-company basket'),sourceUrl:def.url,unit:def.unit,frequency:def.frequency,retrievedAt:new Date(now()).toISOString(),missing,coverageStatus:status,providerWarning:note,coverageNote:`${status}: ${points.length} calculated observations${points.length?' · '+points[0].date+' to '+points.at(-1).date:''}. ${coverage}. ${missing} invalid/unusable row(s). ${note}`};
}
