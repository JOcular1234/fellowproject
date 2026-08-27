import { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, Pin, X } from 'lucide-react';
import { fetchActiveAnnouncements } from '@/lib/queries';
import type { Announcement } from '@/lib/types';

const STORAGE_KEY = 'fellow_announcements_last_viewed';

function getLastViewed(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const ts = parseInt(raw, 10);
    return isNaN(ts) ? null : ts;
  } catch {
    return null;
  }
}

function setLastViewed(ts: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(ts));
  } catch {
    // localStorage unavailable — graceful degradation
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function NotificationBell() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchActiveAnnouncements();
      setAnnouncements(data);
      const lastViewed = getLastViewed();
      if (lastViewed === null) {
        setUnreadCount(data.length);
      } else {
        setUnreadCount(data.filter((a) => new Date(a.created_at).getTime() > lastViewed).length);
      }
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close panel on outside click
  useEffect(() => {
    if (!panelOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [panelOpen]);

  const handleBellClick = () => {
    if (panelOpen) {
      setPanelOpen(false);
      return;
    }
    setPanelOpen(true);
    // Mark as viewed only when opening the panel
    setLastViewed(Date.now());
    setUnreadCount(0);
  };

  const displayCount = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <>
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={handleBellClick}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-all hover:bg-brand-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 active:scale-95"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {displayCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {panelOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-20 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm max-h-[70vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col"
          role="dialog"
          aria-label="Notifications"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-brand-600" />
              <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Loading...</div>
            ) : announcements.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-7 w-7 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No new announcements</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {announcements.map((a) => (
                  <div key={a.id} className={`px-4 py-3 ${a.is_pinned ? 'bg-brand-50/40' : ''}`}>
                    <div className="flex items-start gap-2">
                      {a.is_pinned && (
                        <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-slate-900 break-words">
                          {a.title}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600 break-words whitespace-pre-wrap">
                          {a.body}
                        </p>
                        <p className="mt-1.5 text-xs text-slate-400">{formatDate(a.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
