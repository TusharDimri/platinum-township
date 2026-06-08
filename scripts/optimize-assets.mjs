/**
 * Asset Optimization Script
 * Converts panorama PNGs to optimized JPEGs and generates thumbnails
 */

import sharp from 'sharp';
import { readdir, mkdir, copyFile } from 'fs/promises';
import { join, basename, extname } from 'path';
import { existsSync } from 'fs';

const PANORAMA_SRC = join(process.cwd(), '..', 'PANORAMA');
const PANORAMA_DEST = join(process.cwd(), 'public', 'panoramas');
const THUMB_DEST = join(PANORAMA_DEST, 'thumbs');
const MODEL_SRC = join(process.cwd(), '..', 'For Tushar.glb');
const MODEL_DEST = join(process.cwd(), 'public', 'model', 'township.glb');

const JPEG_QUALITY = 85;
const PANORAMA_MAX_WIDTH = 8192; // cap width for performance
const THUMB_WIDTH = 400;

async function ensureDir(dir) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function convertPanoramas() {
  console.log('📷 Converting panoramas to optimized JPEG...\n');

  const files = await readdir(PANORAMA_SRC);
  const pngFiles = files.filter((f) => extname(f).toLowerCase() === '.png');

  for (const file of pngFiles) {
    const srcPath = join(PANORAMA_SRC, file);
    const baseName = basename(file, '.png');
    const destPath = join(PANORAMA_DEST, `${baseName}.jpg`);
    const thumbPath = join(THUMB_DEST, `${baseName}_thumb.jpg`);

    try {
      // Get image info
      const metadata = await sharp(srcPath).metadata();
      const resizeWidth = Math.min(metadata.width, PANORAMA_MAX_WIDTH);

      // Convert to optimized JPEG
      console.log(`  Converting: ${file} (${(metadata.width)}x${metadata.height})`);
      await sharp(srcPath)
        .resize({ width: resizeWidth, withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true })
        .toFile(destPath);

      // Generate thumbnail
      await sharp(srcPath)
        .resize({ width: THUMB_WIDTH })
        .jpeg({ quality: 75, progressive: true })
        .toFile(thumbPath);

      const srcStats = await sharp(srcPath).metadata();
      console.log(`  ✅ ${baseName}.jpg created | Thumb: ${baseName}_thumb.jpg`);
    } catch (err) {
      console.error(`  ❌ Error processing ${file}:`, err.message);
    }
  }
}

async function copyModel() {
  console.log('\n🏗️  Copying GLB model...');
  const modelDir = join(process.cwd(), 'public', 'model');
  await ensureDir(modelDir);

  if (existsSync(MODEL_SRC)) {
    await copyFile(MODEL_SRC, MODEL_DEST);
    console.log('  ✅ Model copied to public/model/township.glb');
  } else {
    console.log('  ⚠️  GLB model not found at:', MODEL_SRC);
    console.log('  Please manually copy "For Tushar.glb" to public/model/township.glb');
  }
}

async function main() {
  console.log('🚀 Platinum Township Asset Optimizer\n');
  console.log('================================\n');

  await ensureDir(PANORAMA_DEST);
  await ensureDir(THUMB_DEST);

  await convertPanoramas();
  await copyModel();

  console.log('\n================================');
  console.log('✨ Asset optimization complete!');
}

main().catch(console.error);
