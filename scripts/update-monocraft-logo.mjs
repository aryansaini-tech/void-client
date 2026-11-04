import fs from 'node:fs';
import sharp from 'sharp';

const fontBase64 = fs.readFileSync('Monocraft-otf/Monocraft.otf').toString('base64');
const markBase64 = fs.readFileSync('assets/logo.png').toString('base64');

// High-resolution SVG for void-logo with Monocraft font
const svg = `
<svg width="1024" height="341" viewBox="0 0 1024 341" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'Monocraft';
        src: url('data:font/otf;base64,${fontBase64}') format('opentype');
        font-weight: normal;
        font-style: normal;
      }
      .void-text {
        font-family: 'Monocraft', monospace;
        font-size: 118px;
        font-weight: bold;
        fill: #22201C;
        letter-spacing: 4px;
      }
      .client-text {
        font-family: 'Monocraft', monospace;
        font-size: 42px;
        font-weight: normal;
        fill: #B9954D;
        letter-spacing: 8px;
      }
    </style>
    <linearGradient id="gold-text" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#C59F52" />
      <stop offset="100%" stop-color="#9A7736" />
    </linearGradient>
  </defs>

  <!-- Official Void V emblem on the left -->
  <image href="data:image/png;base64,${markBase64}" x="48" y="32" width="276" height="276" preserveAspectRatio="xMidYMid meet" />

  <!-- VOID in Monocraft font -->
  <text x="368" y="196" class="void-text">VOID</text>

  <!-- CLIENT in Monocraft font -->
  <text x="372" y="272" class="client-text">CLIENT</text>
</svg>
`;

// Backup original assets/void-logo.png if not backed up
if (!fs.existsSync('assets/void-logo.original.png')) {
  fs.copyFileSync('assets/void-logo.png', 'assets/void-logo.original.png');
}

// Generate new assets/void-logo.png
await sharp(Buffer.from(svg))
  .png()
  .toFile('assets/void-logo.png');

console.log('Generated new assets/void-logo.png with Monocraft font!');

