import { useEffect, useState } from 'react';
import { ArrowRight, Star } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { fetchFeaturedShowcases, fetchPublishedShowcases } from '@/lib/queries';
import type { ShowcaseCard } from '@/lib/types';
import { LEVEL_LABELS, REACTION_LABELS } from '@/lib/types';

export function HomeShowcase() {
  const { navigate } = useRouter();
  const [showcases, setShowcases] = useState<ShowcaseCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        let data = await fetchFeaturedShowcases(4);
        if (data.length < 4) {
          const all = await fetchPublishedShowcases();
          const remaining = all.filter((a) => !data.some((d) => d.project_id === a.project_id));
          data = [...data, ...remaining].slice(0, 4);
        }
        if (!cancelled) setShowcases(data);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading || showcases.length === 0) return null;

  return (
    <section className="mx-auto max-w-4xl px-4 pt-10 sm:px-6 sm:pt-12">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-slate-900">Project Showcase</h2>
        </div>
        <button
          onClick={() => navigate('/showcase')}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          View All Projects
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {showcases.map((card) => {
          const thumbnail = card.showcase.screenshots[0];
          return (
            <button
              key={card.project_id}
              onClick={() => navigate(`/showcase/${card.project_id}`)}
              className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                {thumbnail ? (
                  <img src={thumbnail} alt={card.project_title ?? 'Project'} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="text-2xl">🐍</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-slate-500 truncate">
                  {LEVEL_LABELS[card.group_level]} · {card.groups.map((g) => g.group_name).join(' + ')}
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900 truncate">
                  {card.project_title ?? 'Untitled'}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  {card.showcase.technologies.slice(0, 2).map((tech) => (
                    <span key={tech} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                      {tech}
                    </span>
                  ))}
                  {card.showcase.technologies.length > 2 && (
                    <span className="text-xs text-slate-400">+{card.showcase.technologies.length - 2}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
