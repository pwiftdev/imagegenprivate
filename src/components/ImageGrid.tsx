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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-2 w-full">
      {items.map((item, index) => {
        if (item.type === 'placeholder') {
          return (
            <div
              key={item.id}
              className="relative bg-gray-800/80 rounded overflow-hidden flex items-center justify-center border border-dashed border-white/20"
              style={{ aspectRatio: parseAspectRatio(item.aspectRatio) }}
            >
              <div className="flex flex-col items-center gap-2 text-white/60 text-sm">
                {item.status === 'generating' ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <span>Queue...</span>
                )}
              </div>
            </div>
          );
        }

        return (
          <div
            key={item.id}
            className="relative bg-gray-800 rounded overflow-hidden group cursor-pointer transition-transform hover:scale-[1.02]"
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
