import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Worker} from 'node:worker_threads';
import {extractFile} from '@electron/asar';
import {fixture} from '../tests/fixtures.mjs';

const root=path.resolve(import.meta.dirname,'..');
const release=path.join(root,'release'),resources=path.join(release,'win-unpacked/resources');
const {version}=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
const launcher=path.join(release,`MacroSignals-${version}-Windows.exe`);
const digest=b=>createHash('sha256').update(b).digest('hex');
function peInfo(b){assert.equal(b.toString('ascii',0,2),'MZ');const p=b.readUInt32LE(0x3c);assert.equal(b.readUInt32LE(p),0x4550);const magic=b.readUInt16LE(p+24),dir=p+24+(magic===0x20b?112:96);return {machine:b.readUInt16LE(p+4),certificateBytes:b.readUInt32LE(dir+4*8+4)};}
const exe=await fs.readFile(launcher),runtime=await fs.readFile(path.join(release,'win-unpacked/MacroSignals.exe'));
const launcherInfo=peInfo(exe),runtimeInfo=peInfo(runtime);assert.equal(runtimeInfo.machine,0x8664,'Runtime must be Windows x64');assert.equal(launcherInfo.certificateBytes,0,'Documentation assumes this build is unsigned');
const files=['desktop/main.cjs','desktop/preload.cjs','core/storage.cjs','core/settings.cjs','core/providers.mjs','core/series.mjs','core/analysis.mjs','core/worker.mjs','data/catalogue.json','data/sources.json','dist/main.js','dist/main.css','dist/index.html','THIRD_PARTY_NOTICES.txt'];
for(const file of files){const packed=extractFile(path.join(resources,'app.asar'),file),original=await fs.readFile(path.join(root,file));assert.equal(digest(packed),digest(original),'Packaged file differs: '+file);}
const workerResult=await new Promise((resolve,reject)=>{const w=new Worker(path.join(resources,'app.asar.unpacked/core/worker.mjs'),{workerData:fixture()});const timer=setTimeout(()=>{w.terminate();reject(Error('Packaged worker timed out'));},15000);w.once('message',m=>{clearTimeout(timer);m.ok?resolve(m.result):reject(Error(m.error));});w.once('error',e=>{clearTimeout(timer);reject(e);});});
assert.ok(workerResult.summary.n>100);assert.equal(workerResult.holdout.n,24);
const report={verifiedAt:new Date().toISOString(),file:path.basename(launcher),bytes:exe.length,sha256:digest(exe),runtimeArchitecture:'Windows x64',signed:false,packedFilesMatched:files.length,packagedWorker:{evaluatedMonths:workerResult.summary.n,holdoutMonths:workerResult.holdout.n},nativeWindowsLaunchTested:false};
await fs.writeFile(path.join(root,'docs/Release-Verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
