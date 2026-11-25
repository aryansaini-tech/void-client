import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(import.meta.url);
export const defaultWorkspace = path.resolve(path.dirname(script), '..');
const normal = value => value.replaceAll('\\', '/');
const privateSegments = /(?:^|\/)(?:private-data|audit|audit-private|permissions|Latite-master|client|node_modules|dist|out|\.git|\.ui-baseline|\.account-test-data|\.playwright-cli|\.taste-skill|test-results|playwright-report|qa|validation|quarantine|scratch|archive|analysis|reference[^/]*|disassembly)(?:\/|$)/i;
const buildDirectories = /(?:^|\/)build[^/]*\//i;
const privateFiles = /(?:^|\/)(?:oauth\.env|\.env(?:\..*)?|username\.txt)(?:$)|\.(?:dll|pdb|exe|obj|lib|exp|ilk|zip|7z|jar|class|sqlite3?|db|dump|bak|pem|key|pfx|p12|bin|gz|log|tga|mcpack|mcaddon|mcworld|mca|nbt|dat)$/i;
const extraPrivateFiles = /\.(?:sqlite3?|db)-(?:wal|shm|journal)$|\.(?:idb|i64|gpr|asm|disasm)$|(?:^|\/)(?:ghidra|disassembly|disasm)[^/]*(?:$)/i;
const gameReference = /(?:^|\/)(?:third-party\/tiro-source|third_party\/tiro-source|landing-pages|textures|landscapes)(?:\/|$)|(?:^|\/)(?:minecraft[^/]*|world-mesh[^/]*|player-landscape\.[^/]+|skin\.png|test_orig_logo\.png|(?:temp_|.*_raw\.)[^/]*)(?:$)/i;

export function forbiddenReason(relative) {
  if (!relative || relative.startsWith('/') || /^[A-Za-z]:/.test(relative) || /[\u0000-\u001f]/.test(relative) || relative.includes('\\') || relative.split('/').includes('..')) return 'unsafe-path';
  if (privateSegments.test(relative) || buildDirectories.test(relative)) return 'private-or-protected-directory';
  if (privateFiles.test(relative) || extraPrivateFiles.test(relative)) return 'private-or-generated-file';
  if (gameReference.test(relative)) return 'game-or-reference-material';
  return null;
}

export function readManifest(filename) {
  const files = fs.readFileSync(filename, 'utf8').split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  if (files.length !== new Set(files).size) throw new Error('Duplicate manifest path');
  for (const name of files) if (forbiddenReason(name)) throw new Error('Forbidden manifest path: ' + name);
  return files.sort();
}

export function buildReleaseManifest(workspace = defaultWorkspace) {
  const root = fs.realpathSync(workspace);
  const files = readManifest(path.join(root, 'docs/RELEASE_FILES.txt'));
  for (const name of files) {
    const absolute = path.resolve(root, name);
    if (!absolute.startsWith(root + path.sep) || !fs.existsSync(absolute)) throw new Error('Missing release file: ' + name);
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink() || fs.realpathSync(absolute) !== absolute) throw new Error('Unsafe release file: ' + name);
  }
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === script) {
  try {
    const args = process.argv.slice(2);
    const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
    const root = path.resolve(value('--root') || defaultWorkspace);
    const files = buildReleaseManifest(root);
    const output = value('--output');
    if (output) {
      const absolute = path.resolve(root, output), relative = normal(path.relative(root, absolute));
      if (!absolute.startsWith(root + path.sep) || forbiddenReason(relative)) throw new Error('Unsafe manifest output');
      fs.mkdirSync(path.dirname(absolute), {recursive:true});
      fs.writeFileSync(absolute, '# Exact website repository release files.\n' + [...new Set([...files, relative])].sort().join('\n') + '\n');
    }
    console.log(args.includes('--json') ? JSON.stringify(files, null, 2) : files.join('\n'));
  } catch { console.error('FAIL: release manifest could not be prepared safely.'); process.exitCode = 1; }
}
