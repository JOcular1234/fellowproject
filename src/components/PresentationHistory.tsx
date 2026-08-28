import { useEffect, useState } from 'react';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchEndedPresentations } from '@/lib/queries';
import type { PresentationWithDetails } from '@/lib/types';
import { LEVEL_LABELS, REACTION_LABELS, PRESENTATION_PHASE_LABELS } from '@/lib/types';

export function PresentationHistory() {
  const [presentations, setPresentations] = useState<PresentationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const ended = await fetchEndedPresentations(10);
        if (!cancelled) setPresentations(ended);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 10_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading || presentations.length === 0) return null;

  const recentCount = presentations.length;

  return (
    <div>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <History className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-700">Presentation History</p>
            <p className="text-xs text-slate-400">
              {recentCount} past presentation{recentCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="mt-3 space-y-3">
          {presentations.map((pres) => {
            const totalReactions = pres.reaction_counts.reduce((sum, rc) => sum + rc.count, 0);
            const endedDate = pres.ended_at ? new Date(pres.ended_at) : null;
            const leader = pres.members.find((m) => m.is_leader);

            return (
              <div
                key={pres.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Ended
                    </span>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                      {PRESENTATION_PHASE_LABELS[pres.presentation_phase]}
                    </span>
                  </div>
                  {endedDate && (
                    <span className="text-xs text-slate-400">
                      {endedDate.toLocaleDateString()} · {endedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <p className="text-xs font-medium text-slate-500 mb-1">
                  {LEVEL_LABELS[pres.group_level]} · {pres.group_name}
                </p>
                <h4 className="text-sm font-bold text-slate-900">
                  {pres.project_title ?? 'Untitled Project'}
                </h4>
                {leader && (
                  <p className="mt-1 text-xs text-slate-500">
                    Led by {leader.first_name} {leader.last_name}
                  </p>
                )}

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-xs font-medium text-slate-400 mb-2">
                    Audience Reactions {totalReactions > 0 && `· ${totalReactions} total`}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {pres.reaction_counts.map((rc) => (
                      <div key={rc.reaction_type} className="flex items-center gap-1.5">
                        <span className="text-lg">{REACTION_LABELS[rc.reaction_type].emoji}</span>
                        <span className={`text-sm font-bold ${rc.count > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                          {rc.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-3 text-center text-xs text-slate-400">
                  Thank you for supporting the team!
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
