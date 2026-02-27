import React from 'react';

interface HeaderProps {
  onStatisticsClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onStatisticsClick }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-6 bg-black/40 backdrop-blur-xl border-b border-white/10">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold text-white tracking-tight">
          Jurefield
        </span>
        <span className="text-white/40 text-sm hidden sm:inline">— private image generation</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onStatisticsClick}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-medium transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Statistics
        </button>
      </div>
    </header>
  );
};

export default Header;
