import { useEffect, useState, useCallback, useRef } from 'react';
import { Crown, Sparkles, Radio } from 'lucide-react';
import {
  fetchActivePresentation,
  fetchReactionCounts,
  fetchUserReaction,
  addReaction,
  getOrCreateSessionId,
} from '@/lib/queries';
import type { PresentationWithDetails, ReactionType } from '@/lib/types';
import { LEVEL_LABELS, REACTION_LABELS, PRESENTATION_PHASE_LABELS } from '@/lib/types';

const REACTION_TYPES: ReactionType[] = ['thumbs_up', 'heart', 'fire', 'laugh', 'thumbs_down'];

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
}

let floatingIdCounter = 0;

export function LivePresentation() {
  const [presentation, setPresentation] = useState<PresentationWithDetails | null>(null);
  const [reactionCounts, setReactionCounts] = useState(presentation?.reaction_counts ?? []);
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const sessionId = getOrCreateSessionId();
  const reactionRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const getTotalReactions = () => reactionCounts.reduce((sum, rc) => sum + rc.count, 0);

  const spawnFloatingEmoji = (emoji: string, buttonEl: HTMLButtonElement | null) => {
    if (!buttonEl) return;
    const rect = buttonEl.getBoundingClientRect();
    const containerRect = buttonEl.closest('.reaction-container')?.getBoundingClientRect();
    if (!containerRect) return;
    const x = rect.left - containerRect.left + rect.width / 2;
    const id = ++floatingIdCounter;
    setFloatingEmojis((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((f) => f.id !== id));
    }, 1500);
  };

  const loadPresentation = useCallback(async () => {
    try {
      const pres = await fetchActivePresentation();
      setPresentation(pres);
      setReactionCounts(pres?.reaction_counts ?? []);
      if (pres) {
        const existing = await fetchUserReaction(pres.id, sessionId);
        setUserReaction(existing);
      } else {
        setUserReaction(null);
      }
    } catch {
      setPresentation(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadPresentation();
    const interval = setInterval(loadPresentation, 5_000);
    return () => clearInterval(interval);
  }, [loadPresentation]);

  useEffect(() => {
    if (!presentation) return;
    const interval = setInterval(async () => {
      try {
        const counts = await fetchReactionCounts(presentation.id);
        setReactionCounts(counts);
      } catch {
        // ignore
      }
    }, 3_000);
    return () => clearInterval(interval);
  }, [presentation]);

  const handleReact = async (type: ReactionType) => {
    if (!presentation) return;
    if (userReaction === type) return;

    spawnFloatingEmoji(REACTION_LABELS[type].emoji, reactionRefs.current[type] ?? null);

    const prevReaction = userReaction;
    setUserReaction(type);

    setReactionCounts((prev) =>
      prev.map((rc) => {
        if (rc.reaction_type === type) return { ...rc, count: rc.count + 1 };
        if (prevReaction && rc.reaction_type === prevReaction) return { ...rc, count: Math.max(0, rc.count - 1) };
        return rc;
      }),
    );

    try {
      await addReaction(presentation.id, type, sessionId);
    } catch {
      setUserReaction(prevReaction);
      setReactionCounts((prev) =>
        prev.map((rc) => {
          if (rc.reaction_type === type) return { ...rc, count: Math.max(0, rc.count - 1) };
          if (prevReaction && rc.reaction_type === prevReaction) return { ...rc, count: rc.count + 1 };
          return rc;
        }),
      );
    }
  };

  if (loading) return null;

  if (!presentation) {
    return (
      <div className="card overflow-hidden border border-slate-200 shadow-sm">
        <div className="bg-slate-100 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-slate-400" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Project Presentations</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Radio className="h-6 w-6 text-slate-400" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            No presentation is currently live.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Check back when the next team begins.
          </p>
        </div>
      </div>
    );
  }

  const leader = presentation.members.find((m) => m.is_leader);
  const otherMembers = presentation.members.filter((m) => !m.is_leader);
  const totalReactions = getTotalReactions();
  const topReaction = reactionCounts.length > 0
    ? [...reactionCounts].sort((a, b) => b.count - a.count)[0]
    : null;
  const hasTopReaction = topReaction && topReaction.count > 0;

  return (
    <div className="card overflow-hidden border border-slate-200 shadow-lg">
      {/* Live Badge Header */}
      <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="text-xs font-black uppercase tracking-widest text-white">Live Now</span>
          <span className="ml-auto text-xs font-semibold text-white/90 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {totalReactions > 0 && <span>{totalReactions.toLocaleString()} reactions</span>}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        
        {/* Presentation Info */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                {LEVEL_LABELS[presentation.group_level]}
              </p>
              <div className="mb-1">
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                  {PRESENTATION_PHASE_LABELS[presentation.presentation_phase]}
                </span>
              </div>
              {presentation.project_title && (
                <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                  {presentation.project_title}
                </h2>
              )}
            </div>
            {hasTopReaction && (
              <div className="flex flex-col items-center justify-center gap-0.5 rounded-lg bg-slate-50 px-2 py-1 shrink-0">
                <span className="text-lg">{REACTION_LABELS[topReaction.reaction_type].emoji}</span>
                <span className="text-xs font-bold text-slate-600">{topReaction.count}</span>
              </div>
            )}
          </div>
          
          {presentation.project_description && (
            <p className="text-xs leading-relaxed text-slate-600">
              {presentation.project_description}
            </p>
          )}
          
          {presentation.group_name && (
            <p className="mt-2 text-xs font-medium text-slate-500">
              Group: <span className="text-slate-700">{presentation.group_name}</span>
            </p>
          )}
        </div>

        {/* Presenting Team */}
        {presentation.members.length > 0 && (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Presented by
            </p>
            <div className="flex flex-wrap gap-1.5">
              {leader && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-50 to-brand-50/50 border border-brand-200 px-2.5 py-1">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Crown className="h-2.5 w-2.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-900">
                    {leader.first_name} {leader.last_name}
                  </span>
                </div>
              )}
              {otherMembers.map((m) => (
                <div
                  key={m.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 hover:bg-slate-200 transition-colors"
                >
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-400 text-xs font-bold text-white">
                    {m.first_name.charAt(0)}{m.last_name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-slate-700">
                    {m.first_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reactions Section - The Hero */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Show your support
          </p>
          
          <div className="reaction-container relative">
            {/* Floating emojis */}
            {floatingEmojis.map((f) => (
              <span
                key={f.id}
                className="pointer-events-none absolute bottom-20 text-2xl sm:text-3xl font-bold"
                style={{
                  left: f.x,
                  transform: 'translateX(-50%)',
                  animation: 'floatUp 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
                }}
              >
                {f.emoji}
              </span>
            ))}

            {/* Reaction buttons grid */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {REACTION_TYPES.map((type) => {
                const count = reactionCounts.find((rc) => rc.reaction_type === type)?.count ?? 0;
                const hasReacted = userReaction === type;
                return (
                  <button
                    key={type}
                    ref={(el) => { reactionRefs.current[type] = el; }}
                    onClick={() => handleReact(type)}
                    title={REACTION_LABELS[type].label}
                    className={`relative flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 sm:px-3 sm:py-3 font-medium transition-all duration-200 active:scale-90 ${
                      hasReacted
                        ? 'bg-brand-600 text-white ring-2 ring-brand-300 ring-offset-1 shadow-lg scale-105'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200 hover:shadow-md active:bg-slate-300'
                    }`}
                  >
                    <span
                      className={`text-xl sm:text-2xl transition-transform ${
                        hasReacted ? 'animate-bounce' : ''
                      }`}
                      style={{ animationDuration: '0.5s' }}
                    >
                      {REACTION_LABELS[type].emoji}
                    </span>
                    <span className={`text-xs font-bold leading-none ${
                      hasReacted ? 'text-white' : 'text-slate-600'
                    }`}>
                      {count > 0 ? count : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reaction hint */}
          <p className="text-center text-xs text-slate-400 mt-3">
            Tap to react • {userReaction ? 'Your reaction: ' + REACTION_LABELS[userReaction].label : 'Choose one'}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
          10% {
            transform: translateX(-50%) translateY(-8px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-120px) scale(0.8);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-bounce {
            animation: none;
          }
          [style*="animation: floatUp"] {
            animation: none !important;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

