/**
 * Nano Banana Pro Image Generation Service
 * Calls our backend API proxy (keeps API key secure)
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export interface ImageGenerationParams {
  prompt: string;
  aspectRatio: '1:1' | '3:2' | '4:3' | '16:9' | '9:16' | '2:3' | '3:4' | '21:9' | '5:4' | '4:5';
  imageSize: '1K' | '2K' | '4K';
  /** Base64 data URLs - use when backend has high body limit (Heroku) or no ref URLs */
  referenceImages?: string[];
  /** Supabase public URLs - backend fetches these; avoids payload limits entirely */
  referenceImageUrls?: string[];
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

const MAX_RETRIES = 3;

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Generate one image via our API proxy (key stays on server)
 * Retries on 429/503 with exponential backoff
 */
export async function generateImage(params: ImageGenerationParams): Promise<GeneratedImage> {
  const url = `${API_BASE}/api/generate`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const body: Record<string, unknown> = {
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
      imageSize: params.imageSize,
    };
    if (params.referenceImageUrls?.length) {
      body.referenceImageUrls = params.referenceImageUrls;
    } else if (params.referenceImages?.length) {
      body.referenceImages = params.referenceImages;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
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

    lastError = new Error(data.error || `Generation failed: ${response.status}`);
    const retryable = response.status === 429 || response.status === 503;
    if (!retryable || attempt === MAX_RETRIES - 1) throw lastError;

    const backoffMs = 1000 * Math.pow(2, attempt);
    await sleep(backoffMs);
  }

  throw lastError ?? new Error('Generation failed');
}

const DELAY_MS = 2000; // Pause between requests to avoid 429 rate limits

/**
 * Generate multiple images in batch (sequentially to avoid API rate limits)
 */
export async function generateBatchImages(
  params: ImageGenerationParams,
  count: number
): Promise<GeneratedImage[]> {
  const results: GeneratedImage[] = [];

  for (let i = 0; i < count; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
    try {
      const img = await generateImage(params);
      results.push(img);
    } catch (error) {
      if (results.length === 0) throw error;
      return results; // Return partial results
    }
  }

  return results;
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
