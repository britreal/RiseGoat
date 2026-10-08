import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background, BackgroundVariant, Controls, Handle, MiniMap, Panel, Position, ReactFlow, useReactFlow,
  type Connection, type Node, type NodeProps, type OnEdgesDelete,
} from '@xyflow/react';
import { ArrowLeft, ExternalLink, Link2, Maximize2, Search, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import '@/lib/graph.css';
import '@xyflow/react/dist/style.css';

type NoteColor = 'default'|'warm'|'yellow'|'green'|'blue'|'purple'|'pink'|'red'|'orange'|'teal'|'indigo'|'gray';
type NoteType = 'text'|'checklist'|'image'|'drawing'|'audio';
type Note = { id:string; title:string; content:string; note_type:NoteType; color:NoteColor; is_pinned:boolean; is_deleted:boolean; folder_id:string|null; updated_at:string };
type Folder = { id:string; name:string };
type Label = { id:string; name:string; color:NoteColor };
type LabelLink = { note_id:string; label_id:string };
type Checklist = { note_id:string; is_completed:boolean };
type NoteLink = { id:string; source_note_id:string; target_note_id:string; relation_type:string; created_at:string };
type Point = { x:number; y:number };

type NoteNodeData = {
  title:string; preview:string; color:NoteColor; noteType:NoteType; isPinned:boolean;
  labelNames:string[]; checklistDone:number; checklistTotal:number; onOpen:()=>void; onSelect:()=>void;
};
type NoteNode = Node<NoteNodeData, 'note'>;

const relationLabels:Record<string,string> = {
  related:'Relacionada', continuation:'Continuação', part_of:'Parte de', reference:'Referência', idea:'Ideia', next_step:'Próximo passo',
};
const palette:Record<NoteColor,string> = {
  default:'#ffffff', warm:'#f4e5d2', yellow:'#fff2ad', green:'#dcefdc', blue:'#d9e9f7', purple:'#e8def7',
  pink:'#f5dce7', red:'#f3d4cf', orange:'#ffe1c7', teal:'#d7efe9', indigo:'#dce2f8', gray:'#e8e9e7',
};
const plain = (html:string) => html.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();

function NoteNode({ data, selected }: NodeProps<NoteNode>) {
  const total = data.checklistTotal;
  const done = data.checklistDone;
  return (
    <div
      className={cn('graph-note-node', selected && 'is-selected', data.isPinned && 'is-pinned')}
      style={{ '--graph-note-color': palette[data.color] } as React.CSSProperties}
      onClick={(event)=>{ event.stopPropagation(); data.onSelect(); }}
      onDoubleClick={(event)=>{ event.stopPropagation(); data.onOpen(); }}
      title="Clique para selecionar. Duplo clique para abrir."
    >
      <Handle type="target" position={Position.Left} className="graph-handle" />
      <Handle type="source" position={Position.Right} className="graph-handle" />
      <div className="graph-node-topline">
        <span className="graph-node-dot" />
        <span className="graph-node-type">{data.noteType === 'checklist' ? 'Checklist' : 'Nota'}</span>
        {data.isPinned && <span className="graph-node-pin">Fixada</span>}
      </div>
      <strong>{data.title || 'Sem título'}</strong>
      {data.preview && <p>{data.preview}</p>}
      <div className="graph-node-meta">
        {data.labelNames.slice(0,2).map(label=><span key={label}>#{label}</span>)}
        {total > 0 && <span>✓ {done}/{total}</span>}
      </div>
    </div>
  );
}
const nodeTypes = { note: NoteNode };

function GraphViewport({
  onViewportChange,
  initialViewport,
}: {
  onViewportChange:(viewport:{x:number;y:number;zoom:number})=>void;
  initialViewport:{x:number;y:number;zoom:number}|null;
}) {
  const rf = useReactFlow();
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (initialViewport) rf.setViewport(initialViewport, { duration:0 });
      else rf.fitView({ padding:0.24, duration:240 });
    }, 50);
    return () => window.clearTimeout(id);
  }, [rf, initialViewport]);
  useEffect(() => {
    const handler = () => rf.fitView({ padding:0.24, duration:240 });
    window.addEventListener('graph-fit-view', handler);
    return () => window.removeEventListener('graph-fit-view', handler);
  }, [rf]);
  useEffect(() => {
    const handler = () => onViewportChange(rf.getViewport());
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [rf, onViewportChange]);
  return null;
}

export function GraphPage() {
  const { user } = useAuth();
  const [notes,setNotes] = useState<Note[]>([]);
  const [folders,setFolders] = useState<Folder[]>([]);
  const [labels,setLabels] = useState<Label[]>([]);
  const [labelLinks,setLabelLinks] = useState<LabelLink[]>([]);
  const [checkItems,setCheckItems] = useState<Checklist[]>([]);
  const [noteLinks,setNoteLinks] = useState<NoteLink[]>([]);
  const [positions,setPositions] = useState<Record<string,Point>>({});
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [query,setQuery] = useState('');
  const [folderFilter,setFolderFilter] = useState('all');
  const [labelFilter,setLabelFilter] = useState('all');
  const [mode,setMode] = useState<'global'|'local'>('global');
  const [depth,setDepth] = useState<1|2|3>(1);
  const [selectedId,setSelectedId] = useState<string|null>(null);
  const [stateId,setStateId] = useState<string|null>(null);
  const [savedViewport,setSavedViewport] = useState<{x:number;y:number;zoom:number}|null>(null);
  const viewportRef = useRef({ x:0, y:0, zoom:1 });
  const saveTimerRef = useRef<number|null>(null);

  const openNote = useCallback((id:string) => {
    window.history.pushState({}, '', '/notes?note='+encodeURIComponent(id));
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [n,f,l,ll,c,e,s] = await Promise.all([
      supabase.from('notes').select('id,title,content,note_type,color,is_pinned,is_deleted,folder_id,updated_at').eq('is_deleted',false).order('updated_at',{ascending:false}),
      supabase.from('note_folders').select('id,name').eq('user_id',user.id).order('position'),
      supabase.from('note_labels').select('id,name,color').eq('user_id',user.id).order('name'),
      supabase.from('note_label_links').select('note_id,label_id'),
      supabase.from('note_checklist_items').select('note_id,is_completed'),
      supabase.from('note_links').select('id,source_note_id,target_note_id,relation_type,created_at').order('created_at'),
      supabase.from('user_state').select('id,data').eq('user_id',user.id).eq('kind','notes_graph').limit(1),
    ]);
    const firstError = n.error || f.error || l.error || ll.error || c.error || e.error || s.error;
    if (firstError) {
      setError(firstError.message || 'Não foi possível carregar o mapa.');
      setLoading(false);
      return;
    }
    setNotes((n.data ?? []) as Note[]);
    setFolders((f.data ?? []) as Folder[]);
    setLabels((l.data ?? []) as Label[]);
    setLabelLinks((ll.data ?? []) as LabelLink[]);
    setCheckItems((c.data ?? []) as Checklist[]);
    setNoteLinks((e.data ?? []) as NoteLink[]);
    const saved = s.data?.[0];
    if (saved) {
      setStateId(saved.id);
      const data = (saved.data || {}) as { positions?:Record<string,Point>; viewport?:{x:number;y:number;zoom:number} };
      if (data.positions) setPositions(data.positions);
      if (data.viewport) {
        viewportRef.current = data.viewport;
        setSavedViewport(data.viewport);
      }
    }
    setLoading(false);
  },[user]);

  useEffect(()=>{ void load(); },[load]);

  const saveGraph = useCallback(async (nextPositions?:Record<string,Point>) => {
    if (!user) return;
    const data = { positions: nextPositions ?? positions, viewport: viewportRef.current };
    setSaving(true);
    if (stateId) {
      const r = await supabase.from('user_state').update({ data, updated_at:new Date().toISOString() }).eq('id',stateId);
      if (r.error) setError(r.error.message || 'Não foi possível salvar a posição do mapa.');
    } else {
      const r = await supabase.from('user_state').insert({ user_id:user.id, kind:'notes_graph', data }).select('id').single();
      if (r.error) setError(r.error.message || 'Não foi possível salvar a posição do mapa.');
      if (r.data?.id) setStateId(r.data.id);
    }
    setSaving(false);
  },[positions,stateId,user]);

  const scheduleSave = useCallback((next:Record<string,Point>) => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(()=>{ void saveGraph(next); },450);
  },[saveGraph]);

  useEffect(()=>()=>{ if(saveTimerRef.current) window.clearTimeout(saveTimerRef.current); },[]);

  const labelById = useMemo(()=>Object.fromEntries(labels.map(l=>[l.id,l])),[labels]);
  const labelsByNote = useMemo(() => {
    const map:Record<string,string[]> = {};
    for (const link of labelLinks) {
      const label = labelById[link.label_id];
      if (label) (map[link.note_id] ??= []).push(label.name);
    }
    return map;
  },[labelLinks,labelById]);

  const checklistByNote = useMemo(() => {
    const map:Record<string,{done:number;total:number}> = {};
    for (const item of checkItems) {
      const current = (map[item.note_id] ??= {done:0,total:0});
      current.total += 1;
      if (item.is_completed) current.done += 1;
    }
    return map;
  },[checkItems]);

  const baseNotes = useMemo(() => notes.filter(note => {
    if (folderFilter !== 'all' && note.folder_id !== folderFilter) return false;
    if (labelFilter !== 'all' && !(labelsByNote[note.id] ?? []).includes(labelById[labelFilter]?.name || '')) return false;
    if (!query.trim()) return true;
    return (note.title+' '+plain(note.content)).toLowerCase().includes(query.trim().toLowerCase());
  }),[notes,folderFilter,labelFilter,query,labelsByNote,labelById]);

  const baseIdSet = useMemo(()=>new Set(baseNotes.map(n=>n.id)),[baseNotes]);

  const localIds = useMemo(() => {
    if (mode === 'global') return baseIdSet;
    if (!selectedId || !baseIdSet.has(selectedId)) return baseIdSet;
    const adjacent = new Map<string,string[]>();
    for (const edge of noteLinks) {
      if (!baseIdSet.has(edge.source_note_id) || !baseIdSet.has(edge.target_note_id)) continue;
      const sourceNeighbors = adjacent.get(edge.source_note_id) ?? [];
      sourceNeighbors.push(edge.target_note_id);
      adjacent.set(edge.source_note_id, sourceNeighbors);
      const targetNeighbors = adjacent.get(edge.target_note_id) ?? [];
      targetNeighbors.push(edge.source_note_id);
      adjacent.set(edge.target_note_id, targetNeighbors);
    }
    const found = new Set([selectedId]);
    let frontier = [selectedId];
    for (let level=0; level<depth; level++) {
      const next:string[] = [];
      for (const id of frontier) {
        for (const neighbor of adjacent.get(id) ?? []) {
          if (!found.has(neighbor)) { found.add(neighbor); next.push(neighbor); }
        }
      }
      frontier = next;
      if (!frontier.length) break;
    }
    return found;
  },[mode,selectedId,depth,baseIdSet,noteLinks]);

  const visibleNotes = useMemo(()=>baseNotes.filter(note=>localIds.has(note.id)),[baseNotes,localIds]);

  const defaultPositions = useMemo(() => {
    const map:Record<string,Point> = {};
    const cols = Math.max(3, Math.ceil(Math.sqrt(Math.max(visibleNotes.length,1))));
    visibleNotes.forEach((note,index)=>{
      if (positions[note.id]) return;
      map[note.id] = { x:(index % cols)*330, y:Math.floor(index / cols)*220 };
    });
    return map;
  },[visibleNotes,positions]);

  const graphNodes = useMemo(() => visibleNotes.map(note => {
    const counts = checklistByNote[note.id] ?? {done:0,total:0};
    return {
      id:note.id,
      type:'note' as const,
      position:positions[note.id] ?? defaultPositions[note.id] ?? {x:0,y:0},
      selected:note.id === selectedId,
      data:{
        title:note.title,
        preview:plain(note.content).slice(0,120),
        color:note.color,
        noteType:note.note_type,
        isPinned:note.is_pinned,
        labelNames:labelsByNote[note.id] ?? [],
        checklistDone:counts.done,
        checklistTotal:counts.total,
        onOpen:()=>openNote(note.id),
        onSelect:()=>setSelectedId(note.id),
      },
    };
  }),[visibleNotes,positions,defaultPositions,selectedId,checklistByNote,labelsByNote,openNote]);

  const visibleIdSet = useMemo(()=>new Set(graphNodes.map(n=>n.id)),[graphNodes]);
  const graphEdges = useMemo(() => noteLinks
    .filter(link=>visibleIdSet.has(link.source_note_id)&&visibleIdSet.has(link.target_note_id))
    .map(link=>({
      id:link.id, source:link.source_note_id, target:link.target_note_id, type:'smoothstep',
      label:link.relation_type==='related' ? undefined : relationLabels[link.relation_type] || link.relation_type,
      labelStyle:{ fontSize:10, fill:'var(--graph-edge-label)' },
      labelBgPadding:[5,3] as [number,number], labelBgBorderRadius:7,
      style:{ stroke:'var(--graph-edge)', strokeWidth:1.6 }, animated:false,
    })),[noteLinks,visibleIdSet]);

  const onNodesChange = useCallback((changes:any[]) => {
    let changed = false;
    setPositions(prev => {
      const next = {...prev};
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          next[change.id] = { x:change.position.x, y:change.position.y };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  },[]);

  const onNodeDragStop = useCallback((_event:any,node:any) => {
    const next = {...positions,[node.id]:{x:node.position.x,y:node.position.y}};
    setPositions(next);
    scheduleSave(next);
  },[positions,scheduleSave]);

  const onConnect = useCallback(async (connection:Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    const duplicate = noteLinks.some(link =>
      (link.source_note_id===connection.source && link.target_note_id===connection.target) ||
      (link.source_note_id===connection.target && link.target_note_id===connection.source)
    );
    if (duplicate) return;
    const {data,error:e} = await supabase.from('note_links')
      .insert({source_note_id:connection.source,target_note_id:connection.target,relation_type:'related'})
      .select('id,source_note_id,target_note_id,relation_type,created_at')
      .single();
    if (e) { setError(e.message || 'Não foi possível criar a conexão.'); return; }
    if (data) setNoteLinks(prev=>[...prev,data as NoteLink]);
  },[noteLinks]);

  const onEdgesDelete:OnEdgesDelete = useCallback(async (edges) => {
    for (const edge of edges) {
      const {error:e} = await supabase.from('note_links').delete().eq('id',edge.id);
      if (e) { setError(e.message || 'Não foi possível remover a conexão.'); return; }
    }
    const deleted = new Set(edges.map(edge=>edge.id));
    setNoteLinks(prev=>prev.filter(link=>!deleted.has(link.id)));
  },[]);

  const selectedNote = selectedId ? notes.find(note=>note.id===selectedId) ?? null : null;
  const selectedConnections = selectedId ? noteLinks.filter(link=>link.source_note_id===selectedId||link.target_note_id===selectedId) : [];

  const openNotes = () => {
    window.history.pushState({}, '', '/notes');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const setModeSafely = (next:'global'|'local') => {
    if (next==='local' && !selectedId && visibleNotes[0]) setSelectedId(visibleNotes[0].id);
    setMode(next);
  };

  const updateViewport = useCallback((viewport:{x:number;y:number;zoom:number}) => {
    viewportRef.current = viewport;
  },[]);

  if (loading) return <div className="graph-shell graph-loading"><div className="graph-loading-orb"/><strong>Montando seu mapa…</strong><span>Carregando suas notas e conexões.</span></div>;

  return (
    <div className="graph-shell">
      <header className="graph-topbar">
        <div className="graph-title-wrap">
          <button className="graph-back" onClick={openNotes} title="Voltar para notas"><ArrowLeft size={17}/></button>
          <div><span className="graph-eyebrow">Notas</span><h1>Mapa</h1></div>
        </div>
        <div className="graph-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar no mapa..." /></div>
        <div className="graph-toolbar">
          <button className={cn(mode==='global'&&'active')} onClick={()=>setModeSafely('global')}>Tudo</button>
          <button className={cn(mode==='local'&&'active')} onClick={()=>setModeSafely('local')}>Local</button>
          <button className="graph-icon-button" title="Ajustar ao conteúdo" onClick={()=>window.dispatchEvent(new CustomEvent('graph-fit-view'))}><Maximize2 size={16}/></button>
        </div>
      </header>

      <div className="graph-controls-row">
        <select value={folderFilter} onChange={e=>setFolderFilter(e.target.value)}>
          <option value="all">Todas as pastas</option>{folders.map(folder=><option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </select>
        <select value={labelFilter} onChange={e=>setLabelFilter(e.target.value)}>
          <option value="all">Todos os marcadores</option>{labels.map(label=><option key={label.id} value={label.id}>#{label.name}</option>)}
        </select>
        {mode==='local' && <div className="graph-depth"><span>Profundidade</span>{([1,2,3] as const).map(value=><button key={value} className={cn(depth===value&&'active')} onClick={()=>setDepth(value)}>{value}</button>)}</div>}
        <span className="graph-count">{visibleNotes.length} {visibleNotes.length===1?'nota':'notas'} · {graphEdges.length} {graphEdges.length===1?'conexão':'conexões'}</span>
      </div>

      {error && <div className="graph-alert">{error}<button onClick={()=>setError('')}><X size={14}/></button></div>}

      <div className="graph-canvas">
        <ReactFlow
          nodes={graphNodes}
          edges={graphEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(_event,node)=>setSelectedId(node.id)}
          onNodeDoubleClick={(_event,node)=>openNote(node.id)}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          fitView={!savedViewport}
          minZoom={0.15}
          maxZoom={2.2}
          proOptions={{ hideAttribution:true }}
          deleteKeyCode={['Backspace','Delete']}
          className="graph-flow"
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor={node=>palette[(node.data as NoteNodeData)?.color || 'default']} maskColor="rgba(245,245,243,.72)" />
          <Panel position="bottom-left" className="graph-tip"><Link2 size={14}/> Arraste de um ponto lateral para outro para conectar duas notas.</Panel>
          <GraphViewport onViewportChange={updateViewport} initialViewport={savedViewport} />
        </ReactFlow>

        {selectedNote && (
          <aside className="graph-detail-panel">
            <div className="graph-detail-header">
              <div><span className="graph-eyebrow">Nota selecionada</span><h2>{selectedNote.title || 'Sem título'}</h2></div>
              <button onClick={()=>setSelectedId(null)} title="Fechar"><X size={16}/></button>
            </div>
            {plain(selectedNote.content) && <p className="graph-detail-preview">{plain(selectedNote.content).slice(0,520)}</p>}
            <div className="graph-detail-actions"><button className="primary" onClick={()=>openNote(selectedNote.id)}><ExternalLink size={15}/> Abrir nota</button></div>
            <div className="graph-detail-section">
              <span>Conexões</span>
              {selectedConnections.length===0
                ? <p className="graph-muted">Nenhuma conexão ainda. Crie uma arrastando de uma nota para outra.</p>
                : <div className="graph-connection-list">{selectedConnections.map(connection=>{
                    const otherId = connection.source_note_id===selectedNote.id ? connection.target_note_id : connection.source_note_id;
                    const other = notes.find(note=>note.id===otherId);
                    return <button key={connection.id} onClick={()=>setSelectedId(otherId)}><Link2 size={14}/><span>{other?.title||'Sem título'}</span><small>{relationLabels[connection.relation_type]||connection.relation_type}</small></button>;
                  })}</div>}
            </div>
            {mode==='local' && <div className="graph-detail-section"><span>Mapa local</span><p className="graph-muted">Mostrando até {depth} nível{depth>1?'eis':''} a partir desta nota.</p></div>}
            {saving && <div className="graph-saving">Salvando posição do mapa…</div>}
          </aside>
        )}
      </div>
    </div>
  );
}
