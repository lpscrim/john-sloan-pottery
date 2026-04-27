import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const photosDir = path.join(__dirname, '../public/photos');
const outputDir = path.join(__dirname, '../public/photos-compressed');

// Max file size in bytes (9MB to stay under 10MB limit)
const MAX_SIZE = 9 * 1024 * 1024;

async function compressImage(inputPath, outputPath) {
  const stats = fs.statSync(inputPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  // If already under limit, just copy
  if (stats.size <= MAX_SIZE) {
    fs.copyFileSync(inputPath, outputPath);
    console.log(`✓ ${path.basename(inputPath)} (${sizeMB}MB) - copied as-is`);
    return;
  }

  // Compress larger files
  let quality = 85;
  let buffer;
  
  do {
    buffer = await sharp(inputPath)
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    
    if (buffer.length > MAX_SIZE) {
      quality -= 5;
    }
  } while (buffer.length > MAX_SIZE && quality > 20);

  // Change extension to .jpg for compressed files
  const jpgOutputPath = outputPath.replace(/\.(png|webp|gif)$/i, '.jpg');
  fs.writeFileSync(jpgOutputPath, buffer);
  
  const newSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
  console.log(`✓ ${path.basename(inputPath)} (${sizeMB}MB → ${newSizeMB}MB, q=${quality})`);
}

async function processDirectory(inputDir, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const entries = fs.readdirSync(inputDir, { withFileTypes: true });

  for (const entry of entries) {
    const inputPath = path.join(inputDir, entry.name);
    const outputPath = path.join(outputDir, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(inputPath, outputPath);
    } else if (/\.(jpg|jpeg|png|webp|gif)$/i.test(entry.name)) {
      await compressImage(inputPath, outputPath);
    } else if (/^description\.(txt|cd)$/i.test(entry.name)) {
      fs.copyFileSync(inputPath, outputPath);
      console.log(`✓ ${entry.name} - copied`);
    }
  }
}

console.log('Compressing images...\n');
await processDirectory(photosDir, outputDir);
console.log('\n✅ Done! Compressed images are in public/photos-compressed/');
console.log('Upload this folder to Supabase Storage, then delete it locally.');
