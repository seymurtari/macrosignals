import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await build({entryPoints:['src/main.tsx'],bundle:true,outdir:'dist',format:'iife',target:'chrome138',minify:true,sourcemap:false,loader:{'.woff2':'file'}});
await copyFile('src/index.html','dist/index.html');
console.log('Built desktop interface.');
