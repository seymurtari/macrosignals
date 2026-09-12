const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
class LocalStore {
  constructor(directory,defaults){this.directory=directory;this.defaults=defaults;this.queue=Promise.resolve();this.warnings=[];}
  async init(){await fs.mkdir(this.directory,{recursive:true});const object=x=>x&&typeof x==='object'&&!Array.isArray(x);this.state=await this.read('settings.json',this.defaults,object);this.cache=await this.read('observations.json',{},x=>object(x)&&Object.values(x).every(s=>object(s)&&Array.isArray(s.observations)&&s.observations.length>0&&s.observations.every((p,i)=>typeof p.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&Number.isFinite(Date.parse(p.date))&&Number.isFinite(p.value)&&(!i||p.date>s.observations[i-1].date))));return this;}
  async read(name,fallback,validate=()=>true){try{const s=await fs.readFile(path.join(this.directory,name),'utf8'),value=JSON.parse(s);if(!validate(value))throw Error('Invalid stored data structure.');return value;}catch(e){if(e.code!=='ENOENT'){this.warnings.push(`${name} could not be read. A recovery copy was retained.`);try{await fs.copyFile(path.join(this.directory,name),path.join(this.directory,name+'.recovery-'+Date.now()));}catch{}}return structuredClone(fallback);}}
  async atomic(name,value){const file=path.join(this.directory,name),tmp=file+'.'+crypto.randomUUID()+'.tmp';await fs.writeFile(tmp,JSON.stringify(value),{mode:0o600});await fs.rename(tmp,file);}
  transact(fn){const next=this.queue.then(fn);this.queue=next.catch(()=>{});return next;}
  update(patch){return this.transact(async()=>{const next={...this.state,...patch};await this.atomic('settings.json',next);this.state=next;return next;});}
  putSeries(id,series){return this.transact(async()=>{const next={...this.cache,[id]:series};await this.atomic('observations.json',next);this.cache=next;});}
}
module.exports={LocalStore};
