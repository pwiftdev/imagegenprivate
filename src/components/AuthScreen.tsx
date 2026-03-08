import React, { useState } from 'react';

type Mode = 'signin' | 'signup' | 'forgot';

interface AuthScreenProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, username?: string) => Promise<void>;
  onSignInWithGoogle?: () => Promise<void>;
  onResetPassword: (email: string) => Promise<void>;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onSignIn, onSignUp, onSignInWithGoogle, onResetPassword }) => {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (!onSignInWithGoogle) return;
    setError(null);
    setGoogleLoading(true);
    try {
      await onSignInWithGoogle();
      // Redirect happens; no need to clear loading
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (mode !== 'forgot' && !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    if (mode === 'signup' && !username.trim()) {
      setError('Please enter a Kreator username');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await onSignUp(email, password, username.trim());
        setMessage('Check your email to confirm your account.');
      } else if (mode === 'signin') {
        await onSignIn(email, password);
      } else {
        await onResetPassword(email);
        setMessage('Check your email for a password reset link.');
        setMode('signin');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen h-screen flex items-center bg-[#08090a] text-white relative overflow-hidden landing-font-body">
      {/* Background – same as landing hero: orbs + gradient + noise */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute" style={{ top: '-35%', left: '-25%' }}>
          <div className="w-[90vmax] h-[90vmax] rounded-full bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-blue-600/15 landing-animate-float landing-animate-glow" />
        </div>
        <div className="absolute" style={{ bottom: '-25%', right: '-20%' }}>
          <div className="w-[70vmax] h-[70vmax] rounded-full bg-gradient-to-tl from-indigo-500/12 via-blue-500/10 to-sky-500/12 landing-animate-float-slow landing-animate-glow" style={{ animationDelay: '-5s' }} />
        </div>
        <div className="absolute" style={{ top: '55%', left: '45%' }}>
          <div className="w-[50vmax] h-[50vmax] rounded-full bg-gradient-to-br from-sky-500/8 to-blue-600/10 landing-animate-float" style={{ animationDelay: '-10s' }} />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.025\'/%3E%3C/svg%3E')]" />
      </div>

      {/* Left side – tagline (desktop) */}
      <div className="hidden md:flex flex-1 min-w-0 items-center justify-center px-12 relative z-10">
        <div className="max-w-md text-center md:text-left">
          <h2 className="landing-font-display text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            AI image generation
            <br />
            <span className="landing-gradient-text">without the waste</span>
          </h2>
          <p className="mt-6 text-white/55 text-lg">
            Pay only for what you use. No subscriptions, no credit traps.
          </p>
        </div>
      </div>

      {/* Right panel – form */}
      <div
        className={`
          w-full md:w-[420px] flex-shrink-0 relative z-20
          md:min-h-screen md:flex md:items-center
          flex flex-col justify-center
          p-8 md:p-12
        `}
      >
        <div
          className={`
            relative w-full max-w-md mx-auto md:mx-0
            rounded-2xl md:rounded-3xl
            border border-white/10
            bg-[#08090a]/80 backdrop-blur-xl
            shadow-2xl shadow-black/30
            p-8 md:p-10
          `}
        >
          <div className="absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none" aria-hidden />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent rounded-t-2xl" />
          <div className="relative z-10">
            <div className="text-center mb-8">
              <img src="/kreatorlogo.png" alt="Kreator" className="h-11 w-auto mx-auto mb-4 rounded-xl" />
              <h1 className="landing-font-display text-2xl font-bold text-white tracking-tight">Kreator</h1>
              <p className="text-white/55 text-sm mt-1">By Kreator, for creators.</p>
            </div>

            {onSignInWithGoogle && mode !== 'forgot' && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded-xl border border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                  {googleLoading ? (
                    <span className="animate-spin inline-block w-5 h-5 border-2 border-gray-400 border-t-gray-700 rounded-full" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                </button>
                <p className="text-center text-white/45 text-sm mb-4">or continue with email</p>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="username" className="block text-white/80 text-sm font-medium mb-1.5">Kreator username</label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="your_username"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  />
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-white/80 text-sm font-medium mb-1.5">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
              {mode !== 'forgot' && (
                <div>
                  <label htmlFor="password" className="block text-white/80 text-sm font-medium mb-1.5">Password</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  />
                  {mode === 'signup' && (
                    <p className="text-white/40 text-xs mt-1">At least 6 characters</p>
                  )}
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null); setMessage(null); }}
                      className="mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Forgot your password?
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-2.5 text-red-300 text-sm">
                  {error}
                </div>
              )}
              {message && (
                <div className="bg-blue-500/15 border border-blue-500/30 rounded-xl px-4 py-2.5 text-blue-300 text-sm">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
              >
                {loading
                  ? 'Please wait...'
                  : mode === 'signup'
                    ? 'Create account'
                    : mode === 'signin'
                      ? 'Sign in'
                      : 'Send reset link'}
              </button>
            </form>

            <p className="text-center text-white/50 text-sm mt-6">
              {mode === 'signin' && (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError(null); setMessage(null); setUsername(''); }}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Sign up
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Sign in
                  </button>
                </>
              )}
              {mode === 'forgot' && (
                <>
                  Remembered your password?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Back to sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
