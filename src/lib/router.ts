import { useState, useEffect, useCallback } from 'react';

export type Route =
  | { name: 'auth' }
  | { name: 'dashboard' }
  | { name: 'profile' }
  | { name: 'links' }
  | { name: 'microblog' }
  | { name: 'newsletter' }
  | { name: 'posts' }
  | { name: 'drafts' }
  | { name: 'leads' }
  | { name: 'analytics' }
  | { name: 'settings' }
  | { name: 'sales' }
  | { name: 'command-center' }
  | { name: 'sales-editor'; pageId: string }
  | { name: 'public'; username: string }
  | { name: 'public-microblog'; username: string; postId: string }
  | { name: 'public-sales'; slug: string };

function parseHash(): Route {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts[0] === 'u' && pathParts[1] && pathParts[2] === 'microblog' && pathParts[3]) {
    return { name: 'public-microblog', username: decodeURIComponent(pathParts[1]), postId: decodeURIComponent(pathParts[3]) };
  }
  if (pathParts[0] === 'u' && pathParts[1]) {
    return { name: 'public', username: decodeURIComponent(pathParts[1]) };
  }
  if (pathParts[0] === 'p' && pathParts[1]) {
    return { name: 'public-sales', slug: pathParts.slice(1).map(decodeURIComponent).join('/') };
  }

  const hash = window.location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);

  if (parts.length === 0) return { name: 'dashboard' };
  if (parts[0] === 'auth') return { name: 'auth' };
  if (parts[0] === 'u' && parts[1] && parts[2] === 'microblog' && parts[3]) return { name: 'public-microblog', username: decodeURIComponent(parts[1]), postId: decodeURIComponent(parts[3]) };
  if (parts[0] === 'u' && parts[1]) return { name: 'public', username: decodeURIComponent(parts[1]) };
  if (parts[0] === 'p' && parts[1]) return { name: 'public-sales', slug: parts.slice(1).map(decodeURIComponent).join('/') };
  if (parts[0] === 'dashboard') return { name: 'dashboard' };
  if (parts[0] === 'profile') return { name: 'profile' };
  if (parts[0] === 'links') return { name: 'links' };
  if (parts[0] === 'microblog') return { name: 'microblog' };
  if (parts[0] === 'newsletter') return { name: 'newsletter' };
  if (parts[0] === 'posts') return { name: 'posts' };
  if (parts[0] === 'drafts') return { name: 'drafts' };
  if (parts[0] === 'leads') return { name: 'leads' };
  if (parts[0] === 'analytics') return { name: 'analytics' };
  if (parts[0] === 'settings') return { name: 'settings' };
  if (parts[0] === 'sales' && parts[1] === 'editor' && parts[2]) return { name: 'sales-editor', pageId: parts[2] };
  if (parts[0] === 'command-center') return { name: 'command-center' };
  // Backward-compatible support for the previous editor URL.
  if (parts[0] === 'sales-editor' && parts[1]) return { name: 'sales-editor', pageId: parts[1] };
  if (parts[0] === 'sales') return { name: 'sales' };
  return { name: 'dashboard' };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash());

  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('hashchange', handler);
      window.removeEventListener('popstate', handler);
    };
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  return { route, navigate };
}
