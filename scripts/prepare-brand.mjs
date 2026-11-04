import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const asset = name => path.join(root, 'assets', name);
const mark = await readFile(asset('logo.png'));
const wordmark = await readFile(asset('void-logo.png'));
const sources = [['logo.png', mark], ['void-logo.png', wordmark]];
const favicon = await sharp(mark).resize(64, 64, { fit: 'contain' }).png().toBuffer();
const appleIcon = await sharp(mark).resize(180, 180, { fit: 'contain' }).png().toBuffer();
const ogWordmark = await sharp(wordmark).resize({ width: 420 }).png().toBuffer();

for (const app of ['website', 'account', 'store']) {
  const directory = path.join(root, 'apps', app, 'public', 'brand');
  await mkdir(directory, { recursive: true });
  for (const [name, bytes] of sources) await writeFile(path.join(directory, name), bytes);
  await writeFile(path.join(directory, 'favicon-64.png'), favicon);
  await writeFile(path.join(root, 'apps', app, 'src', 'app', 'apple-icon.png'), appleIcon);
  // Preserve the existing /icon.svg route; its image is now derived from the official V.
  await writeFile(path.join(root, 'apps', app, 'src', 'app', 'icon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><image width="64" height="64" href="data:image/png;base64,${favicon.toString('base64')}"/></svg>\n`);
}

const partnerDirectory = path.join(root, 'apps', 'website', 'public', 'media', 'partners');
await mkdir(partnerDirectory, { recursive: true });
await sharp(asset('partners/zerix.png')).resize({ width: 360, withoutEnlargement: true }).webp({ quality: 92 }).toFile(path.join(partnerDirectory, 'zerix.webp'));
await writeFile(path.join(root, 'packages', 'ui', 'src', 'brand-image-data.ts'),
  `// Generated from assets/void-logo.png by npm run brand:prepare. Server-side OG images only.\nexport const officialWordmarkData = 'data:image/png;base64,${ogWordmark.toString('base64')}';\n`);
await copyFile(asset('logo.png'), path.join(root, 'apps', 'website', 'public', 'media', 'official-logo.png'));

// Keep the original concept compositions and URLs, replacing only their old
// provisional marks with source-derived official artwork. These remain concepts.
const conceptWordmark = `data:image/png;base64,${ogWordmark.toString('base64')}`;
const conceptMark = `data:image/png;base64,${mark.toString('base64')}`;
const conceptIcon = `data:image/png;base64,${favicon.toString('base64')}`;
const imageTag = (variant, x, y, width, height, href) => `<image data-void-brand="${variant}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" href="${href}"/>`;
for (const name of ['interface-concept', 'hud-concept', 'settings-concept', 'visual-concept']) {
  const filename = path.join(root, 'apps', 'website', 'public', 'media', `${name}.svg`);
  let svg = await readFile(filename, 'utf8');
  // Refresh previously generated image bytes when the supplied asset changes.
  svg = svg.replace(/<image data-void-brand="(wordmark|mark|icon)"[^>]*\/>/g, (tag, variant) => tag.replace(/href="[^"]*"/, `href="${variant === 'wordmark' ? conceptWordmark : variant === 'icon' ? conceptIcon : conceptMark}"`));
  if (name === 'interface-concept') svg = svg.replace(/<path d="M251 180[^>]*\/><text[^>]*>VOID<\/text>/, imageTag('wordmark', 250, 175, 145, 48.3, conceptWordmark));
  if (name === 'hud-concept') svg = svg.replace(/<path d="M60 51[^>]*\/>/, imageTag('icon', 57, 48, 38, 38, conceptIcon));
  if (name === 'settings-concept') svg = svg.replace(/<text[^>]*>VOID<\/text>/, imageTag('wordmark', 285, 181, 124, 41.3, conceptWordmark));
  if (name === 'visual-concept') svg = svg.replace(/<path d="m461 146 44[\s\S]*?(?=<text x="640" y="613")/, imageTag('mark', 423, 101, 435, 435, conceptMark)).replace('VOID VISUAL IDENTITY / ORIGINAL ARTWORK', 'OFFICIAL VOID LOGO / CONCEPT ENVIRONMENT');
  for (const [before, after] of [['#080808', '#080706'], ['#101010', '#100e0b'], ['#d4af37', '#e8bd62'], ['#f5d76e', '#ffe4a4']]) svg = svg.replaceAll(before, after);
  await writeFile(filename, svg);
}
console.log('Official assets copied unchanged to all three apps; source-derived icons and partner preview prepared.');
for (const [name, bytes] of sources) {
  const metadata = await sharp(bytes).metadata();
  const stats = await sharp(bytes).stats();
  console.log(JSON.stringify({ name, width: metadata.width, height: metadata.height, alpha: metadata.hasAlpha, alphaMinimum: stats.channels[3]?.min, sha256: createHash('sha256').update(bytes).digest('hex') }));
}
