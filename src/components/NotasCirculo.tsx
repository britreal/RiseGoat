import { useEffect, useState } from 'react';
import { Check, FileText, Loader2, Plus } from 'lucide-react';
import { addMagnateCircleNote, getMagnateCircleNotes } from '@/lib/tabuleiro';
import type { MagnateCircleNote, MemberCircle } from '@/types/tabuleiro';
import '@/lib/tabuleiro.css';

type Props={magnateId:string;userId:string;circles:MemberCircle[]};

export function NotasCirculo({magnateId,userId,circles}:Props){
  const [notes,setNotes]=useState<MagnateCircleNote[]>([]);
  const [circleId,setCircleId]=useState(circles[0]?.id||'');
  const [content,setContent]=useState('');
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const circleKey=circles.map(circle=>circle.id).join(',');

  async function load(){
    if(!circleKey){setNotes([]);return}
    setLoading(true);setError('');
    try{setNotes(await getMagnateCircleNotes(magnateId,circleKey.split(','))}
    catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar as notas do círculo.')}
    finally{setLoading(false)}
  }
  useEffect(()=>{if(!circles.some(circle=>circle.id===circleId))setCircleId(circles[0]?.id||'')},[circleKey]);
  useEffect(()=>{void load()},[magnateId,circleKey]);

  async function submit(e:React.FormEvent){
    e.preventDefault();if(!content.trim()||!circleId)return;
    setSaving(true);setError('');
    try{
      await addMagnateCircleNote(magnateId,circleId,userId,content);
      setContent('');await load();
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar a nota.')}
    finally{setSaving(false)}
  }

  if(!circles.length)return <section className="tabuleiro-circle-notes"><div className="tabuleiro-section-heading"><div><span className="tabuleiro-eyebrow">NOTAS PRIVADAS</span><h2>Contexto do seu círculo</h2></div><FileText size={19}/></div><p className="tabuleiro-muted">Entre em um círculo para registrar notas colaborativas. Este espaço não publica conteúdo para outros membros.</p></section>;

  return <section className="tabuleiro-circle-notes">
    <div className="tabuleiro-section-heading"><div><span className="tabuleiro-eyebrow">SOMENTE MEMBROS DO CÍRCULO</span><h2>Notas de contexto</h2><p>Estas notas não ficam públicas e só são visíveis para os membros aceitos do círculo.</p></div><FileText size={19}/></div>
    <form className="tabuleiro-note-form" onSubmit={e=>void submit(e)}>
      <label>Círculo<select value={circleId} onChange={e=>setCircleId(e.target.value)} required>{circles.map(circle=><option key={circle.id} value={circle.id}>{circle.name}</option>)}</select></label>
      <label>Nota<textarea value={content} onChange={e=>setContent(e.target.value)} rows={3} maxLength={6000} placeholder="Registre um contexto relevante, uma hipótese ou uma pergunta para seu círculo." required/></label>
      <button className="tabuleiro-primary" disabled={saving||!content.trim()}>{saving?<Loader2 size={14} className="tabuleiro-spin"/>:<Plus size={14}/>}Adicionar nota</button>
    </form>
    {error&&<p className="tabuleiro-error" role="alert">{error}</p>}
    {loading?<div className="tabuleiro-inline-loading"><Loader2 size={16} className="tabuleiro-spin"/>Carregando notas...</div>:notes.filter(note=>circles.some(circle=>circle.id===note.circle_id)).length===0?<div className="tabuleiro-note-empty">Ainda não há notas neste perfil para os seus círculos.</div>:<div className="tabuleiro-circle-note-list">{notes.map(note=><article className="tabuleiro-circle-note" key={note.id}><div><strong>{circles.find(circle=>circle.id===note.circle_id)?.name||'Círculo'}</strong><time>{new Date(note.atualizado_em).toLocaleDateString('pt-BR')}</time></div><p>{note.conteudo}</p><small>{note.autor_id===userId?'Criada por você':'Nota colaborativa'}</small></article>)}</div>}
  </section>;
}
