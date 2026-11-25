import path from 'node:path';
import {existsSync} from 'node:fs';
import {openDatabase,initializeDevelopment} from '../database.mjs';
const target=process.env.VOID_DEV_DATABASE_PATH;
if(!target || process.env.DATABASE_URL || process.env.NODE_ENV==='production') throw new Error('Set only VOID_DEV_DATABASE_PATH to a new local private database directory.');
const resolved=path.resolve(target);
if(existsSync(resolved)) throw new Error('Development initialization requires a new directory; existing databases are never overwritten.');
const db=await openDatabase({devPath:resolved});
try{await initializeDevelopment(db);console.log('Created a separate development schema. No production connection was used.');}finally{await db.close();}
