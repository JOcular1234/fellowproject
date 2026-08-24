import { useEffect, useState } from 'react';
import { FileText, X, Search, FileEdit } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  LEVEL_LABELS,
  PROJECT_STATUS_LABELS,
  type FellowLevel,
  type Project,
  type ProjectStatus,
  type ProjectGroup,
} from '@/lib/types';

interface ProjectRow {
  group: ProjectGroup;
  project: Project | null;
  leaderName: string | null;
  memberCount: number;
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

    const enriched: ProjectRow[] = (groups || []).map((g) => ({
      group: g,
      project: projectByGroup.get(g.id) ?? null,
      leaderName: leaderByGroup.get(g.id) ?? null,
      memberCount: countByGroup.get(g.id) ?? 0,
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
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openForm(r)}
                          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50"
                        >
                          <FileEdit className="h-3.5 w-3.5" />
                          {r.project ? 'Edit' : 'Add Topic'}
                        </button>
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
    </div>
  );
}
