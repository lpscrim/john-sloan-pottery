import { readFileSync, writeFileSync } from 'fs';
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const files = ['Logo', 'LogoB'];

for (const name of files) {
  const svgPath = join(publicDir, `${name}.svg`);
  const svg = readFileSync(svgPath, 'utf8');

  const match = svg.match(/base64,([A-Za-z0-9+/=]+)/);
  if (!match) {
    console.log(`${name}.svg: no base64 data found`);
    continue;
  }

  const pngBuffer = Buffer.from(match[1], 'base64');
  const webpPath = join(publicDir, `${name}.webp`);

  await sharp(pngBuffer)
    .webp({ quality: 90, lossless: false })
    .toFile(webpPath);

  const originalKB = Math.round(pngBuffer.length / 1024);
  const { size } = (await import('fs')).statSync(webpPath);
  const newKB = Math.round(size / 1024);
  const saving = Math.round((1 - size / pngBuffer.length) * 100);

  console.log(`${name}: PNG ${originalKB} KB → WebP ${newKB} KB (${saving}% smaller)`);
}
