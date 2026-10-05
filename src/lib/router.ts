import { useCallback, useEffect, useState } from 'react';

export type Route =
  | { name: 'notes' }
  | { name: 'auth' };

function parseRoute(): Route {
  const path = window.location.pathname.replace(/\\/+$/, '') || '/';
  const hash = window.location.hash.replace(/^#/, '').replace(/\\/+$/, '') || '/';
  const current = path !== '/' ? path : hash;

  if (current === '/auth') return { name: 'auth' };
  return { name: 'notes' };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseRoute());

  useEffect(() => {
    const update = () => setRoute(parseRoute());
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);

  const navigate = useCallback((path: string) => {
    if (path === '/' || path === '/auth') {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  return { route, navigate };
}
