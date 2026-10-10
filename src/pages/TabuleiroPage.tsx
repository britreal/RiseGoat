import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, Download, Eye, EyeOff, FilePlus2, Loader2, Network, Plus, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { FiltrosTabuleiro } from '@/components/FiltrosTabuleiro';
import { MagnateCard } from '@/components/MagnateCard';
import { MagnateDetalhe } from '@/components/MagnateDetalhe';
import { TabuleiroGrafo } from '@/components/TabuleiroGrafo';
import { FEATURES } from '@/lib/features';
import {
  getMagnateDetail, getMemberCircles, getTabuleiroMemberMetrics, getTabuleiroMetrics,
  insertMagnate, listMagnates, recordMagnateView, updateMagnatePublicVisibility,
} from '@/lib/tabuleiro';
import { supabase } from '@/lib/supabase';
import type { Magnate, MagnateConnection, MagnateSector, MagnateViewMetric, MemberCircle, TabuleiroFilters } from '@/types/tabuleiro';
import '@/lib/tabuleiro.css';

type Props={slug?:string;view?:'list'|'graph'};
type Metrics={total_views:number;authenticated_views:number;unique_members:number;total_magnates:number;public_magnates:number};
const INITIAL_LIMIT=24;
const sectors:MagnateSector[]=['tech','financas','imobiliario','energia','industria','midia','saude','varejo','logistica','agro','educacao','outros'];
function initialFilters():TabuleiroFilters {
  const params=new URLSearchParams(window.location.search);
  return {
    query:params.get('q')||'',setor:params.get('setor')||'',pais:params.get('pais')||'',
    regiao:params.get('regiao')||'',tipo:params.get('tipo')||'',patrimonio_faixa:params.get('patrimonio')||'',
  };
}
function syncFilterQuery(filters:TabuleiroFilters){
  const params=new URLSearchParams();
  const values:Record<string,string>={q:filters.query,setor:filters.setor,pais:filters.pais,regiao:filters.regiao,tipo:filters.tipo,patrimonio:filters.patrimonio_faixa};
  Object.entries(values).forEach(([key,value])=>{if(value.trim())params.set(key,value.trim())});
  const suffix=params.toString();
  window.history.replaceState({},'',window.location.pathname+(suffix?'?'+suffix:''));
}
function csvCell(value:unknown):string{
  const text=value===null||value===undefined?'':String(value);
  return '"'+text.replace(/"/g,'""')+'"';
}
function downloadCsv(rows:Array<Record<string,unknown>>,filename:string){
  if(!rows.length)return;
  const keys=Object.keys(rows[0]);
  const csv=[keys.map(csvCell).join(','),...rows.map(row=>keys.map(key=>csvCell(row[key])).join(','))].join('\r\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function slugify(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)}

export function TabuleiroPage({slug,view='list'}:Props){
  const {user}=useAuth();
  const [filters,setFilters]=useState<TabuleiroFilters>(initialFilters);
  const [rows,setRows]=useState<Magnate[]>([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(false);
  const [loadingMore,setLoadingMore]=useState(false);
  const [detail,setDetail]=useState<Awaited<ReturnType<typeof getMagnateDetail>>>(null);
  const [circles,setCircles]=useState<MemberCircle[]>([]);
  const [pageError,setPageError]=useState('');
  const [isAdmin,setIsAdmin]=useState(false);
  const [adminPanel,setAdminPanel]=useState(false);
  const [metrics,setMetrics]=useState<Metrics|null>(null);
  const [memberMetrics,setMemberMetrics]=useState<MagnateViewMetric[]>([]);
  const [loadingMetrics,setLoadingMetrics]=useState(false);
  const [graphNodes,setGraphNodes]=useState<Magnate[]>([]);
  const [graphEdges,setGraphEdges]=useState<MagnateConnection[]>([]);
  const [graphLoading,setGraphLoading]=useState(false);
  const [adding,setAdding]=useState(false);
  const [newName,setNewName]=useState('');
  const [newSlug,setNewSlug]=useState('');
  const [newSector,setNewSector]=useState<MagnateSector>('tech');
  const [newCountry,setNewCountry]=useState('');
  const [newRegion,setNewRegion]=useState('');
  const [newBio,setNewBio]=useState('');
  const [newSource,setNewSource]=useState('');
  const isMember=Boolean(user);

  function navigate(path:string){window.history.pushState({},'',path);window.dispatchEvent(new PopStateEvent('popstate'))}
  function updateFilters(next:TabuleiroFilters){setFilters(next);syncFilterQuery(next)}
  function backToList(){navigate('/tabuleiro'+window.location.search)}

  useEffect(()=>{let cancelled=false;async function checkAdmin(){
    if(!user){setIsAdmin(false);return}
    try{const {data,error}=await supabase.rpc('is_admin');if(!cancelled&&!error)setIsAdmin(Boolean(data))}
    catch{if(!cancelled)setIsAdmin(false)}
  }void checkAdmin();return()=>{cancelled=true}},[user?.id]);

  useEffect(()=>{
    if(!FEATURES.tabuleiro||slug||view==='graph')return;
    let cancelled=false;setLoading(true);setPageError('');
    listMagnates(filters,0,INITIAL_LIMIT,isMember).then(result=>{
      if(cancelled)return;setRows(result.rows);setTotal(result.count);
    }).catch(error=>{if(!cancelled)setPageError(error instanceof Error?error.message:'Não foi possível carregar o Tabuleiro.')})
      .finally(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[slug,view,isMember,user?.id,filters.query,filters.setor,filters.pais,filters.regiao,filters.tipo,filters.patrimonio_faixa]);

  useEffect(()=>{
    if(!FEATURES.tabuleiro||!slug||slug==='grafo')return;
    let cancelled=false;setDetail(null);setCircles([]);setLoading(true);setPageError('');
    Promise.all([
      getMagnateDetail(slug,isMember),
      user?getMemberCircles(user.id):Promise.resolve([]),
    ]).then(async ([result,memberCircles])=>{
      if(cancelled)return;
      setDetail(result);setCircles(memberCircles);
      if(result){try{await recordMagnateView(result.magnate.id)}catch{/* Detail loading must not depend on analytics. */}}
      if(!result)setPageError('Este perfil não existe ou não está disponível publicamente.');
    }).catch(error=>{if(!cancelled)setPageError(error instanceof Error?error.message:'Não foi possível abrir este perfil.')})
      .finally(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[slug,isMember,user?.id]);

  useEffect(()=>{
    if(!FEATURES.tabuleiro||view!=='graph'||slug)return;
    let cancelled=false;setGraphLoading(true);setPageError('');
    Promise.all([
      supabase.from('magnates').select('*').order('nome').range(0,499),
      supabase.from('magnate_conexoes').select('*').order('criado_em',{ascending:false}).limit(1500),
    ]).then(([nodesResult,edgesResult])=>{
      if(cancelled)return;
      if(nodesResult.error)throw nodesResult.error;
      if(edgesResult.error)throw edgesResult.error;
      const loaded=(nodesResult.data||[]) as Magnate[];
      setGraphNodes(isMember?loaded:loaded.filter(row=>row.visivel_publico));
      setGraphEdges((edgesResult.data||[]) as MagnateConnection[]);
    }).catch(error=>{if(!cancelled)setPageError(error instanceof Error?error.message:'Não foi possível construir o grafo.')})
      .finally(()=>{if(!cancelled)setGraphLoading(false)});
    return()=>{cancelled=true};
  },[slug,view,isMember,user?.id]);

  useEffect(()=>{
    if(!user||!isAdmin||!adminPanel)return;
    let cancelled=false;setLoadingMetrics(true);
    void supabase.rpc('log_admin_access',{p_section:'tabuleiro'});
    Promise.all([getTabuleiroMetrics(),getTabuleiroMemberMetrics()]).then(([summary,members])=>{
      if(cancelled)return;setMetrics(summary);setMemberMetrics(members);
    }).catch(error=>{if(!cancelled)setPageError(error instanceof Error?error.message:'Não foi possível carregar métricas administrativas.')})
      .finally(()=>{if(!cancelled)setLoadingMetrics(false)});
    return()=>{cancelled=true};
  },[user?.id,isAdmin,adminPanel]);

  async function loadMore(){
    setLoadingMore(true);setPageError('');
    try{const result=await listMagnates(filters,rows.length,INITIAL_LIMIT,isMember);setRows(current=>current.concat(result.rows));setTotal(result.count)}
    catch(error){setPageError(error instanceof Error?error.message:'Não foi possível carregar mais perfis.')}
    finally{setLoadingMore(false)}
  }
  async function setVisibility(magnate:Magnate,visible:boolean){
    try{
      await updateMagnatePublicVisibility(magnate.id,visible);
      setDetail(current=>current&&current.magnate.id===magnate.id?{...current,magnate:{...current.magnate,visivel_publico:visible}}:current);
      setRows(current=>current.map(row=>row.id===magnate.id?{...row,visivel_publico:visible}:row));
      setPageError('');
    }catch(error){setPageError(error instanceof Error?error.message:'Não foi possível alterar a visibilidade.')}
  }
  async function addMagnate(event:FormEvent){
    event.preventDefault();if(!newName.trim())return;setAdding(true);setPageError('');
    const slug=slugify(newSlug.trim()||newName);
    const source=newSource.trim();
    if(source&&!/^https?:\/\//i.test(source)){setPageError('A fonte deve começar com https:// ou http://');setAdding(false);return}
    try{
      await insertMagnate({
        nome:newName.trim(),slug,setor:newSector,pais:newCountry.trim()||null,regiao:newRegion.trim()||null,
        bio_curta:newBio.trim()||null,fonte_principal:source||null,fontes:source?[{title:'Fonte principal',url:source}]:[],
        tags:[],visivel_publico:false,tipo:'indefinido',atividade:'ativo',
      });
      setNewName('');setNewSlug('');setNewCountry('');setNewRegion('');setNewBio('');setNewSource('');
      const result=await listMagnates(filters,0,INITIAL_LIMIT,isMember);setRows(result.rows);setTotal(result.count);
    }catch(error){setPageError(error instanceof Error?error.message:'Não foi possível adicionar o perfil.')}
    finally{setAdding(false)}
  }
  function exportMemberMetrics(){
    downloadCsv(memberMetrics.map(row=>({user_id:row.user_id,total_views:row.total_views,distinct_magnates:row.distinct_magnates,last_view_at:row.last_view_at||''})),'risegoat-tabuleiro-metricas-'+new Date().toISOString().slice(0,10)+'.csv');
  }

  if(!FEATURES.tabuleiro)return <main className="tabuleiro-shell"><div className="tabuleiro-empty"><Network size={26}/><strong>Tabuleiro em preparação</strong><p>Esta seção está desativada pela configuração de recursos. Os perfis ainda não ficam públicos até passarem pela curadoria.</p><button className="tabuleiro-secondary" onClick={()=>navigate('/')}><ArrowLeft size={14}/>Voltar</button></div></main>;
  if(slug&&slug!=='grafo'&&loading&&!detail)return <main className="tabuleiro-shell"><div className="tabuleiro-loading"><Loader2 size={19} className="tabuleiro-spin"/>Carregando perfil…</div></main>;
  if(slug&&slug!=='grafo'&&detail)return <MagnateDetalhe magnate={detail.magnate} companies={detail.companies} connections={detail.connections} connectedMagnates={detail.connectedMagnates} isMember={isMember} userId={user?.id} circles={circles} onBack={backToList} onOpen={next=>navigate('/tabuleiro/'+encodeURIComponent(next))} onSetVisibility={isAdmin?visible=>void setVisibility(detail.magnate,visible):undefined}/>;

  return <main className="tabuleiro-shell">
    <header className="tabuleiro-header"><a className="tabuleiro-brand" href="/" onClick={e=>{e.preventDefault();navigate('/')}}><span className="tabuleiro-mark">R</span><span><strong>RiseGoat</strong><small>Tabuleiro de relações</small></span></a><div className="tabuleiro-header-actions">{user?<button className="tabuleiro-secondary" onClick={()=>navigate('/notes')}><ArrowLeft size={14}/>Notas</button>:<button className="tabuleiro-secondary" onClick={()=>navigate('/auth?mode=waitlist')}>Solicitar convite</button>}<button className="tabuleiro-secondary" onClick={()=>navigate(view==='graph'?'/tabuleiro'+window.location.search:'/tabuleiro/grafo')}><Network size={14}/>{view==='graph'?'Ver perfis':'Abrir grafo'}</button>{isAdmin&&<button className={adminPanel?'tabuleiro-primary':'tabuleiro-secondary'} onClick={()=>setAdminPanel(v=>!v)}><ShieldCheck size={14}/>{adminPanel?'Fechar admin':'Admin'}</button>}</div></header>
    <section className="tabuleiro-hero"><div><span className="tabuleiro-eyebrow">MAPA PÚBLICO COM CURADORIA</span><h1>Entenda as relações por trás das organizações.</h1><p>Perfis, empresas, fontes e conexões verificadas. Informações são estimativas, devem ter referência e só ficam públicas após curadoria manual.</p></div><div className="tabuleiro-hero-stats"><span><Users size={14}/>{total} perfis na busca</span><span><ShieldCheck size={14}/>{isMember?'Acesso de membro':'Somente perfis públicos'}</span></div></section>
    {pageError&&<div className="tabuleiro-error" role="alert"><span>{pageError}</span><button onClick={()=>setPageError('')} aria-label="Fechar aviso"><X size={14}/></button></div>}
    {isAdmin&&adminPanel&&<section className="tabuleiro-admin-panel">
      <div className="tabuleiro-section-heading"><div><span className="tabuleiro-eyebrow">SOMENTE ADMINISTRADOR</span><h2>Curadoria e métricas</h2><p>Os dados de visualização são agregados. Este painel não apresenta conteúdo de notas privadas.</p></div><BarChart3 size={20}/></div>
      {loadingMetrics?<div className="tabuleiro-inline-loading"><Loader2 size={16} className="tabuleiro-spin"/>Carregando métricas…</div>:metrics&&<><div className="tabuleiro-metrics-grid"><article><span>Visualizações</span><strong>{metrics.total_views}</strong></article><article><span>Visualizações autenticadas</span><strong>{metrics.authenticated_views}</strong></article><article><span>Membros com visualização</span><strong>{metrics.unique_members}</strong></article><article><span>Perfis públicos / total</span><strong>{metrics.public_magnates} / {metrics.total_magnates}</strong></article></div><div className="tabuleiro-admin-export"><span>{memberMetrics.length} membros com atividade registrada</span><button className="tabuleiro-secondary" onClick={exportMemberMetrics}><Download size={14}/>Exportar CSV</button></div><div className="tabuleiro-admin-member-table"><div className="tabuleiro-admin-table-row head"><span>Membro (ID)</span><span>Perfis vistos</span><span>Perfis distintos</span><span>Última visualização</span></div>{memberMetrics.map(row=><div className="tabuleiro-admin-table-row" key={row.user_id}><span>{row.user_id}</span><span>{row.total_views}</span><span>{row.distinct_magnates}</span><span>{row.last_view_at?new Date(row.last_view_at).toLocaleString('pt-BR'):'—'}</span></div>)}</div></>}
      <form className="tabuleiro-admin-add-form" onSubmit={e=>void addMagnate(e)}><div><span className="tabuleiro-eyebrow">CADASTRAR PERFIL PARA CURADORIA</span><h3>Novo registro</h3><p>Começa privado. Marque como público somente após revisar a biografia, as fontes e as relações.</p></div><div className="tabuleiro-admin-form-grid"><label>Nome<input value={newName} onChange={e=>{setNewName(e.target.value);if(!newSlug)setNewSlug(slugify(e.target.value))}} maxLength={160} required/></label><label>Slug<input value={newSlug} onChange={e=>setNewSlug(slugify(e.target.value))} maxLength={90} required/></label><label>Setor<select value={newSector} onChange={e=>setNewSector(e.target.value as MagnateSector)}>{sectors.map(sector=><option value={sector} key={sector}>{sector}</option>)}</select></label><label>País<input value={newCountry} onChange={e=>setNewCountry(e.target.value)} maxLength={80}/></label><label>Região<input value={newRegion} onChange={e=>setNewRegion(e.target.value)} maxLength={80}/></label><label>Fonte principal (URL)<input value={newSource} onChange={e=>setNewSource(e.target.value)} type="url" placeholder="https://..." /></label><label className="wide">Biografia curta<textarea value={newBio} onChange={e=>setNewBio(e.target.value)} rows={3} maxLength={800}/></label></div><button className="tabuleiro-primary" disabled={adding}>{adding?<Loader2 size={14} className="tabuleiro-spin"/>:<FilePlus2 size={14}/>}Salvar como privado</button></form>
    </section>}
    {view==='graph'?<><div className="tabuleiro-list-toolbar"><div><span className="tabuleiro-eyebrow">GRAFO DE CONEXÕES</span><h2>Quem se relaciona com quem</h2></div>{graphLoading&&<Loader2 size={16} className="tabuleiro-spin"/>}</div><TabuleiroGrafo nodes={graphNodes} edges={graphEdges} onOpen={next=>navigate('/tabuleiro/'+encodeURIComponent(next))}/></>:slug==='grafo'?<div className="tabuleiro-loading"><Loader2 size={18} className="tabuleiro-spin"/>Preparando grafo…</div>:<><FiltrosTabuleiro value={filters} onChange={updateFilters} total={total} loading={loading}/><div className="tabuleiro-list-toolbar"><div><span className="tabuleiro-eyebrow">PERFIS E ORGANIZAÇÕES</span><h2>{filters.query?'Resultados da busca':'Perfis em curadoria'}</h2></div><span className="tabuleiro-result-count">{rows.length} de {total}</span></div>{loading?<div className="tabuleiro-loading"><Loader2 size={18} className="tabuleiro-spin"/>Carregando perfis…</div>:rows.length===0?<div className="tabuleiro-empty"><Network size={25}/><strong>Nenhum perfil nesta seleção</strong><p>Amplie os filtros ou aguarde a curadoria dos primeiros registros. Nenhum perfil não verificado é exibido publicamente.</p></div>:<div className="tabuleiro-card-grid">{rows.map(magnate=><div key={magnate.id}><MagnateCard magnate={magnate} onOpen={next=>navigate('/tabuleiro/'+encodeURIComponent(next)+window.location.search)}/>{isAdmin&&<div className="tabuleiro-visibility-control"><span>{magnate.visivel_publico?'Visível no site':'Privado até curadoria'}</span><button onClick={()=>void setVisibility(magnate,!magnate.visivel_publico)} title={magnate.visivel_publico?'Retirar do público':'Publicar perfil'}>{magnate.visivel_publico?<EyeOff size={13}/>:<Eye size={13}/>} {magnate.visivel_publico?'Tornar privado':'Marcar como público'}</button></div>}</div>)}</div>}{rows.length<total&&<div className="tabuleiro-load-more"><button className="tabuleiro-secondary" onClick={()=>void loadMore()} disabled={loadingMore}>{loadingMore?<Loader2 size={14} className="tabuleiro-spin"/>:<Plus size={14}/>}Carregar mais perfis <ArrowRight size={13}/></button></div>}</>}

    <footer className="tabuleiro-footer"><span>RiseGoat · Tabuleiro</span><span>Informação pública, curada e rastreável.</span><button onClick={()=>navigate('/auth')}>{user?'Área de membro':'Acesso por convite'} <ArrowRight size={13}/></button></footer>
  </main>;
}
