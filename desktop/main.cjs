const {app,BrowserWindow,ipcMain,dialog,shell,protocol,net,safeStorage,session}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
const {pathToFileURL}=require('node:url');
const {Worker}=require('node:worker_threads');
const {LocalStore}=require('../core/storage.cjs');
const catalogue=require('../data/catalogue.json'),sources=require('../data/sources.json');
app.setName('MacroSignals');
if(process.platform==='win32')app.setAppUserModelId('local.macrosignals.desktop');
const ownsWorkspace=app.requestSingleInstanceLock();
if(!ownsWorkspace)app.quit();
const validIds=new Set(catalogue.map(k=>k.id));
const defaults={version:2,selected:catalogue.filter(k=>k.default).map(k=>k.id),mode:'latest',autoRefresh:false,theme:'light',rules:[],memberships:[],watchlists:[],trend:{ids:['1','2','3'],window:240,transform:'zscore'},lastRefresh:null};
protocol.registerSchemesAsPrivileged([{scheme:'app',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
let win,store,sessionKey='',activeRefresh=null,analysisWorker=null,lastResearch=null;
const appURL='app://macrosignals/index.html';
const coreRoot=app.isPackaged?path.join(process.resourcesPath,'app.asar.unpacked','core'):path.join(__dirname,'../core');
const coreModule=name=>import(pathToFileURL(path.join(coreRoot,name)).href);
const send=p=>{if(win&&!win.isDestroyed())win.webContents.send('ms:progress',p);};
const errorResult=e=>({ok:false,error:e?.message||'The operation could not be completed.'});
const {validatedPatch,restorePreferences}=require('../core/settings.cjs');
function secureVault(){return safeStorage.isEncryptionAvailable()&&(!safeStorage.getSelectedStorageBackend||safeStorage.getSelectedStorageBackend()!=='basic_text');}
async function readKey(){if(sessionKey)return sessionKey;if(!secureVault())return '';try{const key=await fs.readFile(path.join(store.directory,'fred-key.enc'));return safeStorage.decryptString(key);}catch{return '';}}
function handler(name,fn){ipcMain.handle(name,async(event,...args)=>{try{if(event.sender!==win?.webContents||event.senderFrame!==win.webContents.mainFrame||event.senderFrame.url!==appURL)throw Error('Untrusted application request.');return {ok:true,result:await fn(...args)};}catch(e){return errorResult(e);}});}
async function refresh(ids){
  if(activeRefresh)throw Error('A refresh is already running.');
  if(!Array.isArray(ids)||ids.length>52||ids.some(id=>!validIds.has(id)))throw Error('Invalid refresh request.');
  const {fetchMetric}=await coreModule('providers.mjs');
  const unique=[...new Set(ids)],controller=new AbortController();activeRefresh=controller;
  const componentCache=new Map(),errors=[],updated=[];let done=0;
  try{
    const apiKey=await readKey(),mode=store.state.mode;
    for(const id of unique){
      if(controller.signal.aborted)break;
      const def=catalogue.find(k=>k.id===id);if(def.adapter!=='fred'){errors.push({id,error:'CSV import required; no direct connection.'});done++;continue;}
      send({phase:'refresh',id,name:def.name,done,total:unique.length});
      try{const series=await fetchMetric(def,{mode,apiKey,fetcher:net.fetch,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(35000)])},componentCache);await store.putSeries(id,series);updated.push(id);}
      catch(e){errors.push({id,error:e.message});}
      done++;send({phase:'refresh',done,total:unique.length,id,errors:errors.length});
    }
    if(updated.length)await store.update({lastRefresh:new Date().toISOString()});
    return {updated,errors,cancelled:controller.signal.aborted,cache:store.cache,state:store.state};
  }finally{activeRefresh=null;send({phase:'idle'});}
}
async function chooseSave(defaultPath,filters,content){const r=await dialog.showSaveDialog(win,{defaultPath,filters});if(r.canceled)return null;await fs.writeFile(r.filePath,content,'utf8');return path.basename(r.filePath);}
async function createWindow(){
  win=new BrowserWindow({width:1320,height:880,minWidth:820,minHeight:620,title:'MacroSignals',backgroundColor:'#f4f6f8',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,spellcheck:false}});
  win.setMenuBarVisibility(false);win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(e,url)=>{if(url!==appURL)e.preventDefault();});
  win.webContents.on('will-attach-webview',e=>e.preventDefault());
  await win.loadURL(appURL);
}
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});
if(ownsWorkspace)app.whenReady().then(async()=>{
  store=await new LocalStore(path.join(app.getPath('userData'),'research'),defaults).init();
  try{const previousVersion=store.state.version;store.state=restorePreferences(store.state,defaults);if(previousVersion!==defaults.version)await store.update(store.state);}catch{store.state={...defaults};store.warnings.push('Some saved preferences were invalid and have been reset.');}
  const root=path.join(app.getAppPath(),'dist');
  protocol.handle('app',request=>{try{const u=new URL(request.url);if(u.host!=='macrosignals')return new Response('Not found',{status:404});const p=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(p!==root&&!p.startsWith(root+path.sep))return new Response('Forbidden',{status:403});return net.fetch(pathToFileURL(p).toString());}catch{return new Response('Invalid request',{status:400});}});
  session.defaultSession.setPermissionRequestHandler((_w,_p,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  handler('ms:bootstrap',async()=>({catalogue,sources,state:store.state,cache:store.cache,hasKey:!!await readKey(),secureVault:secureVault(),warnings:store.warnings,version:app.getVersion()}));
  handler('ms:save',async patch=>store.update(validatedPatch(patch)));
  handler('ms:refresh',refresh);
  handler('ms:cancel-refresh',()=>{activeRefresh?.abort();return true;});
  handler('ms:set-key',async key=>{if(typeof key!=='string'||key&&!/^[a-z0-9]{32}$/i.test(key))throw Error('Use the 32-character FRED API key.');sessionKey=key;const p=path.join(store.directory,'fred-key.enc');if(!key){await fs.rm(p,{force:true});return {saved:false,hasKey:false};}if(secureVault()){await fs.writeFile(p,safeStorage.encryptString(key),{mode:0o600});return {saved:true,hasKey:true};}return {saved:false,hasKey:true};});
  handler('ms:import',async(id,firstRelease)=>{if(!validIds.has(id))throw Error('Unknown indicator.');const r=await dialog.showOpenDialog(win,{filters:[{name:'CSV data',extensions:['csv']}],properties:['openFile']});if(r.canceled)return null;const stat=await fs.stat(r.filePaths[0]);if(stat.size>12_000_000)throw Error('CSV must be smaller than 12 MB.');const {parseSeriesCSV}=await coreModule('series.mjs'),parsed=parseSeriesCSV(await fs.readFile(r.filePaths[0],'utf8'),{firstRelease:!!firstRelease});const def=catalogue.find(k=>k.id===id);const series={id,...parsed,historyQuality:firstRelease?'user-first-release':'import-revised',source:'Imported: '+path.basename(r.filePaths[0]),sourceUrl:'',unit:def.unit,frequency:def.frequency,retrievedAt:new Date().toISOString(),transform:'already-in-displayed-units'};await store.putSeries(id,series);return series;});
  handler('ms:export-series',async id=>{if(!validIds.has(id)||!store.cache[id])throw Error('Load data before exporting.');const {exportCSV}=await coreModule('series.mjs');return chooseSave('MacroSignals-'+id+'.csv',[{name:'CSV',extensions:['csv']}],exportCSV(store.cache[id].observations));});
  handler('ms:export-research',async result=>{if(!lastResearch||result?.createdAt!==lastResearch.analysis.createdAt)throw Error('Run a historical test before exporting its research snapshot.');const payload={application:'MacroSignals',version:app.getVersion(),exportedAt:new Date().toISOString(),...lastResearch,catalogue,notes:'Frozen inputs from the completed analysis, even if data has since been refreshed. Source data retains its provider rights. Credentials are excluded.'};return chooseSave('MacroSignals-research.json',[{name:'Research bundle',extensions:['json']}],JSON.stringify(payload,null,2));});
  handler('ms:export-settings',()=>chooseSave('MacroSignals-settings.json',[{name:'Settings',extensions:['json']}],JSON.stringify({application:'MacroSignals',settings:store.state},null,2)));
  handler('ms:restore-settings',async()=>{const r=await dialog.showOpenDialog(win,{filters:[{name:'Settings',extensions:['json']}],properties:['openFile']});if(r.canceled)return null;const stat=await fs.stat(r.filePaths[0]);if(stat.size>100_000)throw Error('Settings file is too large.');const parsed=JSON.parse(await fs.readFile(r.filePaths[0],'utf8'));if(parsed.application!=='MacroSignals')throw Error('Choose a MacroSignals settings export.');return store.update(validatedPatch(parsed.settings));});
  handler('ms:open-source',async url=>{const allowed=new Set([...sources.map(s=>s.url),...catalogue.map(k=>k.url),'https://fred.stlouisfed.org/docs/api/api_key.html']);if(typeof url!=='string'||!allowed.has(url)||!url.startsWith('https://'))throw Error('This source link is not allowed.');await shell.openExternal(url);return true;});
  handler('ms:backtest',async options=>{
    if(analysisWorker)throw Error('An analysis is already running.');
    const snapshot=structuredClone({settings:store.state,observations:store.cache});
    return new Promise((resolve,reject)=>{
      let settled=false;
      const w=new Worker(path.join(coreRoot,'worker.mjs'),{workerData:{...options,catalogue,cache:snapshot.observations}});analysisWorker=w;
      const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);analysisWorker=null;if(error)reject(error);else{lastResearch={...snapshot,analysis:result};resolve(result);}};
      const timer=setTimeout(()=>{w.terminate();finish(Error('Analysis exceeded two minutes. Choose fewer predictors.'));},120000);
      w.once('message',m=>finish(m.ok?null:Error(m.error),m.result));
      w.once('error',e=>finish(Error('The analysis worker failed: '+e.message)));
      w.once('exit',code=>{if(!settled)finish(Error('The analysis worker ended without results (code '+code+').'));});
    });
  });
  await createWindow();
  // Only while the app is open; user enables this in Settings.
  const timer=setInterval(()=>{if(store.state.autoRefresh&&!activeRefresh&&(!store.state.lastRefresh||Date.now()-Date.parse(store.state.lastRefresh)>23*60*60*1000))refresh([...store.state.selected.filter(id=>catalogue.find(k=>k.id===id).adapter==='fred'),'market','recession'].filter(id=>!['user-first-release','import-revised'].includes(store.cache[id]?.historyQuality))).then(r=>send({phase:'updated',...r})).catch(e=>send({phase:'error',error:e.message}));},60000);timer.unref();
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('window-all-closed',()=>{activeRefresh?.abort();analysisWorker?.terminate();if(process.platform!=='darwin')app.quit();});
app.on('before-quit',()=>{activeRefresh?.abort();analysisWorker?.terminate();});
