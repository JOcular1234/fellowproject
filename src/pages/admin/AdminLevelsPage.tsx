import { useEffect, useState, useMemo } from 'react';
import { Search, Sparkles, Check, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  LEVEL_LABELS,
  LEVEL_ORDER,
  type Fellow,
  type FellowLevel,
} from '@/lib/types';
import { suggestLevel } from '@/lib/groupGen';

export function AdminLevelsPage() {
  const [fellows, setFellows] = useState<Fellow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<FellowLevel | 'ALL'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, FellowLevel>>({});
  const [suggesting, setSuggesting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  const loadFellows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fellows')
      .select('*')
      .order('ranking', { ascending: true });
    if (error) {
      setError(error.message);
    } else {
      setFellows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFellows();
  }, []);

  const filtered = useMemo(() => {
    let result = [...fellows];
    if (levelFilter !== 'ALL') {
      result = result.filter((f) => getEffectiveLevel(f) === levelFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((f) =>
        `${f.first_name} ${f.last_name}`.toLowerCase().includes(q)
      );
    }
    return result;
  }, [fellows, search, levelFilter, pendingChanges]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = useMemo(() =>
    filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, levelFilter]);

  const getEffectiveLevel = (f: Fellow): FellowLevel =>
    pendingChanges[f.id] ?? f.level;

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const handleLevelChange = (fellowId: string, level: FellowLevel) => {
    setPendingChanges((prev) => {
      const next = { ...prev };
      const original = fellows.find((f) => f.id === fellowId)?.level;
      if (original === level) {
        delete next[fellowId];
      } else {
        next[fellowId] = level;
      }
      return next;
    });
    setSuccess(null);
  };

  const handleSuggest = () => {
    setSuggesting(true);
    const changes: Record<string, FellowLevel> = {};
    fellows.forEach((f) => {
      const suggested = suggestLevel(f.lessons_completed);
      if (suggested !== f.level) {
        changes[f.id] = suggested;
      }
    });
    setPendingChanges(changes);
    setSuggesting(false);
    setSuccess(null);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    const entries = Object.entries(pendingChanges);
    const results = await Promise.all(
      entries.map(([fellowId, level]) =>
        supabase.from('fellows').update({ level }).eq('id', fellowId)
      )
    );
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      setError(errors[0].error!.message);
    } else {
      setSuccess(`${entries.length} level assignment(s) saved.`);
      setPendingChanges({});
      loadFellows();
    }
  };

  const handleDiscard = () => {
    setPendingChanges({});
    setSuccess(null);
  };

  // Count fellows per effective level
  const levelCounts = useMemo(() => {
    const counts: Record<FellowLevel, number> = {
      ADVANCED: 0,
      UPPER_INTERMEDIATE: 0,
      INTERMEDIATE: 0,
      DEVELOPING: 0,
      BEGINNER: 0,
    };
    fellows.forEach((f) => {
      counts[getEffectiveLevel(f)]++;
    });
    return counts;
  }, [fellows, pendingChanges]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Level Assignment</h1>
          <p className="text-sm text-slate-500">
            Assign fellows to Python levels before generating groups.
          </p>
        </div>
        <button
          onClick={handleSuggest}
          disabled={suggesting}
          className="btn-secondary"
        >
          <Sparkles className="h-4 w-4" />
          Auto-Suggest Levels
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>
      )}

      {/* Level distribution summary */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {LEVEL_ORDER.map((level) => (
          <div key={level} className="card p-3 text-center">
            <p className="text-xs font-medium text-slate-500">{LEVEL_LABELS[level]}</p>
            <p className="text-lg font-bold text-slate-900">{levelCounts[level]}</p>
          </div>
        ))}
      </div>

      {/* Pending changes bar */}
      {hasChanges && (
        <div className="mb-4 flex flex-col gap-3 rounded-md bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <span>
              {Object.keys(pendingChanges).length} unsaved change(s).
              Review and save before generating groups.
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDiscard} className="btn-secondary">
              Discard
            </button>
            <button onClick={handleSave} className="btn-primary">
              <Check className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
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
        <select
          className="input-field max-w-[180px]"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as FellowLevel | 'ALL')}
        >
          <option value="ALL">All Levels</option>
          {LEVEL_ORDER.map((l) => (
            <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Fellow</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Lessons</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Ranking</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Current Level</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Assign Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((f) => {
                  const effective = getEffectiveLevel(f);
                  const changed = pendingChanges[f.id] !== undefined;
                  return (
                    <tr key={f.id} className={changed ? 'bg-amber-50/50' : 'hover:bg-slate-50'}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {f.first_name} {f.last_name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{f.lessons_completed}</td>
                      <td className="px-4 py-3 text-slate-600">{f.ranking}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {LEVEL_LABELS[f.level]}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          className={`input-field text-xs py-1 ${
                            changed ? 'border-amber-400 ring-1 ring-amber-400' : ''
                          }`}
                          value={effective}
                          onChange={(e) => handleLevelChange(f.id, e.target.value as FellowLevel)}
                        >
                          {LEVEL_ORDER.map((l) => (
                            <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No fellows found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium text-slate-700">
                Page {safePage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="rounded-md border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}
