import { useEffect, useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, Search, ArrowUpDown, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LEVEL_LABELS, LEVEL_ORDER, type Fellow, type FellowLevel } from '@/lib/types';

type FellowInput = {
  first_name: string;
  last_name: string;
  email: string;
  level: FellowLevel;
  ranking: number;
  lessons_completed: number;
};

const EMPTY: FellowInput = {
  first_name: '',
  last_name: '',
  email: '',
  level: 'BEGINNER',
  ranking: 0,
  lessons_completed: 0,
};

interface FellowWithGroup extends Fellow {
  group_name: string | null;
  group_id: string | null;
  is_leader: boolean;
}

type SortKey = 'name' | 'ranking' | 'lessons';
type SortDir = 'asc' | 'desc';

export function AdminFellowsPage() {
  const [fellows, setFellows] = useState<FellowWithGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<FellowLevel | 'ALL'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('ranking');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Fellow | null>(null);
  const [form, setForm] = useState<FellowInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadFellows = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('fellows')
      .select('*')
      .order('ranking', { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const { data: memberships } = await supabase
      .from('group_members')
      .select('fellow_id, is_leader, project_group: project_groups!inner(id, name, project_round: project_rounds!inner(status))');

    const memberMap = new Map<string, { group_name: string; group_id: string; is_leader: boolean }>();
    (memberships || []).forEach((m: Record<string, unknown>) => {
      const pg = m.project_group as { id: string; name: string; project_round: { status: string } };
      if (pg?.project_round?.status === 'PUBLISHED') {
        memberMap.set(m.fellow_id as string, {
          group_name: pg.name,
          group_id: pg.id,
          is_leader: m.is_leader as boolean,
        });
      }
    });

    const enriched: FellowWithGroup[] = (data || []).map((f) => {
      const gm = memberMap.get(f.id);
      return {
        ...f,
        group_name: gm?.group_name ?? null,
        group_id: gm?.group_id ?? null,
        is_leader: gm?.is_leader ?? false,
      };
    });

    setFellows(enriched);
    setLoading(false);
  };

  useEffect(() => {
    loadFellows();
  }, []);

  const filtered = useMemo(() => {
    let result = [...fellows];

    if (levelFilter !== 'ALL') {
      result = result.filter((f) => f.level === levelFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((f) => {
        const full = `${f.first_name} ${f.last_name} ${f.email}`.toLowerCase();
        return full.includes(q);
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      } else if (sortKey === 'ranking') {
        cmp = a.ranking - b.ranking;
      } else if (sortKey === 'lessons') {
        cmp = a.lessons_completed - b.lessons_completed;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [fellows, search, levelFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (f: Fellow) => {
    setEditing(f);
    setForm({
      first_name: f.first_name,
      last_name: f.last_name,
      email: f.email,
      level: f.level,
      ranking: f.ranking,
      lessons_completed: f.lessons_completed,
    });
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (editing) {
      const { error: updateError } = await supabase
        .from('fellows')
        .update(form)
        .eq('id', editing.id);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from('fellows').insert(form);
      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    setShowForm(false);
    setSaving(false);
    loadFellows();
  };

  const handleDelete = async (f: Fellow) => {
    if (!confirm(`Remove ${f.first_name} ${f.last_name}? This will also remove them from any groups.`)) return;
    const { error: delError } = await supabase.from('fellows').delete().eq('id', f.id);
    if (delError) {
      setError(delError.message);
      return;
    }
    loadFellows();
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return 'text-slate-300';
    return sortDir === 'asc' ? 'text-brand-600' : 'text-brand-600 rotate-180';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Fellows</h1>
          <p className="text-sm text-slate-500">{fellows.length} total</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Fellow
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="input-field pl-10"
          />
        </div>
        <div>
          <select
            className="input-field"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as FellowLevel | 'ALL')}
          >
            <option value="ALL">All Levels</option>
            {LEVEL_ORDER.map((l) => (
              <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th
                    className="cursor-pointer select-none px-4 py-3 font-semibold text-slate-700"
                    onClick={() => toggleSort('name')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Fellow
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortIcon('name')}`} />
                    </span>
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 font-semibold text-slate-700"
                    onClick={() => toggleSort('ranking')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Ranking
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortIcon('ranking')}`} />
                    </span>
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 font-semibold text-slate-700"
                    onClick={() => toggleSort('lessons')}
                  >
                    <span className="inline-flex items-center gap-1">
                      Lessons
                      <ArrowUpDown className={`h-3.5 w-3.5 ${sortIcon('lessons')}`} />
                    </span>
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Level</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Group</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Leader</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {f.first_name} {f.last_name}
                      </div>
                      <div className="text-xs text-slate-400">{f.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{f.ranking}</td>
                    <td className="px-4 py-3 text-slate-600">{f.lessons_completed}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {LEVEL_LABELS[f.level]}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {f.group_name ?? <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      {f.is_leader ? (
                        <span className="badge bg-brand-50 text-brand-700">
                          <Crown className="mr-1 h-3 w-3" />
                          Leader
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => openEdit(f)}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(f)}
                          className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No fellows found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editing ? 'Edit Fellow' : 'Add Fellow'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text">First Name</label>
                  <input
                    required
                    className="input-field"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label-text">Last Name</label>
                  <input
                    required
                    className="input-field"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label-text">Email</label>
                <input
                  required
                  type="email"
                  className="input-field"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="label-text">Level</label>
                <select
                  className="input-field"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value as FellowLevel })}
                >
                  {LEVEL_ORDER.map((l) => (
                    <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-text">Ranking</label>
                  <input
                    type="number"
                    min={0}
                    className="input-field"
                    value={form.ranking}
                    onChange={(e) => setForm({ ...form, ranking: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="label-text">Lessons Completed</label>
                  <input
                    type="number"
                    min={0}
                    className="input-field"
                    value={form.lessons_completed}
                    onChange={(e) => setForm({ ...form, lessons_completed: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
