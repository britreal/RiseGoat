import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Loader2, LockKeyhole, Mail, ShieldCheck, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import '@/lib/account-deletion.css';

type DeletionRequest={id:string;requested_at:string;scheduled_delete_at:string;status:'pending'|'cancelled'|'completed'|'processing'|'blocked'};

export function DeleteAccountPage(){
  const {user,signOut}=useAuth();
  const [request,setRequest]=useState<DeletionRequest|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [step,setStep]=useState<1|2>(1);
  const [confirmation,setConfirmation]=useState('');
  const [acknowledged,setAcknowledged]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const load=useCallback(async()=>{
    if(!user){setRequest(null);setLoading(false);return}
    setLoading(true);setError('');
    const {data,error:loadError}=await supabase.from('account_deletion_requests')
      .select('id,requested_at,scheduled_delete_at,status')
      .eq('user_id',user.id).eq('status','pending')
      .order('requested_at',{ascending:false}).limit(1).maybeSingle();
    if(loadError)setError('Não foi possível verificar sua solicitação. '+loadError.message);
    else setRequest(data as DeletionRequest|null);
    setLoading(false);
  },[user?.id]);

  useEffect(()=>{void load()},[load]);

  function go(path:string){window.history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'))}
  async function submitRequest(){
    if(confirmation!=='EXCLUIR MINHA CONTA'||!acknowledged)return;
    setBusy(true);setError('');setNotice('');
    const {data,error:requestError}=await supabase.functions.invoke('request-account-deletion',{body:{confirmation}});
    if(requestError){
      setError('A solicitação não foi confirmada. Verifique se o envio de e-mail transacional está configurado e tente novamente. '+requestError.message);
      setBusy(false);return;
    }
    const row=data as {request_id?:string;scheduled_delete_at?:string};
    setConfirmation('');setAcknowledged(false);setStep(1);
    setNotice('Solicitação registrada. Enviamos um e-mail de confirmação com a data prevista de exclusão.');
    await load();
    if(row.request_id&&row.scheduled_delete_at)setRequest({id:row.request_id,requested_at:new Date().toISOString(),scheduled_delete_at:row.scheduled_delete_at,status:'pending'});
    setBusy(false);
  }
  async function cancelRequest(){
    if(!request)return;
    if(!window.confirm('Cancelar a exclusão da conta? Seu acesso aos dados pessoais será restaurado.'))return;
    setBusy(true);setError('');setNotice('');
    const {error:cancelError}=await supabase.rpc('cancel_account_deletion',{p_request_id:request.id});
    if(cancelError)setError('Não foi possível cancelar a solicitação. '+cancelError.message);
    else{setRequest(null);setStep(1);setConfirmation('');setAcknowledged(false);setNotice('Solicitação cancelada. Seu acesso à conta foi restaurado.')}
    setBusy(false);
  }

  if(loading)return <main className="account-delete-shell"><div className="account-delete-loading"><Loader2 size={18} className="account-delete-spin"/>Verificando status…</div></main>;

  return <main className="account-delete-shell">
    <header className="account-delete-header"><a href="/notes" onClick={e=>{e.preventDefault();go('/notes')}}><ArrowLeft size={15}/> Voltar ao RiseGoat</a><div className="account-delete-brand"><span>R</span><strong>RiseGoat</strong></div></header>
    <section className="account-delete-card">
      <div className="account-delete-emblem"><LockKeyhole size={22}/></div>
      <span className="account-delete-eyebrow">CONTROLE DA SUA CONTA</span>
      <h1>Excluir conta e dados</h1>
      <p className="account-delete-lead">A solicitação inicia um período de carência de 30 dias. Durante esse período, o acesso aos dados pessoais fica bloqueado e você pode cancelar a exclusão nesta página.</p>
      {error&&<div className="account-delete-alert" role="alert"><AlertTriangle size={16}/><span>{error}</span><button onClick={()=>setError('')} aria-label="Fechar aviso"><XCircle size={15}/></button></div>}
      {notice&&<div className="account-delete-success" role="status"><CheckCircle2 size={16}/><span>{notice}</span></div>}
      {request?<div className="account-delete-pending">
        <div className="account-delete-status"><Clock3 size={18}/><div><strong>Exclusão agendada</strong><span>Solicitada em {new Date(request.requested_at).toLocaleString('pt-BR')}</span></div></div>
        <div className="account-delete-date"><span>Data prevista para exclusão definitiva</span><strong>{new Date(request.scheduled_delete_at).toLocaleString('pt-BR')}</strong><small>Se a solicitação não for cancelada até essa data, o processo diário tentará excluir a conta, as notas pessoais, os anexos e as relações vinculadas.</small></div>
        <div className="account-delete-warning"><ShieldCheck size={16}/><p>Durante a carência, seu acesso aos dados privados fica bloqueado. Você ainda pode voltar aqui para cancelar.</p></div>
        <button className="account-delete-secondary" onClick={()=>void cancelRequest()} disabled={busy}>{busy?<Loader2 size={14} className="account-delete-spin"/>:<XCircle size={14}/>} Cancelar solicitação</button>
        <button className="account-delete-link" onClick={()=>void signOut()}>Sair da conta</button>
      </div>:step===1?<div className="account-delete-step">
        <h2>Antes de continuar</h2>
        <p>Leia o que será afetado antes de abrir a solicitação:</p>
        <ul>
          <li>O conteúdo pessoal e os anexos vinculados à conta serão removidos ao fim dos 30 dias.</li>
          <li>Notas colaborativas escritas por você em círculos e salas também podem ser removidas; círculos que você administra podem desaparecer.</li>
          <li>Os registros de auditoria serão mantidos apenas como metadados necessários à segurança, sem o conteúdo das notas.</li>
          <li>Você receberá um e-mail de confirmação. Sem o envio transacional configurado, a solicitação não será registrada.</li>
        </ul>
        <button className="account-delete-primary" onClick={()=>setStep(2)}>Continuar para confirmação <ArrowLeft size={14} className="account-delete-next"/></button>
      </div>:<div className="account-delete-step">
        <h2>Confirmação em duas etapas</h2>
        <p>Para evitar um clique acidental, confirme explicitamente o pedido e reconheça o período de carência.</p>
        <label className="account-delete-confirm-label">Digite exatamente <code>EXCLUIR MINHA CONTA</code>
          <input autoComplete="off" spellCheck={false} value={confirmation} onChange={e=>setConfirmation(e.target.value)} placeholder="EXCLUIR MINHA CONTA"/>
        </label>
        <label className="account-delete-check"><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)}/><span>Entendo que meu acesso aos dados privados será bloqueado agora e que a exclusão definitiva está prevista para 30 dias após a confirmação por e-mail.</span></label>
        <div className="account-delete-actions"><button className="account-delete-secondary" onClick={()=>setStep(1)} disabled={busy}>Voltar</button><button className="account-delete-danger" onClick={()=>void submitRequest()} disabled={busy||confirmation!=='EXCLUIR MINHA CONTA'||!acknowledged}>{busy?<Loader2 size={14} className="account-delete-spin"/>:<AlertTriangle size={14}/>} Solicitar exclusão</button></div>
      </div>}
      <footer className="account-delete-card-footer"><Mail size={13}/><span>A exclusão definitiva depende do processamento automático e pode ser adiada se houver erro de armazenamento ou dependência de dados.</span></footer>
    </section>
  </main>;
}
