/**
 * Compress an image file using the Canvas API.
 * Returns a WebP file ≤ maxSizeBytes, scaling down if needed.
 */
export async function compressImage(
  file: File,
  maxSizeBytes: number = 800 * 1024, // 800 KB default
  maxDimension: number = 2048,
): Promise<File> {
  // Skip non-image files (shouldn't happen, but guard)
  if (!file.type.startsWith('image/')) return file;

  // Already small enough — skip compression
  if (file.size <= maxSizeBytes) return file;

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  // Scale down if either dimension exceeds maxDimension
  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Try decreasing quality until under maxSizeBytes
  let quality = 0.85;
  let blob: Blob;

  do {
    blob = await canvas.convertToBlob({ type: 'image/webp', quality });
    quality -= 0.1;
  } while (blob.size > maxSizeBytes && quality > 0.1);

  // Derive a .webp filename from the original
  const name = file.name.replace(/\.[^.]+$/, '.webp');
  return new File([blob], name, { type: 'image/webp' });
}

/**
 * Compress multiple files, returning compressed versions.
 */
export async function compressImages(
  files: File[],
  maxSizeBytes?: number,
): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f, maxSizeBytes)));
}
