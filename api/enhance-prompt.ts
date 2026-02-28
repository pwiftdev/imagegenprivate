import type { VercelRequest, VercelResponse } from '@vercel/node';

const LAOZHANG_API_KEY = process.env.LAOZHANG_API_KEY;
const LAOZHANG_API_URL = process.env.LAOZHANG_API_URL || 'https://api.laozhang.ai';
const ENHANCE_MODEL = process.env.ENHANCE_PROMPT_MODEL || 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are an expert prompt enhancer for AI image generation.

Your job is to rewrite user prompts into a single, flowing, comma-separated image generation prompt that image models understand.

CORE RULES:

1. Preserve the user's intent exactly.
- Do NOT change the subject, style, or concept.
- Only improve clarity, specificity, and visual control.

2. Write prompts for image models, not humans.
- Use concise visual language.
- Avoid storytelling, emotional fluff, or poetic wording.
- Every word must influence the image visually.

3. Output format is critical:
- Output ONE continuous paragraph. Use commas to separate visual descriptors.
- NEVER use arrows (→), hyphens as bullets (-), or line breaks.
- The prompt must read as natural, flowing prose: "subject description, composition, lighting, style, quality"
- BAD: "LV bag → leather surface → centered composition → close-up shot"
- GOOD: "LV bag with visible leather texture, centered composition, close-up shot, soft directional studio lighting, professional product photography, photorealistic quality"

4. Mentally organize by: subject, composition/camera, lighting, style, quality—but output as one comma-separated sentence.

5. Add missing professional visual details when not provided:
- camera/lens (macro, 35mm, 50mm, 85mm, wide-angle, close-up)
- composition (close-up, medium shot, low angle, overhead, centered framing)
- lighting (soft directional light, studio lighting, cinematic lighting, rim light)
- depth cues (shallow depth of field, foreground separation)
- style (photorealistic, commercial photography, cinematic, illustration)

6. If reference images are mentioned, preserve them: "exact watch design from reference image clearly visible"

7. Output rules:
- ONE enhanced prompt only. No explanations, bullets, quotes, or markdown.

QUALITY STANDARD:
Output must be a single flowing sentence with comma-separated descriptors, like professional Midjourney or DALL·E prompts.

EXAMPLE:

User: "A close-up, hyper-realistic photograph of a female hand with a watch, soft lighting."

Good: "close-up macro photograph of a female hand, elegant hand-model pose, realistic skin texture, professionally manicured nails, exact watch design from reference image clearly visible, 85mm macro lens, shallow depth of field, soft directional studio lighting, photorealistic, commercial product photography style"`;

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
      const errText = await response.text();
      let errMsg = `API error: ${response.status}`;
      try {
        const errData = JSON.parse(errText);
        errMsg = errData.error?.message || errData.error || errMsg;
      } catch {
        if (errText) errMsg = errText.slice(0, 200);
      }
      console.error('LaoZhang enhance error:', response.status, errMsg);
      return res.status(500).json({ error: errMsg });
    }

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    let enhanced = result.choices?.[0]?.message?.content?.trim();

    if (!enhanced) {
      return res.status(500).json({ error: 'No enhanced prompt returned' });
    }

    // Strip surrounding quotes (single or double) - model sometimes returns "prompt"
    if ((enhanced.startsWith('"') && enhanced.endsWith('"')) || (enhanced.startsWith("'") && enhanced.endsWith("'"))) {
      enhanced = enhanced.slice(1, -1);
    }

    return res.status(200).json({ enhancedPrompt: enhanced });
  } catch (error) {
    console.error('Enhance prompt API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to enhance prompt',
    });
  }
}
