// Run from project root: node scripts/generate-icons.mjs
// Requires: npm install -D sharp
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const SOURCE = 'packages/web/public/icons/icon-source.svg';
const MASKABLE = 'packages/web/public/icons/icon-maskable-source.svg';
const OUT = 'packages/web/public/icons';

async function generate(srcPath, outName, size) {
  const buf = readFileSync(srcPath);
  await sharp(buf).resize(size, size).png().toFile(`${OUT}/${outName}`);
  console.log(`✓ ${outName} (${size}x${size})`);
}

await generate(SOURCE, 'icon-192.png', 192);
await generate(SOURCE, 'icon-512.png', 512);
await generate(MASKABLE, 'icon-512-maskable.png', 512);
console.log('Icons generated. Commit and rebuild.');
