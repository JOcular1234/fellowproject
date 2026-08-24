import { AuthProvider, useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { PublicLayout } from '@/components/PublicLayout';
import { AdminLayout } from '@/components/AdminLayout';
import { PracticeNoticeModal } from '@/components/PracticeNoticeModal';
import { HomePage } from '@/pages/HomePage';
import { GroupsPage } from '@/pages/GroupsPage';
import { LevelPage } from '@/pages/LevelPage';
import { GroupPage } from '@/pages/GroupPage';
import { SearchPage } from '@/pages/SearchPage';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminFellowsPage } from '@/pages/admin/AdminFellowsPage';
import { AdminRoundsPage } from '@/pages/admin/AdminRoundsPage';
import { AdminGroupsPage } from '@/pages/admin/AdminGroupsPage';
import { AdminLevelsPage } from '@/pages/admin/AdminLevelsPage';
import { AdminProjectsPage } from '@/pages/admin/AdminProjectsPage';
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage';
import { LEVEL_ORDER, type FellowLevel } from '@/lib/types';


function isValidLevel(level: string): level is FellowLevel {
  return (LEVEL_ORDER as string[]).includes(level);
}

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { navigate } = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate('/admin/login');
    return null;
  }

  return <AdminLayout>{children}</AdminLayout>;
}

function AppRoutes() {
  const { route } = useRouter();

  if (route.path === '/admin/login') {
    return <AdminLoginPage />;
  }

  if (route.path.startsWith('/admin')) {
    if (route.path === '/admin') {
      return (
        <ProtectedAdmin>
          <AdminDashboard />
        </ProtectedAdmin>
      );
    }
    if (route.path === '/admin/fellows') {
      return (
        <ProtectedAdmin>
          <AdminFellowsPage />
        </ProtectedAdmin>
      );
    }
    if (route.path === '/admin/rounds') {
      return (
        <ProtectedAdmin>
          <AdminRoundsPage />
        </ProtectedAdmin>
      );
    }
    if (route.path === '/admin/groups') {
      return (
        <ProtectedAdmin>
          <AdminGroupsPage />
        </ProtectedAdmin>
      );
    }
    if (route.path === '/admin/levels') {
      return (
        <ProtectedAdmin>
          <AdminLevelsPage />
        </ProtectedAdmin>
      );
    }
    if (route.path === '/admin/projects') {
      return (
        <ProtectedAdmin>
          <AdminProjectsPage />
        </ProtectedAdmin>
      );
    }
    if (route.path === '/admin/settings') {
      return (
        <ProtectedAdmin>
          <AdminSettingsPage />
        </ProtectedAdmin>
      );
    }
  }

  if (route.path === '/group/:groupId') {
    return (
      <PublicLayout>
        <GroupPage groupId={route.params.groupId} />
      </PublicLayout>
    );
  }

  if (route.path === '/groups/:level') {
    const level = route.params.level;
    if (!isValidLevel(level)) {
      return (
        <PublicLayout>
          <div className="mx-auto max-w-4xl px-4 py-12 text-center">
            <p className="text-sm text-slate-600">Invalid level. Please select a level from the groups page.</p>
          </div>
        </PublicLayout>
      );
    }
    return (
      <PublicLayout>
        <LevelPage level={level} />
      </PublicLayout>
    );
  }

  if (route.path === '/groups') {
    return (
      <PublicLayout>
        <GroupsPage />
      </PublicLayout>
    );
  }

  if (route.path === '/search') {
    return (
      <PublicLayout>
        <SearchPage />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <HomePage />
    </PublicLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <PracticeNoticeModal />
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
