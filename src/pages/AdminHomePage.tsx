import { useEffect, useState } from 'react';
import { ArrowUpRight, FileText, Mail, PenLine } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function AdminHomePage({ navigate }: { navigate: (path: string) => void }) {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState(0);
  const [drafts, setDrafts] = useState(0);
  const [subscribers, setSubscribers] = useState(0);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('microblog_posts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('drafts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('newsletter_leads').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('marketing_consent', true).is('unsubscribed_at', null),
    ]).then(([postResult, draftResult, subscriberResult]) => {
      setPosts(postResult.count || 0);
      setDrafts(draftResult.count || 0);
      setSubscribers(subscriberResult.count || 0);
    });
  }, [user]);

  const name = profile?.display_name || profile?.username || 'você';

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Área privada</p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-black tracking-[-0.04em]">Escreva, publique, envie.</h1>
          <p className="mt-3 text-slate-500">Olá, {name}. Aqui estão apenas as ferramentas do seu blog.</p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
          Ver site <ArrowUpRight className="w-4 h-4" />
        </a>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-10">
        <button onClick={() => navigate('/posts')} className="text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition">
          <FileText className="w-5 h-5 text-slate-400" />
          <p className="mt-8 text-3xl font-black">{posts}</p>
          <p className="text-sm text-slate-500 mt-1">publicações</p>
        </button>
        <button onClick={() => navigate('/posts')} className="text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition">
          <PenLine className="w-5 h-5 text-slate-400" />
          <p className="mt-8 text-3xl font-black">{drafts}</p>
          <p className="text-sm text-slate-500 mt-1">rascunhos</p>
        </button>
        <button onClick={() => navigate('/newsletter')} className="text-left rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 transition">
          <Mail className="w-5 h-5 text-slate-400" />
          <p className="mt-8 text-3xl font-black">{subscribers}</p>
          <p className="text-sm text-slate-500 mt-1">assinantes ativos</p>
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <button onClick={() => navigate('/posts')} className="rounded-2xl bg-slate-950 text-white p-6 text-left hover:bg-slate-900 transition">
          <p className="text-sm font-semibold">Novo texto</p>
          <p className="mt-2 text-sm text-white/50">Escreva um post e publique ou salve como rascunho.</p>
          <span className="inline-flex items-center gap-2 mt-7 text-xs font-bold">Abrir editor <ArrowUpRight className="w-4 h-4" /></span>
        </button>
        <button onClick={() => navigate('/site')} className="rounded-2xl border border-slate-200 bg-white p-6 text-left hover:border-slate-300 transition">
          <p className="text-sm font-semibold">Editar identidade</p>
          <p className="mt-2 text-sm text-slate-500">Nome, descrição, capa, cores e SEO do blog.</p>
          <span className="inline-flex items-center gap-2 mt-7 text-xs font-bold text-slate-600">Abrir configurações <ArrowUpRight className="w-4 h-4" /></span>
        </button>
      </div>
    </div>
  );
}
