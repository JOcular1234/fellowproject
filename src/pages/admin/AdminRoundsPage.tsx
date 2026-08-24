import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Layers } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  ROUND_STATUS_LABELS,
  type ProjectRound,
  type ProjectRoundStatus,
} from '@/lib/types';

type RoundInput = {
  name: string;
  description: string;
  status: ProjectRoundStatus;
};

const EMPTY: RoundInput = {
  name: '',
  description: '',
  status: 'DRAFT',
};

const STATUS_COLORS: Record<ProjectRoundStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PUBLISHED: 'bg-green-50 text-green-700',
  ARCHIVED: 'bg-amber-50 text-amber-700',
};

export function AdminRoundsPage() {
  const [rounds, setRounds] = useState<ProjectRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProjectRound | null>(null);
  const [form, setForm] = useState<RoundInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_rounds')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setRounds(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setShowForm(true);
  };

  const openEdit = (r: ProjectRound) => {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description ?? '',
      status: r.status,
    });
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      published_at: form.status === 'PUBLISHED' && !editing?.published_at ? new Date().toISOString() : editing?.published_at ?? null,
    };

    if (editing) {
      const { error: updateError } = await supabase
        .from('project_rounds')
        .update(payload)
        .eq('id', editing.id);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase.from('project_rounds').insert(payload);
      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }
    }

    setShowForm(false);
    setSaving(false);
    load();
  };

  const handleDelete = async (r: ProjectRound) => {
    if (!confirm(`Delete "${r.name}"? This will also delete all groups, members, and projects in this round.`)) return;
    const { error: delError } = await supabase.from('project_rounds').delete().eq('id', r.id);
    if (delError) {
      setError(delError.message);
      return;
    }
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Project Rounds</h1>
          <p className="text-sm text-slate-500">{rounds.length} total</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Round
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : rounds.length === 0 ? (
        <div className="card p-8 text-center">
          <Layers className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-600">No project rounds yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rounds.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{r.name}</h3>
                    <span className={`badge ${STATUS_COLORS[r.status]}`}>
                      {ROUND_STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  {r.description && (
                    <p className="mt-1 text-sm text-slate-600">{r.description}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    Created {new Date(r.created_at).toLocaleDateString()}
                    {r.published_at && ` · Published ${new Date(r.published_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEdit(r)}
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editing ? 'Edit Round' : 'Add Round'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-text">Name</label>
                <input
                  required
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Python Capstone — Round 1"
                />
              </div>
              <div>
                <label className="label-text">Description</label>
                <textarea
                  className="input-field min-h-[80px]"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className="label-text">Status</label>
                <select
                  className="input-field"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ProjectRoundStatus })}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
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
