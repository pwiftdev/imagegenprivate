import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PLANS, STRIPE_PUBLISHABLE_KEY } from '../config/pricing';

interface HeaderProps {
  onSignOut: () => void;
  credits?: number | null;
  userId?: string;
}

let stripeScriptLoaded = false;
function ensureStripeScript() {
  if (stripeScriptLoaded) return;
  stripeScriptLoaded = true;
  const s = document.createElement('script');
  s.src = 'https://js.stripe.com/v3/buy-button.js';
  s.async = true;
  document.head.appendChild(s);
}

const Header: React.FC<HeaderProps> = ({ onSignOut, credits, userId }) => {
  const location = useLocation();
  const isProfile = location.pathname === '/app/profile';
  const [showPlans, setShowPlans] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showPlans) ensureStripeScript();
  }, [showPlans]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPlans(false);
      }
    }
    if (showPlans) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPlans]);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center justify-between px-6 bg-[#08090a]/60 backdrop-blur-xl border-b border-white/10">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3">
        <Link to="/app" className="flex items-center gap-3 group">
          <img src="/kreatorlogo.png" alt="Kreator" className="h-7 w-auto rounded-xl" />
          <span className="landing-font-display text-xl font-bold text-white tracking-tight group-hover:text-blue-200 transition-colors">
            Kreator
          </span>
        </Link>
        <span className="text-white/50 text-sm hidden sm:inline">By Kreator, for creators.</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSignOut}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/80 text-xs font-medium border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
        <Link
          to="/app/profile"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isProfile
              ? 'bg-gradient-to-r from-blue-500/25 to-indigo-500/25 text-white border border-blue-400/40 shadow-[0_0_20px_-4px_rgba(59,130,246,0.25)]'
              : 'bg-white/5 text-white/90 border border-white/10 hover:bg-white/10 hover:border-blue-400/30 hover:text-white'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          My Kreator
        </Link>

        {/* Credits + Buy button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowPlans((s) => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs font-semibold hover:bg-blue-500/20 hover:border-blue-500/30 transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {typeof credits === 'number' ? `${credits} credits` : '…'}
          </button>

          {showPlans && userId && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-[#0c0d0f]/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 p-4 z-50">
              <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-3">Buy Credits</p>
              <div className="space-y-3">
                {PLANS.map((plan) => (
                  <div key={plan.id} className={`p-3 rounded-xl border ${plan.popular ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/[0.03] border-white/10'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white text-sm font-semibold">{plan.name}</span>
                        <p className="text-white/50 text-xs">{plan.credits} credits · {plan.perCredit}/credit</p>
                      </div>
                      <span className="text-white font-bold text-sm">${plan.price}</span>
                    </div>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: `<stripe-buy-button buy-button-id="${plan.buyButtonId}" publishable-key="${STRIPE_PUBLISHABLE_KEY}" client-reference-id="${userId}"></stripe-buy-button>`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <p className="text-white/35 text-[10px] mt-3 text-center">Credits are added instantly after payment.</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
