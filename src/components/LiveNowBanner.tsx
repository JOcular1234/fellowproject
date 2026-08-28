import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, Users } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { fetchActivePresentation, fetchReactionCounts } from '@/lib/queries';
import type { PresentationWithDetails } from '@/lib/types';
import { LEVEL_LABELS } from '@/lib/types';

export function LiveNowBanner() {
  const { navigate } = useRouter();
  const [presentation, setPresentation] = useState<PresentationWithDetails | null>(null);
  const [reactionCounts, setReactionCounts] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const pres = await fetchActivePresentation();
        if (!cancelled) {
          setPresentation(pres);
          if (pres) {
            try {
              const counts = await fetchReactionCounts(pres.id);
              const total = counts.reduce((sum, rc) => sum + rc.count, 0);
              setReactionCounts(total);
            } catch {
              setReactionCounts(0);
            }
          }
        }
      } catch {
        if (!cancelled) setPresentation(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 5_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading || !presentation) return null;

  const memberCount = presentation.members.length;
  const leader = presentation.members.find((m) => m.is_leader);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 sm:pt-10">
      <button
        onClick={() => navigate('/presentations')}
        className="group relative w-full overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-2xl hover:scale-105 active:scale-95"
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-500 to-rose-500 opacity-95" />
        
        {/* Animated gradient overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-500"
          style={{
            backgroundPosition: '200% center',
            animation: 'shimmer 3s infinite',
          }}
        />

        {/* Pulsing glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-rose-500 rounded-2xl opacity-0 group-hover:opacity-20 blur group-hover:blur-xl transition-all duration-500" />

        {/* Content */}
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-5 sm:p-6">
          
          {/* Left: Live Badge & Title */}
          <div className="flex-1 min-w-0">
            {/* Live indicator */}
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-2 w-2">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-white">Live Now</span>
              {reactionCounts > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                  <Sparkles className="h-3 w-3" />
                  {reactionCounts > 999 ? (reactionCounts / 1000).toFixed(1) + 'k' : reactionCounts}
                </span>
              )}
            </div>

            {/* Group context */}
            <p className="text-xs sm:text-sm font-semibold text-white/90 mb-1.5">
              {LEVEL_LABELS[presentation.group_level]} · {presentation.group_name}
            </p>

            {/* Project title */}
            <h3 className="text-lg sm:text-2xl font-black text-white leading-tight line-clamp-2">
              {presentation.project_title ?? 'Live Presentation'}
            </h3>

            {/* Team info */}
            {memberCount > 0 && (
              <div className="mt-3 flex items-center gap-2 text-white/80">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs sm:text-sm font-medium">
                  {leader && <span>{leader.first_name}</span>}
                  {memberCount > 1 && <span> + {memberCount - 1}</span>}
                </span>
              </div>
            )}
          </div>

          {/* Right: CTA */}
          <div className="flex items-center gap-2 rounded-xl bg-white px-4 sm:px-6 py-2.5 sm:py-3 font-semibold text-red-600 transition-all duration-200 group-hover:gap-3 group-hover:pr-5 shrink-0 shadow-lg">
            <span className="text-sm sm:text-base hidden sm:inline">View Now</span>
            <span className="text-sm sm:text-base sm:hidden">View</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
        </div>
      </button>

      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

      `}</style>
    </div>
  );
}