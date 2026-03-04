import { useState } from 'react';
import { enhancePrompt } from '../services/promptEnhancer';

const easing = 'cubic-bezier(0.32, 0.72, 0, 1)';

const STEPS = [
  { key: 'subject', label: 'What would you like to create?', placeholder: 'e.g. a serene lake at dusk, a futuristic city...' },
  { key: 'style', label: 'Any specific style?', placeholder: 'e.g. photorealistic, oil painting, anime, cinematic...' },
  { key: 'details', label: 'Anything else? (optional)', placeholder: 'mood, lighting, colors, composition...' },
] as const;

interface KreatePlusModalProps {
  onClose: () => void;
  onUsePrompt: (prompt: string) => void;
}

export default function KreatePlusModal({ onClose, onUsePrompt }: KreatePlusModalProps) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({ subject: '', style: '', details: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultPrompt, setResultPrompt] = useState<string | null>(null);

  const currentStep = STEPS[step];
  const value = values[currentStep.key] ?? '';
  const canNext = step === 0 ? (values.subject?.trim().length > 0) : true;
  const isLastStep = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      generatePrompt();
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const generatePrompt = async () => {
    const parts = [values.subject?.trim(), values.style?.trim(), values.details?.trim()].filter(Boolean);
    const rawPrompt = parts.join('. ');
    if (!rawPrompt) {
      setError('Please describe what you want to create.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const enhanced = await enhancePrompt(rawPrompt);
      setResultPrompt(enhanced);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompt');
    } finally {
      setLoading(false);
    }
  };

  const handleUsePrompt = () => {
    if (resultPrompt) {
      onUsePrompt(resultPrompt);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Kreate+</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {resultPrompt !== null ? (
            /* Result step */
            <div className="space-y-4">
              <p className="text-sm text-white/60">Your enhanced prompt:</p>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">{resultPrompt}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleUsePrompt}
                  className="flex-1 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
                >
                  Use this prompt
                </button>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(resultPrompt)}
                  className="px-4 py-3 rounded-xl border border-white/20 text-white/80 hover:bg-white/10 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          ) : (
            /* Step flow */
            <>
              <div className="mb-4 flex gap-1">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-colors duration-300"
                    style={{
                      backgroundColor: i <= step ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)',
                      transitionTimingFunction: easing,
                    }}
                  />
                ))}
              </div>
              <label className="block text-white/90 font-medium mb-2">{currentStep.label}</label>
              <textarea
                value={value}
                onChange={(e) => setValues((v) => ({ ...v, [currentStep.key]: e.target.value }))}
                placeholder={currentStep.placeholder}
                rows={3}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={step === 0 ? onClose : handleBack}
                  className="px-4 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {step === 0 ? 'Cancel' : 'Back'}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canNext || loading}
                  className="px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{ transitionTimingFunction: easing }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </span>
                  ) : isLastStep ? (
                    'Generate prompt'
                  ) : (
                    'Next'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
