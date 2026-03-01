import React from 'react';
import type { ImageStats } from '../services/imageStorage';

interface DashboardStatsProps {
  stats: ImageStats | null;
  loading?: boolean;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-white/5 border border-white/10 p-6 animate-pulse"
          >
            <div className="h-4 w-20 bg-white/10 rounded mb-4" />
            <div className="h-8 w-16 bg-white/20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const total = stats?.totalImages ?? 0;
  const currentMonthStr = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const thisMonthEntry = stats?.monthlyOverview?.find((m) => m.month === currentMonthStr);
  const thisMonth = thisMonthEntry?.images ?? 0;
  const recentCount = stats?.recentActivity?.[0]?.count ?? 0;
  const recentDate = stats?.recentActivity?.[0]?.date ?? '—';

  const cards = [
    {
      label: 'Total Kreations',
      value: total.toLocaleString(),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'This Month',
      value: thisMonth.toLocaleString(),
      sub: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'Last Active',
      value: recentDate,
      sub: recentCount > 0 ? `${recentCount} image${recentCount !== 1 ? 's' : ''}` : 'No recent activity',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/5 border border-white/20 p-6 shadow-lg"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white/60 text-sm font-medium uppercase tracking-wider mb-1">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-white truncate">
                {card.value}
              </p>
              {card.sub && (
                <p className="text-white/50 text-sm mt-0.5">{card.sub}</p>
              )}
            </div>
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
