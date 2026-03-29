import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { generateVideoFromImage, VIDEO_MODELS, VIDEO_CREDIT_COST, type VideoModelId } from '../services/videoGeneration';
import { compressImageForReference } from '../utils/compressImage';

interface VideoPageProps {
  userId?: string;
  credits?: number | null;
  onCreditsChange?: (c: number) => void;
}

const VideoPage: React.FC<VideoPageProps> = ({ userId, credits, onCreditsChange }) => {
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

  const currentCost = VIDEO_CREDIT_COST[model];
  const canGenerate = imageUrl.trim() && prompt.trim() && !generating && (typeof credits === 'number' ? credits >= currentCost : true);

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
    if (typeof credits === 'number' && credits < currentCost) {
      setError(`You need at least ${currentCost} credits. You have ${credits}.`);
      return;
    }

    setError(null);
    setVideoUrl(null);
    setProgressLog([]);
    setGenerating(true);

    try {
      const result = await generateVideoFromImage(
        { prompt: text, imageUrl: url, model, userId },
        (chunk) => {
          setProgressLog((prev) => [...prev, chunk]);
        }
      );
      setVideoUrl(result.videoUrl);
      if (typeof credits === 'number' && onCreditsChange) {
        onCreditsChange(credits - currentCost);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090a] text-white landing-font-body relative">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute" style={{ top: '-30%', right: '-20%' }}>
          <div className="w-[70vmax] h-[70vmax] rounded-full bg-gradient-to-br from-violet-500/8 via-indigo-500/6 to-purple-600/8 blur-3xl" />
        </div>
        <div className="absolute" style={{ bottom: '-20%', left: '-15%' }}>
          <div className="w-[50vmax] h-[50vmax] rounded-full bg-gradient-to-tr from-blue-500/6 via-cyan-500/4 to-indigo-500/6 blur-3xl" />
        </div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/app"
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 text-sm font-medium transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="landing-font-display text-2xl font-bold text-white">Image to Video</h1>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                Beta
              </span>
            </div>
          </div>
          {typeof credits === 'number' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {credits} credits
            </div>
          )}
        </div>

        {/* Beta + download warning banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-amber-500/[0.06] to-orange-500/[0.04] border border-amber-500/20 p-5">
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-amber-200 text-sm font-semibold mb-1">Beta Feature — Download Required</p>
              <p className="text-white/50 text-xs leading-relaxed">
                Video generation is in beta. Generated videos are <strong className="text-white/70">not saved on Kreator servers</strong> — please download your video immediately after generation. Standard models cost <strong className="text-white/70">25 credits</strong>, fast models cost <strong className="text-white/70">20 credits</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Main card */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            {/* Reference photo */}
            <div>
              <label className="block text-white/80 text-sm font-semibold mb-2">Reference photo</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={generating || uploading}
              />

              {!imageUrl ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={generating || uploading}
                  className="w-full py-10 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/25 transition-all flex flex-col items-center gap-3 group disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="animate-spin inline-block w-6 h-6 border-2 border-white/30 border-t-blue-400 rounded-full" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-blue-500/10 group-hover:border-blue-500/20 transition-all">
                      <svg className="w-6 h-6 text-white/40 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-white/70 text-sm font-medium">{uploading ? 'Processing…' : 'Click to upload a reference photo'}</p>
                    <p className="text-white/40 text-xs mt-0.5">Or paste an image URL below</p>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <img
                    src={imageUrl.startsWith('data:') || imageUrl.startsWith('http') ? imageUrl : ''}
                    alt="Reference"
                    className="w-20 h-20 rounded-lg object-cover border border-white/10 bg-white/5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-medium">
                      {imageUrl.startsWith('data:') ? 'Uploaded image' : 'Image from URL'}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5 truncate">Ready for video generation</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={generating}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-xs font-medium transition-all"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      disabled={generating}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/20 text-xs font-medium transition-all"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-3">
                <input
                  type="url"
                  value={imageUrl.startsWith('http') ? imageUrl : ''}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Or paste image URL: https://..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                  disabled={generating}
                />
              </div>
            </div>

            {/* Prompt */}
            <div>
              <label className="block text-white/80 text-sm font-semibold mb-2">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the motion — e.g. 'The character turns and smiles at the camera, wind blowing through their hair'"
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 resize-none transition-all"
                disabled={generating}
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-white/80 text-sm font-semibold mb-2">Model</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(VIDEO_MODELS) as VideoModelId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setModel(id)}
                    disabled={generating}
                    className={`px-4 py-3 rounded-xl text-sm font-medium text-left transition-all ${
                      model === id
                        ? 'bg-blue-500/15 border-2 border-blue-500/40 text-blue-200'
                        : 'bg-white/[0.03] border border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white/80'
                    }`}
                  >
                    <span>{VIDEO_MODELS[id]}</span>
                    <span className={`block text-xs mt-0.5 ${model === id ? 'text-blue-400/70' : 'text-white/35'}`}>
                      {VIDEO_CREDIT_COST[id]} credits
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <div className="px-6 md:px-8 pb-6 md:pb-8">
            {error && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-3 text-red-300 text-sm flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 flex items-center justify-center gap-3"
            >
              {generating ? (
                <>
                  <span className="animate-spin inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                  Generating… (2–5 min)
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Generate video — {currentCost} credits
                </>
              )}
            </button>

            {typeof credits === 'number' && credits < currentCost && !generating && (
              <p className="text-center text-red-400/80 text-xs mt-2">
                You need {currentCost} credits for this model. You have {credits}.
              </p>
            )}
          </div>
        </div>

        {/* Progress log */}
        {progressLog.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white/[0.03] border border-white/10 p-5 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              {generating && (
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white/20 border-t-blue-400 rounded-full" />
              )}
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">Progress</p>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg bg-black/30 p-3">
              <pre className="text-white/70 text-xs whitespace-pre-wrap font-mono leading-relaxed">
                {progressLog.join('')}
              </pre>
              <div ref={logEndRef} />
            </div>
          </div>
        )}

        {/* Video result */}
        {videoUrl && (
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <p className="text-white text-sm font-semibold">Video generated successfully</p>
              </div>
              <span className="text-amber-300/80 text-xs font-medium px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                Download now — not saved on server
              </span>
            </div>

            <div className="p-5">
              <video
                src={videoUrl}
                controls
                className="w-full rounded-xl bg-black/60 border border-white/10"
                playsInline
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={videoUrl}
                  download="kreator-video.mp4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download MP4
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setVideoUrl(null);
                    setProgressLog([]);
                    setImageUrl('');
                    setPrompt('');
                    setError(null);
                  }}
                  className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium hover:bg-white/10 hover:text-white transition-all"
                >
                  Generate another
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPage;
