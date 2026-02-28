const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function enhancePrompt(prompt: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/enhance-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt.trim() }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Enhance failed: ${response.status}`);
  }

  const enhanced = data.enhancedPrompt;
  if (!enhanced || typeof enhanced !== 'string') {
    throw new Error('No enhanced prompt returned');
  }

  return enhanced.trim();
}
