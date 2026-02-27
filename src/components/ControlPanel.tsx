import React, { useState, useCallback, useEffect, useRef } from 'react';
import { compressImageForReference } from '../utils/compressImage';
import type { ImageGenerationParams } from '../services/imageGeneration';

interface ControlPanelProps {
  onGenerate?: (params: ImageGenerationParams, batchSize: number) => void;
  isGenerating?: boolean;
}

// Constants moved outside component to avoid recreation on every render
const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '3:2', '2:3', '5:4', '4:5'] as const;
const QUALITIES = ['1K', '2K', '4K'] as const;

const ControlPanel: React.FC<ControlPanelProps> = ({ onGenerate, isGenerating = false }) => {
  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [referenceImagesBase64, setReferenceImagesBase64] = useState<string[]>([]);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<typeof ASPECT_RATIOS[number]>('3:2');
  const [selectedQuality, setSelectedQuality] = useState<typeof QUALITIES[number]>('1K');
  const [batchSize, setBatchSize] = useState(1);
  
  const objectUrlsRef = useRef<string[]>([]);

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
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-[70%] mb-8 z-50">
      <div className="relative">
        {/* Liquid glass effect container */}
        <div className="relative rounded-3xl p-6 backdrop-blur-xl bg-gradient-to-b from-white/10 via-white/5 to-white/5 border border-white/20 shadow-2xl overflow-hidden">
          {/* Gradient overlay for liquid effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-50"></div>
          
          {/* Top border highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
          
          {/* Inner glow effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
          
          {/* Content */}
          <div className="relative z-10">
            {/* Reference Images Grid */}
            <div className="mb-4">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {referenceImages.map((img, index) => (
                  <div key={`ref-${index}-${img.slice(0, 20)}`} className="relative flex-shrink-0">
                    <img
                      src={img}
                      alt={`Reference ${index + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border border-white/20 backdrop-blur-sm bg-white/5"
                    />
                    <button
                      onClick={() => removeReferenceImage(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600 transition-colors border border-white/20"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <label className="flex-shrink-0 w-16 h-16 border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-white/50 transition-all bg-white/5 backdrop-blur-sm hover:bg-white/10">
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
              {/* Model (locked) */}
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl pl-3 pr-4 py-2 text-white text-sm">
                <span className="text-green-400 font-bold text-xs">G</span>
                <span>G Nano Banana Pro</span>
              </div>

              {/* Aspect Ratio Select */}
              <div className="relative">
                <select
                  value={selectedAspectRatio}
                  onChange={(e) => setSelectedAspectRatio(e.target.value as typeof ASPECT_RATIOS[number])}
                  className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 text-white text-sm cursor-pointer hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 appearance-none pr-8 transition-all"
                >
                  {ASPECT_RATIOS.map((ratio) => (
                    <option key={ratio} value={ratio} className="bg-gray-900">
                      {ratio}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Quality Select */}
              <div className="relative">
                <select
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(e.target.value as typeof QUALITIES[number])}
                  className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 text-white text-sm cursor-pointer hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 appearance-none pr-8 transition-all"
                >
                  {QUALITIES.map((quality) => (
                    <option key={quality} value={quality} className="bg-gray-900">
                      {quality}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Batch Size Select */}
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2">
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
                className="ml-auto bg-lime-500 hover:bg-lime-600 text-black font-semibold px-6 py-2 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-lime-500/30 hover:shadow-lime-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-lime-500"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-black/30 border-t-black"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span>Generate +{batchSize}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
