import React, { useEffect, useState } from 'react';
import { fetchStatsFromSupabase } from '../services/imageStorage';

interface StatisticsModalProps {
  onClose: () => void;
}

const StatisticsModal: React.FC<StatisticsModalProps> = ({ onClose }) => {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchStatsFromSupabase>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchStatsFromSupabase().then((data) => {
      if (!cancelled) {
        setStats(data);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-3xl bg-white/5 backdrop-blur-xl border border-white/20 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/10 bg-black/20 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Statistics</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-blue-500" />
            </div>
          ) : stats ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-white/60 text-sm mb-1">Total Images Generated</p>
                  <p className="text-2xl font-bold text-white">{stats.totalImages.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <p className="text-white/60 text-sm mb-1">API Calls</p>
                  <p className="text-2xl font-bold text-white">{stats.totalApiCalls.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 col-span-2">
                  <p className="text-white/60 text-sm mb-1">Total Cost</p>
                  <p className="text-2xl font-bold text-blue-400">${stats.totalCost.toFixed(2)}</p>
                  <p className="text-white/40 text-xs mt-1">$0.05 per image (Nano Banana Pro)</p>
                </div>
              </div>

              {/* Monthly Overview */}
              <div>
                <h3 className="text-white font-medium mb-3">Monthly Overview</h3>
                {stats.monthlyOverview.length === 0 ? (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center text-white/50 text-sm">
                    No data yet. Generate some images to see your usage over time.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.monthlyOverview.map((month) => (
                      <div
                        key={month.month}
                        className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-3"
                      >
                        <span className="text-white font-medium">{month.month}</span>
                        <div className="flex items-center gap-6">
                          <span className="text-white/80 text-sm">
                            {month.images} image{month.images !== 1 ? 's' : ''}
                          </span>
                          <span className="text-blue-400 font-medium">${month.cost.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              {stats.recentActivity.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-3">Recent Activity</h3>
                  <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      {stats.recentActivity.map((record, i) => (
                        <div
                          key={`${record.date}-${i}`}
                          className="flex items-center justify-between px-4 py-2 border-b border-white/5 last:border-0"
                        >
                          <span className="text-white/60 text-sm">{record.date}</span>
                          <span className="text-white text-sm">
                            {record.count} image{record.count !== 1 ? 's' : ''} • ${record.cost.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center text-white/50 text-sm">
              Failed to load statistics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsModal;
