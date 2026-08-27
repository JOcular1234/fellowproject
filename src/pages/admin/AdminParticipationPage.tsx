import { useEffect, useState, useCallback } from 'react';
import {
  Activity, ChevronDown, ChevronRight, Crown, History, CheckCircle2,
  AlertCircle, XCircle, RefreshCw, Search,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  fetchParticipationOverview,
  updateParticipationStatus,
  fetchParticipationHistory,
  type GroupWithParticipation,
} from '@/lib/queries';
import {
  LEVEL_LABELS,
  PARTICIPATION_STATUS_LABELS,
  PARTICIPATION_STATUS_COLORS,
  PARTICIPATION_STATUS_DOT_COLORS,
  type ParticipationStatus,
  type ParticipationReview,
  type FellowLevel,
} from '@/lib/types';
import { supabase } from '@/lib/supabase';

const STATUS_OPTIONS: ParticipationStatus[] = ['active', 'needs_participation', 'not_participating'];

const STATUS_ICONS: Record<ParticipationStatus, typeof CheckCircle2> = {
  active: CheckCircle2,
  needs_participation: AlertCircle,
  not_participating: XCircle,
};

export function AdminParticipationPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupWithParticipation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [historyMemberId, setHistoryMemberId] = useState<string | null>(null);
  const [history, setHistory] = useState<ParticipationReview[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
        setGroups([]);
        return;
      }
      const data = await fetchParticipationOverview(round.id);
      setGroups(data);
      setExpandedGroups(new Set(data.map((g) => g.group_id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load participation data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleStatusChange = async (memberId: string, status: ParticipationStatus) => {
    if (!user) return;
    setUpdatingId(memberId);
    try {
      await updateParticipationStatus(memberId, status, user.id);
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          members: g.members.map((m) =>
            m.member_id === memberId
              ? { ...m, participation_status: status, last_reviewed_at: new Date().toISOString() }
              : m
          ),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleShowHistory = async (memberId: string) => {
    if (historyMemberId === memberId) {
      setHistoryMemberId(null);
      return;
    }
    setHistoryMemberId(memberId);
    setHistoryLoading(true);
    try {
      const data = await fetchParticipationHistory(memberId);
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredGroups = searchQuery.trim()
    ? groups
        .map((g) => ({
          ...g,
          members: g.members.filter((m) => {
            const full = `${m.first_name} ${m.last_name}`.toLowerCase();
            return full.includes(searchQuery.trim().toLowerCase());
          }),
        }))
        .filter((g) => g.members.length > 0)
    : groups;

  const allMembers = groups.flatMap((g) => g.members);
  const stats = {
    active: allMembers.filter((m) => m.participation_status === 'active').length,
    needs_participation: allMembers.filter((m) => m.participation_status === 'needs_participation').length,
    not_participating: allMembers.filter((m) => m.participation_status === 'not_participating').length,
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Participation Review</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track each fellow's project participation based on team leader feedback.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search filter */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search fellows by name..."
          className="w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
      </div>

      {/* Overview stats */}
      <div className="grid gap-3 sm:grid-cols-3 mb-6">
        {(Object.keys(stats) as ParticipationStatus[]).map((status) => {
          const Icon = STATUS_ICONS[status];
          const count = stats[status];
          return (
            <div key={status} className="card p-4">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-md ${PARTICIPATION_STATUS_COLORS[status]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                  <p className="text-xs text-slate-500">{PARTICIPATION_STATUS_LABELS[status]}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-slate-500">Loading participation data...</div>
      ) : filteredGroups.length === 0 ? (
        <div className="card p-8 text-center">
          <Activity className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">
            {searchQuery.trim() ? 'No fellows found matching your search.' : 'No groups found in the current round.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => (
            <div key={group.group_id} className="card overflow-hidden">
              <button
                onClick={() => toggleGroup(group.group_id)}
                className="flex w-full items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedGroups.has(group.group_id) ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="text-sm font-semibold text-slate-900">{group.group_name}</span>
                  <span className="badge bg-slate-100 text-slate-600">
                    {LEVEL_LABELS[group.level as FellowLevel] ?? group.level}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {group.members.filter((m) => m.participation_status !== 'active').length > 0 && (
                    <span className="badge bg-amber-50 text-amber-700">
                      {group.members.filter((m) => m.participation_status !== 'active').length} need attention
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{group.members.length} members</span>
                </div>
              </button>

              {expandedGroups.has(group.group_id) && (
                <div className="divide-y divide-slate-100">
                  {group.members.map((m) => {
                    const isUpdating = updatingId === m.member_id;
                    const showHistory = historyMemberId === m.member_id;
                    return (
                      <div key={m.member_id}>
                        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                              m.is_leader ? 'bg-brand-600' : 'bg-slate-300'
                            }`}>
                              {m.first_name[0]}{m.last_name[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium text-slate-900">
                                  {m.first_name} {m.last_name}
                                </span>
                                {m.is_leader && (
                                  <Crown className="h-3.5 w-3.5 text-brand-600" />
                                )}
                              </div>
                              <p className="text-xs text-slate-400">
                                Last reviewed: {formatDate(m.last_reviewed_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleShowHistory(m.member_id)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
                            >
                              <History className="h-3 w-3" />
                              History
                            </button>
                            <div className="flex items-center gap-1">
                              {STATUS_OPTIONS.map((status) => {
                                const isActive = m.participation_status === status;
                                const Icon = STATUS_ICONS[status];
                                return (
                                  <button
                                    key={status}
                                    onClick={() => handleStatusChange(m.member_id, status)}
                                    disabled={isUpdating}
                                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
                                      isActive
                                        ? PARTICIPATION_STATUS_COLORS[status]
                                        : 'text-slate-400 hover:bg-slate-100'
                                    }`}
                                  >
                                    <Icon className="h-3 w-3" />
                                    {PARTICIPATION_STATUS_LABELS[status]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {showHistory && (
                          <div className="bg-slate-50 px-4 py-3 border-t border-slate-100">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Participation History</p>
                            {historyLoading ? (
                              <p className="text-xs text-slate-400">Loading...</p>
                            ) : history.length === 0 ? (
                              <p className="text-xs text-slate-400">No status changes recorded yet.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {history.map((review) => (
                                  <div key={review.id} className="flex items-center gap-2 text-xs">
                                    <span className={`h-2 w-2 rounded-full ${PARTICIPATION_STATUS_DOT_COLORS[review.new_status]}`} />
                                    <span className="text-slate-600">
                                      {review.previous_status
                                        ? PARTICIPATION_STATUS_LABELS[review.previous_status]
                                        : '—'
                                      }
                                      {' → '}
                                      <span className="font-medium text-slate-800">
                                        {PARTICIPATION_STATUS_LABELS[review.new_status]}
                                      </span>
                                    </span>
                                    <span className="ml-auto text-slate-400">
                                      {formatDate(review.created_at)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {group.members.length === 0 && (
                    <div className="p-4 text-sm text-slate-500">No members in this group.</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
