import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = path.join(root, 'apps', 'website');
const output = path.resolve(app, 'out');
const run = (args, cwd = root, env = process.env) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit', windowsHide: true });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Pages build command failed with exit code ${code}.`)));
});

if (process.argv.includes('--build')) {
  if (!process.env.npm_execpath) throw new Error('Run this command with npm run build:pages.');
  await run(['scripts/prepare-brand.mjs']);
  await run([process.env.npm_execpath, 'run', 'build', '--workspace=@void/website'], root, { ...process.env, VOID_BUILD_PAGES: 'true' });
} else if (['1', 'true', 'yes'].includes(process.env.CF_PAGES) || process.env.VOID_BUILD_PAGES === 'true') {
  const packageOnly = process.argv.includes('--package-only');
  // OpenNext invokes the workspace build itself. Its parent command packages
  // Pages after OpenNext finishes; its nested postbuild must not rebuild it.
  if (!packageOnly && process.env.NEXT_PRIVATE_STANDALONE === 'true') process.exit(0);
  if (!packageOnly) {
    await run(['scripts/patch-opennext.mjs']);
    await run([path.join(root, 'node_modules/@opennextjs/cloudflare/dist/cli/index.js'), 'build', '--skipNextBuild'], app);
  }
  // This is a generated deployment directory, never a source or external path.
  if (path.relative(app, output) !== 'out') throw new Error('Invalid Pages output directory.');
  await rm(output, { recursive: true, force: true });
  await cp(path.join(app, '.open-next/assets'), output, { recursive: true });
  const worker = path.join(output, '_worker.js');
  await mkdir(worker, { recursive: true });
  await run([
    path.join(root, 'node_modules/wrangler/bin/wrangler.js'), 'deploy', '--dry-run', '--minify',
    '--config', path.join(app, 'wrangler.jsonc'), '--outdir', worker,
  ]);
  // Pages advanced mode uses index.js for a module Worker directory. Retain
  // Wrangler's emitted JS/Wasm module graph and expose the request handler.
  await writeFile(path.join(worker, 'index.js'), 'export { default } from "./worker.js";\n');
  const entries = await readdir(output, { withFileTypes: true });
  const exclude = entries.filter(entry => entry.name !== '_worker.js' && entry.name !== '_headers' && entry.name !== 'BUILD_ID')
    .map(entry => `/${entry.name}${entry.isDirectory() ? '/*' : ''}`);
  if (exclude.length > 99) throw new Error('Pages routing exceeds the 100-rule limit.');
  await writeFile(path.join(output, '_routes.json'), JSON.stringify({ version: 1, include: ['/*'], exclude }, null, 2) + '\n');
  // Git builds supply their actual Pages project in the deployment hostname.
  // Keep the configured name in local builds and for non-pages.dev hostnames.
  if (process.env.CF_PAGES_URL) {
    const hostname = new URL(process.env.CF_PAGES_URL).hostname;
    if (hostname.endsWith('.pages.dev')) {
      const name = hostname.split('.').at(-3);
      if (!name || !/^[a-z0-9-]+$/.test(name)) throw new Error('Invalid Pages project hostname.');
      const configPath = path.join(root, 'wrangler.jsonc');
      const config = JSON.parse(await readFile(configPath, 'utf8'));
      config.name = name;
      await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
    }
  }
  console.log('Pages advanced-mode server, static assets, and routes prepared in apps/website/out.');
}
