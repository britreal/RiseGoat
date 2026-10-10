import { useCallback, useEffect, useState } from 'react';

export type Route =
  | { name: 'landing' }
  | { name: 'auth' }
  | { name: 'waitlist' }
  | { name: 'notes' }
  | { name: 'map' }
  | { name: 'network' }
  | { name: 'settings' }
  | { name: 'delete-account' }
  | { name: 'terms' }
  | { name: 'privacy' }
  | { name: 'about' }
  | { name: 'tabuleiro'; slug?: string; view?: 'list' | 'graph' };

function parseRoute(): Route {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const hash = window.location.hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  const current = path !== '/' ? path : hash;
  if (current === '/auth') return { name: 'auth' };
  if (current === '/waitlist') return { name: 'waitlist' };
  if (current === '/terms' || current === '/termos') return { name: 'terms' };
  if (current === '/privacy' || current === '/privacidade') return { name: 'privacy' };
  if (current === '/about' || current === '/sobre') return { name: 'about' };
  if (current === '/settings/delete-account') return { name: 'delete-account' };
  if (current === '/notes') return { name: 'notes' };
  if (current === '/map') return { name: 'map' };
  if (current === '/network') return { name: 'network' };
  if (current === '/settings') return { name: 'settings' };
  if (current === '/tabuleiro/grafo') return { name: 'tabuleiro', view: 'graph' };
  if (current === '/tabuleiro') return { name: 'tabuleiro', view: 'list' };
  const tabuleiroDetail = current.match(/^\/tabuleiro\/([^/]+)$/);
  if (tabuleiroDetail) return { name: 'tabuleiro', slug: decodeURIComponent(tabuleiroDetail[1]), view: 'list' };
  return { name: 'landing' };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseRoute());
  useEffect(() => {
    const update = () => setRoute(parseRoute());
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => { window.removeEventListener('hashchange', update); window.removeEventListener('popstate', update); };
  }, []);
  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);
  return { route, navigate };
}
