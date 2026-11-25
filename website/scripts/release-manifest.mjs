import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const script = fileURLToPath(import.meta.url);
export const defaultWorkspace = path.resolve(path.dirname(script), '../..');
const normal = value => value.replaceAll('\\', '/');
const code = /\.(?:[cm]?js|jsx|tsx?|css|json|sql|prisma|md|txt|html|cpp|c|h|hpp|cmake|in|manifest)$/i;
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

function walk(root, relative, found) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return;
  for (const entry of fs.readdirSync(absolute, {withFileTypes: true})) {
    const name = normal(path.join(relative, entry.name));
    if (forbiddenReason(name)) continue;
    const full = path.join(root, name);
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) throw new Error(`Symbolic link excluded: ${name}`);
    if (entry.isDirectory()) walk(root, name, found);
    else if (entry.isFile()) found.add(name);
  }
}

export function buildReleaseManifest(workspace = defaultWorkspace) {
  const root = fs.realpathSync(workspace);
  const all = new Set();
  const chosen = new Set();
  const add = relative => {
    const name = normal(relative);
    if (forbiddenReason(name)) return;
    const full = path.resolve(root, name);
    if (!full.startsWith(root + path.sep) || !fs.existsSync(full)) return;
    const stat = fs.lstatSync(full);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Non-regular release file: ${name}`);
    chosen.add(name);
  };
  for (const folder of ['website', 'launcher']) walk(root, folder, all);
  for (const name of all) {
    if (/^website\/(?:src|database|docs)\//.test(name) && code.test(name) && !/^website\/src\/(?:PlayerPreview\.jsx|player-preview\.css)$/.test(name)) add(name);
    if (/^website\/(?:package(?:-lock)?\.json|vite\.config\.js|index\.html|\.gitignore|README\.md|STATUS\.md|THIRD_PARTY_NOTICES(?:\.md)?|USER-LOGIN-SETUP\.md|(?:[^/]+\.test\.mjs)|(?:server|shared-auth|shared-server|payments|account-store|database)\.mjs)$/.test(name) && !/^website\/(?:user-auth(?:\.test)?|server\.test)\.mjs$/.test(name)) add(name);
    if (/^website\/scripts\/(?:database-dev|release-manifest|secret-scan|verify-account-admin-ui|stage-release)\.mjs$/.test(name)) add(name);
    if (/^website\/dependency-licenses\/[^/]+\/(?:LICENSE|NOTICE|COPYING)[^/]*$/i.test(name)) add(name);
    if (/^website\/public\/void\/(?:brand-logo\.png(?:\.provenance\.json)?|mark\.svg|launcher-(?:home|cosmetics)\.png|native-ui(?:-data)?\.(?:js|css))$/.test(name)) add(name);
    if (/^website\/public\/void\/fonts\/[^/]+\.(?:ttf|otf|woff2?|txt|md)$/.test(name)) add(name);
    if (/^website\/public\/void\/taste\/motion\/motion\.(?:js|css)$/.test(name)) add(name);
    if (/^website\/public\/void\/taste\/moments\/(?:moments\.js|lib\.js|word-highlight\/(?:moment\.(?:js|css)|meta\.json))$/.test(name)) add(name);
    if (/^website\/src\/components\//.test(name) && code.test(name)) add(name);
    if (/^launcher\/(?:CMakeLists\.txt|\.gitignore|README\.md|ACCOUNT-INTEGRATION\.md|COSMETICS-HANDOFF-DESIGN\.md|THIRD_PARTY_NOTICES(?:\.md)?)$/.test(name)) add(name);
    if (/^launcher\/(?:ui|injector)\//.test(name) && (/\.(?:cpp|c|h|hpp|cmake|manifest)$/i.test(name) || name.endsWith('CMakeLists.txt'))) add(name);
    if (/^launcher\/src\/[^/]+\.(?:cpp|h|manifest)$/.test(name) && !/^launcher\/src\/(?:launcher_ui|flat_style|error_dialog|status_indicator)\.(?:cpp|h)$/.test(name)) add(name);
    if (/^launcher\/src\/ui_shared\/[^/]+\.(?:cpp|h)$/.test(name)) add(name);
    if (/^launcher\/(?:standalone\/CMakeLists\.txt|resources\/[^/]+\.manifest|tests\/(?:validation|account_protocol_test)\.cpp)$/.test(name)) add(name);
    if (/^launcher\/assets\/(?:brand-logo\.png|discord-icon\.png|globe-icon\.png|void-logo\.ico|zerix-(?:logo|partner-banner|java-pvp|practice|duels|ffa)\.png|fonts\/(?:Monocraft\.ttf|(?:LICENSE|NOTICE)[^/]*))$/.test(name)) add(name);
  }
  for (const name of ['build_info', 'config', 'config_storage', 'library_selection', 'menu_layout', 'menu_state', 'module_catalog', 'module_settings', 'module_system', 'version_compat']) add(`launcher/src/core/${name}.cpp`);
  for (const name of ['cmake/Dependencies.cmake', 'cmake/windows_version.rc.in', 'integrations/discord/discord_rpc.cpp', 'integrations/discord/discord_rpc.h', 'integrations/discord/partner_presence.h', 'README.md', 'THIRD_PARTY_NOTICES.md', '.gitignore']) add(name);
  // Include only launcher headers actually reached by the selected sources.
  const includeRoots = ['launcher/include', 'launcher/src', 'launcher/src/core', 'launcher/src/ui_shared', 'launcher/ui', 'launcher/injector/include', 'integrations'];
  const pending = [...chosen];
  const visited = new Set();
  while (pending.length) {
    const name = pending.pop();
    if (visited.has(name) || !/\.(?:cpp|c|h|hpp)$/.test(name)) continue;
    visited.add(name);
    const body = fs.readFileSync(path.join(root, name), 'utf8');
    for (const match of body.matchAll(/^\s*#\s*include\s*"([^"]+)"/gm)) {
      for (const base of [path.dirname(name), ...includeRoots]) {
        const candidate = normal(path.normalize(path.join(base, match[1])));
        if (forbiddenReason(candidate)) continue;
        if (!fs.existsSync(path.join(root, candidate))) continue;
        if (!chosen.has(candidate)) { add(candidate); pending.push(candidate); }
        break;
      }
    }
  }
  return [...chosen].sort();
}

export function readManifest(filename) {
  const files = fs.readFileSync(filename, 'utf8').split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  if (files.length !== new Set(files).size) throw new Error('Duplicate manifest path');
  for (const name of files) if (forbiddenReason(name)) throw new Error(`Forbidden manifest path: ${name}`);
  return files.sort();
}

if (process.argv[1] && path.resolve(process.argv[1]) === script) {
  try {
    const args = process.argv.slice(2);
    const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
    const root = path.resolve(value('--root') || defaultWorkspace);
    const output = value('--output');
    const files = buildReleaseManifest(root);
    if (output) {
      const absolute = path.resolve(root, output);
      if (!absolute.startsWith(root + path.sep)) throw new Error('Manifest output must stay inside release workspace');
      const relative = normal(path.relative(root, absolute));
      if (forbiddenReason(relative)) throw new Error('Manifest output uses a forbidden path');
      files.push(relative);
      fs.mkdirSync(path.dirname(absolute), {recursive: true});
      fs.writeFileSync(absolute, '# Exact proposed release filenames. Review before copying or pushing.\n' + [...new Set(files)].sort().join('\n') + '\n');
    }
    if (args.includes('--json')) console.log(JSON.stringify([...new Set(files)].sort(), null, 2));
    else console.log([...new Set(files)].sort().join('\n'));
  } catch { console.error('FAIL: release manifest could not be prepared safely.'); process.exitCode = 1; }
}
