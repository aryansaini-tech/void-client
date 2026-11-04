import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'node_modules', '@opennextjs', 'aws', 'dist', 'build', 'copyTracedFiles.js');

if (existsSync(target)) {
  let content = readFileSync(target, 'utf8');
  const targetPattern = 'if (symlink) {\n            try {\n                symlinkSync(symlink, to);\n            }\n            catch (e) {\n                if (e.code !== "EEXIST") {\n                    throw e;\n                }\n            }\n        }';
  const replacement = 'if (symlink) {\n            try {\n                symlinkSync(symlink, to);\n            }\n            catch (e) {\n                if (e.code === "EPERM") {\n                    try {\n                        cpSync(from, to, { recursive: true, dereference: true });\n                    } catch (err) {\n                        if (err.code !== "EEXIST") throw err;\n                    }\n                } else if (e.code !== "EEXIST") {\n                    throw e;\n                }\n            }\n        }';
  
  if (content.includes(targetPattern)) {
    content = content.replace(targetPattern, replacement);
    writeFileSync(target, content, 'utf8');
    console.log('Patched @opennextjs/aws copyTracedFiles for Windows unprivileged symlink compatibility.');
  }
}

