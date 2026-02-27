/**
 * Nano Banana Pro Image Generation Service
 * Based on: https://docs.laozhang.ai/en/api-capabilities/nano-banana-pro-image
 */

const API_KEY = import.meta.env.VITE_LAOZHANG_API_KEY;
const API_URL = import.meta.env.VITE_LAOZHANG_API_URL || 'https://api.laozhang.ai';

export interface ImageGenerationParams {
  prompt: string;
  aspectRatio: '1:1' | '3:2' | '4:3' | '16:9' | '9:16' | '2:3' | '3:4' | '21:9' | '5:4' | '4:5';
  imageSize: '1K' | '2K' | '4K';
  referenceImages?: string[]; // Base64 encoded images
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
 * Generate images using Nano Banana Pro (Google Native Format)
 * Supports custom aspect ratios and 4K resolution
 */
export async function generateImage(params: ImageGenerationParams): Promise<GeneratedImage> {
  if (!API_KEY || API_KEY === 'sk-YOUR_API_KEY_HERE') {
    throw new Error('API key not configured. Please set VITE_LAOZHANG_API_KEY in .env file');
  }

  const endpoint = `${API_URL}/v1beta/models/gemini-3-pro-image-preview:generateContent`;

  // Build parts array: text prompt + optional reference images
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
    { text: params.prompt }
  ];

  // Add reference images if provided
  if (params.referenceImages && params.referenceImages.length > 0) {
    params.referenceImages.forEach(imageData => {
      // Remove data URL prefix if present
      const base64Data = imageData.includes('base64,') 
        ? imageData.split('base64,')[1] 
        : imageData;
      
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: base64Data
        }
      });
    });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: params.aspectRatio,
        imageSize: params.imageSize
      }
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || 
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();

    // Extract base64 image data
    const base64Data = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Data) {
      throw new Error('No image data returned from API');
    }

    // Create data URL for display
    const dataUrl = `data:image/png;base64,${base64Data}`;

    return {
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: dataUrl,
      base64Data,
      timestamp: Date.now(),
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
      imageSize: params.imageSize
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate image');
  }
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
    // If batch fails, return partial results
    const results = await Promise.allSettled(promises);
    const successfulImages = results
      .filter((result): result is PromiseFulfilledResult<GeneratedImage> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
    
    if (successfulImages.length === 0) {
      throw error;
    }
    
    return successfulImages;
  }
}

/**
 * Convert file to base64 for reference images
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
