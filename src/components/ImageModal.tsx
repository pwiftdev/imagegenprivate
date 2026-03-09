import React, { useEffect, useCallback, useState, useRef } from 'react';

interface ImageModalProps {
  imageUrl: string;
  prompt?: string;
  aspectRatio?: string;
  imageSize?: string;
  model?: string;
  referenceImageUrls?: string[];
  onClose: () => void;
  onReusePrompt?: (prompt: string, referenceImageUrls?: string[]) => void;
  onWrapGenerate?: (wrappedUrl: string, referenceImageUrls?: string[]) => void;
  onDelete?: (imageId: string) => void | Promise<void>;
  imageId?: string;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

/** Must match ControlPanel MOODBOARD_PROMPT_PREFIX - used to detect moodboard-generated images */
const MOODBOARD_PROMPT_PREFIX = 'First reference photo is the main reference. All other reference images are moodboard, to help you reach the final output for the prompt. ';

const ImageModal: React.FC<ImageModalProps> = ({
  imageUrl,
  prompt,
  aspectRatio,
  imageSize,
  model,
  referenceImageUrls,
  onClose,
  onReusePrompt,
  onWrapGenerate,
  onDelete,
  imageId,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  type Annotation = {
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
  };

  const [isAnnotating, setIsAnnotating] = useState(false);
  const [hasAnnotations, setHasAnnotations] = useState(false);
  const [annotationsState, setAnnotationsState] = useState<Annotation[]>([]);
  const annotationsRef = useRef<Annotation[]>([]);
  const drawingRef = useRef<{
    isDrawing: boolean;
    startX: number;
    startY: number;
    current?: Annotation;
  }>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    current: undefined,
  });
  const imageInfoRef = useRef<{
    naturalWidth: number;
    naturalHeight: number;
    scale: number;
    offsetX: number;
    offsetY: number;
    drawWidth: number;
    drawHeight: number;
  } | null>(null);
  const fetchedImageRef = useRef<HTMLImageElement | null>(null);

  const usedMoodboard = Boolean(prompt?.startsWith(MOODBOARD_PROMPT_PREFIX));
  const displayPrompt = usedMoodboard && prompt ? prompt.slice(MOODBOARD_PROMPT_PREFIX.length).trim() : prompt;

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

  const drawAnnotations = useCallback(() => {
    const canvas = annotationCanvasRef.current;
    const info = imageInfoRef.current;
    const img = fetchedImageRef.current;
    if (!canvas || !info || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || canvas.width / dpr;
    const displayHeight = canvas.clientHeight || canvas.height / dpr;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    const { offsetX, offsetY, drawWidth, drawHeight, scale } = info;
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    const annotations = annotationsRef.current;
    const current = drawingRef.current.current;

    ctx.strokeStyle = '#ff4d4f';
    ctx.lineWidth = 2;
    ctx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#ff4d4f';

    const drawOne = (ann: Annotation) => {
      const x = offsetX + ann.x * scale;
      const y = offsetY + ann.y * scale;
      const w = ann.width * scale;
      const h = ann.height * scale;
      if (w <= 0 || h <= 0) return;
      ctx.strokeRect(x, y, w, h);
      if (ann.text) {
        const textY = y - 6 < 12 ? y + 16 : y - 6;
        ctx.fillText(ann.text, x + 4, textY);
      }
    };

    annotations.forEach(drawOne);
    if (drawingRef.current.isDrawing && current) {
      drawOne(current);
    }
  }, []);

  const setupAnnotationCanvas = useCallback(async () => {
    if (!containerRef.current || !annotationCanvasRef.current) return;
    const canvas = annotationCanvasRef.current;
    const container = containerRef.current;

    const rect = container.getBoundingClientRect();
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = rect.width;
        const displayHeight = rect.height;
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        const scale = Math.min(displayWidth / naturalWidth, displayHeight / naturalHeight);
        const drawWidth = naturalWidth * scale;
        const drawHeight = naturalHeight * scale;
        const offsetX = (displayWidth - drawWidth) / 2;
        const offsetY = (displayHeight - drawHeight) / 2;
        imageInfoRef.current = {
          naturalWidth,
          naturalHeight,
          scale,
          offsetX,
          offsetY,
          drawWidth,
          drawHeight,
        };
        fetchedImageRef.current = img;
        drawAnnotations();
        URL.revokeObjectURL(objectUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    } catch (err) {
      console.error('Failed to prepare annotation canvas:', err);
    }
  }, [imageUrl, drawAnnotations]);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isAnnotating || !annotationCanvasRef.current || !imageInfoRef.current) return;
      const canvas = annotationCanvasRef.current;
      const info = imageInfoRef.current;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const withinImage =
        px >= info.offsetX &&
        px <= info.offsetX + info.drawWidth &&
        py >= info.offsetY &&
        py <= info.offsetY + info.drawHeight;
      if (!withinImage) return;

      const xInImage = (px - info.offsetX) / info.scale;
      const yInImage = (py - info.offsetY) / info.scale;
      drawingRef.current = {
        isDrawing: true,
        startX: xInImage,
        startY: yInImage,
        current: {
          x: xInImage,
          y: yInImage,
          width: 0,
          height: 0,
        },
      };
      drawAnnotations();
    },
    [isAnnotating, drawAnnotations]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isAnnotating || !annotationCanvasRef.current || !imageInfoRef.current) return;
      if (!drawingRef.current.isDrawing || !drawingRef.current.current) return;

      const canvas = annotationCanvasRef.current;
      const info = imageInfoRef.current;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const xInImage = (px - info.offsetX) / info.scale;
      const yInImage = (py - info.offsetY) / info.scale;

      const startX = drawingRef.current.startX;
      const startY = drawingRef.current.startY;
      const x = Math.min(startX, xInImage);
      const y = Math.min(startY, yInImage);
      const width = Math.abs(xInImage - startX);
      const height = Math.abs(yInImage - startY);

      drawingRef.current.current = {
        x,
        y,
        width,
        height,
      };
      drawAnnotations();
    },
    [isAnnotating, drawAnnotations]
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (!isAnnotating || !drawingRef.current.isDrawing || !drawingRef.current.current) {
      drawingRef.current.isDrawing = false;
      drawingRef.current.current = undefined;
      return;
    }
    const finished = drawingRef.current.current;
    drawingRef.current.isDrawing = false;
    drawingRef.current.current = undefined;

    if (finished.width <= 4 || finished.height <= 4) {
      drawAnnotations();
      return;
    }

    const ann: Annotation = {
      ...finished,
      text: undefined,
    };
    annotationsRef.current = [...annotationsRef.current, ann];
    setAnnotationsState(annotationsRef.current);
    setHasAnnotations(annotationsRef.current.length > 0);
    drawAnnotations();
  }, [isAnnotating, drawAnnotations]);

  const handleToggleAnnotate = useCallback(() => {
    setIsAnnotating((prev) => !prev);
  }, []);

  const handleClearAnnotations = useCallback(() => {
    annotationsRef.current = [];
    drawingRef.current = { isDrawing: false, startX: 0, startY: 0, current: undefined };
    setAnnotationsState([]);
    setHasAnnotations(false);
    if (isAnnotating) {
      drawAnnotations();
    }
  }, [isAnnotating, drawAnnotations]);

  const handleAnnotationTextChange = useCallback(
    (index: number, text: string) => {
      const next = [...annotationsRef.current];
      if (!next[index]) return;
      next[index] = {
        ...next[index],
        text: text.trim() ? text : undefined,
      };
      annotationsRef.current = next;
      setAnnotationsState(next);
      drawAnnotations();
    },
    [drawAnnotations]
  );

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
    if (!isAnnotating) return;
    void setupAnnotationCanvas();
  }, [isAnnotating, setupAnnotationCanvas]);

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

  const handleWrapAndReuse = useCallback(async () => {
    if (!onWrapGenerate) return;
    if (!imageInfoRef.current || !fetchedImageRef.current || annotationsRef.current.length === 0) {
      onWrapGenerate(imageUrl, referenceImageUrls);
      onClose();
      return;
    }

    try {
      const info = imageInfoRef.current;
      const img = fetchedImageRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = info.naturalWidth;
      canvas.height = info.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        onWrapGenerate(imageUrl, referenceImageUrls);
        onClose();
        return;
      }

      ctx.drawImage(img, 0, 0, info.naturalWidth, info.naturalHeight);

      ctx.strokeStyle = '#ff4d4f';
      ctx.lineWidth = Math.max(2, Math.round(info.naturalWidth / 400));
      ctx.font = `${Math.max(16, Math.round(info.naturalWidth / 40))}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = '#ff4d4f';

      for (const ann of annotationsRef.current) {
        ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
        if (ann.text) {
          const textY = ann.y - 8 < 16 ? ann.y + 20 : ann.y - 8;
          ctx.fillText(ann.text, ann.x + 4, textY);
        }
      }

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) {
        onWrapGenerate(imageUrl, referenceImageUrls);
        onClose();
        return;
      }

      const wrappedUrl = URL.createObjectURL(blob);
      onWrapGenerate(wrappedUrl, referenceImageUrls);
      onClose();
    } catch (err) {
      console.error('Failed to create wrapped image:', err);
      onWrapGenerate(imageUrl, referenceImageUrls);
      onClose();
    }
  }, [onWrapGenerate, imageUrl, referenceImageUrls, onClose]);

  const handleReusePrompt = useCallback(() => {
    const textToReuse = (displayPrompt ?? prompt)?.trim();
    if (textToReuse && onReusePrompt) {
      onReusePrompt(textToReuse, referenceImageUrls);
      onClose();
    }
  }, [displayPrompt, prompt, referenceImageUrls, onReusePrompt, onClose]);

  const handleDelete = useCallback(async () => {
    if (!imageId || !onDelete) return;
    if (!window.confirm('Delete this image? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await onDelete(imageId);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  }, [imageId, onDelete, onClose]);

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
            canPan && !isAnnotating ? 'cursor-grab' : ''
          } ${isDragging && !isAnnotating ? 'cursor-grabbing' : ''}`}
          onWheel={isAnnotating ? undefined : handleWheel}
          onMouseDown={isAnnotating ? undefined : handleMouseDown}
          onDoubleClick={resetView}
          style={{ touchAction: 'none' }}
        >
          <img
            ref={imageElementRef}
            src={imageUrl}
            alt="Generated image"
            className="max-w-full max-h-full object-contain select-none pointer-events-none md:max-w-none md:max-h-full"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              opacity: isAnnotating ? 0 : 1,
            }}
            draggable={false}
          />

          {isAnnotating && (
            <canvas
              ref={annotationCanvasRef}
              className="absolute inset-0 z-10 cursor-crosshair"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
            />
          )}

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
            <button
              onClick={handleToggleAnnotate}
              className={`px-3 h-9 flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                isAnnotating
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isAnnotating ? 'Exit edit mode' : 'Edit mode'}
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
              <p className="text-white/50 text-xs">By Kreator, for creators.</p>
            </div>

            {usedMoodboard && (
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-medium">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Created with moodboard
                </span>
              </div>
            )}

            {(displayPrompt ?? prompt) && (
              <div>
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">
                  Prompt
                </p>
                <p className="text-white/90 text-sm leading-relaxed">{displayPrompt ?? prompt}</p>
              </div>
            )}

            {annotationsState.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
                    Edits
                  </p>
                  <button
                    type="button"
                    onClick={handleClearAnnotations}
                    className="text-[11px] text-white/40 hover:text-white/70 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-2">
                  {annotationsState.map((ann, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="mt-1 w-3 h-3 rounded-sm border border-red-400" />
                      <textarea
                        value={ann.text ?? ''}
                        onChange={(e) => handleAnnotationTextChange(index, e.target.value)}
                        placeholder="Describe this area…"
                        rows={2}
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-red-500/60 focus:border-red-500/60 resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {referenceImageUrls && referenceImageUrls.length > 0 && (
              <div>
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-2">
                  {usedMoodboard ? 'Main reference & moodboard' : 'Reference photos'}
                </p>
                <div className="flex flex-wrap gap-3">
                  {referenceImageUrls.map((url, i) => {
                    const label = usedMoodboard
                      ? i === 0
                        ? 'Main reference'
                        : `Moodboard ${i}`
                      : `Reference ${i + 1}`;
                    return (
                      <div key={`${url}-${i}`} className="flex flex-col items-start gap-1">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-14 h-14 rounded-lg overflow-hidden border border-white/20 hover:border-white/40 transition-colors flex-shrink-0"
                        >
                          <img
                            src={url}
                            alt={label}
                            className="w-full h-full object-cover"
                          />
                        </a>
                        <span className="text-white/50 text-[10px] font-medium max-w-[56px] truncate" title={label}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
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

          <div className="flex-shrink-0 p-4 border-t border-white/10 space-y-3">
            {/* Primary action */}
            {(displayPrompt ?? prompt)?.trim() && onReusePrompt && (
              <button
                onClick={handleWrapAndReuse}
                disabled={!hasAnnotations}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
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
                    d="M4 4h9m0 0l-3-3m3 3l-3 3M4 12h9m7 8H11m0 0l3-3m-3 3l3 3m7-8H11"
                  />
                </svg>
                Wrap & regenerate
              </button>
            )}

            {/* Secondary actions */}
            <div className="flex gap-2">
              <button
                onClick={handleReusePrompt}
                disabled={!(displayPrompt ?? prompt)?.trim() || !onReusePrompt}
                className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/90 py-2.5 rounded-xl text-sm font-medium transition-all border border-white/15 disabled:opacity-40 disabled:cursor-not-allowed"
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
              {isShareSupported && (
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/90 py-2.5 rounded-xl text-sm font-medium transition-all border border-white/15"
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
            </div>

            {/* Utility actions */}
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 bg-[#16181c]/80 hover:bg-[#1a1d22]/95 text-white/90 py-2.5 rounded-xl text-xs font-medium transition-all border border-white/10"
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
                className="flex-1 flex items-center justify-center gap-2 bg-[#16181c]/80 hover:bg-[#1a1d22]/95 text-white/90 py-2.5 rounded-xl text-xs font-medium transition-all border border-white/10"
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

            {/* Destructive */}
            {imageId && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full flex items-center justify-center gap-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
                aria-label="Delete image"
              >
                {isDeleting ? (
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-red-300/50 border-t-red-300 rounded-full" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4m1 4h.01M12 4h.01M17 21h-10" />
                  </svg>
                )}
                {isDeleting ? 'Deleting…' : 'Delete'}
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
