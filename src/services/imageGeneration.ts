/**
 * Nano Banana Pro Image Generation Service
 * Calls our backend API proxy (keeps API key secure)
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface ImageGenerationParams {
  prompt: string;
  aspectRatio: '1:1' | '3:2' | '4:3' | '16:9' | '9:16' | '2:3' | '3:4' | '21:9' | '5:4' | '4:5';
  imageSize: '1K' | '2K' | '4K';
  referenceImages?: string[];
}

export interface GeneratedImage {
  id: string;
  url: string;
  base64Data: string;
  timestamp: number;
  prompt: string;
  aspectRatio: string;
  imageSize: string;
}

/**
 * Generate one image via our API proxy (key stays on server)
 */
export async function generateImage(params: ImageGenerationParams): Promise<GeneratedImage> {
  const url = `${API_BASE}/api/generate`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
      imageSize: params.imageSize,
      referenceImages: params.referenceImages,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Generation failed: ${response.status}`);
  }

  const { base64Data, prompt, aspectRatio, imageSize } = data;
  if (!base64Data) {
    throw new Error('No image data returned');
  }

  const dataUrl = `data:image/png;base64,${base64Data}`;

  return {
    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    url: dataUrl,
    base64Data,
    timestamp: Date.now(),
    prompt: prompt || params.prompt,
    aspectRatio: aspectRatio || params.aspectRatio,
    imageSize: imageSize || params.imageSize,
  };
}

/**
 * Generate multiple images in batch
 */
export async function generateBatchImages(
  params: ImageGenerationParams,
  count: number
): Promise<GeneratedImage[]> {
  const promises = Array.from({ length: count }, () => generateImage(params));

  try {
    return await Promise.all(promises);
  } catch (error) {
    const results = await Promise.allSettled(promises);
    const successfulImages = results
      .filter((r): r is PromiseFulfilledResult<GeneratedImage> => r.status === 'fulfilled')
      .map((r) => r.value);

    if (successfulImages.length === 0) throw error;
    return successfulImages;
  }
}

/**
 * Convert file to base64 for reference images
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
