import type { VercelRequest, VercelResponse } from '@vercel/node';

const LAOZHANG_API_KEY = process.env.LAOZHANG_API_KEY;
const LAOZHANG_API_URL = process.env.LAOZHANG_API_URL || 'https://api.laozhang.ai';
const ENHANCE_MODEL = process.env.ENHANCE_PROMPT_MODEL || 'gpt-5';

const SYSTEM_PROMPT = `You are a prompt enhancer for image generation.

Rules:
- Preserve core user intent exactly.
- Improve clarity and visual specificity.
- Add composition, lighting, camera, style when missing.
- Keep technical tokens untouched.
- Output ONE final optimized prompt only.
- Do NOT explain anything.`;

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!LAOZHANG_API_KEY || LAOZHANG_API_KEY === 'sk-YOUR_API_KEY_HERE') {
    return res.status(500).json({
      error: 'Server configuration error: LAOZHANG_API_KEY not set.',
    });
  }

  try {
    const body = req.body as { prompt?: string };
    const prompt = body?.prompt;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid prompt' });
    }

    const response = await fetch(`${LAOZHANG_API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LAOZHANG_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ENHANCE_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errData.error?.message || `API error: ${response.status} ${response.statusText}`,
      });
    }

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const enhanced = result.choices?.[0]?.message?.content?.trim();

    if (!enhanced) {
      return res.status(500).json({ error: 'No enhanced prompt returned' });
    }

    return res.status(200).json({ enhancedPrompt: enhanced });
  } catch (error) {
    console.error('Enhance prompt API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to enhance prompt',
    });
  }
}
