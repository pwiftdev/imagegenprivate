import type { VercelRequest, VercelResponse } from '@vercel/node';

const LAOZHANG_API_KEY = process.env.LAOZHANG_API_KEY;
const LAOZHANG_API_URL = process.env.LAOZHANG_API_URL || 'https://api.laozhang.ai';

export const config = {
  maxDuration: 60, // Allow up to 60s for image generation
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!LAOZHANG_API_KEY || LAOZHANG_API_KEY === 'sk-YOUR_API_KEY_HERE') {
    return res.status(500).json({
      error: 'Server configuration error: LAOZHANG_API_KEY not set. Add it in Vercel project settings.',
    });
  }

  try {
    const body = req.body as {
      prompt: string;
      aspectRatio: string;
      imageSize: string;
      referenceImages?: string[];
    };

    const { prompt, aspectRatio, imageSize, referenceImages } = body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid prompt' });
    }

    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
      { text: prompt },
    ];

    if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      referenceImages.forEach((imageData: string) => {
        const base64Data = imageData.includes('base64,')
          ? imageData.split('base64,')[1]
          : imageData;
        parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: base64Data,
          },
        });
      });
    }

    const payload = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: aspectRatio || '3:2',
          imageSize: imageSize || '1K',
        },
      },
    };

    const response = await fetch(
      `${LAOZHANG_API_URL}/v1beta/models/gemini-3-pro-image-preview:generateContent`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LAOZHANG_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: errorData.error?.message || `LaoZhang API error: ${response.status} ${response.statusText}`,
      });
    }

    const result = await response.json();
    const base64Data = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Data) {
      return res.status(500).json({ error: 'No image data returned from LaoZhang API' });
    }

    return res.status(200).json({
      base64Data,
      prompt,
      aspectRatio: aspectRatio || '3:2',
      imageSize: imageSize || '1K',
    });
  } catch (error) {
    console.error('Generate API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate image',
    });
  }
}
