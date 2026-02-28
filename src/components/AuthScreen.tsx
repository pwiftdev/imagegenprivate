import React, { useState } from 'react';

type Mode = 'signin' | 'signup';

interface AuthScreenProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string, username?: string) => Promise<void>;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onSignIn, onSignUp }) => {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email.trim() || !password.trim()) {
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
      } else {
        await onSignIn(email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated gradient blobs */}
      <div
        className="auth-bg-blob w-96 h-96 bg-blue-500 -top-48 -left-48"
        style={{ animation: 'auth-blob-1 15s ease-in-out infinite' }}
      />
      <div
        className="auth-bg-blob w-80 h-80 bg-blue-600 bottom-1/4 -right-32"
        style={{ animation: 'auth-blob-2 18s ease-in-out infinite' }}
      />
      <div
        className="auth-bg-blob w-72 h-72 bg-blue-400/80 top-1/2 left-1/4"
        style={{ animation: 'auth-blob-3 20s ease-in-out infinite' }}
      />
      <div
        className="auth-bg-blob w-64 h-64 bg-indigo-500/60 -bottom-24 left-1/3"
        style={{ animation: 'auth-blob-1 22s ease-in-out infinite reverse' }}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="relative rounded-3xl backdrop-blur-xl bg-gradient-to-b from-white/10 via-white/5 to-white/5 border border-white/20 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-400/5 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

          <div className="relative z-10 p-8">
            <div className="text-center mb-8">
              <img src="/kreatorlogo.png" alt="Kreator" className="h-12 w-auto mx-auto mb-4 rounded-xl" />
              <h1 className="text-2xl font-bold text-white tracking-tight">Kreator</h1>
              <p className="text-white/60 text-sm mt-1 italic">By Kreator, for creators.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="username" className="block text-white/80 text-sm mb-1.5">Kreator username</label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="your_username"
                    className="w-full bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-white/80 text-sm mb-1.5">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-white/80 text-sm mb-1.5">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="••••••••"
                  className="w-full bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                />
                {mode === 'signup' && (
                  <p className="text-white/40 text-xs mt-1">At least 6 characters</p>
                )}
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2 text-red-300 text-sm">
                  {error}
                </div>
              )}
              {message && (
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl px-4 py-2 text-blue-300 text-sm">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <p className="text-center text-white/50 text-sm mt-6">
              {mode === 'signin' ? (
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
              ) : (
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
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
