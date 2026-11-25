import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
export async function openDatabase({url,devPath} = {}) {
  if (url && devPath) throw new Error('Choose one database connection.');
  if (url) {
    const {Pool} = await import('pg');
    const pool = new Pool({connectionString:url,max:10,connectionTimeoutMillis:10000});
    return {query:(sql,args=[])=>pool.query(sql,args),async transaction(fn){const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}},close:()=>pool.end()};
  }
  if (devPath) {
    if (process.env.NODE_ENV === 'production') throw new Error('Embedded development database is unavailable in production.');
    const {PGlite} = await import('@electric-sql/pglite');
    const db = new PGlite(devPath);
    await db.waitReady;
    return {query:(sql,args=[])=>db.query(sql,args),transaction:fn=>db.transaction(fn),exec:sql=>db.exec(sql),close:()=>db.close()};
  }
  return null;
}

export async function checkSchema(db) {
  const result = await db.query('SELECT id FROM "VoidSchemaMigration" WHERE id=$1',['20261125_shared_discord']);
  if (!result.rows.length) throw new Error('Shared account migration is missing. Apply it explicitly after backup.');
}

// For a NEW local database only. Never called by the web server.
export async function initializeDevelopment(db) {
  await db.exec(await readFile(path.join(root,'database/legacy-initial.sql'),'utf8'));
  await db.exec(await readFile(path.join(root,'database/migrations/20261125_shared_discord.sql'),'utf8'));
}
