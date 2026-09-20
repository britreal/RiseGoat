import { useState, useEffect, useCallback } from 'react';

export type Route =
  | { name: 'auth' }
  | { name: 'dashboard' }
  | { name: 'action-flows' }
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
  | { name: 'offers' }
  | { name: 'product-portfolio' }
  | { name: 'book-writer' }
  | { name: 'revenue' }
  | { name: 'command-center' }
  | { name: 'partnerships' }
  | { name: 'launches' }
  | { name: 'radar' }
  | { name: 'goals' }
  | { name: 'goat' }
  | { name: 'admin' }
  | { name: 'sales-editor'; pageId: string }
  | { name: 'public'; username: string }
  | { name: 'public-microblog'; username: string; postId: string }
  | { name: 'public-sales'; slug: string }
  | { name: 'unsubscribe'; token: string };

function parseHash(): Route {
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts[0] === 'u' && pathParts[1] && pathParts[2] === 'microblog' && pathParts[3]) return { name: 'public-microblog', username: decodeURIComponent(pathParts[1]), postId: decodeURIComponent(pathParts[3]) };
  if (pathParts[0]?.startsWith('@') && pathParts[0].length > 1 && pathParts[2] === 'microblog' && pathParts[3]) return { name: 'public-microblog', username: decodeURIComponent(pathParts[0].slice(1)), postId: decodeURIComponent(pathParts[3]) };
  if (pathParts[0]?.startsWith('@') && pathParts[0].length > 1) return { name: 'public', username: decodeURIComponent(pathParts[0].slice(1)) };
  if (pathParts[0] === 'u' && pathParts[1]) return { name: 'public', username: decodeURIComponent(pathParts[1]) };
  if (pathParts[0] === 'p' && pathParts[1]) return { name: 'public-sales', slug: pathParts.slice(1).map(decodeURIComponent).join('/') };
  if (pathParts[0] === 'unsubscribe' && pathParts[1]) return { name: 'unsubscribe', token: decodeURIComponent(pathParts[1]) };

  const hash = window.location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'dashboard' };
  if (parts[0] === 'auth') return { name: 'auth' };
  if (parts[0] === 'u' && parts[1] && parts[2] === 'microblog' && parts[3]) return { name: 'public-microblog', username: decodeURIComponent(parts[1]), postId: decodeURIComponent(parts[3]) };
  if (parts[0]?.startsWith('@') && parts[0].length > 1 && parts[2] === 'microblog' && parts[3]) return { name: 'public-microblog', username: decodeURIComponent(parts[0].slice(1)), postId: decodeURIComponent(parts[3]) };
  if (parts[0]?.startsWith('@') && parts[0].length > 1) return { name: 'public', username: decodeURIComponent(parts[0].slice(1)) };
  if (parts[0] === 'u' && parts[1]) return { name: 'public', username: decodeURIComponent(parts[1]) };
  if (parts[0] === 'p' && parts[1]) return { name: 'public-sales', slug: parts.slice(1).map(decodeURIComponent).join('/') };
  if (parts[0] === 'unsubscribe' && parts[1]) return { name: 'unsubscribe', token: decodeURIComponent(parts[1]) };
  if (parts[0] === 'dashboard') return { name: 'dashboard' };
  if (parts[0] === 'action-flows') return { name: 'action-flows' };
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
  if (parts[0] === 'goat') return { name: 'goat' };
  if (parts[0] === 'admin') return { name: 'admin' };
  if (parts[0] === 'sales-editor' && parts[1]) return { name: 'sales-editor', pageId: parts[1] };
  if (parts[0] === 'sales') return { name: 'sales' };
  if (parts[0] === 'offers') return { name: 'offers' };
  if (parts[0] === 'product-portfolio') return { name: 'product-portfolio' };
  if (parts[0] === 'book-writer') return { name: 'book-writer' };
  if (parts[0] === 'revenue') return { name: 'revenue' };
  if (parts[0] === 'partnerships') return { name: 'partnerships' };
  if (parts[0] === 'launches') return { name: 'launches' };
  if (parts[0] === 'radar') return { name: 'radar' };
  if (parts[0] === 'goals') return { name: 'goals' };
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
  const navigate = useCallback((path: string) => { window.location.hash = path; }, []);
  return { route, navigate };
}
