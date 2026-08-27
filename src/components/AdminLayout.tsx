import { type ReactNode } from 'react';
import { LayoutDashboard, Users, Layers, FolderKanban, FileText, Settings, LogOut, ExternalLink, Activity, Bell, Calendar } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Fellows', path: '/admin/fellows', icon: Users },
  { label: 'Project Rounds', path: '/admin/rounds', icon: Layers },
  { label: 'Groups', path: '/admin/groups', icon: FolderKanban },
  { label: 'Projects', path: '/admin/projects', icon: FileText },
  { label: 'Participation', path: '/admin/participation', icon: Activity },
  { label: 'Announcements', path: '/admin/announcements', icon: Bell },
  { label: 'Milestones', path: '/admin/milestones', icon: Calendar },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const { route, navigate } = useRouter();

  const isActive = (path: string) => {
    if (path === '/admin') return route.path === '/admin';
    return route.path === path;
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white">
                <path d="M12 2C8 2 8 5 8 7v2h6v2H6c-2 0-4 2-4 4s2 4 4 4h2v-2c0-2 2-4 4-4h4c2 0 4-2 4-4V7c0-2-2-5-6-5h-2z" />
                <circle cx="9.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
                <path d="M8 17c0 2 2 5 6 5h-2c4 0 6-3 6-5v-2h-6v-2h6c2 0 4-2 4-4" />
                <circle cx="14.5" cy="17.5" r="0.8" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div>
              <span className="block text-sm font-bold text-slate-900 leading-tight">
                Python Fellows
              </span>
              <span className="block text-[10px] text-slate-500 leading-tight">
                Admin Console
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-600"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Public Site
            </button>
            <div className="text-right">
              <p className="text-xs font-medium text-slate-700">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white py-4">
          <nav className="space-y-1 px-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 overflow-auto">
          <div className="md:hidden border-b border-slate-200 bg-white px-4 py-2">
            <div className="flex gap-1 overflow-x-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-6 max-w-5xl">{children}</div>
        </div>
      </div>
    </div>
  );
}
