import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface HeaderProps {
  onSignOut: () => void;
  credits?: number | null;
}

const BANNER_HEIGHT = 40;

const Header: React.FC<HeaderProps> = ({ onSignOut, credits }) => {
  const location = useLocation();
  const isProfile = location.pathname === '/profile';

  return (
    <>
      {/* Announcement banner */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-medium"
        style={{ height: BANNER_HEIGHT }}
      >
        <span>Up to 50 FREE <span className="font-bold tracking-tight">Kreations</span> with Nano Banana Pro now!</span>
      </div>
      <header
        className="fixed left-0 right-0 z-40 h-14 flex items-center justify-between px-6 bg-black/40 backdrop-blur-xl border-b border-white/10"
        style={{ top: BANNER_HEIGHT }}
      >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3">
          <img src="/kreatorlogo.png" alt="Kreator" className="h-8 w-auto rounded-xl" />
          <span className="text-xl font-bold text-white tracking-tight">
            Kreator
          </span>
        </Link>
        <span className="text-white/40 text-sm hidden sm:inline italic">By Kreator, for creators.</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {typeof credits === 'number' && (
          <span className="px-3 py-1.5 rounded-lg bg-white/10 text-white/90 text-sm font-medium border border-white/20">
            {credits} credits
          </span>
        )}
        <Link
          to="/profile"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium tracking-wide transition-all ${
            isProfile
              ? 'bg-blue-500/20 text-white border-blue-400/60 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
              : 'bg-transparent text-white border-blue-400/40 hover:border-blue-400/70 hover:bg-blue-500/10 hover:shadow-[0_0_12px_rgba(59,130,246,0.2)]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          My Kreator
        </Link>
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-400/40 bg-transparent text-white text-sm font-medium tracking-wide transition-all hover:border-blue-400/70 hover:bg-blue-500/10 hover:shadow-[0_0_12px_rgba(59,130,246,0.2)]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </header>
    </>
  );
};

export { BANNER_HEIGHT };

export default Header;
