import { supabase } from './supabase';
import type {
  FellowLevel,
  ProjectGroupWithDetails,
  GroupMemberWithFellow,
  ProjectRound,
  PublicFellow,
  TeamMeeting,
  Admin,
  AdminRole,
  ParticipationStatus,
  ParticipationReview,
  Announcement,
  Milestone,
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
  const [groupRes, membersRes, projectRes, meetingRes] = await Promise.all([
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
    supabase
      .from('team_meetings')
      .select('*')
      .eq('project_group_id', groupId)
      .maybeSingle(),
  ]);

  if (groupRes.error) throw groupRes.error;
  if (membersRes.error) throw membersRes.error;
  if (projectRes.error) throw projectRes.error;
  if (meetingRes.error) throw meetingRes.error;
  if (!groupRes.data) return null;

  return {
    ...groupRes.data,
    project_round: groupRes.data.project_round,
    members: (membersRes.data || []) as unknown as GroupMemberWithFellow[],
    project: projectRes.data || null,
    meeting: (meetingRes.data as TeamMeeting | null) || null,
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

export async function fetchAdmins(): Promise<Admin[]> {
  const { data, error } = await supabase
    .from('admins')
    .select('*')
    .order('role', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as Admin[];
}

export async function fetchCurrentAdminRole(userId: string): Promise<AdminRole | null> {
  const { data, error } = await supabase
    .from('admins')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.role as AdminRole) ?? null;
}

export async function removeAdmin(adminId: string): Promise<void> {
  const { error } = await supabase
    .from('admins')
    .delete()
    .eq('id', adminId);
  if (error) throw error;
}

export async function updateAdminRole(adminId: string, role: AdminRole): Promise<void> {
  const { error } = await supabase
    .from('admins')
    .update({ role })
    .eq('id', adminId);
  if (error) throw error;
}

// ===== Participation Tracking =====

export interface GroupWithParticipation {
  group_id: string;
  group_name: string;
  group_number: number;
  level: FellowLevel;
  members: {
    member_id: string;
    fellow_id: string;
    first_name: string;
    last_name: string;
    is_leader: boolean;
    participation_status: ParticipationStatus;
    last_reviewed_at: string | null;
  }[];
}

export async function fetchParticipationOverview(roundId: string): Promise<GroupWithParticipation[]> {
  const { data: groups, error: gErr } = await supabase
    .from('project_groups')
    .select('id, name, group_number, level')
    .eq('project_round_id', roundId)
    .order('level', { ascending: true })
    .order('group_number', { ascending: true });
  if (gErr) throw gErr;
  if (!groups || groups.length === 0) return [];

  const groupIds = groups.map((g) => g.id);

  const { data: members, error: mErr } = await supabase
    .from('group_members')
    .select(`
      id,
      project_group_id,
      fellow_id,
      is_leader,
      participation_status,
      last_reviewed_at,
      fellow: fellows!group_members_fellow_id_fkey(first_name, last_name)
    `)
    .in('project_group_id', groupIds)
    .order('is_leader', { ascending: false })
    .order('created_at', { ascending: true });
  if (mErr) throw mErr;

  const membersByGroup = new Map<string, GroupWithParticipation['members']>();
  for (const m of members || []) {
    const fellow = m.fellow as unknown as { first_name: string; last_name: string };
    const entry = {
      member_id: m.id,
      fellow_id: m.fellow_id,
      first_name: fellow?.first_name ?? '',
      last_name: fellow?.last_name ?? '',
      is_leader: m.is_leader,
      participation_status: m.participation_status as ParticipationStatus,
      last_reviewed_at: m.last_reviewed_at,
    };
    const arr = membersByGroup.get(m.project_group_id) || [];
    arr.push(entry);
    membersByGroup.set(m.project_group_id, arr);
  }

  return groups.map((g) => ({
    group_id: g.id,
    group_name: g.name,
    group_number: g.group_number,
    level: g.level as FellowLevel,
    members: membersByGroup.get(g.id) || [],
  }));
}

export async function updateParticipationStatus(
  memberId: string,
  status: ParticipationStatus,
  reviewerId: string,
): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .update({
      participation_status: status,
      last_reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq('id', memberId);
  if (error) throw error;
}

export async function bulkUpdateParticipationStatus(
  memberIds: string[],
  status: ParticipationStatus,
  reviewerId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('group_members')
    .update({
      participation_status: status,
      last_reviewed_at: now,
      reviewed_by: reviewerId,
    })
    .in('id', memberIds);
  if (error) throw error;
}

export async function fetchParticipationHistory(memberId: string): Promise<ParticipationReview[]> {
  const { data, error } = await supabase
    .from('participation_reviews')
    .select('*')
    .eq('group_member_id', memberId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as ParticipationReview[];
}

// ===== Announcements =====

export async function fetchActiveAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Announcement[];
}

export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Announcement[];
}

export async function createAnnouncement(
  title: string,
  body: string,
  isPinned: boolean,
  createdBy: string,
): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ title, body, is_pinned: isPinned, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data as Announcement;
}

export async function updateAnnouncement(
  id: string,
  updates: { title?: string; body?: string; is_pinned?: boolean; is_active?: boolean },
): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ===== Milestones =====

export async function fetchMilestonesForRound(roundId: string): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('project_round_id', roundId)
    .order('due_date', { ascending: true });
  if (error) throw error;
  return (data || []) as Milestone[];
}

export async function fetchPublishedRoundMilestones(): Promise<Milestone[]> {
  const round = await fetchPublishedRound();
  if (!round) return [];
  return fetchMilestonesForRound(round.id);
}

export async function createMilestone(
  roundId: string,
  title: string,
  description: string | null,
  dueDate: string,
): Promise<Milestone> {
  const { data, error } = await supabase
    .from('milestones')
    .insert({ project_round_id: roundId, title, description, due_date: dueDate })
    .select()
    .single();
  if (error) throw error;
  return data as Milestone;
}

export async function updateMilestone(
  id: string,
  updates: { title?: string; description?: string | null; due_date?: string; is_completed?: boolean },
): Promise<void> {
  const payload: Record<string, unknown> = { ...updates };
  if (updates.is_completed !== undefined) {
    payload.completed_at = updates.is_completed ? new Date().toISOString() : null;
  }
  const { error } = await supabase
    .from('milestones')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase
    .from('milestones')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
