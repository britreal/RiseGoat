import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, PageHeader, Spinner } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { uploadUserImage } from '@/lib/storage';
import { buildCoverPng, buildDocx, buildEpub, buildPdf, downloadBookFile } from '@/lib/bookExports';
import type {
  Book, BookChapter, BookChapterStatus, BookExport, BookExportFormat, BookGenre, BookRights, BookStatus,
  ProductLanguage, ProductPlatform,
} from '@/types';
import {
  BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Download, FileText, ImagePlus,
  Library, MessageSquare, PackageOpen, Plus, Save, Search, Sparkles,
  Volume2, X
} from 'lucide-react';

type View = 'dashboard' | 'wizard' | 'editor' | 'review' | 'cover' | 'metadata' | 'exports';
type DashboardFilter = { status:string; genre:string };
type BookWithStats = Book & { word_count:number; chapter_count:number; progress:number };
type Checklist = { grammar:boolean; cohesion:boolean; clarity:boolean };

const GENRES:BookGenre[]=['Ficção','Não-ficção','Autoajuda','Negócios','Filosofia','Poesia'];
const STATUSES:BookStatus[]=['Conceito','Estrutura','Escrita','Revisão','Capa','Metadados','Pronto'];
const RIGHTS:BookRights[]=['Todos os direitos reservados','Creative Commons','Domínio público'];
const LANGUAGES:ProductLanguage[]=['PT','EN','ES','FR','DE','IT','JP','ZH'];
const PLATFORMS:ProductPlatform[]=['Amazon KDP','Gumroad','Hotmart','Kiwify','Etsy','Payhip','Creative Market','Apple Books','Google Play'];
const STEP_NAMES=['Conceito','Estrutura','Escrita','Revisão','Capa','Metadados','Exportação'];

const wordsOf=(text:string)=>text.trim()?text.trim().split(/\s+/).length:0;
const bookWords=(chapters:BookChapter[])=>chapters.reduce((sum,ch)=>sum+Number(ch.word_count||wordsOf(ch.content)),0);
const progressOf=(book:Book,words:number)=>Math.max(0,Math.min(100,Math.round(words/Math.max(1,book.estimated_words)*100)));
const todayISO=()=>new Date().toISOString().slice(0,10);
const slug=(s:string)=>s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90);
const newBook=(authorName:string):Book=>({
  id:'',user_id:'',product_id:null,title:'',subtitle:'',genre:'Não-ficção',target_audience:'',promise:'',tone:'',
  estimated_words:10000,language:'PT',platform:'Amazon KDP',status:'Conceito',current_step:1,cover_image:'',
  description:'',keywords:[],categories:[],isbn:'',price:0,rights:'Todos os direitos reservados',introduction:'',
  conclusion:'',about_author:'',daily_word_goal:500,author_name:authorName,review_checklist:{grammar:false,cohesion:false,clarity:false},
  created_at:'',updated_at:''
});

function Progress({value}:{value:number}){return <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-slate-950" style={{width:value+'%'}}/></div>;}
function Input({label,value,onChange,placeholder='',type='text'}:{label:string;value:string|number;onChange:(v:string)=>void;placeholder?:string;type?:string}){return <label className="block"><span className="block text-[11px] font-semibold text-slate-500 mb-1.5">{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"/></label>;}
function TextArea({label,value,onChange,rows=4,placeholder=''}:{label:string;value:string;onChange:(v:string)=>void;rows?:number;placeholder?:string}){return <label className="block"><span className="block text-[11px] font-semibold text-slate-500 mb-1.5">{label}</span><textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none resize-y focus:border-blue-500 focus:ring-4 focus:ring-blue-50"/></label>;}
function Select({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:string[]}){return <label className="block"><span className="block text-[11px] font-semibold text-slate-500 mb-1.5">{label}</span><select value={value} onChange={e=>onChange(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500">{options.map(o=><option key={o}>{o}</option>)}</select></label>;}
function StatusPill({status}:{status:string}){return <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold">{status}</span>;}

export function BookWriterPage(){
  const {user,profile,workspaceMode}=useAuth();
  const [view,setView]=useState<View>('dashboard');
  const [books,setBooks]=useState<BookWithStats[]>([]);
  const [book,setBook]=useState<Book|null>(null);
  const [chapters,setChapters]=useState<BookChapter[]>([]);
  const [selectedChapter,setSelectedChapter]=useState<BookChapter|null>(null);
  const [versions,setVersions]=useState<{id:string;content:string;created_at:string}[]>([]);
  const [comments,setComments]=useState<{id:string;paragraph_index:number;comment:string;resolved:boolean;created_at:string}[]>([]);
  const [exports,setExports]=useState<BookExport[]>([]);
  const [filter,setFilter]=useState<DashboardFilter>({status:'',genre:''});
  const [dateFrom,setDateFrom]=useState('');
  const [coverFont,setCoverFont]=useState<'serif'|'sans'|'mono'>('serif');
  const [coverLayout,setCoverLayout]=useState<'center'|'top'|'minimal'>('center');
  const [search,setSearch]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [lastSaved,setLastSaved]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [dailyWords,setDailyWords]=useState(0);
  const [newChapterTitle,setNewChapterTitle]=useState('');
  const [newChapterSummary,setNewChapterSummary]=useState('');
  const [commentDrafts,setCommentDrafts]=useState<Record<number,string>>({});
  const [coverBackground,setCoverBackground]=useState('#1E3A5F');
  const [coverForeground,setCoverForeground]=useState('#ffffff');
  const [coverUploading,setCoverUploading]=useState(false);
  const [exporting,setExporting]=useState<BookExportFormat|null>(null);
  const [reorderFrom,setReorderFrom]=useState<string|null>(null);
  const autosaveRef=useRef<number|null>(null);
  const editorRef=useRef<HTMLTextAreaElement|null>(null);
  const chapterContentRef=useRef('');

  const activeStep=book?Math.max(1,Math.min(7,book.current_step)):1;
  const wordCount=useMemo(()=>bookWords(chapters),[chapters]);
  const bookProgress=useMemo(()=>book?progressOf(book,wordCount):0,[book,wordCount]);
  const selectedIndex=selectedChapter?chapters.findIndex(c=>c.id===selectedChapter.id):-1;
  const selectedPages=selectedChapter?Math.max(1,Math.ceil(Math.max(1,selectedChapter.word_count)/250)):1;
  const currentParagraphs=useMemo(()=>selectedChapter?selectedChapter.content.split(/\\n\\s*\\n/).map(x=>x.trim()).filter(Boolean):[],[selectedChapter]);
  const reviewChecklist=(book?.review_checklist||{grammar:false,cohesion:false,clarity:false}) as Checklist;

  async function loadDashboard(){
    if(!user)return;
    const {data,error:e}=await supabase.from('books').select('*').eq('user_id',user.id).order('updated_at',{ascending:false});
    if(e){setError(e.message);return;}
    const rows=(data||[]) as Book[];
    if(!rows.length){setBooks([]);return;}
    const {data:chs,error:ce}=await supabase.from('book_chapters').select('id,book_id,word_count').in('book_id',rows.map(b=>b.id)).order('order');
    if(ce){setError(ce.message);return;}
    const stats=new Map<string,{w:number;c:number}>();
    (chs||[]).forEach(ch=>{const x=stats.get(ch.book_id)||{w:0,c:0};x.w+=Number(ch.word_count||0);x.c+=1;stats.set(ch.book_id,x);});
    setBooks(rows.map(b=>{const s=stats.get(b.id)||{w:0,c:0};return {...b,word_count:s.w,chapter_count:s.c,progress:progressOf(b,s.w)};}));
  }

  async function loadBook(id:string,openView:View='wizard'){
    if(!user)return;
    const [b,c,e,x]=await Promise.all([
      supabase.from('books').select('*').eq('user_id',user.id).eq('id',id).single(),
      supabase.from('book_chapters').select('*').eq('book_id',id).order('order').order('created_at'),
      supabase.from('book_exports').select('*').eq('book_id',id).order('created_at',{ascending:false}),
      supabase.from('book_daily_progress').select('*').eq('book_id',id).eq('progress_date',todayISO()).maybeSingle()
    ]);
    if(b.error){setError(b.error.message);return;}
    setBook(b.data as Book);setChapters((c.data||[]) as BookChapter[]);setExports((e.data||[]) as BookExport[]);
    setDailyWords(Math.max(0,Number(x.data?.current_word_count||0)-Number(x.data?.start_word_count||0)));
    const first=(c.data||[])[0] as BookChapter|undefined;setSelectedChapter(first||null);
    if(first)await loadChapterSideData(first.id,id);
    setView(openView);
  }

  async function loadChapterSideData(chapterId:string,bookId=book?.id){
    if(!user||!bookId)return;
    const [v,c]=await Promise.all([
      supabase.from('book_versions').select('id,content,created_at').eq('book_id',bookId).eq('chapter_id',chapterId).order('created_at',{ascending:false}).limit(20),
      supabase.from('book_comments').select('id,paragraph_index,comment,resolved,created_at').eq('book_id',bookId).eq('chapter_id',chapterId).order('paragraph_index')
    ]);
    if(v.error)setError(v.error.message);else setVersions((v.data||[]) as {id:string;content:string;created_at:string}[]);
    if(c.error)setError(c.error.message);else setComments((c.data||[]) as {id:string;paragraph_index:number;comment:string;resolved:boolean;created_at:string}[]);
  }

  useEffect(()=>{if(workspaceMode!=='negocios'||!user)return;setLoading(true);void loadDashboard().finally(()=>setLoading(false));},[user?.id,workspaceMode]);
  useEffect(()=>{if(selectedChapter)chapterContentRef.current=selectedChapter.content;},[selectedChapter?.id]);

  useEffect(()=>{
    if(view!=='editor'||!book||!selectedChapter)return;
    if(autosaveRef.current)window.clearInterval(autosaveRef.current);
    autosaveRef.current=window.setInterval(()=>{void autosaveChapter();},30000);
    return()=>{if(autosaveRef.current)window.clearInterval(autosaveRef.current);};
  },[view,book?.id,selectedChapter?.id]);

  async function saveBook(patch:Partial<Book>,showNotice=false){
    if(!user||!book)return false;
    setSaving(true);
    const {data,error:e}=await supabase.from('books').update(patch).eq('id',book.id).eq('user_id',user.id).select().single();
    setSaving(false);
    if(e){setError(e.message);return false;}
    setBook(data as Book);
    if(showNotice){setNotice('Livro salvo.');setLastSaved(new Date().toLocaleTimeString('pt-BR'));}
    return true;
  }

  async function saveDailyProgress(total:number){
    if(!user||!book)return;
    const today=todayISO();
    const {data}=await supabase.from('book_daily_progress').select('start_word_count').eq('book_id',book.id).eq('progress_date',today).maybeSingle();
    const start=Number(data?.start_word_count??total);
    await supabase.from('book_daily_progress').upsert({book_id:book.id,user_id:user.id,progress_date:today,start_word_count:start,current_word_count:total,updated_at:new Date().toISOString()},{onConflict:'book_id,progress_date'});
    setDailyWords(Math.max(0,total-start));
  }

  async function saveChapter(ch:BookChapter,createVersion=false){
    if(!user||!book)return false;
    setSaving(true);
    const content=ch.content;
    const {data,error:e}=await supabase.from('book_chapters').update({title:ch.title,summary:ch.summary,content,status:ch.status,order:ch.order}).eq('id',ch.id).eq('book_id',book.id).select().single();
    setSaving(false);
    if(e){setError(e.message);return false;}
    const updated=data as BookChapter;
    setChapters(prev=>prev.map(x=>x.id===updated.id?updated:x));
    setSelectedChapter(updated);
    if(createVersion){await supabase.from('book_versions').insert({book_id:book.id,chapter_id:ch.id,content});await loadChapterSideData(ch.id);}
    const total=bookWords(chapters.map(x=>x.id===updated.id?updated:x));
    await saveDailyProgress(total);
    setLastSaved(new Date().toLocaleTimeString('pt-BR'));
    return true;
  }

  function applyFormat(prefix:string,suffix=prefix){
    if(!selectedChapter||!editorRef.current)return;
    const textarea=editorRef.current;const start=textarea.selectionStart;const end=textarea.selectionEnd;
    const selectedText=chapterContentRef.current.slice(start,end)||'texto';
    const next=chapterContentRef.current.slice(0,start)+prefix+selectedText+suffix+chapterContentRef.current.slice(end);
    chapterContentRef.current=next;setSelectedChapter({...selectedChapter,content:next,word_count:wordsOf(next)});
    window.requestAnimationFrame(()=>{textarea.focus();const nextStart=start+prefix.length;const nextEnd=nextStart+selectedText.length;textarea.setSelectionRange(nextStart,nextEnd);});
  }

  async function autosaveChapter(){
    if(!selectedChapter||!book||saving)return;
    await saveChapter({...selectedChapter,content:chapterContentRef.current},false);
  }

  async function createBook(){
    if(!user){return;}
    const base=newBook(profile?.display_name||'');
    base.user_id=user.id;
    base.title='Novo livro';
    setSaving(true);
    const {data,error:e}=await supabase.from('books').insert({
      user_id:user.id,title:base.title,subtitle:base.subtitle,genre:base.genre,target_audience:base.target_audience,promise:base.promise,
      tone:base.tone,estimated_words:base.estimated_words,language:base.language,platform:base.platform,status:'Conceito',
      current_step:1,cover_image:'',description:'',keywords:[],categories:[],isbn:'',price:0,rights:base.rights,introduction:'',
      conclusion:'',about_author:'',daily_word_goal:base.daily_word_goal,author_name:base.author_name,review_checklist:base.review_checklist
    }).select().single();
    setSaving(false);
    if(e){setError(e.message);return;}
    setNotice('Livro criado.');
    await loadBook(data.id,'wizard');
  }

  async function addChapter(){
    if(!book)return;
    const title=newChapterTitle.trim()||'Capítulo '+(chapters.length+1);
    const {data,error:e}=await supabase.from('book_chapters').insert({book_id:book.id,title,summary:newChapterSummary.trim(),content:'',status:'Rascunho',order:chapters.length}).select().single();
    if(e){setError(e.message);return;}
    setChapters(prev=>[...prev,data as BookChapter]);setSelectedChapter(data as BookChapter);setNewChapterTitle('');setNewChapterSummary('');
    setView('editor');
  }

  async function moveChapter(direction:-1|1){
    if(!selectedChapter)return;
    const idx=chapters.findIndex(c=>c.id===selectedChapter.id);const other=chapters[idx+direction];if(!other||idx<0)return;
    await Promise.all([
      supabase.from('book_chapters').update({order:other.order}).eq('id',selectedChapter.id),
      supabase.from('book_chapters').update({order:selectedChapter.order}).eq('id',other.id)
    ]);
    await loadBook(book!.id,'editor');
  }

  async function updateCurrentChapter(patch:Partial<BookChapter>){
    if(!selectedChapter)return;
    const updated={...selectedChapter,...patch};setSelectedChapter(updated);setChapters(prev=>prev.map(c=>c.id===updated.id?updated:c));chapterContentRef.current=updated.content;
  }

  async function markChapter(status:BookChapterStatus){
    if(!selectedChapter)return;
    if(status==='Finalizado'&&!chapterContentRef.current.trim()){setError('O conteúdo do capítulo não pode estar vazio.');return;}
    await saveChapter({...selectedChapter,content:chapterContentRef.current,status},true);
    if(status==='Finalizado'&&book?.current_step===3)await saveBook({current_step:4,status:'Revisão'},true);
  }

  async function markOtherChapter(chapter:BookChapter,status:BookChapterStatus){
    if(status==='Finalizado'&&!chapter.content.trim()){setError('O conteúdo do capítulo não pode estar vazio.');return;}
    await saveChapter({...chapter,status},true);
    await loadBookSideOnly(chapter.id);
  }

  async function loadBookSideOnly(chapterId:string){
    if(!book)return;
    const fresh=chapters.find(x=>x.id===chapterId);
    if(fresh)setSelectedChapter(fresh);
    await loadChapterSideData(chapterId,book.id);
  }

  async function saveWizardStep(step:number){
    if(!book)return;
    if(step>=2&&(!book.title.trim()||!book.genre)){setError('Título e gênero são obrigatórios.');return;}
    if(step===2&&chapters.length<1){setError('Crie pelo menos 1 capítulo para avançar para a escrita.');return;}
    if(step===7){
      if(!book.cover_image.trim()||!book.title.trim()||!book.description.trim()||!book.keywords.length||!book.categories.length||book.price<0){
        setError('Antes de exportar, complete título, descrição, capa, preço, ao menos 1 palavra-chave e 1 categoria.');return;
      }
      if(book.platform==='Amazon KDP'&&book.keywords.length!==7){setError('Para Amazon KDP, informe as 7 palavras-chave antes de exportar.');return;}
    }
    const status=STATUSES[Math.max(0,Math.min(6,step-1))];
    await saveBook({current_step:step,status},true);
  }

  async function updateChecklist(key:keyof Checklist,value:boolean){
    if(!book)return;
    const next={...reviewChecklist,[key]:value};await saveBook({review_checklist:next},true);
  }

  function speak(){
    if(!selectedChapter||!('speechSynthesis' in window))return;
    window.speechSynthesis.cancel();const utter=new SpeechSynthesisUtterance(selectedChapter.content);utter.lang=book?.language.toLowerCase()==='pt'?'pt-BR':book?.language.toLowerCase()||'en-US';window.speechSynthesis.speak(utter);
  }

  async function addComment(paragraphIndex:number){
    if(!user||!book||!selectedChapter)return;
    const draft=commentDrafts[paragraphIndex]||''; if(!draft.trim())return; const {data,error:e}=await supabase.from('book_comments').insert({book_id:book.id,chapter_id:selectedChapter.id,paragraph_index:paragraphIndex,comment:draft.trim()}).select().single();
    if(e){setError(e.message);return;}
    setComments(prev=>[...prev,data as typeof comments[number]]);setCommentDrafts(prev=>({...prev,[paragraphIndex]:''}));
  }

  async function toggleComment(id:string,resolved:boolean){
    const {error:e}=await supabase.from('book_comments').update({resolved,updated_at:new Date().toISOString()}).eq('id',id);
    if(e)setError(e.message);else setComments(prev=>prev.map(c=>c.id===id?{...c,resolved}:c));
  }

  async function uploadCover(file:File){
    if(!user||!book)return;setCoverUploading(true);
    try{const url=await uploadUserImage(user.id,file,'book-covers');await saveBook({cover_image:url},true);}catch(e){setError(e instanceof Error?e.message:'Falha no upload da capa.');}
    setCoverUploading(false);
  }

  async function generateCover(){
    if(!book)return;
    try{const blob=await buildCoverPng({title:book.title||'Título',subtitle:book.subtitle,author:book.author_name||profile?.display_name||'Autor',background:coverBackground,foreground:coverForeground,font:coverFont,layout:coverLayout});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=slug(book.title)+'.png';a.click();URL.revokeObjectURL(url);if(user){const path=user.id+'/book-covers/generated-'+crypto.randomUUID()+'.png';const up=await supabase.storage.from('risegoat-media').upload(path,blob,{upsert:false,contentType:'image/png'});if(up.error)throw up.error;const publicUrl=supabase.storage.from('risegoat-media').getPublicUrl(path).data.publicUrl;await saveBook({cover_image:publicUrl},true);}}catch(e){setError(e instanceof Error?e.message:'Não foi possível gerar a capa.');}
  }

  async function linkProduct(){
    if(!user||!book)return;
    if(book.product_id){setNotice('Livro já vinculado ao Portfólio de Produtos.');return;}
    if(book.price<=0){setError('Defina um preço maior que zero em Metadados antes de criar o produto.');return;}
    const {data,error:e}=await supabase.from('products').insert({user_id:user.id,title:book.title,slug:slug(book.title),description:book.description,type:'E-book',language:book.language,platform:book.platform,price:book.price,currency:'BRL',cost:0,total_views:0,status:book.status==='Pronto'?'Publicado':'Ideia',url:'',cover_image:book.cover_image,tags:book.keywords,parent_id:null,content_base_id:null}).select().single();
    if(e){setError(e.message);return;}
    const {error:offerError}=await supabase.from('offers').insert({user_id:user.id,product_id:data.id,name:book.title,type:'infoproduto',status:book.status==='Pronto'?'vendendo':'ideia',price:book.price,margin:100,commission:0,channel:book.platform,revenue_generated:0,needs_audience:''});
    if(offerError){setError('Produto criado, mas não foi possível criar a oferta: '+offerError.message);return;}
    const ok=await saveBook({product_id:data.id},true);if(ok)setNotice('Livro vinculado ao Portfólio e criado como oferta.');
  }

  async function exportCoverPng(){
    if(!book||!user)return;
    try{
      const blob=await buildCoverPng({title:book.title||'Título',subtitle:book.subtitle,author:book.author_name||profile?.display_name||'Autor',background:coverBackground,foreground:coverForeground,font:coverFont,layout:coverLayout});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=slug(book.title)+'.png';a.click();URL.revokeObjectURL(url);
      const path=user.id+'/book-exports/'+slug(book.title)+'-'+Date.now()+'.png';
      const up=await supabase.storage.from('risegoat-media').upload(path,blob,{upsert:false,contentType:'image/png'});
      if(up.error)throw up.error;
      const publicUrl=supabase.storage.from('risegoat-media').getPublicUrl(path).data.publicUrl;
      const {data:row,error:e}=await supabase.from('book_exports').insert({book_id:book.id,format:'PNG',file_url:publicUrl}).select().single();
      if(e)throw e;
      setExports(prev=>[row as BookExport,...prev]);setNotice('Capa PNG exportada.');setView('exports');
    }catch(e){setError(e instanceof Error?e.message:'Falha ao exportar PNG.');}
  }

  function exportBook(format:BookExportFormat){
    if(!book)return;
    const data=chapters.filter(c=>c.content.trim()).map(c=>({title:c.title,content:c.content}));
    if(!data.length){setError('Adicione conteúdo aos capítulos antes de exportar.');return;}
    if(!book.title.trim()||!book.description.trim()||!book.cover_image.trim()||book.price<0){setError('Metadados obrigatórios incompletos.');return;}
    if(format==='MOBI'){window.open('https://www.zamzar.com/convert/epub-to-mobi/','_blank','noopener,noreferrer');setNotice('Abra o conversor MOBI externo e envie o EPUB exportado.');return;}
    setExporting(format);
    window.setTimeout(async()=>{
      try{
        const blob=format==='EPUB'?buildEpub(book,data):format==='DOCX'?buildDocx(book,data):buildPdf(book,data);
        if(blob.size<100){throw new Error('O arquivo gerado parece estar vazio.');}
        downloadBookFile(blob,slug(book.title)+'.'+format.toLowerCase());
        if(user){
          const ext=format.toLowerCase();const path=user.id+'/book-exports/'+slug(book.title)+'-'+Date.now()+'.'+ext;
          const up=await supabase.storage.from('risegoat-media').upload(path,blob,{upsert:false,contentType:blob.type});
          if(up.error)throw up.error;
          const publicUrl=supabase.storage.from('risegoat-media').getPublicUrl(path).data.publicUrl;
          const {data:row,error:e}=await supabase.from('book_exports').insert({book_id:book.id,format,file_url:publicUrl}).select().single();
          if(e)throw e;setExports(prev=>[row as BookExport,...prev]);
        }
        setNotice(format+' exportado.');setView('exports');
      }catch(e){setError(e instanceof Error?e.message:'Falha na exportação.');}finally{setExporting(null);}
    },50);
  }

  function updateBookField<K extends keyof Book>(key:K,value:Book[K]){setBook(prev=>prev?{...prev,[key]:value}:prev);}

  if(workspaceMode!=='negocios')return <div className="p-8"><Card className="p-8 text-sm text-slate-500">Este módulo pertence ao workspace Negócios.</Card></div>;
  if(loading)return <Spinner />;

  const filtered=books.filter(b=>(filter.status?!b.status||b.status===filter.status:true)&&(filter.genre?!b.genre||b.genre===filter.genre:true)&&(!dateFrom||b.created_at.slice(0,10)>=dateFrom)&&b.title.toLowerCase().includes(search.toLowerCase()));

  return <div className="min-h-full bg-slate-50/70"><div className="max-w-[1500px] mx-auto p-5 lg:p-8">
    <PageHeader title="Escritor de Livros/Ebooks" subtitle="Escreva sem IA: conceito, estrutura, escrita, revisão, capa, metadados e exportação." action={view==='dashboard'?<button onClick={()=>void createBook()} className="px-3.5 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-bold"><Plus className="inline w-4 h-4 mr-1"/>Novo Livro</button>:<button onClick={()=>setView('dashboard')} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold"><Library className="inline w-4 h-4 mr-1"/>Biblioteca</button>}/>
    {error&&<div className="mb-4 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-700 flex justify-between gap-3">{error}<button onClick={()=>setError('')}><X className="w-4 h-4"/></button></div>}
    {notice&&<div className="mb-4 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-700 flex justify-between gap-3">{notice}<button onClick={()=>setNotice('')}><X className="w-4 h-4"/></button></div>}

    {view==='dashboard'&&<div className="space-y-6">
      <div className="rounded-3xl bg-slate-950 text-white p-6 lg:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-[.2em] text-blue-300 font-bold">Biblioteca</p>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight mt-2">Transforme uma ideia em livro.</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xl">Um espaço simples para planejar, escrever, revisar e exportar seus livros.</p>
        </div>
        <button onClick={()=>void createBook()} className="shrink-0 px-4 py-3 rounded-xl bg-white text-slate-950 text-sm font-bold"><Plus className="inline w-4 h-4 mr-1"/>Novo livro</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[['Livros',books.length],['Em andamento',books.filter(b=>b.status!=='Pronto').length],['Prontos',books.filter(b=>b.status==='Pronto').length],['Palavras',books.reduce((s,b)=>s+b.word_count,0).toLocaleString('pt-BR')]].map(x=>
          <Card key={String(x[0])} className="p-4"><span className="text-[10px] uppercase tracking-[.14em] font-bold text-slate-400">{x[0]}</span><p className="text-2xl font-black mt-1">{x[1]}</p></Card>
        )}
      </div>
      <Card className="p-3">
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-300"/><input value={search} onChange={e=>setSearch(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 pl-9 text-sm outline-none focus:border-blue-500" placeholder="Buscar livro..."/></div>
          <select value={filter.status} onChange={e=>setFilter({...filter,status:e.target.value})} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="">Status</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
          <select value={filter.genre} onChange={e=>setFilter({...filter,genre:e.target.value})} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="">Gênero</option>{GENRES.map(g=><option key={g}>{g}</option>)}</select>
        </div>
      </Card>
      {!filtered.length&&<Card className="p-12 text-center"><BookOpen className="w-10 h-10 mx-auto text-slate-300"/><p className="text-base font-bold text-slate-700 mt-3">Sua biblioteca está vazia.</p><p className="text-xs text-slate-400 mt-1">Comece pelo primeiro livro.</p><button onClick={()=>void createBook()} className="mt-4 px-4 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-bold">Criar livro</button></Card>}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(b=><Card key={b.id} className="overflow-hidden border-slate-200 hover:-translate-y-0.5 hover:shadow-lg transition">
          <div className="aspect-[5/3] bg-slate-100 relative overflow-hidden">
            {b.cover_image?<img src={b.cover_image} alt="" className="w-full h-full object-cover"/>:<div className="h-full flex items-center justify-center"><BookOpen className="w-9 h-9 text-slate-300"/></div>}
            <div className="absolute top-3 left-3"><StatusPill status={b.status}/></div>
          </div>
          <div className="p-5">
            <p className="text-[10px] uppercase tracking-[.14em] font-bold text-slate-400">{b.genre}</p>
            <h3 className="font-black text-slate-900 text-base mt-1 truncate">{b.title}</h3>
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500"><span>{b.word_count.toLocaleString('pt-BR')} palavras</span><span>{b.progress}%</span></div>
            <div className="mt-2"><Progress value={b.progress}/></div>
            <button onClick={()=>void loadBook(b.id,'wizard')} className="mt-4 w-full px-3 py-2.5 rounded-xl bg-slate-950 text-white text-xs font-bold">Abrir livro</button>
          </div>
        </Card>)}
      </div>
    </div>}

    {book&&view!=='dashboard'&&<div className="space-y-5">
      <Card className="p-4"><div className="flex flex-wrap items-center gap-2">{STEP_NAMES.map((name,i)=>{const n=i+1;return <button key={name} onClick={()=>setView(n===3?'editor':n===4?'review':n===5?'cover':n===6?'metadata':n===7?'exports':'wizard')} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${activeStep===n?'bg-blue-700 text-white':'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">{n}</span>{name}</button>})}</div><div className="mt-4"><Progress value={activeStep/7*100}/></div></Card>

      {(view==='wizard')&&<Card className="p-6"><div className="flex items-center gap-3 mb-6"><span className="w-10 h-10 rounded-2xl bg-blue-50 text-slate-800 flex items-center justify-center"><BookOpen className="w-5 h-5"/></span><div><p className="text-[10px] uppercase tracking-[.18em] text-slate-700 font-bold">Passo {activeStep}</p><h2 className="text-xl font-black">{STEP_NAMES[activeStep-1]}</h2></div></div>
        {activeStep===1&&<div className="space-y-5">
          <div><p className="text-[10px] uppercase tracking-[.18em] text-blue-600 font-bold">Comece pelo essencial</p><h2 className="text-xl font-black mt-1">Qual é o livro?</h2><p className="text-xs text-slate-400 mt-1">Defina apenas a direção. O restante pode ser ajustado depois.</p></div>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Título *" value={book.title} onChange={v=>updateBookField('title',v)}/>
            <Input label="Subtítulo" value={book.subtitle} onChange={v=>updateBookField('subtitle',v)}/>
            <Select label="Gênero *" value={book.genre} onChange={v=>updateBookField('genre',v as BookGenre)} options={GENRES}/>
            <TextArea label="Promessa central" value={book.promise} onChange={v=>updateBookField('promise',v)} rows={3} placeholder="O que o leitor vai levar deste livro?"/>
          </div>
          <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer text-xs font-bold text-slate-700">Configurações avançadas</summary>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <Input label="Público-alvo" value={book.target_audience} onChange={v=>updateBookField('target_audience',v)}/>
              <Input label="Tom de voz" value={book.tone} onChange={v=>updateBookField('tone',v)} placeholder="Ex.: direto, didático, contemplativo"/>
              <Input label="Extensão estimada" value={book.estimated_words} onChange={v=>updateBookField('estimated_words',Math.max(1,Number(v)||1))} type="number"/>
              <Input label="Meta diária de palavras" value={book.daily_word_goal} onChange={v=>updateBookField('daily_word_goal',Math.max(1,Number(v)||1))} type="number"/>
              <Select label="Idioma" value={book.language} onChange={v=>updateBookField('language',v as ProductLanguage)} options={LANGUAGES}/>
              <Select label="Plataforma principal" value={book.platform} onChange={v=>updateBookField('platform',v as ProductPlatform)} options={PLATFORMS}/>
            </div>
          </details>
        </div>}
        {activeStep===2&&<div className="space-y-4"><div className="grid md:grid-cols-2 gap-3">{chapters.map((ch,i)=><div key={ch.id} className="rounded-2xl border border-slate-200 p-4 flex items-start gap-3" draggable onDragStart={()=>setReorderFrom(ch.id)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(!reorderFrom||reorderFrom===ch.id)return;const from=chapters.findIndex(x=>x.id===reorderFrom);const to=chapters.findIndex(x=>x.id===ch.id);const arr=[...chapters];const [m]=arr.splice(from,1);arr.splice(to,0,m);const normalized=arr.map((x,j)=>({...x,order:j}));setChapters(normalized);setReorderFrom(null);void Promise.all(normalized.map(x=>supabase.from('book_chapters').update({order:x.order}).eq('id',x.id)));}}><div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-black text-xs">{i+1}</div><div className="min-w-0 flex-1"><p className="font-bold text-sm">{ch.title}</p><p className="text-xs text-slate-400 mt-1">{ch.summary||'Sem resumo'}</p></div><button onClick={()=>{setSelectedChapter(ch);setView('editor');void loadChapterSideData(ch.id)}} className="text-xs font-bold text-blue-700">Editar</button></div>)}</div><div className="grid md:grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4"><Input label="Novo capítulo" value={newChapterTitle} onChange={setNewChapterTitle} placeholder="Título"/><Input label="Resumo" value={newChapterSummary} onChange={setNewChapterSummary}/><div className="md:col-span-2 flex gap-2"><button onClick={()=>void addChapter()} className="px-3 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold"><Plus className="inline w-4 h-4 mr-1"/>Adicionar capítulo</button></div></div><div className="grid md:grid-cols-3 gap-3"><TextArea label="Introdução" value={book.introduction} onChange={v=>updateBookField('introduction',v)} rows={3}/><TextArea label="Conclusão" value={book.conclusion} onChange={v=>updateBookField('conclusion',v)} rows={3}/><TextArea label="Sobre o autor" value={book.about_author} onChange={v=>updateBookField('about_author',v)} rows={3}/></div></div>}
        {(activeStep===3||activeStep===4||activeStep===5||activeStep===6||activeStep===7)&&<div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><p className="text-sm font-bold text-slate-700">{STEP_NAMES[activeStep-1]} tem uma área dedicada no menu acima.</p><button onClick={()=>setView(activeStep===3?'editor':activeStep===4?'review':activeStep===5?'cover':activeStep===6?'metadata':'exports')} className="mt-3 px-4 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold">Abrir {STEP_NAMES[activeStep-1]}</button></div>}
        <div className="flex justify-between gap-2 mt-6 pt-4 border-t border-slate-100"><button disabled={activeStep===1} onClick={()=>void saveWizardStep(activeStep-1)} className="px-4 py-2.5 rounded-xl border text-sm font-semibold disabled:opacity-40"><ChevronLeft className="inline w-4 h-4 mr-1"/>Anterior</button><button onClick={()=>void saveWizardStep(Math.min(7,activeStep+1))} className="px-4 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-bold">{saving?'Salvando...':'Salvar e Avançar'}<ChevronRight className="inline w-4 h-4 ml-1"/></button></div>
      </Card>}

      {view==='editor'&&<div className="grid lg:grid-cols-[260px_1fr_250px] gap-4"><Card className="p-3 h-fit lg:sticky lg:top-4"><div className="flex items-center justify-between p-2"><span className="text-[10px] uppercase tracking-[.16em] font-bold text-slate-400">Capítulos</span><button onClick={()=>void addChapter()} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700"><Plus className="w-4 h-4 mx-auto"/></button></div><div className="space-y-1">{chapters.map((c,i)=><button key={c.id} onClick={()=>{setSelectedChapter(c);void loadChapterSideData(c.id)}} className={`w-full text-left p-3 rounded-xl ${selectedChapter?.id===c.id?'bg-blue-50 border border-slate-200':'hover:bg-slate-50'}`}><div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-400">{i+1}</span><span className="text-xs font-bold truncate">{c.title}</span></div><span className="block text-[10px] text-slate-400 mt-1">{c.word_count} palavras · p.{c.page_start}-{c.page_end}</span></button>)}</div></Card>
        <Card className="overflow-hidden"><div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3"><div><Input label="Título do capítulo" value={selectedChapter?.title||''} onChange={v=>selectedChapter&&updateCurrentChapter({title:v})}/></div><div className="flex gap-1"><button disabled={!selectedChapter||selectedIndex<=0} onClick={()=>void moveChapter(-1)} className="p-2 rounded-lg border disabled:opacity-40"><ChevronUpIcon/></button><button disabled={!selectedChapter||selectedIndex<0||selectedIndex>=chapters.length-1} onClick={()=>void moveChapter(1)} className="p-2 rounded-lg border disabled:opacity-40"><ChevronDown/></button></div></div>{selectedChapter&&<><div className="p-4 border-b border-slate-100"><div className="flex flex-wrap gap-1 mb-3"><button type="button" onClick={()=>applyFormat('**')} className="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold">Negrito</button><button type="button" onClick={()=>applyFormat('_')} className="px-2.5 py-1.5 rounded-lg border text-[11px] italic">Itálico</button><button type="button" onClick={()=>applyFormat('# ','')} className="px-2.5 py-1.5 rounded-lg border text-[11px] font-bold">Título</button><span className="text-[10px] text-slate-400 self-center ml-1">formatação simples em texto</span></div><textarea ref={editorRef} value={selectedChapter.content} onChange={e=>{chapterContentRef.current=e.target.value;setSelectedChapter({...selectedChapter,content:e.target.value,word_count:wordsOf(e.target.value)})}} className="w-full min-h-[520px] rounded-2xl border border-slate-200 p-5 text-[15px] leading-7 outline-none focus:border-blue-500" placeholder="Comece a escrever. Sem IA, no seu próprio texto."/></div><div className="p-4 bg-slate-50 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-4 text-xs text-slate-500"><span>{wordsOf(chapterContentRef.current)} palavras</span><span>{selectedPages} páginas</span><span>Meta diária: {book.daily_word_goal.toLocaleString('pt-BR')}</span><span>Hoje: {dailyWords.toLocaleString('pt-BR')}</span><span className="text-blue-700 font-bold">{saving?'Salvando...':lastSaved?'Salvo '+lastSaved:'Autosave a cada 30s'}</span></div><div className="flex gap-2"><button onClick={()=>void speak()} className="px-3 py-2 rounded-xl border bg-white text-xs font-bold"><Volume2 className="inline w-4 h-4 mr-1"/>Ler em voz alta</button><button onClick={()=>void markChapter('Finalizado')} className="px-3 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold"><Check className="inline w-4 h-4 mr-1"/>Marcar Finalizado</button></div></div><div className="p-4 border-t border-slate-100"><p className="text-[10px] uppercase tracking-[.16em] font-bold text-slate-400">Histórico de versões</p><div className="mt-3 space-y-2">{versions.slice(0,5).map(v=><button key={v.id} onClick={()=>setSelectedChapter({...selectedChapter,content:v.content,word_count:wordsOf(v.content)})} className="w-full text-left p-3 rounded-xl bg-slate-50 text-xs"><Clock3 className="inline w-3.5 h-3.5 mr-1 text-slate-400"/>{new Date(v.created_at).toLocaleString('pt-BR')} · {wordsOf(v.content)} palavras</button>)}{!versions.length&&<p className="text-xs text-slate-400">Nenhuma versão manual ainda.</p>}</div></div></>}</Card>
        <Card className="p-4 h-fit lg:sticky lg:top-4"><p className="text-[10px] uppercase tracking-[.16em] font-bold text-slate-400">Livro</p><p className="text-sm font-black mt-1">{book.title}</p><div className="mt-4"><Progress value={bookProgress}/><p className="text-xs text-slate-500 mt-2">{bookProgress}% · {wordCount.toLocaleString('pt-BR')} / {book.estimated_words.toLocaleString('pt-BR')} palavras</p></div><button onClick={()=>void saveChapter({...selectedChapter!,content:chapterContentRef.current},true)} disabled={!selectedChapter||saving} className="mt-4 w-full px-3 py-2.5 rounded-xl border text-xs font-bold disabled:opacity-40"><Save className="inline w-4 h-4 mr-1"/>Salvar versão</button></Card></div>}

      {view==='review'&&selectedChapter&&<div className="grid xl:grid-cols-[1.2fr_.8fr] gap-5"><Card className="p-6"><div className="flex justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.16em] font-bold text-blue-600">Revisão</p><h2 className="text-xl font-black">{selectedChapter.title}</h2></div><button onClick={()=>void speak()} className="px-3 py-2 border rounded-xl text-xs font-bold"><Volume2 className="inline w-4 h-4 mr-1"/>Ler em voz alta</button></div><div className="mt-6 space-y-4">{currentParagraphs.map((p,i)=><div key={i} className="rounded-2xl border border-slate-200 p-4"><p className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">{p}</p><div className="mt-3 flex gap-2"><input value={commentDrafts[i]||''} onChange={e=>setCommentDrafts(prev=>({...prev,[i]:e.target.value}))} className="flex-1 h-9 rounded-lg border px-3 text-xs" placeholder="Comentário para este parágrafo"/><button onClick={()=>void addComment(i)} className="px-3 rounded-lg bg-slate-950 text-white text-xs font-bold"><MessageSquare className="inline w-3.5 h-3.5 mr-1"/>Adicionar</button></div>{comments.filter(c=>c.paragraph_index===i).map(c=><div key={c.id} className={`mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${c.resolved?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-900'}`}><span className="flex-1">{c.comment}</span><button onClick={()=>void toggleComment(c.id,!c.resolved)} className="font-bold text-[10px]">{c.resolved?'Reabrir':'Resolver'}</button></div>)}</div>)}{!currentParagraphs.length&&<p className="text-sm text-slate-400">Escreva o capítulo antes de revisar.</p>}</div></Card><Card className="p-5 h-fit"><h3 className="text-sm font-black">Checklist</h3><div className="space-y-2 mt-4">{([['grammar','Gramática'],['cohesion','Coesão'],['clarity','Clareza']] as const).map(([key,label])=><label key={key} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 text-xs font-semibold"><input type="checkbox" checked={reviewChecklist[key]} onChange={e=>void updateChecklist(key,e.target.checked)}/>{label}</label>)}</div><div className="mt-5"><p className="text-[10px] uppercase tracking-[.16em] font-bold text-slate-400 mb-2">Status dos capítulos</p>{chapters.map(c=><div key={c.id} className="flex items-center justify-between gap-2 py-2"><span className="text-xs truncate">{c.title}</span><button onClick={()=>{setSelectedChapter(c);chapterContentRef.current=c.content;void markOtherChapter(c,c.status==='Finalizado'?'Revisão':'Finalizado')}} className="text-[10px] font-bold text-blue-700">{c.status}</button></div>)}</div></Card></div>}

      {view==='cover'&&<div className="grid xl:grid-cols-[1fr_360px] gap-5"><Card className="p-6"><div className="grid md:grid-cols-2 gap-4"><div><p className="text-[10px] uppercase tracking-[.16em] font-bold text-blue-600">Capa</p><h2 className="text-xl font-black mt-1">1600 × 2560 px</h2><p className="text-xs text-slate-400 mt-1">Editor simples, sem IA.</p><div className="mt-5 aspect-[5/8] max-w-[340px] mx-auto rounded-3xl overflow-hidden shadow-2xl" style={{background:coverBackground,color:coverForeground,transform:'perspective(900px) rotateY(-8deg) rotateX(2deg)',transformStyle:'preserve-3d'}}>{book.cover_image?<img src={book.cover_image} alt="" className="w-full h-full object-cover"/>:<div className="h-full p-8 flex flex-col items-center justify-center text-center"><h3 className="text-3xl font-black">{book.title||'Seu título'}</h3><p className="mt-4">{book.subtitle}</p><p className="mt-auto text-sm">{book.author_name}</p></div>}</div><p className="text-[11px] text-slate-400 mt-3 text-center">Preview 3D</p></div><div className="space-y-4"><label className="block"><span className="block text-[11px] font-semibold text-slate-500 mb-1.5">Imagem</span><input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)void uploadCover(f)}} className="w-full text-xs"/></label><div className="grid grid-cols-2 gap-3"><Input label="Fundo" value={coverBackground} onChange={setCoverBackground}/><Input label="Texto" value={coverForeground} onChange={setCoverForeground}/><Select label="Fonte" value={coverFont} onChange={v=>setCoverFont(v as 'serif'|'sans'|'mono')} options={['serif','sans','mono']}/><Select label="Layout" value={coverLayout} onChange={v=>setCoverLayout(v as 'center'|'top'|'minimal')} options={['center','top','minimal']}/></div><button disabled={coverUploading} onClick={()=>void generateCover()} className="w-full px-3 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold disabled:opacity-40"><Sparkles className="inline w-4 h-4 mr-1"/>{coverUploading?'Enviando...':'Gerar capa PNG'}</button></div></div></Card><Card className="p-5 h-fit"><h3 className="text-sm font-black">Ações</h3><p className="text-xs text-slate-400 mt-1">A capa gerada pode virar o ativo do livro.</p><button onClick={()=>setView('metadata')} className="mt-4 w-full px-3 py-2.5 rounded-xl border text-xs font-bold">Continuar para Metadados <ChevronRight className="inline w-4 h-4"/></button></Card></div>}

      {view==='metadata'&&<div className="grid xl:grid-cols-[1fr_360px] gap-5"><Card className="p-6"><div className="grid md:grid-cols-2 gap-4"><TextArea label="Descrição / Blurb *" value={book.description} onChange={v=>updateBookField('description',v)} rows={7}/><div className="space-y-4"><Input label="ISBN" value={book.isbn} onChange={v=>updateBookField('isbn',v)}/><Input label="Preço *" value={book.price} onChange={v=>updateBookField('price',Math.max(0,Number(v)||0))} type="number"/><Select label="Direitos" value={book.rights} onChange={v=>updateBookField('rights',v as BookRights)} options={RIGHTS}/></div></div><div className="grid md:grid-cols-2 gap-4 mt-4"><TextArea label="Palavras-chave (7 para Amazon)" value={book.keywords.join(', ')} onChange={v=>updateBookField('keywords',v.split(',').map(x=>x.trim()).filter(Boolean).slice(0,7))} placeholder="palavra 1, palavra 2..."/><TextArea label="Categorias (até 3)" value={book.categories.join(', ')} onChange={v=>updateBookField('categories',v.split(',').map(x=>x.trim()).filter(Boolean).slice(0,3))}/></div><div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-blue-900"><p className="font-black">Validação de metadados</p><p className="mt-1">{book.keywords.length}/7 palavras-chave · {book.categories.length}/3 categorias · {book.cover_image?'capa OK':'capa pendente'} · {book.price>=0?'preço OK':'preço pendente'}</p></div><div className="mt-5 flex flex-wrap gap-2"><button onClick={()=>void saveBook({description:book.description,keywords:book.keywords,categories:book.categories,isbn:book.isbn,price:book.price,rights:book.rights,cover_image:book.cover_image},true)} className="px-4 py-2.5 rounded-xl bg-blue-700 text-white text-xs font-bold"><Save className="inline w-4 h-4 mr-1"/>Salvar metadados</button><button onClick={()=>void linkProduct()} className="px-4 py-2.5 rounded-xl border text-xs font-bold"><PackageOpen className="inline w-4 h-4 mr-1"/>Vincular Portfólio</button><button onClick={()=>{window.location.hash='/sales';}} className="px-4 py-2.5 rounded-xl border text-xs font-bold">Criar página de venda</button></div></Card><Card className="p-5 h-fit"><p className="text-[10px] uppercase tracking-[.16em] font-bold text-slate-400">Preview comercial</p><div className="mt-3 rounded-2xl bg-slate-950 text-white p-5"><p className="text-xs text-blue-300">{book.genre}</p><h3 className="text-lg font-black mt-2">{book.title||'Título'}</h3><p className="text-xs text-slate-300 mt-2">{book.description||'Descrição do livro.'}</p><p className="mt-4 font-black">{book.price.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</p></div></Card></div>}

      {view==='exports'&&<div className="space-y-5"><Card className="p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.16em] font-bold text-blue-600">Exportação</p><h2 className="text-xl font-black mt-1">Arquivos do livro</h2><p className="text-xs text-slate-400 mt-1">EPUB, PDF e DOCX são gerados no navegador; MOBI requer conversão externa.</p></div><Download className="w-5 h-5 text-blue-600"/></div><div className="grid md:grid-cols-4 gap-3 mt-6">{(['EPUB','PDF','DOCX','MOBI'] as BookExportFormat[]).map(format=><button key={format} onClick={()=>exportBook(format)} disabled={exporting!==null} className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 text-left disabled:opacity-50"><FileText className="w-5 h-5 text-blue-600"/><p className="text-sm font-black mt-3">{format}</p><p className="text-[11px] text-slate-400 mt-1">{format==='MOBI'?'Abrir conversor externo':'Gerar e registrar arquivo'}</p>{exporting===format&&<p className="text-[10px] text-blue-600 mt-2">Processando...</p>}</button>)}</div><button onClick={()=>void exportCoverPng()} className="mt-4 px-4 py-2.5 border rounded-xl text-xs font-bold">Gerar e registrar Capa PNG</button>{book.cover_image&&<button onClick={()=>{const a=document.createElement('a');a.href=book.cover_image;a.target='_blank';a.rel='noreferrer';a.click()}} className="mt-4 ml-2 px-4 py-2.5 border rounded-xl text-xs font-bold">Abrir capa</button>}</Card><Card className="p-5"><h3 className="text-sm font-black">Histórico</h3><div className="mt-3 divide-y">{exports.map(e=><div key={e.id} className="py-3 flex items-center justify-between gap-3"><div><p className="text-xs font-bold">{e.format}</p><p className="text-[10px] text-slate-400">{new Date(e.created_at).toLocaleString('pt-BR')}</p></div>{e.file_url&&<a href={e.file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-700">Abrir</a>}</div>)}{!exports.length&&<p className="text-xs text-slate-400">Nenhuma exportação ainda.</p>}</div></Card></div>}
    </div>}

    {book&&view==='editor'&&selectedChapter&&null}
  </div></div>;
}

function ChevronUpIcon(){return <svg viewBox="0 0 24 24" className="w-4 h-4"><path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2"/></svg>;}
