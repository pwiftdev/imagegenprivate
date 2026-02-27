import React from 'react';

interface HeaderProps {
  onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSignOut }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-6 bg-black/40 backdrop-blur-xl border-b border-white/10">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3">
        <img src="/kreatorlogo.png" alt="Kreator" className="h-8 w-auto rounded-xl" />
        <span className="text-xl font-bold text-white tracking-tight">
          Kreator
        </span>
        <span className="text-white/40 text-sm hidden sm:inline italic">By Kreator, for creators.</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-medium transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </header>
  );
};

export default Header;
