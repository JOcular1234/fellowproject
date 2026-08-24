import { supabase } from './supabase';
import type {
  FellowLevel,
  ProjectGroupWithDetails,
  GroupMemberWithFellow,
  ProjectRound,
  PublicFellow,
} from './types';

export interface LevelGroupCount {
  level: FellowLevel;
  count: number;
}

let cachedRound: { data: ProjectRound | null; ts: number } | null = null;
const ROUND_CACHE_MS = 30_000;

export async function fetchPublishedRound(): Promise<ProjectRound | null> {
  if (cachedRound && Date.now() - cachedRound.ts < ROUND_CACHE_MS) {
    return cachedRound.data;
  }
  const { data, error } = await supabase
    .from('project_rounds')
    .select('*')
    .eq('status', 'PUBLISHED')
    .order('published_at', { ascending: false })
    .maybeSingle();
  if (error) throw error;
  cachedRound = { data, ts: Date.now() };
  return data;
}

export async function fetchLevelGroupCounts(roundId: string): Promise<LevelGroupCount[]> {
  const { data, error } = await supabase
    .from('project_groups')
    .select('level')
    .eq('project_round_id', roundId);
  if (error) throw error;
  const counts = new Map<FellowLevel, number>();
  (data || []).forEach((row) => {
    const level = row.level as FellowLevel;
    counts.set(level, (counts.get(level) || 0) + 1);
  });
  return Array.from(counts.entries()).map(([level, count]) => ({ level, count }));
}

export async function fetchGroupsByLevel(roundId: string, level: FellowLevel) {
  const { data, error } = await supabase
    .from('project_groups')
    .select('*')
    .eq('project_round_id', roundId)
    .eq('level', level)
    .order('group_number', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchGroupDetails(groupId: string): Promise<ProjectGroupWithDetails | null> {
  const [groupRes, membersRes, projectRes] = await Promise.all([
    supabase
      .from('project_groups')
      .select('*, project_round: project_rounds(*)')
      .eq('id', groupId)
      .maybeSingle(),
    supabase
      .from('group_members')
      .select('*, fellow: public_fellows!group_members_fellow_id_fkey(*)')
      .eq('project_group_id', groupId)
      .order('is_leader', { ascending: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('projects')
      .select('*')
      .eq('project_group_id', groupId)
      .maybeSingle(),
  ]);

  if (groupRes.error) throw groupRes.error;
  if (membersRes.error) throw membersRes.error;
  if (projectRes.error) throw projectRes.error;
  if (!groupRes.data) return null;

  return {
    ...groupRes.data,
    project_round: groupRes.data.project_round,
    members: (membersRes.data || []) as unknown as GroupMemberWithFellow[],
    project: projectRes.data || null,
  };
}

export interface SearchResult {
  fellow: PublicFellow;
  group_id: string;
  group_name: string;
  group_level: FellowLevel;
}

export async function searchFellows(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const parts = trimmed.toLowerCase().split(/\s+/).filter(Boolean);

  const { data: fellows, error } = await supabase
    .from('public_fellows')
    .select('*');
  if (error) throw error;
  if (!fellows) return [];

  const matched = fellows.filter((f) => {
    const full = `${f.first_name} ${f.last_name}`.toLowerCase();
    return parts.every((p) => full.includes(p));
  });

  if (matched.length === 0) return [];

  const matchedIds = matched.map((f) => f.id);

  const { data: memberships, error: mErr } = await supabase
    .from('group_members')
    .select('fellow_id, project_group: project_groups!inner(id, name, level, project_round: project_rounds!inner(status))')
    .in('fellow_id', matchedIds);
  if (mErr) return [];
  if (!memberships) return [];

  const fellowById = new Map(matched.map((f) => [f.id, f] as const));

  const results: SearchResult[] = [];
  for (const membership of memberships) {
    const pg = membership.project_group as unknown as {
      id: string;
      name: string;
      level: FellowLevel;
      project_round: { status: string };
    };
    if (pg.project_round.status !== 'PUBLISHED') continue;

    const fellow = fellowById.get(membership.fellow_id);
    if (!fellow) continue;

    results.push({
      fellow,
      group_id: pg.id,
      group_name: pg.name,
      group_level: pg.level,
    });
  }

  return results;
}
