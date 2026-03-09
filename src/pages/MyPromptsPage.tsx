import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchPromptTemplates,
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  normalizeHandle,
  DEFAULT_PROMPT_TEMPLATES,
  type PromptTemplate,
} from '../services/promptTemplateService';
import type { User } from '@supabase/supabase-js';

interface MyPromptsPageProps {
  user: User;
  onSignOut: () => void;
}

const MyPromptsPage: React.FC<MyPromptsPageProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createHandle, setCreateHandle] = useState('');
  const [createPromptText, setCreatePromptText] = useState('');
  const [createSaving, setCreateSaving] = useState(false);

  const loadPrompts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchPromptTemplates(user.id);
      setPrompts(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const openCreate = () => {
    setCreateHandle('');
    setCreatePromptText('');
    setCreateOpen(true);
    setEditingId(null);
  };

  const openEdit = (p: PromptTemplate) => {
    setCreateHandle(p.handle);
    setCreatePromptText(p.prompt_text);
    setEditingId(p.id);
    setCreateOpen(true);
  };

  const handleSave = async () => {
    if (!user?.id || createSaving) return;
    const handleTrim = createHandle.trim();
    if (!handleTrim) {
      setError('Handle is required (e.g. lens40)');
      return;
    }
    setCreateSaving(true);
    setError(null);
    try {
      if (editingId) {
        const updated = await updatePromptTemplate(editingId, user.id, {
          handle: handleTrim,
          prompt_text: createPromptText,
        });
        setPrompts((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await createPromptTemplate(user.id, handleTrim, createPromptText);
        setPrompts((prev) => [created, ...prev]);
      }
      setCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleDelete = async (p: PromptTemplate) => {
    if (!confirm(`Delete @${p.handle}?`)) return;
    try {
      await deletePromptTemplate(p.id, user!.id);
      setPrompts((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090a] text-white landing-font-body">
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute" style={{ top: '-25%', left: '-20%' }}>
          <div className="w-[80vmax] h-[80vmax] rounded-full bg-gradient-to-br from-blue-500/10 via-indigo-500/6 to-blue-600/10" />
        </div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.02\'/%3E%3C/svg%3E')]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="landing-font-display text-3xl font-bold text-white tracking-tight">
              My <span className="dashboard-title-gradient">Prompts</span>
            </h1>
            <p className="text-white/55 text-base mt-1">
              Save prompts with handles and use <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">@handle</kbd> in the control panel to insert them
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="px-4 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/15 transition-colors"
            >
              Back to Kreations
            </Link>
            <button
              type="button"
              onClick={openCreate}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:opacity-95 transition-opacity"
            >
              + New prompt
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-300">×</button>
          </div>
        )}

        <div className="space-y-10">
            {/* Default prompts – everyone can use these via @ in the control panel */}
            <div>
              <h2 className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-3">📷 Camera prompts (5)</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {DEFAULT_PROMPT_TEMPLATES.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden hover:border-white/20 transition-colors"
                  >
                    <div className="p-4">
                      <div className="font-mono font-semibold text-blue-300">@{p.handle}</div>
                      <p className="text-white/70 text-sm mt-1 line-clamp-3">{p.prompt_text || '—'}</p>
                      <p className="text-white/40 text-xs mt-2">Default · use with @ in control panel</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-3">💡 Lighting prompts (5)</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {DEFAULT_PROMPT_TEMPLATES.slice(5, 10).map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden hover:border-white/20 transition-colors"
                  >
                    <div className="p-4">
                      <div className="font-mono font-semibold text-blue-300">@{p.handle}</div>
                      <p className="text-white/70 text-sm mt-1 line-clamp-3">{p.prompt_text || '—'}</p>
                      <p className="text-white/40 text-xs mt-2">Default · use with @ in control panel</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* User's saved prompts */}
            <div>
              <h2 className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-3">Your prompts</h2>
              {prompts.length === 0 ? (
                <p className="text-white/50 text-sm">No saved prompts yet. Create one to reuse with @handle in the control panel.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {prompts.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden hover:border-white/20 transition-colors"
                    >
                      <div className="p-4">
                        <div className="font-mono font-semibold text-blue-300">@{p.handle}</div>
                        <p className="text-white/70 text-sm mt-1 line-clamp-3">{p.prompt_text || '—'}</p>
                        <div className="flex gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:text-white bg-white/10 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400/80 hover:text-red-400 bg-red-500/10 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !createSaving && setCreateOpen(false)}
        >
          <div
            className="bg-[#0d0e10] border border-white/10 rounded-2xl shadow-xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="landing-font-display text-lg font-semibold text-white mb-4">
                {editingId ? 'Edit prompt' : 'New prompt'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-1.5">Handle (e.g. lens40 — use as @lens40 in prompts)</label>
                  <input
                    type="text"
                    value={createHandle}
                    onChange={(e) => setCreateHandle(e.target.value)}
                    placeholder="lens40"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-500/50"
                  />
                  {createHandle.trim() && (
                    <p className="text-white/50 text-xs mt-1">Use as <span className="font-mono text-blue-300">@{normalizeHandle(createHandle) || '…'}</span> in the control panel</p>
                  )}
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1.5">Prompt text</label>
                  <textarea
                    value={createPromptText}
                    onChange={(e) => setCreatePromptText(e.target.value)}
                    placeholder="e.g. shot on 40mm lens, shallow depth of field..."
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-500/50 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button
                  type="button"
                  onClick={() => !createSaving && setCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={createSaving || !createHandle.trim()}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
                >
                  {createSaving ? 'Saving…' : editingId ? 'Save' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPromptsPage;
