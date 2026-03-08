/**
 * Statistics tracking for image generation
 * Persisted in localStorage (frontend-only, no backend)
 */

const STORAGE_KEY = 'jurefield-stats';

interface StatsData {
  totalImages: number;
  totalApiCalls: number;
  totalCost: number;
  records: { timestamp: number; imageCount: number; apiCalls: number; cost: number }[];
}

const COST_PER_IMAGE = 0.05; // $0.05 per image (Nano Banana Pro)

function loadStats(): StatsData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Invalid or corrupted data
  }
  return {
    totalImages: 0,
    totalApiCalls: 0,
    totalCost: 0,
    records: []
  };
}

function saveStats(data: StatsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.warn('Failed to save stats to localStorage');
  }
}

export function recordGeneration(imageCount: number): void {
  const stats = loadStats();
  const cost = imageCount * COST_PER_IMAGE;

  stats.records.push({
    timestamp: Date.now(),
    imageCount,
    apiCalls: imageCount,
    cost
  });
  stats.totalImages += imageCount;
  stats.totalApiCalls += imageCount;
  stats.totalCost += cost;

  saveStats(stats);
}
