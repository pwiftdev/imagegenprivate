import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { fetchProfile, updateProfile, uploadAvatar } from '../services/profileService';
import { fetchUserStats } from '../services/imageStorage';
import type { User } from '@supabase/supabase-js';
import type { ImageStats } from '../services/imageStorage';

interface ProfilePageProps {
  user: User;
}

const QUALITY_COLORS = { '1K': '#3b82f6', '2K': '#8b5cf6', '4K': '#ec4899' };

const ProfilePage: React.FC<ProfilePageProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [stats, setStats] = useState<ImageStats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      let p = await fetchProfile(user.id);
      if (!p) {
        await updateProfile(user.id, { username: user.email?.split('@')[0] || 'Creator' });
        p = await fetchProfile(user.id);
      }
      if (p) {
        setUsername(p.username || user.email?.split('@')[0] || '');
        setAvatarPreview(p.avatar_url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!user?.id) return;
    fetchUserStats(user.id).then(setStats).catch(() => setStats(null));
  }, [user?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateProfile(user.id, { username: username.trim() || undefined });
      setSuccess('Profile saved');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || saving) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const url = await uploadAvatar(user.id, file);
      await updateProfile(user.id, { avatar_url: url });
      setAvatarPreview(url);
      setSuccess('Profile picture updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const currentMonthStr = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const thisMonthEntry = stats?.monthlyOverview?.find((m) => m.month === currentMonthStr);
  const thisMonth = thisMonthEntry?.images ?? 0;

  const qualityChartData = stats?.byQuality
    ? (['1K', '2K', '4K'] as const)
        .filter((k) => stats.byQuality![k] > 0)
        .map((k) => ({ name: k, value: stats.byQuality![k], color: QUALITY_COLORS[k] }))
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-24">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-16 pt-24">
      <div className="w-full max-w-7xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Kreations
        </Link>

        {/* Dashboard header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
          <div className="flex items-center gap-4 flex-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group flex-shrink-0"
            >
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10 border-2 border-white/20 flex items-center justify-center ring-2 ring-transparent group-hover:ring-blue-500/50 transition-all">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
              <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-medium">Edit</span>
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{username || 'Creator'}</h1>
              <p className="text-white/50 text-sm">{user.email}</p>
            </div>
          </div>
          <Link
            to="/"
            className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
            </svg>
            View my Kreations
          </Link>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-xl bg-blue-500/15 border border-blue-500/30 px-4 py-3 text-blue-300 text-sm">
            {success}
          </div>
        )}

        {/* Stats overview cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/5 border border-white/20 p-6">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Total Kreations</p>
            <p className="text-3xl font-bold text-white">{(stats?.totalImages ?? 0).toLocaleString()}</p>
          </div>
          <div className="rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/5 border border-white/20 p-6">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">This Month</p>
            <p className="text-3xl font-bold text-white">{thisMonth}</p>
            <p className="text-white/40 text-xs mt-0.5">{currentMonthStr}</p>
          </div>
          <div className="rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/5 border border-white/20 p-6">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Last Active</p>
            <p className="text-lg font-bold text-white">{stats?.recentActivity?.[0]?.date ?? '—'}</p>
            {stats?.recentActivity?.[0] && (
              <p className="text-white/40 text-xs mt-0.5">{stats.recentActivity[0].count} images</p>
            )}
          </div>
          <div className="rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/5 border border-white/20 p-6">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Recent Days</p>
            <p className="text-3xl font-bold text-white">{stats?.recentActivity?.length ?? 0}</p>
            <p className="text-white/40 text-xs mt-0.5">days with activity</p>
          </div>
        </div>

        {/* Charts + Settings grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Monthly activity chart */}
          <div className="lg:col-span-2 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/5 border border-white/20 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Monthly Activity</h2>
            {stats?.monthlyOverview && stats.monthlyOverview.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...stats.monthlyOverview].reverse().slice(-6)}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        color: '#e2e8f0',
                      }}
                      labelStyle={{ color: '#94a3b8' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="images" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-white/40 text-sm">
                No activity yet — start creating to see your chart
              </div>
            )}
          </div>

          {/* Quality breakdown */}
          <div className="rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/5 border border-white/20 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Quality Breakdown</h2>
            {qualityChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qualityChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {qualityChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '12px',
                        color: '#e2e8f0',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-white/40 text-sm text-center px-4">
                Generate images to see quality distribution
              </div>
            )}
          </div>
        </div>

        {/* Recent activity table + Profile settings */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent activity */}
          <div className="lg:col-span-2 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/5 border border-white/20 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/50 border-b border-white/10">
                      <th className="text-left py-3 font-medium">Date</th>
                      <th className="text-right py-3 font-medium">Images</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentActivity.map((row, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-3 text-white">{row.date}</td>
                        <td className="py-3 text-right text-white/80">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-white/40 text-sm">No recent activity</p>
            )}
          </div>

          {/* Profile settings card */}
          <div className="rounded-2xl backdrop-blur-xl bg-gradient-to-br from-white/10 via-white/5 to-white/5 border border-white/20 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Profile Settings</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-white/70 text-sm mb-1.5">
                  Display name
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your display name"
                  className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1.5">Email</label>
                <div className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-white/70 text-sm">
                  {user.email}
                </div>
                <p className="text-white/40 text-xs mt-1">Email cannot be changed</p>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
