import { useEffect, useState, useCallback } from 'react';

export interface Route {
  path: string;
  params: Record<string, string>;
}

function parseHash(): Route {
  const rawHash = window.location.hash.slice(1) || '/';
  const hashWithoutQuery = rawHash.split('?')[0];
  const parts = hashWithoutQuery.split('/').filter(Boolean);

  if (parts.length === 0) return { path: '/', params: {} };

  if (parts[0] === 'groups' && parts.length === 1) {
    return { path: '/groups', params: {} };
  }
  if (parts[0] === 'groups' && parts.length >= 2) {
    return { path: '/groups/:level', params: { level: parts[1] } };
  }
  if (parts[0] === 'search') {
    return { path: '/search', params: {} };
  }
  if (parts[0] === 'admin' && parts.length === 1) {
    return { path: '/admin', params: {} };
  }
  if (parts[0] === 'admin' && parts[1] === 'login') {
    return { path: '/admin/login', params: {} };
  }
  if (parts[0] === 'admin' && parts[1] === 'fellows') {
    return { path: '/admin/fellows', params: {} };
  }
  if (parts[0] === 'admin' && parts[1] === 'rounds') {
    return { path: '/admin/rounds', params: {} };
  }
  if (parts[0] === 'admin' && parts[1] === 'groups') {
    return { path: '/admin/groups', params: {} };
  }
  if (parts[0] === 'admin' && parts[1] === 'levels') {
    return { path: '/admin/levels', params: {} };
  }
  if (parts[0] === 'admin' && parts[1] === 'projects') {
    return { path: '/admin/projects', params: {} };
  }
  if (parts[0] === 'admin' && parts[1] === 'settings') {
    return { path: '/admin/settings', params: {} };
  }
  if (parts[0] === 'group' && parts.length === 2) {
    return { path: '/group/:groupId', params: { groupId: parts[1] } };
  }

  return { path: '/', params: {} };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  return { route, navigate };
}
