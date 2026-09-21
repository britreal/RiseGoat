import { publicSupabase } from './_supabase';

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function stripMarkup(value: string) {
  return value.replace(/https?:\/\/[^\s]+/g, '').trim();
}

interface FeedPost {
  slug: string;
  title: string | null;
  excerpt: string | null;
  content: string | null;
  published_at: string | null;
  updated_at: string | null;
  blogs: { slug: string; name: string };
}

export default async function handler(request: Request) {
  const origin = new URL(request.url).origin;
  const { data: posts, error } = await publicSupabase
    .from('microblog_posts')
    .select('slug,title,excerpt,content,published_at,updated_at,blogs!inner(slug,name,is_published)')
    .eq('status', 'published')
    .eq('blogs.is_published', true)
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return new Response('Feed unavailable', { status: 500 });
  }

  const items = (posts as FeedPost[] ?? []).map((post) => {
    const blog = post.blogs;
    const title = post.title || post.excerpt || 'Publicação';
    const description = post.excerpt || stripMarkup(post.content || '').slice(0, 300);
    const url = origin + '/' + encodeURIComponent(blog.slug) + '/' + encodeURIComponent(post.slug);
    const date = post.published_at || post.updated_at || new Date().toISOString();
    return [
      '<item>',
      '<title>' + escapeXml(title) + '</title>',
      '<description>' + escapeXml(description) + '</description>',
      '<link>' + escapeXml(url) + '</link>',
      '<guid isPermaLink="true">' + escapeXml(url) + '</guid>',
      '<pubDate>' + new Date(date).toUTCString() + '</pubDate>',
      '<source url="' + escapeXml(origin + '/' + encodeURIComponent(blog.slug)) + '">' + escapeXml(blog.name) + '</source>',
      '</item>',
    ].join('');
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '<channel>',
    '<title>RiseGoat</title>',
    '<description>Publicações públicas criadas no RiseGoat.</description>',
    '<link>' + escapeXml(origin) + '</link>',
    '<generator>RiseGoat</generator>',
    ...items,
    '</channel>',
    '</rss>',
  ].join('');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
    },
  });
}
