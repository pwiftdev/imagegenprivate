import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface HeaderProps {
  onSignOut: () => void;
  credits?: number | null;
}

const Header: React.FC<HeaderProps> = ({ onSignOut, credits }) => {
  const location = useLocation();
  const isProfile = location.pathname === '/app/profile';

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
        {typeof credits === 'number' && (
          <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs font-semibold">
            {credits} credits
          </span>
        )}
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
          onClick={onSignOut}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/80 text-xs font-medium border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </header>
  );
};

export default Header;
