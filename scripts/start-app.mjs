import { cp, access } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { loadEnvFile } from 'node:process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = process.argv[2];
const ports = { website: 3000, account: 3001, store: 3002 };
if (!Object.hasOwn(ports, app)) throw new Error('Choose website, account, or store.');
try { loadEnvFile(path.join(root, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const source = path.join(root, 'apps', app);
const target = path.join(source, '.next', 'standalone', 'apps', app);
const server = path.join(target, 'server.js');
try { await access(server); } catch { throw new Error(`Build the ${app} application before starting it.`); }
await cp(path.join(source, '.next', 'static'), path.join(target, '.next', 'static'), { recursive: true });
await cp(path.join(source, 'public'), path.join(target, 'public'), { recursive: true });
process.env.PORT ??= String(ports[app]);
process.env.HOSTNAME = process.env.VOID_BIND_HOST ?? '0.0.0.0';
await import(pathToFileURL(server).href);
