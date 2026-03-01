/**
 * Nano Banana Pro Image Generation Service
 * Calls our backend API proxy (keeps API key secure)
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const IMAGE_MODELS = {
  'gemini-3-pro-image-preview': 'Nano Banana Pro',
  'gemini-3.1-flash-image-preview': 'Nano Banana 2',
} as const;

export type ImageModelId = keyof typeof IMAGE_MODELS;

export interface ImageGenerationParams {
  prompt: string;
  aspectRatio: '1:1' | '3:2' | '4:3' | '16:9' | '9:16' | '2:3' | '3:4' | '21:9' | '5:4' | '4:5';
  imageSize: '1K' | '2K' | '4K';
  /** Model ID for LaoZhang API (default: gemini-3-pro-image-preview) */
  model?: ImageModelId;
  /** User ID for backend metadata save (survives reload) */
  userId?: string;
  /** Base64 data URLs - use when backend has high body limit (Heroku) or no ref URLs */
  referenceImages?: string[];
  /** Supabase public URLs - backend fetches these; avoids payload limits entirely */
  referenceImageUrls?: string[];
}

export interface GeneratedImage {
  id: string;
  url: string;
  storagePath?: string;
  base64Data: string;
  timestamp: number;
  prompt: string;
  aspectRatio: string;
  imageSize: string;
}

const MAX_RETRIES = 3;
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 min max
const ACTIVE_JOBS_KEY = 'kreator-active-job-ids';

export function addActiveJob(jobId: string): void {
  try {
    const ids = JSON.parse(localStorage.getItem(ACTIVE_JOBS_KEY) || '[]') as string[];
    if (!ids.includes(jobId)) ids.push(jobId);
    localStorage.setItem(ACTIVE_JOBS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function removeActiveJob(jobId: string): void {
  try {
    const ids = (JSON.parse(localStorage.getItem(ACTIVE_JOBS_KEY) || '[]') as string[]).filter((id) => id !== jobId);
    localStorage.setItem(ACTIVE_JOBS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function getActiveJobIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_JOBS_KEY) || '[]') as string[];
  } catch {
    return [];
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseResult(
  data: { id?: string; url?: string; storagePath?: string; base64Data?: string; prompt?: string; aspectRatio?: string; imageSize?: string },
  params: ImageGenerationParams
): GeneratedImage {
  const resolvedPrompt = data.prompt || params.prompt;
  const resolvedAspect = data.aspectRatio || params.aspectRatio;
  const resolvedSize = data.imageSize || params.imageSize;
  if (data.url && data.storagePath) {
    return {
      id: data.id || `img-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      url: data.url,
      storagePath: data.storagePath,
      base64Data: '',
      timestamp: Date.now(),
      prompt: resolvedPrompt,
      aspectRatio: resolvedAspect,
      imageSize: resolvedSize,
    };
  }
  if (data.base64Data) {
    return {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      url: `data:image/png;base64,${data.base64Data}`,
      storagePath: undefined,
      base64Data: data.base64Data,
      timestamp: Date.now(),
      prompt: resolvedPrompt,
      aspectRatio: resolvedAspect,
      imageSize: resolvedSize,
    };
  }
  throw new Error('No image data returned');
}

/**
 * Generate one image via our API proxy (key stays on server)
 * Uses async job flow: POST returns 202 + jobId, then polls for result (avoids Heroku 30s timeout)
 * Retries POST on 429/503 with exponential backoff
 */
export async function generateImage(params: ImageGenerationParams): Promise<GeneratedImage> {
  const postUrl = `${API_BASE}/api/generate`;
  let lastError: Error | null = null;

  const body: Record<string, unknown> = {
    prompt: params.prompt,
    aspectRatio: params.aspectRatio,
    imageSize: params.imageSize,
  };
  if (params.model) body.model = params.model;
  if (params.userId) body.userId = params.userId;
  if (params.referenceImageUrls?.length) {
    body.referenceImageUrls = params.referenceImageUrls;
  } else if (params.referenceImages?.length) {
    body.referenceImages = params.referenceImages;
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    // Async flow: 202 + jobId → poll for result
    if (response.status === 202 && data.jobId) {
      const jobId = data.jobId as string;
      addActiveJob(jobId);
      const statusUrl = `${API_BASE}/api/generate/status/${jobId}`;
      const start = Date.now();
      try {
        for (;;) {
          await sleep(POLL_INTERVAL_MS);
          if (Date.now() - start > POLL_TIMEOUT_MS) {
            throw new Error('Generation timed out');
          }
          const statusRes = await fetch(statusUrl);
          const statusData = await statusRes.json().catch(() => ({}));
          if (statusRes.status === 500 && statusData.error) {
            throw new Error(statusData.error);
          }
          if (statusRes.ok && (statusData.url || statusData.base64Data)) {
            return parseResult(statusData, params);
          }
        }
      } finally {
        removeActiveJob(jobId);
      }
    }

    // Sync fallback: 200 with image data (legacy)
    if (response.ok && (data.url || data.base64Data)) {
      return parseResult(data, params);
    }

    lastError = new Error(data.error || `Generation failed: ${response.status}`);
    const retryable = response.status === 429 || response.status === 503;
    if (!retryable || attempt === MAX_RETRIES - 1) throw lastError;

    const backoffMs = 1000 * Math.pow(2, attempt);
    await sleep(backoffMs);
  }

  throw lastError ?? new Error('Generation failed');
}

/**
 * Poll a job until complete (for recovery after reload).
 * Returns true if job completed (success or error), false if still pending after timeout.
 * Call onRefetch when a job completes so the caller can refresh the gallery.
 */
export async function pollJobUntilComplete(
  jobId: string,
  onComplete: () => void,
  timeoutMs = 5 * 60 * 1000
): Promise<boolean> {
  const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const statusUrl = `${API_BASE}/api/generate/status/${jobId}`;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(POLL_INTERVAL_MS);
    try {
      const res = await fetch(statusUrl);
      const data = await res.json().catch(() => ({}));
      if (res.status === 500 && data.error) {
        removeActiveJob(jobId);
        onComplete();
        return true;
      }
      if (res.ok && (data.url || data.base64Data)) {
        removeActiveJob(jobId);
        onComplete();
        return true;
      }
    } catch {
      // keep polling
    }
  }
  return false;
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
