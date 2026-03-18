import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { generateVideoFromImage, VIDEO_MODELS, type VideoModelId } from '../services/videoGeneration';
import { compressImageForReference } from '../utils/compressImage';

interface VideoPageProps {
  onSignOut?: () => void;
}

const VideoPage: React.FC<VideoPageProps> = () => {
  const location = useLocation();
  const state = location.state as { imageUrl?: string; prompt?: string } | null;
  const [imageUrl, setImageUrl] = useState(state?.imageUrl ?? '');
  const [prompt, setPrompt] = useState(state?.prompt ?? '');
  const [model, setModel] = useState<VideoModelId>('veo-3.1-fl');
  const [generating, setGenerating] = useState(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progressLog]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await compressImageForReference(file);
      setImageUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleGenerate = async () => {
    const url = imageUrl.trim();
    const text = prompt.trim();
    if (!url || !text) {
      setError('Please add a reference photo and a prompt.');
      return;
    }
    if (!url.startsWith('http') && !url.startsWith('data:')) {
      setError('Reference must be an uploaded image or a valid https URL.');
      return;
    }

    setError(null);
    setVideoUrl(null);
    setProgressLog([]);
    setGenerating(true);

    try {
      const result = await generateVideoFromImage(
        { prompt: text, imageUrl: url, model },
        (chunk) => {
          setProgressLog((prev) => [...prev, chunk]);
        }
      );
      setVideoUrl(result.videoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090a] text-white landing-font-body">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/app"
            className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h1 className="landing-font-display text-2xl font-bold text-white">Image to Video</h1>
        </div>

        <p className="text-white/55 text-sm mb-6">
          Create a short video from one image using Veo 3.1. Upload a reference photo or use one from your
          kreations via &quot;Create video&quot; in the image modal. Videos are $0.15–$0.25 each; link valid 1 day.
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-white/70 text-sm font-medium mb-1.5">Reference photo</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={generating || uploading}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={generating || uploading}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/90 hover:bg-white/10 hover:border-white/20 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Processing…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Upload reference photo
                  </>
                )}
              </button>
              {imageUrl && (
                <>
                  <div className="flex items-center gap-2">
                    <img
                      src={imageUrl.startsWith('data:') || imageUrl.startsWith('http') ? imageUrl : ''}
                      alt="Reference"
                      className="w-14 h-14 rounded-lg object-cover border border-white/10 bg-white/5"
                    />
                    <span className="text-white/50 text-xs">
                      {imageUrl.startsWith('data:') ? 'Uploaded' : 'From URL'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    disabled={generating}
                    className="text-white/50 hover:text-white text-xs font-medium"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
            <p className="text-white/45 text-xs mt-1.5">Or paste image URL below</p>
            <input
              type="url"
              value={imageUrl.startsWith('http') ? imageUrl : ''}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1.5 w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              disabled={generating}
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm font-medium mb-1.5">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Make this character jump off the desk and come to life"
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
              disabled={generating}
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm font-medium mb-1.5">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as VideoModelId)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              disabled={generating}
            >
              {(Object.keys(VIDEO_MODELS) as VideoModelId[]).map((id) => (
                <option key={id} value={id}>
                  {VIDEO_MODELS[id]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !imageUrl.trim() || !prompt.trim()}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {generating ? 'Generating… (2–5 min)' : 'Generate video'}
        </button>

        {progressLog.length > 0 && (
          <div className="mt-8 rounded-xl bg-white/5 border border-white/10 p-4 max-h-48 overflow-y-auto">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-2">Progress</p>
            <pre className="text-white/80 text-xs whitespace-pre-wrap font-sans">
              {progressLog.join('')}
            </pre>
            <div ref={logEndRef} />
          </div>
        )}

        {videoUrl && (
          <div className="mt-8 rounded-xl bg-white/5 border border-white/10 p-6">
            <p className="text-white/70 text-sm font-medium mb-3">Your video (download within 1 day)</p>
            <video
              src={videoUrl}
              controls
              className="w-full rounded-lg bg-black/40 border border-white/10"
              playsInline
            />
            <a
              href={videoUrl}
              download="kreator-video.mp4"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-200 text-sm font-medium hover:bg-blue-500/30 transition-colors"
            >
              Download MP4
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPage;
