import {stat} from 'node:fs/promises';

// Brand assets are committed; Vite copies them from public/ into dist/.
for (const name of ['brand-logo.png', 'mark.svg']) {
  const asset = new URL('../public/void/' + name, import.meta.url);
  if (!(await stat(asset)).isFile()) throw new Error('Missing website brand asset: ' + name);
}
console.log('Website brand assets are ready.');
