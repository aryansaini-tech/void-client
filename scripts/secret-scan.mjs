import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildReleaseManifest, defaultWorkspace, forbiddenReason, readManifest} from './release-manifest.mjs';

const patterns = [
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g],
  ['provider-key', /\b(?:sk_live_|sk_test_|rk_live_|rk_test_|whsec_)[A-Za-z0-9]{16,}\b/g],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['cloud-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['database-credentials', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s:/"'<>]+:[^\s@"'<>]+@/g],
  ['jwt', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ['discord-token', /\b(?:mfa\.[A-Za-z0-9_-]{30,}|[A-Za-z0-9_-]{24,26}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{25,})\b/g],
  ['literal-bearer', /\bBearer\s+[A-Za-z0-9._-]{24,}/g],
  ['literal-secret', /\b(?:[A-Za-z_][A-Za-z0-9_]*(?:secret(?:_?key)?|token|password|api_?key)|token|password|secret|api_?key)["']?\s*[:=]\s*["'][A-Za-z0-9+\/_=-]{24,}["']/gi],
];

export function scanBytes(bytes, filename) {
  const findings = new Set();
  const body = bytes.toString('utf8');
  for (const [kind, pattern] of patterns) {
    pattern.lastIndex = 0;
    for (const match of body.matchAll(pattern)) {
      // Only explicit inert labels in test files are exempt; provider-key formats are never exempt.
      const value = kind === 'literal-secret' ? match[0].match(/["']([^"']+)["']$/)?.[1] : null;
      if (kind === 'literal-secret' && /(?:\.test\.mjs$|\/tests\/)/.test(filename) && /^fixture-[a-z0-9-]+-not-a-live-secret$/.test(value || '')) continue;
      findings.add(kind);
      break;
    }
  }
  if (/\.(?:sql|prisma)$/i.test(filename) && /(?:^|\n)\s*(?:COPY\s+[^;]+\s+FROM\s+stdin|INSERT\s+INTO\s+"?(?:User|Session|Account|Payment|Order|LauncherToken)"?\b)/i.test(body)) findings.add('possible-database-dump');
  return [...findings];
}

function runGit(repo, ...args) {
  return execFileSync('git', ['-c', `safe.directory=${repo.replaceAll('\\', '/')}`, '-C', repo, ...args], {encoding: null, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});
}

export function scanWorkingTree(root, files) {
  const findings = [];
  const absoluteRoot = fs.realpathSync(root);
  for (const filename of files) {
    const reason = forbiddenReason(filename);
    if (reason) { findings.push({path: filename, kind: reason}); continue; }
    const absolute = path.resolve(absoluteRoot, filename);
    if (!absolute.startsWith(absoluteRoot + path.sep) || !fs.existsSync(absolute)) { findings.push({path: filename, kind: 'missing-or-outside-file'}); continue; }
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink() || fs.realpathSync(absolute) !== absolute) { findings.push({path: filename, kind: 'non-regular-file'}); continue; }
    for (const kind of scanBytes(fs.readFileSync(absolute), filename)) findings.push({path: filename, kind});
  }
  return findings;
}

export function scanCommits(repo, files, base, head = 'HEAD') {
  // Resolve only commit objects. Untrusted option-like revision arguments cannot become git flags.
  for (const revision of [base, head]) if (!/^[A-Za-z0-9_./-]+$/.test(revision) || revision.startsWith('-')) throw new Error('Invalid commit revision');
  const baseId = runGit(repo, 'rev-parse', '--verify', `${base}^{commit}`).toString().trim();
  const headId = runGit(repo, 'rev-parse', '--verify', `${head}^{commit}`).toString().trim();
  runGit(repo, 'merge-base', '--is-ancestor', baseId, headId);
  const commits = runGit(repo, 'rev-list', '--reverse', `${baseId}..${headId}`).toString().trim().split(/\r?\n/).filter(Boolean);
  const allowed = new Set(files);
  const findings = [];
  const inspected = new Set();
  for (const commit of commits) {
    const entries = runGit(repo, 'ls-tree', '-rz', '--full-tree', commit).toString().split('\0').filter(Boolean);
    const committedPaths = new Set();
    for (const entry of entries) {
      const match = entry.match(/^([0-9]+) (\w+) ([0-9a-f]+)\t(.+)$/s);
      if (!match) throw new Error('Cannot parse committed tree');
      const [, mode, type, object, filename] = match;
      committedPaths.add(filename);
      const reason = forbiddenReason(filename);
      if (!allowed.has(filename) || reason || type !== 'blob' || mode === '120000') {
        findings.push({path: filename, kind: reason || 'outside-exact-allowlist', commit});
        continue;
      }
      const key = object + ':' + filename;
      if (inspected.has(key)) continue;
      inspected.add(key);
      const body = runGit(repo, 'cat-file', 'blob', object);
      for (const kind of scanBytes(body, filename)) findings.push({path: filename, kind, commit});
    }
    if (commit === headId) for (const filename of allowed) if (!committedPaths.has(filename)) findings.push({path: filename, kind: 'missing-from-release-commit', commit});
  }
  return {base: baseId, head: headId, commits, inspectedBlobs: inspected.size, findings};
}

const script = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === script) {
  try {
    const args = process.argv.slice(2);
    const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
    const root = path.resolve(value('--root') || defaultWorkspace);
    const manifest = value('--manifest');
    const files = manifest ? readManifest(path.resolve(root, manifest)) : buildReleaseManifest(root);
    const workingFindings = scanWorkingTree(root, files);
    const base = value('--base');
    const commits = base ? scanCommits(path.resolve(value('--repo') || root), files, base, value('--head') || 'HEAD') : null;
    const findings = [...workingFindings, ...(commits?.findings || [])];
    if (args.includes('--require-commits') && !commits?.commits.length) findings.push({path: '(commit-range)', kind: 'new-commit-scan-required'});
    console.log(JSON.stringify({status: findings.length ? 'FAIL' : 'PASS', scope: 'exact release working-tree allowlist and every newly committed tree', workingFiles: files.length, commitScan: commits ? {base: commits.base, head: commits.head, commits: commits.commits, inspectedBlobs: commits.inspectedBlobs} : 'NOT RUN: supply --base before any push', findings}, null, 2));
    if (findings.length) process.exitCode = 1;
  } catch { console.error('FAIL: secret scan could not finish safely. No credential values were emitted.'); process.exitCode = 1; }
}
