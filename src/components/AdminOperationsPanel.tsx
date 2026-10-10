import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import '@/lib/network.css';

type EmailEvent={event_key:string;invite_id:string;email_type:string;status:string;error_code:string|null;sent_at:string|null;created_at:string};
type NoteShareEmailEvent={event_key:string;status:string;provider_message_id:string|null;error_code:string|null;sent_at:string|null;created_at:string};
type MaintenanceEvent={id:number;job_name:string;status:string;started_at:string;completed_at:string|null;deleted_notes:number;deleted_accounts:number;failed_items:number;detail:Record<string,unknown>};
type DeletionEvent={id:string;status:string;requested_at:string;scheduled_delete_at:string;last_error_code:string|null};
type Metric={total_views:number;authenticated_views:number;unique_members:number;total_magnates:number;public_magnates:number};

function date(value:string|null){return value?new Date(value).toLocaleString('pt-BR'):'Em andamento'}
export function AdminOperationsPanel(){
 const [emails,setEmails]=useState<EmailEvent[]>([]);
 const [noteShareEmails,setNoteShareEmails]=useState<NoteShareEmailEvent[]>([]);
 const [jobs,setJobs]=useState<MaintenanceEvent[]>([]);
 const [deletions,setDeletions]=useState<DeletionEvent[]>([]);
 const [metric,setMetric]=useState<Metric|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [refreshedAt,setRefreshedAt]=useState('');
 async function load(){
  setLoading(true);setError('');
  const [mail,noteShareMail,jobsResult,deleteResult,metricsResult]=await Promise.all([
   supabase.from('transactional_email_events').select('event_key,invite_id,email_type,status,error_code,sent_at,created_at').order('created_at',{ascending:false}).limit(30),
   supabase.from('note_share_email_events').select('event_key,status,provider_message_id,error_code,sent_at,created_at').order('created_at',{ascending:false}).limit(30),
   supabase.from('maintenance_job_logs').select('id,job_name,status,started_at,completed_at,deleted_notes,deleted_accounts,failed_items,detail').order('started_at',{ascending:false}).limit(20),
   supabase.from('account_deletion_requests').select('id,status,requested_at,scheduled_delete_at,last_error_code').in('status',['pending','processing','blocked']).order('requested_at',{ascending:false}).limit(50),
   supabase.rpc('get_tabuleiro_metrics'),
  ]);
  const failures=[mail.error,noteShareMail.error,jobsResult.error,deleteResult.error,metricsResult.error].filter(Boolean);
  if(failures.length)setError('Parte dos dados operacionais não pôde ser lida. Verifique as permissões administrativas.');
  if(mail.data)setEmails(mail.data as EmailEvent[]);
  if(noteShareMail.data)setNoteShareEmails(noteShareMail.data as NoteShareEmailEvent[]);
  if(jobsResult.data)setJobs(jobsResult.data as MaintenanceEvent[]);
  if(deleteResult.data)setDeletions(deleteResult.data as DeletionEvent[]);
  if(!metricsResult.error){const row=Array.isArray(metricsResult.data)?metricsResult.data[0]:metricsResult.data;setMetric(row as Metric|null)}
  setRefreshedAt(new Date().toLocaleTimeString('pt-BR'));setLoading(false);
 }
 useEffect(()=>{void load()},[]);
 return <section className="network-panel network-operations-panel">
  <div className="network-panel-heading"><div><span className="network-eyebrow">OPERAÇÃO E SEGURANÇA</span><h2>Saúde dos serviços</h2><p>Estados operacionais e metadados. Endereços de e-mail, conteúdo de nota e segredos não são exibidos.</p></div><ShieldCheck size={20}/></div>
  <div className="network-operations-toolbar"><span>{refreshedAt?'Atualizado às '+refreshedAt:'Aguardando primeira leitura'}</span><button className="network-secondary compact" onClick={()=>void load()} disabled={loading}>{loading?<RefreshCw size={13} className="network-spin"/>:<RefreshCw size={13}/>}Atualizar</button></div>
  {error&&<div className="network-alert" role="alert"><AlertTriangle size={15}/>{error}</div>}
  {loading?<div className="network-loading"><RefreshCw size={16} className="network-spin"/>Carregando dados operacionais…</div>:<>
    <div className="network-admin-stats"><article><span>Visualizações Tabuleiro</span><strong>{metric?.total_views??'—'}</strong></article><article><span>Membros únicos com view</span><strong>{metric?.unique_members??'—'}</strong></article><article><span>Perfis públicos</span><strong>{metric?.public_magnates??'—'}</strong></article><article><span>Solicitações de exclusão pendentes</span><strong>{deletions.filter(row=>row.status==='pending').length}</strong></article></div>
    <div className="network-operations-grid">
      <section className="network-operations-subpanel"><div className="network-operations-title"><Mail size={16}/><h3>E-mail transacional</h3></div>{emails.length===0?<p className="network-muted">Nenhum evento registrado ainda.</p>:emails.map(event=><article className="network-operations-row" key={event.event_key}><div><strong>{event.email_type==='welcome'?'Boas-vindas':'Convite aceito'}</strong><small>Convite {event.invite_id.slice(0,8)} · {date(event.sent_at||event.created_at)}</small>{event.error_code&&<small className="network-operations-error">{event.error_code}</small>}</div><span className={'network-operations-status '+event.status}>{event.status==='sent'?'Enviado':event.status==='sending'?'Enviando':'Falhou'}</span></article>)}{noteShareEmails.map(event=><article className="network-operations-row" key={event.event_key}><div><strong>Convite de nota</strong><small>Envio: {date(event.sent_at||event.created_at)}{event.provider_message_id?' · confirmado pelo provedor':''}</small>{event.error_code&&<small className="network-operations-error">{event.error_code}</small>}</div><span className={'network-operations-status '+event.status}>{event.status==='sent'?'Enviado':event.status==='sending'?'Enviando':'Falhou'}</span></article>)}</section>
      <section className="network-operations-subpanel"><div className="network-operations-title"><Activity size={16}/><h3>Manutenção diária</h3></div>{jobs.length===0?<p className="network-muted">Nenhuma execução registrada. Confira o agendamento pg_cron.</p>:jobs.map(job=><article className="network-operations-row" key={job.id}><div><strong>{job.job_name}</strong><small>Início: {date(job.started_at)} · Fim: {date(job.completed_at)}</small><small>Notas removidas: {job.deleted_notes} · Contas: {job.deleted_accounts} · Falhas: {job.failed_items}</small></div><span className={'network-operations-status '+job.status}>{job.status}</span></article>)}</section>
    </div>
    <section className="network-operations-subpanel network-deletion-queue"><div className="network-operations-title"><Clock3 size={16}/><h3>Exclusões agendadas</h3></div>{deletions.length===0?<p className="network-muted">Nenhuma solicitação pendente ou bloqueada.</p>:deletions.map(item=><article className="network-operations-row" key={item.id}><div><strong>{item.status==='pending'?'Em carência':item.status==='processing'?'Em processamento':'Bloqueada'}</strong><small>Solicitada: {date(item.requested_at)} · Prevista: {date(item.scheduled_delete_at)}</small>{item.last_error_code&&<small className="network-operations-error">{item.last_error_code}</small>}</div><span>{item.id.slice(0,8)}</span></article>)}</section>
    <p className="network-privacy-note"><CheckCircle2 size={14}/>Esta visão não expõe conteúdo pessoal e não permite criar eventos de e-mail ou alterar solicitações diretamente.</p>
  </>}
 </section>;
}
