import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { fetchShowcaseThumbnails } from '../services/imageStorage';
import LandingCursorLogo from '../components/LandingCursorLogo';

const HERO_ROTATING_WORDS = ['hassle', 'waste', 'noise', 'clutter', 'bloat'];
const HERO_WORD_INTERVAL_MS = 1500;

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

  const showcasePerCol = showcaseThumbnails.length > 0 ? Math.ceil(showcaseThumbnails.length / 3) : 0;
  const showcaseCol1 = showcaseThumbnails.slice(0, showcasePerCol);
  const showcaseCol2 = showcaseThumbnails.slice(showcasePerCol, showcasePerCol * 2);
  const showcaseCol3 = showcaseThumbnails.slice(showcasePerCol * 2);

  return (
    <div className="min-h-screen bg-[#08090a] text-white overflow-x-hidden landing-font-body">
      <LandingCursorLogo />
      {/* Animated background orbs - blue palette + strong parallax on scroll */}
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

      {/* Announcement banner - same as app header */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium"
        style={{ height: 40 }}
      >
        <span><span className="font-bold tracking-tight">20 free credits</span> for Nano Banana Pro when you sign up</span>
      </div>

      {/* Nav - stronger border/backdrop on scroll */}
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

      {/* Hero - parallax: content lags behind scroll for depth */}
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
            Pay only for what you <span className="landing-font-display font-semibold text-blue-400">Kreate</span>. No subscriptions, no credit traps, no overpaying the big players.
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
              See what’s Kreating
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

      {/* What's Kreating? - Showcase: 3 rows of Supabase thumbnails, marquee full viewport width */}
      <section id="whats-kreating" className="relative py-28 overflow-hidden">
        <div ref={showcaseRef} className={`relative z-10 landing-scroll-reveal ${showcaseInView ? 'landing-in-view' : ''}`}>
          <div className="max-w-6xl mx-auto px-6 text-center mb-16 landing-reveal-item">
            <h2 className="landing-font-display text-3xl md:text-5xl font-bold text-white">
              What’s <span className="landing-gradient-text">Kreating</span>?
            </h2>
            <p className="mt-4 text-white/55 text-lg max-w-xl mx-auto">
              Real images from the community. One prompt, one credit, no lock-in.
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

      {/* Pricing / Kredit packages */}
      <section className="relative py-28 px-6 border-t border-white/[0.06]">
        <div ref={pricingRef} className={`max-w-5xl mx-auto relative z-10 landing-scroll-reveal ${pricingInView ? 'landing-in-view' : ''}`}>
          <div className="text-center mb-4 landing-reveal-item">
            <h2 className="landing-font-display text-3xl md:text-4xl font-bold text-white">
              Simple pricing
            </h2>
            <p className="mt-4 text-white/55 text-lg max-w-2xl mx-auto">
              Start with free credits. When you’re ready, buy more. No subscription required.
            </p>
          </div>
          <p className="text-center text-white/40 text-sm mt-2 mb-12 landing-reveal-item">
            Same flagship-quality models you’d get from big providers. Google charges around <span className="text-white/70 font-medium">$0.16 per image</span> for comparable API usage—we’re up to half the cost.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 landing-reveal-item">
            {/* Starter */}
            <div className="relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300">
              <div className="text-center">
                <h3 className="landing-font-display font-bold text-white text-lg">Starter</h3>
                <p className="mt-4 text-3xl font-bold text-white">$19</p>
                <p className="mt-1 text-white/60 text-sm">200 credits · 200 image generations</p>
                <p className="mt-2 text-blue-400/90 text-sm font-medium">$0.095 per credit</p>
                <Link to="/app" className="mt-6 block w-full py-3 rounded-xl border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors">Get started</Link>
              </div>
            </div>
            {/* Kreator ⭐ */}
            <div className="relative p-6 rounded-2xl bg-white/[0.06] border-2 border-blue-400/40 shadow-lg shadow-blue-500/15 landing-reveal-card">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-500/90 text-white text-xs font-semibold">Popular</div>
              <div className="text-center">
                <h3 className="landing-font-display font-bold text-white text-lg">Kreator ⭐</h3>
                <p className="mt-4 text-3xl font-bold text-white">$35</p>
                <p className="mt-1 text-white/60 text-sm">400 credits · 400 image generations</p>
                <p className="mt-2 text-blue-400/90 text-sm font-medium">$0.0875 per credit</p>
                <Link to="/app" className="mt-6 block w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold hover:opacity-95 transition-opacity">Get started</Link>
              </div>
            </div>
            {/* Agency */}
            <div className="relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300">
              <div className="text-center">
                <h3 className="landing-font-display font-bold text-white text-lg">Agency</h3>
                <p className="mt-4 text-3xl font-bold text-white">$85</p>
                <p className="mt-1 text-white/60 text-sm">1,000 credits · 1,000 image generations</p>
                <p className="mt-2 text-blue-400/90 text-sm font-medium">$0.085 per credit</p>
                <Link to="/app" className="mt-6 block w-full py-3 rounded-xl border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors">Get started</Link>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-white/50 text-sm landing-reveal-item">
            Need fewer than 200 credits? Top up a custom amount and pay <span className="text-white/80 font-medium">$0.099</span> per credit.
          </p>
          <p className="mt-2 text-center text-white/40 text-xs landing-reveal-item">
            One credit = one generation. Flagship models, aspect ratios, reference images. Pay only for what you create.
          </p>
          <div className="mt-10 text-center landing-reveal-item">
            <Link
              to="/app"
              className="inline-flex px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold hover:opacity-95 hover:scale-105 transition-all duration-300 shadow-lg shadow-blue-500/25"
            >
              Get started — free credits included
            </Link>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="relative py-24 px-6 border-y border-white/[0.06]">
        <div ref={problemRef} className={`max-w-3xl mx-auto text-center relative z-10 landing-scroll-reveal ${problemInView ? 'landing-in-view' : ''}`}>
          <h2 className="landing-font-display text-3xl md:text-4xl font-bold text-white landing-reveal-item">
            Tired of subscriptions and credit loss?
          </h2>
          <p className="mt-6 text-white/50 leading-relaxed text-lg landing-reveal-item">
            Tools like Higgsfield lock you into monthly plans. Use less and you still pay the full fee. Use more and you hit expensive top-ups. Credits expire. You end up handing money to the same industry leaders, whether you’re underusing or overusing.
          </p>
        </div>
      </section>

      {/* How it works – benefits & features that matter */}
      <section id="how-it-works" className="relative py-28 px-6 border-t border-white/[0.06]">
        <div ref={solutionRef} className={`max-w-5xl mx-auto relative z-10 landing-scroll-reveal ${solutionInView ? 'landing-in-view' : ''}`}>
          <div className="text-center mb-16 landing-reveal-item">
            <h2 className="landing-font-display text-3xl md:text-4xl font-bold text-white">
              Why <span className="landing-gradient-text">Kreator</span>?
            </h2>
            <p className="mt-4 text-white/55 text-lg max-w-2xl mx-auto">
              Pro-quality images, fair pricing, and no lock-in. Everything you need to create without the waste.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="group relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300 landing-reveal-card">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
              </div>
              <h3 className="landing-font-display font-bold text-white text-lg mb-2">Pro-quality, not pro prices</h3>
              <p className="text-white/50 text-sm leading-relaxed">Same flagship model the big players charge ~$0.16 per image for. You get that quality at up to half the cost—no subscription required.</p>
            </div>

            <div className="group relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300 landing-reveal-card">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="landing-font-display font-bold text-white text-lg mb-2">Match your look</h3>
              <p className="text-white/50 text-sm leading-relaxed">Drop in reference images and get results in that style. Perfect for brand consistency, client mood boards, or nailing a specific aesthetic.</p>
            </div>

            <div className="group relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300 landing-reveal-card">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
              </div>
              <h3 className="landing-font-display font-bold text-white text-lg mb-2">Any format you need</h3>
              <p className="text-white/50 text-sm leading-relaxed">Feed, story, print, or custom. Pick the aspect ratio that fits the project—no juggling multiple tools or cropping later.</p>
            </div>

            <div className="group relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300 landing-reveal-card">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/30 transition-colors">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 className="landing-font-display font-bold text-white text-lg mb-2">Pay only for what you use</h3>
              <p className="text-white/50 text-sm leading-relaxed">One credit, one image. No monthly fee, no surprise bills. Use five or five hundred—you’re in control. Start with free credits and top up when you need more.</p>
            </div>

            <div className="group relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300 landing-reveal-card">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/30 transition-colors">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="landing-font-display font-bold text-white text-lg mb-2">Fast, not fussy</h3>
              <p className="text-white/50 text-sm leading-relaxed">Describe it, add refs if you want, hit Kreate. Your images show up without the usual wait—so you can iterate and ship.</p>
            </div>

            <div className="group relative p-6 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-400/25 transition-all duration-300 landing-reveal-card">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/30 transition-colors">
                <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>
              </div>
              <h3 className="landing-font-display font-bold text-white text-lg mb-2">Yours to keep</h3>
              <p className="text-white/50 text-sm leading-relaxed">Full-resolution files in your account. Use them in client work, campaigns, or wherever you need—no watermarks, no takebacks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-36 px-6 border-t border-white/[0.06]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_100%,rgba(59,130,246,0.08),transparent)] pointer-events-none" />
        <div ref={ctaRef} className={`max-w-2xl mx-auto text-center relative z-10 landing-scroll-reveal ${ctaInView ? 'landing-in-view' : ''}`}>
          <h2 className="landing-font-display text-3xl md:text-5xl font-bold text-white landing-reveal-item">
            Built for creators who ship
          </h2>
          <p className="mt-6 text-white/55 text-lg landing-reveal-item">
            Join agencies and freelancers who switched to pay-as-you-go. Less waste, more control.
          </p>
          <Link
            to="/app"
            className="mt-12 inline-flex px-10 py-5 rounded-2xl bg-white text-[#08090a] font-bold text-lg hover:bg-blue-50 hover:scale-105 transition-all duration-300 shadow-xl shadow-white/10 landing-reveal-item"
          >
            Open Kreator
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-6 border-t border-white/[0.06] text-center text-white/40 text-sm landing-font-display">
        <p>By Kreator, for creators.</p>
      </footer>
    </div>
  );
}
