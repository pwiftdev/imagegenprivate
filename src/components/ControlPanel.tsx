import React, { useState, useCallback, useEffect, useRef } from 'react';
import { compressImageForReference } from '../utils/compressImage';
import type { ImageGenerationParams } from '../services/imageGeneration';

interface ControlPanelProps {
  onGenerate?: (params: ImageGenerationParams, batchSize: number) => void;
  isGenerating?: boolean;
  promptToInject?: string | null;
  onPromptInjected?: () => void;
}

// Constants moved outside component to avoid recreation on every render
const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '3:2', '2:3', '5:4', '4:5'] as const;
const QUALITIES = ['1K', '2K', '4K'] as const;

const ControlPanel: React.FC<ControlPanelProps> = ({
  onGenerate,
  isGenerating = false,
  promptToInject,
  onPromptInjected,
}) => {
  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [referenceImagesBase64, setReferenceImagesBase64] = useState<string[]>([]);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<typeof ASPECT_RATIOS[number]>('3:2');
  const [selectedQuality, setSelectedQuality] = useState<typeof QUALITIES[number]>('1K');
  const [batchSize, setBatchSize] = useState(1);
  const [openPicker, setOpenPicker] = useState<'aspect' | 'quality' | null>(null);
  
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

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const filesArray = Array.from(files);
      
      // Create object URLs for display
      const newImages = filesArray.map(file => URL.createObjectURL(file));
      objectUrlsRef.current.push(...newImages);
      setReferenceImages(prev => [...prev, ...newImages]);
      
      // Compress and convert to base64 (stays under Vercel's 4.5MB limit)
      try {
        const base64Images = await Promise.all(filesArray.map(file => compressImageForReference(file)));
        setReferenceImagesBase64(prev => [...prev, ...base64Images]);
      } catch (error) {
        console.error('Failed to convert images to base64:', error);
      }
    }
    // Reset input to allow selecting the same file again
    e.target.value = '';
  }, []);

  const removeReferenceImage = useCallback((index: number) => {
    setReferenceImages(prev => {
      const urlToRemove = prev[index];
      // Clean up object URL
      if (urlToRemove && urlToRemove.startsWith('blob:')) {
        URL.revokeObjectURL(urlToRemove);
        objectUrlsRef.current = objectUrlsRef.current.filter(url => url !== urlToRemove);
      }
      return prev.filter((_, i) => i !== index);
    });
    
    // Also remove from base64 array
    setReferenceImagesBase64(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleGenerateClick = useCallback(() => {
    if (!onGenerate) return;

    const params: ImageGenerationParams = {
      prompt,
      aspectRatio: selectedAspectRatio,
      imageSize: selectedQuality,
      referenceImages: referenceImagesBase64.length > 0 ? referenceImagesBase64 : undefined
    };

    onGenerate(params, batchSize);
  }, [onGenerate, prompt, selectedAspectRatio, selectedQuality, referenceImagesBase64, batchSize]);

  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-[90%] md:w-[50%] mb-8 z-50">
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
            <p className="relative text-white/70 text-sm">
              Describe your vision, add reference images, and pick an aspect ratio. Powered by Nano Banana Pro.
            </p>
          </div>
          
          {/* Content */}
          <div className="relative z-10 p-6">
            {/* Reference Images Grid */}
            <div className="mb-2 py-1">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {referenceImages.map((img, index) => (
                  <div key={`ref-${index}-${img.slice(0, 20)}`} className="relative flex-shrink-0">
                    <img
                      src={img}
                      alt={`Reference ${index + 1}`}
                      className="w-14 h-14 object-cover rounded-lg border border-white/20 backdrop-blur-sm bg-white/5"
                    />
                    <button
                      onClick={() => removeReferenceImage(index)}
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-[10px] hover:bg-red-600 transition-colors border border-white/20"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <label className="flex-shrink-0 w-14 h-14 border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-white/50 transition-all bg-white/5 backdrop-blur-sm hover:bg-white/10">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </label>
              </div>
            </div>

            {/* Prompt Input */}
            <div className="mb-4">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here..."
                className="w-full bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 min-h-[100px] text-sm transition-all"
              />
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

              {/* Model (locked) */}
<div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl pl-3 pr-4 py-2 h-9 text-white text-sm">
                <span>Nano Banana Pro</span>
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
                onClick={handleGenerateClick}
                disabled={!prompt.trim()}
                className="ml-auto bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                    <span>Kreating...</span>
                  </>
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
                      {openPicker === 'aspect' ? 'Choose aspect ratio' : 'Choose resolution'}
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {openPicker === 'aspect'
                        ? ASPECT_RATIOS.map((ratio) => (
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
                          ))
                        : QUALITIES.map((quality) => (
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
