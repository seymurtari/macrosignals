import {DAY,addDays,monthEnd,monthIndex} from '../core/series.mjs';
const p=(date,value,availableDate=null)=>({date,value,availableDate});
export function fixture(){
 const observations=[],market=[];let level=100;
 for(let m=2000*12;m<2026*12;m++)observations.push(p(monthEnd(m),Math.sin(m*.3),addDays(monthEnd(m),10)));
 for(let t=Date.parse('2000-01-01');t<=Date.parse('2026-01-31');t+=DAY){const date=new Date(t).toISOString().slice(0,10),n=monthIndex(date)-2000*12;level*=n%36>=24&&n%36<=27?.996:1.0006;market.push(p(date,level));}
 const catalogue=[{id:'a',name:'Test factor',lagDays:12,freshnessDays:80,category:'rates'}];
 return {catalogue,cache:{a:{observations,historyQuality:'user-first-release'},market:{observations:market}},featureIds:['a'],horizon:6,drawdown:.1};
}
