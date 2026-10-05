import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchFmpExtra} from '../core/fmp-extra.mjs';
const symbols=['AAPL','NVDA','GOOG','BRK.A','ASML','TSM'],now=()=>Date.parse('2026-10-05');
const r=(year,extra)=>({date:`${year}-09-30`,reportedCurrency:'USD',...extra});
const data={income:[r(2024,{revenue:100,operatingIncome:20,grossProfit:40}),r(2025,{revenue:120,operatingIncome:30,grossProfit:60,ebit:30,interestExpense:5,ebitda:40})],balance:[r(2024,{inventory:10,netReceivables:20}),r(2025,{inventory:15,netReceivables:28,netDebt:-80})],cash:[r(2025,{capitalExpenditure:-10,operatingCashFlow:50,freeCashFlow:40})],ratios:[r(2025,{priceToFreeCashFlowRatio:25})]};
const get=async(s,k)=>({rows:data[k],rejected:0});
const run=(m,getter=get)=>fetchFmpExtra({id:m,symbol:'AAPL',fmpMetric:m},getter,symbols,now);
test('new annual metrics calculate changes, debt, spending and valuation correctly',async()=>{
 for(const [m,expected] of [['operatingMarginChange',5],['grossMarginChange',10],['interestCoverage',6],['netDebtEbitda',-2],['inventoryGap',30],['receivablesGap',20],['capexCash',20],['priceFcf',25]]){const series=await run(m);assert.ok(Math.abs(series.observations.at(-1).value-expected)<1e-9,m);assert.match(series.coverageNote,/calculated observations/);}
});
test('nonpositive free cash flow never becomes a meaningful valuation multiple',async()=>{
 const series=await run('priceFcf',async(s,k)=>({rows:k==='cash'?[r(2025,{freeCashFlow:-5})]:data[k],rejected:0}));assert.equal(series.coverageStatus,'insufficient');assert.equal(series.observations.length,0);
});
test('currency mismatch, null EBIT, zero interest and missing prior year produce gaps',async()=>{
 for(const m of ['interestCoverage','inventoryGap','netDebtEbitda']){const series=await run(m,async(s,k)=>({rows:k==='income'?[r(2025,{revenue:100,ebit:null,interestExpense:0,ebitda:40})]:data[k].map(row=>({...row,reportedCurrency:'EUR'})),rejected:0}));assert.equal(series.observations.length,0);}
});
test('basket uses all six companies, strict above-average comparison and common dates',async()=>{
 const getPrices=async(symbol)=>({rejected:0,rows:Array.from({length:symbol==='TSM'?200:201},(_,i)=>({date:new Date(Date.parse('2025-01-01')+i*86400000).toISOString().slice(0,10),price:symbol==='AAPL'?100+i:100}))});
 const series=await run('basketBreadth',getPrices);assert.equal(series.observations.length,1);assert.ok(Math.abs(series.observations[0].value-100/6)<1e-9);
 await assert.rejects(run('basketBreadth',async(s)=>{if(s==='TSM')throw Error('Restricted');return getPrices(s);}),/Restricted/);
});
