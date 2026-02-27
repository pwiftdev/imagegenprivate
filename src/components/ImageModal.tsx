import React, { useEffect, useCallback } from 'react';

interface ImageModalProps {
  imageUrl: string;
  prompt?: string;
  aspectRatio?: string;
  imageSize?: string;
  onClose: () => void;
  onReusePrompt?: (prompt: string) => void;
}

const ImageModal: React.FC<ImageModalProps> = ({
  imageUrl,
  prompt,
  aspectRatio,
  imageSize,
  onClose,
  onReusePrompt,
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  }, [imageUrl]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      alert('Image copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy image:', error);
      alert('Failed to copy image to clipboard');
    }
  }, [imageUrl]);

  const handleShare = useCallback(async () => {
    if (typeof navigator.share === 'function') {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'generated-image.png', {
          type: 'image/png',
        });
        await navigator.share({
          files: [file],
          title: 'Generated Image',
          text: prompt || 'Check out this AI-generated image!',
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    } else {
      alert('Sharing is not supported in your browser');
    }
  }, [imageUrl, prompt]);

  const handleReusePrompt = useCallback(() => {
    if (prompt?.trim() && onReusePrompt) {
      onReusePrompt(prompt.trim());
      onClose();
    }
  }, [prompt, onReusePrompt, onClose]);

  const isShareSupported =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 md:p-4"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col md:flex-row max-w-5xl w-full max-h-[90vh] bg-black/60 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable content - mobile: 1 col stack, desktop: side by side */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto">
          {/* 1. Image */}
          <div className="relative flex-shrink-0 flex items-center justify-center min-w-0 p-4 md:flex-1 md:p-6">
            <img
              src={imageUrl}
              alt="Generated image"
              className="max-w-full max-h-[50vh] md:max-h-[80vh] object-contain rounded-xl"
            />
            {/* Close button - overlaps image, same border radius */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-20 flex items-center justify-center w-9 h-9 rounded-xl bg-black/60 hover:bg-black/80 text-white/90 hover:text-white transition-all"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 2. Info + 3. Buttons - desktop: sidebar | mobile: stacked below image */}
          <div className="flex flex-col md:w-80 md:flex-shrink-0 md:border-l md:border-white/10">
            {/* Info */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Branding */}
              <div>
                <img
                  src="/kreatorlogo.png"
                  alt="Kreator"
                  className="h-8 w-auto rounded-lg mb-2"
                />
                <p className="text-white/50 text-xs italic">By Kreator, for creators.</p>
              </div>

              {/* Prompt */}
              {prompt && (
                <div>
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">
                    Prompt
                  </p>
                  <p className="text-white/90 text-sm leading-relaxed">{prompt}</p>
                </div>
              )}

              {/* Meta */}
              <div className="flex gap-4 text-sm">
                {aspectRatio && (
                  <div>
                    <p className="text-white/50 text-xs mb-0.5">Ratio</p>
                    <p className="text-white font-medium">{aspectRatio}</p>
                  </div>
                )}
                {imageSize && (
                  <div>
                    <p className="text-white/50 text-xs mb-0.5">Quality</p>
                    <p className="text-white font-medium">{imageSize}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 p-4 border-t border-white/10 space-y-2">
              <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download
              </button>
              <button
                onClick={handleCopyToClipboard}
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </button>
              </div>
              {isShareSupported && (
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share
              </button>
              )}
              {prompt?.trim() && onReusePrompt && (
              <button
                onClick={handleReusePrompt}
                className="w-full flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Reuse prompt
              </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs hidden md:block">
        Press <kbd className="px-2 py-0.5 bg-white/10 rounded">ESC</kbd> to close
      </p>
    </div>
  );
};

export default ImageModal;
