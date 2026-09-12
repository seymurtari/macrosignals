import pg from 'pg';
import {LocalStore} from '../core/storage.cjs';
export async function createStore(defaults, env=process.env, suppliedPool=null){
  if(!env.DATABASE_URL){
    if(env.NODE_ENV==='production')throw Error('DATABASE_URL is required in production. Add a production PostgreSQL database.');
    const local=await new LocalStore(env.DATA_DIR||'.web-data',defaults).init();
    local.snapshot=async()=>({state:local.state,cache:local.cache});
    local.close=async()=>{};return local;
  }
  const pool=suppliedPool||new pg.Pool({connectionString:env.DATABASE_URL,max:3,connectionTimeoutMillis:10000});
  await pool.query('CREATE TABLE IF NOT EXISTS macrosignals_data (key text PRIMARY KEY, value jsonb NOT NULL)');
  await pool.query('INSERT INTO macrosignals_data VALUES ($1,$2) ON CONFLICT DO NOTHING',['settings',JSON.stringify(defaults)]);
  return {
    warnings:[],
    async snapshot(){const {rows}=await pool.query('SELECT key,value FROM macrosignals_data');const cache={};let state=defaults;for(const row of rows){if(row.key==='settings')state=row.value;else if(row.key.startsWith('series:'))cache[row.key.slice(7)]=row.value;}return {state,cache};},
    async update(patch){const {rows}=await pool.query("UPDATE macrosignals_data SET value=value || $1::jsonb WHERE key='settings' RETURNING value",[JSON.stringify(patch)]);return rows[0].value;},
    async putSeries(id,series){await pool.query('INSERT INTO macrosignals_data VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value',['series:'+id,JSON.stringify(series)]);},
    close:()=>pool.end()
  };
}
