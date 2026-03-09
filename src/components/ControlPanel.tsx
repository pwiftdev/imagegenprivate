import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { compressImageForReference, compressImageFromUrl } from '../utils/compressImage';
import { enhancePrompt } from '../services/promptEnhancer';
import type { ImageGenerationParams, ImageModelId } from '../services/imageGeneration';
import { IMAGE_MODELS } from '../services/imageGeneration';
import { SHOW_KREATE_PLUS } from '../constants/features';
interface MoodboardItem {
  id: string;
  name: string;
  reference_image_urls: string[];
}

interface ControlPanelProps {
  onGenerate?: (params: ImageGenerationParams, batchSize: number) => void;
  credits?: number | null;
  promptToInject?: string | null;
  onPromptInjected?: () => void;
  referenceImageUrlToInject?: string | null;
  onReferenceImageInjected?: () => void;
  referenceImageUrlsToInject?: string[] | null;
  onReferenceImagesInjected?: () => void;
  moodboards?: MoodboardItem[];
  onRequestMoodboardInjection?: (urls: string[]) => void;
  moodboardUrlsToInject?: string[] | null;
  onMoodboardInjected?: () => void;
  onCloseMobile?: () => void;
  className?: string;
}

// Constants moved outside component to avoid recreation on every render
const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '3:2', '2:3', '5:4', '4:5'] as const;
const QUALITIES = ['1K', '2K', '4K'] as const;
const MODEL_IDS = Object.keys(IMAGE_MODELS) as ImageModelId[];
const MAX_REFERENCE_IMAGES = 6;
/** Sentinel for "reserved main reference" slot when using moodboard - first slot stays empty for user's main ref */
const RESERVED_MAIN = '__RESERVED_MAIN__';

const ControlPanel: React.FC<ControlPanelProps> = ({
  onGenerate,
  credits,
  promptToInject,
  onPromptInjected,
  referenceImageUrlToInject,
  onReferenceImageInjected,
  referenceImageUrlsToInject,
  onReferenceImagesInjected,
  moodboards = [],
  onRequestMoodboardInjection,
  moodboardUrlsToInject,
  onMoodboardInjected,
  onCloseMobile,
  className,
}) => {
  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [referenceImagesBase64, setReferenceImagesBase64] = useState<string[]>([]);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<typeof ASPECT_RATIOS[number]>('3:2');
  const [selectedQuality, setSelectedQuality] = useState<typeof QUALITIES[number]>('1K');
  const [selectedModel, setSelectedModel] = useState<ImageModelId>('gemini-3-pro-image-preview');
  const [batchSize, setBatchSize] = useState(1);
  const [openPicker, setOpenPicker] = useState<'aspect' | 'quality' | 'model' | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [enlargedRefUrl, setEnlargedRefUrl] = useState<string | null>(null);
  const [useMoodboardModalOpen, setUseMoodboardModalOpen] = useState(false);
  const [moodboardInUse, setMoodboardInUse] = useState(false);
  
  const objectUrlsRef = useRef<string[]>([]);

  const MOODBOARD_PROMPT_PREFIX = 'First reference photo is the main reference. All other reference images are moodboard, to help you reach the final output for the prompt. ';

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEnlargedRefUrl(null);
        setOpenPicker(null);
        setUseMoodboardModalOpen(false);
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, []);

  useEffect(() => {
    if (promptToInject?.trim()) {
      setPrompt(promptToInject.trim());
      onPromptInjected?.();
    }
  }, [promptToInject, onPromptInjected]);

  useEffect(() => {
    if (!referenceImageUrlToInject?.trim()) return;
    const url = referenceImageUrlToInject.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      onReferenceImageInjected?.();
      return;
    }
    onReferenceImageInjected?.();
    (async () => {
      try {
        const base64 = await compressImageFromUrl(url);
        let didAdd = false;
        setReferenceImages(prev => {
          if (prev.includes(url) || prev.length >= MAX_REFERENCE_IMAGES) return prev;
          didAdd = true;
          return [...prev, url];
        });
        if (didAdd) {
          setReferenceImagesBase64(prev => (prev.length >= MAX_REFERENCE_IMAGES ? prev : [...prev, base64]));
        }
      } catch (err) {
        console.error('Failed to add reference image:', err);
      }
    })();
  }, [referenceImageUrlToInject, onReferenceImageInjected]);

  useEffect(() => {
    if (!referenceImageUrlsToInject?.length || !onReferenceImagesInjected) return;
    const urls = [...new Set(
      referenceImageUrlsToInject.filter(
        (u): u is string =>
          typeof u === 'string' &&
          (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('blob:'))
      )
    )].slice(0, MAX_REFERENCE_IMAGES);
    if (urls.length === 0) {
      onReferenceImagesInjected();
      return;
    }
    onReferenceImagesInjected();
    (async () => {
      const newUrls: string[] = [];
      const newBase64: string[] = [];
      for (const url of urls) {
        try {
          const base64 = await compressImageFromUrl(url);
          newUrls.push(url);
          newBase64.push(base64);
        } catch (err) {
          console.error('Failed to add reference image from Re-run:', err);
        }
      }
      if (newUrls.length > 0) {
        setReferenceImages(newUrls);
        setReferenceImagesBase64(newBase64);
      }
    })();
  }, [referenceImageUrlsToInject, onReferenceImagesInjected]);

  // Moodboard injection: leave first slot empty for main reference, inject moodboard images in slots 1+
  useEffect(() => {
    if (!moodboardUrlsToInject?.length || !onMoodboardInjected) return;
    const urls = [...new Set(moodboardUrlsToInject.filter((u): u is string => typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))))].slice(0, MAX_REFERENCE_IMAGES - 1); // -1 for reserved slot
    if (urls.length === 0) {
      onMoodboardInjected();
      return;
    }
    setMoodboardInUse(true);
    onMoodboardInjected();
    (async () => {
      const newUrls: string[] = [RESERVED_MAIN];
      const newBase64: string[] = ['']; // reserved slot has no base64
      for (const url of urls) {
        try {
          const base64 = await compressImageFromUrl(url);
          newUrls.push(url);
          newBase64.push(base64);
        } catch (err) {
          console.error('Failed to add moodboard reference image:', err);
        }
      }
      setReferenceImages(newUrls);
      setReferenceImagesBase64(newBase64);
    })();
  }, [moodboardUrlsToInject, onMoodboardInjected]);

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const addImagesFromFiles = useCallback(async (files: File[]) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;
    const remaining = MAX_REFERENCE_IMAGES - referenceImages.length;
    if (remaining <= 0) return;
    const hasReserved = referenceImages[0] === RESERVED_MAIN;
    const toAdd = validFiles.slice(0, remaining);
    const newUrls = toAdd.map(f => URL.createObjectURL(f));
    objectUrlsRef.current.push(...newUrls);
    setReferenceImages(prev => {
      if (hasReserved && prev[0] === RESERVED_MAIN) {
        // Replace reserved slot with first image (main ref), append rest
        return [newUrls[0], ...prev.slice(1), ...newUrls.slice(1)];
      }
      return [...prev, ...newUrls];
    });
    try {
      const base64Images = await Promise.all(toAdd.map(f => compressImageForReference(f)));
      setReferenceImagesBase64(prev => {
        if (hasReserved && prev[0] === '') {
          return [base64Images[0], ...prev.slice(1), ...base64Images.slice(1)];
        }
        return [...prev, ...base64Images];
      });
    } catch (err) {
      console.error('Failed to compress images:', err);
    }
  }, [referenceImages.length, referenceImages]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await addImagesFromFiles(Array.from(files));
      e.target.value = '';
    }
  }, [addImagesFromFiles]);

  const removeReferenceImage = useCallback((index: number) => {
    setReferenceImages(prev => {
      const urlToRemove = prev[index];
      if (urlToRemove?.startsWith('blob:')) {
        URL.revokeObjectURL(urlToRemove);
        objectUrlsRef.current = objectUrlsRef.current.filter(url => url !== urlToRemove);
      }
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setMoodboardInUse(false);
      return next;
    });
    setReferenceImagesBase64(prev => prev.filter((_, i) => i !== index));
  }, []);

  const reorderReferenceImages = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setReferenceImages(prev => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
    setReferenceImagesBase64(prev => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  }, []);

  // Paste from clipboard (Ctrl+V / Cmd+V) - skip when typing in prompt
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const target = document.activeElement as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
      if (imageItems.length === 0) return;
      e.preventDefault();
      const files = imageItems.map(item => item.getAsFile()).filter((f): f is File => f != null);
      if (files.length > 0) addImagesFromFiles(files);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addImagesFromFiles]);

  const canAddMoreRefs = referenceImages.length < MAX_REFERENCE_IMAGES;

  const handleEnhanceClick = useCallback(async () => {
    const text = prompt.trim();
    if (!text) return;
    setIsEnhancing(true);
    setEnhanceError(null);
    try {
      const enhanced = await enhancePrompt(text);
      setPrompt(enhanced);
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : 'Failed to enhance prompt');
    } finally {
      setIsEnhancing(false);
    }
  }, [prompt]);

  const handleGenerateClick = useCallback(() => {
    if (!onGenerate) return;
    const hasMainRef = referenceImages[0] !== RESERVED_MAIN;
    const realRefCount = referenceImages.filter(u => u !== RESERVED_MAIN).length;
    const promptWithMoodboard = moodboardInUse && hasMainRef && realRefCount > 1
      ? MOODBOARD_PROMPT_PREFIX + prompt
      : prompt;
    const params: ImageGenerationParams = {
      prompt: promptWithMoodboard,
      aspectRatio: selectedAspectRatio,
      imageSize: selectedQuality,
      model: selectedModel,
    };
    const base64Filtered = referenceImagesBase64.filter((_, i) => referenceImages[i] !== RESERVED_MAIN);
    if (base64Filtered.length > 0) {
      params.referenceImages = base64Filtered;
    }
    const refUrls = referenceImages.filter((u): u is string => typeof u === 'string' && u !== RESERVED_MAIN && (u.startsWith('http://') || u.startsWith('https://')));
    if (refUrls.length > 0) {
      params.referenceImageUrls = refUrls;
    }
    onGenerate(params, batchSize);
  }, [onGenerate, prompt, selectedAspectRatio, selectedQuality, selectedModel, referenceImagesBase64, referenceImages, batchSize, moodboardInUse]);

  return (
    <div className={`w-[96%] md:w-[50%] mb-8 px-1 md:px-4 ${className ?? ''}`}>
      <div className="relative">
        {/* Dark panel with visible transparency */}
        <div className="relative rounded-3xl bg-[#0c0d0f]/70 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Subtle top edge */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

          {/* Info bar - dark, readable, brand gradient accent */}
          <div className="relative z-10 px-6 py-3 border-b border-white/10 bg-[#111318]/75 backdrop-blur-sm overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-px control-panel-bar-gradient" />
            <div className="flex items-center justify-between gap-3 relative">
              <p className="text-white/90 text-sm flex-1">
              Describe your <span className="dashboard-title-gradient font-semibold">vision</span>, add reference images, and pick an aspect ratio. All flagship models available!
              </p>
              {onCloseMobile && (
                <button
                  onClick={onCloseMobile}
                  className="flex-shrink-0 text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Minimize"
                  title="Minimize"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Content - transparency */}
          <div className="relative z-10 p-6 bg-[#0c0d0f]/65 backdrop-blur-sm">
            {/* Reference Images Grid */}
            <div className="mb-2 py-1">
              <div
                className="flex items-center gap-3 flex-wrap"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!canAddMoreRefs) return;
                  const files = e.dataTransfer.files;
                  if (files.length > 0) addImagesFromFiles(Array.from(files));
                }}
              >
                <div className="flex flex-1 min-w-0 items-start gap-4">
                {moodboardInUse ? (
                  <div className="flex items-start gap-4 w-full">
                    {/* Main reference */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <span className="text-white/50 text-[11px] font-medium uppercase tracking-wider">Main reference</span>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
                        {referenceImages[0] === RESERVED_MAIN ? (
                          <label
                            className={`flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center transition-all cursor-pointer ${
                              canAddMoreRefs
                                ? 'border-blue-500/40 bg-blue-500/10 hover:border-blue-500/60 hover:bg-blue-500/15'
                                : 'border-white/15 opacity-50 cursor-not-allowed'
                            }`}
                            title="Upload your main reference image"
                          >
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                              disabled={!canAddMoreRefs}
                            />
                            <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </label>
                        ) : (
                          <div className="relative flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setEnlargedRefUrl(referenceImages[0])}
                              className="block w-20 h-20 rounded-xl border border-white/15 bg-[#16181c] overflow-hidden hover:ring-2 hover:ring-blue-500/50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              title="View larger"
                            >
                              <img
                                src={referenceImages[0]}
                                alt="Main reference"
                                className="w-full h-full object-cover pointer-events-none"
                              />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeReferenceImage(0); }}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 shadow-lg"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Moodboard group */}
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <span className="text-white/50 text-[11px] font-medium uppercase tracking-wider flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Moodboard
                      </span>
                      <div className="relative flex items-center gap-2 p-2.5 pr-10 rounded-xl bg-white/[0.03] border border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            setReferenceImages([]);
                            setReferenceImagesBase64([]);
                            setMoodboardInUse(false);
                            objectUrlsRef.current.forEach(url => {
                              if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                            });
                            objectUrlsRef.current = [];
                          }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                          title="Exit moodboard"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        {referenceImages.slice(1).map((img, i) => {
                          const index = i + 1;
                          return (
                            <div key={`mood-${index}-${img.slice(0, 20)}`} className="relative shrink-0">
                              <button
                                type="button"
                                onClick={() => setEnlargedRefUrl(img)}
                                className="block w-20 h-20 rounded-xl border border-white/15 overflow-hidden hover:ring-2 hover:ring-blue-500/50 transition-all focus:outline-none"
                                title="View larger"
                              >
                                <img src={img} alt={`Moodboard ${index}`} className="w-full h-full object-cover pointer-events-none" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeReferenceImage(index); }}
                                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] hover:bg-red-600 shadow"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                        {referenceImages.length > 1 && referenceImages.length < MAX_REFERENCE_IMAGES && (
                          <label className="shrink-0 w-20 h-20 rounded-xl border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-blue-500/50 hover:bg-white/5 transition-all" title="Add to moodboard">
                            <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                            <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Default layout when no moodboard */
                  <div className="flex items-center gap-1.5 w-full flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-1 min-w-0">
                    {referenceImages.map((img, index) => {
                      const isReserved = img === RESERVED_MAIN;
                      return (
                        <div
                          key={isReserved ? `reserved-${index}` : `ref-${index}-${img.slice(0, 20)}`}
                          draggable={!isReserved}
                          className={`relative flex-shrink-0 ${isReserved ? '' : 'cursor-grab active:cursor-grabbing'}`}
                          onDragStart={!isReserved ? (e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', String(index));
                          } : undefined}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const files = e.dataTransfer.files;
                            if (files.length > 0 && canAddMoreRefs) {
                              addImagesFromFiles(Array.from(files));
                            } else if (files.length === 0 && !isReserved) {
                              const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                              const toIndex = index;
                              if (!Number.isNaN(from) && from !== toIndex && referenceImages[from] !== RESERVED_MAIN && referenceImages[toIndex] !== RESERVED_MAIN) {
                                reorderReferenceImages(from, toIndex);
                              }
                            }
                          }}
                        >
                          {isReserved ? (
                            <label
                              className={`flex-shrink-0 w-14 h-14 border-2 border-dashed rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                canAddMoreRefs
                                  ? 'border-blue-400/40 bg-blue-500/10 hover:border-blue-500/60 hover:bg-blue-500/15'
                                  : 'border-white/15 opacity-50 cursor-not-allowed'
                              }`}
                              title="Main reference (required)"
                            >
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={!canAddMoreRefs}
                              />
                              <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            </label>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setEnlargedRefUrl(img)}
                                className="block w-14 h-14 rounded-lg border border-white/15 bg-[#16181c]/80 overflow-hidden hover:ring-2 hover:ring-blue-500/50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                title="View larger"
                              >
                                <img
                                  src={img}
                                  alt={`Reference ${index + 1}`}
                                  className="w-full h-full object-cover pointer-events-none"
                                />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeReferenceImage(index);
                                }}
                                className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-[10px] hover:bg-red-600 transition-colors border border-white/20"
                              >
                                ×
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                      <label
                        className={`flex-shrink-0 w-14 h-14 border-2 border-dashed rounded-lg flex items-center justify-center transition-all ${
                          canAddMoreRefs
                            ? 'border-white/25 cursor-pointer hover:border-blue-500/50 bg-[#16181c]/80 hover:bg-[#1a1d22]/95'
                            : 'border-white/15 cursor-not-allowed opacity-50 bg-[#16181c]/80'
                        }`}
                        title={canAddMoreRefs ? 'Add reference images (max 6)' : 'Max 6 reference images'}
                      >
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={!canAddMoreRefs}
                        />
                        <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </label>
                    </div>
                    </div>
                )}
                </div>
              </div>
              {!moodboardInUse && (
              <p className="text-white/55 text-xs mt-1">
                Max {MAX_REFERENCE_IMAGES} refs · Drag to reorder · Ctrl/Cmd+V to paste
              </p>
            )}
            </div>

            {/* Prompt Input */}
            <div className="mb-4">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => { setPrompt(e.target.value); setEnhanceError(null); }}
                  placeholder="Enter your prompt here..."
                  spellCheck
                  lang="en"
                  className={`w-full bg-[#16181c]/80 border border-white/15 rounded-xl p-4 ${SHOW_KREATE_PLUS ? 'pr-28' : 'pr-4'} text-white placeholder-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 min-h-[100px] text-sm transition-all`}
                />
                {SHOW_KREATE_PLUS && (
                  <button
                    type="button"
                    onClick={handleEnhanceClick}
                    disabled={!prompt.trim() || isEnhancing}
                    className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-500/20"
                    title="Enhance prompt with AI"
                  >
                    {isEnhancing ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-amber-400/50 border-t-amber-300" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    Kreate+
                  </button>
                )}
              </div>
              {SHOW_KREATE_PLUS && enhanceError && (
                <p className="mt-1.5 text-red-400/90 text-xs">{enhanceError}</p>
              )}
            </div>

            {/* Settings Row */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Moodboard toggle - inline left */}
              {moodboards.length > 0 && onRequestMoodboardInjection && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={moodboardInUse}
                  aria-label="Moodboard"
                  onClick={() => {
                    if (moodboardInUse) {
                      setReferenceImages([]);
                      setReferenceImagesBase64([]);
                      setMoodboardInUse(false);
                      objectUrlsRef.current.forEach(url => {
                        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                      });
                      objectUrlsRef.current = [];
                    } else {
                      setUseMoodboardModalOpen(true);
                    }
                  }}
                  className="flex items-center gap-2 flex-shrink-0"
                >
                  <span className="text-sm font-medium text-white/80">Moodboard</span>
                  <span
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#0c0d0f] ${
                      moodboardInUse
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                        : 'bg-white/15 hover:bg-white/20'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        moodboardInUse ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                </button>
              )}
              {/* Aspect Ratio */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenPicker(openPicker === 'aspect' ? null : 'aspect')}
                  className="flex items-center gap-2 bg-[#16181c]/80 border border-white/15 rounded-xl px-4 py-2 h-9 text-white text-sm cursor-pointer hover:bg-[#1a1d22]/95 hover:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                >
                  <span>{selectedAspectRatio}</span>
                  <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Resolution */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenPicker(openPicker === 'quality' ? null : 'quality')}
                  className="flex items-center gap-2 bg-[#16181c]/80 border border-white/15 rounded-xl px-4 py-2 h-9 text-white text-sm cursor-pointer hover:bg-[#1a1d22]/95 hover:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                >
                  <span>{selectedQuality}</span>
                  <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Model */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenPicker(openPicker === 'model' ? null : 'model')}
                  className="flex items-center gap-2 bg-[#16181c]/80 border border-white/15 rounded-xl px-4 py-2 h-9 text-white text-sm cursor-pointer hover:bg-[#1a1d22]/95 hover:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                >
                  <span>{IMAGE_MODELS[selectedModel]}</span>
                  <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

                {/* Batch Size Select */}
              <div className="flex items-center gap-2 bg-[#16181c]/80 border border-white/15 rounded-xl px-4 py-2 h-9">
                <button
                  onClick={() => setBatchSize(Math.max(1, batchSize - 1))}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  −
                </button>
                <span className="text-white text-sm min-w-[3ch] text-center">{batchSize}</span>
                <button
                  onClick={() => setBatchSize(Math.min(8, batchSize + 1))}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  +
                </button>
              </div>

              {/* Credits display + Generate Button */}
              {typeof credits === 'number' && (
                <span className="text-white/90 text-sm">
                  {credits} credits
                </span>
              )}
              <button
                onClick={() => void handleGenerateClick()}
                disabled={
                  !prompt.trim() ||
                  (typeof credits === 'number' && credits < batchSize) ||
                  !onGenerate
                }
                title={typeof credits === 'number' && credits < batchSize ? 'Not enough credits' : undefined}
                className="ml-auto bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
              >
                <span>{`Kreate${batchSize > 1 ? ` +${batchSize}` : ''}`}</span>
              </button>
            </div>

            {/* Picker for aspect ratio, resolution & model - anchored to bottom of panel */}
            {(openPicker === 'aspect' || openPicker === 'quality' || openPicker === 'model') && (
              <div className="absolute inset-x-0 bottom-0 z-40">
                <div className="relative w-full rounded-b-3xl bg-[#111318]/75 backdrop-blur-sm border-t border-white/10 shadow-2xl overflow-hidden">
                  <div className="relative z-10 p-6">
                    <h3 className="text-white font-semibold mb-4">
                      {openPicker === 'aspect' && 'Choose aspect ratio'}
                      {openPicker === 'quality' && 'Choose resolution'}
                      {openPicker === 'model' && 'Choose AI model'}
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {openPicker === 'aspect' &&
                        ASPECT_RATIOS.map((ratio) => (
                          <button
                            key={ratio}
                            type="button"
                            onClick={() => { setSelectedAspectRatio(ratio); setOpenPicker(null); }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                              selectedAspectRatio === ratio
                                ? 'bg-blue-500 text-white'
                                : 'bg-[#16181c]/80 text-white/90 hover:bg-[#1a1d22]/95 hover:text-white border border-white/10'
                            }`}
                          >
                            {ratio}
                          </button>
                        ))}
                      {openPicker === 'quality' &&
                        QUALITIES.map((quality) => (
                          <button
                            key={quality}
                            type="button"
                            onClick={() => { setSelectedQuality(quality); setOpenPicker(null); }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                              selectedQuality === quality
                                ? 'bg-blue-500 text-white'
                                : 'bg-[#16181c]/80 text-white/90 hover:bg-[#1a1d22]/95 hover:text-white border border-white/10'
                            }`}
                          >
                            {quality}
                          </button>
                        ))}
                      {openPicker === 'model' &&
                        MODEL_IDS.map((modelId) => (
                          <button
                            key={modelId}
                            type="button"
                            onClick={() => { setSelectedModel(modelId); setOpenPicker(null); }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                              selectedModel === modelId
                                ? 'bg-blue-500 text-white'
                                : 'bg-[#16181c]/80 text-white/90 hover:bg-[#1a1d22]/95 hover:text-white border border-white/10'
                            }`}
                          >
                            {IMAGE_MODELS[modelId]}
                          </button>
                        ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenPicker(null)}
                      className="mt-4 text-white/70 hover:text-white text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Use Moodboard modal - portal to body */}
      {useMoodboardModalOpen && moodboards.length > 0 && onRequestMoodboardInjection && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setUseMoodboardModalOpen(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setUseMoodboardModalOpen(false)}
          aria-label="Close"
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-[#0d0e10] border border-white/10 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="px-6 py-4 text-lg font-semibold text-white border-b border-white/10">Select moodboard</h3>
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
              {moodboards.filter((m) => m.reference_image_urls.length > 0).map((mb) => (
                <button
                  key={mb.id}
                  type="button"
                  onClick={() => {
                    onRequestMoodboardInjection(mb.reference_image_urls);
                    setUseMoodboardModalOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors"
                >
                  <div className="flex gap-1 flex-shrink-0">
                    {mb.reference_image_urls.slice(0, 3).map((url, i) => (
                      <div key={i} className="w-10 h-10 rounded-lg overflow-hidden">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <span className="font-medium text-white truncate flex-1">{mb.name}</span>
                  <span className="text-white/50 text-sm">{mb.reference_image_urls.length} refs</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setUseMoodboardModalOpen(false)}
              className="w-full px-6 py-3 text-sm font-medium text-white/70 hover:text-white border-t border-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Enlarged reference photo lightbox - portal to body so fixed covers viewport */}
      {enlargedRefUrl && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-12 bg-black/95 backdrop-blur-md"
          onClick={() => setEnlargedRefUrl(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setEnlargedRefUrl(null)}
          aria-label="Close"
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] rounded-xl overflow-hidden ring-1 ring-white/10 shadow-[0_0_80px_rgba(59,130,246,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={enlargedRefUrl}
              alt="Reference (enlarged)"
              className="max-w-full max-h-[85vh] object-contain block"
            />
          </div>
          <button
            type="button"
            onClick={() => setEnlargedRefUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90 hover:text-white transition-all backdrop-blur-sm border border-white/20"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">Click outside or press ESC to close</p>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ControlPanel;
