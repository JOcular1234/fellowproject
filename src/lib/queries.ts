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
  Presentation,
  PresentationWithDetails,
  PresentationPhase,
  ReactionType,
  ReactionCount,
  ProjectShowcase,
  ShowcaseCard,
  ShowcaseDetail,
  ShowcaseGroupInfo,
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

// ===== Presentations =====

export async function fetchActivePresentation(): Promise<PresentationWithDetails | null> {
  const { data: pres, error } = await supabase
    .from('presentations')
    .select(`
      id,
      project_round_id,
      project_group_id,
      status,
      presentation_phase,
      started_at,
      ended_at,
      created_at,
      updated_at
    `)
    .eq('status', 'live')
    .maybeSingle();
  if (error) throw error;
  if (!pres) return null;

  const { data: group, error: gErr } = await supabase
    .from('project_groups')
    .select('id, name, level, group_number')
    .eq('id', pres.project_group_id)
    .maybeSingle();
  if (gErr) throw gErr;
  if (!group) return null;

  const { data: project } = await supabase
    .from('projects')
    .select('title, description')
    .eq('project_group_id', group.id)
    .maybeSingle();

  const { data: members } = await supabase
    .from('group_members')
    .select(`
      id,
      is_leader,
      fellow:fellows (id, first_name, last_name)
    `)
    .eq('project_group_id', group.id)
    .order('is_leader', { ascending: false });

  const { data: reactions } = await supabase
    .from('reactions')
    .select('reaction_type')
    .eq('presentation_id', pres.id);

  const reactionCounts: ReactionCount[] = [
    { reaction_type: 'thumbs_up', count: 0 },
    { reaction_type: 'thumbs_down', count: 0 },
    { reaction_type: 'heart', count: 0 },
    { reaction_type: 'fire', count: 0 },
    { reaction_type: 'laugh', count: 0 },
  ];
  for (const r of reactions ?? []) {
    const rc = reactionCounts.find((rc) => rc.reaction_type === r.reaction_type);
    if (rc) rc.count++;
  }

  return {
    id: pres.id,
    project_round_id: pres.project_round_id,
    project_group_id: pres.project_group_id,
    status: pres.status,
    presentation_phase: pres.presentation_phase as PresentationPhase,
    started_at: pres.started_at,
    ended_at: pres.ended_at,
    created_at: pres.created_at,
    updated_at: pres.updated_at,
    group_name: group.name,
    group_level: group.level,
    group_number: group.group_number,
    project_title: project?.title ?? null,
    project_description: project?.description ?? null,
    members: (members ?? []).map((m: any) => ({
      id: m.fellow?.id ?? m.id,
      first_name: m.fellow?.first_name ?? '',
      last_name: m.fellow?.last_name ?? '',
      is_leader: m.is_leader,
    })),
    reaction_counts: reactionCounts,
  };
}

export async function fetchPresentationsForRound(roundId: string): Promise<PresentationWithDetails[]> {
  const { data: presentations, error } = await supabase
    .from('presentations')
    .select(`
      id,
      project_round_id,
      project_group_id,
      status,
      presentation_phase,
      started_at,
      ended_at,
      created_at,
      updated_at
    `)
    .eq('project_round_id', roundId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!presentations) return [];

  const result: PresentationWithDetails[] = [];
  for (const pres of presentations) {
    const { data: group } = await supabase
      .from('project_groups')
      .select('id, name, level, group_number')
      .eq('id', pres.project_group_id)
      .maybeSingle();
    if (!group) continue;

    const { data: project } = await supabase
      .from('projects')
      .select('title, description')
      .eq('project_group_id', group.id)
      .maybeSingle();

    const { data: members } = await supabase
      .from('group_members')
      .select(`
        id,
        is_leader,
        fellow:fellows (id, first_name, last_name)
      `)
      .eq('project_group_id', group.id)
      .order('is_leader', { ascending: false });

    const { data: reactions } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('presentation_id', pres.id);

    const reactionCounts: ReactionCount[] = [
      { reaction_type: 'thumbs_up', count: 0 },
      { reaction_type: 'thumbs_down', count: 0 },
      { reaction_type: 'heart', count: 0 },
      { reaction_type: 'fire', count: 0 },
      { reaction_type: 'laugh', count: 0 },
    ];
    for (const r of reactions ?? []) {
      const rc = reactionCounts.find((rc) => rc.reaction_type === r.reaction_type);
      if (rc) rc.count++;
    }

    result.push({
      id: pres.id,
      project_round_id: pres.project_round_id,
      project_group_id: pres.project_group_id,
      status: pres.status,
      presentation_phase: pres.presentation_phase as PresentationPhase,
      started_at: pres.started_at,
      ended_at: pres.ended_at,
      created_at: pres.created_at,
      updated_at: pres.updated_at,
      group_name: group.name,
      group_level: group.level,
      group_number: group.group_number,
      project_title: project?.title ?? null,
      project_description: project?.description ?? null,
      members: (members ?? []).map((m: any) => ({
        id: m.fellow?.id ?? m.id,
        first_name: m.fellow?.first_name ?? '',
        last_name: m.fellow?.last_name ?? '',
        is_leader: m.is_leader,
      })),
      reaction_counts: reactionCounts,
    });
  }
  return result;
}

export async function fetchEndedPresentations(limit = 10): Promise<PresentationWithDetails[]> {
  const { data: presentations, error } = await supabase
    .from('presentations')
    .select(`
      id,
      project_round_id,
      project_group_id,
      status,
      presentation_phase,
      started_at,
      ended_at,
      created_at,
      updated_at
    `)
    .eq('status', 'ended')
    .order('ended_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!presentations) return [];

  const result: PresentationWithDetails[] = [];
  for (const pres of presentations) {
    const { data: group } = await supabase
      .from('project_groups')
      .select('id, name, level, group_number')
      .eq('id', pres.project_group_id)
      .maybeSingle();
    if (!group) continue;

    const { data: project } = await supabase
      .from('projects')
      .select('title, description')
      .eq('project_group_id', group.id)
      .maybeSingle();

    const { data: members } = await supabase
      .from('group_members')
      .select(`
        id,
        is_leader,
        fellow:fellows (id, first_name, last_name)
      `)
      .eq('project_group_id', group.id)
      .order('is_leader', { ascending: false });

    const { data: reactions } = await supabase
      .from('reactions')
      .select('reaction_type')
      .eq('presentation_id', pres.id);

    const reactionCounts: ReactionCount[] = [
      { reaction_type: 'thumbs_up', count: 0 },
      { reaction_type: 'thumbs_down', count: 0 },
      { reaction_type: 'heart', count: 0 },
      { reaction_type: 'fire', count: 0 },
      { reaction_type: 'laugh', count: 0 },
    ];
    for (const r of reactions ?? []) {
      const rc = reactionCounts.find((rc) => rc.reaction_type === r.reaction_type);
      if (rc) rc.count++;
    }

    result.push({
      id: pres.id,
      project_round_id: pres.project_round_id,
      project_group_id: pres.project_group_id,
      status: pres.status,
      presentation_phase: pres.presentation_phase as PresentationPhase,
      started_at: pres.started_at,
      ended_at: pres.ended_at,
      created_at: pres.created_at,
      updated_at: pres.updated_at,
      group_name: group.name,
      group_level: group.level,
      group_number: group.group_number,
      project_title: project?.title ?? null,
      project_description: project?.description ?? null,
      members: (members ?? []).map((m: any) => ({
        id: m.fellow?.id ?? m.id,
        first_name: m.fellow?.first_name ?? '',
        last_name: m.fellow?.last_name ?? '',
        is_leader: m.is_leader,
      })),
      reaction_counts: reactionCounts,
    });
  }
  return result;
}

export async function startPresentation(roundId: string, groupId: string, phase: PresentationPhase): Promise<Presentation> {
  const { data, error } = await supabase
    .from('presentations')
    .insert({
      project_round_id: roundId,
      project_group_id: groupId,
      status: 'live',
      presentation_phase: phase,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as Presentation;
}

export async function endPresentation(presentationId: string): Promise<void> {
  const { error } = await supabase
    .from('presentations')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', presentationId);
  if (error) throw error;
}

export async function deletePresentation(presentationId: string): Promise<void> {
  const { error } = await supabase
    .from('presentations')
    .delete()
    .eq('id', presentationId);
  if (error) throw error;
}

export async function addReaction(
  presentationId: string,
  reactionType: ReactionType,
  sessionId: string,
): Promise<void> {
  const { error: delErr } = await supabase
    .from('reactions')
    .delete()
    .eq('presentation_id', presentationId)
    .eq('session_id', sessionId);
  if (delErr) throw delErr;

  const { error: insErr } = await supabase
    .from('reactions')
    .insert({
      presentation_id: presentationId,
      reaction_type: reactionType,
      session_id: sessionId,
    });
  if (insErr) throw insErr;
}

export async function fetchUserReaction(
  presentationId: string,
  sessionId: string,
): Promise<ReactionType | null> {
  const { data, error } = await supabase
    .from('reactions')
    .select('reaction_type')
    .eq('presentation_id', presentationId)
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return (data?.reaction_type as ReactionType) ?? null;
}

export async function fetchReactionCounts(presentationId: string): Promise<ReactionCount[]> {
  const { data, error } = await supabase
    .from('reactions')
    .select('reaction_type')
    .eq('presentation_id', presentationId);
  if (error) throw error;

  const counts: ReactionCount[] = [
    { reaction_type: 'thumbs_up', count: 0 },
    { reaction_type: 'thumbs_down', count: 0 },
    { reaction_type: 'heart', count: 0 },
    { reaction_type: 'fire', count: 0 },
    { reaction_type: 'laugh', count: 0 },
  ];
  for (const r of data ?? []) {
    const rc = counts.find((rc) => rc.reaction_type === r.reaction_type);
    if (rc) rc.count++;
  }
  return counts;
}

export function getOrCreateSessionId(): string {
  const KEY = 'pf_session_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export interface GroupWithProject {
  id: string;
  name: string;
  level: FellowLevel;
  group_number: number;
  project_title: string | null;
}

export async function fetchAllGroupsForRound(roundId: string): Promise<GroupWithProject[]> {
  const { data: groups, error } = await supabase
    .from('project_groups')
    .select('id, name, level, group_number')
    .eq('project_round_id', roundId)
    .order('level', { ascending: true })
    .order('group_number', { ascending: true });
  if (error) throw error;
  if (!groups) return [];

  const result: GroupWithProject[] = [];
  for (const g of groups) {
    const { data: project } = await supabase
      .from('projects')
      .select('title')
      .eq('project_group_id', g.id)
      .maybeSingle();
    result.push({
      id: g.id,
      name: g.name,
      level: g.level,
      group_number: g.group_number,
      project_title: project?.title ?? null,
    });
  }
  return result;
}

// ===== Project Showcase =====

async function buildShowcaseCard(
  showcase: ProjectShowcase,
): Promise<ShowcaseCard | null> {
  const { data: project } = await supabase
    .from('projects')
    .select('id, title, description, project_group_id')
    .eq('id', showcase.project_id)
    .maybeSingle();
  if (!project) return null;

  // Primary group
  const { data: primaryGroup } = await supabase
    .from('project_groups')
    .select('id, name, level, group_number')
    .eq('id', project.project_group_id)
    .maybeSingle();
  if (!primaryGroup) return null;

  // Additional assigned groups
  const { data: assignments } = await supabase
    .from('project_group_assignments')
    .select('project_group_id')
    .eq('project_id', project.id);

  const additionalGroupIds = (assignments ?? []).map((a) => a.project_group_id);
  const allGroupIds = [primaryGroup.id, ...additionalGroupIds.filter((id) => id !== primaryGroup.id)];

  let additionalGroups: { id: string; name: string; level: FellowLevel; group_number: number }[] = [];
  if (additionalGroupIds.length > 0) {
    const { data: extraGroups } = await supabase
      .from('project_groups')
      .select('id, name, level, group_number')
      .in('id', additionalGroupIds);
    additionalGroups = (extraGroups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      level: g.level as FellowLevel,
      group_number: g.group_number,
    }));
  }

  const groups: ShowcaseGroupInfo[] = [
    { group_id: primaryGroup.id, group_name: primaryGroup.name, group_level: primaryGroup.level as FellowLevel, group_number: primaryGroup.group_number, is_primary: true },
    ...additionalGroups.map((g) => ({ group_id: g.id, group_name: g.name, group_level: g.level, group_number: g.group_number, is_primary: false })),
  ];

  // Members across all groups
  const { data: members } = await supabase
    .from('group_members')
    .select('is_leader, project_group_id, fellow: fellows!group_members_fellow_id_fkey(first_name, last_name)')
    .in('project_group_id', allGroupIds)
    .order('is_leader', { ascending: false });

  const memberList = (members ?? []) as unknown as {
    is_leader: boolean;
    project_group_id: string;
    fellow: { first_name: string; last_name: string };
  }[];

  const leader = memberList.find((m) => m.is_leader);
  const leaderName = leader ? `${leader.fellow.first_name} ${leader.fellow.last_name}` : null;

  // Presentations across all groups
  const { data: presentations } = await supabase
    .from('presentations')
    .select('id')
    .in('project_group_id', allGroupIds);

  let reactionCounts: ReactionCount[] = [
    { reaction_type: 'thumbs_up', count: 0 },
    { reaction_type: 'thumbs_down', count: 0 },
    { reaction_type: 'heart', count: 0 },
    { reaction_type: 'fire', count: 0 },
    { reaction_type: 'laugh', count: 0 },
  ];

  if (presentations && presentations.length > 0) {
    const presIds = presentations.map((p) => p.id);
    const { data: reactions } = await supabase
      .from('reactions')
      .select('reaction_type')
      .in('presentation_id', presIds);
    for (const r of reactions ?? []) {
      const rc = reactionCounts.find((rc) => rc.reaction_type === r.reaction_type);
      if (rc) rc.count++;
    }
  }

  const totalReactions = reactionCounts.reduce((sum, rc) => sum + rc.count, 0);

  return {
    showcase,
    project_id: project.id,
    project_title: project.title,
    project_description: project.description,
    groups,
    group_id: primaryGroup.id,
    group_name: primaryGroup.name,
    group_level: primaryGroup.level as FellowLevel,
    group_number: primaryGroup.group_number,
    leader_name: leaderName,
    member_count: memberList.length,
    total_reactions: totalReactions,
    reaction_counts: reactionCounts,
  };
}

export async function fetchPublishedShowcases(): Promise<ShowcaseCard[]> {
  const { data: showcases, error } = await supabase
    .from('project_showcases')
    .select('*')
    .eq('is_published', true)
    .order('is_featured', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  if (!showcases) return [];

  const results: ShowcaseCard[] = [];
  for (const sc of showcases as ProjectShowcase[]) {
    const card = await buildShowcaseCard(sc);
    if (card) results.push(card);
  }
  return results;
}

export async function fetchFeaturedShowcases(limit = 4): Promise<ShowcaseCard[]> {
  const { data: showcases, error } = await supabase
    .from('project_showcases')
    .select('*')
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!showcases) return [];

  const results: ShowcaseCard[] = [];
  for (const sc of showcases as ProjectShowcase[]) {
    const card = await buildShowcaseCard(sc);
    if (card) results.push(card);
  }
  return results;
}

export async function fetchShowcase(projectId: string): Promise<ShowcaseDetail | null> {
  const { data: showcase, error } = await supabase
    .from('project_showcases')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_published', true)
    .maybeSingle();
  if (error) throw error;
  if (!showcase) return null;

  const card = await buildShowcaseCard(showcase as ProjectShowcase);
  if (!card) return null;

  // Fetch members from all groups with group name
  const { data: members } = await supabase
    .from('group_members')
    .select('is_leader, project_group_id, fellow: fellows!group_members_fellow_id_fkey(id, first_name, last_name)')
    .in('project_group_id', card.groups.map((g) => g.group_id))
    .order('is_leader', { ascending: false });

  const memberList = (members ?? []) as unknown as {
    is_leader: boolean;
    project_group_id: string;
    fellow: { id: string; first_name: string; last_name: string };
  }[];

  const groupNameById = new Map(card.groups.map((g) => [g.group_id, g.group_name]));

  const { data: pres } = await supabase
    .from('presentations')
    .select('started_at')
    .in('project_group_id', card.groups.map((g) => g.group_id))
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    ...card,
    members: memberList.map((m) => ({
      id: m.fellow.id,
      first_name: m.fellow.first_name,
      last_name: m.fellow.last_name,
      is_leader: m.is_leader,
      group_name: groupNameById.get(m.project_group_id) ?? '',
    })),
    presentation_date: pres?.started_at ?? null,
  };
}

export async function fetchShowcaseForAdmin(projectId: string): Promise<ProjectShowcase | null> {
  const { data, error } = await supabase
    .from('project_showcases')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data as ProjectShowcase | null;
}

export async function upsertShowcase(
  projectId: string,
  data: {
    problem_statement?: string | null;
    solution?: string | null;
    technologies?: string[];
    screenshots?: string[];
    github_url?: string | null;
    demo_url?: string | null;
    is_published?: boolean;
    is_featured?: boolean;
  },
): Promise<ProjectShowcase | null> {
  const { data: existing } = await supabase
    .from('project_showcases')
    .select('id')
    .eq('project_id', projectId)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabase
      .from('project_showcases')
      .update(data)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return updated as ProjectShowcase;
  } else {
    const { data: created, error } = await supabase
      .from('project_showcases')
      .insert({ project_id: projectId, ...data })
      .select()
      .single();
    if (error) throw error;
    return created as ProjectShowcase;
  }
}

export async function deleteShowcase(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('project_showcases')
    .delete()
    .eq('project_id', projectId);
  if (error) throw error;
}

export async function fetchAssignedGroups(projectId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('project_group_assignments')
    .select('project_group_id')
    .eq('project_id', projectId);
  if (error) throw error;
  return (data ?? []).map((a) => a.project_group_id);
}

export async function assignGroupToProject(projectId: string, groupId: string): Promise<void> {
  const { error } = await supabase
    .from('project_group_assignments')
    .insert({ project_id: projectId, project_group_id: groupId });
  if (error) throw error;
}

export async function unassignGroupFromProject(projectId: string, groupId: string): Promise<void> {
  const { error } = await supabase
    .from('project_group_assignments')
    .delete()
    .eq('project_id', projectId)
    .eq('project_group_id', groupId);
  if (error) throw error;
}
