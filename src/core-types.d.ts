declare module '*.mjs' {
 export const DAY:number;
 export function monthIndex(d:string):number;
 export function monthEnd(d:number):string;
 export function monthly(points:any[]):any[];
 export function transformPoints(points:any[],mode?:string):any[];
 export function historyWindow(points:any[],mode?:string,months?:number,asOf?:string):any[];
 export function historyCoverage(points:any[],months?:number,asOf?:string):{from:string|null;to:string|null;n:number;requestedFrom:string};
 export function paired(a:any[],b:any[],lag?:number):any[];
 export function correlation(a:number[],b:number[],method?:string):number|null;
 export function rollingCorrelation(a:any[],b:any[],window?:number,method?:string):any[];
 export function evaluateRules(rules:any[],cache:any,catalogue:any[],now?:Date):any;
 export function factorScenario(points:any[],market:any[],shock:number):any;
 export function eventStudy(rates:any[],market:any[]):any[];
}
declare module '*.css';
