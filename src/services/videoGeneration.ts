/**
 * Veo 3.1 image-to-video via LaoZhang Async API (proxied by backend).
 * Create task → poll status → get video URL from /content.
 * See: https://docs.laozhang.ai/en/api-capabilities/veo/veo-31-async-api
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const VIDEO_MODELS = {
  'veo-3.1-fl': 'Portrait (standard)',
  'veo-3.1-fast-fl': 'Portrait (fast, cheaper)',
  'veo-3.1-landscape-fl': 'Landscape (standard)',
  'veo-3.1-landscape-fast-fl': 'Landscape (fast, cheaper)',
} as const;

export type VideoModelId = keyof typeof VIDEO_MODELS;

export const VIDEO_CREDIT_COST: Record<VideoModelId, number> = {
  'veo-3.1-fl': 25,
  'veo-3.1-fast-fl': 20,
  'veo-3.1-landscape-fl': 25,
  'veo-3.1-landscape-fast-fl': 20,
};

export interface GenerateVideoParams {
  prompt: string;
  imageUrl: string;
  model?: VideoModelId;
  userId?: string;
}

export interface GenerateVideoResult {
  videoUrl: string;
}

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

export async function generateVideoFromImage(
  params: GenerateVideoParams,
  onProgress?: (text: string) => void
): Promise<GenerateVideoResult> {
  const { prompt, imageUrl, model = 'veo-3.1-fl', userId } = params;

  if (!API_BASE) throw new Error('VITE_API_BASE_URL is not set');

  // Step 1: create task
  const createRes = await fetch(`${API_BASE}/api/video/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, imageUrl, model, userId }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({ error: createRes.statusText }));
    throw new Error(err?.error || `Video task failed: ${createRes.status}`);
  }

  const { taskId } = (await createRes.json()) as { taskId?: string };
  if (!taskId) throw new Error('No task ID returned');

  onProgress?.('Task created, queued for generation (2–5 min)…\n');

  // Step 2: poll status
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const statusRes = await fetch(`${API_BASE}/api/video/status/${taskId}`);
    if (!statusRes.ok) {
      const err = await statusRes.json().catch(() => ({ error: statusRes.statusText }));
      throw new Error(err?.error || 'Status check failed');
    }

    const data = (await statusRes.json()) as {
      status?: string;
      error?: { message?: string };
    };

    const status = data.status ?? '';

    if (status === 'completed') {
      onProgress?.('Generation complete! Fetching video…\n');

      // Step 3: get video — backend may return JSON { url } or raw MP4 binary.
      // Either way, the proxy URL itself works as a direct video source.
      const resultUrl = `${API_BASE}/api/video/result/${taskId}`;

      const contentRes = await fetch(resultUrl);
      if (!contentRes.ok) throw new Error('Failed to get video content');

      const ct = (contentRes.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('application/json')) {
        const content = (await contentRes.json()) as { url?: string };
        if (content.url) return { videoUrl: content.url };
      }

      // Binary MP4 — use the proxy URL directly as the video src
      return { videoUrl: resultUrl };
    }

    if (status === 'failed') {
      throw new Error(data.error?.message ?? 'Video generation failed');
    }

    onProgress?.(`Status: ${status}…\n`);
  }

  throw new Error('Video generation timed out (10 min)');
}
