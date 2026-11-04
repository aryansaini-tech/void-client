import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;
      for (const extension of ['.ts', '.tsx', '.js', '/index.ts']) {
        try { return nextResolve(specifier + extension, context); } catch { /* Continue resolution. */ }
      }
      throw error;
    }
  },
  load(url, context, nextLoad) {
    if (/\.tsx?$/.test(url)) {
      const source = readFileSync(fileURLToPath(url), 'utf8');
      return { format: 'module', shortCircuit: true, source: ts.transpileModule(source, { fileName: fileURLToPath(url), compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText };
    }
    return nextLoad(url, context);
  },
});
