import React, { useState, useCallback, useEffect, useRef } from 'react';
import { compressImageForReference, compressImageFromUrl } from '../utils/compressImage';
import { enhancePrompt } from '../services/promptEnhancer';
import { uploadReferenceImages } from '../services/imageStorage';
import type { ImageGenerationParams, ImageModelId } from '../services/imageGeneration';
import { IMAGE_MODELS } from '../services/imageGeneration';

interface ControlPanelProps {
  onGenerate?: (params: ImageGenerationParams, batchSize: number) => void;
  isGenerating?: boolean;
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
const MAX_REFERENCE_IMAGES = 6;

const ControlPanel: React.FC<ControlPanelProps> = ({
  onGenerate,
  isGenerating = false,
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
  const [batchSize, setBatchSize] = useState(1);
  const [openPicker, setOpenPicker] = useState<'aspect' | 'quality' | 'model' | null>(null);
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

  const [isUploadingRefs, setIsUploadingRefs] = useState(false);

  const handleGenerateClick = useCallback(async () => {
    if (!onGenerate) return;

    let params: ImageGenerationParams = {
      prompt,
      aspectRatio: selectedAspectRatio,
      imageSize: selectedQuality,
      model: selectedModel,
    };

    if (referenceImagesBase64.length > 0) {
      setIsUploadingRefs(true);
      try {
        const urls = await uploadReferenceImages(referenceImagesBase64);
        params.referenceImageUrls = urls;
      } catch {
        params.referenceImages = referenceImagesBase64;
      } finally {
        setIsUploadingRefs(false);
      }
    }

    onGenerate(params, batchSize);
  }, [onGenerate, prompt, selectedAspectRatio, selectedQuality, selectedModel, referenceImagesBase64, batchSize]);

  return (
    <div className={`w-[96%] md:w-[50%] mb-8 px-1 md:px-4 ${className ?? ''}`}>
      <div className="relative">
        {/* Liquid glass effect container with blue shine */}
        <div className="relative rounded-3xl backdrop-blur-xl bg-gradient-to-b from-white/10 via-white/5 to-white/5 border border-white/20 shadow-2xl overflow-hidden">
          {/* Blue subtle shine overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-400/5 pointer-events-none"></div>
          {/* Gradient overlay for liquid effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-50 pointer-events-none"></div>
          {/* Top border highlight with blue tint */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent"></div>
          {/* Inner glow effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

          {/* Info bar */}
          <div className="relative z-10 px-6 py-3 border-b border-white/10 bg-blue-500/5 overflow-hidden">
            <div className="info-bar-shimmer" />
            <div className="relative flex items-center justify-between gap-3">
              <p className="text-white/70 text-sm flex-1">
              Describe your vision, add reference images, and pick an aspect ratio. Powered by {IMAGE_MODELS[selectedModel]}.
              </p>
              {onCloseMobile && (
                <button
                  onClick={onCloseMobile}
                  className="md:hidden flex-shrink-0 text-white/80 hover:text-white p-1"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Content */}
          <div className="relative z-10 p-6">
            {/* Reference Images Grid */}
            <div className="mb-2 py-1">
              <div
                className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
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
                      className="w-14 h-14 object-cover rounded-lg border border-white/20 backdrop-blur-sm bg-white/5 pointer-events-none"
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
                      ? 'border-white/30 cursor-pointer hover:border-white/50 bg-white/5 hover:bg-white/10'
                      : 'border-white/20 cursor-not-allowed opacity-50'
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
                  <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </label>
              </div>
              <p className="text-white/40 text-xs mt-1">
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
                  className="w-full bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4 pr-28 text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 min-h-[100px] text-sm transition-all"
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
              {/* Aspect Ratio */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenPicker(openPicker === 'aspect' ? null : 'aspect')}
                  className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 h-9 text-white text-sm cursor-pointer hover:bg-white/10 hover:border-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                >
                  <span>{selectedAspectRatio}</span>
                  <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Resolution */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenPicker(openPicker === 'quality' ? null : 'quality')}
                  className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 h-9 text-white text-sm cursor-pointer hover:bg-white/10 hover:border-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                >
                  <span>{selectedQuality}</span>
                  <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Model */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenPicker(openPicker === 'model' ? null : 'model')}
                  className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 h-9 text-white text-sm cursor-pointer hover:bg-white/10 hover:border-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                >
                  <span>{IMAGE_MODELS[selectedModel]}</span>
                  <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

                {/* Batch Size Select */}
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 h-9">
                <button
                  onClick={() => setBatchSize(Math.max(1, batchSize - 1))}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  −
                </button>
                <span className="text-white text-sm min-w-[3ch] text-center">{batchSize}</span>
                <button
                  onClick={() => setBatchSize(Math.min(8, batchSize + 1))}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  +
                </button>
              </div>

              {/* Generate Button */}
              <button
                onClick={() => void handleGenerateClick()}
                disabled={!prompt.trim() || isUploadingRefs}
                className="ml-auto bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
              >
                {(isGenerating || isUploadingRefs) ? (
                  <span>Kreating...</span>
                ) : (
                  <>
                    <span>Kreate{batchSize > 1 ? ` +${batchSize}` : ''}</span>
                  </>
                )}
              </button>
            </div>

            {/* Picker Modal */}
            {openPicker && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={() => setOpenPicker(null)}
              >
                <div
                  className="relative w-full max-w-lg mx-4 rounded-2xl backdrop-blur-xl bg-gradient-to-b from-white/15 via-white/10 to-white/5 border border-white/20 shadow-2xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-blue-400/10 pointer-events-none" />
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
                                : 'bg-white/10 text-white/80 hover:bg-blue-500/30 hover:text-white'
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
                                : 'bg-white/10 text-white/80 hover:bg-blue-500/30 hover:text-white'
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
                                : 'bg-white/10 text-white/80 hover:bg-blue-500/30 hover:text-white'
                            }`}
                          >
                            {IMAGE_MODELS[modelId]}
                          </button>
                        ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenPicker(null)}
                      className="mt-4 text-white/60 hover:text-white text-sm"
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
