import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist-web',{recursive:true});
await build({entryPoints:['src/web-main.tsx'],bundle:true,outfile:'dist-web/main.js',format:'iife',target:['chrome110','safari16'],minify:true});
const html=(await readFile('src/index.html','utf8')).replace("connect-src 'none'","connect-src 'self'").replace("form-action 'none'","form-action 'self'");
await writeFile('dist-web/index.html',html);
console.log('Built mobile web interface.');
