import { useCallback, useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'auth' }
  | { name: 'admin' }
  | { name: 'posts' }
  | { name: 'newsletter' }
  | { name: 'site' }
  | { name: 'public-blog'; slug: string }
  | { name: 'public-blog-post'; slug: string; postSlug: string }
  | { name: 'unsubscribe'; token: string };

function parseRoute(): Route {
  const path = window.location.pathname.split('/').filter(Boolean);

  if (path.length === 0) return { name: 'home' };
  if (path[0] === 'auth') return { name: 'auth' };
  if (path[0] === 'unsubscribe' && path[1]) return { name: 'unsubscribe', token: decodeURIComponent(path[1]) };

  if (path[0] === 'blog' && path[1] && path[2]) {
    return { name: 'public-blog-post', slug: decodeURIComponent(path[1]), postSlug: decodeURIComponent(path[2]) };
  }
  if (path[0] === 'blog' && path[1]) return { name: 'public-blog', slug: decodeURIComponent(path[1]) };

  if (path.length === 2 && path[0] !== 'admin' && path[0] !== 'posts' && path[0] !== 'newsletter' && path[0] !== 'site') {
    return { name: 'public-blog-post', slug: decodeURIComponent(path[0]), postSlug: decodeURIComponent(path[1]) };
  }
  if (path.length === 1 && !['admin','posts','newsletter','site'].includes(path[0])) {
    return { name: 'public-blog', slug: decodeURIComponent(path[0]) };
  }

  if (path[0] === 'admin') return { name: 'admin' };
  if (path[0] === 'posts') return { name: 'posts' };
  if (path[0] === 'newsletter') return { name: 'newsletter' };
  if (path[0] === 'site') return { name: 'site' };

  const hash = window.location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'auth') return { name: 'auth' };
  if (parts[0] === 'admin') return { name: 'admin' };
  if (parts[0] === 'posts') return { name: 'posts' };
  if (parts[0] === 'newsletter') return { name: 'newsletter' };
  if (parts[0] === 'site') return { name: 'site' };
  return { name: 'home' };
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
    if (path === '/' || path.startsWith('/blog/') || path.includes('?') && path.startsWith('/')) {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }
    window.location.hash = path;
  }, []);

  return { route, navigate };
}
