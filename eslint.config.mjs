import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
export default [
  ...nextVitals,
  ...nextTypescript,
  { ignores: ['**/.next/**', '**/out/**', '**/dist/**', '**/node_modules/**', '**/next-env.d.ts', '.cache/**', 'test-results/**', 'playwright-report/**', '**/.open-next/**', '**/.wrangler/**', 'apps/website/public/void/three-runtime.js', 'apps/website/public/void/minecraft-world-runtime.js'] },
  { rules: { '@next/next/no-html-link-for-pages': 'off' }, settings: { next: { rootDir: ['apps/website/', 'apps/account/', 'apps/store/'] } } },
];
