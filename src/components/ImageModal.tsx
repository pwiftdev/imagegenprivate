import React, { useEffect, useCallback } from 'react';

interface ImageModalProps {
  imageUrl: string;
  prompt?: string;
  aspectRatio?: string;
  imageSize?: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ 
  imageUrl, 
  prompt, 
  aspectRatio, 
  imageSize, 
  onClose 
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageUrl]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      // Convert base64 to blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
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
        const file = new File([blob], 'generated-image.png', { type: 'image/png' });
        
        await navigator.share({
          files: [file],
          title: 'Generated Image',
          text: prompt || 'Check out this AI-generated image!'
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    } else {
      alert('Sharing is not supported in your browser');
    }
  }, [imageUrl, prompt]);

  const isShareSupported = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal Content */}
      <div 
        className="relative max-w-7xl max-h-[90vh] w-full mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image Container */}
        <div className="relative flex items-center justify-center bg-black/50 rounded-2xl overflow-hidden">
          <img
            src={imageUrl}
            alt="Generated image"
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>

        {/* Action Bar */}
        <div className="mt-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Image Info */}
            <div className="flex-1 min-w-[200px]">
              {prompt && (
                <p className="text-white/80 text-sm mb-1 line-clamp-2">
                  <span className="text-white/60">Prompt:</span> {prompt}
                </p>
              )}
              <div className="flex gap-3 text-xs text-white/60">
                {aspectRatio && <span>Ratio: {aspectRatio}</span>}
                {imageSize && <span>Quality: {imageSize}</span>}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {/* Download */}
              <button
                onClick={handleDownload}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm"
                title="Download image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>

              {/* Copy */}
              <button
                onClick={handleCopyToClipboard}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm"
                title="Copy to clipboard"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>

              {/* Share (if supported) */}
              {isShareSupported && (
                <button
                  onClick={handleShare}
                  className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm"
                  title="Share image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Keyboard Hint */}
        <p className="text-center text-white/40 text-xs mt-3">
          Press <kbd className="px-2 py-1 bg-white/10 rounded">ESC</kbd> to close
        </p>
      </div>
    </div>
  );
};

export default ImageModal;
