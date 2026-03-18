/**
 * Sora 2 image-to-video via LaoZhang API (proxied by backend).
 * See: https://docs.laozhang.ai/en/api-capabilities/sora2/overview
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

const VIDEO_URL_REGEX = /https:\/\/[^\s)\]"]+\.mp4/;

/**
 * Generate video from image using Sora 2; streams progress and returns final video URL.
 * Video links are valid 1 day — download promptly.
 */
export async function generateVideoFromImage(
  params: GenerateVideoParams,
  onProgress?: (text: string) => void
): Promise<GenerateVideoResult> {
  const { prompt, imageUrl, model = 'sora_video2' } = params;

  if (!API_BASE) {
    throw new Error('VITE_API_BASE_URL is not set');
  }

  const response = await fetch(`${API_BASE}/api/video/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, imageUrl, model }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err?.error || `Video generation failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const data = JSON.parse(payload);
          const content = data?.choices?.[0]?.delta?.content;
          if (typeof content === 'string') {
            fullContent += content;
            onProgress?.(content);
          }
        } catch {
          // ignore non-JSON lines
        }
      }
    }
  }

  const match = fullContent.match(VIDEO_URL_REGEX);
  const videoUrl = match ? match[0] : '';
  if (!videoUrl) {
    throw new Error('No video URL in response. Generation may have failed.');
  }

  return { videoUrl };
}
