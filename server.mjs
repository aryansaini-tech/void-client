import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startFromEnvironment} from './shared-server.mjs';
export {createVoidServer} from './shared-server.mjs';
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await startFromEnvironment();}catch{console.error('VOID could not start. Check private server configuration and the database migration.');process.exitCode=1;}
}
