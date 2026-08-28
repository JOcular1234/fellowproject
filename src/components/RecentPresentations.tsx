import { useEffect, useState } from 'react';
import { ArrowRight, History } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { fetchEndedPresentations } from '@/lib/queries';
import type { PresentationWithDetails } from '@/lib/types';
import { LEVEL_LABELS, REACTION_LABELS } from '@/lib/types';

export function RecentPresentations() {
  const { navigate } = useRouter();
  const [presentations, setPresentations] = useState<PresentationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const ended = await fetchEndedPresentations(3);
        if (!cancelled) setPresentations(ended);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading || presentations.length === 0) return null;

  return (
    <section className="mx-auto max-w-4xl px-4 pt-10 sm:px-6 sm:pt-12">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Presentations
          </h2>
        </div>
        <button
          onClick={() => navigate('/presentations')}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          View All
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {presentations.map((pres) => {
          const totalReactions = pres.reaction_counts.reduce((sum, rc) => sum + rc.count, 0);
          const endedDate = pres.ended_at ? new Date(pres.ended_at) : null;
          const topReaction = [...pres.reaction_counts]
            .filter((rc) => rc.count > 0)
            .sort((a, b) => b.count - a.count)[0];

          return (
            <button
              key={pres.id}
              onClick={() => navigate('/presentations')}
              className="group flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <span className="text-lg">{topReaction ? REACTION_LABELS[topReaction.reaction_type].emoji : '🎤'}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">
                    {LEVEL_LABELS[pres.group_level]} · {pres.group_name}
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {pres.project_title ?? 'Untitled Project'}
                  </p>
                  {endedDate && (
                    <p className="text-xs text-slate-400">
                      {endedDate.toLocaleDateString()} · {totalReactions} reactions
                    </p>
                  )}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-brand-600" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
