import { useEffect, useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, X, Users, Crown, FileText,
  ChevronDown, ChevronRight, Sparkles, ArrowRightLeft,
  AlertTriangle, Eye, EyeOff, RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  LEVEL_LABELS,
  LEVEL_ORDER,
  PROJECT_STATUS_LABELS,
  ROUND_STATUS_LABELS,
  type FellowLevel,
  type Fellow,
  type ProjectRound,
  type ProjectGroup,
  type GroupMember,
  type Project,
  type ProjectStatus,
  type ProjectRoundStatus,
} from '@/lib/types';
import {
  generateGroupsForLevel,
  calcStats,
} from '@/lib/groupGen';

interface GroupDetail extends ProjectGroup {
  members: (GroupMember & { fellow: Fellow })[];
  project: Project | null;
}

const STATUS_COLORS: Record<ProjectRoundStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PUBLISHED: 'bg-green-50 text-green-700',
  ARCHIVED: 'bg-amber-50 text-amber-700',
};

export function AdminGroupsPage() {

  const [rounds, setRounds] = useState<ProjectRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupDetail[]>([]);
  const [allFellows, setAllFellows] = useState<Fellow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Group form
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProjectGroup | null>(null);
  const [groupForm, setGroupForm] = useState({
    level: 'BEGINNER' as FellowLevel,
    group_number: 1,
    name: '',
  });
  const [savingGroup, setSavingGroup] = useState(false);

  // Generate form
  const [showGenForm, setShowGenForm] = useState(false);
  const [genTargetSize, setGenTargetSize] = useState(5);
  const [genLevel, setGenLevel] = useState<FellowLevel | 'ALL'>('ALL');
  const [generating, setGenerating] = useState(false);

  // Project form
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectEditingGroup, setProjectEditingGroup] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    status: 'NOT_SUBMITTED' as ProjectStatus,
  });
  const [savingProject, setSavingProject] = useState(false);

  // Move member
  const [moveMemberId, setMoveMemberId] = useState<string | null>(null);
  const [moveTargetGroupId, setMoveTargetGroupId] = useState<string>('');

  // Add member
  const [addMemberFellowId, setAddMemberFellowId] = useState<string>('');
  const [addMemberIsLeader, setAddMemberIsLeader] = useState(false);

  const selectedRound = rounds.find((r) => r.id === selectedRoundId) ?? null;
  const isDraftRound = selectedRound?.status === 'DRAFT';
  const isPublishedRound = selectedRound?.status === 'PUBLISHED';

  const loadRounds = async () => {
    const { data, error } = await supabase
      .from('project_rounds')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
      return;
    }
    setRounds(data || []);
    if (data && data.length > 0 && !selectedRoundId) {
      setSelectedRoundId(data[0].id);
    }
  };

  const loadFellows = async () => {
    const { data, error } = await supabase
      .from('fellows')
      .select('*')
      .order('first_name', { ascending: true });
    if (error) {
      setError(error.message);
      return;
    }
    setAllFellows(data || []);
  };

  const loadGroups = async () => {
    if (!selectedRoundId) return;
    setLoading(true);
    setError(null);
    const { data: groupData, error: groupError } = await supabase
      .from('project_groups')
      .select('*')
      .eq('project_round_id', selectedRoundId)
      .order('level', { ascending: true })
      .order('group_number', { ascending: true });
    if (groupError) {
      setError(groupError.message);
      setLoading(false);
      return;
    }

    const groupIds = (groupData || []).map((g) => g.id);
    if (groupIds.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const [membersRes, projectsRes] = await Promise.all([
      supabase
        .from('group_members')
        .select('*, project_group_id, fellow: fellows!group_members_fellow_id_fkey(*)')
        .in('project_group_id', groupIds)
        .order('is_leader', { ascending: false })
        .order('created_at', { ascending: true }),
      supabase
        .from('projects')
        .select('*')
        .in('project_group_id', groupIds),
    ]);

    if (membersRes.error) {
      setError(membersRes.error.message);
      setLoading(false);
      return;
    }
    if (projectsRes.error) {
      setError(projectsRes.error.message);
      setLoading(false);
      return;
    }

    const allMembers = (membersRes.data || []) as unknown as (GroupMember & { project_group_id: string; fellow: Fellow })[];
    const allProjects = projectsRes.data || [];

    const membersByGroup = new Map<string, (GroupMember & { fellow: Fellow })[]>();
    for (const m of allMembers) {
      const arr = membersByGroup.get(m.project_group_id) || [];
      arr.push(m);
      membersByGroup.set(m.project_group_id, arr);
    }

    const projectByGroup = new Map<string, Project>();
    for (const p of allProjects) {
      projectByGroup.set(p.project_group_id, p);
    }

    const enriched: GroupDetail[] = (groupData || []).map((g) => ({
      ...g,
      members: membersByGroup.get(g.id) || [],
      project: projectByGroup.get(g.id) ?? null,
    }));
    setGroups(enriched);
    setLoading(false);
  };

  useEffect(() => {
    loadRounds();
    loadFellows();
  }, []);

  useEffect(() => {
    loadGroups();
  }, [selectedRoundId]);

  // Clear messages after a delay
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Group groups by level for display
  const groupsByLevel = useMemo(() => {
    const map: Record<string, GroupDetail[]> = {};
    LEVEL_ORDER.forEach((l) => { map[l] = []; });
    groups.forEach((g) => {
      if (map[g.level]) map[g.level].push(g);
    });
    return map;
  }, [groups]);

  const availableFellows = (groupId: string) => {
    const memberIds = groups.find((g) => g.id === groupId)?.members.map((m) => m.fellow.id) ?? [];
    const allAssignedIds = new Set(groups.flatMap((g) => g.members.map((m) => m.fellow.id)));
    return allFellows.filter((f) => !allAssignedIds.has(f.id) && !memberIds.includes(f.id));
  };

  // === Group CRUD ===
  const openAddGroup = () => {
    setEditingGroup(null);
    setGroupForm({ level: 'BEGINNER', group_number: 1, name: '' });
    setError(null);
    setShowGroupForm(true);
  };

  const openEditGroup = (g: ProjectGroup) => {
    setEditingGroup(g);
    setGroupForm({ level: g.level, group_number: g.group_number, name: g.name });
    setError(null);
    setShowGroupForm(true);
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoundId) return;
    setSavingGroup(true);
    setError(null);

    const name = groupForm.name.trim() || `${LEVEL_LABELS[groupForm.level]} — Group ${groupForm.group_number}`;

    let hadError = false;
    if (editingGroup) {
      const { error: updateError } = await supabase
        .from('project_groups')
        .update({ ...groupForm, name })
        .eq('id', editingGroup.id);
      if (updateError) { setError(updateError.message); hadError = true; }
    } else {
      const { error: insertError } = await supabase
        .from('project_groups')
        .insert({ ...groupForm, name, project_round_id: selectedRoundId });
      if (insertError) { setError(insertError.message); hadError = true; }
    }

    if (!hadError) {
      setShowGroupForm(false);
      loadGroups();
    }
    setSavingGroup(false);
  };

  const handleDeleteGroup = async (g: ProjectGroup) => {
    if (!confirm(`Delete "${g.name}"? This removes all members and the project for this group.`)) return;
    setError(null);
    const { error: delError } = await supabase.from('project_groups').delete().eq('id', g.id);
    if (delError) {
      setError(delError.message);
      return;
    }
    loadGroups();
  };

  // === Generate groups ===
  const handleGenerate = async () => {
    if (!selectedRoundId) return;
    setGenerating(true);
    setError(null);

    try {
      const levelsToGenerate: FellowLevel[] =
        genLevel === 'ALL' ? [...LEVEL_ORDER] : [genLevel];

      // Delete existing groups in selected levels for this round
      if (genLevel === 'ALL') {
        await supabase.from('project_groups').delete().eq('project_round_id', selectedRoundId);
      } else {
        await supabase
          .from('project_groups')
          .delete()
          .eq('project_round_id', selectedRoundId)
          .eq('level', genLevel);
      }

      let groupCounter = 0;
      for (const level of levelsToGenerate) {
        const generated = generateGroupsForLevel(allFellows, level, genTargetSize);

        for (const gen of generated) {
          groupCounter++;
          const name = `${LEVEL_LABELS[level]} — Group ${gen.groupNumber}`;
          const { data: newGroup, error: insertError } = await supabase
            .from('project_groups')
            .insert({
              project_round_id: selectedRoundId,
              level,
              group_number: gen.groupNumber,
              name,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          if (!newGroup) continue;

          const memberInserts = gen.members.map((f) => ({
            project_group_id: newGroup.id,
            fellow_id: f.id,
            is_leader: false,
          }));

          if (memberInserts.length > 0) {
            const { error: memberError } = await supabase
              .from('group_members')
              .insert(memberInserts);
            if (memberError) throw memberError;
          }
        }
      }

      setSuccess(`Generated ${groupCounter} group(s). Review and adjust before publishing.`);
      setShowGenForm(false);
      loadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate groups');
    } finally {
      setGenerating(false);
    }
  };

  // === Leader management ===
  const handleSetLeader = async (memberId: string, groupId: string, fellowName: string) => {
    if (!confirm(`Set ${fellowName} as Group Leader? They will replace the current leader (if any).`)) return;
    setError(null);

    // Set all members in group to is_leader=false, then set selected to true
    const { error: clearError } = await supabase
      .from('group_members')
      .update({ is_leader: false })
      .eq('project_group_id', groupId);

    if (clearError) {
      setError(clearError.message);
      return;
    }

    const { error: setError2 } = await supabase
      .from('group_members')
      .update({ is_leader: true })
      .eq('id', memberId);

    if (setError2) {
      setError(setError2.message);
      return;
    }

    setSuccess(`${fellowName} is now the group leader.`);
    loadGroups();
  };

  // === Member management ===
  const handleRemoveMember = async (memberId: string) => {
    setError(null);
    const { error: delError } = await supabase.from('group_members').delete().eq('id', memberId);
    if (delError) {
      setError(delError.message);
      return;
    }
    loadGroups();
  };

  const handleAddMember = async (groupId: string) => {
    if (!addMemberFellowId) return;
    setError(null);
    const { error: insertError } = await supabase
      .from('group_members')
      .insert({ project_group_id: groupId, fellow_id: addMemberFellowId, is_leader: addMemberIsLeader });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setAddMemberFellowId('');
    setAddMemberIsLeader(false);
    loadGroups();
  };

  // === Move member ===
  const openMoveDialog = (memberId: string) => {
    setMoveMemberId(memberId);
    setMoveTargetGroupId('');
  };

  const handleMoveMember = async () => {
    if (!moveMemberId || !moveTargetGroupId) return;
    setError(null);

    const sourceGroup = groups.find((g) => g.members.some((m) => m.id === moveMemberId));
    const targetGroup = groups.find((g) => g.id === moveTargetGroupId);
    if (!sourceGroup || !targetGroup) return;

    const member = sourceGroup.members.find((m) => m.id === moveMemberId);
    if (!member) return;

    // Check for imbalance warning
    const sourceStats = calcStats(sourceGroup.members.map((m) => m.fellow));
    const targetStats = calcStats(targetGroup.members.map((m) => m.fellow));
    const movedFellowLessons = member.fellow.lessons_completed;

    const newTargetAvg = (targetStats.avgLessons * targetStats.count + movedFellowLessons) / (targetStats.count + 1);
    const newSourceAvg = sourceStats.count > 1
      ? (sourceStats.avgLessons * sourceStats.count - movedFellowLessons) / (sourceStats.count - 1)
      : 0;

    const imbalance = Math.abs(newTargetAvg - newSourceAvg) > 10;

    if (imbalance) {
      if (!confirm(
        `Warning: This move may create a significant imbalance in average lessons between the two groups ` +
        `(target avg ~${newTargetAvg.toFixed(1)}, source avg ~${newSourceAvg.toFixed(1)}). ` +
        `Do you want to proceed?`
      )) {
        return;
      }
    }

    const { error: updateError } = await supabase
      .from('group_members')
      .update({ project_group_id: moveTargetGroupId, is_leader: false })
      .eq('id', moveMemberId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(`Moved ${member.fellow.first_name} ${member.fellow.last_name} to ${targetGroup.name}.`);
    setMoveMemberId(null);
    setMoveTargetGroupId('');
    loadGroups();
  };

  // === Project management ===
  const openProjectForm = (groupId: string, project: Project | null) => {
    setProjectEditingGroup(groupId);
    setProjectForm({
      title: project?.title ?? '',
      description: project?.description ?? '',
      status: project?.status ?? 'NOT_SUBMITTED',
    });
    setError(null);
    setShowProjectForm(true);
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectEditingGroup) return;
    setSavingProject(true);
    setError(null);

    const existing = groups.find((g) => g.id === projectEditingGroup)?.project;
    const payload = {
      project_group_id: projectEditingGroup,
      title: projectForm.title.trim() || null,
      description: projectForm.description.trim() || null,
      status: projectForm.status,
      submitted_at:
        projectForm.status !== 'NOT_SUBMITTED' && !existing?.submitted_at
          ? new Date().toISOString()
          : existing?.submitted_at ?? null,
    };

    let hadError = false;
    if (existing) {
      const { error: updateError } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', existing.id);
      if (updateError) { setError(updateError.message); hadError = true; }
    } else {
      const { error: insertError } = await supabase.from('projects').insert(payload);
      if (insertError) { setError(insertError.message); hadError = true; }
    }

    if (!hadError) {
      setShowProjectForm(false);
      setProjectEditingGroup(null);
      loadGroups();
    }
    setSavingProject(false);
  };

  // === Publish / Unpublish round ===
  const handlePublishRound = async () => {
    if (!selectedRound) return;
    if (groups.length === 0) {
      setError('No groups to publish. Generate groups first.');
      return;
    }
    if (!confirm(`Publish "${selectedRound.name}"? All groups will become visible on the public website.`)) return;
    setError(null);
    const { error: updateError } = await supabase
      .from('project_rounds')
      .update({ status: 'PUBLISHED', published_at: new Date().toISOString() })
      .eq('id', selectedRound.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess('Round published. Groups are now visible publicly.');
    loadRounds();
  };

  const handleUnpublishRound = async () => {
    if (!selectedRound) return;
    if (!confirm(`Unpublish "${selectedRound.name}"? Groups will be hidden from the public website.`)) return;
    setError(null);
    const { error: updateError } = await supabase
      .from('project_rounds')
      .update({ status: 'DRAFT' })
      .eq('id', selectedRound.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSuccess('Round unpublished. Groups are now draft only.');
    loadRounds();
  };

  // Get groups available for moving (same level, different group)
  const moveTargetGroups = (sourceGroupId: string, level: FellowLevel) =>
    groups.filter((g) => g.level === level && g.id !== sourceGroupId);

  const handleClearAllLeaders = async () => {
    if (!selectedRoundId) return;
    if (!confirm('Remove all group leaders from this round? You can reassign leaders manually afterwards.')) return;
    setError(null);
    const groupIds = groups.map((g) => g.id);
    if (groupIds.length === 0) {
      setError('No groups to clear.');
      return;
    }
    const { error: clearError } = await supabase
      .from('group_members')
      .update({ is_leader: false })
      .in('project_group_id', groupIds);
    if (clearError) {
      setError(clearError.message);
      return;
    }
    setSuccess('All group leaders have been removed. Assign leaders manually when ready.');
    loadGroups();
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Project Groups</h1>
          <p className="text-sm text-slate-500">Generate, review, adjust, and publish groups.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearAllLeaders}
            disabled={!selectedRoundId || groups.length === 0}
            className="btn-secondary"
            title="Remove all leaders from all groups in this round"
          >
            <Crown className="h-4 w-4" />
            Clear All Leaders
          </button>
          <button
            onClick={() => { setShowGenForm(true); setError(null); }}
            disabled={!selectedRoundId || !isDraftRound}
            className="btn-secondary"
            title={!isDraftRound ? 'Only draft rounds can be generated' : ''}
          >
            <Sparkles className="h-4 w-4" />
            Generate Groups
          </button>
          <button
            onClick={openAddGroup}
            disabled={!selectedRoundId || !isDraftRound}
            className="btn-primary"
            title={!isDraftRound ? 'Only draft rounds can be edited' : ''}
          >
            <Plus className="h-4 w-4" />
            Add Group
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>
      )}

      {/* Round selector + publish controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label-text">Project Round</label>
          <select
            className="input-field max-w-xs"
            value={selectedRoundId ?? ''}
            onChange={(e) => setSelectedRoundId(e.target.value)}
          >
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({ROUND_STATUS_LABELS[r.status]})
              </option>
            ))}
          </select>
        </div>
        {selectedRound && (
          <div className="flex items-center gap-2">
            <span className={`badge ${STATUS_COLORS[selectedRound.status]}`}>
              {ROUND_STATUS_LABELS[selectedRound.status]}
            </span>
            {isDraftRound && groups.length > 0 && (
              <button onClick={handlePublishRound} className="btn-primary">
                <Eye className="h-4 w-4" />
                Publish
              </button>
            )}
            {isPublishedRound && (
              <button onClick={handleUnpublishRound} className="btn-secondary">
                <EyeOff className="h-4 w-4" />
                Unpublish
              </button>
            )}
          </div>
        )}
      </div>

      {!selectedRoundId && (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">Create a project round first to manage groups.</p>
        </div>
      )}

      {loading && <p className="text-sm text-slate-500">Loading groups...</p>}

      {!loading && groups.length === 0 && selectedRoundId && (
        <div className="card p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-600">
            No project groups yet. Click "Generate Groups" to automatically create balanced groups,
            or "Add Group" to create one manually.
          </p>
        </div>
      )}

      {/* Groups grouped by level */}
      {!loading && groups.length > 0 && (
        <div className="space-y-6">
          {LEVEL_ORDER.map((level) => {
            const levelGroups = groupsByLevel[level];
            if (levelGroups.length === 0) return null;
            return (
              <div key={level}>
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
                    {LEVEL_LABELS[level]}
                  </h2>
                  <span className="text-xs text-slate-400">
                    {levelGroups.length} group{levelGroups.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-3">
                  {levelGroups.map((g) => {
                    const stats = calcStats(g.members.map((m) => m.fellow));
                    const leader = g.members.find((m) => m.is_leader);
                    return (
                      <div key={g.id} className="card">
                        <div className="flex items-center justify-between p-4">
                          <button
                            onClick={() => setExpandedGroup(expandedGroup === g.id ? null : g.id)}
                            className="flex items-center gap-2 text-left"
                          >
                            {expandedGroup === g.id ? (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            )}
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
                              {g.group_number}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{g.name}</p>
                              <p className="text-xs text-slate-500">
                                {stats.count} member{stats.count !== 1 ? 's' : ''}
                                {` · avg lessons: ${stats.avgLessons} · avg ranking: ${stats.avgRanking}`}
                                {leader ? ` · Leader: ${leader.fellow.first_name} ${leader.fellow.last_name}` : ' · No leader'}
                                {g.project?.title ? ` · ${g.project.title}` : ''}
                              </p>
                            </div>
                          </button>
                          <div className="flex gap-1">
                            <button
                              onClick={() => openProjectForm(g.id, g.project)}
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                              title="Edit Project"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            {isDraftRound && (
                              <>
                                <button
                                  onClick={() => openEditGroup(g)}
                                  className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteGroup(g)}
                                  className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {expandedGroup === g.id && (
                          <div className="border-t border-slate-100 p-4">
                            {/* Stats */}
                            <div className="mb-3 grid grid-cols-3 gap-2">
                              <div className="rounded-md bg-slate-50 p-2 text-center">
                                <p className="text-xs text-slate-500">Members</p>
                                <p className="text-sm font-semibold text-slate-900">{stats.count}</p>
                              </div>
                              <div className="rounded-md bg-slate-50 p-2 text-center">
                                <p className="text-xs text-slate-500">Avg Lessons</p>
                                <p className="text-sm font-semibold text-slate-900">{stats.avgLessons}</p>
                              </div>
                              <div className="rounded-md bg-slate-50 p-2 text-center">
                                <p className="text-xs text-slate-500">Avg Ranking</p>
                                <p className="text-sm font-semibold text-slate-900">{stats.avgRanking}</p>
                              </div>
                            </div>

                            {/* Current leader */}
                            {leader && (
                              <div className="mb-3 rounded-md bg-brand-50 p-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
                                  Current Leader
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                  <Crown className="h-4 w-4 text-brand-600" />
                                  <span className="text-sm font-semibold text-slate-900">
                                    {leader.fellow.first_name} {leader.fellow.last_name}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Members list */}
                            <div className="mb-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                                Members ({g.members.length})
                              </h4>
                            </div>

                            <div className="space-y-2">
                              {g.members.map((m) => (
                                <div
                                  key={m.id}
                                  className="flex flex-col gap-2 rounded-md bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-700">
                                      {m.fellow.first_name} {m.fellow.last_name}
                                    </span>
                                    {m.is_leader && (
                                      <span className="badge bg-brand-50 text-brand-700">
                                        <Crown className="mr-1 h-3 w-3" />
                                        Leader
                                      </span>
                                    )}
                                    <span className="text-xs text-slate-400">
                                      · R{m.fellow.ranking} · L{m.fellow.lessons_completed}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {!m.is_leader && (
                                      <button
                                        onClick={() => handleSetLeader(m.id, g.id, `${m.fellow.first_name} ${m.fellow.last_name}`)}
                                        className="text-xs font-medium text-brand-600 hover:underline"
                                      >
                                        Set as Group Leader
                                      </button>
                                    )}
                                    {isDraftRound && (
                                      <>
                                        <button
                                          onClick={() => openMoveDialog(m.id)}
                                          className="text-xs font-medium text-slate-600 hover:text-brand-600"
                                        >
                                          <ArrowRightLeft className="h-3.5 w-3.5 inline mr-0.5" />
                                          Move
                                        </button>
                                        <button
                                          onClick={() => handleRemoveMember(m.id)}
                                          className="rounded p-1 text-slate-400 hover:text-red-600"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {g.members.length === 0 && (
                                <p className="text-sm text-slate-500">No members yet.</p>
                              )}
                            </div>

                            {/* Add member (draft only) */}
                            {isDraftRound && availableFellows(g.id).length > 0 && (
                              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
                                <div className="flex-1 min-w-[180px]">
                                  <label className="label-text">Add Member</label>
                                  <select
                                    className="input-field"
                                    value={addMemberFellowId}
                                    onChange={(e) => setAddMemberFellowId(e.target.value)}
                                  >
                                    <option value="">Select fellow...</option>
                                    {availableFellows(g.id).map((f) => (
                                      <option key={f.id} value={f.id}>
                                        {f.first_name} {f.last_name} ({LEVEL_LABELS[f.level]})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <label className="flex items-center gap-2 text-sm text-slate-700 pb-2.5">
                                  <input
                                    type="checkbox"
                                    checked={addMemberIsLeader}
                                    onChange={(e) => setAddMemberIsLeader(e.target.checked)}
                                    className="rounded border-slate-300"
                                  />
                                  Leader
                                </label>
                                <button
                                  onClick={() => handleAddMember(g.id)}
                                  disabled={!addMemberFellowId}
                                  className="btn-primary"
                                >
                                  <Plus className="h-4 w-4" />
                                  Add
                                </button>
                              </div>
                            )}

                            {/* Project info */}
                            {g.project && (
                              <div className="mt-4 rounded-md border border-slate-200 p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Project
                                  </h4>
                                  <span className="badge bg-blue-50 text-blue-700">
                                    {PROJECT_STATUS_LABELS[g.project.status]}
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {g.project.title || 'Untitled'}
                                </p>
                                {g.project.description && (
                                  <p className="mt-1 text-sm text-slate-600">{g.project.description}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate Groups Modal */}
      {showGenForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Generate Groups</h2>
              <button onClick={() => setShowGenForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-text">Target Group Size</label>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-medium ${
                      genTargetSize === 5
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => setGenTargetSize(5)}
                  >
                    5 per group
                  </button>
                  <button
                    className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-medium ${
                      genTargetSize === 6
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => setGenTargetSize(6)}
                  >
                    6 per group
                  </button>
                </div>
              </div>
              <div>
                <label className="label-text">Scope</label>
                <select
                  className="input-field"
                  value={genLevel}
                  onChange={(e) => setGenLevel(e.target.value as FellowLevel | 'ALL')}
                >
                  <option value="ALL">All Levels</option>
                  {LEVEL_ORDER.map((l) => (
                    <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                  ))}
                </select>
              </div>
              <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
                This will replace existing groups in the selected scope.
                Groups are generated with balanced + random distribution.
                You can review and adjust before publishing.
              </div>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowGenForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="btn-primary"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move Member Modal */}
      {moveMemberId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Move Fellow</h2>
              <button onClick={() => setMoveMemberId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {(() => {
              const sourceGroup = groups.find((g) => g.members.some((m) => m.id === moveMemberId));
              const member = sourceGroup?.members.find((m) => m.id === moveMemberId);
              if (!sourceGroup || !member) return null;
              const targets = moveTargetGroups(sourceGroup.id, sourceGroup.level);
              return (
                <div className="space-y-4">
                  <div className="rounded-md bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Moving</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {member.fellow.first_name} {member.fellow.last_name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      From: {sourceGroup.name}
                    </p>
                  </div>
                  {targets.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No other groups in this level to move to. Create another group first.
                    </p>
                  ) : (
                    <div>
                      <label className="label-text">Move To</label>
                      <select
                        className="input-field"
                        value={moveTargetGroupId}
                        onChange={(e) => setMoveTargetGroupId(e.target.value)}
                      >
                        <option value="">Select group...</option>
                        {targets.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.members.length} members)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setMoveMemberId(null)} className="btn-secondary">
                      Cancel
                    </button>
                    <button
                      onClick={handleMoveMember}
                      disabled={!moveTargetGroupId}
                      className="btn-primary"
                    >
                      Move Fellow
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Group form modal */}
      {showGroupForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingGroup ? 'Edit Group' : 'Add Group'}
              </h2>
              <button onClick={() => setShowGroupForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleGroupSubmit} className="space-y-4">
              <div>
                <label className="label-text">Level</label>
                <select
                  className="input-field"
                  value={groupForm.level}
                  onChange={(e) => setGroupForm({ ...groupForm, level: e.target.value as FellowLevel })}
                >
                  {LEVEL_ORDER.map((l) => (
                    <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">Group Number</label>
                <input
                  type="number"
                  min={1}
                  required
                  className="input-field"
                  value={groupForm.group_number}
                  onChange={(e) => setGroupForm({ ...groupForm, group_number: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="label-text">Name (optional — auto-generated if blank)</label>
                <input
                  className="input-field"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder={`${LEVEL_LABELS[groupForm.level]} — Group ${groupForm.group_number}`}
                />
              </div>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowGroupForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={savingGroup} className="btn-primary">
                  {savingGroup ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project form modal */}
      {showProjectForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Edit Project</h2>
              <button
                onClick={() => setShowProjectForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleProjectSubmit} className="space-y-4">
              <div>
                <label className="label-text">Project Topic</label>
                <input
                  className="input-field"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  placeholder="e.g. Student Management System"
                />
              </div>
              <div>
                <label className="label-text">Description</label>
                <textarea
                  className="input-field min-h-[100px]"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="label-text">Status</label>
                <select
                  className="input-field"
                  value={projectForm.status}
                  onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value as ProjectStatus })}
                >
                  <option value="NOT_SUBMITTED">Not Submitted</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="APPROVED">Approved</option>
                  <option value="NEEDS_REVISION">Needs Revision</option>
                </select>
              </div>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowProjectForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={savingProject} className="btn-primary">
                  {savingProject ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


