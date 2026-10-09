import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Archive, AudioLines, BookOpen, Bold, Check, CheckSquare, CircleHelp, ChevronDown, ChevronLeft, Clock3, Command, Copy, Download, Eraser, FileDown, FileText, Filter, Flame, Folder, FolderPlus, Grid2X2, ImagePlus, Italic, KeyRound, Link2, List, Loader2, Lock, LockOpen, Mail, MapPin, Map, Menu, Mic, Network, MoreHorizontal, Palette, Pencil, Pin, Plus, Printer, RotateCcw, Search, Send, Settings, Share2, Square, Sun, Moon, Tag, Trash2, Underline, Upload, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { HelpCenter } from '@/components/HelpCenter';
import { FolderTemplatesModal } from '@/components/FolderTemplatesModal';
import { NoteHeatmap } from '@/components/NoteHeatmap';
import { SettingsPage } from '@/pages/SettingsPage';
import { folderTemplates, templateNoteContent } from '@/lib/folderTemplates';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type NoteType='text'|'checklist'|'image'|'drawing'|'audio';
type Color='default'|'warm'|'yellow'|'green'|'blue'|'purple'|'pink'|'red'|'orange'|'teal'|'indigo'|'gray';
type Note={id:string;user_id:string;title:string;content:string;note_type:NoteType;color:Color;is_pinned:boolean;is_archived:boolean;is_deleted:boolean;deleted_at:string|null;reminder_at:string|null;created_at:string;updated_at:string;sort_order:number;folder_id:string|null;ocr_text:string;transcript:string;metadata:Record<string,unknown>};
type Label={id:string;user_id:string;name:string;color:Color};
type Checklist={id:string;note_id:string;parent_id:string|null;title:string;is_completed:boolean;position:number};
type Attachment={id:string;note_id:string;user_id:string;attachment_type:'image'|'audio'|'drawing'|'file';file_path:string|null;file_name:string;mime_type:string;size_bytes:number;transcript:string;signed_url?:string};
type Reminder={id:string;note_id:string;user_id:string;reminder_type:'datetime'|'location';remind_at:string|null;location_lat:number|null;location_lng:number|null;location_radius_m:number|null;location_trigger:'arrive'|'leave'|null;repeat_rule:string|null;title:string;completed_at:string|null};
type Folder={id:string;user_id:string;name:string;position:number;created_at:string;updated_at:string;color:string;icon:'folder'|'network'|'key-round'|'book-open'};
const colorOptions:{key:Color;label:string;hex:string}[]=[{key:'default',label:'Neutro',hex:'#ffffff'},{key:'warm',label:'Creme',hex:'#f7f1e5'},{key:'yellow',label:'Amarelo',hex:'#fff4b8'},{key:'orange',label:'Pêssego',hex:'#ffe1c7'},{key:'red',label:'Coral',hex:'#f3d4cf'},{key:'pink',label:'Rosa',hex:'#f5dce7'},{key:'purple',label:'Lilás',hex:'#e8def7'},{key:'indigo',label:'Índigo',hex:'#dce2f8'},{key:'blue',label:'Azul',hex:'#d9e9f7'},{key:'teal',label:'Menta',hex:'#d7efe9'},{key:'green',label:'Verde',hex:'#dcefdc'},{key:'gray',label:'Cinza',hex:'#e8e9e7'}];
const types:{key:NoteType;label:string;icon:any}[]=[{key:'text',label:'Texto',icon:FileText},{key:'checklist',label:'Checklist',icon:CheckSquare},{key:'image',label:'Imagem',icon:ImagePlus},{key:'drawing',label:'Desenho',icon:Palette},{key:'audio',label:'Áudio',icon:AudioLines}];
const plain=(s:string)=>s.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const localDateKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
function heatmapDailyItems(note:Note):Record<string,string[]>{
  const raw=note.metadata?.heatmap_daily_items;
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return{};
  const result:Record<string,string[]>={};
  for(const [date,value] of Object.entries(raw as Record<string,unknown>)){
    if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&Array.isArray(value)){
      const ids=[...new Set(value.filter((id):id is string=>typeof id==='string'&&id.length>0))];
      if(ids.length)result[date]=ids;
    }
  }
  return result;
}
function heatmapActivity(note:Note):Record<string,number>{
  const raw=note.metadata?.heatmap_activity;
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return{};
  const dailyItems=heatmapDailyItems(note);
  const result:Record<string,number>={};
  for(const [date,value] of Object.entries(raw as Record<string,unknown>)){
    const count=Number(value);
    if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(count)&&count>0){
      // Older records only tracked checkbox clicks, so normalize them to one event per day.
      result[date]=dailyItems[date]?.length??1;
    }
  }
  for(const [date,ids] of Object.entries(dailyItems))result[date]=ids.length;
  return result;
}
const sanitizeHtml=(html:string)=>{
  const doc=new DOMParser().parseFromString(html||'','text/html');
  const allowed=new Set(['a','b','blockquote','br','div','em','i','li','ol','p','strong','s','u','ul']);
  doc.body.querySelectorAll('*').forEach(el=>{
    const tag=el.tagName.toLowerCase();
    if(!allowed.has(tag)){el.replaceWith(...Array.from(el.childNodes));return}
    for(const attr of Array.from(el.attributes)){
      if(tag==='a'&&attr.name==='href'){
        try{
          const protocol=new URL(attr.value,location.origin).protocol;
          if(!['http:','https:','mailto:'].includes(protocol))el.removeAttribute('href');
          else el.setAttribute('href',attr.value);
        }catch{el.removeAttribute('href')}
      }else{
        el.removeAttribute(attr.name);
      }
    }
  });
  return doc.body.innerHTML;
};
const download=(b:Blob,n:string)=>{const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=n;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),500)};
const meters=(a:{lat:number,lng:number},b:{lat:number,lng:number})=>{const p=Math.PI/180,R=6371000,dl=(b.lat-a.lat)*p,dn=(b.lng-a.lng)*p,x=Math.sin(dl/2)**2+Math.cos(a.lat*p)*Math.cos(b.lat*p)*Math.sin(dn/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))};

export function NotesPage({initialSettingsOpen=false}:{initialSettingsOpen?:boolean}={}){
  const {user}=useAuth();
  const [notes,setNotes]=useState<Note[]>([]),[selectedId,setSelectedId]=useState<string|null>(null),[query,setQuery]=useState(''),[filter,setFilter]=useState<'all'|'pinned'|'archive'|'trash'>('all'),[view,setView]=useState<'grid'|'list'>('grid'),[folderId,setFolderId]=useState<string|null>(null);
  const [typeFilter,setTypeFilter]=useState<NoteType|'all'>('all'),[colorFilter,setColorFilter]=useState<Color|'all'>('all'),[labelFilter,setLabelFilter]=useState('all'),[reminderFilter,setReminderFilter]=useState('all'),[filters,setFilters]=useState(false);
  const [labels,setLabels]=useState<Label[]>([]),[links,setLinks]=useState<Record<string,string[]>>({}),[check,setCheck]=useState<Record<string,Checklist[]>>({}),[files,setFiles]=useState<Record<string,Attachment[]>>({}),[reminders,setReminders]=useState<Reminder[]>([]),[folders,setFolders]=useState<Folder[]>([]),[folderLinks,setFolderLinks]=useState<Record<string,string[]>>({});
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[newMenu,setNewMenu]=useState(false),[more,setMore]=useState(false),[share,setShare]=useState(false),[reminder,setReminder]=useState(false),[labelPanel,setLabelPanel]=useState(false),[theme,setTheme]=useState<'system'|'light'|'dark'>((localStorage.getItem('notes-theme') as any)||'system'),[systemDark,setSystemDark]=useState(window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [shareEmail,setShareEmail]=useState(''),[newLabel,setNewLabel]=useState(''),[remindAt,setRemindAt]=useState(''),[repeat,setRepeat]=useState('none'),[locationTrigger,setLocationTrigger]=useState<'arrive'|'leave'>('arrive'),[recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[drawTool,setDrawTool]=useState<'pen'|'marker'|'eraser'>('pen');
  const [quickAction,setQuickAction]=useState<{id:string;type:'palette'|'reminder'|'labels'|'folder'|'more'}|null>(null),[quickReminderAt,setQuickReminderAt]=useState(''),[quickRepeat,setQuickRepeat]=useState('none'),[quickNewLabel,setQuickNewLabel]=useState(''),[folderMenuId,setFolderMenuId]=useState<string|null>(null),[folderEditId,setFolderEditId]=useState<string|null>(null),[folderDraft,setFolderDraft]=useState(''),[folderDeleteId,setFolderDeleteId]=useState<string|null>(null),[labelEditId,setLabelEditId]=useState<string|null>(null),[labelDraft,setLabelDraft]=useState(''),[permanentDeleteId,setPermanentDeleteId]=useState<string|null>(null),[titleDraft,setTitleDraft]=useState('');
  const [editorType,setEditorType]=useState<NoteType>('text');
  const [helpOpen,setHelpOpen]=useState(false),[templatesOpen,setTemplatesOpen]=useState(false),[templateCreating,setTemplateCreating]=useState<string|null>(null),[settingsOpen,setSettingsOpen]=useState(initialSettingsOpen);
  const editorRef=useRef<HTMLDivElement|null>(null),canvasRef=useRef<HTMLCanvasElement|null>(null),mediaRef=useRef<MediaRecorder|null>(null),chunks=useRef<Blob[]>([]),speech=useRef<any>(null),timerRef=useRef<number|null>(null),saveRef=useRef<number|null>(null);
  const heatmapItemsRef=useRef<Record<string,Record<string,string[]>>>({});
  const heatmapSaveQueueRef=useRef<Record<string,Promise<void>>>({});
  const folderIdsFor=(note:Note|null|undefined):string[]=>note?(folderLinks[note.id]??(note.folder_id?[note.folder_id]:[])):[]; 
  const selected=notes.find(n=>n.id===selectedId)??null,dark=theme==='dark'||(theme==='system'&&systemDark),selectedLocked=selected?.metadata?.locked===true,selectedHeatEnabled=selected?.metadata?.heatmap_enabled===true,selectedFolders=folders.filter(f=>folderIdsFor(selected).includes(f.id)),activeFolder=folders.find(f=>f.id===folderId)??null;

  const closeSettings=useCallback(()=>{setSettingsOpen(false);if(window.location.pathname==='/settings'){window.history.pushState({},'', '/notes');window.dispatchEvent(new PopStateEvent('popstate'));}},[]);

  useEffect(()=>{if(user)void load()},[user]);
  useEffect(()=>{localStorage.setItem('notes-theme',theme)},[theme]);
  useEffect(()=>{const m=window.matchMedia('(prefers-color-scheme: dark)'),f=()=>setSystemDark(m.matches);m.addEventListener?.('change',f);return()=>m.removeEventListener?.('change',f)},[]);
  useEffect(()=>{setTitleDraft(selected?.title??'');},[selectedId]);
  function discardEmptyDraft(){
    if(!selected||!isDraftNote(selected.id))return;
    const hasChecklist=(check[selected.id]??[]).some(i=>i.title.trim());
    if(!noteHasContent(selected)&&!hasChecklist){
      setNotes(v=>v.filter(x=>x.id!==selected.id));
      setCheck(v=>{const map={...v};delete map[selected.id];return map});
    }
  }
  function closeEditor(){discardEmptyDraft();setSelectedId(null);if(new URLSearchParams(window.location.search).has('note'))window.history.replaceState({},'', '/notes')}
  useEffect(()=>{document.querySelector('.notes-sidebar')?.classList.remove('mobile-open')},[filter,folderId]);
  useEffect(()=>{if(!selected)return;setMore(false);setShare(false);setReminder(false);setLabelPanel(false);setQuickAction(null);setFolderMenuId(null);setFolderEditId(null);setFolderDeleteId(null);void loadSelected(selected.id)},[selectedId]);
  useEffect(()=>{const closePanels=(e:PointerEvent)=>{const target=e.target as HTMLElement|null;if(target?.closest('.note-quick-actions,.note-quick-popover,.editor-actions,.notes-popover,.notes-folder-row'))return;setQuickAction(null);setMore(false);setShare(false);setReminder(false);setLabelPanel(false);setFolderMenuId(null)};document.addEventListener('pointerdown',closePanels,true);return()=>document.removeEventListener('pointerdown',closePanels,true)},[]);
  useEffect(()=>{const h=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.getElementById('notes-search')?.focus()}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='n'){e.preventDefault();void create('text')}if(e.key==='Escape'&&!document.querySelector('.help-center-overlay,.settings-overlay'))closeEditor()};addEventListener('keydown',h);return()=>removeEventListener('keydown',h)},[]);
  useEffect(()=>{if(!user)return;const c=supabase.channel('notes-realtime-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'notes'},p=>{if(p.eventType==='INSERT'){const n=p.new as Note;if(n.user_id===user.id)setNotes(v=>v.some(x=>x.id===n.id)?v:[n,...v])}else if(p.eventType==='UPDATE'){const n=p.new as Note;setNotes(v=>v.map(x=>x.id===n.id?n:x))}else if(p.eventType==='DELETE'){const n=p.old as Note;setNotes(v=>v.filter(x=>x.id!==n.id))}}).subscribe();return()=>{void supabase.removeChannel(c)}},[user]);
  useEffect(()=>{if(!reminders.some(r=>r.reminder_type==='location'&&!r.completed_at)||!navigator.geolocation)return;const watch=navigator.geolocation.watchPosition(async p=>{for(const r of reminders.filter(x=>x.reminder_type==='location'&&!x.completed_at&&x.location_lat!==null&&x.location_lng!==null)){const d=meters({lat:p.coords.latitude,lng:p.coords.longitude},{lat:r.location_lat!,lng:r.location_lng!});if(d<=Number(r.location_radius_m||250))await fireReminder(r)}});return()=>navigator.geolocation.clearWatch(watch)},[reminders]);
  useEffect(()=>{if(!reminders.length)return;const timers:number[]=[];for(const r of reminders){if(r.completed_at||r.reminder_type!=='datetime'||!r.remind_at)continue;const delay=new Date(r.remind_at).getTime()-Date.now();if(delay>0&&delay<2147483647){timers.push(window.setTimeout(()=>{void fireReminder(r)},delay))}}return()=>timers.forEach(t=>clearTimeout(t))},[reminders]);
  useEffect(()=>{if(!reminders.some(r=>r.reminder_type==='location'&&!r.completed_at)||!navigator.geolocation)return;const watch=navigator.geolocation.watchPosition(async p=>{for(const r of reminders.filter(x=>x.reminder_type==='location'&&!x.completed_at&&x.location_lat!==null&&x.location_lng!==null)){const d=meters({lat:p.coords.latitude,lng:p.coords.longitude},{lat:r.location_lat!,lng:r.location_lng!});if(d<=Number(r.location_radius_m||250)){await fireReminder(r)}}});return()=>navigator.geolocation.clearWatch(watch)},[reminders]);

  async function load(){
    if(!user)return;setLoading(true);await supabase.from('notes').delete().eq('user_id',user.id).eq('is_deleted',true).lt('deleted_at',new Date(Date.now()-30*24*60*60*1000).toISOString());const [n,l,ll,r,a,f,cList,fl]=await Promise.all([supabase.from('notes').select('*').order('is_pinned',{ascending:false}).order('sort_order'),supabase.from('note_labels').select('*').eq('user_id',user.id).order('name'),supabase.from('note_label_links').select('*'),supabase.from('note_reminders').select('*').eq('user_id',user.id).order('remind_at'),supabase.from('note_attachments').select('*').order('created_at',{ascending:false}),supabase.from('note_folders').select('*').eq('user_id',user.id).order('position').order('name'),supabase.from('note_checklist_items').select('*').order('position'),supabase.from('note_folder_links').select('note_id,folder_id')]);
    if(n.error)setError(n.error.message);else {const loadedNotes=(n.data??[]) as Note[];setNotes(loadedNotes);heatmapItemsRef.current=Object.fromEntries(loadedNotes.map(note=>[note.id,heatmapDailyItems(note)]));const requestedNote=new URLSearchParams(window.location.search).get('note');if(requestedNote&&(n.data??[]).some((row:any)=>row.id===requestedNote))setSelectedId(requestedNote)}if(f.error)setError(f.error.message);else setFolders((f.data??[]) as Folder[]);if(l.data)setLabels(l.data as Label[]);if(ll.data){const m:Record<string,string[]>={};for(const x of ll.data as any[])(m[x.note_id]??=[]).push(x.label_id);setLinks(m)}if(r.data)setReminders(r.data as Reminder[]);if(a.data){const signed=await Promise.all((a.data as Attachment[]).map(async x=>x.file_path?({...x,signed_url:(await supabase.storage.from('notes-media').createSignedUrl(x.file_path,3600)).data?.signedUrl}):x));const m:Record<string,Attachment[]>={};for(const x of signed)(m[x.note_id]??=[]).push(x);setFiles(m)}if(cList.data){const m:Record<string,Checklist[]>={};for(const x of cList.data as Checklist[])(m[x.note_id]??=[]).push(x);setCheck(m)}if(fl.error)setError(fl.error.message);else{const m:Record<string,string[]>={};for(const x of (fl.data??[]) as {note_id:string;folder_id:string}[])(m[x.note_id]??=[]).push(x.folder_id);for(const row of (n.data??[]) as Note[])if(row.folder_id&&!(m[row.id]??[]).includes(row.folder_id))(m[row.id]??=[]).push(row.folder_id);setFolderLinks(m)}setLoading(false);
    const invite=new URLSearchParams(location.search).get('invite');if(invite&&user.email){const {data,error:e}=await supabase.rpc('accept_note_share_invite',{p_token:invite});if(!e&&data){history.replaceState({},'', '/notes');setSelectedId(data as string)}else if(e){setError('Não foi possível aceitar este convite.')}}
  }
  const isDraftNote=(id:string)=>id.startsWith('draft-');
  function noteHasContent(note:Note,force=false){return force||Boolean(note.title.trim()||plain(note.content).trim()||note.transcript.trim()||note.ocr_text.trim())}
  async function persistDraftNote(noteId:string,patch:Partial<Note>={},force=false){
    if(!user)return null;
    const draft=notes.find(x=>x.id===noteId);
    if(!draft||!isDraftNote(noteId))return draft??null;
    const next={...draft,...patch};
    if(!noteHasContent(next,force))return next;
    const {data,error:e}=await supabase.from('notes').insert({
      user_id:user.id,title:next.title.trim(),content:next.content,note_type:next.note_type,
      color:next.color,is_pinned:next.is_pinned,is_archived:next.is_archived,is_deleted:false,deleted_at:null,
      reminder_at:next.reminder_at,sort_order:next.sort_order,folder_id:next.folder_id,metadata:next.metadata,
      ocr_text:next.ocr_text,transcript:next.transcript
    }).select().single();
    if(e){setError(e.message);return null}
    const saved=data as Note;
    const assignedFolderIds=folderLinks[noteId]??(next.folder_id?[next.folder_id]:[]);
    if(assignedFolderIds.length){const {error:folderError}=await supabase.from('note_folder_links').insert(assignedFolderIds.map(folder_id=>({note_id:saved.id,folder_id})));if(folderError)setError('A nota foi salva, mas não foi possível vincular todas as pastas.');}
    setFolderLinks(v=>{const map={...v};delete map[noteId];map[saved.id]=assignedFolderIds;return map});
    setNotes(v=>v.map(x=>x.id===noteId?saved:x));
    setSelectedId(v=>v===noteId?saved.id:v);
    setCheck(v=>{const map={...v};if(map[noteId]){map[saved.id]=map[noteId];delete map[noteId]}return map});
    return saved;
  }
  async function createFolderTemplate(templateId:string){
    if(!user||templateCreating)return;
    const template=folderTemplates.find(item=>item.id===templateId);
    if(!template)return;
    setTemplateCreating(templateId);
    let createdFolderId:string|null=null;
    let createdNoteIds:string[]=[];
    const createdLabelIds:string[]=[];
    try{
      const folderResult=await supabase.from('note_folders').insert({
        user_id:user.id,name:template.name,position:folders.length,color:template.color,icon:template.icon
      }).select('*').single();
      if(folderResult.error||!folderResult.data)throw new Error(folderResult.error?.message||'Não foi possível criar a pasta.');
      createdFolderId=(folderResult.data as Folder).id;

      const noteResult=await supabase.from('notes').insert(template.notes.map((note,index)=>({
        user_id:user.id,title:note.title,content:note.type==='checklist'?'':templateNoteContent(note),
        note_type:note.type,color:'default',is_pinned:false,is_archived:false,is_deleted:false,deleted_at:null,
        reminder_at:null,sort_order:Math.max(-1,...notes.map(n=>Number(n.sort_order)||0).filter(Number.isFinite))+index+1,
        folder_id:createdFolderId,metadata:{folder_template:template.id,folder_template_key:note.key}
      }))).select('id,metadata');
      if(noteResult.error||!noteResult.data)throw new Error(noteResult.error?.message||'Não foi possível criar as notas.');
      const createdNotes=noteResult.data as {id:string;metadata:Record<string,unknown>}[];
      createdNoteIds=createdNotes.map(note=>note.id);
      const noteIdByKey:Record<string,string>={};
      for(const note of createdNotes){
        const key=String(note.metadata?.folder_template_key??'');
        if(key)noteIdByKey[key]=note.id;
      }
      if(template.notes.some(note=>!noteIdByKey[note.key]))throw new Error('Não foi possível relacionar todas as notas do modelo.');

      const folderLinkResult=await supabase.from('note_folder_links').insert(createdNoteIds.map(note_id=>({note_id,folder_id:createdFolderId})));
      if(folderLinkResult.error)throw new Error('Não foi possível vincular as notas à pasta: '+folderLinkResult.error.message);

      const checklistItems=template.notes.flatMap(note=>(note.checklistItems??[]).map((title,position)=>({
        note_id:noteIdByKey[note.key],parent_id:null,title,is_completed:false,position
      })));
      if(checklistItems.length){
        const checklistResult=await supabase.from('note_checklist_items').insert(checklistItems);
        if(checklistResult.error)throw new Error('Não foi possível criar os itens de checklist: '+checklistResult.error.message);
      }

      const tagNames=Array.from(new Set(template.notes.flatMap(note=>note.tags)));
      let tagRows:Label[]=[];
      if(tagNames.length){
        const existingResult=await supabase.from('note_labels').select('*').eq('user_id',user.id).in('name',tagNames);
        if(existingResult.error)throw new Error('Não foi possível verificar as etiquetas: '+existingResult.error.message);
        tagRows=(existingResult.data??[]) as Label[];
      }
      const labelIdByName:Record<string,string>={};
      for(const label of tagRows)labelIdByName[label.name.toLowerCase()]=label.id;
      for(const tagName of tagNames){
        const lookup=tagName.toLowerCase();
        if(labelIdByName[lookup])continue;
        const labelResult=await supabase.from('note_labels').insert({user_id:user.id,name:tagName,color:'default'}).select('*').single();
        if(labelResult.error||!labelResult.data)throw new Error('Não foi possível criar a etiqueta "'+tagName+'": '+(labelResult.error?.message||'erro desconhecido'));
        const label=labelResult.data as Label;
        createdLabelIds.push(label.id);
        labelIdByName[lookup]=label.id;
      }
      const labelLinksToInsert=template.notes.flatMap(note=>note.tags.map(tag=>({
        note_id:noteIdByKey[note.key],label_id:labelIdByName[tag.toLowerCase()]
      })));
      if(labelLinksToInsert.length){
        const tagLinkResult=await supabase.from('note_label_links').insert(labelLinksToInsert);
        if(tagLinkResult.error)throw new Error('Não foi possível associar todas as etiquetas: '+tagLinkResult.error.message);
      }

      const connectionRows=template.connections.map(connection=>({
        source_note_id:noteIdByKey[connection.from],
        target_note_id:noteIdByKey[connection.to],
        relation_type:'related'
      }));
      if(connectionRows.length){
        const connectionResult=await supabase.from('note_links').insert(connectionRows);
        if(connectionResult.error)throw new Error('Não foi possível criar as conexões do Mapa: '+connectionResult.error.message);
      }

      await load();
      setFolderId(createdFolderId);
      setFilter('all');
      setSelectedId(null);
      setTemplatesOpen(false);
      setQuickAction(null);
      setError('');
    }catch(error){
      if(createdNoteIds.length)await supabase.from('notes').delete().in('id',createdNoteIds);
      if(createdFolderId)await supabase.from('note_folders').delete().eq('id',createdFolderId);
      if(createdLabelIds.length)await supabase.from('note_labels').delete().in('id',createdLabelIds);
      setError('Não foi possível criar a pasta template. '+(error instanceof Error?error.message:'Tente novamente.'));
    }finally{
      setTemplateCreating(null);
    }
  }

  async function create(type:NoteType){
    if(!user)return;
    setNewMenu(false);setQuickAction(null);setEditorType(type);
    const order=Math.max(-1,...notes.map(n=>Number(n.sort_order)||0).filter(Number.isFinite))+1;
    const draft:Note={id:'draft-'+crypto.randomUUID(),user_id:user.id,title:'',content:'',note_type:type,color:'default',is_pinned:false,is_archived:false,is_deleted:false,deleted_at:null,reminder_at:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),sort_order:order,folder_id:folderId,ocr_text:'',transcript:'',metadata:{}};
    setNotes(v=>[draft,...v]);if(folderId)setFolderLinks(v=>({...v,[draft.id]:[folderId]}));setSelectedId(draft.id);
  }
  async function updateNoteById(id:string,patch:Partial<Note>){
    setNotes(v=>v.map(n=>n.id===id?{...n,...patch}:n));
    if(isDraftNote(id)){await persistDraftNote(id,patch);return true}
    const {error:e}=await supabase.from('notes').update(patch).eq('id',id);
    if(e){setError(e.message);return false}return true
  }
  async function createFolderFromScratch(name:string){
    if(!user||!name.trim()||templateCreating)return;
    const normalizedName=name.trim();
    if(normalizedName.length>80){setError('O nome da pasta precisa ter até 80 caracteres.');return;}
    setTemplateCreating('__custom__');
    try{
      const {data,error:e}=await supabase.from('note_folders').insert({user_id:user.id,name:normalizedName,position:folders.length,color:'#8b8b8b',icon:'folder'}).select('*').single();
      if(e||!data)throw new Error(e?.message||'Não foi possível salvar a pasta.');
      const folder=data as Folder;
      setFolders(v=>[...v,folder]);
      setFolderId(folder.id);
      setFilter('all');
      setSelectedId(null);
      setTemplatesOpen(false);
      setQuickAction(null);
      setError('');
    }catch(error){
      setError('Não foi possível criar a pasta. '+(error instanceof Error?error.message:'Tente novamente.'));
    }finally{
      setTemplateCreating(null);
    }
  }
  function openFolderMenu(folder:Folder){setFolderMenuId(v=>v===folder.id?null:folder.id);setFolderEditId(null);setFolderDeleteId(null);}
  function beginRenameFolder(folder:Folder){setFolderMenuId(folder.id);setFolderEditId(folder.id);setFolderDeleteId(null);setFolderDraft(folder.name)}
  async function saveFolderRename(folder:Folder){const name=folderDraft.trim();if(!name||name===folder.name){setFolderEditId(null);setFolderMenuId(null);return}const {data,error:e}=await supabase.from('note_folders').update({name}).eq('id',folder.id).select().single();if(e){setError(e.message);return}setFolders(v=>v.map(x=>x.id===folder.id?(data as Folder):x));setFolderEditId(null);setFolderMenuId(null);setFolderDraft('')}
  function askDeleteFolder(folder:Folder){setFolderMenuId(folder.id);setFolderEditId(null);setFolderDeleteId(folder.id)}
  async function deleteFolder(folder:Folder){const {error:e}=await supabase.from('note_folders').delete().eq('id',folder.id);if(e){setError(e.message);return}setFolders(v=>v.filter(x=>x.id!==folder.id));setNotes(v=>v.map(n=>n.folder_id===folder.id?{...n,folder_id:null}:n));setFolderLinks(v=>{const map:Record<string,string[]>={};for(const [id,ids] of Object.entries(v))map[id]=ids.filter(id=>id!==folder.id);return map});if(folderId===folder.id){setFolderId(null);setFilter('all')}setFolderDeleteId(null);setFolderMenuId(null)}
  async function assignFolders(noteId:string,requestedFolderIds:string[]){
    const nextFolderIds=Array.from(new Set(requestedFolderIds)).filter(id=>folders.some(folder=>folder.id===id));
    const note=notes.find(item=>item.id===noteId);if(!note)return;
    if(isDraftNote(noteId)){
      setFolderLinks(v=>({...v,[noteId]:nextFolderIds}));
      setNotes(v=>v.map(item=>item.id===noteId?{...item,folder_id:nextFolderIds[0]??null}:item));
      return;
    }
    const currentFolderIds=folderIdsFor(note);
    const toAdd=nextFolderIds.filter(id=>!currentFolderIds.includes(id));
    if(toAdd.length){const {error:e}=await supabase.from('note_folder_links').insert(toAdd.map(folder_id=>({note_id:noteId,folder_id})));if(e){setError('Não foi possível vincular as pastas selecionadas. '+e.message);return;}setFolderLinks(v=>({...v,[noteId]:Array.from(new Set([...(v[noteId]??currentFolderIds),...toAdd]))}));}
    const toRemove=currentFolderIds.filter(id=>!nextFolderIds.includes(id));
    if(toRemove.length){const {error:e}=await supabase.from('note_folder_links').delete().eq('note_id',noteId).in('folder_id',toRemove);if(e){setError('Não foi possível remover uma das pastas. '+e.message);return;}}
    const {error:e}=await supabase.from('notes').update({folder_id:nextFolderIds[0]??null}).eq('id',noteId);
    if(e){setError('As pastas foram vinculadas, mas não foi possível atualizar a pasta principal. '+e.message);}
    else setNotes(v=>v.map(item=>item.id===noteId?{...item,folder_id:nextFolderIds[0]??null}:item));
    setFolderLinks(v=>({...v,[noteId]:nextFolderIds}));setQuickAction(null);
  }
  async function quickShare(note:Note){const t=(note.title+'\n\n'+plain(note.content)).trim()||'Nota';if(navigator.share){try{await navigator.share({title:note.title||'Nota',text:t})}catch{return}}else{await navigator.clipboard?.writeText(t);window.open('mailto:?subject='+encodeURIComponent(note.title||'Nota')+'&body='+encodeURIComponent(t),'_blank')}}
  async function quickAddReminder(note:Note){if(!user||!quickReminderAt)return;if('Notification'in window&&Notification.permission==='default')await Notification.requestPermission();const payload={note_id:note.id,user_id:user.id,reminder_type:'datetime' as const,remind_at:new Date(quickReminderAt).toISOString(),title:note.title||'Lembrete',repeat_rule:quickRepeat==='none'?null:quickRepeat};const {data,error:e}=await supabase.from('note_reminders').insert(payload).select().single();if(e){setError(e.message);return}setReminders(v=>[...v,data as Reminder]);await updateNoteById(note.id,{reminder_at:payload.remind_at});setQuickReminderAt('');setQuickRepeat('none');setQuickAction(null)}
  async function quickToggleLabel(noteId:string,labelId:string){const arr=links[noteId]??[];if(arr.includes(labelId)){const {error:e}=await supabase.from('note_label_links').delete().eq('note_id',noteId).eq('label_id',labelId);if(e){setError(e.message);return}setLinks(v=>({...v,[noteId]:arr.filter(x=>x!==labelId)}))}else{const {error:e}=await supabase.from('note_label_links').insert({note_id:noteId,label_id:labelId});if(e){setError(e.message);return}setLinks(v=>({...v,[noteId]:[...arr,labelId]}))}}
  async function quickCreateLabel(note:Note){if(!user||!quickNewLabel.trim())return;const {data,error:e}=await supabase.from('note_labels').insert({user_id:user.id,name:quickNewLabel.trim(),color:note.color}).select().single();if(e){setError(e.message);return}setLabels(v=>[...v,data as Label]);await quickToggleLabel(note.id,(data as Label).id);setQuickNewLabel('')}
  function queue(patch:Partial<Note>){
    if(!selected)return;
    const id=selected.id;
    setNotes(v=>v.map(n=>n.id===id?{...n,...patch}:n));
    if(saveRef.current)clearTimeout(saveRef.current);
    saveRef.current=window.setTimeout(async()=>{
      setSaving(true);
      if(isDraftNote(id))await persistDraftNote(id,patch);
      else{const {error:e}=await supabase.from('notes').update(patch).eq('id',id);if(e)setError(e.message)}
      setSaving(false);
    },700);
  }
  async function update(patch:Partial<Note>,forceDraft=false){
    if(!selected)return null;
    const id=selected.id;
    setSaving(true);
    setNotes(v=>v.map(n=>n.id===id?{...n,...patch}:n));
    if(isDraftNote(id)){const saved=await persistDraftNote(id,patch,forceDraft);setSaving(false);return saved}
    const {error:e}=await supabase.from('notes').update(patch).eq('id',id);
    if(e)setError(e.message);
    setSaving(false);
    return selected;
  }
  async function copyText(note:Note){const text=plain(note.content);if(!text){setError('Esta nota ainda não tem texto para copiar.');return}try{await navigator.clipboard.writeText(text);setError('Texto copiado.');setTimeout(()=>setError(''),1200)}catch{setError('Não foi possível copiar o texto.')}}
  async function toggleTextLock(){if(!selected)return;await update({metadata:{...selected.metadata,locked:!selectedLocked}})}
  async function toggleHeatmap(){
    if(!selected)return;
    const enable=!selectedHeatEnabled;
    const metadata:Record<string,unknown>={...selected.metadata,heatmap_enabled:enable};
    if(enable){
      // Normalize legacy click counters without creating activity retroactively.
      const activity=heatmapActivity(selected);
      const dailyItems=heatmapDailyItems(selected);
      if(Object.keys(activity).length)metadata.heatmap_activity=activity;
      if(Object.keys(dailyItems).length)metadata.heatmap_daily_items=dailyItems;
      heatmapItemsRef.current[selected.id]=dailyItems;
    }
    await update({metadata});
  }
  async function recordHeatCompletion(noteId:string,itemId:string,fallbackNote?:Note){
    const note=notes.find(item=>item.id===noteId)??fallbackNote;
    // Activity is tracked only while Calor is explicitly enabled on this note.
    if(!note||isDraftNote(noteId)||note.metadata?.heatmap_enabled!==true)return;
    const today=localDateKey();
    const currentItems=heatmapItemsRef.current[noteId]??heatmapDailyItems(note);
    const todayItems=currentItems[today]??[];
    // The same checklist item can contribute to a given day only once.
    if(todayItems.includes(itemId))return;
    const nextTodayItems=[...todayItems,itemId];
    const dailyItems={...currentItems,[today]:nextTodayItems};
    heatmapItemsRef.current[noteId]=dailyItems;
    const activity={...heatmapActivity(note),[today]:nextTodayItems.length};
    const metadata={...note.metadata,heatmap_activity:activity,heatmap_daily_items:dailyItems};
    setNotes(v=>v.map(item=>item.id===noteId?{...item,metadata}:item));
    // Serialize writes so quickly completed distinct checklist items are not lost.
    const previous=heatmapSaveQueueRef.current[noteId]??Promise.resolve();
    const save=previous.catch(()=>undefined).then(async()=>{
      const {error:e}=await supabase.from('notes').update({metadata}).eq('id',noteId);
      if(e)setError(e.message);
    });
    heatmapSaveQueueRef.current[noteId]=save;
    await save;
  }
  async function loadSelected(id:string){
    if(isDraftNote(id))return;
    const [c,a]=await Promise.all([supabase.from('note_checklist_items').select('*').eq('note_id',id).order('position'),supabase.from('note_attachments').select('*').eq('note_id',id).order('created_at',{ascending:false})]);
    if(c.data)setCheck(v=>({...v,[id]:c.data as Checklist[]}));
    if(a.data){const arr=await Promise.all((a.data as Attachment[]).map(async x=>x.file_path?({...x,signed_url:(await supabase.storage.from('notes-media').createSignedUrl(x.file_path,3600)).data?.signedUrl}):x));setFiles(v=>({...v,[id]:arr}))}
  }
  async function addItem(parentId:string|null){
    if(!selected)return;
    const arr=check[selected.id]??[];
    const pos=Math.max(-1,...arr.map(x=>Number(x.position)||0))+1;
    if(isDraftNote(selected.id)){
      const item:Checklist={id:'draft-item-'+crypto.randomUUID(),note_id:selected.id,parent_id:parentId,title:'',is_completed:false,position:pos};
      setCheck(v=>({...v,[selected.id]:[...arr,item]}));return;
    }
    const {data,error:e}=await supabase.from('note_checklist_items').insert({note_id:selected.id,parent_id:parentId,title:'',position:pos}).select().single();
    if(e){setError(e.message);return}
    setCheck(v=>({...v,[selected.id]:[...arr,data as Checklist]}))
  }
  async function deleteChecklistItem(item:Checklist){
    if(!selected)return;
    const noteId=selected.id;
    const current=check[noteId]??[];
    const idsToDelete=new Set<string>([item.id]);
    let foundChild=true;
    while(foundChild){
      foundChild=false;
      for(const candidate of current){
        if(candidate.parent_id&&idsToDelete.has(candidate.parent_id)&&!idsToDelete.has(candidate.id)){
          idsToDelete.add(candidate.id);
          foundChild=true;
        }
      }
    }
    const removing=current.filter(candidate=>idsToDelete.has(candidate.id));
    if(!isDraftNote(noteId)){
      const depth=(candidate:Checklist,visited=new Set<string>()):number=>{
        if(!candidate.parent_id||visited.has(candidate.parent_id))return 0;
        const parent=current.find(entry=>entry.id===candidate.parent_id);
        if(!parent)return 0;
        const nextVisited=new Set(visited);nextVisited.add(candidate.id);
        return 1+depth(parent,nextVisited);
      };
      const persisted=removing.filter(candidate=>!candidate.id.startsWith('draft-item-')).sort((a,b)=>depth(b)-depth(a));
      for(const candidate of persisted){
        const {error:e}=await supabase.from('note_checklist_items').delete().eq('id',candidate.id).eq('note_id',noteId);
        if(e){setError('Não foi possível excluir o item da checklist. '+e.message);await loadSelected(noteId);return;}
      }
    }
    setCheck(v=>({...v,[noteId]:(v[noteId]??[]).filter(candidate=>!idsToDelete.has(candidate.id))}));
  }
  async function saveChecklistItem(noteId:string,item:Checklist,patch:Partial<Checklist>){
    const completedNow=patch.is_completed===true&&!item.is_completed;
    const current=check[noteId]??[];
    const arr=current.map(x=>x.id===item.id?{...x,...patch}:x);
    setCheck(v=>({...v,[noteId]:arr}));
    if(isDraftNote(noteId)){
      if(!item.title.trim()&&!String(patch.title??'').trim())return;
      const saved=await persistDraftNote(noteId,{note_type:'checklist'});
      if(!saved)return;
      const draftItem=arr.find(x=>x.id===item.id);if(!draftItem)return;
      const {data,error:e}=await supabase.from('note_checklist_items').insert({note_id:saved.id,parent_id:draftItem.parent_id,title:draftItem.title,is_completed:draftItem.is_completed,position:draftItem.position}).select().single();
      if(e){setError(e.message);return}
      setCheck(v=>{const map={...v};map[saved.id]=(map[saved.id]??[]).map(x=>x.id===item.id?(data as Checklist):x);return map});
      if(completedNow)await recordHeatCompletion(saved.id,(data as Checklist).id,saved);
      return;
    }
    if(patch.is_completed){
      arr.sort((a,b)=>Number(a.is_completed)-Number(b.is_completed));arr.forEach((x,i)=>x.position=i);
      const {error:e}=await supabase.from('note_checklist_items').upsert(arr.map(x=>({id:x.id,note_id:noteId,parent_id:x.parent_id,title:x.title,is_completed:x.is_completed,position:x.position})));
      if(e)setError(e.message);else if(completedNow)await recordHeatCompletion(noteId,item.id);
    }else{
      const {error:e}=await supabase.from('note_checklist_items').update(patch).eq('id',item.id);
      if(e)setError(e.message);
    }
  }
  async function saveItem(item:Checklist,patch:Partial<Checklist>){if(!selected)return;await saveChecklistItem(selected.id,item,patch)}
  async function addLabel(){if(!user||!newLabel.trim())return;const {data,error:e}=await supabase.from('note_labels').insert({user_id:user.id,name:newLabel.trim(),color:selected?.color??'default'}).select().single();if(e)setError(e.message);else{setLabels(v=>[...v,data as Label]);setNewLabel('')}}
  async function toggleLabel(id:string){if(!selected)return;if(isDraftNote(selected.id)){setError('Salve algum conteúdo antes de adicionar marcadores.');return;}const arr=links[selected.id]??[];if(arr.includes(id)){const {error:e}=await supabase.from('note_label_links').delete().eq('note_id',selected.id).eq('label_id',id);if(e){setError(e.message);return}setLinks(v=>({...v,[selected.id]:arr.filter(x=>x!==id)}))}else{const {error:e}=await supabase.from('note_label_links').insert({note_id:selected.id,label_id:id});if(e){setError(e.message);return}setLinks(v=>({...v,[selected.id]:[...arr,id]}))}}
  function beginEditLabel(label:Label){setLabelEditId(label.id);setLabelDraft(label.name)}
  async function saveLabelEdit(label:Label){const name=labelDraft.trim();if(!name||name===label.name){setLabelEditId(null);setLabelDraft('');return}const {data,error:e}=await supabase.from('note_labels').update({name}).eq('id',label.id).select().single();if(e){setError(e.message);return}setLabels(v=>v.map(x=>x.id===label.id?(data as Label):x));setLabelEditId(null);setLabelDraft('')}
  async function deleteLabel(label:Label){const {error:linkError}=await supabase.from('note_label_links').delete().eq('label_id',label.id);if(linkError){setError(linkError.message);return}const {error:e}=await supabase.from('note_labels').delete().eq('id',label.id);if(e){setError(e.message);return}setLabels(v=>v.filter(x=>x.id!==label.id));setLinks(v=>{const next={...v};Object.keys(next).forEach(noteId=>{next[noteId]=(next[noteId]??[]).filter(id=>id!==label.id)});return next});if(labelFilter===label.id)setLabelFilter('all');setLabelEditId(null);setLabelDraft('')}
  async function uploadAttachment(noteId:string,file:File,type:'image'|'drawing'|'file'|'audio'){if(!user)return;const path=user.id+'/'+noteId+'/'+crypto.randomUUID()+'-'+file.name.replace(/[^a-z0-9._-]/gi,'');const {error:e}=await supabase.storage.from('notes-media').upload(path,file,{contentType:file.type,upsert:false});if(e){setError(e.message);return}const {error:dbError}=await supabase.from('note_attachments').insert({note_id:noteId,user_id:user.id,attachment_type:type,file_path:path,file_name:file.name,mime_type:file.type,size_bytes:file.size});if(dbError){await supabase.storage.from('notes-media').remove([path]);setError(dbError.message);return}await loadSelected(noteId)}
  async function upload(file:File,type:'image'|'drawing'|'file'){
    if(!selected)return;
    let noteId=selected.id;
    if(isDraftNote(noteId)){const saved=await persistDraftNote(noteId,{note_type:type==='drawing'?'drawing':type==='image'?'image':selected.note_type},true);if(!saved)return;noteId=saved.id}
    await uploadAttachment(noteId,file,type)
  }
  function img(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(f)void upload(f,'image');e.currentTarget.value=''}
  async function recordStart(){
    if(recording)return;
    if(!navigator.mediaDevices?.getUserMedia){setError('Seu navegador não permite acesso ao microfone.');return}
    if(typeof MediaRecorder==='undefined'){setError('Gravação de áudio não é suportada neste navegador.');return}
    if(!user||!selected)return;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(x=>MediaRecorder.isTypeSupported?.(x))||'';
      const r=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
      mediaRef.current=r;
      chunks.current=[];
      setSeconds(0);
      setRecording(true);

      const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
      if(SR){
        const s=new SR();
        s.lang='pt-BR';
        s.continuous=true;
        s.interimResults=true;
        s.maxAlternatives=1;
        let t='';
        s.onresult=(ev:any)=>{
          let interim='';
          for(let i=ev.resultIndex;i<ev.results.length;i++){
            const phrase=ev.results[i][0]?.transcript||'';
            if(ev.results[i].isFinal)t+=(t?' ':'')+phrase.trim();
            else interim+=phrase;
          }
          const preview=(t+' '+interim).trim();
          if(preview)setNotes(v=>v.map(n=>n.id===selected.id?{...n,transcript:preview}:n));
        };
        s.onerror=(ev:any)=>{
          if(ev?.error==='not-allowed'||ev?.error==='service-not-allowed')setError('Permita o microfone e o reconhecimento de voz no navegador.');
        };
        s.onend=()=>{if(speech.current?.active){try{s.start()}catch{}}};
        speech.current={s,active:true,text:()=>t};
        try{s.start()}catch{}
      }else{
        speech.current={s:null,active:false,text:()=>''};
        setError('Áudio será gravado, mas a transcrição automática não está disponível neste navegador.');
      }

      r.ondataavailable=e=>e.data.size&&chunks.current.push(e.data);
      r.onerror=()=>setError('Não foi possível gravar o áudio.');
      r.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop());
        if(timerRef.current)clearInterval(timerRef.current);
        speech.current?.s?.stop?.();
        const b=new Blob(chunks.current,{type:r.mimeType||'audio/webm'});
        if(!b.size){setRecording(false);return}
        const f=new File([b],'audio-'+Date.now()+'.webm',{type:b.type||'audio/webm'});
        let noteId=selected.id;
        if(isDraftNote(noteId)){const saved=await persistDraftNote(noteId,{note_type:'audio'},true);if(!saved){setRecording(false);speech.current=null;return}noteId=saved.id}
        const path=user.id+'/'+noteId+'/'+crypto.randomUUID()+'.webm';
        const {error:storageError}=await supabase.storage.from('notes-media').upload(path,f,{contentType:f.type,upsert:false});
        if(storageError){setError(storageError.message);setRecording(false);return}
        const tr=(speech.current?.text?.()||'').trim();
        const {error:dbError}=await supabase.from('note_attachments').insert({note_id:noteId,user_id:user.id,attachment_type:'audio',file_path:path,file_name:f.name,mime_type:f.type,size_bytes:f.size,transcript:tr});
        if(dbError){await supabase.storage.from('notes-media').remove([path]);setError(dbError.message);setRecording(false);return}
        setNotes(v=>v.map(x=>x.id===noteId?{...x,transcript:tr}:x));
        await update({transcript:tr});
        await loadSelected(noteId);
        speech.current=null;
        setRecording(false);
        if(tr)setError('Transcrição salva.');
      };
      r.start(250);
      timerRef.current=window.setInterval(()=>setSeconds(v=>v+1),1000);
    }catch(e){setRecording(false);try{speech.current?.s?.stop?.()}catch{}speech.current=null;setError(e instanceof Error?e.message:'Microfone indisponível')}
  }
function recordStop(){if(speech.current){speech.current.active=false;try{speech.current.s?.stop?.()}catch{} }mediaRef.current?.stop();if(timerRef.current)clearInterval(timerRef.current);setRecording(false)}
  function drawDown(e:React.PointerEvent<HTMLCanvasElement>){const c=canvasRef.current;if(!c)return;c.setPointerCapture(e.pointerId);const x=c.getContext('2d')!,r=c.getBoundingClientRect();x.lineCap='round';x.lineJoin='round';x.lineWidth=drawTool==='marker'?14:4;x.globalAlpha=drawTool==='marker'?.25:1;x.strokeStyle=drawTool==='eraser'?'#fff':'#171717';x.beginPath();x.moveTo((e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height)}
  function drawMove(e:React.PointerEvent<HTMLCanvasElement>){const c=canvasRef.current;if(!c||e.buttons!==1)return;const x=c.getContext('2d')!,r=c.getBoundingClientRect();x.lineTo((e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height);x.stroke()}
  async function saveDraw(){if(!user||!selected||!canvasRef.current)return;const b=await new Promise<Blob|null>(r=>canvasRef.current!.toBlob(r,'image/png'));if(!b)return;const f=new File([b],'desenho-'+Date.now()+'.png',{type:'image/png'});await upload(f,'drawing')}
  async function extractOcr(a:Attachment){try{const Detector=(window as any).TextDetector;if(typeof Detector!=='function'){setError('OCR nativo não está disponível neste navegador.');return}if(!a.signed_url||!selected)return;const img=new Image();img.crossOrigin='anonymous';img.src=a.signed_url;await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject});const detector=new Detector();const blocks=await detector.detect(img);const text=blocks.map((b:any)=>b.rawValue||'').join(' ').trim();if(text){await update({ocr_text:(selected.ocr_text?selected.ocr_text+'\n':'')+text});setError('') }else setError('Nenhum texto foi detectado na imagem.')}catch{setError('Não foi possível executar o OCR neste navegador.')}}
  async function fireReminder(r:Reminder){if('Notification' in window&&Notification.permission!=='granted')await Notification.requestPermission();if('Notification' in window&&Notification.permission==='granted')new Notification('Notas',{body:r.title||'Você tem uma nota para lembrar.'});if(r.repeat_rule&&r.repeat_rule!=='none'&&r.remind_at){const d=new Date(r.remind_at);if(r.repeat_rule==='daily')d.setDate(d.getDate()+1);if(r.repeat_rule==='weekly')d.setDate(d.getDate()+7);if(r.repeat_rule==='monthly')d.setMonth(d.getMonth()+1);await supabase.from('note_reminders').update({remind_at:d.toISOString()}).eq('id',r.id);setReminders(v=>v.map(x=>x.id===r.id?{...x,remind_at:d.toISOString()}:x))}else{await supabase.from('note_reminders').update({completed_at:new Date().toISOString()}).eq('id',r.id);setReminders(v=>v.map(x=>x.id===r.id?{...x,completed_at:new Date().toISOString()}:x))}}
  async function addReminder(kind:'datetime'|'location'){if(!selected||!user)return;if(isDraftNote(selected.id)){setError('Adicione conteúdo à nota antes de criar um lembrete.');return;}if(kind==='datetime'&&!remindAt)return;if('Notification'in window&&Notification.permission==='default')await Notification.requestPermission();const payload:any={note_id:selected.id,user_id:user.id,reminder_type:kind,title:selected.title||'Lembrete',repeat_rule:repeat==='none'?null:repeat};if(kind==='datetime')payload.remind_at=new Date(remindAt).toISOString();else await new Promise<void>(resolve=>navigator.geolocation.getCurrentPosition(async p=>{payload.location_lat=p.coords.latitude;payload.location_lng=p.coords.longitude;payload.location_radius_m=250;payload.location_trigger=locationTrigger;resolve()}));const {data,error:e}=await supabase.from('note_reminders').insert(payload).select().single();if(e)setError(e.message);else{setReminders(v=>[...v,data as Reminder]);setReminder(false);await update({reminder_at:kind==='datetime'?payload.remind_at:null})}}
  async function shareNote(){if(!selected)return;const t=(selected.title+'\n\n'+plain(selected.content)).trim();if(navigator.share){try{await navigator.share({title:selected.title||'Nota',text:t})}catch{}}else{await navigator.clipboard?.writeText(t);window.open('mailto:?subject='+encodeURIComponent(selected.title||'Nota')+'&body='+encodeURIComponent(t),'_blank')}}
  async function invite(e:FormEvent){e.preventDefault();if(!selected||!user||!shareEmail.trim())return;if(isDraftNote(selected.id)){setError('Salve algum conteúdo antes de compartilhar a nota.');return;}const token=crypto.randomUUID().replace(/-/g,'');const {data,error:err}=await supabase.from('note_share_invites').insert({note_id:selected.id,inviter_id:user.id,email:shareEmail.trim().toLowerCase(),role:'editor',token}).select().single();if(err){setError(err.message);return}const url=location.origin+'/notes?invite='+data.token;window.open('mailto:'+encodeURIComponent(shareEmail)+'?subject='+encodeURIComponent('Convite para uma nota')+'&body='+encodeURIComponent('Abra e aceite este convite: '+url),'_blank');setShareEmail('')}
  function exportOne(f:'json'|'md'|'txt'){if(!selected)return;const p=plain(selected.content),n=selected.title||'nota';if(f==='json')download(new Blob([JSON.stringify(selected,null,2)],{type:'application/json'}),n+'.json');if(f==='md')download(new Blob(['# '+n+'\n\n'+p],{type:'text/markdown'}),n+'.md');if(f==='txt')download(new Blob([p],{type:'text/plain'}),n+'.txt')}
  function exportAll(){download(new Blob([JSON.stringify(notes,null,2)],{type:'application/json'}),'notas-export.json')}
  async function importTakeout(filesList:FileList|null){if(!user||!filesList)return;for(const file of Array.from(filesList)){try{if(file.name.toLowerCase().endsWith('.json')){const raw=JSON.parse(await file.text());const list=Array.isArray(raw)?raw:[raw];for(const item of list){const {title,content}=item as any;if(title||content)await supabase.from('notes').insert({user_id:user.id,title:title||'Importado',content:content||'',note_type:'text',metadata:{source:'google-takeout'}})}}else if(file.name.toLowerCase().endsWith('.html')||file.type==='text/html'){const html=await file.text(),doc=new DOMParser().parseFromString(html,'text/html'),title=doc.querySelector('title')?.textContent||doc.querySelector('h1')?.textContent||file.name,content=sanitizeHtml(doc.body?.innerHTML||'');await supabase.from('notes').insert({user_id:user.id,title,content,note_type:'text',metadata:{source:'google-takeout-html'}})}}catch{setError('Não foi possível importar '+file.name)}}await load()}
  async function copyDocs(note:Note|null=selected){if(!note)return;await navigator.clipboard?.writeText((note.title+'\n\n'+plain(note.content)).trim());window.open('https://docs.google.com/document/create','_blank');setQuickAction(null);setMore(false)}
  async function removeNoteById(id:string){const ok=await updateNoteById(id,{is_deleted:true,deleted_at:new Date().toISOString()});if(ok){if(selectedId===id)closeEditor();setQuickAction(null)}}
  async function restoreNoteById(id:string){const note=notes.find(x=>x.id===id);if(!note||note.user_id!==user?.id)return;const ok=await updateNoteById(id,{is_deleted:false,deleted_at:null});if(ok){setQuickAction(null);setPermanentDeleteId(null)}}
  async function permanentlyDeleteNoteById(id:string){
    const note=notes.find(x=>x.id===id);
    if(!note||note.user_id!==user?.id)return;
    const {data:attachments,error:attachmentError}=await supabase.from('note_attachments').select('file_path').eq('note_id',id);
    if(attachmentError){setError(attachmentError.message);return}
    const paths=(attachments??[]).map((a:any)=>a.file_path).filter(Boolean) as string[];
    if(paths.length){
      const {error:storageError}=await supabase.storage.from('notes-media').remove(paths);
      if(storageError){setError('Não foi possível remover os arquivos anexados. Tente novamente.');return}
    }
    const {error:e}=await supabase.from('notes').delete().eq('id',id).eq('user_id',user.id);
    if(e){setError(e.message);return}
    setNotes(v=>v.filter(x=>x.id!==id));
    setFiles(v=>{const next={...v};delete next[id];return next});
    setLinks(v=>{const next={...v};delete next[id];return next});
    setCheck(v=>{const next={...v};delete next[id];return next});
    setQuickAction(null);
    setPermanentDeleteId(null);
  }
  async function remove(){if(!selected)return;await removeNoteById(selected.id)}
  async function removeAttachment(a:Attachment){if(!selected||a.attachment_type!=='image')return;if(a.file_path){const {error:e}=await supabase.storage.from('notes-media').remove([a.file_path]);if(e){setError(e.message);return}}const {error:e}=await supabase.from('note_attachments').delete().eq('id',a.id).eq('note_id',selected.id);if(e){setError(e.message);return}setFiles(v=>({...v,[selected.id]:(v[selected.id]??[]).filter(x=>x.id!==a.id)}))}
  async function downloadFile(a:Attachment){if(!a.signed_url)return;download(await (await fetch(a.signed_url)).blob(),a.file_name||'arquivo')}
  const visible=useMemo(()=>notes.filter(n=>{if(n.id.startsWith('draft-'))return false;if(filter==='trash')return n.is_deleted&&n.user_id===user?.id;if(n.is_deleted)return false;if(filter==='pinned')return n.is_pinned;if(filter==='archive')return n.is_archived;return !n.is_archived && (folderId ? (folderLinks[n.id]??(n.folder_id?[n.folder_id]:[])).includes(folderId) : (folderLinks[n.id]??(n.folder_id?[n.folder_id]:[])).length===0)}).filter(n=>typeFilter==='all'||n.note_type===typeFilter).filter(n=>colorFilter==='all'||n.color===colorFilter).filter(n=>labelFilter==='all'||(links[n.id]??[]).includes(labelFilter)).filter(n=>reminderFilter==='all'||(reminderFilter==='with'?reminders.some(r=>r.note_id===n.id&&!r.completed_at):!reminders.some(r=>r.note_id===n.id&&!r.completed_at))).filter(n=>!query||(n.title+' '+plain(n.content)+' '+n.ocr_text+' '+n.transcript).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.is_pinned===b.is_pinned?(a.sort_order-b.sort_order):a.is_pinned?-1:1),[notes,filter,folderId,folderLinks,typeFilter,colorFilter,labelFilter,reminderFilter,links,reminders,query]);

  return <div className={cn('notes-shell',dark&&'is-dark')}>
    <aside className="notes-sidebar"><div className="notes-brand"><div><strong>Notas</strong><span>Espaço pessoal</span></div></div>
      <div className="notes-new-wrap"><button className="notes-new" onClick={()=>void create('text')}><Plus size={17}/> Nova nota <kbd>⌘N</kbd></button><button className="notes-new-menu" onClick={()=>setNewMenu(v=>!v)}><ChevronDown size={15}/></button>{newMenu&&<div className="notes-popover new-menu">{types.map(t=><button key={t.key} onClick={()=>void create(t.key)}><t.icon size={15}/>{t.label}</button>)}</div>}</div>
      <nav className="notes-nav"><button className={cn('notes-nav-item',filter==='all'&&!folderId&&'active')} onClick={()=>{setFilter('all');setFolderId(null);closeEditor()}}><Grid2X2 size={16}/><span>Todas</span></button><button className="notes-nav-item" onClick={()=>{window.history.pushState({},'', '/map');window.dispatchEvent(new PopStateEvent('popstate'))}}><Map size={16}/><span>Mapa</span></button>
        <div className="notes-folder-section"><div className="notes-folder-heading"><span>Pastas</span><button title="Criar pasta" aria-label="Criar pasta ou usar modelo" onClick={()=>setTemplatesOpen(true)}><FolderPlus size={15}/></button></div>
          {folders.map(folder=><div className={cn('notes-folder-row',folderId===folder.id&&filter==='all'&&'active')} key={folder.id}><button className="notes-folder-main" onClick={()=>{setFilter('all');setFolderId(folder.id);closeEditor()}}>{folder.icon==='network'?<Network size={15} style={{color:folder.color}}/>:folder.icon==='key-round'?<KeyRound size={15} style={{color:folder.color}}/>:folder.icon==='book-open'?<BookOpen size={15} style={{color:folder.color}}/>:<Folder size={15} style={{color:folder.color||undefined}}/>}<span>{folder.name}</span><small>{notes.filter(n=>!n.is_deleted&&(folderLinks[n.id]??(n.folder_id?[n.folder_id]:[])).includes(folder.id)).length}</small></button><button className={cn('notes-folder-more',folderMenuId===folder.id&&'active')} title="Opções da pasta" onClick={e=>{e.stopPropagation();openFolderMenu(folder)}}><MoreHorizontal size={14}/></button>{folderMenuId===folder.id&&<div className="notes-popover folder-action-popover" onClick={e=>e.stopPropagation()}>{folderDeleteId===folder.id?<><strong>Excluir pasta?</strong><p>As notas serão mantidas em Todas as notas.</p><div className="folder-confirm-actions"><button onClick={()=>{setFolderDeleteId(null);setFolderMenuId(null)}}>Cancelar</button><button className="danger" onClick={()=>void deleteFolder(folder)}>Excluir</button></div></>:folderEditId===folder.id?<><input autoFocus value={folderDraft} onChange={e=>setFolderDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void saveFolderRename(folder);if(e.key==='Escape'){setFolderEditId(null);setFolderMenuId(null)}}}/><div className="folder-confirm-actions"><button onClick={()=>{setFolderEditId(null);setFolderMenuId(null)}}>Cancelar</button><button onClick={()=>void saveFolderRename(folder)}>Salvar</button></div></>:<><button onClick={()=>beginRenameFolder(folder)}><FileText size={14}/> Renomear</button><button className="danger" onClick={()=>askDeleteFolder(folder)}><Trash2 size={14}/> Excluir</button></>}</div>}</div>)}
          
        </div>
        <button className={cn('notes-nav-item',filter==='pinned'&&'active')} onClick={()=>{setFilter('pinned');setFolderId(null);closeEditor()}}><Pin size={16}/><span>Fixadas</span></button>
        <button className={cn('notes-nav-item',filter==='archive'&&'active')} onClick={()=>{setFilter('archive');setFolderId(null);closeEditor()}}><Archive size={16}/><span>Arquivo</span></button>
        <button className={cn('notes-nav-item',filter==='trash'&&'active')} onClick={()=>{setFilter('trash');setFolderId(null);closeEditor()}}><Trash2 size={16}/><span>Lixeira</span></button>
      </nav>
      
      <div className="notes-sidebar-extra"><button onClick={()=>setFilters(v=>!v)}><Filter size={14}/> Filtros</button><button onClick={exportAll}><Download size={14}/> Exportar tudo</button><label className="notes-import-button"><Upload size={14}/> Importar Takeout<input hidden type="file" multiple accept=".json,.html,text/html,application/json" onChange={e=>void importTakeout(e.target.files)}/></label><button onClick={()=>setSettingsOpen(true)}><Settings size={14}/> Configurações</button></div>
    </aside>
    <div className="notes-mobile-backdrop" onClick={()=>document.querySelector(".notes-sidebar")?.classList.remove("mobile-open")} />
    <main className="notes-main"><header className="notes-toolbar"><button className="notes-menu-button" onClick={()=>document.querySelector('.notes-sidebar')?.classList.toggle('mobile-open')}><Menu size={18}/></button><div className="notes-search"><Search size={17}/><input id="notes-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar notas..." /><kbd><Command size={11}/>K</kbd></div><div className="notes-toolbar-actions"><button className={cn('notes-icon-button',view==='grid'&&'active')} onClick={()=>setView('grid')}><Grid2X2 size={17}/></button><button className={cn('notes-icon-button',view==='list'&&'active')} onClick={()=>setView('list')}><List size={17}/></button><button className="notes-primary" onClick={()=>void create('text')}><Plus size={16}/><span>Nova</span></button><button className="notes-icon-button notes-help-button" title="Ajuda" aria-label="Abrir ajuda" onClick={()=>setHelpOpen(true)}><CircleHelp size={17}/></button><button className="notes-icon-button" title={dark?'Modo claro':'Modo escuro'} onClick={()=>setTheme(theme==='system'?'dark':theme==='dark'?'light':'system')}>{dark?<Moon size={17}/>:<Sun size={17}/>}</button></div></header>
      {filters&&<div className="notes-filter-bar"><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value as any)}><option value="all">Todos os tipos</option>{types.map(t=><option value={t.key} key={t.key}>{t.label}</option>)}</select><select value={colorFilter} onChange={e=>setColorFilter(e.target.value as any)}><option value="all">Todas as cores</option>{colorOptions.map(c=><option value={c.key} key={c.key}>{c.label}</option>)}</select><select value={labelFilter} onChange={e=>setLabelFilter(e.target.value)}><option value="all">Todos os marcadores</option>{labels.map(l=><option value={l.id} key={l.id}>{l.name}</option>)}</select><select value={reminderFilter} onChange={e=>setReminderFilter(e.target.value)}><option value="all">Qualquer lembrete</option><option value="with">Com lembrete</option><option value="without">Sem lembrete</option></select></div>}
      <section className={cn('notes-content',view==='list'&&'list-view')}><div className="notes-heading"><div><p className="eyebrow">{filter==='trash'?'Excluídas · restaure ou exclua definitivamente':filter==='archive'?'Notas arquivadas':'Seu espaço'}</p><h1>{filter==='trash'?'Lixeira':filter==='pinned'?'Fixadas':filter==='archive'?'Arquivo':activeFolder?.name||'Todas as notas'}</h1></div><span>{visible.length}</span></div>{error&&<div className="notes-alert">{error}<button onClick={()=>setError('')}><X size={14}/></button></div>}{loading?<div className="notes-empty"><Loader2 className="spin" size={22}/><p>Carregando…</p></div>:visible.length===0?<div className="notes-empty"><div className="empty-orb">{filter==='trash'?<Trash2 size={20}/>:<Plus size={20}/>}</div><h2>{filter==='trash'?'Lixeira vazia':filter==='pinned'?'Nenhuma nota fixada':filter==='archive'?'Arquivo vazio':'Comece com uma nota'}</h2><p>{filter==='trash'?'Notas excluídas aparecem aqui antes da remoção definitiva.':'Texto, checklist, foto, desenho ou voz.'}</p>{filter!=='trash'&&<button className="notes-primary" onClick={()=>void create('text')}><Plus size={16}/> Criar nota</button>}</div>:<div className="notes-grid">{visible.map(n=>{const imageFiles=(files[n.id]??[]).filter(a=>a.attachment_type==='image'&&a.signed_url);const completedCount=(check[n.id]??[]).filter(item=>item.is_completed).length;const heatmapEnabled=n.metadata?.heatmap_enabled===true;return <article key={n.id} draggable={filter==='all'} onDragStart={e=>e.dataTransfer.setData('text/plain',n.id)} onDragOver={e=>e.preventDefault()} onDrop={async e=>{const d=e.dataTransfer.getData('text/plain');if(!d||d===n.id)return;const arr=[...notes].sort((a,b)=>a.sort_order-b.sort_order),from=arr.findIndex(x=>x.id===d),to=arr.findIndex(x=>x.id===n.id);if(from<0||to<0)return;const[m]=arr.splice(from,1);arr.splice(to,0,m);arr.forEach((x,i)=>x.sort_order=i);setNotes(arr);await Promise.all(arr.map(x=>supabase.from('notes').update({sort_order:x.sort_order}).eq('id',x.id)))}} className={cn('note-card','note-color-'+n.color)} onClick={()=>{setQuickAction(null);setEditorType('text');setSelectedId(n.id)}}><span className={cn('note-card-select-check',selectedId===n.id&&'selected')} aria-hidden="true"><Check size={14}/></span>{imageFiles.length>0&&<div className={cn('note-card-images',imageFiles.length===1?'single':'multi')}>{imageFiles.map(a=><div className="note-card-image-cell" key={a.id}><img src={a.signed_url} alt={a.file_name||'Imagem da nota'}/></div>)}</div>}{n.note_type==='image'&&imageFiles.length===0&&<div className="note-card-cover-placeholder"><ImagePlus size={20}/></div>}<div className="note-card-body"><h3>{n.title||'Sem título'}</h3>{n.note_type==='checklist'?(<div className="note-card-checklist" onClick={e=>e.stopPropagation()}>{(check[n.id]??[]).slice().sort((a,b)=>a.position-b.position).slice(0,6).map(item=><div className="note-card-check-row" key={item.id}><button type="button" className={cn('note-card-check-box',item.is_completed&&'done')} aria-label={item.is_completed?'Desmarcar item':'Concluir item'} onClick={()=>void saveChecklistItem(n.id,item,{is_completed:!item.is_completed})}>{item.is_completed&&<Check size={12}/>}</button><input value={item.title} placeholder="Item da lista" onClick={e=>e.stopPropagation()} onChange={e=>setCheck(v=>({...v,[n.id]:(v[n.id]??[]).map(x=>x.id===item.id?{...x,title:e.target.value}:x)}))} onBlur={e=>void saveChecklistItem(n.id,item,{title:e.target.value.trim()})}/></div>)}{(check[n.id]??[]).length>6&&<span className="note-card-check-more">+{(check[n.id]??[]).length-6} itens</span>}{(check[n.id]??[]).length===0&&<span className="note-card-check-empty">Sem itens ainda.</span>}</div>):<p>{plain(n.content)||n.ocr_text||n.transcript||'Sem conteúdo ainda.'}</p>}{heatmapEnabled&&completedCount>0&&<NoteHeatmap activity={n.metadata?.heatmap_activity} dailyItems={n.metadata?.heatmap_daily_items} checklistItems={check[n.id]??[]} noteTitle={n.title||'Sem título'} dark={dark}/>}{(links[n.id]??[]).length>0&&<div className="note-labels">{(links[n.id]??[]).map(id=>labels.find(l=>l.id===id)).filter(Boolean).slice(0,3).map(l=><span key={l!.id}>{l!.name}</span>)}</div>}</div><div className="note-quick-actions" onClick={e=>e.stopPropagation()}>{filter==='trash'?<button title="Ações da lixeira" className={cn(quickAction?.id===n.id&&quickAction.type==='more'&&'active')} onClick={()=>setQuickAction(v=>v?.id===n.id&&v.type==='more'?null:{id:n.id,type:'more'})}><MoreHorizontal size={18}/></button>:<><button title="Opções de fundo" className={cn(quickAction?.id===n.id&&quickAction.type==='palette'&&'active')} onClick={()=>setQuickAction(v=>v?.id===n.id&&v.type==='palette'?null:{id:n.id,type:'palette'})}><Palette size={18}/></button><button title="Lembrete" className={cn(quickAction?.id===n.id&&quickAction.type==='reminder'&&'active')} onClick={()=>setQuickAction(v=>v?.id===n.id&&v.type==='reminder'?null:{id:n.id,type:'reminder'})}><Clock3 size={18}/></button><button title="Colaborador" onClick={()=>void quickShare(n)}><Share2 size={18}/></button><label className="note-card-icon-button" title="Adicionar imagem" onClick={e=>e.stopPropagation()}><ImagePlus size={18}/><input hidden type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)void uploadAttachment(n.id,f,'image');e.currentTarget.value=''}}/></label><button title={filter==='archive'?'Restaurar para notas':'Arquivar'} onClick={()=>{void updateNoteById(n.id,{is_archived:filter!=='archive'});setQuickAction(null)}}>{filter==='archive'?<RotateCcw size={18}/>:<Archive size={18}/>}</button><button title="Mais opções" className={cn(quickAction?.id===n.id&&quickAction.type==='more'&&'active')} onClick={()=>setQuickAction(v=>v?.id===n.id&&v.type==='more'?null:{id:n.id,type:'more'})}><MoreHorizontal size={18}/></button></>}</div>{quickAction?.id===n.id&&quickAction.type==='more'&&<div className="note-quick-popover note-more-quick" onClick={e=>e.stopPropagation()}>{filter==='trash'?permanentDeleteId===n.id?<><strong>Excluir permanentemente?</strong><p>Esta ação não pode ser desfeita.</p><div className="folder-confirm-actions"><button onClick={()=>setPermanentDeleteId(null)}>Cancelar</button><button className="danger" onClick={()=>void permanentlyDeleteNoteById(n.id)}>Excluir</button></div></>:<><button onClick={()=>void restoreNoteById(n.id)}><RotateCcw size={14}/> Restaurar{n.folder_id?' para a pasta original':''}</button><button className="danger" onClick={()=>setPermanentDeleteId(n.id)}><Trash2 size={14}/> Excluir definitivamente</button></>:<><button onClick={()=>void copyDocs(n)}><FileText size={14}/> Copiar para Google Docs</button><button className="danger" onClick={()=>void removeNoteById(n.id)}><Trash2 size={14}/> Excluir nota</button></>}</div>}{quickAction?.id===n.id&&quickAction.type==='palette'&&<div className="note-quick-popover note-color-popover" onClick={e=>e.stopPropagation()}>{colorOptions.map(col=><button key={col.key} title={col.label} className={cn('quick-color-dot',n.color===col.key&&'selected')} style={{background:col.hex}} onClick={()=>{void updateNoteById(n.id,{color:col.key});setQuickAction(null)}} />)}</div>}{quickAction?.id===n.id&&quickAction.type==='reminder'&&<div className="note-quick-popover note-reminder-quick" onClick={e=>e.stopPropagation()}><label>Data e hora<input type="datetime-local" value={quickReminderAt} onChange={e=>setQuickReminderAt(e.target.value)}/></label><select value={quickRepeat} onChange={e=>setQuickRepeat(e.target.value)}><option value="none">Não repetir</option><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select><button onClick={()=>void quickAddReminder(n)}>Salvar lembrete</button></div>}</article>})}</div>}</section></main>
      <nav className="notes-mobile-tabbar" aria-label="Navegação principal">
        <button className={cn('notes-mobile-tab',filter==='all'&&!folderId&&'active')} onClick={()=>{setFilter('all');setFolderId(null);closeEditor()}}><Grid2X2 size={19}/><span>Notas</span></button>
        <button className={cn('notes-mobile-tab',filter==='pinned'&&'active')} onClick={()=>{setFilter('pinned');setFolderId(null);closeEditor()}}><Pin size={19}/><span>Fixadas</span></button>
        <button className="notes-mobile-create" aria-label="Nova nota" onClick={()=>void create('text')}><Plus size={21}/></button>
        <button className={cn('notes-mobile-tab',filter==='trash'&&'active')} onClick={()=>{setFilter('trash');setFolderId(null);closeEditor()}}><Trash2 size={19}/><span>Lixeira</span></button>
        <button className="notes-mobile-tab" onClick={()=>document.querySelector('.notes-sidebar')?.classList.add('mobile-open')}><Menu size={19}/><span>Mais</span></button>
      </nav>
    <HelpCenter open={helpOpen} onClose={()=>setHelpOpen(false)} onCreateNote={()=>void create('text')} onOpenMap={()=>{window.history.pushState({},'', '/map');window.dispatchEvent(new PopStateEvent('popstate'))}} /><FolderTemplatesModal open={templatesOpen} busyTemplateId={templateCreating} onClose={()=>setTemplatesOpen(false)} onCreate={createFolderTemplate} onCreateCustom={createFolderFromScratch} /><SettingsPage open={settingsOpen} onClose={closeSettings} onThemeChange={setTheme} />
    {selected&&<div className="notes-editor-overlay" onMouseDown={e=>{if(e.currentTarget===e.target)closeEditor()}}><section className={cn('notes-editor','note-color-'+selected.color)}>
      <header className="notes-editor-header"><button className="notes-icon-button" onClick={closeEditor}><ChevronLeft size={18}/></button><div className="editor-actions"><span className="editor-date">Criada em {new Date(selected.created_at).toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}</span><span className={cn(selectedLocked&&'locked-status')}>{selectedLocked?'Bloqueado':saving?'Salvando…':'Salvo'}</span><button className={cn('notes-icon-button',selected.is_pinned&&'active')} title={selected.is_pinned?'Desafixar':'Fixar'} onClick={()=>void update({is_pinned:!selected.is_pinned})}><Pin size={17}/></button><button className="notes-icon-button" title={selected.is_archived?'Restaurar para notas':'Arquivar'} onClick={()=>{void update({is_archived:!selected.is_archived});if(selected.is_archived)closeEditor()}}>{selected.is_archived?<RotateCcw size={17}/>:<Archive size={17}/>}</button><button className="notes-icon-button" onClick={()=>setReminder(v=>!v)}><Clock3 size={17}/></button><button className="notes-icon-button" onClick={()=>setShare(v=>!v)}><Share2 size={17}/></button><button className="notes-icon-button" onClick={()=>setLabelPanel(v=>!v)}><Tag size={17}/></button><button className="notes-icon-button" title={selectedFolders.length?selectedFolders.map(folder=>folder.name).join(', '):'Vincular pastas'} onClick={()=>setQuickAction(v=>v?.id===selected.id&&v.type==='folder'?null:{id:selected.id,type:'folder'})}><Folder size={17}/></button>{quickAction?.id===selected.id&&quickAction.type==='folder'&&<div className="note-quick-popover editor-folder-popover" onClick={e=>e.stopPropagation()}><div className="editor-folder-summary"><strong>Pastas vinculadas</strong><span>{folderIdsFor(selected).length} selecionada(s)</span></div><div className="quick-label-list folder-multi-select">{folders.map(f=>{const assigned=folderIdsFor(selected).includes(f.id);return <button type="button" key={f.id} aria-pressed={assigned} className={cn(assigned&&'active')} onClick={()=>{const current=folderIdsFor(selected);void assignFolders(selected.id,assigned?current.filter(id=>id!==f.id):[...current,f.id])}}>{assigned?<CheckSquare size={13}/>:<Square size={13}/>}<Folder size={12}/><span>{f.name}</span></button>})}{folders.length===0&&<p className="folder-multi-empty">Crie uma pasta na barra lateral para começar.</p>}</div><p className="editor-folder-help">Você pode vincular uma nota a várias pastas.</p></div>}<button className={cn('notes-icon-button','heatmap-toggle',selectedHeatEnabled&&'active')} type="button" title={selectedHeatEnabled?'Desativar calor':'Ativar calor'} aria-label={selectedHeatEnabled?'Desativar calor':'Ativar calor'} aria-pressed={selectedHeatEnabled} onClick={()=>void toggleHeatmap()}><Flame size={17}/></button><button className="notes-icon-button" title="Copiar texto" onClick={()=>void copyText(selected)}><Copy size={17}/></button><button className={cn('notes-icon-button',selectedLocked&&'active')} title={selectedLocked?'Desbloquear texto':'Bloquear texto'} onClick={()=>void toggleTextLock()}>{selectedLocked?<Lock size={17}/>:<LockOpen size={17}/>}</button><button className="notes-icon-button" onClick={()=>setMore(v=>!v)}><MoreHorizontal size={17}/></button><button className="notes-icon-button danger" onClick={()=>void remove()}><Trash2 size={17}/></button></div></header>
      <div className="editor-type-tabs">{types.map(t=><button key={t.key} className={editorType===t.key?'active':''} onClick={()=>{setEditorType(t.key);void update({note_type:t.key})}}><t.icon size={14}/>{t.label}</button>)}</div>
      {more&&<div className="notes-popover editor-menu"><button onClick={()=>window.print()}><Printer size={15}/> Imprimir</button><button onClick={()=>void shareNote()}><Send size={15}/> Enviar / compartilhar</button><button onClick={()=>void copyDocs()}><FileText size={15}/> Copiar para Google Docs</button><button onClick={()=>exportOne('md')}><FileDown size={15}/> Markdown</button><button onClick={()=>exportOne('txt')}><Download size={15}/> Texto</button><button onClick={()=>exportOne('json')}><FileDown size={15}/> JSON</button></div>}
      {share&&<div className="notes-popover share-panel"><h3>Compartilhar</h3><p>Envie um convite por e-mail. A edição conjunta sincroniza pelo banco em tempo real.</p><form onSubmit={invite}><input type="email" required value={shareEmail} onChange={e=>setShareEmail(e.target.value)} placeholder="email@exemplo.com"/><button className="notes-primary"><Mail size={14}/> Criar convite</button></form></div>}
      {reminder&&<div className="notes-popover reminder-panel"><label>Data e hora<input type="datetime-local" value={remindAt} onChange={e=>setRemindAt(e.target.value)}/></label><label>Repetição<select value={repeat} onChange={e=>setRepeat(e.target.value)}><option value="none">Não repetir</option><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select></label><button onClick={()=>void addReminder('datetime')}>Salvar lembrete</button><div className="location-choice"><button className={locationTrigger==='arrive'?'active':''} onClick={()=>setLocationTrigger('arrive')}>Ao chegar</button><button className={locationTrigger==='leave'?'active':''} onClick={()=>setLocationTrigger('leave')}>Ao sair</button></div><button onClick={()=>void addReminder('location')}><MapPin size={14}/> Lembrete por localização</button></div>}
      {labelPanel&&<div className="notes-popover labels-panel"><div className="label-manager-list">{labels.map(l=>labelEditId===l.id?<div className="label-manager-row editing" key={l.id}><input autoFocus value={labelDraft} onChange={e=>setLabelDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')void saveLabelEdit(l);if(e.key==='Escape'){setLabelEditId(null);setLabelDraft('')}}}/><button className="label-manager-save" title="Salvar" onClick={()=>void saveLabelEdit(l)}><Check size={14}/></button><button className="label-manager-cancel" title="Cancelar" onClick={()=>{setLabelEditId(null);setLabelDraft('')}}><X size={14}/></button></div>:<div className="label-manager-row" key={l.id}><button className={cn('label-manager-name',(links[selected.id]??[]).includes(l.id)&&'active')} onClick={()=>void toggleLabel(l.id)}>{l.name}</button><button className="label-manager-icon" title="Editar tag" onClick={()=>beginEditLabel(l)}><Pencil size={13}/></button><button className="label-manager-icon danger" title="Excluir tag" onClick={()=>void deleteLabel(l)}><Trash2 size={13}/></button></div>)}</div><div className="label-create"><input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Nova tag"/><button onClick={()=>void addLabel()} title="Criar tag"><Plus size={14}/></button></div></div>}
      <input className="notes-title-input" value={titleDraft} readOnly={selectedLocked} onChange={e=>setTitleDraft(e.target.value)} onBlur={()=>{if(selected&&!selectedLocked&&titleDraft!==selected.title)void update({title:titleDraft})}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();e.currentTarget.blur()}}} placeholder="Título"/>
      {editorType==='text'&&<>{!selectedLocked&&<div className="editor-formatbar"><button onClick={()=>document.execCommand('bold')}><Bold size={15}/></button><button onClick={()=>document.execCommand('italic')}><Italic size={15}/></button><button onClick={()=>document.execCommand('underline')}><Underline size={15}/></button><button onClick={()=>{const u=prompt('URL do link');if(u)document.execCommand('createLink',false,u)}}><Link2 size={15}/></button></div>}<div className={cn('notes-body-editor',selectedLocked&&'is-locked')} key={selected.id} ref={e=>{editorRef.current=e;if(e&&!e.dataset.ready){e.innerHTML=sanitizeHtml(selected.content||'');e.dataset.ready='1'}}} contentEditable={!selectedLocked} suppressContentEditableWarning onPaste={e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'))}} onInput={e=>queue({content:sanitizeHtml(e.currentTarget.innerHTML)})} data-placeholder={selectedLocked?'Texto bloqueado':'Escreva o que estiver pensando…'}/></>}
      {editorType==='checklist'&&<div className="checklist-editor">{(check[selected.id]??[]).sort((a,b)=>a.position-b.position).map(i=><div className={cn('check-row',i.parent_id&&'subitem')} key={i.id}><button className={cn('check-box',i.is_completed&&'done')} onClick={()=>void saveItem(i,{is_completed:!i.is_completed})}>{i.is_completed&&<Check size={13}/>}</button><input value={i.title} onChange={e=>setCheck(v=>({...v,[selected.id]:(v[selected.id]??[]).map(x=>x.id===i.id?{...x,title:e.target.value}:x)}))} onBlur={e=>void saveItem(i,{title:e.target.value})} placeholder="Item"/><button type="button" title="Adicionar subitem" aria-label="Adicionar subitem" onClick={()=>void addItem(i.id)}><Plus size={14}/></button><button type="button" className="delete-check-item" title="Excluir item e subitens" aria-label="Excluir item e subitens" onClick={()=>void deleteChecklistItem(i)}><Trash2 size={14}/></button></div>)}<button className="add-check" onClick={()=>void addItem(null)}><Plus size={15}/> Adicionar item</button></div>}
      {editorType==='image'&&<div className="media-note"><label className="notes-primary"><ImagePlus size={15}/> Foto / câmera<input hidden type="file" accept="image/*" capture="environment" onChange={img}/></label>{(files[selected.id]??[]).filter(x=>x.attachment_type==='image').map(a=><div className="attachment-card" key={a.id}>{a.signed_url&&<img src={a.signed_url} alt={a.file_name}/>}<div className="attachment-actions"><button onClick={()=>void extractOcr(a)}>Extrair texto</button><button onClick={()=>void downloadFile(a)}><Download size={14}/> Baixar</button><button className="danger" title="Excluir imagem" onClick={()=>void removeAttachment(a)}><Trash2 size={14}/> Excluir</button></div></div>)}</div>}
      {editorType==='audio'&&<div className="audio-editor"><button className={cn('record-button',recording&&'stop')} onClick={()=>recording?recordStop():void recordStart()}>{recording?<Square size={17}/>:<Mic size={20}/>}</button><strong>{recording?'Gravando…':'Gravar áudio'}</strong><span>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</span><label className="audio-upload-label"><Upload size={14}/> Adicionar arquivo de áudio<input hidden type="file" accept="audio/*" onChange={e=>{const f=e.target.files?.[0];if(f&&selected)void uploadAttachment(selected.id,f,'audio');e.currentTarget.value=''}}/></label><p>{selected.transcript||'A transcrição aparece aqui quando o navegador oferecer reconhecimento de voz.'}</p>{(files[selected.id]??[]).filter(x=>x.attachment_type==='audio').map(a=><div className="audio-item" key={a.id}><audio controls src={a.signed_url}/>{a.transcript&&<small>{a.transcript}</small>}</div>)}</div>}
      {editorType==='drawing'&&<div className="drawing-editor"><div className="drawing-toolbar"><button className={drawTool==='pen'?'active':''} onClick={()=>setDrawTool('pen')}>Caneta</button><button className={drawTool==='marker'?'active':''} onClick={()=>setDrawTool('marker')}>Marcador</button><button className={drawTool==='eraser'?'active':''} onClick={()=>setDrawTool('eraser')}><Eraser size={14}/> Borracha</button><button onClick={()=>void saveDraw()}><Check size={14}/> Salvar</button></div><canvas ref={canvasRef} width={1200} height={650} onPointerDown={drawDown} onPointerMove={drawMove} className="drawing-canvas"/></div>}
      <footer className="notes-editor-footer"><div className="color-picker">{colorOptions.map(c=><button key={c.key} title={c.label} className={cn('color-dot',selected.color===c.key&&'selected')} style={{background:c.hex}} onClick={()=>void update({color:c.key})}/>)}</div><div className="editor-footer-right"><label className="attach-button"><Upload size={14}/><input hidden type="file" onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f,'file')}}/></label><span>{plain(selected.content).split(/\s+/).filter(Boolean).length} palavras</span></div></footer>
    </section></div>}
  </div>
}