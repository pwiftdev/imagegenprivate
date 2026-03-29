import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function PaymentSuccessPage() {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#08090a] text-white landing-font-body flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute" style={{ top: '-30%', left: '-20%' }}>
          <div className="w-[70vmax] h-[70vmax] rounded-full bg-gradient-to-br from-green-500/10 via-emerald-500/8 to-blue-600/10 animate-pulse" style={{ animationDuration: '6s' }} />
        </div>
        <div className="absolute" style={{ bottom: '-25%', right: '-15%' }}>
          <div className="w-[60vmax] h-[60vmax] rounded-full bg-gradient-to-tl from-blue-500/10 via-indigo-500/8 to-green-500/8 animate-pulse" style={{ animationDuration: '8s', animationDelay: '-3s' }} />
        </div>
      </div>

      {/* Confetti-like particles */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-10" aria-hidden>
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${8 + Math.random() * 84}%`,
                top: '-5%',
                backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'][i % 6],
                animation: `confetti-fall ${2 + Math.random() * 2}s ease-in forwards`,
                animationDelay: `${Math.random() * 1.5}s`,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-20 text-center max-w-md">
        {/* Check icon */}
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/30 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="landing-font-display text-3xl md:text-4xl font-bold text-white mb-3">
          Payment successful!
        </h1>
        <p className="text-white/60 text-lg mb-2">
          Your credits have been added to your account.
        </p>
        <p className="text-white/40 text-sm mb-8">
          They should appear within a few seconds. If not, refresh the page.
        </p>

        <Link
          to="/app"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold hover:opacity-95 hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-blue-500/25"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Start creating
        </Link>

        <p className="mt-6 text-white/30 text-xs">
          A receipt has been sent to your email by Stripe.
        </p>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.9; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
