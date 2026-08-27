import { useEffect, useState } from 'react';
import { Bell, Pin, ArrowLeft } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { fetchActiveAnnouncements } from '@/lib/queries';
import type { Announcement } from '@/lib/types';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export function NotificationsPage() {
  const { navigate } = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchActiveAnnouncements();
        setAnnouncements(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <button
        onClick={() => navigate('/')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </button>

      <div className="mb-6 flex items-center gap-2">
        <Bell className="h-5 w-5 text-brand-600" />
        <h1 className="text-xl font-bold text-slate-900">Announcements</h1>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-500">Loading announcements...</div>
      ) : error ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          Failed to load announcements. Please try again later.
        </div>
      ) : announcements.length === 0 ? (
        <div className="card p-8 text-center">
          <Bell className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">No announcements have been published yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className={`card p-5 ${a.is_pinned ? 'border-brand-200' : ''}`}>
              <div className="flex items-start gap-2">
                {a.is_pinned && (
                  <Pin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-slate-900 break-words">
                    {a.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600 break-words whitespace-pre-wrap">
                    {a.body}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">{formatDate(a.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
