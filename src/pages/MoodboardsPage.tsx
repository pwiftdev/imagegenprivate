import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { compressImageForReference } from '../utils/compressImage';
import {
  fetchMoodboards,
  createMoodboard,
  updateMoodboard,
  deleteMoodboard,
  uploadMoodboardImages,
  MAX_MOODBOARD_IMAGES,
  type Moodboard,
} from '../services/moodboardService';
import type { User } from '@supabase/supabase-js';

interface MoodboardsPageProps {
  user: User;
  onSignOut: () => void;
  onUseMoodboard?: (urls: string[]) => void;
}

const MoodboardsPage: React.FC<MoodboardsPageProps> = ({ user, onUseMoodboard }) => {
  const [loading, setLoading] = useState(true);
  const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createImages, setCreateImages] = useState<string[]>([]);
  const [createSaving, setCreateSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const loadMoodboards = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchMoodboards(user.id);
      setMoodboards(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load moodboards');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMoodboards();
  }, [loadMoodboards]);

  const openCreate = () => {
    setCreateName('');
    setCreateDesc('');
    setCreateImages([]);
    setCreateOpen(true);
    setEditingId(null);
  };

  const openEdit = (mb: Moodboard) => {
    setCreateName(mb.name);
    setCreateDesc(mb.description || '');
    setCreateImages([...mb.reference_image_urls]);
    setEditingId(mb.id);
    setCreateOpen(true);
  };

  const addImagesFromFiles = async (files: File[]) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (valid.length === 0) return;
    const remaining = MAX_MOODBOARD_IMAGES - createImages.length;
    const toAdd = valid.slice(0, remaining);
    try {
      const base64List = await Promise.all(toAdd.map((f) => compressImageForReference(f)));
      const urls = await uploadMoodboardImages(base64List);
      setCreateImages((prev) => [...prev, ...urls].slice(0, MAX_MOODBOARD_IMAGES));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add images');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) addImagesFromFiles(Array.from(files));
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setCreateImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user?.id || createSaving) return;
    setCreateSaving(true);
    setError(null);
    try {
      if (editingId) {
        const updated = await updateMoodboard(editingId, user.id, {
          name: createName,
          description: createDesc,
          reference_image_urls: createImages,
        });
        setMoodboards((prev) => prev.map((m) => (m.id === editingId ? updated : m)));
      } else {
        const created = await createMoodboard(user.id, createName, createDesc, createImages);
        setMoodboards((prev) => [created, ...prev]);
      }
      setCreateOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save moodboard');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleDelete = async (mb: Moodboard) => {
    if (!confirm(`Delete "${mb.name}"?`)) return;
    try {
      await deleteMoodboard(mb.id, user!.id);
      setMoodboards((prev) => prev.filter((m) => m.id !== mb.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const handleUse = (mb: Moodboard) => {
    if (mb.reference_image_urls.length === 0) return;
    onUseMoodboard?.(mb.reference_image_urls);
    navigate('/app');
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
      {/* Background */}
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
              My <span className="dashboard-title-gradient">Moodboards</span>
            </h1>
            <p className="text-white/55 text-base mt-1">
              Create sets of reference images to reuse in your image generations
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
              + New moodboard
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-300">×</button>
          </div>
        )}

        {moodboards.length === 0 && !createOpen ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="landing-font-display text-xl font-bold text-white mb-2">No moodboards yet</h2>
            <p className="text-white/55 text-sm mb-6">Create a moodboard to save reference images for reuse.</p>
            <button
              type="button"
              onClick={openCreate}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-sm hover:opacity-95 transition-opacity"
            >
              Create moodboard
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {moodboards.map((mb) => (
              <div
                key={mb.id}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden hover:border-white/20 transition-colors"
              >
                {/* Thumbnails row */}
                <div className="flex gap-1 p-2 bg-black/20 min-h-[100px]">
                  {mb.reference_image_urls.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-white/40 text-sm">No images</div>
                  ) : (
                    mb.reference_image_urls.slice(0, 4).map((url, i) => (
                      <div key={i} className="flex-1 min-w-0 aspect-square rounded-lg overflow-hidden">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white truncate">{mb.name}</h3>
                  {mb.description && (
                    <p className="text-white/55 text-sm mt-0.5 line-clamp-2">{mb.description}</p>
                  )}
                  <p className="text-white/40 text-xs mt-2">{mb.reference_image_urls.length} reference images</p>
                  <div className="flex gap-2 mt-3">
                    {onUseMoodboard && mb.reference_image_urls.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleUse(mb)}
                        className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 transition-colors"
                      >
                        Use in generation
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(mb)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:text-white bg-white/10 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(mb)}
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

      {/* Create/Edit modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => !createSaving && setCreateOpen(false)}
        >
          <div
            className="bg-[#0d0e10] border border-white/10 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="landing-font-display text-lg font-semibold text-white mb-4">
                {editingId ? 'Edit moodboard' : 'New moodboard'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-1.5">Name</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Vintage interiors"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1.5">Description (optional)</label>
                  <textarea
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
                    placeholder="Describe the vibe or style..."
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-500/50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1.5">
                    Reference images (max {MAX_MOODBOARD_IMAGES})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {createImages.map((url, i) => (
                      <div key={i} className="relative">
                        <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {createImages.length < MAX_MOODBOARD_IMAGES && (
                      <label className="w-16 h-16 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-blue-500/50 bg-white/5">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </label>
                    )}
                  </div>
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
                  disabled={createSaving || !createName.trim()}
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

export default MoodboardsPage;
