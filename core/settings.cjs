const catalogue=require('../data/catalogue.json'),sources=require('../data/sources.json');
const validIds=new Set(catalogue.map(k=>k.id));
function validatedPatch(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid settings.');
  const p={};
  if(input.selected!==undefined){if(!Array.isArray(input.selected)||input.selected.length>catalogue.filter(k=>k.rank>0).length||input.selected.some(id=>!validIds.has(id)||['market','recession'].includes(id)))throw Error('Invalid indicator selection.');p.selected=[...new Set(input.selected)];}
  if(input.mode!==undefined){if(!['latest','firstRelease'].includes(input.mode))throw Error('Invalid data mode.');p.mode=input.mode;}
  if(input.theme!==undefined){if(!['light','dark'].includes(input.theme))throw Error('Invalid theme.');p.theme=input.theme;}
  if(input.autoRefresh!==undefined)p.autoRefresh=!!input.autoRefresh;
  if(input.memberships!==undefined){if(!Array.isArray(input.memberships)||input.memberships.some(id=>!sources.some(s=>s.id===id)))throw Error('Invalid membership selection.');p.memberships=input.memberships;}
  if(input.rules!==undefined){if(!Array.isArray(input.rules)||input.rules.length>30)throw Error('Maximum 30 rules.');p.rules=input.rules.map(r=>{if(!validIds.has(r.kpiId)||['market','recession'].includes(r.kpiId)||!['above','below'].includes(r.operator)||!Number.isFinite(r.threshold)||!Number.isInteger(r.months)||r.months<1||r.months>12)throw Error('Invalid watch condition.');return {id:String(r.id).slice(0,80),kpiId:r.kpiId,operator:r.operator,threshold:r.threshold,months:r.months};});}
  if(input.trend!==undefined){const t=input.trend;if(!t||!Array.isArray(t.ids)||t.ids.length>5||t.ids.some(id=>!validIds.has(id))||![12,36,60,120,240,360].includes(t.window)||!['native','change','pct','yoy','zscore'].includes(t.transform))throw Error('Invalid chart settings.');p.trend={ids:t.ids,window:Math.min(t.window,240),transform:t.transform};}
  if(input.watchlists!==undefined){if(!Array.isArray(input.watchlists)||input.watchlists.length>20)throw Error('Maximum 20 watchlists.');p.watchlists=input.watchlists.map(w=>{if(typeof w.name!=='string'||!w.name.trim()||w.name.length>60||!Array.isArray(w.ids)||w.ids.some(id=>!validIds.has(id)||['market','recession'].includes(id)))throw Error('Invalid watchlist.');return {name:w.name,ids:[...new Set(w.ids)]};});}
  return p;
}
function restorePreferences(input,defaults){
  const restored={...defaults,...validatedPatch(input),lastRefresh:input.lastRefresh||null};
  if(input.version!==defaults.version)restored.trend={...restored.trend,window:240};
  return restored;
}
module.exports={validatedPatch,restorePreferences};
