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

// Normalized image shape for display (works for both generated and stored)
interface DisplayImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  imageSize: string;
}

function App() {
  const [images, setImages] = useState<DisplayImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showStatistics, setShowStatistics] = useState(false);

  // Load images from Supabase on mount
  useEffect(() => {
    async function load() {
      try {
        const stored = await fetchImagesFromSupabase();
        setImages(
          stored.map((img) => ({
            id: img.id,
            url: img.url,
            prompt: img.prompt || '',
            aspectRatio: img.aspect_ratio || '',
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

  const handleGenerate = useCallback(async (params: ImageGenerationParams, batchSize: number) => {
    if (!params.prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const newImages = await generateBatchImages(params, batchSize);

      // Save each to Supabase and add to state
      const saved: DisplayImage[] = [];
      for (const img of newImages) {
        try {
          const stored = await saveImageToSupabase(
            img.base64Data,
            img.prompt,
            img.aspectRatio,
            img.imageSize
          );
          saved.push({
            id: stored.id,
            url: stored.url,
            prompt: stored.prompt || img.prompt,
            aspectRatio: stored.aspect_ratio || img.aspectRatio,
            imageSize: stored.image_size || img.imageSize
          });
        } catch (saveErr) {
          console.error('Failed to save image to Supabase:', saveErr);
          // Fallback: show locally even if save failed
          saved.push({
            id: img.id,
            url: img.url,
            prompt: img.prompt,
            aspectRatio: img.aspectRatio,
            imageSize: img.imageSize
          });
        }
      }

      setImages((prev) => [...saved, ...prev]);
      recordGeneration(newImages.length);
      console.log(`✅ Generated and saved ${saved.length} image(s)`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate images';
      setError(errorMessage);
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  }, []);

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
      {isGenerating && (
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
        ) : images.length === 0 ? (
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
            images={images.map(img => img.url)} 
            onImageClick={handleImageClick}
          />
        )}
      </div>

      {/* Control Panel - Overlapping at bottom with liquid glass effect */}
      <ControlPanel onGenerate={handleGenerate} isGenerating={isGenerating} />

      {/* Image Modal */}
      {selectedImageIndex !== null && images[selectedImageIndex] && (
        <ImageModal
          imageUrl={images[selectedImageIndex]!.url}
          prompt={images[selectedImageIndex]!.prompt}
          aspectRatio={images[selectedImageIndex]!.aspectRatio}
          imageSize={images[selectedImageIndex]!.imageSize}
          onClose={handleCloseModal}
        />
      )}

      {/* Statistics Modal */}
      {showStatistics && (
        <StatisticsModal onClose={() => setShowStatistics(false)} />
      )}
    </div>
  );
}

export default App;
