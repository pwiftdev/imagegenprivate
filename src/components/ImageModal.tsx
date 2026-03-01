import React, { useEffect, useCallback, useState, useRef } from 'react';

interface ImageModalProps {
  imageUrl: string;
  prompt?: string;
  aspectRatio?: string;
  imageSize?: string;
  model?: string;
  onClose: () => void;
  onReusePrompt?: (prompt: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

const ImageModal: React.FC<ImageModalProps> = ({
  imageUrl,
  prompt,
  aspectRatio,
  imageSize,
  model,
  onClose,
  onReusePrompt,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
    setPan({ x: 0, y: 0 }); // recenter on zoom
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    },
    [zoomIn, zoomOut]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      e.preventDefault();
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    },
    [zoom, pan]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [imageUrl]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        e.preventDefault();
        onPrev();
      }
      if (e.key === 'ArrowRight' && hasNext && onNext) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

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

  const canPan = zoom > 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Desktop: full-screen layout - image fills viewport, sidebar on right */}
      <div
        className="flex flex-col md:flex-row w-full h-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image area - full size on desktop */}
        <div
          ref={containerRef}
          className={`relative flex-1 flex items-center justify-center min-h-0 overflow-hidden ${
            canPan ? 'cursor-grab' : ''
          } ${isDragging ? 'cursor-grabbing' : ''}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onDoubleClick={resetView}
          style={{ touchAction: 'none' }}
        >
          <img
            src={imageUrl}
            alt="Generated image"
            className="max-w-full max-h-full object-contain select-none pointer-events-none md:max-w-none md:max-h-full"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            draggable={false}
          />

          {/* Prev / Next arrows - sides of image area */}
          {hasPrev && onPrev && (
            <button
              onClick={onPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 rounded-xl bg-black/60 hover:bg-black/80 text-white/90 hover:text-white transition-all backdrop-blur-sm border border-white/20"
              aria-label="Previous (newer)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {hasNext && onNext && (
            <button
              onClick={onNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-12 h-12 rounded-xl bg-black/60 hover:bg-black/80 text-white/90 hover:text-white transition-all backdrop-blur-sm border border-white/20"
              aria-label="Next (older)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Zoom controls - bottom left on desktop */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-xl bg-black/60 backdrop-blur-sm p-1.5 border border-white/10">
            <button
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              aria-label="Zoom out"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-white/90 text-sm min-w-[3ch] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              aria-label="Zoom in"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
            <button
              onClick={resetView}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-white hover:bg-white/10 transition-all"
              aria-label="Reset view"
              title="Reset zoom"
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
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Sidebar - desktop: overlay/slide from right | mobile: stacked below */}
        <div className="flex flex-col w-full md:w-80 md:max-w-[90vw] md:min-w-[280px] bg-black/80 md:bg-black/60 backdrop-blur-xl md:border-l md:border-white/10 overflow-y-auto max-h-[50vh] md:max-h-full">
          <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Close - prominent at top of sidebar */}
            <div className="flex justify-end -mt-1 mb-2">
              <button
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-12 h-12 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium border border-white/30 hover:border-white/50 transition-all shadow-lg"
                aria-label="Close"
              >
                <svg
                  className="w-6 h-6"
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
            <div>
              <img
                src="/kreatorlogo.png"
                alt="Kreator"
                className="h-8 w-auto rounded-lg mb-2"
              />
              <p className="text-white/50 text-xs italic">By Kreator, for creators.</p>
            </div>

            {prompt && (
              <div>
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">
                  Prompt
                </p>
                <p className="text-white/90 text-sm leading-relaxed">{prompt}</p>
              </div>
            )}

            <div className="flex gap-4 text-sm flex-wrap">
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
              {model && (
                <div>
                  <p className="text-white/50 text-xs mb-0.5">Model</p>
                  <p className="text-white font-medium">{model}</p>
                </div>
              )}
            </div>
          </div>

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

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs hidden md:block pointer-events-none">
        <kbd className="px-2 py-0.5 bg-white/10 rounded">ESC</kbd> close · <kbd className="px-2 py-0.5 bg-white/10 rounded">←</kbd><kbd className="px-2 py-0.5 bg-white/10 rounded">→</kbd> navigate · Scroll zoom · Drag when zoomed
      </p>
    </div>
  );
};

export default ImageModal;
