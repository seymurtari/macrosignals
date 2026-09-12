import React,{useEffect,useRef,useState} from 'react';
import {scaleLinear,scaleUtc,extent,line,curveLinear} from 'd3';
import type {Point} from './types';
export const COLORS=['#21847b','#547cc2','#bf7837','#9c62ae','#bd586f'];
const fmt=(n:number)=>Math.abs(n)>=1000000?(n/1000000).toFixed(1)+'m':Math.abs(n)>=1000?(n/1000).toFixed(1)+'k':Number(n.toFixed(2)).toString();
function useWidth(){const ref=useRef<HTMLDivElement>(null),[width,setWidth]=useState(600);useEffect(()=>{const observer=new ResizeObserver(([e])=>setWidth(Math.max(200,e.contentRect.width)));if(ref.current)observer.observe(ref.current);return()=>observer.disconnect();},[]);return {ref,width};}
export function LineChart({series,height=280,yLabel='',shadeDate}:{series:{id:string;name:string;points:Point[];color?:string}[];height?:number;yLabel?:string;shadeDate?:string}){
 const {ref,width}=useWidth(),[hover,setHover]=useState<number|null>(null),[pinned,setPinned]=useState(false);
 const p={left:68,right:24,top:24,bottom:43},data=series.flatMap(s=>s.points).filter(p=>Number.isFinite(p.value));
 if(!data.length)return <div ref={ref} className="chart-empty" style={{height}}>Load data to see this chart.</div>;
 const times=extent(data,p=>Date.parse(p.date)) as [number,number],values=extent(data,p=>p.value) as [number,number];
 const pad=(values[1]-values[0]||1)*.1,x=scaleUtc().domain(times.map(t=>new Date(t))).range([p.left,width-p.right]),y=scaleLinear().domain([values[0]-pad,values[1]+pad]).nice().range([height-p.bottom,p.top]);
 const ticks=x.ticks(width<400?3:6),d=line<Point>().x(v=>x(new Date(v.date))).y(v=>y(v.value)).curve(curveLinear);
 const hoverDate=hover!==null?x.invert(hover):null;
 const nearest=hoverDate?series.map(s=>{let best:Point|undefined;for(const v of s.points)if(!best||Math.abs(Date.parse(v.date)-+hoverDate)<Math.abs(Date.parse(best.date)-+hoverDate))best=v;return {...s,point:best};}):[];
 return <div ref={ref} className="chart-wrap"><svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${yLabel} over time: ${series.map(s=>s.name).join(', ')}`}>
 {shadeDate&&<rect x={Math.max(p.left,x(new Date(shadeDate)))} y={p.top} width={Math.max(0,width-p.right-Math.max(p.left,x(new Date(shadeDate))))} height={height-p.top-p.bottom} fill="var(--selection)"/>}
 {y.ticks(5).map(v=><g key={v}><line x1={p.left} x2={width-p.right} y1={y(v)} y2={y(v)} className="grid-line"/><text x={p.left-12} y={y(v)+4} textAnchor="end">{fmt(v)}</text></g>)}
 {ticks.map(t=><text key={+t} x={x(t)} y={height-20} textAnchor="middle">{t.toLocaleDateString('en-US',{month:width<400?undefined:'short',year:'2-digit',timeZone:'UTC'})}</text>)}
 <text x={p.left} y={13}>{yLabel}</text>
 {series.map((s,i)=><path key={s.id} d={d(s.points)||''} fill="none" stroke={s.color||COLORS[i%5]} strokeWidth={2.1}/>)}
 {hover!==null&&<line x1={hover} x2={hover} y1={p.top} y2={height-p.bottom} stroke="var(--muted)" strokeDasharray="3 4"/>}
 {nearest.map((s,i)=>s.point&&<circle key={s.id} cx={x(new Date(s.point.date))} cy={y(s.point.value)} r={4} fill={s.color||COLORS[i%5]}/>)}
 <rect x={p.left} y={p.top} width={Math.max(1,width-p.left-p.right)} height={height-p.top-p.bottom} fill="transparent" onPointerMove={e=>{if(!pinned){const r=e.currentTarget.ownerSVGElement!.getBoundingClientRect();setHover(Math.min(width-p.right,Math.max(p.left,e.clientX-r.left)));}}} onPointerLeave={()=>{if(!pinned)setHover(null);}} onClick={e=>{const r=e.currentTarget.ownerSVGElement!.getBoundingClientRect();setHover(e.clientX-r.left);setPinned(!pinned);}}/>
 </svg>{hoverDate&&<div className="chart-tooltip" style={{left:Math.min(Math.max(4,hover||0),Math.max(4,width-250))}}><strong>{hoverDate.toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'})}</strong>{nearest.map(s=><div key={s.id}><span>{s.name}</span><b>{s.point?fmt(s.point.value):'—'}</b></div>)}<small>Nearest displayed observations</small></div>}</div>;
}
export function ScatterChart({pairs,xLabel,yLabel}:{pairs:{x:number;y:number;date:string}[];xLabel:string;yLabel:string}){
 const {ref,width}=useWidth(),height=260,p={l:60,r:20,t:20,b:55};
 if(!pairs.length)return <div ref={ref} className="chart-empty" style={{height}}>No overlapping observations.</div>;
 const ex=extent(pairs,p=>p.x) as [number,number],ey=extent(pairs,p=>p.y) as [number,number],px=(ex[1]-ex[0]||1)*.12,py=(ey[1]-ey[0]||1)*.12;
 const x=scaleLinear().domain([ex[0]-px,ex[1]+px]).nice().range([p.l,width-p.r]),y=scaleLinear().domain([ey[0]-py,ey[1]+py]).nice().range([height-p.b,p.t]);
 return <div ref={ref}><svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${xLabel} against ${yLabel}`}>
 {y.ticks(4).map(v=><g key={v}><line x1={p.l} x2={width-p.r} y1={y(v)} y2={y(v)} className="grid-line"/><text x={p.l-10} y={y(v)+4} textAnchor="end">{fmt(v)}</text></g>)}
 {x.ticks(4).map(v=><text key={v} x={x(v)} y={height-p.b+20} textAnchor="middle">{fmt(v)}</text>)}
 <text x={p.l} y={12}>{yLabel}</text><text x={(width+p.l-p.r)/2} y={height-5} textAnchor="middle">{xLabel}</text>
 {pairs.map((v,i)=><circle key={i} cx={x(v.x)} cy={y(v.y)} r={4} fill="var(--accent)" opacity={.65}><title>{v.date}: {xLabel} {fmt(v.x)}, {yLabel} {fmt(v.y)}</title></circle>)}
 </svg></div>;
}
