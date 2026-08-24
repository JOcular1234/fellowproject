import { useEffect, useState } from 'react';
import {
  Users, FolderKanban, FileText, Crown, AlertTriangle,
  ArrowRight, Layers, Sparkles, ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from '@/lib/router';
import { LEVEL_ORDER, LEVEL_LABELS, type FellowLevel } from '@/lib/types';

interface DashboardStats {
  totalFellows: number;
  fellowsAssignedToLevels: number;
  totalGroups: number;
  publishedGroups: number;
  groupsWithoutLeaders: number;
  groupsWithoutProjects: number;
  levelCounts: Record<FellowLevel, number>;
}

export function AdminDashboard() {
  const { navigate } = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: fellows, error: fErr } = await supabase.from('fellows').select('level');
        if (fErr) throw fErr;

        const { data: groups, error: gErr } = await supabase
          .from('project_groups')
          .select('id, level, project_round: project_rounds!inner(status)');
        if (gErr) throw gErr;

        const { data: members, error: mErr } = await supabase
          .from('group_members')
          .select('id, is_leader, project_group_id');
        if (mErr) throw mErr;

        const { data: projects } = await supabase
          .from('projects')
          .select('project_group_id');

        const levelCounts: Record<FellowLevel, number> = {
          ADVANCED: 0,
          UPPER_INTERMEDIATE: 0,
          INTERMEDIATE: 0,
          DEVELOPING: 0,
          BEGINNER: 0,
        };
        (fellows || []).forEach((f) => {
          levelCounts[f.level as FellowLevel]++;
        });

        const publishedGroupIds = new Set(
          (groups || [])
            .filter((g) => (g.project_round as unknown as { status: string }).status === 'PUBLISHED')
            .map((g) => g.id)
        );

        const leaderGroupIds = new Set(
          (members || []).filter((m) => m.is_leader).map((m) => m.project_group_id)
        );

        const projectGroupIds = new Set((projects || []).map((p) => p.project_group_id));

        const publishedGroups = (groups || []).filter((g) =>
          publishedGroupIds.has(g.id)
        );

        setStats({
          totalFellows: fellows?.length ?? 0,
          fellowsAssignedToLevels: fellows?.length ?? 0,
          totalGroups: groups?.length ?? 0,
          publishedGroups: publishedGroups.length,
          groupsWithoutLeaders: publishedGroups.filter((g) => !leaderGroupIds.has(g.id)).length,
          groupsWithoutProjects: publishedGroups.filter((g) => !projectGroupIds.has(g.id)).length,
          levelCounts,
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const summaryCards = [
    { label: 'Total Fellows', value: stats?.totalFellows, icon: Users, path: '/admin/fellows' },
    { label: 'Total Groups', value: stats?.totalGroups, icon: FolderKanban, path: '/admin/groups' },
    { label: 'Published Groups', value: stats?.publishedGroups, icon: ShieldCheck, path: '/admin/groups' },
    { label: 'Groups Without Leaders', value: stats?.groupsWithoutLeaders, icon: Crown, path: '/admin/groups', alert: true },
    { label: 'Groups Without Projects', value: stats?.groupsWithoutProjects, icon: FileText, path: '/admin/projects', alert: true },
  ];

  const quickActions = [
    { label: 'Manage Fellows', path: '/admin/fellows', icon: Users },
    { label: 'Manage Levels', path: '/admin/levels', icon: Layers },
    { label: 'Generate Groups', path: '/admin/groups', icon: Sparkles },
    { label: 'Review Groups', path: '/admin/groups', icon: FolderKanban },
    { label: 'Manage Leaders', path: '/admin/groups', icon: Crown },
    { label: 'Manage Projects', path: '/admin/projects', icon: FileText },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Dashboard</h1>
      <p className="text-sm text-slate-500 mb-6">Overview of your fellowship program.</p>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const isAlert = card.alert && (card.value ?? 0) > 0;
          return (
            <button
              key={card.label}
              onClick={() => navigate(card.path)}
              className="card p-4 text-left transition-all hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-9 w-9 items-center justify-center rounded-md ${
                  isAlert ? 'bg-amber-50' : 'bg-brand-50'
                }`}>
                  <Icon className={`h-4 w-4 ${isAlert ? 'text-amber-600' : 'text-brand-600'}`} />
                </div>
                {isAlert && <AlertTriangle className="h-4 w-4 text-amber-500" />}
              </div>
              <p className="mt-2.5 text-2xl font-bold text-slate-900">
                {loading ? '—' : card.value}
              </p>
              <p className="text-xs text-slate-500">{card.label}</p>
            </button>
          );
        })}
      </div>

      {/* Level distribution */}
      <div className="mt-6 card p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Fellows by Python Level</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <div className="space-y-2.5">
            {LEVEL_ORDER.map((level) => {
              const count = stats?.levelCounts[level] ?? 0;
              const max = Math.max(...Object.values(stats?.levelCounts ?? {}));
              const pct = max > 0 ? (count / max) * 100 : 0;
              return (
                <div key={level} className="flex items-center gap-3">
                  <span className="w-32 text-xs font-medium text-slate-600 shrink-0">
                    {LEVEL_LABELS[level]}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-slate-700">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-6 card p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:border-brand-300 hover:bg-brand-50/50"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-brand-600" />
                  {action.label}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
