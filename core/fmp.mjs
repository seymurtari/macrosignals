// Fixed endpoints only: caller-supplied URLs and credentials never enter the browser.
const probes=[
 {id:'profile',name:'Company profile',path:'profile',params:{symbol:'AAPL'},fields:['price','marketCap']},
 {id:'prices',name:'Daily price history',path:'historical-price-eod/light',params:{symbol:'AAPL'},fields:['price']},
 {id:'income',name:'Annual income statements',path:'income-statement',params:{symbol:'AAPL',period:'annual',limit:'5'},fields:['revenue','netIncome']},
 {id:'cashflow',name:'Annual cash-flow statements',path:'cash-flow-statement',params:{symbol:'AAPL',period:'annual',limit:'5'},fields:['operatingCashFlow','freeCashFlow']},
 {id:'ratios',name:'Annual financial ratios',path:'ratios',params:{symbol:'AAPL',period:'annual',limit:'5'},fields:['netProfitMargin','grossProfitMargin']},
 {id:'estimates',name:'Analyst estimates',path:'analyst-estimates',params:{symbol:'AAPL',period:'annual',limit:'5'},fields:['epsAvg','revenueAvg']}
];
const messages={available:'Data returned for AAPL; other symbols may have different access.',restricted:'This endpoint or symbol is not included in the current entitlement.',invalid_key:'FMP rejected the API key. Check the deployment secret.',rate_limited:'FMP request allowance reached. Try after the provider limit resets.',empty:'No observations returned; access is not confirmed.',unexpected:'The response did not match the expected dataset.',unavailable:'FMP could not be reached or returned a server error.',skipped:'Not attempted after an authentication or rate-limit error.'};
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s).toISOString().slice(0,10)===s;
function errorStatus(status,payload){
 const message=typeof payload==='string'?payload:JSON.stringify(payload||{});
 if(status===429||/limit reach|rate limit|too many requests/i.test(message))return 'rate_limited';
 if(status===401||/invalid api.?key|invalid key|apikey.*invalid/i.test(message))return 'invalid_key';
 if([402,403].includes(status)||/premium|subscription|upgrade|restricted|not available.*plan/i.test(message))return 'restricted';
 return status>=500?'unavailable':'unexpected';
}
export function createFmpConnection({apiKey='',fetcher=fetch,now=Date.now}={}){
 let last=null,pending=null;
 async function inspect(){
  if(!apiKey.trim())return {configured:false,connected:false,checks:[],message:'Add FMP_API_KEY to Replit deployment Secrets and republish.'};
  if(last&&now()<Date.parse(last.nextCheckAt))return {...last,cached:true};
  if(pending)return pending;
  pending=(async()=>{
   const checks=[];let stop=false;
   for(const probe of probes){
    let status='skipped',rows=null;
    if(!stop){
     try{
      const url=new URL('https://financialmodelingprep.com/stable/'+probe.path);
      for(const [key,value] of Object.entries(probe.params))url.searchParams.set(key,value);
      if(probe.id==='prices'){
       const end=new Date(now()),start=new Date(now());start.setUTCFullYear(start.getUTCFullYear()-2);
       url.searchParams.set('from',start.toISOString().slice(0,10));url.searchParams.set('to',end.toISOString().slice(0,10));
      }
      const response=await fetcher(url.toString(),{headers:{apikey:apiKey.trim(),Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});
      // Never forward provider errors, URLs, or headers: they can contain credentials.
      const reader=response.body?.getReader();let text='';
      if(reader){const decoder=new TextDecoder();let bytes=0;while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2000000){await reader.cancel();throw Error('Response too large');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}
      let payload;try{payload=JSON.parse(text);}catch{payload=null;}
      if(response.ok&&Array.isArray(payload)){
       rows=payload.filter(r=>r&&typeof r==='object'&&r.symbol==='AAPL'&&probe.fields.some(f=>typeof r[f]==='number'&&Number.isFinite(r[f])));
       status=payload.length===0?'empty':rows.length?'available':'unexpected';
      }else status=errorStatus(response.status,payload);
     }catch{status='unavailable';}
     stop=['invalid_key','rate_limited'].includes(status);
    }
    const dates=(rows||[]).map(r=>r.date).filter(s=>{try{return date(s);}catch{return false;}}).sort();
    checks.push({id:probe.id,name:probe.name,status,message:messages[status],observations:status==='available'?rows.length:0,firstDate:dates[0]||null,lastDate:dates.at(-1)||null});
   }
   const checkedAt=new Date(now()).toISOString();
   last={configured:true,connected:checks.some(c=>c.status==='available'),symbol:'AAPL',checkedAt,nextCheckAt:new Date(now()+3600000).toISOString(),cached:false,checks};
   return last;
  })();
  try{return await pending;}finally{pending=null;}
 }
 return {inspect};
}
