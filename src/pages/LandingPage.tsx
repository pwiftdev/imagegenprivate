import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { fetchShowcaseThumbnails } from '../services/imageStorage';
import LandingCursorLogo from '../components/LandingCursorLogo';

const HERO_ROTATING_WORDS = ['hassle', 'waste', 'noise', 'clutter', 'bloat'];
const HERO_WORD_INTERVAL_MS = 1500;

const INCLUDED_FEATURES = [
  'Nano Banana 2 & Pro',
  'Up to 4K output',
  'Custom aspect ratios',
  'Edit feature',
  'Up to 3 parallel generations',
  'Unlimited queued generations',
  'Prompt Library',
  'Moodboards',
];

/** Returns current scroll Y for parallax and nav; updates every frame while scrolling */
function useParallaxScroll() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        setScrollY(window.scrollY ?? document.documentElement.scrollTop);
        rafId = null;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    setScrollY(window.scrollY ?? document.documentElement.scrollTop);
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);
  return scrollY;
}

/** Adds landing-in-view when element enters viewport for scroll-triggered animations */
function useScrollReveal(opts?: { threshold?: number; rootMargin?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const { threshold = 0.1, rootMargin = '0px 0px -40px 0px' } = opts ?? {};
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold, rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);
  return [ref, inView] as const;
}

export default function LandingPage() {
  const [showcaseThumbnails, setShowcaseThumbnails] = useState<string[]>([]);
  const [heroWordIndex, setHeroWordIndex] = useState(0);
  const scrollY = useParallaxScroll();

  useEffect(() => {
    fetchShowcaseThumbnails().then(setShowcaseThumbnails);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setHeroWordIndex((i) => (i + 1) % HERO_ROTATING_WORDS.length);
    }, HERO_WORD_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
  const [showcaseRef, showcaseInView] = useScrollReveal({ threshold: 0.08 });
  const [problemRef, problemInView] = useScrollReveal({ threshold: 0.15 });
  const [solutionRef, solutionInView] = useScrollReveal({ threshold: 0.08 });
  const [pricingRef, pricingInView] = useScrollReveal({ threshold: 0.15 });
  const [ctaRef, ctaInView] = useScrollReveal({ threshold: 0.1 });

  const [glowPos, setGlowPos] = useState<{ x: number; y: number } | null>(null);
  const glowContainerRef = useRef<HTMLDivElement>(null);

  const handleGlowMouseMove = (e: React.MouseEvent) => {
    const el = glowContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setGlowPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleGlowMouseLeave = () => setGlowPos(null);

  const showcasePerCol = showcaseThumbnails.length > 0 ? Math.ceil(showcaseThumbnails.length / 3) : 0;
  const showcaseCol1 = showcaseThumbnails.slice(0, showcasePerCol);
  const showcaseCol2 = showcaseThumbnails.slice(showcasePerCol, showcasePerCol * 2);
  const showcaseCol3 = showcaseThumbnails.slice(showcasePerCol * 2);

  return (
    <div className="min-h-screen bg-[#08090a] text-white overflow-x-hidden landing-font-body">
      <LandingCursorLogo />
      {/* Animated background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute will-change-transform" style={{ top: '-35%', left: '-25%', transform: `translate3d(0, ${scrollY * 0.28}px, 0)` }}>
          <div className="w-[90vmax] h-[90vmax] rounded-full bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-blue-600/15 landing-animate-float landing-animate-glow" />
        </div>
        <div className="absolute will-change-transform" style={{ bottom: '-25%', right: '-20%', transform: `translate3d(0, ${-scrollY * 0.18}px, 0)` }}>
          <div className="w-[70vmax] h-[70vmax] rounded-full bg-gradient-to-tl from-indigo-500/12 via-blue-500/10 to-sky-500/12 landing-animate-float-slow landing-animate-glow" style={{ animationDelay: '-5s' }} />
        </div>
        <div className="absolute will-change-transform" style={{ top: '55%', left: '45%', transform: `translate3d(0, ${scrollY * 0.22}px, 0)` }}>
          <div className="w-[50vmax] h-[50vmax] rounded-full bg-gradient-to-br from-sky-500/8 to-blue-600/10 landing-animate-float" style={{ animationDelay: '-10s' }} />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.025\'/%3E%3C/svg%3E')]" />
      </div>

      {/* Announcement banner */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium"
        style={{ height: 40 }}
      >
        <span>Register now &amp; receive <span className="font-bold tracking-tight">20 FREE credits</span></span>
      </div>

      {/* Nav */}
      <nav className={`fixed left-0 right-0 z-40 flex items-center justify-between px-6 h-16 border-b bg-[#08090a]/85 backdrop-blur-xl transition-all duration-300 ${scrollY > 24 ? 'border-white/12 bg-[#08090a]/90 shadow-lg shadow-black/10' : 'border-white/[0.06]'}`} style={{ top: 40 }}>
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/kreatorlogo.png"
            alt="Kreator"
            className="h-9 w-auto rounded-xl transition-transform duration-300 group-hover:scale-105"
          />
          <span className="landing-logo-text text-xl font-bold tracking-tight text-white group-hover:text-blue-200 transition-colors">
            Kreator
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/app"
            className="px-4 py-2.5 rounded-xl border border-white/12 text-sm font-medium text-white/90 hover:border-blue-400/50 hover:text-blue-200 hover:bg-blue-500/10 transition-all duration-300"
          >
            Sign in
          </Link>
          <Link
            to="/app"
            className="relative px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-400/40 hover:scale-[1.02] transition-all duration-300 overflow-hidden group"
          >
            <span className="relative z-10">Get started</span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center relative z-10 will-change-transform" style={{ transform: `translate3d(0, ${scrollY * 0.14}px, 0)` }}>
          <p
            className="landing-font-display text-xs font-semibold tracking-[0.25em] uppercase text-blue-400/90 landing-animate-fade-up opacity-0"
            style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}
          >
            For agencies &amp; freelancers
          </p>
          <h1
            className="landing-font-display mt-6 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] landing-animate-fade-up opacity-0"
            style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
          >
            <span className="text-white">AI image generation</span>
            <br />
            <span className="landing-gradient-text">without the <span key={heroWordIndex} className="inline-block landing-hero-word-swap landing-gradient-text">{HERO_ROTATING_WORDS[heroWordIndex]}</span></span>
          </h1>
          <p
            className="mt-8 text-lg md:text-xl text-white/55 max-w-2xl mx-auto leading-relaxed landing-animate-fade-up opacity-0"
            style={{ animationDelay: '0.35s', animationFillMode: 'forwards' }}
          >
            Cheapest Nano Banana on the market. Fast generations, credit roll-over, and plans that <span className="landing-font-display font-semibold text-blue-400">actually make sense</span>.
          </p>
          <div
            className="mt-14 flex flex-wrap items-center justify-center gap-4 landing-animate-fade-up opacity-0"
            style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
          >
            <Link
              to="/app"
              className="group relative px-9 py-4 rounded-2xl bg-white text-[#08090a] font-semibold text-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-400/25"
            >
              <span className="relative z-10">Start Kreating</span>
              <span className="absolute inset-0 bg-gradient-to-r from-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <a
              href="#whats-kreating"
              className="px-9 py-4 rounded-2xl border-2 border-white/15 text-white/90 font-semibold hover:border-blue-400/50 hover:text-blue-200 hover:bg-blue-500/10 transition-all duration-300"
            >
              See what's Kreating
            </a>
            <a
              href="#how-it-works"
              className="px-9 py-4 rounded-2xl border border-white/10 text-white/60 font-medium hover:text-white/90 hover:border-white/20 transition-all duration-300"
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* What's Kreating? */}
      <section id="whats-kreating" className="relative py-28 overflow-hidden">
        <div ref={showcaseRef} className={`relative z-10 landing-scroll-reveal ${showcaseInView ? 'landing-in-view' : ''}`}>
          <div className="max-w-6xl mx-auto px-6 text-center mb-16 landing-reveal-item">
            <h2 className="landing-font-display text-3xl md:text-5xl font-bold text-white">
              What's <span className="landing-gradient-text">Kreating</span>?
            </h2>
            <p className="mt-4 text-white/55 text-lg max-w-xl mx-auto">
              Real images from the community. One prompt, one generation.
            </p>
          </div>
          {showcaseThumbnails.length > 0 ? (
            <div className="landing-reveal-item w-full grid grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
              {/* Column 1: scroll down */}
              <div className="landing-showcase-col h-[320px] md:h-[380px] rounded-xl overflow-hidden">
                <div className="landing-showcase-col-track landing-showcase-col-track-down flex flex-col gap-3 h-max">
                  {[...showcaseCol1, ...showcaseCol1].map((src, i) => (
                    <div key={`c1-${i}`} className="flex-shrink-0 w-full aspect-square rounded-lg overflow-hidden border border-white/10 bg-white/5">
                      <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              </div>
              {/* Column 2: scroll up */}
              <div className="landing-showcase-col h-[320px] md:h-[380px] rounded-xl overflow-hidden">
                <div className="landing-showcase-col-track landing-showcase-col-track-up flex flex-col gap-3 h-max">
                  {[...showcaseCol2, ...showcaseCol2].map((src, i) => (
                    <div key={`c2-${i}`} className="flex-shrink-0 w-full aspect-square rounded-lg overflow-hidden border border-white/10 bg-white/5">
                      <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              </div>
              {/* Column 3: scroll down */}
              <div className="landing-showcase-col h-[320px] md:h-[380px] rounded-xl overflow-hidden">
                <div className="landing-showcase-col-track landing-showcase-col-track-down flex flex-col gap-3 h-max" style={{ animationDuration: '48s' }}>
                  {[...showcaseCol3, ...showcaseCol3].map((src, i) => (
                    <div key={`c3-${i}`} className="flex-shrink-0 w-full aspect-square rounded-lg overflow-hidden border border-white/10 bg-white/5">
                      <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 landing-reveal-item min-h-[280px] items-center justify-center text-white/40">
              <div className="flex gap-3 flex-wrap justify-center max-w-2xl">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
                ))}
              </div>
              <p className="text-sm mt-4">Community images will appear here</p>
            </div>
          )}
        </div>
      </section>

      {/* Pricing */}
      <section className="relative py-28 px-6 border-t border-white/[0.06]">
        <div ref={pricingRef} className={`max-w-5xl mx-auto relative z-10 landing-scroll-reveal ${pricingInView ? 'landing-in-view' : ''}`}>
          <div className="text-center mb-4 landing-reveal-item">
            <h2 className="landing-font-display text-3xl md:text-4xl font-bold text-white">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-white/55 text-lg max-w-2xl mx-auto">
              Pick a plan, get monthly generations. Unused credits roll over. Cancel anytime.
            </p>
          </div>
          <p className="text-center text-white/40 text-sm mt-2 mb-12 landing-reveal-item">
            Same Nano Banana models others charge a premium for. We start at <span className="text-white/70 font-medium">$0.063 per generation</span>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 landing-reveal-item">
            {/* Starter */}
            <div className="relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300 flex flex-col">
              <div className="text-center">
                <h3 className="landing-font-display font-bold text-white text-lg">Starter</h3>
                <p className="text-white/40 text-xs mt-1">For first-time AI content creators</p>
                <div className="mt-4 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <p className="text-white font-bold text-sm">100 generations / mo</p>
                  <p className="text-white/50 text-xs mt-1">$0.11 per generation</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-green-500/15 text-green-400 border border-green-500/20">27% cheaper than Higgsfield</span>
                </div>
                <p className="mt-4 text-3xl font-bold text-white">$11<span className="text-white/50 text-base font-normal"> / month</span></p>
                <Link to="/app" className="mt-5 block w-full py-3 rounded-xl border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors">Get started</Link>
              </div>
            </div>

            {/* Kreator */}
            <div className="relative p-6 rounded-2xl bg-white/[0.06] border-2 border-blue-400/40 shadow-lg shadow-blue-500/15 flex flex-col landing-reveal-card">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-500/90 text-white text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">Most popular</div>
              <div className="text-center">
                <h3 className="landing-font-display font-bold text-white text-lg">Kreator</h3>
                <p className="text-white/40 text-xs mt-1">For consistent AI content creators</p>
                <div className="mt-4 p-3 rounded-xl bg-blue-500/[0.06] border border-blue-500/20">
                  <p className="text-white font-bold text-sm">500 generations / mo</p>
                  <p className="text-white/50 text-xs mt-1">$0.078 per generation</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-green-500/15 text-green-400 border border-green-500/20">20% cheaper than Higgsfield</span>
                </div>
                <p className="mt-4 text-3xl font-bold text-white">$39<span className="text-white/50 text-base font-normal"> / month</span></p>
                <Link to="/app" className="mt-5 block w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold hover:opacity-95 transition-opacity shadow-md shadow-blue-500/20">Get started</Link>
              </div>
            </div>

            {/* Agency */}
            <div className="relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300 flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500/90 text-white text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap">Best value</div>
              <div className="text-center">
                <h3 className="landing-font-display font-bold text-white text-lg">Agency</h3>
                <p className="text-white/40 text-xs mt-1">For studios and production teams</p>
                <div className="mt-4 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <p className="text-white font-bold text-sm">1,500 generations / mo</p>
                  <p className="text-white/50 text-xs mt-1">$0.063 per generation</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-green-500/15 text-green-400 border border-green-500/20">5% cheaper than Higgsfield</span>
                </div>
                <p className="mt-4 text-3xl font-bold text-white">$95<span className="text-white/50 text-base font-normal"> / month</span></p>
                <Link to="/app" className="mt-5 block w-full py-3 rounded-xl border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors">Get started</Link>
              </div>
            </div>
          </div>

          {/* Everything included */}
          <div className="mt-12 rounded-2xl bg-white/[0.03] border border-white/10 p-6 md:p-8 landing-reveal-item">
            <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-4">Everything included in all plans</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3">
              {INCLUDED_FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-white/70 text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-8 text-center text-white/40 text-xs landing-reveal-item">
            Unused credits roll over each month. Cancel anytime &mdash; keep your remaining credits.
          </p>
          <div className="mt-10 text-center landing-reveal-item">
            <Link
              to="/app"
              className="inline-flex px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold hover:opacity-95 hover:scale-105 transition-all duration-300 shadow-lg shadow-blue-500/25"
            >
              Start with 20 free generations
            </Link>
          </div>
        </div>
      </section>

      {/* Why Kreator */}
      <section className="relative py-24 px-6 border-y border-white/[0.06]">
        <div ref={problemRef} className={`max-w-3xl mx-auto text-center relative z-10 landing-scroll-reveal ${problemInView ? 'landing-in-view' : ''}`}>
          <h2 className="landing-font-display text-3xl md:text-4xl font-bold text-white landing-reveal-item">
            Tired of overpaying for AI images?
          </h2>
          <p className="mt-6 text-white/50 leading-relaxed text-lg landing-reveal-item">
            Other tools charge premium prices for the same Nano Banana models we use. Their credits expire, their plans are rigid, and switching costs you money. Kreator gives you the same quality at a fraction of the price &mdash; with credits that roll over and plans you can cancel anytime.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative py-28 px-6 border-t border-white/[0.06]">
        <div ref={solutionRef} className={`max-w-5xl mx-auto relative z-10 landing-scroll-reveal ${solutionInView ? 'landing-in-view' : ''}`}>
          <div className="text-center mb-16 landing-reveal-item">
            <h2 className="landing-font-display text-3xl md:text-4xl font-bold text-white">
              Why <span className="landing-gradient-text">Kreator</span>?
            </h2>
            <p className="mt-4 text-white/55 text-lg max-w-2xl mx-auto">
              Pro-quality images, the lowest prices, and credits that never expire. Everything you need to create without the waste.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="group relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300 landing-reveal-card">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="landing-font-display font-bold text-white text-lg mb-2">Cheapest on the market</h3>
              <p className="text-white/50 text-sm leading-relaxed">Same Nano Banana 2 &amp; Pro models others charge $0.15+ per image for. Our plans start at $0.063 per generation.</p>
            </div>

            <div className="group relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300 landing-reveal-card">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </div>
              <h3 className="landing-font-display font-bold text-white text-lg mb-2">Credits roll over</h3>
              <p className="text-white/50 text-sm leading-relaxed">Didn't use all your generations this month? They carry over. No expiry, no waste. Your credits are yours until you use them.</p>
            </div>

            <div className="group relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300 landing-reveal-card">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="landing-font-display font-bold text-white text-lg mb-2">Match your look</h3>
              <p className="text-white/50 text-sm leading-relaxed">Drop in reference images and get results in that style. Perfect for brand consistency, client mood boards, or nailing a specific aesthetic.</p>
            </div>

            <div className="group relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300 landing-reveal-card">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/30 transition-colors">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
              </div>
              <h3 className="landing-font-display font-bold text-white text-lg mb-2">Any format, up to 4K</h3>
              <p className="text-white/50 text-sm leading-relaxed">Feed, story, print, or custom aspect ratios. Output up to 4K resolution. No juggling multiple tools or cropping later.</p>
            </div>

            <div className="group relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300 landing-reveal-card">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/30 transition-colors">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="landing-font-display font-bold text-white text-lg mb-2">Fast, not fussy</h3>
              <p className="text-white/50 text-sm leading-relaxed">Up to 3 parallel generations at once with unlimited queued jobs. Describe it, hit Kreate, iterate fast.</p>
            </div>

            <div className="group relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300 landing-reveal-card">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/30 transition-colors">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <h3 className="landing-font-display font-bold text-white text-lg mb-2">Cancel anytime</h3>
              <p className="text-white/50 text-sm leading-relaxed">No contracts, no penalties. Cancel and keep using your remaining credits. Switch plans or come back whenever you want.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-36 px-6 border-t border-white/[0.06]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_100%,rgba(59,130,246,0.08),transparent)] pointer-events-none" />
        <div ref={ctaRef} className={`max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center relative z-10 landing-scroll-reveal ${ctaInView ? 'landing-in-view' : ''}`}>
          <div
            ref={glowContainerRef}
            className="order-2 md:order-1 flex justify-center relative"
            onMouseMove={handleGlowMouseMove}
            onMouseLeave={handleGlowMouseLeave}
          >
            <div className="relative w-full max-w-md">
              <img src="/shipfastersquare.png" alt="Ship faster" className="w-full object-contain rounded-[2rem] border border-white/10 shadow-2xl shadow-black/30 ring-1 ring-white/5 relative z-10" />
              {glowPos && (
                <div
                  className="absolute inset-0 rounded-[2rem] pointer-events-none z-20 mix-blend-screen"
                  style={{
                    background: `radial-gradient(circle 180px at ${glowPos.x}px ${glowPos.y}px, rgba(139, 92, 246, 0.45) 0%, rgba(99, 102, 241, 0.25) 35%, rgba(59, 130, 246, 0.1) 55%, transparent 75%)`,
                  }}
                />
              )}
            </div>
          </div>
          <div className="order-1 md:order-2 text-center md:text-left">
            <h2 className="landing-font-display text-3xl md:text-5xl font-bold text-white landing-reveal-item">
              Built for creators who ship
            </h2>
            <p className="mt-6 text-white/55 text-lg landing-reveal-item">
              Join agencies and freelancers saving up to 60% on AI image generation. Same models, lower price, credits that never expire.
            </p>
            <Link
              to="/app"
              className="mt-12 inline-flex px-10 py-5 rounded-2xl bg-white text-[#08090a] font-bold text-lg hover:bg-blue-50 hover:scale-105 transition-all duration-300 shadow-xl shadow-white/10 landing-reveal-item"
            >
              Open Kreator
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 border-t border-white/[0.06] text-center text-white/40 text-sm landing-font-display">
        <p>By Kreator, for creators.</p>
      </footer>
    </div>
  );
}
