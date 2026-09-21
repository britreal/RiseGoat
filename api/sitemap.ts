import { publicSupabase } from './_supabase';

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export default async function handler(request: Request) {
  const origin = new URL(request.url).origin;
  const urls: string[] = [`<url><loc>${escapeXml(origin + '/')}</loc></url>`];

  const { data: blogs, error: blogsError } = await publicSupabase
    .from('blogs')
    .select('id,slug,updated_at')
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
    .limit(5000);

  if (blogsError) {
    return new Response('Sitemap unavailable', { status: 500 });
  }

  for (const blog of blogs ?? []) {
    const blogUrl = origin + '/' + encodeURIComponent(blog.slug);
    urls.push(
      `<url><loc>${escapeXml(blogUrl)}</loc><lastmod>${new Date(blog.updated_at).toISOString()}</lastmod></url>`
    );

    const { data: posts } = await publicSupabase
      .from('microblog_posts')
      .select('slug,updated_at,published_at')
      .eq('blog_id', blog.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5000);

    for (const post of posts ?? []) {
      urls.push(
        `<url><loc>${escapeXml(blogUrl + '/' + encodeURIComponent(post.slug))}</loc><lastmod>${new Date(post.updated_at || post.published_at || Date.now()).toISOString()}</lastmod></url>`
      );
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
  ].join('');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
