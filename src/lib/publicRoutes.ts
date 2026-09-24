/** Top-level paths reserved by RiseGoat so blog slugs cannot shadow app/system routes. */
export const RESERVED_ROOT_SEGMENTS = new Set([
  'auth','dashboard','action-flows','flux','profile','links','microblog','newsletter','posts','drafts','leads','analytics',
  'settings','sales','offers','product-portfolio','book-writer','revenue','command-center','partnerships','launches',
  'radar','goals','goat','admin','u','p','unsubscribe','assets','src','favicon.ico','robots.txt','sitemap.xml','feed.xml','api'
]);

export function isReservedRootSegment(value: string) {
  return RESERVED_ROOT_SEGMENTS.has(value.trim().toLowerCase());
}
