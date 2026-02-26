import { useState, useCallback } from 'react';
import ImageGrid from './components/ImageGrid';
import ControlPanel from './components/ControlPanel';
import './App.css';

function App() {
  // Mock images for demonstration - in production, these would come from your API
  const [images] = useState<string[]>(() => {
    // Generate placeholder images - replace with actual image URLs later
    return Array.from({ length: 30 }, (_, i) => 
      `https://via.placeholder.com/400x400/1a1a1a/666666?text=Generated+Image+${i + 1}`
    );
  });

  const handleGenerate = useCallback(() => {
    // Placeholder for future API call
    console.log('Generate clicked');
  }, []);

  return (
    <div className="min-h-screen bg-black pb-32">
      {/* Image Grid Background */}
      <div className="w-full pt-4">
        <ImageGrid images={images} />
      </div>

      {/* Control Panel - Overlapping at bottom with liquid glass effect */}
      <ControlPanel onGenerate={handleGenerate} />
    </div>
  );
}

export default App;
