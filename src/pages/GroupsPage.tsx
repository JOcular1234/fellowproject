import { useEffect, useState } from 'react';
import { ArrowRight, Users, Layers } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { fetchPublishedRound, fetchLevelGroupCounts, type LevelGroupCount } from '@/lib/queries';
import { LEVEL_ORDER, LEVEL_LABELS, type FellowLevel } from '@/lib/types';
import presentationBg from '@/public/presentation.jpeg';

export function GroupsPage() {
  const { navigate } = useRouter();
  const [counts, setCounts] = useState<LevelGroupCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const round = await fetchPublishedRound();
        if (round) {
          const c = await fetchLevelGroupCounts(round.id);
          setCounts(c);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getCount = (level: FellowLevel) =>
    counts.find((c) => c.level === level)?.count ?? 0;

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0">
        <img
          src={presentationBg}
          alt=""
          className="h-full w-full object-cover opacity-5"
        />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50">
          <Layers className="h-6 w-6 text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Groups</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Select a Python level to view its project groups.
          </p>
        </div>
      </div>

      {!loading && counts.every((c) => c.count === 0) && (
        <div className="card p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-600">
            No project groups have been published yet. Please check back soon.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {LEVEL_ORDER.map((level) => {
          const count = getCount(level);
          return (
            <button
              key={level}
              onClick={() => navigate(`/groups/${level}`)}
              className="group flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50">
                  <Users className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {LEVEL_LABELS[level]}
                  </p>
                  <p className="text-sm text-slate-500">
                    {loading
                      ? 'Loading...'
                      : `${count} Project Group${count !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-brand-600" />
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
