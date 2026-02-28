/**
 * Compress reference images to stay under Vercel's 4.5MB request body limit.
 * Aggressive compression: 768px max, ~280KB per image → safe for up to 6 refs.
 */
const MAX_DIMENSION = 768;
const JPEG_QUALITY = 0.55;
const MAX_SIZE_CHARS = 280000; // ~280KB base64 per image; 6 refs ≈ 1.7MB, well under 4.5MB

export async function compressImageForReference(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = (height / width) * MAX_DIMENSION;
          width = MAX_DIMENSION;
        } else {
          width = (width / height) * MAX_DIMENSION;
          height = MAX_DIMENSION;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      let quality = JPEG_QUALITY;
      const tryEncode = (): string => {
        return canvas.toDataURL('image/jpeg', quality);
      };

      let dataUrl = tryEncode();
      while (dataUrl.length > MAX_SIZE_CHARS && quality > 0.15) {
        quality -= 0.08;
        dataUrl = tryEncode();
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/** Fetch image from URL and compress for reference use. */
export async function compressImageFromUrl(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const file = new File([blob], 'reference.png', { type: blob.type || 'image/png' });
  return compressImageForReference(file);
}
