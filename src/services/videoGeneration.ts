/**
 * Video generation via backend (LaoZhang Veo 3.1 Async API)
 * @see https://docs.laozhang.ai/en/api-capabilities/veo/veo-31-async-api
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const VIDEO_MODELS = {
  'veo-3.1': 'Veo 3.1 (Portrait)',
  'veo-3.1-fast': 'Veo 3.1 Fast (Portrait)',
  'veo-3.1-landscape': 'Veo 3.1 (Landscape)',
  'veo-3.1-landscape-fast': 'Veo 3.1 Fast (Landscape)',
  'veo-3.1-fl': 'Veo 3.1 Image→Video (Portrait)',
  'veo-3.1-fast-fl': 'Veo 3.1 Fast Image→Video (Portrait)',
  'veo-3.1-landscape-fl': 'Veo 3.1 Image→Video (Landscape)',
  'veo-3.1-landscape-fast-fl': 'Veo 3.1 Fast Image→Video (Landscape)',
} as const;

export type VideoModelId = keyof typeof VIDEO_MODELS;

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 600_000; // 10 min

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface CreateVideoParams {
  prompt: string;
  model: VideoModelId;
  referenceImageUrl?: string | null;
}

export interface VideoResult {
  videoId: string;
  url: string;
  duration?: number;
  resolution?: string;
  prompt: string;
  model?: string;
}

/** Create video task; returns videoId */
export async function createVideoTask(params: CreateVideoParams): Promise<{ videoId: string; status: string; model: string }> {
  const response = await fetch(`${API_BASE}/api/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: params.prompt.trim(),
      model: params.model,
      referenceImageUrl: params.referenceImageUrl || undefined,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Create video failed: ${response.status}`);
  }
  if (!data.videoId) {
    throw new Error('No video id returned');
  }
  return { videoId: data.videoId, status: data.status || 'queued', model: data.model || params.model };
}

/** Get video task status */
export async function getVideoStatus(videoId: string): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE}/api/videos/${videoId}/status`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Status check failed: ${response.status}`);
  }
  return { status: data.status || 'unknown' };
}

/** Get video content (URL) - call when status is completed */
export async function getVideoContent(videoId: string): Promise<VideoResult> {
  const response = await fetch(`${API_BASE}/api/videos/${videoId}/content`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Get content failed: ${response.status}`);
  }
  if (!data.url) {
    throw new Error('No video URL in response');
  }
  return {
    videoId: data.videoId || videoId,
    url: data.url,
    duration: data.duration,
    resolution: data.resolution,
    prompt: data.prompt || '',
    model: data.model,
  };
}

/** Create task and poll until completed, then return video content */
export async function generateVideo(params: CreateVideoParams): Promise<VideoResult> {
  const { videoId } = await createVideoTask(params);
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const { status } = await getVideoStatus(videoId);
    if (status === 'completed') {
      return getVideoContent(videoId);
    }
    if (status === 'failed') {
      throw new Error('Video generation failed');
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error('Video generation timed out');
}
