import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, Loader2 } from 'lucide-react';
import type { SalesPage, SalesBlock } from '@/types';

const FONT_SIZES: Record<string, string> = { xs:'text-xs', sm:'text-sm', base:'text-base', lg:'text-lg', xl:'text-xl', '2xl':'text-2xl', '3xl':'text-3xl', '4xl':'text-4xl', '5xl':'text-5xl', '6xl':'text-6xl' };
const ALIGN: Record<string,string> = { left:'text-left', center:'text-center', right:'text-right' };
interface BlockSettings { fontSize?:string; fontFamily?:string; align?:string; color?:string; bgColor?:string; fontWeight?:string; buttonUrl?:string; buttonBg?:string; buttonColor?:string; buttonRadius?:number; spacerHeight?:number; imageRounded?:boolean; imageWidth?:number; paddingY?:number; }

export function PublicSalesPage({ slug }: { slug:string }) {
  const [page,setPage]=useState<SalesPage|null>(null); const [blocks,setBlocks]=useState<SalesBlock[]>([]); const [loading,setLoading]=useState(true); const [notFound,setNotFound]=useState(false);
  useEffect(()=>{let alive=true; supabase.from('sales_pages').select('*').eq('slug',slug.toLowerCase()).maybeSingle().then(async({data})=>{if(!alive)return;if(!data||!(data as SalesPage).is_published){setNotFound(true);setLoading(false);return;}const p=data as SalesPage;setPage(p);document.title=p.seo_title||p.title;if(p.seo_description){let meta=document.querySelector('meta[name="description"]');if(!meta){meta=document.createElement('meta');meta.setAttribute('name','description');document.head.appendChild(meta)}meta.setAttribute('content',p.seo_description)}const {data:b}=await supabase.from('sales_blocks').select('*').eq('page_id',p.id).order('sort_order');if(alive){setBlocks((b as SalesBlock[])||[]);setLoading(false)}});return()=>{alive=false}},[slug]);
  if(loading)return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="w-8 h-8 text-slate-300 animate-spin"/></div>;
  if(notFound)return <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-center px-4"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mb-4"><Sparkles className="w-6 h-6 text-white"/></div><h1 className="text-xl font-bold text-white mb-2">Página não encontrada</h1><p className="text-sm text-slate-400">Esta página de venda não existe ou não está publicada.</p></div>;
  return <div className="min-h-screen bg-white"><div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">{blocks.length===0?<p className="text-center text-slate-400 py-20">Esta página está vazia.</p>:<div>{blocks.map(block=>{const s=block.settings as unknown as BlockSettings;const font=FONT_SIZES[s.fontSize||'base']||'text-base';const align=ALIGN[s.align||'left']||'text-left';const base={fontFamily:s.fontFamily||'Inter',backgroundColor:s.bgColor||'transparent',paddingTop:s.paddingY??8,paddingBottom:s.paddingY??8};
    switch(block.block_type){
      case 'heading': return <div key={block.id} className={`px-4 ${align}`} style={base}><p className={`${font} ${s.fontWeight==='bold'?'font-bold':'font-normal'} leading-tight whitespace-pre-wrap`} style={{color:s.color||'#0f172a'}}>{block.content}</p></div>;
      case 'text': return <div key={block.id} className={`px-4 ${align}`} style={base}><p className={`${font} whitespace-pre-wrap leading-relaxed`} style={{color:s.color||'#334155'}}>{block.content}</p></div>;
      case 'image': return block.content?<div key={block.id} className={`px-4 flex ${align==='text-center'?'justify-center':align==='text-right'?'justify-end':'justify-start'}`} style={{backgroundColor:s.bgColor||'transparent',paddingTop:s.paddingY??12,paddingBottom:s.paddingY??12}}><img src={block.content} alt="" style={{width:`${Math.min(100,Math.max(20,s.imageWidth||100))}%`}} className={`max-w-full object-contain ${s.imageRounded===false?'':'rounded-xl'}`}/></div>:null;
      case 'button': return <div key={block.id} className={`px-4 flex ${align==='text-center'?'justify-center':align==='text-right'?'justify-end':'justify-start'}`} style={{backgroundColor:s.bgColor||'transparent',paddingTop:s.paddingY??12,paddingBottom:s.paddingY??12}}><a href={s.buttonUrl||'#'} target="_blank" rel="noopener noreferrer" className="inline-block px-7 py-3 font-semibold transition hover:opacity-90" style={{fontFamily:s.fontFamily||'Inter',borderRadius:s.buttonRadius??12,backgroundColor:s.buttonBg||'#0f172a',color:s.buttonColor||'#fff'}}>{block.content||'Clique aqui'}</a></div>;
      case 'spacer': return <div key={block.id} style={{height:s.spacerHeight||48,backgroundColor:s.bgColor||'transparent'}}/>;
      case 'divider': return <hr key={block.id} className="border-t" style={{marginTop:s.paddingY??12,marginBottom:s.paddingY??12,borderColor:s.color||'#e2e8f0'}}/>;
      default:return null;
    }
  })}</div>}</div><div className="text-center pb-8"><a href="#/auth" className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-slate-400 transition"><Sparkles className="w-3 h-3"/>Powered by risegoat</a></div></div>;
}
