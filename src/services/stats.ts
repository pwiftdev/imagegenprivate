/**
 * Statistics tracking for image generation
 * Persisted in localStorage (frontend-only, no backend)
 */

const STORAGE_KEY = 'jurefield-stats';

export interface GenerationRecord {
  timestamp: number;
  imageCount: number;
  apiCalls: number;
  cost: number;
}

export interface StatsData {
  totalImages: number;
  totalApiCalls: number;
  totalCost: number;
  records: GenerationRecord[];
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

  const record: GenerationRecord = {
    timestamp: Date.now(),
    imageCount,
    apiCalls: imageCount, // 1 API call per image in batch
    cost
  };

  stats.records.push(record);
  stats.totalImages += imageCount;
  stats.totalApiCalls += imageCount;
  stats.totalCost += cost;

  saveStats(stats);
}

export function getStats(): StatsData {
  return loadStats();
}

export function getMonthlyOverview(): { month: string; images: number; cost: number }[] {
  const stats = loadStats();
  const byMonth = new Map<string, { images: number; cost: number }>();

  for (const record of stats.records) {
    const date = new Date(record.timestamp);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!byMonth.has(key)) {
      byMonth.set(key, { images: 0, cost: 0 });
    }
    const entry = byMonth.get(key)!;
    entry.images += record.imageCount;
    entry.cost += record.cost;
  }

  // Sort by month descending (newest first)
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, data]) => ({
      month: new Date(key + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      images: data.images,
      cost: data.cost
    }));
}
