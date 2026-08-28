import { useEffect, useState } from 'react';
import { FileText, X, Search, FileEdit, Star, Eye, EyeOff, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  LEVEL_LABELS,
  PROJECT_STATUS_LABELS,
  type FellowLevel,
  type Project,
  type ProjectStatus,
  type ProjectGroup,
  type ProjectShowcase,
} from '@/lib/types';
import { fetchShowcaseForAdmin, upsertShowcase, deleteShowcase, fetchAssignedGroups, assignGroupToProject, unassignGroupFromProject } from '@/lib/queries';

interface ProjectRow {
  group: ProjectGroup;
  project: Project | null;
  leaderName: string | null;
  memberCount: number;
  showcase: ProjectShowcase | null;
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  NOT_SUBMITTED: 'bg-slate-100 text-slate-600',
  SUBMITTED: 'bg-blue-50 text-blue-700',
  APPROVED: 'bg-green-50 text-green-700',
  NEEDS_REVISION: 'bg-amber-50 text-amber-700',
};

export function AdminProjectsPage() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');

  // Project form
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProjectRow | null>(null);
  const [form, setForm] = useState({ title: '', description: '', status: 'NOT_SUBMITTED' as ProjectStatus });
  const [saving, setSaving] = useState(false);

  // Showcase form
  const [showShowcaseForm, setShowShowcaseForm] = useState(false);
  const [showcaseEditing, setShowcaseEditing] = useState<ProjectRow | null>(null);
  const [showcaseForm, setShowcaseForm] = useState({
    problem_statement: '',
    solution: '',
    technologies: '',
    screenshots: '',
    github_url: '',
    demo_url: '',
    is_published: false,
    is_featured: false,
  });
  const [showcaseSaving, setShowcaseSaving] = useState(false);

  // Showcase delete
  const [confirmDeleteShowcase, setConfirmDeleteShowcase] = useState<ProjectRow | null>(null);

  // Group assignments
  const [assignedGroupIds, setAssignedGroupIds] = useState<string[]>([]);
  const [allGroups, setAllGroups] = useState<{ id: string; name: string; level: FellowLevel }[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data: groups, error: gErr } = await supabase
      .from('project_groups')
      .select('*, project_round: project_rounds!inner(id, name, status)')
      .order('level', { ascending: true })
      .order('group_number', { ascending: true });

    if (gErr) {
      setError(gErr.message);
      setLoading(false);
      return;
    }

    const groupIds = (groups || []).map((g) => g.id);
    if (groupIds.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const [membersRes, projectsRes] = await Promise.all([
      supabase
        .from('group_members')
        .select('is_leader, project_group_id, fellow: fellows!group_members_fellow_id_fkey(first_name, last_name)')
        .in('project_group_id', groupIds),
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

    const allMembers = (membersRes.data || []) as unknown as {
      is_leader: boolean;
      project_group_id: string;
      fellow: { first_name: string; last_name: string };
    }[];

    const leaderByGroup = new Map<string, string | null>();
    const countByGroup = new Map<string, number>();
    for (const m of allMembers) {
      const count = countByGroup.get(m.project_group_id) ?? 0;
      countByGroup.set(m.project_group_id, count + 1);
      if (m.is_leader) {
        leaderByGroup.set(m.project_group_id, `${m.fellow.first_name} ${m.fellow.last_name}`);
      }
    }

    const projectByGroup = new Map<string, Project>();
    for (const p of projectsRes.data || []) {
      projectByGroup.set(p.project_group_id, p);
    }

    // Fetch showcases
    const projectIds = Array.from(projectByGroup.values()).map((p) => p.id);
    const showcaseMap = new Map<string, ProjectShowcase>();
    if (projectIds.length > 0) {
      const { data: showcases, error: scErr } = await supabase
        .from('project_showcases')
        .select('*')
        .in('project_id', projectIds);
      if (scErr) {
        console.error('Showcase fetch error:', scErr.message);
      }
      for (const sc of (showcases ?? []) as ProjectShowcase[]) {
        showcaseMap.set(sc.project_id, sc);
      }
    }

    const enriched: ProjectRow[] = (groups || []).map((g) => ({
      group: g,
      project: projectByGroup.get(g.id) ?? null,
      leaderName: leaderByGroup.get(g.id) ?? null,
      memberCount: countByGroup.get(g.id) ?? 0,
      showcase: (projectByGroup.get(g.id) && showcaseMap.get(projectByGroup.get(g.id)!.id)) ?? null,
    }));
    setRows(enriched);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const hay = `${r.group.name} ${r.leaderName ?? ''} ${r.project?.title ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (statusFilter !== 'ALL') {
      const status = r.project?.status ?? 'NOT_SUBMITTED';
      if (status !== statusFilter) return false;
    }
    return true;
  });

  const openShowcaseForm = async (row: ProjectRow) => {
    if (!row.project) return;
    setShowcaseEditing(row);
    setError(null);
    try {
      const existing = await fetchShowcaseForAdmin(row.project.id);
      setShowcaseForm({
        problem_statement: existing?.problem_statement ?? '',
        solution: existing?.solution ?? '',
        technologies: existing?.technologies.join(', ') ?? '',
        screenshots: existing?.screenshots.join('\n') ?? '',
        github_url: existing?.github_url ?? '',
        demo_url: existing?.demo_url ?? '',
        is_published: existing?.is_published ?? false,
        is_featured: existing?.is_featured ?? false,
      });
      const assigned = await fetchAssignedGroups(row.project.id);
      setAssignedGroupIds(assigned);
    } catch {
      setShowcaseForm({
        problem_statement: '',
        solution: '',
        technologies: '',
        screenshots: '',
        github_url: '',
        demo_url: '',
        is_published: false,
        is_featured: false,
      });
      setAssignedGroupIds([]);
    }
    // Load all groups for assignment dropdown
    const { data: groups } = await supabase
      .from('project_groups')
      .select('id, name, level')
      .neq('id', row.group.id)
      .order('level', { ascending: true })
      .order('group_number', { ascending: true });
    setAllGroups((groups ?? []) as { id: string; name: string; level: FellowLevel }[]);
    setShowShowcaseForm(true);
  };

  const handleShowcaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showcaseEditing?.project) return;
    setShowcaseSaving(true);
    setError(null);
    try {
      await upsertShowcase(showcaseEditing.project.id, {
        problem_statement: showcaseForm.problem_statement.trim() || null,
        solution: showcaseForm.solution.trim() || null,
        technologies: showcaseForm.technologies.split(',').map((t) => t.trim()).filter(Boolean),
        screenshots: showcaseForm.screenshots.split('\n').map((s) => s.trim()).filter(Boolean),
        github_url: showcaseForm.github_url.trim() || null,
        demo_url: showcaseForm.demo_url.trim() || null,
        is_published: showcaseForm.is_published,
        is_featured: showcaseForm.is_featured,
      });
      setShowShowcaseForm(false);
      load();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save showcase');
    } finally {
      setShowcaseSaving(false);
    }
  };

  const toggleGroupAssignment = async (groupId: string) => {
    if (!showcaseEditing?.project) return;
    setError(null);
    try {
      if (assignedGroupIds.includes(groupId)) {
        await unassignGroupFromProject(showcaseEditing.project.id, groupId);
        setAssignedGroupIds(assignedGroupIds.filter((id) => id !== groupId));
      } else {
        await assignGroupToProject(showcaseEditing.project.id, groupId);
        setAssignedGroupIds([...assignedGroupIds, groupId]);
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to update group assignment');
    }
  };

  const handleDeleteShowcase = async () => {
    if (!confirmDeleteShowcase?.project) return;
    setError(null);
    try {
      await deleteShowcase(confirmDeleteShowcase.project.id);
      setConfirmDeleteShowcase(null);
      load();
    } catch (err: any) {
      setError(err.message ?? 'Failed to delete showcase');
    }
  };

  const openForm = (row: ProjectRow) => {
    setEditingGroup(row);
    setForm({
      title: row.project?.title ?? '',
      description: row.project?.description ?? '',
      status: row.project?.status ?? 'NOT_SUBMITTED',
    });
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    setSaving(true);
    setError(null);

    const existing = editingGroup.project;
    const payload = {
      project_group_id: editingGroup.group.id,
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      status: form.status,
      submitted_at:
        form.status !== 'NOT_SUBMITTED' && !existing?.submitted_at
          ? new Date().toISOString()
          : existing?.submitted_at ?? null,
    };

    let hadError = false;
    if (existing) {
      const { error: uErr } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', existing.id);
      if (uErr) { setError(uErr.message); hadError = true; }
    } else {
      const { error: iErr } = await supabase.from('projects').insert(payload);
      if (iErr) { setError(iErr.message); hadError = true; }
    }

    if (!hadError) {
      setShowForm(false);
      setEditingGroup(null);
      load();
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Projects</h1>
        <p className="text-sm text-slate-500">
          Manage project topics and status for each group.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups or topics..."
            className="input-field pl-10"
          />
        </div>
        <select
          className="input-field max-w-[180px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'ALL')}
        >
          <option value="ALL">All Statuses</option>
          <option value="NOT_SUBMITTED">Not Submitted</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="NEEDS_REVISION">Needs Revision</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading projects...</p>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-600">No project groups found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Group</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Level</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Leader</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Project Topic</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Showcase</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const status = r.project?.status ?? 'NOT_SUBMITTED';
                  return (
                    <tr key={r.group.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {r.group.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {LEVEL_LABELS[r.group.level as FellowLevel]}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.leaderName ?? <span className="text-slate-400 italic">No leader</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.project?.title ?? (
                          <span className="text-slate-400 italic">No topic yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${STATUS_COLORS[status]}`}>
                          {PROJECT_STATUS_LABELS[status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.showcase ? (
                          <div className="flex items-center gap-1.5">
                            {r.showcase.is_published ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                <Eye className="h-3 w-3" />
                                Published
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                                <EyeOff className="h-3 w-3" />
                                Draft
                              </span>
                            )}
                            {r.showcase.is_featured && (
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openForm(r)}
                            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50"
                          >
                            <FileEdit className="h-3.5 w-3.5" />
                            {r.project ? 'Edit' : 'Add Topic'}
                          </button>
                          {r.project && (
                            <button
                              onClick={() => openShowcaseForm(r)}
                              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50"
                            >
                              <Star className="h-3.5 w-3.5" />
                              Showcase
                            </button>
                          )}
                          {r.showcase && (
                            <button
                              onClick={() => setConfirmDeleteShowcase(r)}
                              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Project</h2>
                <p className="text-xs text-slate-500">{editingGroup.group.name}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-text">Project Topic</label>
                <input
                  className="input-field"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Student Management System"
                />
              </div>
              <div>
                <label className="label-text">Project Description</label>
                <textarea
                  className="input-field min-h-[100px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the project..."
                />
              </div>
              <div>
                <label className="label-text">Status</label>
                <select
                  className="input-field"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
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
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showShowcaseForm && showcaseEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Project Showcase</h2>
                <p className="text-xs text-slate-500">{showcaseEditing.group.name} · {showcaseEditing.project?.title ?? 'Untitled'}</p>
              </div>
              <button onClick={() => setShowShowcaseForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleShowcaseSubmit} className="space-y-4">
              <div>
                <label className="label-text">Problem Statement</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={showcaseForm.problem_statement}
                  onChange={(e) => setShowcaseForm({ ...showcaseForm, problem_statement: e.target.value })}
                  placeholder="What problem does this project solve?"
                />
              </div>
              <div>
                <label className="label-text">Solution</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={showcaseForm.solution}
                  onChange={(e) => setShowcaseForm({ ...showcaseForm, solution: e.target.value })}
                  placeholder="How does the project solve it?"
                />
              </div>
              <div>
                <label className="label-text">Technologies (comma-separated)</label>
                <input
                  className="input-field"
                  value={showcaseForm.technologies}
                  onChange={(e) => setShowcaseForm({ ...showcaseForm, technologies: e.target.value })}
                  placeholder="Python, Flask, PostgreSQL"
                />
              </div>
              <div>
                <label className="label-text">Screenshot URLs (one per line)</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={showcaseForm.screenshots}
                  onChange={(e) => setShowcaseForm({ ...showcaseForm, screenshots: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text">GitHub URL</label>
                  <input
                    className="input-field"
                    value={showcaseForm.github_url}
                    onChange={(e) => setShowcaseForm({ ...showcaseForm, github_url: e.target.value })}
                    placeholder="https://github.com/..."
                  />
                </div>
                <div>
                  <label className="label-text">Live Demo URL</label>
                  <input
                    className="input-field"
                    value={showcaseForm.demo_url}
                    onChange={(e) => setShowcaseForm({ ...showcaseForm, demo_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={showcaseForm.is_published}
                    onChange={(e) => setShowcaseForm({ ...showcaseForm, is_published: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600"
                  />
                  Published
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={showcaseForm.is_featured}
                    onChange={(e) => setShowcaseForm({ ...showcaseForm, is_featured: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-amber-500"
                  />
                  Featured
                </label>
              </div>

              {/* Collaborating groups */}
              <div>
                <label className="label-text">Collaborating Groups</label>
                <p className="mb-2 text-xs text-slate-500">
                  Primary group: <span className="font-medium text-slate-700">{showcaseEditing.group.name}</span>. Select additional groups working on this project.
                </p>
                <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100">
                  {allGroups.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400">No other groups available.</p>
                  ) : allGroups.map((g) => (
                    <label key={g.id} className="flex items-center gap-2 p-2.5 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignedGroupIds.includes(g.id)}
                        onChange={() => toggleGroupAssignment(g.id)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      />
                      <span className="text-sm text-slate-700">{g.name}</span>
                      <span className="text-xs text-slate-400">{LEVEL_LABELS[g.level]}</span>
                    </label>
                  ))}
                </div>
              </div>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowShowcaseForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={showcaseSaving} className="btn-primary">
                  {showcaseSaving ? 'Saving...' : 'Save Showcase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete showcase confirmation */}
      {confirmDeleteShowcase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm card p-6">
            <div className="flex gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Delete showcase?</h3>
                <p className="mt-1 text-sm text-slate-600">
                  This will remove the showcase for <span className="font-medium">{confirmDeleteShowcase.group.name}</span>. The project itself will not be affected.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteShowcase(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteShowcase}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700"
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
