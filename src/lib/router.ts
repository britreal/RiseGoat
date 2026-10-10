import { useCallback, useEffect, useState } from 'react';

export type Route = { name: 'landing' } | { name: 'auth' } | { name: 'notes' } | { name: 'map' } | { name: 'network' } | { name: 'settings' };

function parseRoute(): Route {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const hash = window.location.hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  const current = path !== '/' ? path : hash;
  if (current === '/auth') return { name: 'auth' };
  if (current === '/notes') return { name: 'notes' };
  if (current === '/map') return { name: 'map' };
  if (current === '/network') return { name: 'network' };
  if (current === '/settings') return { name: 'settings' };
  return { name: 'landing' };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseRoute());
  useEffect(() => { const update = () => setRoute(parseRoute()); window.addEventListener('hashchange', update); window.addEventListener('popstate', update); return () => { window.removeEventListener('hashchange', update); window.removeEventListener('popstate', update); }; }, []);
  const navigate = useCallback((path: string) => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, []);
  return { route, navigate };
}