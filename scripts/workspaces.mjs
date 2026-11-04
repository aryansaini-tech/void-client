import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadEnvFile } from 'node:process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try { loadEnvFile(path.join(root, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const task = process.argv[2];
if (!['dev', 'build', 'start', 'typecheck'].includes(task)) throw new Error('Expected dev, build, start, or typecheck.');
const apps = ['website', 'account', 'store', 'backend'];
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this script with npm run.');
const children = new Set();
let stopping = false;
const stop = () => {
  stopping = true;
  for (const child of children) {
    if (!child.pid) continue;
    if (process.platform === 'win32') {
      // Only terminate the process tree created by this runner, never every Node process.
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      killer.on('error', () => child.kill('SIGTERM'));
    } else child.kill('SIGTERM');
  }
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
function run(app) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [npmCli, 'run', task, `--workspace=@void/${app}`], { cwd: root, stdio: 'inherit', env: process.env, windowsHide: true });
    children.add(child);
    child.on('error', (error) => { console.error(error.message); resolve(1); });
    child.on('exit', (code) => { children.delete(child); resolve(code ?? (stopping ? 0 : 1)); });
  });
}
if (task === 'build' || task === 'typecheck') {
  for (const app of apps) { const code = await run(app); if (code) process.exit(code); }
  if (task === 'typecheck') {
    for (const pkg of ['shared', 'ui']) {
      const code = await new Promise((resolve) => {
        const child = spawn(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--project', `packages/${pkg}/tsconfig.json`], {cwd: root, stdio: 'inherit', windowsHide: true});
        child.on('exit', resolve);
      });
      if (code) process.exit(code);
    }
    const testCode = await new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.tests.json'], { cwd: root, stdio: 'inherit', windowsHide: true });
      child.on('error', (error) => { console.error(error.message); resolve(1); });
      child.on('exit', resolve);
    });
    if (testCode) process.exit(testCode);
  }
} else {
  const results = await Promise.all(apps.map(async (app) => { const code = await run(app); if (!stopping) stop(); return code; }));
  process.exitCode = results.some(Boolean) ? 1 : 0;
}
