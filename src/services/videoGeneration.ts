/**
 * Sora 2 image-to-video via LaoZhang Async API (proxied by backend).
 * Create task (returns immediately), poll status, then get video from result endpoint.
 * See: https://docs.laozhang.ai/en/api-capabilities/sora2/async-api
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const SORA_VIDEO_MODELS = {
  sora_video2: 'Vertical (704×1280, 10s)',
  'sora_video2-landscape': 'Landscape (1280×704, 10s)',
  'sora_video2-15s': 'Vertical 15s',
  'sora_video2-landscape-15s': 'Landscape 15s',
} as const;

export type SoraVideoModelId = keyof typeof SORA_VIDEO_MODELS;

export interface GenerateVideoParams {
  prompt: string;
  imageUrl: string;
  model?: SoraVideoModelId;
}

export interface GenerateVideoResult {
  videoUrl: string;
}

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000; // 10 min

/**
 * Generate video from image using Sora 2 Async API.
 * Creates task (no Heroku timeout), polls until completed, returns URL to our proxy for the video.
 */
export async function generateVideoFromImage(
  params: GenerateVideoParams,
  onProgress?: (text: string) => void
): Promise<GenerateVideoResult> {
  const { prompt, imageUrl, model = 'sora_video2' } = params;

  if (!API_BASE) {
    throw new Error('VITE_API_BASE_URL is not set');
  }

  const createRes = await fetch(`${API_BASE}/api/video/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, imageUrl, model }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({ error: createRes.statusText }));
    throw new Error(err?.error || `Video task failed: ${createRes.status}`);
  }

  const { taskId } = (await createRes.json()) as { taskId?: string };
  if (!taskId) {
    throw new Error('No task ID returned');
  }

  onProgress?.('Task created. Waiting for video (2–5 min)…\n');

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const statusRes = await fetch(`${API_BASE}/api/video/status/${taskId}`, {
      headers: { Accept: 'application/json' },
    });

    if (!statusRes.ok) {
      const err = await statusRes.json().catch(() => ({ error: statusRes.statusText }));
      throw new Error(err?.error || 'Status check failed');
    }

    const statusData = (await statusRes.json()) as {
      status?: string;
      progress?: number;
      error?: { message?: string };
    };

    const status = statusData.status ?? '';
    const progress = statusData.progress ?? 0;

    if (status === 'completed') {
      onProgress?.(`Done (100%).\n`);
      const videoUrl = `${API_BASE}/api/video/result/${taskId}`;
      return { videoUrl };
    }

    if (status === 'failed') {
      const msg = statusData.error?.message ?? 'Generation failed';
      throw new Error(msg);
    }

    onProgress?.(`Status: ${status}, progress: ${progress}%…\n`);
  }

  throw new Error('Video generation timed out');
}
