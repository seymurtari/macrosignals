const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('macroSignals',Object.freeze({
  bootstrap:()=>ipcRenderer.invoke('ms:bootstrap'),
  save:patch=>ipcRenderer.invoke('ms:save',patch),
  refresh:ids=>ipcRenderer.invoke('ms:refresh',ids),
  cancelRefresh:()=>ipcRenderer.invoke('ms:cancel-refresh'),
  setKey:key=>ipcRenderer.invoke('ms:set-key',key),
  importCSV:(id,firstRelease)=>ipcRenderer.invoke('ms:import',id,firstRelease),
  exportSeries:id=>ipcRenderer.invoke('ms:export-series',id),
  exportResearch:result=>ipcRenderer.invoke('ms:export-research',result),
  exportSettings:()=>ipcRenderer.invoke('ms:export-settings'),
  restoreSettings:()=>ipcRenderer.invoke('ms:restore-settings'),
  openSource:url=>ipcRenderer.invoke('ms:open-source',url),
  backtest:options=>ipcRenderer.invoke('ms:backtest',options),
  onProgress:callback=>{const listener=(_event,p)=>callback(p);ipcRenderer.on('ms:progress',listener);return()=>ipcRenderer.removeListener('ms:progress',listener);}
}));
