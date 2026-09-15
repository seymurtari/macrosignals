import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {JSDOM,VirtualConsole} from 'jsdom';
import {LocalStore} from '../core/storage.cjs';
import {validatedPatch} from '../core/settings.cjs';
import {monthEnd} from '../core/series.mjs';
const catalogue=JSON.parse(await fs.readFile(new URL('../data/catalogue.json',import.meta.url),'utf8'));
const sources=JSON.parse(await fs.readFile(new URL('../data/sources.json',import.meta.url),'utf8'));
const bundle=await fs.readFile(new URL('../dist/main.js',import.meta.url),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,20));
async function waitFor(check){const end=Date.now()+2500;while(Date.now()<end){if(check())return;await tick();}assert.ok(check(),'UI condition did not become true');}
test('Four-page desktop UI preserves selections, handles refresh errors, renders real cached observations and manages modal keyboard flow',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'ms-ui-')),errors=[];
 let dom;
 try{
 const defaults={version:2,selected:catalogue.filter(k=>k.default).map(k=>k.id),theme:'light',mode:'latest',autoRefresh:false,rules:[],memberships:[],watchlists:[],trend:{ids:['1','2','3'],window:240,transform:'zscore'},lastRefresh:null};
 const store=await new LocalStore(dir,defaults).init();
 for(const id of ['1','2','3','13','market'])await store.putSeries(id,{id,observations:Array.from({length:140},(_,i)=>({date:monthEnd(2015*12+i),value:(id==='market'?2500:10)+i*.15+Math.sin(i*.5)*2})),historyQuality:'latest-revised',retrievedAt:new Date().toISOString(),unit:catalogue.find(k=>k.id===id).unit});
 const ok=result=>({ok:true,result});let saved=0;
 const fake={bootstrap:async()=>ok({catalogue,sources,state:store.state,cache:store.cache,hasKey:false,secureVault:false,warnings:[],version:'0.1.1'}),save:async patch=>{const r=await store.update(validatedPatch(patch));saved++;return ok(r);},refresh:async()=>({ok:false,error:'Test network unavailable; cached data is preserved.'}),onProgress:()=>()=>{},openSource:async()=>ok(true)};
 const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e));
 dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://desktop-test.invalid',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
 dom.window.macroSignals=fake;dom.window.ResizeObserver=class{observe(el){this.callback?.([{contentRect:{width:600}}]);}constructor(cb){this.callback=cb;}disconnect(){}};
 dom.window.eval(bundle);
 const document=dom.window.document,button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
 await waitFor(()=>document.querySelector('h1')?.textContent==='Trends & correlations');
 assert.ok(document.querySelectorAll('svg path[stroke]').length>=3);
 const range=document.querySelector('select[aria-label="Chart window"]');assert.equal(range.value,'240');
 assert.equal(document.querySelectorAll('.history-coverage-row').length,defaults.selected.length);
 const cards=[...document.querySelectorAll('[aria-label="Selected KPI details"] button')];
 assert.equal(cards.length,defaults.selected.length);
 for(const card of cards){
  card.click();await waitFor(()=>document.querySelector('[role=dialog]'));
  assert.equal(document.querySelector('#detail-title').textContent,card.getAttribute('aria-label').replace('View details for ',''));
  document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await waitFor(()=>!document.querySelector('[role=dialog]'));
 }
 assert.ok(cards.some(card=>card.textContent.includes('No data loaded')));

 assert.match(document.querySelector('[aria-label="Displayed history coverage"]').textContent,/2015/);
 range.value='60';range.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await waitFor(()=>saved===1);
 range.value='240';range.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await waitFor(()=>saved===2);
 assert.equal((await new LocalStore(dir,{}).init()).state.trend.window,240);
 document.querySelector('.history-coverage-row').click();await waitFor(()=>document.querySelector('.detail-history'));
 assert.match(document.querySelector('.detail-history').textContent,/up to 20 years/);
 document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await waitFor(()=>!document.querySelector('[role=dialog]'));
 button('Data sources').click();await waitFor(()=>document.querySelectorAll('.source-card').length===sources.length);
 assert.match(document.body.textContent,/does not read Chrome cookies/);
 button('KPI catalogue').click();await waitFor(()=>document.querySelectorAll('.kpi-table .kpi-row').length===catalogue.filter(k=>k.rank>0).length);
 assert.equal(document.querySelectorAll('.group-header').length,9);
 const firstGroup=document.querySelector('.group-header button');assert.match(firstGroup.textContent,/Rates & monetary policy/);firstGroup.click();await waitFor(()=>document.querySelectorAll('.kpi-table .kpi-row').length===catalogue.filter(k=>k.rank>0).length-7);assert.equal(firstGroup.getAttribute('aria-expanded'),'false');firstGroup.click();await waitFor(()=>document.querySelectorAll('.kpi-table .kpi-row').length===catalogue.filter(k=>k.rank>0).length);
 const category=document.querySelector('select[aria-label="Filter category"]');category.value='housing';category.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await waitFor(()=>document.querySelectorAll('.kpi-table .kpi-row').length===2);assert.match(document.querySelector('.group-header').textContent,/Housing & construction/);category.value='All categories';category.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await waitFor(()=>document.querySelectorAll('.kpi-table .kpi-row').length===catalogue.filter(k=>k.rank>0).length);
 const original=store.state.selected.length;
 document.querySelector('input[aria-label="Track '+catalogue.find(k=>k.id==='5').name+'"]')?.click();
 await waitFor(()=>saved===3);assert.equal(store.state.selected.length,original+1);
 const reopened=await new LocalStore(dir,{}).init();assert.ok(reopened.state.selected.includes('5'));
 button('Analysis lab').click();await waitFor(()=>document.querySelector('.lab-tabs'));
 for(const name of ['Walk-forward test','Signal rules','Scenarios','Fed event study','Correlations & lags']){button(name).click();await tick();assert.ok(document.querySelector('.panel'));}
 button('Settings & backup').click();await waitFor(()=>document.querySelector('[role=dialog]'));
 assert.ok(document.activeElement.closest('[role=dialog]'));
 document.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await waitFor(()=>!document.querySelector('[role=dialog]'));
 button('Refresh data').click();await waitFor(()=>document.querySelector('[role=alert]')?.textContent.includes('Test network unavailable'));
 assert.equal(store.cache['1'].observations.length,140);
 assert.deepEqual(errors,[]);
 }finally{dom?.window.close();await fs.rm(dir,{recursive:true,force:true});}
});
