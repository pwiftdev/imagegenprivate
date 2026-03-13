import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { fetchProfile, updateProfile, uploadAvatar } from '../services/profileService';
import { fetchUserStats } from '../services/imageStorage';
import type { User } from '@supabase/supabase-js';
import type { ImageStats } from '../services/imageStorage';

interface ProfilePageProps {
  user: User;
  credits?: number | null;
  onSignOut: () => void;
  onRequestPasswordReset?: () => Promise<void>;
}

type Section = 'overview' | 'account';

const QUALITY_COLORS = { '1K': '#3b82f6', '2K': '#6366f1', '4K': '#8b5cf6' };

const ProfilePage: React.FC<ProfilePageProps> = ({ user, credits, onSignOut, onRequestPasswordReset }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [stats, setStats] = useState<ImageStats | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [creditsChartView, setCreditsChartView] = useState<'daily' | 'monthly'>('daily');
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
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
  const thisMonth = stats?.thisMonthImages ?? 0;

  const qualityChartData = stats?.byQuality
    ? (['1K', '2K', '4K'] as const)
        .filter((k) => stats.byQuality![k] > 0)
        .map((k) => ({ name: k, value: stats.byQuality![k], color: QUALITY_COLORS[k] }))
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-blue-500" />
      </div>
    );
  }

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2a2 2 0 012 2zm0 12v-2a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'account',
      label: 'Account',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="h-screen bg-[#08090a] text-white flex landing-font-body overflow-hidden">
      {/* Left sidebar – viewport height, not scrollable */}
      <aside className="hidden md:flex w-56 h-full flex-shrink-0 flex-col border-r border-white/10 bg-[#08090a]/95 backdrop-blur-xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex-shrink-0">
          <Link to="/app" className="flex items-center gap-2.5 group">
            <img src="/kreatorlogo.png" alt="Kreator" className="h-8 w-auto rounded-lg" />
            <span className="landing-font-display font-bold text-white tracking-tight group-hover:text-blue-200 transition-colors">Kreator</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-hidden">
          {navItems.map((item) => {
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                    : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10 flex-shrink-0 space-y-2">
          {typeof credits === 'number' && (
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Credits</p>
              <p className="text-white font-semibold text-lg">{credits}</p>
            </div>
          )}
          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
          <Link
            to="/app"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors w-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
            </svg>
            Back to Kreations
          </Link>
        </div>
      </aside>

      {/* Main content – only this area scrolls */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6 md:p-8 w-full">
          {/* Mobile: back + section switcher */}
          <div className="flex md:hidden items-center justify-between gap-4 mb-6">
            <Link to="/app" className="flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </Link>
            <div className="flex rounded-xl bg-white/5 border border-white/10 p-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${section === item.id ? 'bg-blue-500/20 text-blue-300' : 'text-white/60'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
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

          {section === 'overview' && (
            <>
              {/* Page title */}
              <div className="mb-8">
                <h1 className="landing-font-display text-2xl md:text-3xl font-bold text-white">Overview</h1>
                <p className="text-white/55 text-sm mt-1">Your Kreator stats and activity</p>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-5 hover:border-blue-500/20 transition-colors">
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Total Kreations</p>
                  <p className="text-2xl font-bold text-white">{(stats?.totalImages ?? 0).toLocaleString()}</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-5 hover:border-blue-500/20 transition-colors">
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Credits Spent</p>
                  <p className="text-2xl font-bold text-white">{(stats?.totalImages ?? 0).toLocaleString()}</p>
                  <p className="text-white/40 text-xs mt-0.5">1 credit per image</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-5 hover:border-blue-500/20 transition-colors">
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">This Month</p>
                  <p className="text-2xl font-bold text-white">{thisMonth}</p>
                  <p className="text-white/40 text-xs mt-0.5">{currentMonthStr}</p>
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-5 hover:border-blue-500/20 transition-colors">
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Last Active</p>
                  <p className="text-lg font-bold text-white">{stats?.recentActivity?.[0]?.date ?? '—'}</p>
                  {stats?.recentActivity?.[0] && (
                    <p className="text-white/40 text-xs mt-0.5">{stats.recentActivity[0].count} images</p>
                  )}
                </div>
                <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-5 hover:border-blue-500/20 transition-colors">
                  <p className="text-white/50 text-xs font-medium uppercase tracking-wider mb-1">Active Days</p>
                  <p className="text-2xl font-bold text-white">{stats?.recentActivity?.length ?? 0}</p>
                  <p className="text-white/40 text-xs mt-0.5">days with activity</p>
                </div>
              </div>

              {/* Credits over time – line chart */}
              <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-6 mb-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="landing-font-display text-lg font-semibold text-white mb-0.5">Credits over time</h2>
                    <p className="text-white/45 text-xs">Credits spent (1 credit = 1 image generated)</p>
                  </div>
                  <div className="flex rounded-lg bg-white/5 border border-white/10 p-0.5">
                    <button
                      type="button"
                      onClick={() => setCreditsChartView('daily')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        creditsChartView === 'daily' ? 'bg-blue-500/25 text-blue-200' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreditsChartView('monthly')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        creditsChartView === 'monthly' ? 'bg-blue-500/25 text-blue-200' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>
                {(creditsChartView === 'daily' ? stats?.dailyOverview : stats?.monthlyOverview) &&
                (creditsChartView === 'daily' ? stats?.dailyOverview : stats?.monthlyOverview)!.length > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={
                          creditsChartView === 'daily'
                            ? stats!.dailyOverview
                            : [...stats!.monthlyOverview].reverse().slice(-8)
                        }
                        margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis
                          dataKey={creditsChartView === 'daily' ? 'dateLabel' : 'month'}
                          stroke="#64748b"
                          fontSize={10}
                          tickLine={false}
                          axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                          interval={creditsChartView === 'daily' ? 'preserveStartEnd' : 0}
                        />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(13, 14, 16, 0.98)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '10px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                            padding: '10px 14px',
                            color: '#e2e8f0',
                          }}
                          labelStyle={{ color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}
                          formatter={(value: number | undefined) => [`${value ?? 0} credits`, 'Credits spent']}
                          cursor={{ stroke: 'rgba(59, 130, 246, 0.5)', strokeWidth: 1 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="images"
                          name="Credits"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          dot={{ fill: '#3b82f6', strokeWidth: 0, r: creditsChartView === 'daily' ? 2 : 4 }}
                          activeDot={{ r: 6, fill: '#3b82f6', stroke: 'rgba(255,255,255,0.4)', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-56 flex items-center justify-center text-white/40 text-sm">
                    No activity yet — start creating to see your credits over time
                  </div>
                )}
              </div>

              {/* Charts row – Monthly activity + Quality breakdown */}
              <div className="grid lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-6">
                  <h2 className="landing-font-display text-lg font-semibold text-white mb-1">Monthly activity</h2>
                  <p className="text-white/45 text-xs mb-4">Images generated per month</p>
                  {stats?.monthlyOverview && stats.monthlyOverview.length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[...stats.monthlyOverview].reverse().slice(-6)} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                          <defs>
                            <linearGradient id="activityAreaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} />
                          <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(13, 14, 16, 0.98)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '10px',
                              boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                              padding: '10px 14px',
                            }}
                            labelStyle={{ color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}
                            formatter={(value: number | undefined) => [`${value ?? 0} images`, 'Generated']}
                            cursor={{ stroke: 'rgba(59, 130, 246, 0.5)', strokeWidth: 1 }}
                          />
                          <Area type="monotone" dataKey="images" fill="url(#activityAreaGradient)" stroke="#3b82f6" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-white/40 text-sm">
                      No activity yet — start creating to see your chart
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 p-6">
                  <h2 className="landing-font-display text-lg font-semibold text-white mb-1">Quality breakdown</h2>
                  <p className="text-white/45 text-xs mb-4">Distribution by output quality</p>
                  {qualityChartData.length > 0 ? (
                    <div className="h-64 flex flex-col">
                      <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={qualityChartData}
                              cx="50%"
                              cy="45%"
                              innerRadius={52}
                              outerRadius={78}
                              paddingAngle={3}
                              dataKey="value"
                              stroke="rgba(8,9,10,0.6)"
                              strokeWidth={2}
                            >
                              {qualityChartData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(13, 14, 16, 0.98)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '10px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                                padding: '10px 14px',
                                color: '#e2e8f0',
                              }}
                              itemStyle={{ color: '#e2e8f0' }}
                              labelStyle={{ color: '#94a3b8' }}
                              formatter={(value: number | undefined, _: unknown, item: { payload?: { name?: string } }) => [
                                `${value ?? 0} images (${item?.payload?.name ?? ''})`,
                                'Quality',
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2 pt-3 border-t border-white/8">
                        {qualityChartData.map((d) => (
                          <div key={d.name} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-white/70 text-xs font-medium">{d.name}</span>
                            <span className="text-white/50 text-xs">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-white/40 text-sm text-center px-4">
                      Generate images to see quality distribution
                    </div>
                  )}
                </div>
              </div>

              {/* Recent activity */}
              <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
                <h2 className="landing-font-display text-lg font-semibold text-white mb-4">Recent Activity</h2>
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
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
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
              </section>
            </>
          )}

          {section === 'account' && (
            <>
              <div className="mb-8">
                <h1 className="landing-font-display text-2xl md:text-3xl font-bold text-white">Account</h1>
                <p className="text-white/55 text-sm mt-1">Profile, credits, and security</p>
              </div>

              <div className="w-full space-y-6">
                {/* Profile overview card */}
                <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
                  <h2 className="landing-font-display text-lg font-semibold text-white mb-4">Profile</h2>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="relative group flex-shrink-0 self-start sm:self-auto"
                    >
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/5 border-2 border-white/15 flex items-center justify-center ring-2 ring-transparent group-hover:ring-blue-500/50 transition-all">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-medium">Change photo</span>
                      </div>
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    <div className="min-w-0">
                      <p className="landing-font-display text-xl font-bold text-white truncate">{username || 'Creator'}</p>
                      <p className="text-white/55 text-sm mt-0.5 truncate">{user.email}</p>
                      <Link to="/app" className="inline-flex items-center gap-2 mt-3 text-sm text-blue-400 hover:text-blue-300 font-medium">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                        </svg>
                        View my Kreations
                      </Link>
                    </div>
                  </div>
                </section>

                {/* Credits card */}
                <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
                  <h2 className="landing-font-display text-lg font-semibold text-white mb-4">Kreate credits</h2>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">{typeof credits === 'number' ? credits.toLocaleString() : '—'}</span>
                    <span className="text-white/50 text-sm">credits available</span>
                  </div>
                  <p className="text-white/40 text-xs mt-2">One credit = one generation. Top up when you need more.</p>
                  <Link to="/app" className="inline-flex items-center gap-2 mt-3 text-sm text-blue-400 hover:text-blue-300 font-medium">
                    Start creating
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </Link>
                </section>

                {/* Profile & identity */}
                <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
                  <h2 className="landing-font-display text-lg font-semibold text-white mb-4">Profile details</h2>
                  <form onSubmit={handleSave} className="space-y-4">
                    <div>
                      <label htmlFor="profile-username" className="block text-white/80 text-sm font-medium mb-1.5">Display name</label>
                      <input
                        id="profile-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Your display name"
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                      />
                      <p className="text-white/40 text-xs mt-1">Shown on your Kreations in the community view</p>
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-1.5">Email</label>
                      <div className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-white/70 text-sm">
                        {user.email}
                      </div>
                      <p className="text-white/40 text-xs mt-1">Used for sign-in. Email cannot be changed here.</p>
                    </div>
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                    >
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                  </form>
                </section>

                {/* Security – password reset */}
                <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
                  <h2 className="landing-font-display text-lg font-semibold text-white mb-4">Security</h2>
                  <p className="text-white/70 text-sm mb-4">Change your password by requesting a reset link. We’ll send it to your account email.</p>
                  {onRequestPasswordReset ? (
                    <>
                      {passwordResetSent ? (
                        <p className="text-blue-300 text-sm">Check your email for a password reset link.</p>
                      ) : (
                        <button
                          type="button"
                          disabled={passwordResetLoading}
                          onClick={async () => {
                            setPasswordResetLoading(true);
                            setError(null);
                            try {
                              await onRequestPasswordReset();
                              setPasswordResetSent(true);
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Failed to send reset link');
                            } finally {
                              setPasswordResetLoading(false);
                            }
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-500/40 bg-blue-500/10 text-blue-300 text-sm font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {passwordResetLoading ? 'Sending...' : 'Send password reset link'}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-white/40 text-sm">Password reset is not available.</p>
                  )}
                </section>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
