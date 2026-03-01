import React, { memo } from 'react';
import Masonry from '@mui/lab/Masonry';

export type CreatorInfo = { username: string; avatar_url: string | null };

export type ImageGridItem =
  | { type: 'image'; id: string; url: string; thumbUrl?: string; aspectRatio: string; prompt: string; imageSize: string; model?: string; referenceImageUrls?: string[]; creator?: CreatorInfo }
  | { type: 'placeholder'; id: string; status: 'generating' | 'queued'; aspectRatio: string; imageSize: string };

interface ImageGridProps {
  items: ImageGridItem[];
  onImageClick?: (index: number) => void;
  onReRun?: (prompt: string, referenceImageUrls?: string[]) => void;
  onAddToReference?: (imageUrl: string) => void;
}

function parseAspectRatio(ratio: string): string {
  if (!ratio) return '1';
  return ratio.replace(':', '/');
}

function hashToDelay(id: string, maxMs: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h << 5) - h + id.charCodeAt(i);
  return Math.abs(h % 1000) / 1000 * maxMs;
}

const ImageGrid: React.FC<ImageGridProps> = memo(({ items, onImageClick, onReRun, onAddToReference }) => {
  return (
    <div className="w-full">
      <Masonry
        columns={{ xs: 2, sm: 3, md: 4, lg: 5, xl: 6 }}
        spacing={1.5}
        sx={{ width: '100%' }}
      >
      {items.map((item, index) => {
        if (item.type === 'placeholder') {
          const isGenerating = item.status === 'generating';
          return (
            <div
              key={item.id}
              className="animate-pop-in relative overflow-hidden flex items-center justify-center rounded-lg backdrop-blur-xl bg-gradient-to-b from-white/10 via-white/5 to-white/5 border border-white/20 shadow-xl"
              style={{ aspectRatio: parseAspectRatio(item.aspectRatio), animationDelay: `${hashToDelay(item.id, 800)}ms` }}
            >
              {/* Liquid glass gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-50 rounded-lg" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-t-lg" />
              <div className="relative z-10 flex flex-col items-center gap-3">
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-blue-500" />
                    <span className="text-sm font-medium text-blue-400/90">Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-blue-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="animate-pop-in relative bg-gray-800 overflow-hidden group cursor-pointer transition-transform hover:scale-[1.02] rounded-lg"
            style={{ aspectRatio: parseAspectRatio(item.aspectRatio), animationDelay: `${hashToDelay(item.id, 800)}ms` }}
            onClick={() => onImageClick?.(index)}
          >
            <img
              src={item.thumbUrl || item.url}
              alt={`Generated image ${index + 1}`}
              loading="lazy"
              decoding="async"
              fetchPriority={index < 6 ? 'high' : 'low'}
              className="absolute inset-0 w-full h-full object-cover rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (item.thumbUrl && target.src !== item.url) {
                  target.src = item.url;
                } else {
                  target.src = `https://via.placeholder.com/400x400/1a1a1a/666666?text=Image+${index + 1}`;
                }
              }}
            />
            {item.creator && (
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm rounded-full px-1.5 py-0.5 max-w-[90%]">
                {item.creator.avatar_url ? (
                  <img
                    src={item.creator.avatar_url}
                    alt=""
                    loading="lazy"
                    className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <span className="text-[10px] text-white/90 truncate font-medium">{item.creator.username}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.prompt) onReRun?.(item.prompt, item.referenceImageUrls);
                }}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                title="Re-run with this prompt and refs"
                aria-label="Re-run"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToReference?.(item.url);
                }}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                title="Add to reference"
                aria-label="Add to reference"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
      </Masonry>
    </div>
  );
});

ImageGrid.displayName = 'ImageGrid';

export default ImageGrid;
