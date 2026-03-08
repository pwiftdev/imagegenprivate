import React, { useState, useCallback, useEffect, useRef } from 'react';
import { compressImageForReference, compressImageFromUrl } from '../utils/compressImage';
import { enhancePrompt } from '../services/promptEnhancer';
import type { ImageGenerationParams, ImageModelId } from '../services/imageGeneration';
import { IMAGE_MODELS } from '../services/imageGeneration';
import type { VideoModelId } from '../services/videoGeneration';
import { VIDEO_MODELS } from '../services/videoGeneration';

export type CreateMode = 'image' | 'video';

interface ControlPanelProps {
  onGenerate?: (params: ImageGenerationParams, batchSize: number) => void;
  onGenerateVideo?: (params: { prompt: string; model: VideoModelId; referenceImageUrl?: string | null }) => void;
  credits?: number | null;
  promptToInject?: string | null;
  onPromptInjected?: () => void;
  referenceImageUrlToInject?: string | null;
  onReferenceImageInjected?: () => void;
  referenceImageUrlsToInject?: string[] | null;
  onReferenceImagesInjected?: () => void;
  onCloseMobile?: () => void;
  className?: string;
}

// Constants moved outside component to avoid recreation on every render
const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '3:2', '2:3', '5:4', '4:5'] as const;
const QUALITIES = ['1K', '2K', '4K'] as const;
const MODEL_IDS = Object.keys(IMAGE_MODELS) as ImageModelId[];
const VIDEO_MODEL_IDS = Object.keys(VIDEO_MODELS) as VideoModelId[];
const MAX_REFERENCE_IMAGES = 6;

const ControlPanel: React.FC<ControlPanelProps> = ({
  onGenerate,
  onGenerateVideo,
  credits,
  promptToInject,
  onPromptInjected,
  referenceImageUrlToInject,
  onReferenceImageInjected,
  referenceImageUrlsToInject,
  onReferenceImagesInjected,
  onCloseMobile,
  className,
}) => {
  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [referenceImagesBase64, setReferenceImagesBase64] = useState<string[]>([]);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<typeof ASPECT_RATIOS[number]>('3:2');
  const [selectedQuality, setSelectedQuality] = useState<typeof QUALITIES[number]>('1K');
  const [selectedModel, setSelectedModel] = useState<ImageModelId>('gemini-3-pro-image-preview');
  const [selectedVideoModel, setSelectedVideoModel] = useState<VideoModelId>('veo-3.1');
  const [createMode, setCreateMode] = useState<CreateMode>('image');
  const [batchSize, setBatchSize] = useState(1);
  const [openPicker, setOpenPicker] = useState<'aspect' | 'quality' | 'model' | 'videoModel' | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!openPicker) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPicker(null);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [openPicker]);

  useEffect(() => {
    if (promptToInject?.trim()) {
      setPrompt(promptToInject.trim());
      onPromptInjected?.();
    }
  }, [promptToInject, onPromptInjected]);

  useEffect(() => {
    if (!referenceImageUrlToInject?.trim()) return;
    (async () => {
      try {
        const base64 = await compressImageFromUrl(referenceImageUrlToInject);
        setReferenceImages(prev => {
          if (prev.length >= MAX_REFERENCE_IMAGES) return prev;
          return [...prev, referenceImageUrlToInject];
        });
        setReferenceImagesBase64(prev => {
          if (prev.length >= MAX_REFERENCE_IMAGES) return prev;
          return [...prev, base64];
        });
        onReferenceImageInjected?.();
      } catch (err) {
        console.error('Failed to add reference image:', err);
      } finally {
        onReferenceImageInjected?.();
      }
    })();
  }, [referenceImageUrlToInject, onReferenceImageInjected]);

  useEffect(() => {
    if (!referenceImageUrlsToInject?.length || !onReferenceImagesInjected) return;
    (async () => {
      const urls = referenceImageUrlsToInject;
      onReferenceImagesInjected();
      for (const url of urls) {
        if (typeof url !== 'string' || !url.startsWith('http')) continue;
        try {
          const base64 = await compressImageFromUrl(url);
          setReferenceImages(prev => {
            if (prev.length >= MAX_REFERENCE_IMAGES) return prev;
            return [...prev, url];
          });
          setReferenceImagesBase64(prev => {
            if (prev.length >= MAX_REFERENCE_IMAGES) return prev;
            return [...prev, base64];
          });
        } catch (err) {
          console.error('Failed to add reference image from Re-run:', err);
        }
      }
    })();
  }, [referenceImageUrlsToInject, onReferenceImagesInjected]);

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
    const toAdd = validFiles.slice(0, remaining);
    const newUrls = toAdd.map(f => URL.createObjectURL(f));
    objectUrlsRef.current.push(...newUrls);
    setReferenceImages(prev => [...prev, ...newUrls]);
    try {
      const base64Images = await Promise.all(toAdd.map(f => compressImageForReference(f)));
      setReferenceImagesBase64(prev => [...prev, ...base64Images]);
    } catch (err) {
      console.error('Failed to compress images:', err);
    }
  }, [referenceImages.length]);

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
      return prev.filter((_, i) => i !== index);
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
    if (createMode === 'video') {
      if (!onGenerateVideo) return;
      const refUrl = referenceImages.find((u): u is string => typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://')));
      onGenerateVideo({
        prompt,
        model: selectedVideoModel,
        referenceImageUrl: refUrl || undefined,
      });
      return;
    }

    if (!onGenerate) return;
    const params: ImageGenerationParams = {
      prompt,
      aspectRatio: selectedAspectRatio,
      imageSize: selectedQuality,
      model: selectedModel,
    };
    if (referenceImagesBase64.length > 0) {
      params.referenceImages = referenceImagesBase64;
    }
    const refUrls = referenceImages.filter((u): u is string => typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://')));
    if (refUrls.length > 0) {
      params.referenceImageUrls = refUrls;
    }
    onGenerate(params, batchSize);
  }, [createMode, onGenerate, onGenerateVideo, prompt, selectedAspectRatio, selectedQuality, selectedModel, selectedVideoModel, referenceImagesBase64, referenceImages, batchSize]);

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
            {/* Reference Images Grid + Image/Video switch on the right */}
            <div className="mb-2 py-1">
              <div
                className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!canAddMoreRefs) return;
                  const files = e.dataTransfer.files;
                  if (files.length > 0) addImagesFromFiles(Array.from(files));
                }}
              >
                {referenceImages.map((img, index) => (
                  <div
                    key={`ref-${index}-${img.slice(0, 20)}`}
                    draggable
                    className="relative flex-shrink-0 cursor-grab active:cursor-grabbing"
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(index));
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = e.dataTransfer.files;
                      if (files.length > 0 && canAddMoreRefs) {
                        addImagesFromFiles(Array.from(files));
                      } else if (files.length === 0) {
                        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        if (!Number.isNaN(from) && from !== index) reorderReferenceImages(from, index);
                      }
                    }}
                  >
                    <img
                      src={img}
                      alt={`Reference ${index + 1}`}
                      className="w-14 h-14 object-cover rounded-lg border border-white/15 bg-[#16181c]/80 pointer-events-none"
                    />
                    <button
                      onClick={() => removeReferenceImage(index)}
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-[10px] hover:bg-red-600 transition-colors border border-white/20"
                    >
                      ×
                    </button>
                  </div>
                ))}
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
                {/* Image / Video mode switch - far right */}
                <div className="flex-shrink-0 ml-auto inline-flex p-0.5 rounded-xl bg-[#16181c]/80 border border-white/15">
                  <button
                    type="button"
                    onClick={() => setCreateMode('image')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      createMode === 'image' ? 'bg-blue-500 text-white' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    Image
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateMode('video')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      createMode === 'video' ? 'bg-blue-500 text-white' : 'text-white/80 hover:text-white'
                    }`}
                  >
                    Video
                  </button>
                </div>
              </div>
              <p className="text-white/55 text-xs mt-1">
                Max {MAX_REFERENCE_IMAGES} refs · Drag to reorder · Ctrl/Cmd+V to paste
              </p>
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
                  className="w-full bg-[#16181c]/80 border border-white/15 rounded-xl p-4 pr-28 text-white placeholder-white/50 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 min-h-[100px] text-sm transition-all"
                />
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
              </div>
              {enhanceError && (
                <p className="mt-1.5 text-red-400/90 text-xs">{enhanceError}</p>
              )}
            </div>

            {/* Settings Row */}
            <div className="flex items-center gap-3 flex-wrap">
              {createMode === 'image' && (
                <>
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
                </>
              )}

              {createMode === 'video' && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenPicker(openPicker === 'videoModel' ? null : 'videoModel')}
                    className="flex items-center gap-2 bg-[#16181c]/80 border border-white/15 rounded-xl px-4 py-2 h-9 text-white text-sm cursor-pointer hover:bg-[#1a1d22]/95 hover:border-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  >
                    <span>{VIDEO_MODELS[selectedVideoModel]}</span>
                    <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}

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
                  (createMode === 'image' && typeof credits === 'number' && credits < batchSize) ||
                  (createMode === 'image' && !onGenerate) ||
                  (createMode === 'video' && !onGenerateVideo)
                }
                title={typeof credits === 'number' && createMode === 'image' && credits < batchSize ? 'Not enough credits' : undefined}
                className="ml-auto bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
              >
                <span>{createMode === 'video' ? 'Kreate video' : `Kreate${batchSize > 1 ? ` +${batchSize}` : ''}`}</span>
              </button>
            </div>

            {/* Picker for aspect ratio, resolution & model - anchored to bottom of panel */}
            {(openPicker === 'aspect' || openPicker === 'quality' || openPicker === 'model' || openPicker === 'videoModel') && (
              <div className="absolute inset-x-0 bottom-0 z-40">
                <div className="relative w-full rounded-b-3xl bg-[#111318]/75 backdrop-blur-sm border-t border-white/10 shadow-2xl overflow-hidden">
                  <div className="relative z-10 p-6">
                    <h3 className="text-white font-semibold mb-4">
                      {openPicker === 'aspect' && 'Choose aspect ratio'}
                      {openPicker === 'quality' && 'Choose resolution'}
                      {openPicker === 'model' && 'Choose AI model'}
                      {openPicker === 'videoModel' && 'Choose video model'}
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
                      {openPicker === 'videoModel' &&
                        VIDEO_MODEL_IDS.map((modelId) => (
                          <button
                            key={modelId}
                            type="button"
                            onClick={() => { setSelectedVideoModel(modelId); setOpenPicker(null); }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                              selectedVideoModel === modelId
                                ? 'bg-blue-500 text-white'
                                : 'bg-[#16181c]/80 text-white/90 hover:bg-[#1a1d22]/95 hover:text-white border border-white/10'
                            }`}
                          >
                            {VIDEO_MODELS[modelId]}
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
    </div>
  );
};

export default ControlPanel;
