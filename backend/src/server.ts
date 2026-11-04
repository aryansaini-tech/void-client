import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { modules, changelog, partners, faqs } from '@void/shared/content';
import { getCatalog } from './catalog';
import { getDatabase } from './database';
import { serviceState, validateProduction } from './env';
import { deliverNextEmail } from './mail';

validateProduction();
const app=new Hono();
app.use('*',secureHeaders());
app.get('/health',c=>c.json({status:'ok',service:'void-backend'}));
app.get('/ready',async c=>{if(!serviceState().database)return c.json({status:'unconfigured'},503);try{await getDatabase().$queryRaw`SELECT 1`;return c.json({status:'ready'});}catch{return c.json({status:'unavailable'},503);}});
app.get('/v1/catalog',async c=>{const result=await getCatalog();return c.json(result,result.status==='unavailable'?503:200);});
app.get('/v1/modules',c=>c.json({modules}));
app.get('/v1/releases',c=>c.json({releases:changelog}));
app.get('/v1/partners',c=>c.json({partners}));
app.get('/v1/faq',c=>c.json({faqs}));
app.notFound(c=>c.json({error:'Not found.'},404));
app.onError((_error,c)=>c.json({error:'Service temporarily unavailable.'},503));
const port=Number(process.env.BACKEND_PORT ?? 3003);
const server=serve({fetch:app.fetch,port,hostname:process.env.VOID_BIND_HOST ?? '0.0.0.0'},()=>console.log(`Void backend listening on port ${port}. Email worker ${serviceState().email?'enabled':'unconfigured'}.`));
let shuttingDown=false;
let working=false;
const worker=setInterval(async()=>{
  if(working || shuttingDown)return;working=true;
  try{for(let i=0;i<10;i++){if(!await deliverNextEmail())break;}}catch{console.error('Email worker unavailable. Check database and mail configuration.');}finally{working=false;}
},5000);
const cleanup=setInterval(async()=>{
  if(!serviceState().database)return;
  try { const db=getDatabase(); await Promise.all([db.rateBucket.deleteMany({where:{resetAt:{lt:new Date()}}}),db.session.deleteMany({where:{expiresAt:{lt:new Date()}}}),db.verification.deleteMany({where:{expiresAt:{lt:new Date()}}}),db.emailOutbox.deleteMany({where:{status:'SENT',sentAt:{lt:new Date(Date.now()-86400000)}}})]); } catch { console.error('Scheduled cleanup will retry.'); }
},60*60*1000);
async function stop(){if(shuttingDown)return;shuttingDown=true;clearInterval(worker);clearInterval(cleanup);server.close();if(serviceState().database)await getDatabase().$disconnect();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
