import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { PublicBlogPostPage } from '@/pages/PublicBlogPostPage';
import type { Blog, MicroblogPost } from '@/types';

export function PublicMicroblogPage({ username, postId }: { username: string; postId: string }) {
  const [target, setTarget] = useState<{ slug: string; postSlug: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.from('profiles').select('id').eq('username', username.toLowerCase()).maybeSingle().then(async ({ data: profile }) => {
      if (!alive) return;
      if (!profile) { setMissing(true); setLoading(false); return; }
      const [blogRes, postRes] = await Promise.all([
        supabase.from('blogs').select('id,slug').eq('user_id', profile.id).order('created_at', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('microblog_posts').select('slug,blog_id').eq('id', postId).eq('user_id', profile.id).maybeSingle(),
      ]);
      const blog = blogRes.data as Pick<Blog,'id'|'slug'> | null;
      const post = postRes.data as Pick<MicroblogPost,'slug'|'blog_id'> | null;
      if (!blog || !post || post.blog_id !== blog.id) { setMissing(true); setLoading(false); return; }
      if (!alive) return;
      setTarget({ slug: blog.slug, postSlug: post.slug });
      setLoading(false);
    });
    return () => { alive = false; };
  }, [username, postId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-7 h-7 text-white/50 animate-spin" /></div>;
  if (missing || !target) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">Artigo não encontrado</div>;
  return <PublicBlogPostPage slug={target.slug} postSlug={target.postSlug} />;
}