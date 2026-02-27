import React, { memo } from 'react';

interface ImageGridProps {
  images: string[];
  onImageClick?: (index: number) => void;
}

const ImageGrid: React.FC<ImageGridProps> = memo(({ images, onImageClick }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-2 w-full">
      {images.map((image, index) => (
        <div
          key={`img-${index}-${image.slice(0, 30)}`}
          className="relative aspect-square bg-gray-800 rounded overflow-hidden group cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => onImageClick?.(index)}
        >
          <img
            src={image}
            alt={`Generated image ${index + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to placeholder if image fails to load
              const target = e.target as HTMLImageElement;
              target.src = `https://via.placeholder.com/400x400/1a1a1a/666666?text=Image+${index + 1}`;
            }}
          />
          {/* Overlay - shown on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="text-white text-sm font-medium">
              Click to view
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

ImageGrid.displayName = 'ImageGrid';

export default ImageGrid;
