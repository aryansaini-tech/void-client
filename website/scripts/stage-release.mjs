import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {defaultWorkspace,readManifest,forbiddenReason} from './release-manifest.mjs';
const args=process.argv.slice(2),destination=args[args.indexOf('--destination')+1];
if(!args.includes('--destination')||!destination)throw new Error('An explicit isolated checkout is required.');
const target=fs.realpathSync(destination),temp=fs.realpathSync(os.tmpdir()),source=fs.realpathSync(defaultWorkspace);
if(!target.toLowerCase().startsWith((temp+path.sep).toLowerCase())||target===source||!fs.existsSync(path.join(target,'.git')))throw new Error('The destination must be an existing isolated Git checkout inside the OS temporary directory.');
const files=readManifest(path.join(source,'website/docs/RELEASE_FILES.txt'));
let copied=0;
for(const name of files){
 if(args.includes('--website-only')&&!name.startsWith('website/')&&!['README.md','THIRD_PARTY_NOTICES.md','.gitignore'].includes(name))continue;
 if(forbiddenReason(name))throw new Error('Forbidden release path.');
 const fromName=name==='README.md'?'website/docs/RELEASE_README.md':name==='THIRD_PARTY_NOTICES.md'?'website/docs/RELEASE_NOTICES.md':name;
 const from=path.resolve(source,fromName),to=path.resolve(target,name);
 if(!from.startsWith(source+path.sep)||!to.startsWith(target+path.sep)||fs.realpathSync(from)!==from||!fs.statSync(from).isFile())throw new Error('Release source is not a regular allowlisted file.');
 fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);copied++;
}
console.log(`Copied ${copied} reviewed release files to the isolated checkout. No private directories or environment files were copied.`);
