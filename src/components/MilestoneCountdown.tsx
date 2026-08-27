import { useEffect, useState, useMemo } from 'react';
import {
  Calendar, Clock, CheckCircle2, AlertCircle, Circle, X, ArrowRight, Zap,
} from 'lucide-react';
import type { Milestone } from '@/lib/types';

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

function CountdownTimer({ milestone: m }: { milestone: Milestone }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (m.is_completed) return;
    const due = new Date(m.due_date).getTime();
    if (due - Date.now() <= 0) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [m.is_completed, m.due_date]);

  const due = new Date(m.due_date).getTime();
  const diff = due - now;
  const isOverdue = diff < 0 && !m.is_completed;
  const isDeadlineReached = Math.abs(diff) < 60 * 1000 && !m.is_completed;

  const absDiff = Math.abs(diff);
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

  if (m.is_completed) {
    return (
      <div className="text-center">
        <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-green-700">Completed</p>
      </div>
    );
  }

  if (isDeadlineReached) {
    return (
      <div className="text-center">
        <Zap className="h-8 w-8 text-amber-600 mx-auto mb-2 animate-pulse" />
        <p className="text-sm font-semibold text-amber-700">Deadline reached</p>
      </div>
    );
  }

  if (isOverdue) {
    return (
      <div className="text-center">
        <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-red-700">Overdue</p>
      </div>
    );
  }

  const isDueSoon = diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000;
  
  return (
    <div className="text-center">
      <div className="space-y-3">
        <div className="flex items-baseline justify-center gap-2">
          {days > 0 && (
            <>
              <span className="text-3xl font-bold text-brand-600">{days}</span>
              <span className="text-xs uppercase font-semibold text-slate-500">days</span>
            </>
          )}
          {(days > 0 || hours > 0) && (
            <>
              <span className="text-3xl font-bold text-brand-600">{hours}</span>
              <span className="text-xs uppercase font-semibold text-slate-500">hrs</span>
            </>
          )}
          {(days > 0 || hours > 0 || minutes > 0) && (
            <>
              <span className="text-3xl font-bold text-brand-600">{minutes}</span>
              <span className="text-xs uppercase font-semibold text-slate-500">min</span>
            </>
          )}
          <span className="text-3xl font-bold text-brand-600">{seconds}</span>
          <span className="text-xs uppercase font-semibold text-slate-500">sec</span>
        </div>
        <p className={`text-xs font-medium uppercase tracking-wider ${
          isDueSoon ? 'text-amber-600' : 'text-slate-500'
        }`}>
          remaining
        </p>
      </div>
    </div>
  );
}

function TimelineProgress({ milestone: m }: { milestone: Milestone }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (m.is_completed) return;
    const due = new Date(m.due_date).getTime();
    if (due - Date.now() <= 0) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [m.is_completed, m.due_date]);

  const start = new Date(m.created_at).getTime();
  const due = new Date(m.due_date).getTime();
  const total = due - start;
  const elapsed = now - start;
  const progress = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 0;

  const isOverdue = due - now < 0 && !m.is_completed;
  const progressColor = m.is_completed ? 'bg-green-600' : isOverdue ? 'bg-red-600' : 'bg-brand-600';

  return (
    <div className="space-y-2">
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${progressColor} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      <p className="text-xs text-slate-500">
        {m.is_completed ? 'Completed' : Math.round(progress) + '% time elapsed'}
      </p>
    </div>
  );
}

function RowCountdown({ milestone: m }: { milestone: Milestone }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (m.is_completed) return;
    const due = new Date(m.due_date).getTime();
    if (due - Date.now() <= 0) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [m.is_completed, m.due_date]);

  if (m.is_completed) {
    return <span className="text-xs font-medium text-green-600">Completed</span>;
  }

  const due = new Date(m.due_date).getTime();
  const diff = due - now;
  const isOverdue = diff < 0;
  const isDeadlineReached = Math.abs(diff) < 60 * 1000;

  if (isDeadlineReached) {
    return <span className="text-xs font-medium text-amber-600">Deadline reached</span>;
  }
  if (isOverdue) {
    return <span className="text-xs font-medium text-red-600">Overdue</span>;
  }

  const absDiff = Math.abs(diff);
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

  let str: string;
  if (days > 0) str = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  else if (hours > 0) str = `${hours}h ${minutes}m ${seconds}s`;
  else if (minutes > 0) str = `${minutes}m ${seconds}s`;
  else str = `${seconds}s`;

  const isDueSoon = diff <= 3 * 24 * 60 * 60 * 1000;
  return (
    <span className={`text-xs font-medium ${isDueSoon ? 'text-amber-600' : 'text-slate-500'}`}>
      {str} remaining
    </span>
  );
}

function MilestoneRow({ m, showDate = true }: { m: Milestone; showDate?: boolean }) {
  const diff = new Date(m.due_date).getTime() - Date.now();
  const isOverdue = diff < 0 && !m.is_completed;

  return (
    <div className={`flex items-start gap-3 group transition-opacity ${m.is_completed ? 'opacity-60' : 'opacity-100 hover:opacity-100'}`}>
      <div className="mt-1 shrink-0">
        {m.is_completed ? (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
        ) : isOverdue ? (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
        ) : (
          <div className="h-5 w-5 rounded-full border-2 border-slate-300 group-hover:border-brand-600 transition-colors" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className={`text-sm font-semibold text-slate-900 ${m.is_completed ? 'line-through text-slate-500' : ''}`}>
          {m.title}
        </h4>
        {m.description && (
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{m.description}</p>
        )}
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <RowCountdown milestone={m} />
          {showDate && (
            <span className="text-xs text-slate-400">Due {formatDateTime(m.due_date)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function MilestoneCountdown({ milestones }: { milestones: Milestone[] }) {
  const [showModal, setShowModal] = useState(false);

  const upcoming = useMemo(
    () => milestones.filter((m) => !m.is_completed).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()),
    [milestones],
  );

  const completed = useMemo(
    () => milestones.filter((m) => m.is_completed).sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()),
    [milestones],
  );

  if (milestones.length === 0) return null;

  const next = upcoming[0];

  return (
    <>
      {/* Hero deadline card */}
      {next && (
        <div className="card overflow-hidden border border-slate-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-50 to-brand-50/50 border-b border-brand-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-600" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-700">Next Deadline</h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Countdown timer - Hero element */}
              <div className="md:col-span-1 flex items-center justify-center py-4">
                <CountdownTimer milestone={next} />
              </div>

              {/* Milestone details */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{next.title}</h3>
                  {next.description && (
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {next.description.length > 120
                        ? next.description.slice(0, 120).trimEnd() + '…'
                        : next.description}
                    </p>
                  )}
                </div>

                {/* Progress bar */}
                <TimelineProgress milestone={next} />

                {/* Due date */}
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Due:</span> {formatDateTime(next.due_date)}
                  </p>
                </div>
              </div>
            </div>

            {/* View all button */}
            {milestones.length > 1 && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                <span>View all {milestones.length} deadlines</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!next && completed.length > 0 && (
        <div className="card border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-50 p-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-slate-900">All deadlines met</h3>
              <p className="mt-1 text-sm text-slate-600">Congratulations! You've completed all milestones.</p>
              {completed.length > 0 && (
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  <span>View completed deadlines</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal with all deadlines */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] overflow-y-auto card border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-gradient-to-r from-brand-50 to-brand-50/50 border-b border-brand-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  All Deadlines
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({upcoming.length} upcoming, {completed.length} completed)
                  </span>
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal content */}
            <div className="p-6 space-y-6">
              {upcoming.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-4">
                    Upcoming ({upcoming.length})
                  </h3>
                  <div className="space-y-4">
                    {upcoming.map((m) => (
                      <MilestoneRow key={m.id} m={m} />
                    ))}
                  </div>
                </div>
              )}

              {completed.length > 0 && (
                <div>
                  {upcoming.length > 0 && <div className="border-t border-slate-200" />}
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-4 pt-4">
                    Completed ({completed.length})
                  </h3>
                  <div className="space-y-4">
                    {completed.map((m) => (
                      <MilestoneRow key={m.id} m={m} />
                    ))}
                  </div>
                </div>
              )}

              {milestones.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">No deadlines yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}