import { useState, useCallback, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import ImageGrid, { type CreatorInfo } from './components/ImageGrid';
import ControlPanel from './components/ControlPanel';
import Header from './components/Header';
import ImageModal from './components/ImageModal';
import AuthScreen from './components/AuthScreen';
import ProfilePage from './components/ProfilePage';
import { useAuth } from './hooks/useAuth';
import { generateBatchImages, getActiveJobIds, pollJobUntilComplete } from './services/imageGeneration';
import { saveImageToSupabase, saveImageMetadataToSupabase, fetchImagesFromSupabase } from './services/imageStorage';
import { fetchProfilesByIds, fetchProfile } from './services/profileService';
import { recordGeneration } from './services/stats';
import type { ImageGenerationParams } from './services/imageGeneration';
import { IMAGE_MODELS } from './services/imageGeneration';
import './App.css';

type GridItem =
  | { type: 'image'; id: string; url: string; aspectRatio: string; prompt: string; imageSize: string; model?: string; referenceImageUrls?: string[]; creator?: CreatorInfo }
  | { type: 'placeholder'; id: string; status: 'generating' | 'queued'; aspectRatio: string; imageSize: string };

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
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [queue, setQueue] = useState<QueuedBatch[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [qualityFilter, setQualityFilter] = useState<'All' | '1K' | '2K' | '4K'>('All');
  const [viewMode, setViewMode] = useState<'mine' | 'all'>('mine');
  const [promptToInject, setPromptToInject] = useState<string | null>(null);
  const [referenceImageUrlToInject, setReferenceImageUrlToInject] = useState<string | null>(null);
  const [referenceImageUrlsToInject, setReferenceImageUrlsToInject] = useState<string[] | null>(null);
  const [controlPanelOpen, setControlPanelOpen] = useState(false);
  const [currentUserCreator, setCurrentUserCreator] = useState<CreatorInfo | null>(null);
  const [imagesRefreshKey, setImagesRefreshKey] = useState(0);

  // Load current user's creator info (for newly generated images)
  useEffect(() => {
    if (!user?.id) return;
    fetchProfile(user.id).then((p) => {
      if (p) setCurrentUserCreator({ username: p.username || 'Creator', avatar_url: p.avatar_url });
    });
  }, [user?.id]);

  // Load images from Supabase (refetch when viewMode changes)
  useEffect(() => {
    if (!user) return;
    async function load() {
      setIsLoading(true);
      try {
        const stored = await fetchImagesFromSupabase(viewMode);
        const userIds = [...new Set(stored.map((img) => img.user_id).filter(Boolean))] as string[];
        const creatorMap = await fetchProfilesByIds(userIds);
        const newImages: GridItem[] = stored
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map((img) => ({
            type: 'image' as const,
            id: img.id,
            url: img.url,
            aspectRatio: img.aspect_ratio || '',
            prompt: img.prompt || '',
            imageSize: img.image_size || '',
            referenceImageUrls: Array.isArray(img.reference_image_urls) ? img.reference_image_urls : undefined,
            creator: img.user_id ? creatorMap.get(img.user_id) : undefined,
          }));
        setGridItems((prev) => {
          const placeholders = prev.filter((item): item is Extract<GridItem, { type: 'placeholder' }> => item.type === 'placeholder');
          return [...placeholders, ...newImages];
        });
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
  }, [user?.id, viewMode, imagesRefreshKey]);

  // Recover in-flight jobs after reload: add "generating" placeholders, poll, refetch when done
  useEffect(() => {
    if (!user?.id) return;
    const ids = getActiveJobIds();
    if (ids.length === 0) return;
    const placeholders: GridItem[] = ids.map((jobId) => ({
      type: 'placeholder',
      id: `recovery-${jobId}`,
      status: 'generating' as const,
      aspectRatio: '3:2',
      imageSize: '1K',
    }));
    setGridItems((prev) => [...placeholders, ...prev]);
    const onJobComplete = (completedJobId: string) => {
      setGridItems((prev) => prev.filter((p) => !(p.type === 'placeholder' && p.id === `recovery-${completedJobId}`)));
      setImagesRefreshKey((k) => k + 1);
    };
    ids.forEach((jobId) => {
      pollJobUntilComplete(jobId, onJobComplete).then(() => {});
    });
  }, [user?.id]);

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

      const refUrls = batch.params.referenceImageUrls?.filter((u): u is string => !!u);
      const modelLabel = batch.params.model ? IMAGE_MODELS[batch.params.model] : undefined;
      for (const img of newImages) {
        // Backend may have saved metadata (img.id is UUID) – skip duplicate insert
        const backendSaved = img.storagePath && typeof img.id === 'string' && /^[0-9a-f-]{36}$/i.test(img.id);
        if (backendSaved) {
          saved.push({
            type: 'image',
            id: img.id,
            url: img.url,
            aspectRatio: img.aspectRatio,
            prompt: img.prompt,
            imageSize: img.imageSize,
            model: modelLabel,
            referenceImageUrls: refUrls,
            creator: currentUserCreator ?? undefined,
          });
          continue;
        }
        try {
          const stored = img.storagePath
            ? await saveImageMetadataToSupabase(img.storagePath, img.prompt, img.aspectRatio, img.imageSize, refUrls)
            : await saveImageToSupabase(img.base64Data, img.prompt, img.aspectRatio, img.imageSize, refUrls);
          saved.push({
            type: 'image',
            id: stored.id,
            url: stored.url,
            aspectRatio: stored.aspect_ratio || img.aspectRatio,
            prompt: stored.prompt || img.prompt,
            imageSize: stored.image_size || img.imageSize,
            model: modelLabel,
            referenceImageUrls: refUrls,
            creator: currentUserCreator ?? undefined,
          });
        } catch (saveErr) {
          console.error('Failed to save image to Supabase:', saveErr);
          saved.push({
            type: 'image',
            id: img.id,
            url: img.url,
            aspectRatio: img.aspectRatio,
            prompt: img.prompt,
            imageSize: img.imageSize,
            model: modelLabel,
            referenceImageUrls: refUrls,
            creator: currentUserCreator ?? undefined,
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
  }, [isProcessing, currentUserCreator]);

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
    const paramsWithUser = { ...params, userId: user?.id };
    const batch: QueuedBatch = { id: batchId, params: paramsWithUser, batchSize };
    const isFirstInQueue = queue.length === 0;

    const placeholderIds = Array.from({ length: batchSize }, (_, i) => `ph-${batchId}-${i}`);
    const placeholders: GridItem[] = placeholderIds.map((id) => ({
      type: 'placeholder',
      id,
      status: isFirstInQueue ? ('generating' as const) : ('queued' as const),
      aspectRatio: params.aspectRatio,
      imageSize: params.imageSize
    }));

    setGridItems((prev) => [...placeholders, ...prev]);
    setQueue((q) => [...q, batch]);
  }, [queue, user?.id]);

  const handleImageClick = useCallback((index: number) => {
    setSelectedImageIndex(index);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedImageIndex(null);
  }, []);

  const handlePromptInjected = useCallback(() => {
    setPromptToInject(null);
  }, []);

  const handleReferenceImageInjected = useCallback(() => {
    setReferenceImageUrlToInject(null);
    setControlPanelOpen(true);
  }, []);

  const handleReferenceImagesInjected = useCallback(() => {
    setReferenceImageUrlsToInject(null);
    setControlPanelOpen(true);
  }, []);

  const handleReRun = useCallback((prompt: string, referenceImageUrls?: string[]) => {
    setPromptToInject(prompt);
    if (referenceImageUrls && referenceImageUrls.length > 0) {
      setReferenceImageUrlsToInject(referenceImageUrls);
    } else {
      setReferenceImageUrlsToInject(null);
    }
    setControlPanelOpen(true);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        onSignIn={async (email, password) => { await signIn(email, password); }}
        onSignUp={async (email, password, username) => { await signUp(email, password, username); }}
      />
    );
  }

  return (
    <>
      <Header onSignOut={signOut} />
      <Routes>
        <Route path="/profile" element={<ProfilePage user={user} />} />
        <Route path="/" element={
    <div className="min-h-screen bg-black pb-32 pt-14">
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

      {/* Section title + quality filter + view mode */}
      <div className="w-full px-6 pt-6 pb-2">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {viewMode === 'mine' ? 'Your Kreations' : 'What people are Kreating'}
          </h1>
          <button
            onClick={() => setViewMode(viewMode === 'mine' ? 'all' : 'mine')}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-medium transition-all"
          >
            {viewMode === 'mine' ? 'See what people are Kreating' : 'Show only my Kreations'}
          </button>
          <div className="flex items-center gap-2">
            {(['All', '1K', '2K', '4K'] as const).map((q) => (
              <button
                key={q}
                onClick={() => setQualityFilter(q)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  qualityFilter === q
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Image Grid Background */}
      <div className="w-full pt-2">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh] text-white/40">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/30 border-t-white"></div>
          </div>
        ) : (() => {
          const filteredItems = qualityFilter === 'All'
            ? gridItems
            : gridItems.filter((item) => (item.type === 'image' ? item.imageSize : item.imageSize) === qualityFilter);
          return filteredItems.length === 0 ? (
            <div className="flex items-center justify-center min-h-[60vh] text-white/40 text-center px-4">
              <div>
                <svg className="w-24 h-24 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-lg">
                  {viewMode === 'mine'
                    ? (qualityFilter === 'All' ? 'No images yet' : `No ${qualityFilter} images`)
                    : (qualityFilter === 'All' ? 'No one has shared yet' : `No ${qualityFilter} images`)}
                </p>
                <p className="text-sm mt-2">
                  {viewMode === 'mine' && qualityFilter === 'All'
                    ? 'Enter a prompt below to generate your first image'
                    : viewMode === 'all'
                      ? 'Be the first to share something!'
                      : `Try selecting "All" or generate images at ${qualityFilter}`}
                </p>
              </div>
            </div>
          ) : (
            <ImageGrid
              items={filteredItems}
              onImageClick={handleImageClick}
              onReRun={handleReRun}
              onAddToReference={(url) => { setReferenceImageUrlToInject(url); setControlPanelOpen(true); }}
            />
          );
        })()}
      </div>

      {/* Start Kreating button - mobile only, when panel is closed */}
      {!controlPanelOpen && (
        <button
          onClick={() => setControlPanelOpen(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 md:hidden bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all"
        >
          Start Kreating
        </button>
      )}

      {/* Control Panel - Overlapping at bottom with liquid glass effect */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 pointer-events-none transition-transform duration-300 md:translate-y-0 ${
          controlPanelOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'
        }`}
      >
        <div className="flex justify-center">
          <ControlPanel
            onGenerate={handleGenerate}
            isGenerating={isProcessing}
            promptToInject={promptToInject}
            onPromptInjected={handlePromptInjected}
            referenceImageUrlToInject={referenceImageUrlToInject}
            onReferenceImageInjected={handleReferenceImageInjected}
            referenceImageUrlsToInject={referenceImageUrlsToInject}
            onReferenceImagesInjected={handleReferenceImagesInjected}
            onCloseMobile={() => setControlPanelOpen(false)}
            className="pointer-events-auto"
          />
        </div>
      </div>

      {/* Image Modal */}
      {selectedImageIndex !== null && (() => {
        const filteredItems = qualityFilter === 'All'
          ? gridItems
          : gridItems.filter((item) => (item.type === 'image' ? item.imageSize : item.imageSize) === qualityFilter);
        const item = filteredItems[selectedImageIndex];
        if (!item || item.type !== 'image') return null;
        const imageItems = filteredItems.filter((i): i is Extract<typeof i, { type: 'image' }> => i.type === 'image');
        const currentImageIdx = imageItems.findIndex((i) => i.id === item.id);
        const hasPrev = currentImageIdx > 0;
        const hasNext = currentImageIdx >= 0 && currentImageIdx < imageItems.length - 1;
        const onPrev = () => {
          if (currentImageIdx <= 0) return;
          const prevItem = imageItems[currentImageIdx - 1];
          const idx = filteredItems.findIndex((i) => i.type === 'image' && i.id === prevItem.id);
          if (idx >= 0) setSelectedImageIndex(idx);
        };
        const onNext = () => {
          if (currentImageIdx < 0 || currentImageIdx >= imageItems.length - 1) return;
          const nextItem = imageItems[currentImageIdx + 1];
          const idx = filteredItems.findIndex((i) => i.type === 'image' && i.id === nextItem.id);
          if (idx >= 0) setSelectedImageIndex(idx);
        };
        return (
          <ImageModal
            imageUrl={item.url}
            prompt={item.prompt}
            aspectRatio={item.aspectRatio}
            imageSize={item.imageSize}
            model={item.model}
            onClose={handleCloseModal}
            onReusePrompt={setPromptToInject}
            onPrev={onPrev}
            onNext={onNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
          />
        );
      })()}

    </div>
        } />
      </Routes>
    </>
  );
}

export default App;
