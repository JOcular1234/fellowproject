import { useEffect, useState } from 'react';
import { ArrowLeft, Users, ChevronRight, Crown, Layers } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { fetchPublishedRound, fetchGroupsByLevel } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { LEVEL_LABELS, type FellowLevel, type ProjectGroup, type GroupMemberWithFellow } from '@/lib/types';
import { LevelListSkeleton } from '@/components/Skeleton';
import presentationBg from '@/public/presentation.jpeg';

interface GroupWithLeader extends ProjectGroup {
  memberCount: number;
  leaderName: string | null;
  projectTitle: string | null;
}

export function LevelPage({ level }: { level: FellowLevel }) {
  const { navigate } = useRouter();
  const [groups, setGroups] = useState<GroupWithLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const round = await fetchPublishedRound();
        if (!round) {
          setLoading(false);
          return;
        }
        const groupsData = await fetchGroupsByLevel(round.id, level);
        const groupIds = groupsData.map((g) => g.id);

        const [membersRes, projectsRes] = await Promise.all([
          groupIds.length === 0
            ? Promise.resolve({ data: [], error: null })
            : supabase
                .from('group_members')
                .select('*, fellow: public_fellows!group_members_fellow_id_fkey(*)')
                .in('project_group_id', groupIds),
          groupIds.length === 0
            ? Promise.resolve({ data: [], error: null })
            : supabase
                .from('projects')
                .select('project_group_id, title')
                .in('project_group_id', groupIds),
        ]);

        if (membersRes.error) throw membersRes.error;
        if (projectsRes.error) throw projectsRes.error;

        const allMembers = (membersRes.data || []) as unknown as (GroupMemberWithFellow & { project_group_id: string })[];
        const allProjects = (projectsRes.data || []) as { project_group_id: string; title: string | null }[];

        const membersByGroup = new Map<string, GroupMemberWithFellow[]>();
        for (const m of allMembers) {
          const arr = membersByGroup.get(m.project_group_id) || [];
          arr.push(m);
          membersByGroup.set(m.project_group_id, arr);
        }
        for (const arr of membersByGroup.values()) {
          arr.sort((a, b) => {
            if (a.is_leader !== b.is_leader) return a.is_leader ? -1 : 1;
            return 0;
          });
        }

        const projectByGroup = new Map<string, string | null>();
        for (const p of allProjects) {
          projectByGroup.set(p.project_group_id, p.title);
        }

        const enriched: GroupWithLeader[] = groupsData.map((g) => {
          const memberList = membersByGroup.get(g.id) || [];
          const leader = memberList.find((m) => m.is_leader);
          const leaderName = leader ? `${leader.fellow.first_name} ${leader.fellow.last_name}` : null;
          return {
            ...g,
            memberCount: memberList.length,
            leaderName,
            projectTitle: projectByGroup.get(g.id) ?? null,
          };
        });
        setGroups(enriched);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [level]);

  const levelLabel = LEVEL_LABELS[level] ?? level;

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
      <button
        onClick={() => navigate('/groups')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        All Levels
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50">
          <Layers className="h-6 w-6 text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{levelLabel}</h1>
          <p className="mt-0.5 text-sm text-slate-600">
            {loading
              ? 'Loading project groups...'
              : `${groups.length} Project Group${groups.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {loading && <LevelListSkeleton count={4} />}

      {error && (
        <div className="card p-6 text-center">
          <p className="text-sm text-slate-600">Something went wrong loading groups. Please try again.</p>
        </div>
      )}

      {!loading && !error && groups.length === 0 && (
        <div className="card p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-600">
            No project groups have been published for this level yet.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => navigate(`/group/${g.id}`)}
            className="group flex w-full flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
                {g.group_number}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">
                  {levelLabel} — Group {g.group_number}
                </p>
                <p className="text-sm text-slate-500">
                  {g.memberCount} Member{g.memberCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Leader</p>
                {g.leaderName ? (
                  <p className="flex items-center justify-end gap-1 text-sm font-medium text-slate-700">
                    <Crown className="h-3.5 w-3.5 text-brand-600" />
                    {g.leaderName}
                  </p>
                ) : (
                  <p className="text-sm font-medium text-slate-400 italic">Pending</p>
                )}
                <p className="mt-0.5 text-xs text-slate-500">
                  Project: {g.projectTitle ?? 'Not yet submitted'}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 transition-colors group-hover:text-brand-600" />
            </div>
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}
