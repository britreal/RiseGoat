import { useEffect, useState } from 'react';
import { Check, Loader2, MailX } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function UnsubscribePage({ token }: { token:string }) {
  const [loading,setLoading]=useState(true);
  const [done,setDone]=useState(false);
  const [error,setError]=useState('');

  useEffect(() => {
    let active=true;
    supabase.rpc('unsubscribe_newsletter',{p_token:token}).then(({data,error:rpcError})=>{
      if(!active)return;
      if(rpcError){setError('Não foi possível concluir o descadastro.');setLoading(false);return;}
      setDone(Boolean(data?.ok));
      setLoading(false);
    });
    return ()=>{active=false;};
  },[token]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto">
          {loading ? <Loader2 className="w-6 h-6 animate-spin"/> : done ? <Check className="w-6 h-6 text-emerald-400"/> : <MailX className="w-6 h-6 text-red-300"/>}
        </div>
        <h1 className="text-xl font-black mt-5">{loading ? 'Processando...' : done ? 'Descadastro concluído' : 'Não foi possível concluir'}</h1>
        <p className="text-sm text-white/60 mt-2">{loading ? 'Estamos atualizando sua preferência.' : done ? 'Este endereço não receberá novas campanhas desta lista.' : error}</p>
        {!loading && <a href="/" className="inline-flex mt-6 px-4 py-2.5 rounded-xl bg-white text-slate-950 text-sm font-semibold">Voltar</a>}
      </div>
    </div>
  );
}
