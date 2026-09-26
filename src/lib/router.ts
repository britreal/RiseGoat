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

function parseParts(parts: string[]): Route | null {
  if (parts.length === 0) return null;
  if (parts[0] === 'auth') return { name: 'auth' };
  if (parts[0] === 'unsubscribe' && parts[1]) return { name: 'unsubscribe', token: decodeURIComponent(parts[1]) };

  if (parts[0] === 'blog' && parts[1] && parts[2]) {
    return { name: 'public-blog-post', slug: decodeURIComponent(parts[1]), postSlug: decodeURIComponent(parts[2]) };
  }
  if (parts[0] === 'blog' && parts[1]) return { name: 'public-blog', slug: decodeURIComponent(parts[1]) };

  if (parts[0] === 'admin') return { name: 'admin' };
  if (parts[0] === 'posts') return { name: 'posts' };
  if (parts[0] === 'newsletter') return { name: 'newsletter' };
  if (parts[0] === 'site') return { name: 'site' };

  if (parts.length === 2) {
    return { name: 'public-blog-post', slug: decodeURIComponent(parts[0]), postSlug: decodeURIComponent(parts[1]) };
  }
  if (parts.length === 1) {
    return { name: 'public-blog', slug: decodeURIComponent(parts[0]) };
  }

  return null;
}

function parseRoute(): Route {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const directRoute = parseParts(pathParts);
  if (directRoute) return directRoute;

  const hash = window.location.hash.replace(/^#/, '') || '/';
  const hashParts = hash.split('/').filter(Boolean);
  const hashRoute = parseParts(hashParts);
  return hashRoute || { name: 'home' };
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
    if (path === '/' || path.startsWith('/blog/') || path.startsWith('/unsubscribe/')) {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }
    window.location.hash = path;
  }, []);

  return { route, navigate };
}
