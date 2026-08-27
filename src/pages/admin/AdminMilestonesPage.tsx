import { useEffect, useState, useCallback } from 'react';
import {
  Calendar, Plus, X, Edit3, Trash2, CheckCircle2, Circle,
  AlertCircle, Clock, ChevronDown,
} from 'lucide-react';
import {
  fetchMilestonesForRound,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from '@/lib/queries';
import type { Milestone } from '@/lib/types';
import { supabase } from '@/lib/supabase';

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const toDatetimeLocal = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getDaysRemaining = (dueDate: string): number => {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

const getCountdownStr = (dueDate: string): string => {
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const absDiff = Math.abs(due - now);
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getOverdueStr = (dueDate: string): string => {
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const absDiff = Math.abs(due - now);
  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return 'Just now';
};

type MilestoneStatus = 'overdue' | 'due_soon' | 'upcoming' | 'completed';

function getMilestoneStatus(m: Milestone): MilestoneStatus {
  if (m.is_completed) return 'completed';
  const days = getDaysRemaining(m.due_date);
  if (days < 0) return 'overdue';
  if (days <= 3) return 'due_soon';
  return 'upcoming';
}

function MilestoneCard({ 
  m, 
  onEdit, 
  onToggleComplete, 
  onDelete 
}: { 
  m: Milestone; 
  onEdit: (m: Milestone) => void;
  onToggleComplete: (m: Milestone) => void;
  onDelete: (id: string) => void;
}) {
  const status = getMilestoneStatus(m);
  const days = getDaysRemaining(m.due_date);

  const statusConfig = {
    overdue: {
      accent: 'border-l-red-600 bg-red-50',
      badge: 'bg-red-100 text-red-700',
      icon: AlertCircle,
      label: `Overdue by ${getOverdueStr(m.due_date)}`,
    },
    due_soon: {
      accent: 'border-l-amber-600 bg-amber-50',
      badge: 'bg-amber-100 text-amber-700',
      icon: Clock,
      label: days === 0 ? 'Due today' : `${getCountdownStr(m.due_date)} left`,
    },
    upcoming: {
      accent: 'border-l-slate-300 bg-slate-50',
      badge: 'bg-slate-100 text-slate-700',
      icon: Calendar,
      label: `${getCountdownStr(m.due_date)} left`,
    },
    completed: {
      accent: 'border-l-green-600 bg-green-50',
      badge: 'bg-green-100 text-green-700',
      icon: CheckCircle2,
      label: 'Completed',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className={`border-l-4 rounded-lg p-4 transition-all hover:shadow-sm ${config.accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-semibold text-slate-900 ${m.is_completed ? 'line-through text-slate-500' : ''}`}>
              {m.title}
            </h3>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${config.badge}`}>
              <StatusIcon className="h-3 w-3" />
              {config.label}
            </span>
          </div>
          
          {m.description && (
            <p className="mt-2 text-sm text-slate-600">{m.description}</p>
          )}
          
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <span>Due: {formatDateTime(m.due_date)}</span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onToggleComplete(m)}
            title={m.is_completed ? 'Mark as incomplete' : 'Mark as complete'}
            className={`rounded-md p-2 transition-colors ${
              m.is_completed
                ? 'text-green-600 hover:bg-green-100'
                : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'
            }`}
          >
            {m.is_completed ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => onEdit(m)}
            title="Edit"
            className="rounded-md p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(m.id)}
            title="Delete"
            className="rounded-md p-2 text-slate-400 hover:bg-red-100 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusSection({
  status,
  label,
  count,
  milestones,
  onEdit,
  onToggleComplete,
  onDelete,
  defaultOpen = true,
}: {
  status: MilestoneStatus;
  label: string;
  count: number;
  milestones: Milestone[];
  onEdit: (m: Milestone) => void;
  onToggleComplete: (m: Milestone) => void;
  onDelete: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (count === 0) return null;

  const iconConfig = {
    overdue: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
    due_soon: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
    upcoming: { icon: Calendar, color: 'text-slate-600', bg: 'bg-slate-100' },
    completed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
  };

  const Icon = iconConfig[status].icon;

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors mb-3"
      >
        <div className={`p-2 rounded-md ${iconConfig[status].bg}`}>
          <Icon className={`h-4 w-4 ${iconConfig[status].color}`} />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-sm text-slate-900">{label}</h3>
          <p className="text-xs text-slate-500">{count} milestone{count !== 1 ? 's' : ''}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="space-y-3 mb-6">
          {milestones.map((m) => (
            <MilestoneCard
              key={m.id}
              m={m}
              onEdit={onEdit}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminMilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
        setMilestones([]);
        return;
      }
      setRoundId(round.id);
      const data = await fetchMilestonesForRound(round.id);
      setMilestones(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load milestones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (m: Milestone) => {
    setTitle(m.title);
    setDescription(m.description || '');
    setDueDate(toDatetimeLocal(m.due_date));
    setEditingId(m.id);
    setShowForm(true);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      setError('Title and due date are required.');
      return;
    }
    if (!roundId && !editingId) {
      setError('No active project round.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const isoDueDate = new Date(dueDate).toISOString();

    try {
      if (editingId) {
        await updateMilestone(editingId, {
          title: title.trim(),
          description: description.trim() || null,
          due_date: isoDueDate,
        });
        setSuccess('Milestone updated.');
      } else {
        await createMilestone(roundId!, title.trim(), description.trim() || null, isoDueDate);
        setSuccess('Milestone created.');
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save milestone.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (m: Milestone) => {
    try {
      await updateMilestone(m.id, { is_completed: !m.is_completed });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update milestone.');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteMilestone(confirmDelete);
      setSuccess('Milestone deleted.');
      setConfirmDelete(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete milestone.');
    }
  };

  // Group milestones by status
  const overdue = milestones.filter((m) => getMilestoneStatus(m) === 'overdue');
  const dueSoon = milestones.filter((m) => getMilestoneStatus(m) === 'due_soon');
  const upcoming = milestones.filter((m) => getMilestoneStatus(m) === 'upcoming');
  const completed = milestones.filter((m) => getMilestoneStatus(m) === 'completed');

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Project Milestones</h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage deadlines for the current round. Fellows see countdowns on the public site.
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shrink-0"
            >
              <Plus className="h-4 w-4" />
              New Milestone
            </button>
          )}
        </div>

        {/* Stats overview */}
        {!loading && milestones.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {overdue.length > 0 && (
              <div className="rounded-lg bg-red-50 px-4 py-3 border border-red-100">
                <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
                <p className="text-xs text-red-700 font-medium">Overdue</p>
              </div>
            )}
            {dueSoon.length > 0 && (
              <div className="rounded-lg bg-amber-50 px-4 py-3 border border-amber-100">
                <p className="text-2xl font-bold text-amber-600">{dueSoon.length}</p>
                <p className="text-xs text-amber-700 font-medium">Due Soon</p>
              </div>
            )}
            <div className="rounded-lg bg-slate-50 px-4 py-3 border border-slate-200">
              <p className="text-2xl font-bold text-slate-900">{upcoming.length}</p>
              <p className="text-xs text-slate-700 font-medium">Upcoming</p>
            </div>
            <div className="rounded-lg bg-green-50 px-4 py-3 border border-green-100">
              <p className="text-2xl font-bold text-green-600">{completed.length}</p>
              <p className="text-xs text-green-700 font-medium">Completed</p>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-700 hover:text-green-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm mb-6" onClick={resetForm}>
          <div className="w-full max-w-lg card border border-slate-200 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? 'Edit Milestone' : 'Create Milestone'}
              </h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Milestone Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Topic Selection Deadline"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                  maxLength={200}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What should fellows know about this deadline?"
                  rows={3}
                  maxLength={200}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 resize-vertical"
                />
                <p className="mt-1 text-xs text-slate-500">{description.length}/200</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Due Date & Time</label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !title.trim() || !dueDate}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Milestones List */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="inline-block">
            <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-brand-600 animate-spin" />
          </div>
          <p className="mt-4 text-sm text-slate-600">Loading milestones...</p>
        </div>
      ) : milestones.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-900 mb-1">No milestones yet</h3>
          <p className="text-sm text-slate-600 mb-4">Create your first milestone to set deadlines for fellows.</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Milestone
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Overdue */}
          <StatusSection
            status="overdue"
            label="Overdue"
            count={overdue.length}
            milestones={overdue.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())}
            onEdit={handleEdit}
            onToggleComplete={handleToggleComplete}
            onDelete={(id) => setConfirmDelete(id)}
            defaultOpen={true}
          />

          {/* Due Soon */}
          <StatusSection
            status="due_soon"
            label="Due Soon"
            count={dueSoon.length}
            milestones={dueSoon.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())}
            onEdit={handleEdit}
            onToggleComplete={handleToggleComplete}
            onDelete={(id) => setConfirmDelete(id)}
            defaultOpen={true}
          />

          {/* Upcoming */}
          <StatusSection
            status="upcoming"
            label="Upcoming"
            count={upcoming.length}
            milestones={upcoming.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())}
            onEdit={handleEdit}
            onToggleComplete={handleToggleComplete}
            onDelete={(id) => setConfirmDelete(id)}
            defaultOpen={false}
          />

          {/* Completed */}
          <StatusSection
            status="completed"
            label="Completed"
            count={completed.length}
            milestones={completed.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())}
            onEdit={handleEdit}
            onToggleComplete={handleToggleComplete}
            onDelete={(id) => setConfirmDelete(id)}
            defaultOpen={false}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm card border border-slate-200 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Delete milestone?</h3>
                <p className="mt-1 text-sm text-slate-600">This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors"
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