import { useState, useCallback, useEffect } from 'react';
import ImageGrid from './components/ImageGrid';
import ControlPanel from './components/ControlPanel';
import Header from './components/Header';
import ImageModal from './components/ImageModal';
import StatisticsModal from './components/StatisticsModal';
import { generateBatchImages } from './services/imageGeneration';
import { saveImageToSupabase, fetchImagesFromSupabase } from './services/imageStorage';
import { recordGeneration } from './services/stats';
import type { ImageGenerationParams } from './services/imageGeneration';
import './App.css';

type GridItem =
  | { type: 'image'; id: string; url: string; aspectRatio: string; prompt: string; imageSize: string }
  | { type: 'placeholder'; id: string; status: 'generating' | 'queued'; aspectRatio: string };

interface QueuedBatch {
  id: string;
  params: ImageGenerationParams;
  batchSize: number;
}

let batchIdCounter = 0;
function nextBatchId() {
  return `batch-${++batchIdCounter}`;
}

function App() {
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [queue, setQueue] = useState<QueuedBatch[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showStatistics, setShowStatistics] = useState(false);

  // Load images from Supabase on mount
  useEffect(() => {
    async function load() {
      try {
        const stored = await fetchImagesFromSupabase();
        setGridItems(
          stored.map((img) => ({
            type: 'image' as const,
            id: img.id,
            url: img.url,
            aspectRatio: img.aspect_ratio || '',
            prompt: img.prompt || '',
            imageSize: img.image_size || ''
          }))
        );
      } catch (err) {
        console.error('Failed to load images:', err);
        const msg = err instanceof Error ? err.message : 'Failed to load images';
        if (msg.includes('Row Level Security') || msg.includes('permission') || msg.includes('policy')) {
          setError('Database permission denied. Run the RLS policies in supabase-rls.sql');
        } else {
          setError(msg);
        }
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const processBatch = useCallback(async (batch: QueuedBatch) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setQueue((q) => q.filter((b) => b.id !== batch.id));

    const placeholderIds = Array.from({ length: batch.batchSize }, (_, i) => `ph-${batch.id}-${i}`);

    setGridItems((prev) =>
      prev.map((item) =>
        item.type === 'placeholder' && placeholderIds.includes(item.id)
          ? { ...item, status: 'generating' as const }
          : item
      )
    );

    try {
      const newImages = await generateBatchImages(batch.params, batch.batchSize);
      const saved: GridItem[] = [];

      for (const img of newImages) {
        try {
          const stored = await saveImageToSupabase(
            img.base64Data,
            img.prompt,
            img.aspectRatio,
            img.imageSize
          );
          saved.push({
            type: 'image',
            id: stored.id,
            url: stored.url,
            aspectRatio: stored.aspect_ratio || img.aspectRatio,
            prompt: stored.prompt || img.prompt,
            imageSize: stored.image_size || img.imageSize
          });
        } catch (saveErr) {
          console.error('Failed to save image to Supabase:', saveErr);
          saved.push({
            type: 'image',
            id: img.id,
            url: img.url,
            aspectRatio: img.aspectRatio,
            prompt: img.prompt,
            imageSize: img.imageSize
          });
        }
      }

      setGridItems((prev) => {
        const filtered = prev.filter((p) => p.type !== 'placeholder' || !placeholderIds.includes(p.id));
        return [...saved, ...filtered];
      });
      recordGeneration(newImages.length);
      console.log(`✅ Generated and saved ${saved.length} image(s)`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate images';
      setError(errorMessage);
      setGridItems((prev) => prev.filter((p) => p.type !== 'placeholder' || !placeholderIds.includes(p.id)));
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  useEffect(() => {
    if (queue.length > 0 && !isProcessing) {
      processBatch(queue[0]);
    }
  }, [queue, isProcessing, processBatch]);

  const handleGenerate = useCallback((params: ImageGenerationParams, batchSize: number) => {
    if (!params.prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setError(null);
    const batchId = nextBatchId();
    const batch: QueuedBatch = { id: batchId, params, batchSize };
    const isFirst = queue.length === 0 && !isProcessing;

    const placeholderIds = Array.from({ length: batchSize }, (_, i) => `ph-${batchId}-${i}`);
    const placeholders: GridItem[] = placeholderIds.map((id) => ({
      type: 'placeholder',
      id,
      status: isFirst ? ('generating' as const) : ('queued' as const),
      aspectRatio: params.aspectRatio
    }));

    setGridItems((prev) => [...placeholders, ...prev]);

    if (isFirst) {
      processBatch(batch);
    } else {
      setQueue((q) => [...q, batch]);
    }
  }, [queue, isProcessing, processBatch]);

  const handleImageClick = useCallback((index: number) => {
    setSelectedImageIndex(index);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedImageIndex(null);
  }, []);

  return (
    <div className="min-h-screen bg-black pb-32 pt-14">
      {/* Header */}
      <Header onStatisticsClick={() => setShowStatistics(true)} />

      {/* Error notification */}
      {error && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md">
          <div className="bg-red-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-white/80 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isProcessing && (
        <div className="fixed top-20 right-6 z-50">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
            <span className="text-sm">Generating images...</span>
          </div>
        </div>
      )}

      {/* Image Grid Background */}
      <div className="w-full pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh] text-white/40">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/30 border-t-white"></div>
          </div>
        ) : gridItems.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh] text-white/40 text-center px-4">
            <div>
              <svg className="w-24 h-24 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg">No images yet</p>
              <p className="text-sm mt-2">Enter a prompt below to generate your first image</p>
            </div>
          </div>
        ) : (
          <ImageGrid 
            items={gridItems} 
            onImageClick={handleImageClick}
          />
        )}
      </div>

      {/* Control Panel - Overlapping at bottom with liquid glass effect */}
      <ControlPanel onGenerate={handleGenerate} isGenerating={isProcessing} />

      {/* Image Modal */}
      {selectedImageIndex !== null && (() => {
        const item = gridItems[selectedImageIndex];
        if (!item || item.type !== 'image') return null;
        return (
          <ImageModal
            imageUrl={item.url}
            prompt={item.prompt}
            aspectRatio={item.aspectRatio}
            imageSize={item.imageSize}
            onClose={handleCloseModal}
          />
        );
      })()}

      {/* Statistics Modal */}
      {showStatistics && (
        <StatisticsModal onClose={() => setShowStatistics(false)} />
      )}
    </div>
  );
}

export default App;
