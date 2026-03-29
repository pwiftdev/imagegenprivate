import { useState, useCallback, useEffect, useMemo, useRef, type FormEvent } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import ImageGrid, { type CreatorInfo } from './components/ImageGrid';
import ControlPanel from './components/ControlPanel';
import Header from './components/Header';
import ImageModal from './components/ImageModal';
import AuthScreen from './components/AuthScreen';
import ProfilePage from './components/ProfilePage';
import { useAuth } from './hooks/useAuth';
import { generateImage, getActiveJobIds, pollJobUntilComplete } from './services/imageGeneration';
import { saveImageToSupabase, saveImageMetadataToSupabase, fetchImagesFromSupabase, deleteImage } from './services/imageStorage';
import { fetchProfilesByIds, fetchProfile, updateProfile } from './services/profileService';
import { fetchFolders, createFolder, type Folder } from './services/folderService';
import { fetchMoodboards, type Moodboard } from './services/moodboardService';
import { submitFeedback } from './services/feedbackService';
import { recordGeneration } from './services/stats';
import type { ImageGenerationParams, ImageModelId } from './services/imageGeneration';
import { IMAGE_MODELS } from './services/imageGeneration';
import { compressImageFromUrl } from './utils/compressImage';
import LandingPage from './pages/LandingPage';
import MoodboardsPage from './pages/MoodboardsPage';
import MyPromptsPage from './pages/MyPromptsPage';
import VideoPage from './pages/VideoPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import { fetchPromptTemplates, DEFAULT_PROMPT_TEMPLATES } from './services/promptTemplateService';
import './App.css';

// App shell: grid, control panel, modals (wrap settings, image modal, etc.)

type GridItem =
  | { type: 'image'; id: string; url: string; thumbUrl?: string; aspectRatio: string; prompt: string; imageSize: string; model?: string; referenceImageUrls?: string[]; creator?: CreatorInfo }
  | { type: 'placeholder'; id: string; status: 'generating' | 'queued'; aspectRatio: string; imageSize: string };

interface QueuedJob {
  id: string;
  params: ImageGenerationParams;
  /** Folder ID at job start - used when saving so image goes to correct folder even if user switches folders */
  folderId: string | null;
}

const MAX_CONCURRENT = 3;
let jobIdCounter = 0;
function nextJobId() {
  return `job-${++jobIdCounter}`;
}

const WRAP_ASPECTS: ImageGenerationParams['aspectRatio'][] = [
  '1:1',
  '3:2',
  '4:3',
  '16:9',
  '9:16',
  '2:3',
  '3:4',
  '21:9',
  '5:4',
  '4:5',
];

const WRAP_QUALITIES: ImageGenerationParams['imageSize'][] = ['1K', '2K', '4K'];

const WRAP_MODELS = Object.keys(IMAGE_MODELS) as ImageModelId[];

interface ResetPasswordScreenProps {
  onSubmit: (password: string) => Promise<void>;
}

function ResetPasswordScreen({ onSubmit }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(password);
      setMessage('Password updated. You can now continue using Kreator.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-white/5 to-white/5 backdrop-blur-xl p-6">
          <h1 className="text-xl font-semibold text-white mb-2">Set a new password</h1>
          <p className="text-white/60 text-sm mb-4">
            Enter a new password for your Kreator account.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="new-password" className="block text-white/80 text-sm mb-1.5">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-white/80 text-sm mb-1.5">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
            </div>
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2 text-red-300 text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2 text-green-300 text-sm">
                {message}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const location = useLocation();
  const pathname = location.pathname;
  const { user, loading: authLoading, signIn, signUp, signInWithGoogle, signOut, resetPassword, updatePassword } = useAuth();
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [queue, setQueue] = useState<QueuedJob[]>([]);
  const [runningCount, setRunningCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null); // null = "My Kreations"
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createFolderName, setCreateFolderName] = useState('');
  const [createFolderSubmitting, setCreateFolderSubmitting] = useState(false);
  const [promptToInject, setPromptToInject] = useState<string | null>(null);
  const [referenceImageUrlToInject, setReferenceImageUrlToInject] = useState<string | null>(null);
  const [referenceImageUrlsToInject, setReferenceImageUrlsToInject] = useState<string[] | null>(null);
  const [moodboardUrlsToInject, setMoodboardUrlsToInject] = useState<string[] | null>(null);
  const [controlPanelOpen, setControlPanelOpen] = useState(false);
  const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<Array<{ id: string; handle: string; prompt_text: string }>>([]);
  const [currentUserCreator, setCurrentUserCreator] = useState<CreatorInfo | null>(null);
  const [imagesRefreshKey, setImagesRefreshKey] = useState(0);
  const [hasMoreImages, setHasMoreImages] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const imageCountRef = useRef(0);
  const [wrapSettings, setWrapSettings] = useState<{
    wrappedUrl: string;
    referenceImageUrls?: string[];
  } | null>(null);
  const [wrapAspect, setWrapAspect] = useState<ImageGenerationParams['aspectRatio']>('3:2');
  const [wrapQuality, setWrapQuality] = useState<ImageGenerationParams['imageSize']>('1K');
  const [wrapModel, setWrapModel] = useState<ImageModelId>('gemini-3-pro-image-preview');
  const [wrapBatchSize, setWrapBatchSize] = useState(1);
  const [wrapGenerating, setWrapGenerating] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setIsRecoveryMode(true);
    }
  }, []);

  // Load current user's profile (creator info + credits)
  const refetchCredits = useCallback(async () => {
    if (!user?.id) return;
    let p = await fetchProfile(user.id);
    if (!p) {
      try {
        await updateProfile(user.id, { username: user.email?.split('@')[0] || undefined });
        p = await fetchProfile(user.id);
      } catch {
        // ignore
      }
    }
    if (p) {
      setCurrentUserCreator({ username: p.username || 'Creator', avatar_url: p.avatar_url });
      setCredits(typeof p.credits === 'number' ? p.credits : 0);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    void refetchCredits();
  }, [refetchCredits]);

  // Load folders when user is set (mine view only uses them)
  useEffect(() => {
    if (!user?.id) return;
    fetchFolders(user.id)
      .then(setFolders)
      .catch((err) => {
        console.error('Failed to load folders:', err);
        setFolders([]);
      });
  }, [user?.id]);

  // Load moodboards when user is set
  useEffect(() => {
    if (!user?.id) return;
    fetchMoodboards(user.id)
      .then(setMoodboards)
      .catch((err) => {
        console.error('Failed to load moodboards:', err);
        setMoodboards([]);
      });
  }, [user?.id]);

  // Load prompt templates when user is set
  useEffect(() => {
    if (!user?.id) return;
    fetchPromptTemplates(user.id)
      .then(setPromptTemplates)
      .catch((err) => {
        console.error('Failed to load prompt templates:', err);
        setPromptTemplates([]);
      });
  }, [user?.id]);

  const filteredGridItems = useMemo(() => {
    let list = gridItems;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((item) =>
        item.type === 'placeholder' ||
        (item.type === 'image' && item.prompt?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [gridItems, searchQuery]);

  useEffect(() => {
    imageCountRef.current = gridItems.filter((i) => i.type === 'image').length;
  }, [gridItems]);

  // Load images from Supabase (paginated, refetch when viewMode/refreshKey/activeFolderId changes)
  useEffect(() => {
    if (!user) return;
    async function load() {
      setIsLoading(true);
      try {
        const opts: { limit: number; offset: number; folderId?: string | null } = { limit: 12, offset: 0 };
        opts.folderId = activeFolderId;
        const { images: stored, hasMore } = await fetchImagesFromSupabase('mine', opts);
        const userIds = [...new Set(stored.map((img) => img.user_id).filter(Boolean))] as string[];
        const creatorMap = await fetchProfilesByIds(userIds);
        const newImages: GridItem[] = stored
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map((img) => ({
            type: 'image' as const,
            id: img.id,
            url: img.url,
            thumbUrl: img.thumbUrl,
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
        setHasMoreImages(hasMore);
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
  }, [user?.id, imagesRefreshKey, activeFolderId]);

  const loadMoreImages = useCallback(async () => {
    if (!user || isLoadingMore || !hasMoreImages) return;
    const offset = imageCountRef.current;
    setIsLoadingMore(true);
    try {
      const opts: { limit: number; offset: number; folderId?: string | null } = { limit: 12, offset };
      opts.folderId = activeFolderId;
      const { images: stored, hasMore } = await fetchImagesFromSupabase('mine', opts);
      const userIds = [...new Set(stored.map((img) => img.user_id).filter(Boolean))] as string[];
      const creatorMap = await fetchProfilesByIds(userIds);
      const moreImages: GridItem[] = stored.map((img) => ({
        type: 'image' as const,
        id: img.id,
        url: img.url,
        thumbUrl: img.thumbUrl,
        aspectRatio: img.aspect_ratio || '',
        prompt: img.prompt || '',
        imageSize: img.image_size || '',
        referenceImageUrls: Array.isArray(img.reference_image_urls) ? img.reference_image_urls : undefined,
        creator: img.user_id ? creatorMap.get(img.user_id) : undefined,
      }));
      setGridItems((prev) => [...prev, ...moreImages]);
      setHasMoreImages(hasMore);
    } catch (err) {
      console.error('Failed to load more images:', err);
      setError(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      setIsLoadingMore(false);
    }
  }, [user?.id, hasMoreImages, isLoadingMore, activeFolderId]);

  // Infinite scroll: load more when sentinel enters viewport
  useEffect(() => {
    if (!hasMoreImages || isLoadingMore || !user) return;
    const el = loadMoreSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreImages();
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMoreImages, isLoadingMore, user, loadMoreImages]);

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

  const processQueue = useCallback(() => {
    if (runningCount >= MAX_CONCURRENT || queue.length === 0) return;

    const toStart = Math.min(MAX_CONCURRENT - runningCount, queue.length);
    const jobsToStart = queue.slice(0, toStart);
    const jobIds = jobsToStart.map((j) => j.id);

    setQueue((q) => q.slice(toStart));
    setRunningCount((c) => c + toStart);
    setGridItems((prev) =>
      prev.map((item) =>
        item.type === 'placeholder' && jobIds.includes(item.id)
          ? { ...item, status: 'generating' as const }
          : item
      )
    );

    jobsToStart.forEach((job) => {
      const localRefUrls = job.params.referenceImageUrls?.filter((u): u is string => !!u);
      const modelLabel = job.params.model ? IMAGE_MODELS[job.params.model] : undefined;

      generateImage(job.params)
        .then(async (img) => {
          let gridImage: GridItem;
          const backendSaved = img.storagePath && typeof img.id === 'string' && /^[0-9a-f-]{36}$/i.test(img.id);
          // Prefer server-persisted URLs (includes uploaded local refs), fall back to local params
          const refUrls = img.referenceImageUrls?.length ? img.referenceImageUrls : localRefUrls;
        if (backendSaved) {
          gridImage = {
            type: 'image',
            id: img.id,
            url: img.url,
            thumbUrl: img.thumbUrl ?? img.url,
            aspectRatio: img.aspectRatio,
              prompt: img.prompt,
              imageSize: img.imageSize,
              model: modelLabel,
              referenceImageUrls: refUrls,
              creator: currentUserCreator ?? undefined,
            };
          } else {
            const targetFolderId = job.folderId;
            try {
              const stored = img.storagePath
                ? await saveImageMetadataToSupabase(img.storagePath, img.prompt, img.aspectRatio, img.imageSize, refUrls, img.thumbStoragePath, targetFolderId)
                : await saveImageToSupabase(img.base64Data, img.prompt, img.aspectRatio, img.imageSize, refUrls, targetFolderId);
              gridImage = {
                type: 'image',
                id: stored.id,
                url: stored.url,
                thumbUrl: stored.thumbUrl,
                aspectRatio: stored.aspect_ratio || img.aspectRatio,
                prompt: stored.prompt || img.prompt,
                imageSize: stored.image_size || img.imageSize,
                model: modelLabel,
                referenceImageUrls: refUrls,
                creator: currentUserCreator ?? undefined,
              };
            } catch (saveErr) {
              console.error('Failed to save image to Supabase:', saveErr);
              gridImage = {
                type: 'image',
                id: img.id,
                url: img.url,
                thumbUrl: undefined,
                aspectRatio: img.aspectRatio,
                prompt: img.prompt,
                imageSize: img.imageSize,
                model: modelLabel,
                referenceImageUrls: refUrls,
                creator: currentUserCreator ?? undefined,
              };
            }
          }
          setGridItems((prev) => {
            const filtered = prev.filter((p) => !(p.type === 'placeholder' && p.id === job.id));
            return [gridImage, ...filtered];
          });
          recordGeneration(1);
          void refetchCredits();
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to generate image');
          setGridItems((prev) => prev.filter((p) => !(p.type === 'placeholder' && p.id === job.id)));
        })
        .finally(() => {
          setRunningCount((c) => c - 1);
        });
    });
  }, [queue, runningCount, currentUserCreator, refetchCredits]);

  useEffect(() => {
    processQueue();
  }, [queue, runningCount, processQueue]);

  const WRAP_PROMPT =
    'The refence image includes red rectangle selectors with text that explain what exactly needs to be changed on the image. Execute this prompt. Never output back the red rectangles and the red text. Only the image with the changes made.';

  const handleGenerate = useCallback((params: ImageGenerationParams, batchSize: number) => {
    if (!params.prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setError(null);
    const paramsWithUser = { ...params, userId: user?.id };

    const jobs: QueuedJob[] = [];
    const placeholders: GridItem[] = [];

    for (let i = 0; i < batchSize; i++) {
      const id = nextJobId();
      jobs.push({ id, params: paramsWithUser, folderId: activeFolderId });
      placeholders.push({
        type: 'placeholder',
        id,
        status: 'queued' as const,
        aspectRatio: params.aspectRatio,
        imageSize: params.imageSize,
      });
    }

    setGridItems((prev) => [...placeholders, ...prev]);
    setQueue((q) => [...q, ...jobs]);
    setCredits((c) => (c !== null ? Math.max(0, c - batchSize) : c));
  }, [user?.id, activeFolderId]);

  const handleImageClick = useCallback((index: number) => {
    setSelectedImageIndex(index);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedImageIndex(null);
  }, []);

  const handleDeleteImage = useCallback(async (imageId: string) => {
    try {
      await deleteImage(imageId);
      setGridItems((prev) => prev.filter((item) => item.type !== 'image' || item.id !== imageId));
      setSelectedImageIndex(null);
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete image');
    }
  }, []);

  const handleCreateFolder = useCallback(async () => {
    if (!user?.id || !createFolderName.trim()) return;
    setCreateFolderSubmitting(true);
    try {
      const folder = await createFolder(user.id, createFolderName.trim());
      setFolders((prev) => [...prev, folder]);
      setActiveFolderId(folder.id);
      setCreateFolderOpen(false);
      setCreateFolderName('');
      setImagesRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Create folder failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setCreateFolderSubmitting(false);
    }
  }, [user?.id, createFolderName]);

  const handleAddToReference = useCallback((url: string) => {
    setReferenceImageUrlToInject(url);
    setControlPanelOpen(true);
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

  const handleMoodboardInjected = useCallback(() => {
    setMoodboardUrlsToInject(null);
    setControlPanelOpen(true);
  }, []);

  const handleReRun = useCallback((prompt: string, referenceImageUrls?: string[]) => {
    setPromptToInject(prompt);
    if (referenceImageUrls && referenceImageUrls.length > 0) {
      const isValidUrl = (u: unknown): u is string => {
        if (typeof u !== 'string') return false;
        return (
          u.startsWith('http://') ||
          u.startsWith('https://') ||
          u.startsWith('blob:')
        );
      };
      const valid = referenceImageUrls.filter(isValidUrl);
      const deduped = [...new Set(valid)];
      setReferenceImageUrlsToInject(deduped.length ? deduped : null);
    } else {
      setReferenceImageUrlsToInject(null);
    }
    setControlPanelOpen(true);
  }, []);

  const handleSubmitFeedback = useCallback(async () => {
    setFeedbackError(null);
    if (!feedbackMessage.trim()) {
      setFeedbackError('Please write your feedback.');
      return;
    }
    setFeedbackSubmitting(true);
    try {
      await submitFeedback({ message: feedbackMessage.trim(), email: feedbackEmail.trim() || undefined });
      setFeedbackModalOpen(false);
      setFeedbackMessage('');
      setFeedbackEmail('');
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to send feedback');
    } finally {
      setFeedbackSubmitting(false);
    }
  }, [feedbackMessage, feedbackEmail]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-blue-500" />
      </div>
    );
  }

  if (isRecoveryMode && user) {
    return (
      <ResetPasswordScreen
        onSubmit={async (newPassword) => {
          await updatePassword(newPassword);
          setIsRecoveryMode(false);
          if (typeof window !== 'undefined') {
            window.location.hash = '';
          }
        }}
      />
    );
  }

  if (!user) {
    return (
      <AuthScreen
        onSignIn={async (email, password) => { await signIn(email, password); }}
        onSignUp={async (email, password, username) => { await signUp(email, password, username); }}
        onSignInWithGoogle={async () => { await signInWithGoogle(); }}
        onResetPassword={async (email) => { await resetPassword(email); }}
      />
    );
  }

  return (
    <>
      {pathname !== '/app/profile' && pathname !== '/app/moodboards' && pathname !== '/app/prompts' && pathname !== '/app/video' && <Header onSignOut={signOut} credits={credits} userId={user?.id} />}
      {pathname === '/app/profile' ? (
        <ProfilePage user={user} credits={credits} onSignOut={signOut} onRequestPasswordReset={user?.email ? async () => { await resetPassword(user.email!); } : undefined} />
      ) : pathname === '/app/moodboards' ? (
        <MoodboardsPage
          user={user}
          onSignOut={signOut}
          onUseMoodboard={(urls) => {
            setMoodboardUrlsToInject(urls);
            setControlPanelOpen(true);
          }}
        />
      ) : pathname === '/app/prompts' ? (
        <MyPromptsPage user={user} onSignOut={signOut} />
      ) : pathname === '/app/video' ? (
        <VideoPage />
      ) : (
    <div className="min-h-screen bg-[#08090a] pb-32 pt-16 landing-font-body relative">
      {/* Background – same vibe as landing (orbs + gradient + noise) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute" style={{ top: '-35%', left: '-25%' }}>
          <div className="w-[90vmax] h-[90vmax] rounded-full bg-gradient-to-br from-blue-500/12 via-indigo-500/8 to-blue-600/12 landing-animate-float landing-animate-glow" />
        </div>
        <div className="absolute" style={{ bottom: '-25%', right: '-20%' }}>
          <div className="w-[70vmax] h-[70vmax] rounded-full bg-gradient-to-tl from-indigo-500/10 via-blue-500/8 to-sky-500/10 landing-animate-float-slow landing-animate-glow" style={{ animationDelay: '-5s' }} />
        </div>
        <div className="absolute" style={{ top: '55%', left: '45%' }}>
          <div className="w-[50vmax] h-[50vmax] rounded-full bg-gradient-to-br from-sky-500/6 to-blue-600/8 landing-animate-float" style={{ animationDelay: '-10s' }} />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.02\'/%3E%3C/svg%3E')]" />
      </div>

      {/* Error notification */}
      {error && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 max-w-md">
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

      {/* Sticky Feedback button - bottom left edge */}
      <button
        type="button"
        onClick={() => setFeedbackModalOpen(true)}
        className="fixed bottom-4 left-4 z-[100] flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/10 hover:bg-white/15 border border-white/20 text-white/90 hover:text-white backdrop-blur-sm transition-colors shadow-lg"
        aria-label="Send feedback"
      >
        <span>Feedback</span>
        <span aria-hidden>❤️</span>
      </button>

      {/* Feedback modal */}
      {feedbackModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !feedbackSubmitting && setFeedbackModalOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && !feedbackSubmitting && setFeedbackModalOpen(false)}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-[#0d0e10] border border-white/10 shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="feedback-modal-title" className="text-lg font-semibold text-white mb-2">
              Send us feedback
            </h3>
            <p className="text-white/60 text-sm mb-4">
              We love hearing from you. Share your thoughts, bugs, or feature ideas.
            </p>
            <textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Your feedback..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none mb-3"
              disabled={feedbackSubmitting}
            />
            <input
              type="email"
              value={feedbackEmail}
              onChange={(e) => setFeedbackEmail(e.target.value)}
              placeholder="Email (optional)"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 mb-4"
              disabled={feedbackSubmitting}
            />
            {feedbackError && (
              <p className="text-red-400/90 text-sm mb-3">{feedbackError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => !feedbackSubmitting && setFeedbackModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitFeedback}
                disabled={feedbackSubmitting || !feedbackMessage.trim()}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {feedbackSubmitting ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wrap & regenerate settings modal */}
      {wrapSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => !wrapGenerating && setWrapSettings(null)}>
          <div
            className="bg-[#0d0e10] border border-white/10 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="landing-font-display text-lg font-semibold text-white mb-2">
              Wrap settings
            </h3>
            <p className="text-white/55 text-sm mb-4">
              Choose aspect ratio, quality, and model for this wrapped regeneration.
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1.5">
                  Aspect ratio
                </p>
                <div className="flex flex-wrap gap-2">
                  {WRAP_ASPECTS.map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setWrapAspect(ratio)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        wrapAspect === ratio
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1.5">
                  Quality
                </p>
                <div className="flex flex-wrap gap-2">
                  {WRAP_QUALITIES.map((quality) => (
                    <button
                      key={quality}
                      type="button"
                      onClick={() => setWrapQuality(quality)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        wrapQuality === quality
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {quality}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1.5">
                  Model
                </p>
                <div className="flex flex-wrap gap-2">
                  {WRAP_MODELS.map((modelId) => (
                    <button
                      key={modelId}
                      type="button"
                      onClick={() => setWrapModel(modelId)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        wrapModel === modelId
                          ? 'bg-blue-500 text-white'
                          : 'bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {IMAGE_MODELS[modelId]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1.5">
                  Batch size
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWrapBatchSize((n) => Math.max(1, n - 1))}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={wrapBatchSize <= 1}
                    aria-label="Decrease batch size"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="text-white text-sm min-w-[3ch] text-center">{wrapBatchSize}</span>
                  <button
                    type="button"
                    onClick={() => setWrapBatchSize((n) => Math.min(8, n + 1))}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={wrapBatchSize >= 8}
                    aria-label="Increase batch size"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button
                type="button"
                onClick={() => !wrapGenerating && setWrapSettings(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white bg-white/10"
                disabled={wrapGenerating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!wrapSettings || wrapGenerating) return;
                  setWrapGenerating(true);
                  try {
                    const base64 = await compressImageFromUrl(wrapSettings.wrappedUrl);
                    const params: ImageGenerationParams = {
                      prompt: WRAP_PROMPT,
                      aspectRatio: wrapAspect,
                      imageSize: wrapQuality,
                      model: wrapModel,
                      referenceImages: [base64],
                    };
                    // Do not pass referenceImageUrls: only the wrapped image is the reference.
                    handleGenerate(params, wrapBatchSize);
                    setWrapSettings(null);
                  } catch (err) {
                    console.error('Wrap generate failed:', err);
                  } finally {
                    setWrapGenerating(false);
                  }
                }}
                disabled={wrapGenerating || (typeof credits === 'number' && credits < wrapBatchSize)}
                title={typeof credits === 'number' && credits < wrapBatchSize ? 'Not enough credits' : undefined}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {wrapGenerating && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {wrapGenerating ? 'Starting…' : `Start generation${wrapBatchSize > 1 ? ` (${wrapBatchSize})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create folder modal */}
      {createFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => !createFolderSubmitting && setCreateFolderOpen(false)}>
          <div className="bg-[#0d0e10] border border-white/10 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="landing-font-display text-lg font-semibold text-white mb-2">New project</h3>
            <p className="text-white/55 text-sm mb-4">Create a folder to organize images for this project.</p>
            <input
              type="text"
              value={createFolderName}
              onChange={(e) => setCreateFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              placeholder="Project name"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-500/50 mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => !createFolderSubmitting && setCreateFolderOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={createFolderSubmitting || !createFolderName.trim()}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
              >
                {createFolderSubmitting ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {/* Content container - full-width, above background */}
      <div className="relative z-10 w-full px-6">
        {/* Dashboard header + stats (mine view) or simple header (all view) */}
        <div className="flex flex-col gap-6 pb-6 pt-6">
          <div>
            <h1 className="landing-font-display text-3xl md:text-4xl font-bold text-white tracking-tight">
              Your <span className="dashboard-title-gradient">Kreations</span>
            </h1>
            <p className="text-white/55 text-base mt-1">
              Your creative hub — track your work and explore new ideas
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveFolderId(null)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeFolderId === null
                      ? 'bg-blue-500/25 text-white border border-blue-400/40'
                      : 'bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  My Kreations
                </button>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFolderId(f.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      activeFolderId === f.id
                        ? 'bg-blue-500/25 text-white border border-blue-400/40'
                        : 'bg-white/5 text-white/80 border border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCreateFolderOpen(true)}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white border-dashed transition-all flex items-center gap-1.5"
                >
                  <span aria-hidden>+</span> New folder
                </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap mr-[5px]">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </span>
                <input
                  type="search"
                  placeholder="Search prompts…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm w-48 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
                  aria-label="Search by prompt"
                />
              </div>
              <Link
                to="/app/moodboards"
                className="px-4 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                My Moodboards
              </Link>
              <Link
                to="/app/prompts"
                className="px-4 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                My Prompts
              </Link>
              <Link
                to="/app/video"
                className="px-4 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Image to Video
              </Link>
            </div>
          </div>
        </div>

        {/* Image Grid */}
        <div className="pt-2">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh] text-white/40">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/30 border-t-white"></div>
          </div>
        ) : (() => {
          const isEmpty = filteredGridItems.length === 0;
          const isMineEmptyAll = !searchQuery.trim();
          const noImagesYet = isMineEmptyAll && gridItems.filter((i) => i.type === 'image').length === 0;
          const noCredits = credits === 0;
          return isEmpty ? (
            <div className="flex items-center justify-center min-h-[60vh] text-center px-4">
              <div className="max-w-sm">
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="landing-font-display text-xl font-bold text-white mb-2">
                  {searchQuery.trim() ? 'No matches' : 'No kreations yet'}
                </h2>
                <p className="text-white/55 text-sm mb-5">
                  {searchQuery.trim()
                    ? 'Try a different search or clear the search box.'
                    : 'Create your first image with a prompt — or explore new ideas.'}
                </p>
                {noImagesYet && noCredits && (
                  <p className="text-white/45 text-xs mb-4">You're out of credits. Get more to start creating.</p>
                )}
                {noImagesYet && (
                  <button
                    type="button"
                    onClick={() => setControlPanelOpen(true)}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-sm hover:opacity-95 transition-opacity"
                  >
                    Start Kreating
                  </button>
                )}
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-white/60 text-sm hover:text-white underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <ImageGrid
                items={filteredGridItems}
                onImageClick={handleImageClick}
                onReRun={handleReRun}
                onAddToReference={handleAddToReference}
              />
              {hasMoreImages && (
                <div ref={loadMoreSentinelRef} className="flex justify-center py-8 min-h-12">
                  {isLoadingMore && (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white" />
                  )}
                </div>
              )}
            </>
          );
        })()}
        </div>
      </div>

      {/* Start Kreating button - full-width bar at bottom when panel is minimized */}
      {!controlPanelOpen && (
        <button
          onClick={() => setControlPanelOpen(true)}
          className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-[32%] landing-font-display bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 rounded-t-3xl shadow-lg shadow-blue-500/30 transition-colors active:from-blue-700 active:to-blue-800"
        >
          Start <span className="text-xl font-bold tracking-tight">Kreating</span>
        </button>
      )}

      {/* Control Panel - slides up from bottom, Mac-like animation */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] origin-bottom ${
          controlPanelOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-center">
          <ControlPanel
            onGenerate={handleGenerate}
            credits={credits}
            promptToInject={promptToInject}
            onPromptInjected={handlePromptInjected}
            referenceImageUrlToInject={referenceImageUrlToInject}
            onReferenceImageInjected={handleReferenceImageInjected}
            referenceImageUrlsToInject={referenceImageUrlsToInject}
            onReferenceImagesInjected={handleReferenceImagesInjected}
            moodboards={moodboards}
            promptTemplates={[...DEFAULT_PROMPT_TEMPLATES, ...promptTemplates]}
            onRequestMoodboardInjection={(urls) => setMoodboardUrlsToInject(urls)}
            moodboardUrlsToInject={moodboardUrlsToInject}
            onMoodboardInjected={handleMoodboardInjected}
            onCloseMobile={() => setControlPanelOpen(false)}
            className="pointer-events-auto"
          />
        </div>
      </div>

      {/* Image Modal */}
      {selectedImageIndex !== null && (() => {
        const item = filteredGridItems[selectedImageIndex];
        if (!item || item.type !== 'image') return null;
        const imageItems = filteredGridItems.filter((i): i is Extract<typeof item, { type: 'image' }> => i.type === 'image');
        const currentImageIdx = imageItems.findIndex((i) => i.id === item.id);
        const hasPrev = currentImageIdx > 0;
        const hasNext = currentImageIdx >= 0 && currentImageIdx < imageItems.length - 1;
        const onPrev = () => {
          if (currentImageIdx <= 0) return;
          const prevItem = imageItems[currentImageIdx - 1];
          const idx = filteredGridItems.findIndex((i) => i.type === 'image' && i.id === prevItem.id);
          if (idx >= 0) setSelectedImageIndex(idx);
        };
        const onNext = () => {
          if (currentImageIdx < 0 || currentImageIdx >= imageItems.length - 1) return;
          const nextItem = imageItems[currentImageIdx + 1];
          const idx = filteredGridItems.findIndex((i) => i.type === 'image' && i.id === nextItem.id);
          if (idx >= 0) setSelectedImageIndex(idx);
        };
        const handleWrapGenerate = (wrappedUrl: string, referenceImageUrlsFromModal?: string[]) => {
          const aspect = (item.aspectRatio as ImageGenerationParams['aspectRatio']) || '3:2';
          const size = (item.imageSize as ImageGenerationParams['imageSize']) || '1K';
          const model = (item.model as ImageModelId | undefined) ?? 'gemini-3-pro-image-preview';
          setWrapSettings({
            wrappedUrl,
            referenceImageUrls: referenceImageUrlsFromModal ?? item.referenceImageUrls,
          });
          setWrapAspect(aspect);
          setWrapQuality(size);
          setWrapModel(model);
        };
        return (
          <ImageModal
            imageUrl={item.url}
            thumbUrl={item.thumbUrl || item.url}
            prompt={item.prompt}
            aspectRatio={item.aspectRatio}
            imageSize={item.imageSize}
            model={item.model}
            referenceImageUrls={item.referenceImageUrls}
            onClose={handleCloseModal}
            onReusePrompt={(promptText, refUrls) => {
              handleReRun(promptText, refUrls);
            }}
            onWrapGenerate={handleWrapGenerate}
            imageId={item.id}
            onDelete={handleDeleteImage}
            onPrev={onPrev}
            onNext={onNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
          />
        );
      })()}

    </div>
      )}
    </>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<AppShell />} />
      <Route path="/app/profile" element={<AppShell />} />
      <Route path="/app/moodboards" element={<AppShell />} />
      <Route path="/app/prompts" element={<AppShell />} />
      <Route path="/app/video" element={<AppShell />} />
      <Route path="/payment/success" element={<PaymentSuccessPage />} />
    </Routes>
  );
}

export default App;
