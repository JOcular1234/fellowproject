import { useEffect, useState } from 'react';
import { ArrowRight, Star, Users } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { fetchPublishedShowcases } from '@/lib/queries';
import type { ShowcaseCard, FellowLevel } from '@/lib/types';
import { LEVEL_ORDER, LEVEL_LABELS, REACTION_LABELS } from '@/lib/types';
import { PublicLayout } from '@/components/PublicLayout';
import presentationBg from '@/public/presentation.jpeg';

export function ShowcasePage() {
  const { navigate } = useRouter();
  const [showcases, setShowcases] = useState<ShowcaseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<FellowLevel | 'ALL'>('ALL');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchPublishedShowcases();
        if (!cancelled) setShowcases(data);
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

  const filtered = levelFilter === 'ALL'
    ? showcases
    : showcases.filter((s) => s.group_level === levelFilter);

  const featured = filtered.filter((s) => s.showcase.is_featured);
  const regular = filtered.filter((s) => !s.showcase.is_featured);

  return (
    <PublicLayout>
      <div className="relative min-h-screen">
        <div className="pointer-events-none fixed inset-0">
          <img src={presentationBg} alt="" className="h-full w-full object-cover opacity-5" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Project Showcase</h1>
            <p className="mt-1 text-sm text-slate-600">
              Explore completed projects built by Python Fellows.
            </p>
          </div>

          {/* Level filter */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setLevelFilter('ALL')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                levelFilter === 'ALL'
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300'
              }`}
            >
              All
            </button>
            {LEVEL_ORDER.map((level) => (
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  levelFilter === level
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300'
                }`}
              >
                {LEVEL_LABELS[level]}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading showcases...</p>
          ) : filtered.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-sm font-semibold text-slate-700">
                {levelFilter === 'ALL'
                  ? 'No projects have been published yet.'
                  : `No projects published for ${LEVEL_LABELS[levelFilter as FellowLevel]} yet.`}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Check back soon for completed project showcases.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Featured */}
              {featured.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Featured Projects</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {featured.map((card) => (
                      <ShowcaseCardItem key={card.project_id} card={card} onClick={() => navigate(`/showcase/${card.project_id}`)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular */}
              {regular.length > 0 && (
                <div>
                  {featured.length > 0 && (
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">All Projects</h2>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {regular.map((card) => (
                      <ShowcaseCardItem key={card.project_id} card={card} onClick={() => navigate(`/showcase/${card.project_id}`)} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

function ShowcaseCardItem({ card, onClick }: { card: ShowcaseCard; onClick: () => void }) {
  const thumbnail = card.showcase.screenshots[0];
  const topReactions = card.reaction_counts.filter((rc) => rc.count > 0).slice(0, 3);

  return (
    <button
      onClick={onClick}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        {thumbnail ? (
          <img src={thumbnail} alt={card.project_title ?? 'Project'} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-3xl">🐍</span>
          </div>
        )}
        {card.showcase.is_featured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
            <Star className="h-3 w-3 fill-white" />
            Featured
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-slate-500">
          {LEVEL_LABELS[card.group_level]} · {card.groups.map((g) => g.group_name).join(' + ')}
        </p>
        <h3 className="mt-1 text-sm font-bold text-slate-900 line-clamp-1">
          {card.project_title ?? 'Untitled Project'}
        </h3>
        {card.project_description && (
          <p className="mt-1 text-xs text-slate-500 line-clamp-2">
            {card.project_description}
          </p>
        )}

        {/* Technologies */}
        {card.showcase.technologies.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {card.showcase.technologies.slice(0, 4).map((tech) => (
              <span key={tech} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                {tech}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-center gap-2">
            {topReactions.length > 0 ? (
              <div className="flex items-center gap-1.5">
                {topReactions.map((rc) => (
                  <span key={rc.reaction_type} className="flex items-center gap-0.5 text-xs">
                    {REACTION_LABELS[rc.reaction_type].emoji}
                    <span className="font-semibold text-slate-600">{rc.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Users className="h-3 w-3" />
                {card.member_count} members
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-brand-600">
            View
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </button>
  );
}
