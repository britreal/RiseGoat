import { useEffect, useMemo, useState } from 'react';
import { Archive, Check, ChevronLeft, Clock3, Command, Grid2X2, List, Pin, Plus, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type NoteColor = 'default'|'warm'|'yellow'|'green'|'blue'|'purple'|'pink'|'red';
interface Note { id:string; user_id:string; title:string; content:string; note_type:'text'|'checklist'|'drawing'|'image'|'audio'; color:NoteColor; is_pinned:boolean; is_archived:boolean; is_deleted:boolean; deleted_at:string|null; reminder_at:string|null; created_at:string; updated_at:string; }

const colors: {key:NoteColor; label:string; className:string}[] = [
  {key:'default',label:'Neutro',className:'bg-white dark:bg-[#191919]'}, {key:'warm',label:'Areia',className:'bg-[#f7efe4] dark:bg-[#2a251f]'},
  {key:'yellow',label:'Amarelo',className:'bg-[#fff8cf] dark:bg-[#302e20]'}, {key:'green',label:'Verde',className:'bg-[#e8f4e8] dark:bg-[#202c22]'},
  {key:'blue',label:'Azul',className:'bg-[#e9f2fb] dark:bg-[#202933]'}, {key:'purple',label:'Lilás',className:'bg-[#f0ebf8] dark:bg-[#282331]'},
  {key:'pink',label:'Rosa',className:'bg-[#faebef] dark:bg-[#302329]'}, {key:'red',label:'Coral',className:'bg-[#f9e9e5] dark:bg-[#30221f]'},
];

export function NotesPage() {
  const { user } = useAuth();
  const [notes,setNotes]=useState<Note[]>([]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [query,setQuery]=useState('');
  const [view,setView]=useState<'grid'|'list'>('grid');
  const [filter,setFilter]=useState<'all'|'pinned'|'archive'|'trash'>('all');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [theme,setTheme]=useState<'system'|'light'|'dark'>(()=>(localStorage.getItem('risegoat-notes-theme') as 'system'|'light'|'dark')||'system');
  const selected=notes.find(n=>n.id===selectedId) ?? null;

  useEffect(()=>{ if(!user) return; void loadNotes(); },[user]);

  useEffect(()=>{
    const handler=(e:KeyboardEvent)=>{
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault(); document.getElementById('notes-search')?.focus();}
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='n'){e.preventDefault(); void createNote();}
      if(e.key==='Escape'&&selectedId) setSelectedId(null);
    };
    window.addEventListener('keydown',handler); return ()=>window.removeEventListener('keydown',handler);
  });

  async function loadNotes(){
    if(!user) return; setLoading(true);
    const {data,error}=await supabase.from('notes').select('*').eq('user_id',user.id).order('is_pinned',{ascending:false}).order('updated_at',{ascending:false});
    if(!error) setNotes((data??[]) as Note[]); else console.error(error);
    setLoading(false);
  }

  async function createNote(){
    if(!user) return;
    const {data,error}=await supabase.from('notes').insert({user_id:user.id,title:'',content:'',note_type:'text'}).select().single();
    if(error){console.error(error);return;}
    const note=data as Note; setNotes(current=>[note,...current]); setSelectedId(note.id);
  }

  async function updateNote(patch:Partial<Note>){
    if(!selected) return; setSaving(true);
    setNotes(current=>current.map(n=>n.id===selected.id?{...n,...patch,updated_at:new Date().toISOString()}:n));
    const {error}=await supabase.from('notes').update(patch).eq('id',selected.id);
    if(error){console.error(error); await loadNotes();}
    setSaving(false);
  }

  async function deleteNote(){ if(!selected) return; await updateNote({is_deleted:true,deleted_at:new Date().toISOString()}); setSelectedId(null); }
  async function restoreNote(note:Note){ const {error}=await supabase.from('notes').update({is_deleted:false,deleted_at:null,is_archived:false}).eq('id',note.id); if(!error) setNotes(c=>c.map(n=>n.id===note.id?{...n,is_deleted:false,deleted_at:null,is_archived:false}:n)); }

  const visible=useMemo(()=>notes.filter(n=>{
    if(filter==='trash') return n.is_deleted;
    if(n.is_deleted) return false;
    if(filter==='pinned') return n.is_pinned;
    if(filter==='archive') return n.is_archived;
    return !n.is_archived;
  }).filter(n=>!query || (n.title+' '+n.content).toLocaleLowerCase().includes(query.toLocaleLowerCase())),[notes,filter,query]);

  useEffect(()=>{localStorage.setItem('risegoat-notes-theme',theme)},[theme]);
  const dark = theme==='dark' || (theme==='system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return <div className={cn('notes-shell',dark&&'is-dark')}>
    <aside className="notes-sidebar">
      <div className="notes-brand"><div><strong>Notas</strong><span>RiseGoat</span></div><button className="notes-icon-button mobile-only" aria-label="Fechar nota" onClick={()=>setSelectedId(null)}><X size={17}/></button></div>
      <button className="notes-new" onClick={()=>void createNote()}><Plus size={17}/> Nova nota <kbd>⌘N</kbd></button>
      <nav className="notes-nav">
        {[['all','Todas',Grid2X2],['pinned','Fixadas',Pin],['archive','Arquivo',Archive],['trash','Lixeira',Trash2]].map(([key,label,Icon])=><button key={key as string} className={cn('notes-nav-item',filter===key&&'active')} onClick={()=>{setFilter(key as typeof filter);setSelectedId(null)}}><Icon size={16}/>{label}</button>)}
      </nav>
      <div className="notes-sidebar-foot"><span>{notes.filter(n=>!n.is_deleted).length} notas</span><span className="notes-status-dot"/>Sincronizado</div>
    </aside>
    <main className="notes-main">
      <header className="notes-toolbar">
        <div className="notes-search"><Search size={17}/><input id="notes-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar notas..." aria-label="Buscar notas"/><kbd><Command size={11}/>K</kbd></div>
        <div className="notes-toolbar-actions"><button className={cn('notes-icon-button',view==='grid'&&'active')} onClick={()=>setView('grid')} aria-label="Grade"><Grid2X2 size={17}/></button><button className={cn('notes-icon-button',view==='list'&&'active')} onClick={()=>setView('list')} aria-label="Lista"><List size={17}/></button><button className="notes-primary" onClick={()=>void createNote()}><Plus size={16}/><span>Nova</span></button><button className="notes-icon-button" onClick={()=>setTheme(theme==='system'?'dark':theme==='dark'?'light':'system')} aria-label={`Tema: ${theme}`}>{dark?'☾':'☀'}</button></div>
      </header>
      <section className={cn('notes-content',view==='list'&&'list-view')}>
        <div className="notes-heading"><div><p className="eyebrow">Seu espaço</p><h1>{filter==='trash'?'Lixeira':filter==='pinned'?'Fixadas':filter==='archive'?'Arquivo':'Todas as notas'}</h1></div><span>{visible.length}</span></div>
        {loading ? <div className="notes-empty">Carregando suas notas…</div> : visible.length===0 ? <div className="notes-empty"><div className="empty-orb"><Plus size={20}/></div><h2>{query?'Nenhuma nota encontrada':'Comece com uma nota'}</h2><p>{query?'Tente outro termo de busca.':'Capture uma ideia, lista ou pensamento.'}</p>{filter!=='trash'&&<button className="notes-primary" onClick={()=>void createNote()}><Plus size={16}/> Criar nota</button>}</div> :
          <div className="notes-grid">{visible.map(note=><article key={note.id} className={cn('note-card',colors.find(c=>c.key===note.color)?.className)} onClick={()=>setSelectedId(note.id)}><div className="note-card-top">{note.is_pinned&&<Pin size={14}/>}<span>{new Date(note.updated_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</span></div><h3>{note.title||'Sem título'}</h3><p>{note.content||'Comece a escrever…'}</p>{note.is_deleted&&<div className="note-card-actions"><button onClick={e=>{e.stopPropagation();void restoreNote(note)}}><Check size={14}/> Restaurar</button></div>}</article>)}</div>}
      </section>
    </main>
    {selected&&<div className="notes-editor-overlay" onMouseDown={e=>{if(e.currentTarget===e.target)setSelectedId(null)}}><section className={cn('notes-editor',colors.find(c=>c.key===selected.color)?.className)}><header><button className="notes-icon-button" onClick={()=>setSelectedId(null)} aria-label="Fechar"><ChevronLeft size={18}/></button><div className="editor-actions"><span>{saving?'Salvando…':'Salvo'}</span><button className={cn('notes-icon-button',selected.is_pinned&&'active')} onClick={()=>void updateNote({is_pinned:!selected.is_pinned})} aria-label="Fixar"><Pin size={17}/></button><button className="notes-icon-button" onClick={()=>void updateNote({is_archived:true})} aria-label="Arquivar"><Archive size={17}/></button><button className="notes-icon-button danger" onClick={()=>void deleteNote()} aria-label="Excluir"><Trash2 size={17}/></button></div></header><input className="notes-title-input" value={selected.title} onChange={e=>void updateNote({title:e.target.value})} placeholder="Título"/><textarea className="notes-body-input" value={selected.content} onChange={e=>void updateNote({content:e.target.value})} placeholder="Escreva o que estiver pensando…"/><footer><div className="color-picker">{colors.map(c=><button key={c.key} title={c.label} aria-label={c.label} className={cn('color-dot',c.className,selected.color===c.key&&'selected')} onClick={()=>void updateNote({color:c.key})}/>)}</div><span>{selected.content.trim()?selected.content.trim().split(/\s+/).length:0} palavras</span></footer></section></div>}
  </div>;
}
