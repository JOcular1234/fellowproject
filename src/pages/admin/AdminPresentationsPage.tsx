import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Radio, Play, Square, Trash2, X, AlertCircle, CheckCircle2,
  ChevronDown, Users,
} from 'lucide-react';
import {
  fetchPresentationsForRound,
  fetchAllGroupsForRound,
  startPresentation,
  endPresentation,
  deletePresentation,
  type GroupWithProject,
} from '@/lib/queries';
import type { PresentationWithDetails, FellowLevel, PresentationPhase } from '@/lib/types';
import { LEVEL_LABELS, LEVEL_ORDER, PRESENTATION_PHASE_LABELS, PRESENTATION_PHASE_ORDER, REACTION_LABELS, type ReactionType } from '@/lib/types';
import { supabase } from '@/lib/supabase';

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export function AdminPresentationsPage() {
  const [presentations, setPresentations] = useState<PresentationWithDetails[]>([]);
  const [groups, setGroups] = useState<GroupWithProject[]>([]);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<FellowLevel | null>(null);

  // Start presentation modal
  const [startModalGroup, setStartModalGroup] = useState<GroupWithProject | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<PresentationPhase>('initial_review');
  const [starting, setStarting] = useState(false);

  // End live confirmation
  const [confirmEndLive, setConfirmEndLive] = useState<GroupWithProject | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: round, error: rErr } = await supabase
        .from('project_rounds')
        .select('id')
        .eq('status', 'PUBLISHED')
        .order('published_at', { ascending: false })
        .maybeSingle();
      if (rErr) throw rErr;
      if (!round) {
        setError('No published project round found.');
        setPresentations([]);
        setGroups([]);
        return;
      }
      setRoundId(round.id);
      const [pres, grps] = await Promise.all([
        fetchPresentationsForRound(round.id),
        fetchAllGroupsForRound(round.id),
      ]);
      setPresentations(pres);
      setGroups(grps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load presentations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const livePresentation = presentations.find((p) => p.status === 'live');
  const endedPresentations = presentations.filter((p) => p.status === 'ended');

  // Poll for updates when a live presentation is active
  useEffect(() => {
    if (!livePresentation) return;
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [livePresentation, loadData]);

  // Count presentations per group
  const presentationCountByGroup = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of presentations) {
      map.set(p.project_group_id, (map.get(p.project_group_id) ?? 0) + 1);
    }
    return map;
  }, [presentations]);

  // Phases already used per group
  const phasesByGroup = useMemo(() => {
    const map = new Map<string, Set<PresentationPhase>>();
    for (const p of presentations) {
      const set = map.get(p.project_group_id) ?? new Set();
      set.add(p.presentation_phase);
      map.set(p.project_group_id, set);
    }
    return map;
  }, [presentations]);

  // Group ended presentations by group
  const endedByGroup = useMemo(() => {
    const map = new Map<string, PresentationWithDetails[]>();
    for (const p of endedPresentations) {
      const arr = map.get(p.project_group_id) ?? [];
      arr.push(p);
      map.set(p.project_group_id, arr);
    }
    return map;
  }, [endedPresentations]);

  const openStartModal = (group: GroupWithProject) => {
    setStartModalGroup(group);
    const usedPhases = phasesByGroup.get(group.id) ?? new Set();
    const nextPhase = PRESENTATION_PHASE_ORDER.find((ph) => !usedPhases.has(ph)) ?? 'final_presentation';
    setSelectedPhase(nextPhase);
  };

  const handleStartClick = (group: GroupWithProject) => {
    if (livePresentation) {
      setConfirmEndLive(group);
      return;
    }
    openStartModal(group);
  };

  const handleStartConfirm = async () => {
    if (!roundId || !startModalGroup) return;
    setStarting(true);
    setError(null);
    try {
      await startPresentation(roundId, startModalGroup.id, selectedPhase);
      setSuccess('Presentation started.');
      setStartModalGroup(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start presentation.');
    } finally {
      setStarting(false);
    }
  };

  const handleEnd = async () => {
    if (!livePresentation) return;
    try {
      await endPresentation(livePresentation.id);
      setSuccess('Presentation ended.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end presentation.');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deletePresentation(confirmDelete);
      setSuccess('Presentation deleted.');
      setConfirmDelete(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete presentation.');
    }
  };

  const groupsByLevel = LEVEL_ORDER.map((level) => ({
    level,
    label: LEVEL_LABELS[level],
    groups: groups.filter((g) => g.level === level),
  })).filter((entry) => entry.groups.length > 0);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
            <Radio className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Live Presentations</h1>
            <p className="text-sm text-slate-600 mt-1">
              Control which group is presenting. Fellows see the live presentation and can react in real time.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-700 hover:text-green-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center">
          <div className="inline-block">
            <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-brand-600 animate-spin" />
          </div>
          <p className="mt-4 text-sm text-slate-600">Loading...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Currently presenting */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-3">
              Currently Presenting
            </h2>
            {livePresentation ? (
              <div className="rounded-lg border-2 border-red-200 bg-red-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex h-3 w-3">
                        <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wide text-red-600">Live</span>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        {PRESENTATION_PHASE_LABELS[livePresentation.presentation_phase]}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {LEVEL_LABELS[livePresentation.group_level]} — {livePresentation.group_name}
                    </h3>
                    {livePresentation.project_title && (
                      <p className="mt-1 text-sm text-slate-700">{livePresentation.project_title}</p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      Started {formatDateTime(livePresentation.started_at)}
                    </p>

                    {/* Reaction counts */}
                    <div className="mt-4 flex items-center gap-4">
                      {livePresentation.reaction_counts.map((rc) => (
                        <div key={rc.reaction_type} className="flex items-center gap-1">
                          <span className="text-lg">{REACTION_LABELS[rc.reaction_type as ReactionType].emoji}</span>
                          <span className="text-sm font-semibold text-slate-700">{rc.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleEnd}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors shrink-0"
                  >
                    <Square className="h-4 w-4" />
                    End Presentation
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-sm text-slate-500">No group is currently presenting.</p>
              </div>
            )}
          </div>

          {/* All project groups */}
          {groups.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-3">
                All Project Groups ({groups.length})
              </h2>
              <div className="space-y-2">
                {groupsByLevel.map((entry) => (
                  <div key={entry.level}>
                    <button
                      onClick={() => setExpandedLevel(expandedLevel === entry.level ? null : entry.level)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors mb-2"
                    >
                      <Users className="h-4 w-4 text-slate-500" />
                      <span className="flex-1 text-left text-sm font-semibold text-slate-900">{entry.label}</span>
                      <span className="text-xs text-slate-500">{entry.groups.length} group{entry.groups.length !== 1 ? 's' : ''}</span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expandedLevel === entry.level ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedLevel === entry.level && (
                      <div className="space-y-2 mb-3">
                        {entry.groups.map((g) => {
                          const count = presentationCountByGroup.get(g.id) ?? 0;
                          const usedPhases = phasesByGroup.get(g.id) ?? new Set();
                          const isLive = livePresentation?.project_group_id === g.id;
                          return (
                            <div key={g.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-4">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900">{g.name}</p>
                                {g.project_title ? (
                                  <p className="mt-0.5 text-xs text-slate-600">{g.project_title}</p>
                                ) : (
                                  <p className="mt-0.5 text-xs text-slate-400 italic">No project submitted yet</p>
                                )}
                                <div className="mt-1.5 flex items-center gap-2">
                                  {count > 0 ? (
                                    <>
                                      <span className="text-xs text-slate-500">
                                        {count} presentation{count !== 1 ? 's' : ''} completed
                                      </span>
                                      <div className="flex gap-1">
                                        {PRESENTATION_PHASE_ORDER.map((ph) => (
                                          <span
                                            key={ph}
                                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                                              usedPhases.has(ph)
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-slate-100 text-slate-400'
                                            }`}
                                          >
                                            {PRESENTATION_PHASE_LABELS[ph].split(' ')[0]}
                                          </span>
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-xs text-slate-400">No presentations yet</span>
                                  )}
                                </div>
                              </div>
                              {isLive ? (
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-600 shrink-0">
                                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                                  Live Now
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleStartClick(g)}
                                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shrink-0"
                                >
                                  <Play className="h-4 w-4" />
                                  Start
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Presentation history grouped by group */}
          {endedPresentations.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-3">
                Presentation History ({endedPresentations.length})
              </h2>
              <div className="space-y-3">
                {Array.from(endedByGroup.entries()).map(([groupId, presList]) => {
                  const first = presList[0];
                  return (
                    <div key={groupId} className="rounded-lg border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                        <p className="text-sm font-semibold text-slate-900">
                          {LEVEL_LABELS[first.group_level]} — {first.group_name}
                        </p>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {presList.map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                  {PRESENTATION_PHASE_LABELS[p.presentation_phase]}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {formatDateTime(p.started_at)}
                                </span>
                              </div>
                              {p.project_title && (
                                <p className="mt-1 text-xs text-slate-600">{p.project_title}</p>
                              )}
                              <div className="mt-2 flex items-center gap-3">
                                {p.reaction_counts.map((rc) => (
                                  <div key={rc.reaction_type} className="flex items-center gap-1">
                                    <span className="text-sm">{REACTION_LABELS[rc.reaction_type as ReactionType].emoji}</span>
                                    <span className="text-xs font-semibold text-slate-600">{rc.count}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={() => setConfirmDelete(p.id)}
                              title="Delete"
                              className="rounded-md p-2 text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {groups.length === 0 && presentations.length === 0 && (
            <div className="card p-12 text-center">
              <Radio className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-base font-semibold text-slate-900 mb-1">No groups available</h3>
              <p className="text-sm text-slate-600">No project groups found for the current round.</p>
            </div>
          )}
        </div>
      )}

      {/* Start presentation modal */}
      {startModalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm card border border-slate-200 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Start Live Presentation</h3>
              <button onClick={() => setStartModalGroup(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-slate-600">
                Team: <span className="font-semibold text-slate-900">{startModalGroup.name}</span>
              </p>
              {startModalGroup.project_title && (
                <p className="mt-0.5 text-xs text-slate-500">{startModalGroup.project_title}</p>
              )}
            </div>
            <div className="mb-5">
              <label className="label-text">Presentation Phase</label>
              <div className="mt-2 space-y-2">
                {PRESENTATION_PHASE_ORDER.map((ph) => {
                  const used = (phasesByGroup.get(startModalGroup.id) ?? new Set()).has(ph);
                  return (
                    <label
                      key={ph}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        selectedPhase === ph
                          ? 'border-brand-300 bg-brand-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="phase"
                        value={ph}
                        checked={selectedPhase === ph}
                        onChange={(e) => setSelectedPhase(e.target.value as PresentationPhase)}
                        className="h-4 w-4 text-brand-600"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-slate-900">{PRESENTATION_PHASE_LABELS[ph]}</span>
                        {used && (
                          <span className="ml-2 text-xs text-green-600">✓ Done</span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStartModalGroup(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartConfirm}
                disabled={starting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
              >
                {starting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start Live
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End live & start confirmation */}
      {confirmEndLive && livePresentation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setConfirmEndLive(null)}
        >
          <div
            className="w-full max-w-sm card border border-slate-200 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Another team is presenting</h3>
                <p className="mt-1 text-sm text-slate-600">
                  <span className="font-medium">{livePresentation.group_name}</span> is currently live.
                  End their presentation to start {confirmEndLive.name}?
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmEndLive(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await endPresentation(livePresentation.id);
                  setConfirmEndLive(null);
                  openStartModal(confirmEndLive);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                End & Start New
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm card border border-slate-200 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Delete presentation?</h3>
                <p className="mt-1 text-sm text-slate-600">All reactions will be lost. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
