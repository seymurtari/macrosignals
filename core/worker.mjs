import {parentPort,workerData} from 'node:worker_threads';
import {runBacktest} from './analysis.mjs';
try{parentPort.postMessage({ok:true,result:runBacktest(workerData)});}catch(e){parentPort.postMessage({ok:false,error:e.message});}
