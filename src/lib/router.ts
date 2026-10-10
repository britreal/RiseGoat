import { useCallback, useEffect, useState } from 'react';

export type Route =
  | { name: 'landing' }
  | { name: 'auth' }
  | { name: 'notes' }
  | { name: 'map' }
  | { name: 'settings' }
  | { name: 'tabuleiro' }
  | { name: 'tabuleiro-detail'; slug: string }
  | { name: 'tabuleiro-graph' };

function parseRoute(): Route {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const hash = window.location.hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  const current = path !== '/' ? path : hash;
  if (current === '/tabuleiro/grafo') return { name: 'tabuleiro-graph' };
  if (current === '/tabuleiro') return { name: 'tabuleiro' };
  const magnateMatch = current.match(/^\/tabuleiro\/([^/]+)$/);
  if (magnateMatch) {
    try { return { name: 'tabuleiro-detail', slug: decodeURIComponent(magnateMatch[1]) }; }
    catch { return { name: 'landing' }; }
  }
  if (current === '/auth') return { name: 'auth' };
  if (current === '/notes') return { name: 'notes' };
  if (current === '/map') return { name: 'map' };
  if (current === '/settings') return { name: 'settings' };
  return { name: 'landing' };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseRoute());
  useEffect(() => { const update = () => setRoute(parseRoute()); window.addEventListener('hashchange', update); window.addEventListener('popstate', update); return () => { window.removeEventListener('hashchange', update); window.removeEventListener('popstate', update); }; }, []);
  const navigate = useCallback((path: string) => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, []);
  return { route, navigate };
}