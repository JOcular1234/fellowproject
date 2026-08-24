import { useEffect, useState, useRef, useCallback } from 'react';
import { Search as SearchIcon, ArrowRight, UserX } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { searchFellows, type SearchResult } from '@/lib/queries';
import { LEVEL_LABELS, type FellowLevel } from '@/lib/types';

export function SearchPage() {
  const { route, navigate } = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const r = await searchFellows(trimmed);
      setResults(r);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const q = params.get('q') || '';
    if (q) {
      setQuery(q);
      doSearch(q);
    }
  }, [route, doSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(val);
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(query);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Search</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter your name to find your project group.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Enter your name (e.g. Mary Imoh)"
            className="w-full rounded-lg border border-slate-300 bg-white py-3.5 pl-12 pr-24 text-base text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            autoComplete="off"
            autoFocus
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Search
          </button>
        </div>
      </form>

      {searching && (
        <div className="text-sm text-slate-500">Searching...</div>
      )}

      {!searching && hasSearched && results.length === 0 && (
        <div className="card p-8 text-center">
          <UserX className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-600">
            No fellow found with that name. Try searching with just your first or last name.
          </p>
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => (
            <div
              key={r.fellow.id}
              className="card p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-base font-semibold text-slate-900">
                  {r.fellow.first_name} {r.fellow.last_name}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span>
                    <span className="text-slate-400">Level: </span>
                    {LEVEL_LABELS[r.group_level as FellowLevel] ?? r.group_level}
                  </span>
                  <span>
                    <span className="text-slate-400">Project Group: </span>
                    {r.group_name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => navigate(`/group/${r.group_id}`)}
                className="btn-primary self-start sm:self-center"
              >
                View My Group
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
