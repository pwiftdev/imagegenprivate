import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PLANS, getCheckoutUrl } from '../config/pricing';
import { createPortalSession } from '../services/profileService';

interface HeaderProps {
  onSignOut: () => void;
  credits?: number | null;
  userId?: string;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
}

const Header: React.FC<HeaderProps> = ({ onSignOut, credits, userId, subscriptionPlan, subscriptionStatus }) => {
  const location = useLocation();
  const isProfile = location.pathname === '/app/profile';
  const [showModal, setShowModal] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const currentPlanLabel = PLANS.find((p) => p.id === subscriptionPlan)?.name ?? subscriptionPlan;

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showModal]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowModal(false);
    }
    if (showModal) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showModal]);

  const handleManageSubscription = async () => {
    if (!userId || portalLoading) return;
    setPortalLoading(true);
    try {
      const url = await createPortalSession(userId);
      window.location.href = url;
    } catch (err) {
      console.error('Portal error:', err);
      setPortalLoading(false);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center justify-between px-6 bg-[#08090a]/60 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
          <Link to="/app" className="flex items-center gap-3 group">
            <img src="/kreatorlogo.png" alt="Kreator" className="h-7 w-auto rounded-xl" />
            <span className="landing-font-display text-xl font-bold text-white tracking-tight group-hover:text-blue-200 transition-colors">
              Kreator
            </span>
          </Link>
          <span className="text-white/50 text-sm hidden sm:inline">By Kreator, for creators.</span>
        </div>

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

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs font-semibold hover:bg-blue-500/20 hover:border-blue-500/30 transition-all cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {typeof credits === 'number' ? `${credits} credits` : '…'}
            {isSubscribed && currentPlanLabel && (
              <span className="ml-1 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] font-bold uppercase tracking-wider">
                {currentPlanLabel}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Subscription Modal */}
      {showModal && userId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          <div className="relative w-full max-w-3xl rounded-3xl bg-[#0c0d0f] border border-white/10 shadow-2xl shadow-black/60 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-8">
              {isSubscribed ? (
                <>
                  {/* Active subscriber view */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/25 text-green-300 text-xs font-semibold mb-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      Active subscription
                    </div>
                    <h2 className="landing-font-display text-2xl font-bold text-white">
                      {currentPlanLabel} Plan
                    </h2>
                    <p className="mt-2 text-white/50 text-sm">
                      {typeof credits === 'number' ? `${credits} credits remaining` : 'Loading…'}
                      {' · '}Credits top up each billing cycle
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <button
                      type="button"
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                    >
                      {portalLoading ? 'Loading…' : 'Manage Subscription'}
                    </button>
                    <p className="text-white/30 text-xs">Change plan, update payment method, or cancel</p>
                  </div>
                </>
              ) : (
                <>
                  {/* Non-subscriber / cancelled view */}
                  <div className="text-center mb-8">
                    <h2 className="landing-font-display text-2xl font-bold text-white">Choose a Plan</h2>
                    <p className="mt-2 text-white/50 text-sm">
                      Credits top up every month. Unused credits roll over.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PLANS.map((plan) => (
                      <div
                        key={plan.id}
                        className={`relative rounded-2xl p-6 flex flex-col transition-all ${
                          plan.popular
                            ? 'bg-blue-500/[0.08] border-2 border-blue-500/30 shadow-lg shadow-blue-500/10'
                            : 'bg-white/[0.03] border border-white/10 hover:border-white/20'
                        }`}
                      >
                        {plan.badge && (
                          <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-white text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${
                            plan.popular ? 'bg-blue-500/90' : 'bg-amber-500/90'
                          }`}>
                            {plan.badge}
                          </div>
                        )}

                        <div className="text-center mb-5">
                          <h3 className="landing-font-display text-lg font-bold text-white">{plan.name}</h3>
                          <p className="text-white/40 text-xs mt-1">{plan.description}</p>
                          <p className="mt-3">
                            <span className="text-3xl font-bold text-white">${plan.price}</span>
                            <span className="text-white/50 text-sm">{plan.period}</span>
                          </p>
                          <p className="mt-1 text-white/50 text-sm">{plan.credits} generations/mo</p>
                          <p className="mt-0.5 text-blue-400/80 text-xs font-medium">{plan.perCredit} per generation</p>
                        </div>

                        <a
                          href={getCheckoutUrl(plan.paymentLink, userId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setShowModal(false)}
                          className={`mt-auto block w-full py-3 rounded-xl text-center text-sm font-semibold transition-all ${
                            plan.popular
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:opacity-90 shadow-md shadow-blue-500/20'
                              : 'bg-white/[0.06] border border-white/15 text-white hover:bg-white/10 hover:border-white/25'
                          }`}
                        >
                          Subscribe
                        </a>
                      </div>
                    ))}
                  </div>

                  {/* Included features */}
                  <div className="mt-8 rounded-2xl bg-white/[0.03] border border-white/10 p-5">
                    <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-3">Everything included</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {[
                        'Nano Banana 2 & Pro',
                        'Up to 4K output',
                        'Custom aspect ratios',
                        'Edit feature',
                        'Up to 3 parallel generations',
                        'Unlimited queued generations',
                        'Prompt Library',
                        'Moodboards',
                      ].map((feature) => (
                        <div key={feature} className="flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-white/70 text-xs">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-4 text-white/30 text-xs">
                    <span>Secure payment via Stripe</span>
                    <span className="text-white/15">·</span>
                    <span>Cancel anytime</span>
                    <span className="text-white/15">·</span>
                    <span>Unused credits roll over</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
