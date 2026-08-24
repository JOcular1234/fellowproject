import { type ReactNode } from 'react';
import { BookOpen, Home, Users, Search } from 'lucide-react';
import { useRouter } from '@/lib/router';

interface NavItem {
  label: string;
  path: string;
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Groups', path: '/groups', icon: Users },
  { label: 'Search', path: '/search', icon: Search },
];

export function PublicLayout({ children }: { children: ReactNode }) {
  const { route, navigate } = useRouter();

  const isActive = (path: string) => {
    if (path === '/') return route.path === '/';
    if (path === '/groups') return route.path === '/groups' || route.path === '/groups/:level';
    if (path === '/search') return route.path === '/search';
    return false;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 text-left"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-600">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="block text-sm font-bold text-slate-900 leading-tight">
                  Python Fellows
                </span>
                <span className="block text-xs text-slate-500 leading-tight">
                  Project Hub
                </span>
              </div>
            </button>

            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="text-center text-xs text-slate-500">
            Python Fellows Project Hub — Internal fellowship portal
          </p>
          <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-slate-400">
            <span className="font-medium text-slate-500">Practice Activity:</span>{' '}
            This is a facilitator-led practice project and is not an official Learn2Earn HQ assessment, examination, or curriculum requirement.
          </p>
        </div>
      </footer>
    </div>
  );
}
