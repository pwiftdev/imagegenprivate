import React, { memo } from 'react';

export type ImageGridItem =
  | { type: 'image'; id: string; url: string; aspectRatio: string; prompt: string; imageSize: string }
  | { type: 'placeholder'; id: string; status: 'generating' | 'queued'; aspectRatio: string };

interface ImageGridProps {
  items: ImageGridItem[];
  onImageClick?: (index: number) => void;
}

function parseAspectRatio(ratio: string): string {
  if (!ratio) return '1';
  return ratio.replace(':', '/');
}

const ImageGrid: React.FC<ImageGridProps> = memo(({ items, onImageClick }) => {
  return (
    <div className="grid-masonry p-2 w-full">
      {items.map((item, index) => {
        if (item.type === 'placeholder') {
          const isGenerating = item.status === 'generating';
          return (
            <div
              key={item.id}
              className="grid-masonry-item relative overflow-hidden flex items-center justify-center rounded-2xl backdrop-blur-xl bg-gradient-to-b from-white/10 via-white/5 to-white/5 border border-white/20 shadow-xl"
              style={{ aspectRatio: parseAspectRatio(item.aspectRatio) }}
            >
              {/* Liquid glass gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-50 rounded-2xl" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-t-2xl" />
              <div className="relative z-10 flex flex-col items-center gap-3">
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-lime-500" />
                    <span className="text-sm font-medium text-lime-400/90">Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-lime-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span className="text-sm text-white/60">In queue</span>
                  </>
                )}
              </div>
            </div>
          );
        }

        return (
          <div
            key={item.id}
            className="grid-masonry-item relative bg-gray-800 overflow-hidden group cursor-pointer transition-transform hover:scale-[1.02]"
            style={{ aspectRatio: parseAspectRatio(item.aspectRatio) }}
            onClick={() => onImageClick?.(index)}
          >
            <img
              src={item.url}
              alt={`Generated image ${index + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://via.placeholder.com/400x400/1a1a1a/666666?text=Image+${index + 1}`;
              }}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-medium">Click to view</span>
            </div>
          </div>
        );
      })}
    </div>
  );
});

ImageGrid.displayName = 'ImageGrid';

export default ImageGrid;
