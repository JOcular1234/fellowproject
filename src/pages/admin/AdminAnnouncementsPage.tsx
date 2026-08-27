import { useEffect, useState, useCallback } from 'react';
import {
  Bell, Pin, PinOff, Edit3, Trash2, Plus, X, CheckCircle2,
  AlertCircle, Power, PowerOff,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  fetchAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '@/lib/queries';
import type { Announcement } from '@/lib/types';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const truncate = (text: string, max: number) =>
  text.length > max ? text.slice(0, max) + '...' : text;

export function AdminAnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Confirm state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'deactivate' | 'reactivate';
    id: string;
    announcementTitle: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setIsPinned(false);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (a: Announcement) => {
    setTitle(a.title);
    setBody(a.body);
    setIsPinned(a.is_pinned);
    setEditingId(a.id);
    setShowForm(true);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    if (!user) {
      setError('You must be signed in.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingId) {
        await updateAnnouncement(editingId, {
          title: title.trim(),
          body: body.trim(),
          is_pinned: isPinned,
        });
        setSuccess('Announcement updated successfully.');
      } else {
        await createAnnouncement(title.trim(), body.trim(), isPinned, user.id);
        setSuccess('Announcement published successfully.');
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePin = async (a: Announcement) => {
    try {
      await updateAnnouncement(a.id, { is_pinned: !a.is_pinned });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle pin.');
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'delete') {
        await deleteAnnouncement(confirmAction.id);
        setSuccess('Announcement deleted.');
      } else if (confirmAction.type === 'deactivate') {
        await updateAnnouncement(confirmAction.id, { is_active: false });
        setSuccess('Announcement deactivated.');
      } else if (confirmAction.type === 'reactivate') {
        await updateAnnouncement(confirmAction.id, { is_active: true });
        setSuccess('Announcement reactivated.');
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setConfirmAction(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Announcements</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Publish announcements that appear on the public site notification bell.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" />
            New Announcement
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-6 card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              {editingId ? 'Edit Announcement' : 'New Announcement'}
            </h2>
            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the announcement message..."
                rows={4}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400 resize-y"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-slate-700">
                Pin to top{' '}
                <span className="text-xs text-slate-400">(always shows first in the notification panel)</span>
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting || !title.trim() || !body.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : editingId ? 'Update' : 'Publish'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-500">Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <div className="card p-8 text-center">
          <Bell className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">No announcements yet. Create one to notify fellows.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className={`card p-4 ${!a.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.is_pinned && (
                      <span className="badge bg-brand-50 text-brand-700">
                        <Pin className="mr-1 h-3 w-3" />
                        Pinned
                      </span>
                    )}
                    {!a.is_active && (
                      <span className="badge bg-slate-100 text-slate-500">
                        Inactive
                      </span>
                    )}
                    <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{truncate(a.body, 120)}</p>
                  <p className="mt-1.5 text-xs text-slate-400">{formatDate(a.created_at)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleTogglePin(a)}
                    title={a.is_pinned ? 'Unpin' : 'Pin'}
                    className={`rounded-md p-1.5 text-xs transition-colors ${
                      a.is_pinned
                        ? 'text-brand-600 hover:bg-brand-50'
                        : 'text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {a.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleEdit(a)}
                    title="Edit"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {a.is_active ? (
                    <button
                      onClick={() => setConfirmAction({ type: 'deactivate', id: a.id, announcementTitle: a.title })}
                      title="Deactivate"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600"
                    >
                      <PowerOff className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmAction({ type: 'reactivate', id: a.id, announcementTitle: a.title })}
                      title="Reactivate"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-green-50 hover:text-green-600"
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmAction({ type: 'delete', id: a.id, announcementTitle: a.title })}
                    title="Delete"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md card p-6">
            <h3 className="text-base font-semibold text-slate-900">
              {confirmAction.type === 'delete' ? 'Delete announcement?' :
               confirmAction.type === 'deactivate' ? 'Deactivate announcement?' :
               'Reactivate announcement?'}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {confirmAction.type === 'delete' ? (
                <>This will permanently delete <strong>"{confirmAction.announcementTitle}"</strong>. This cannot be undone.</>
              ) : confirmAction.type === 'deactivate' ? (
                <>This will hide <strong>"{confirmAction.announcementTitle}"</strong> from the public site. You can reactivate it later.</>
              ) : (
                <>This will make <strong>"{confirmAction.announcementTitle}"</strong> visible on the public site again.</>
              )}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white ${
                  confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' :
                  confirmAction.type === 'deactivate' ? 'bg-amber-600 hover:bg-amber-700' :
                  'bg-green-600 hover:bg-green-700'
                }`}
              >
                {confirmAction.type === 'delete' ? 'Delete' :
                 confirmAction.type === 'deactivate' ? 'Deactivate' :
                 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
