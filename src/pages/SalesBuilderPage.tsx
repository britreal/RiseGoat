import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadUserImage } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui';
import type { SalesBlock, SalesPage } from '@/types';
import {
  ArrowLeft, BarChart3, BadgeCheck, ChevronDown, ChevronUp, Copy, CreditCard, FileText, HelpCircle,
  Image as ImageIcon, LayoutGrid, LayoutTemplate, Loader2, Megaphone, Minus, Monitor, MousePointer,
  Package, Palette, Plus, Quote, Save, Settings2, ShieldCheck, Smartphone, Sparkles, Table2, Trash2,
  Timer, Type, Upload as UploadIcon, Video
} from 'lucide-react';

type BlockType =
  | 'hero' | 'heading' | 'text' | 'image' | 'button' | 'video' | 'features' | 'benefits'
  | 'testimonial' | 'testimonials' | 'logos' | 'stats' | 'product' | 'pricing' | 'comparison'
  | 'guarantee' | 'faq' | 'countdown' | 'cta' | 'notice' | 'spacer' | 'divider';

type Item = Record<string, string | number | boolean>;

type Settings = {
  fontSize?: string; fontFamily?: string; align?: 'left' | 'center' | 'right';
  color?: string; bgColor?: string; fontWeight?: 'normal' | 'bold'; paddingY?: number;
  buttonUrl?: string; buttonBg?: string; buttonColor?: string; buttonRadius?: number;
  spacerHeight?: number; imageRounded?: boolean; imageWidth?: number;
  subheading?: string; buttonText?: string; imageUrl?: string;
  videoUrl?: string; columns?: number; items?: Item[];
  price?: string; compareAt?: string; badge?: string; features?: string;
  author?: string; role?: string; avatarUrl?: string; days?: string; text?: string;
  endAt?: string; title?: string; subtitle?: string;
  accentColor?: string;
};

type PageSettings = {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: string;
  backgroundRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  overlayColor?: string;
  overlayOpacity?: number;
  contentWidth?: 'narrow' | 'medium' | 'wide';
};

const fonts = ['Inter', 'Arial', 'Georgia', 'Helvetica', 'Verdana', 'Trebuchet MS', 'Times New Roman'];
const sizes = ['xs','sm','base','lg','xl','2xl','3xl','4xl','5xl','6xl','7xl'];
const sizeClass: Record<string,string> = {
  xs:'text-xs',sm:'text-sm',base:'text-base',lg:'text-lg',xl:'text-xl','2xl':'text-2xl','3xl':'text-3xl',
  '4xl':'text-4xl','5xl':'text-5xl','6xl':'text-6xl','7xl':'text-7xl'
};

const BLOCKS: { type: BlockType; label: string; icon: typeof Type; group: string }[] = [
  {type:'hero',label:'Hero',icon:Sparkles,group:'Essenciais'},
  {type:'heading',label:'Título',icon:Type,group:'Essenciais'},
  {type:'text',label:'Texto',icon:Type,group:'Essenciais'},
  {type:'image',label:'Imagem',icon:ImageIcon,group:'Essenciais'},
  {type:'button',label:'Botão',icon:MousePointer,group:'Essenciais'},
  {type:'video',label:'Vídeo',icon:Video,group:'Conteúdo'},
  {type:'features',label:'Benefícios',icon:LayoutGrid,group:'Conteúdo'},
  {type:'benefits',label:'Lista de benefícios',icon:BadgeCheck,group:'Conteúdo'},
  {type:'product',label:'Produto',icon:Package,group:'Oferta'},
  {type:'pricing',label:'Preço / Oferta',icon:CreditCard,group:'Oferta'},
  {type:'comparison',label:'Comparação',icon:Table2,group:'Oferta'},
  {type:'testimonial',label:'Depoimento',icon:Quote,group:'Prova'},
  {type:'testimonials',label:'Depoimentos',icon:Quote,group:'Prova'},
  {type:'logos',label:'Logos / confiança',icon:ShieldCheck,group:'Prova'},
  {type:'stats',label:'Números',icon:BarChart3,group:'Prova'},
  {type:'guarantee',label:'Garantia',icon:ShieldCheck,group:'Redução de risco'},
  {type:'faq',label:'FAQ',icon:HelpCircle,group:'Redução de risco'},
  {type:'countdown',label:'Contagem regressiva',icon:Timer,group:'Urgência'},
  {type:'notice',label:'Aviso / Urgência',icon:Megaphone,group:'Urgência'},
  {type:'cta',label:'CTA final',icon:MousePointer,group:'Conversão'},
  {type:'spacer',label:'Espaço',icon:Minus,group:'Layout'},
  {type:'divider',label:'Divisor',icon:Minus,group:'Layout'},
];

const TEMPLATES: { key:string; label:string; description:string; blocks: Array<{type:BlockType;content:string;settings:Settings}> }[] = [
  {
    key:'course', label:'Curso / Infoproduto', description:'Hero, benefícios, prova, oferta, garantia e FAQ.',
    blocks:[
      {type:'hero',content:'Transforme [problema] em [resultado]',settings:{subheading:'Um programa completo para [público] alcançar [resultado] com um método claro.',buttonText:'Quero começar agora',buttonUrl:'#',align:'center',paddingY:32}},
      {type:'logos',content:'Junte-se a pessoas que já estão avançando',settings:{items:[{name:'+1.000 alunos'},{name:'Aulas práticas'},{name:'Suporte'}],align:'center',paddingY:20}},
      {type:'benefits',content:'O que você vai conseguir',settings:{items:[{title:'Resultado claro',text:'Saiba exatamente o que fazer e em qual ordem.'},{title:'Método prático',text:'Aplicação passo a passo, sem teoria desnecessária.'},{title:'Menos tentativa e erro',text:'Evite os erros que mais atrasam quem está começando.'}],columns:3,paddingY:24}},
      {type:'video',content:'Veja como funciona',settings:{videoUrl:'',title:'Assista à apresentação',paddingY:24}},
      {type:'testimonials',content:'Quem já passou por isso',settings:{items:[{quote:'Eu finalmente consegui sair do zero e aplicar o plano.',author:'Aluno 1',role:'Cliente'},{quote:'O passo a passo deixou tudo muito mais simples.',author:'Aluno 2',role:'Cliente'}],paddingY:24}},
      {type:'pricing',content:'Acesso completo',settings:{price:'R$ 197',compareAt:'R$ 397',badge:'Oferta especial',features:'Acesso completo\nMateriais de apoio\nAtualizações\nSuporte',buttonText:'Quero meu acesso',buttonUrl:'#',paddingY:28}},
      {type:'guarantee',content:'Garantia de 7 dias',settings:{days:'7',text:'Teste por 7 dias. Se não fizer sentido para você, solicite o reembolso conforme os termos da oferta.',paddingY:24}},
      {type:'faq',content:'Perguntas frequentes',settings:{items:[{question:'Para quem é?',answer:'Para pessoas que querem aplicar o método de forma prática.'},{question:'Como recebo acesso?',answer:'Após a confirmação, você recebe as instruções de acesso.'},{question:'Existe garantia?',answer:'Sim. Consulte o período e as condições da oferta.'}],paddingY:24}},
      {type:'cta',content:'Pronto para começar?',settings:{subtitle:'Dê o próximo passo agora.',buttonText:'Quero começar',buttonUrl:'#',paddingY:32}},
    ]
  },
  {
    key:'product', label:'Produto', description:'Visual, benefícios, preço, prova e garantia.',
    blocks:[
      {type:'hero',content:'O produto que resolve [problema]',settings:{subheading:'Uma solução objetiva para [público] alcançar [resultado].',buttonText:'Comprar agora',buttonUrl:'#',align:'center',paddingY:32}},
      {type:'product',content:'[Nome do produto]',settings:{imageUrl:'',price:'R$ 97',features:'Benefício principal\nEntrega / acesso imediato\nMaterial completo',buttonText:'Quero comprar',buttonUrl:'#',paddingY:28}},
      {type:'benefits',content:'Por que escolher esta solução',settings:{items:[{title:'Prático',text:'Comece a aplicar rapidamente.'},{title:'Completo',text:'Tudo em um só lugar.'},{title:'Direto',text:'Foco no que gera resultado.'}],columns:3,paddingY:24}},
      {type:'stats',content:'Resultados que importam',settings:{items:[{value:'4.9/5',label:'Avaliação'},{value:'+1.000',label:'Clientes'},{value:'7 dias',label:'Garantia'}],columns:3,paddingY:20}},
      {type:'testimonials',content:'O que clientes dizem',settings:{items:[{quote:'Produto excelente e muito fácil de usar.',author:'Cliente 1',role:'Cliente'},{quote:'Foi exatamente o que eu precisava.',author:'Cliente 2',role:'Cliente'}],paddingY:24}},
      {type:'pricing',content:'Oferta',settings:{price:'R$ 97',compareAt:'R$ 147',badge:'Hoje',features:'Produto completo\nBônus\nAcesso imediato',buttonText:'Comprar agora',buttonUrl:'#',paddingY:28}},
      {type:'faq',content:'Dúvidas antes de comprar?',settings:{items:[{question:'Quando recebo?',answer:'Imediatamente após a confirmação.'},{question:'Posso cancelar?',answer:'Consulte os termos da oferta e a política de garantia.'}],paddingY:24}},
      {type:'cta',content:'Garanta o seu',settings:{buttonText:'Comprar agora',buttonUrl:'#',paddingY:32}},
    ]
  },
  {
    key:'service', label:'Serviço / Consultoria', description:'Autoridade, processo, prova, oferta e chamada.',
    blocks:[
      {type:'hero',content:'[Resultado] sem [dor principal]',settings:{subheading:'Serviço para [público] que precisa de [resultado específico].',buttonText:'Agendar conversa',buttonUrl:'#',align:'center',paddingY:32}},
      {type:'logos',content:'Empresas / clientes / marcas que confiam',settings:{items:[{name:'Cliente A'},{name:'Cliente B'},{name:'Cliente C'},{name:'Cliente D'}],align:'center',paddingY:20}},
      {type:'benefits',content:'O que você recebe',settings:{items:[{title:'Diagnóstico',text:'Entendimento do cenário atual.'},{title:'Plano',text:'Prioridades e próximos passos.'},{title:'Execução',text:'Acompanhamento até colocar em prática.'}],columns:3,paddingY:24}},
      {type:'features',content:'Como funciona',settings:{items:[{title:'1. Diagnóstico',text:'Mapeamos o problema.'},{title:'2. Estratégia',text:'Montamos o plano.'},{title:'3. Implementação',text:'Executamos e ajustamos.'}],columns:3,paddingY:24}},
      {type:'testimonials',content:'Prova',settings:{items:[{quote:'A clareza que recebemos mudou a velocidade da execução.',author:'Cliente 1',role:'Empresa'},{quote:'O processo foi objetivo e orientado a resultado.',author:'Cliente 2',role:'Empresa'}],paddingY:24}},
      {type:'pricing',content:'Escolha o próximo passo',settings:{price:'A partir de R$ 1.500',features:'Diagnóstico\nPlano personalizado\nAcompanhamento',buttonText:'Falar comigo',buttonUrl:'#',paddingY:28}},
      {type:'faq',content:'Perguntas',settings:{items:[{question:'Como começamos?',answer:'Agende uma conversa para avaliar o cenário.'},{question:'Quanto tempo?',answer:'Depende do escopo definido na proposta.'}],paddingY:24}},
      {type:'cta',content:'Vamos conversar?',settings:{subtitle:'Explique seu cenário e veja os próximos passos.',buttonText:'Agendar conversa',buttonUrl:'#',paddingY:32}},
    ]
  },
  {
    key:'vsl', label:'VSL / Long Form', description:'Vídeo, narrativa, benefícios, prova, oferta e objeções.',
    blocks:[
      {type:'hero',content:'Você não precisa continuar [problema]',settings:{subheading:'Descubra um caminho mais simples para [resultado].',buttonText:'Assistir agora',buttonUrl:'#',align:'center',paddingY:30}},
      {type:'video',content:'Apresentação',settings:{videoUrl:'',paddingY:28}},
      {type:'text',content:'Imagine conseguir [resultado] sem [objeção]. Esta página foi criada para explicar o método, mostrar o que está incluído e deixar claro qual é o próximo passo.',settings:{fontSize:'lg',align:'center',paddingY:22}},
      {type:'benefits',content:'O que muda quando você aplica o método',settings:{items:[{title:'Mais clareza',text:'Você sabe qual ação vem a seguir.'},{title:'Mais velocidade',text:'Reduz o tempo perdido em tentativas.'},{title:'Mais confiança',text:'Toma decisões com uma estrutura.'}],columns:3,paddingY:24}},
      {type:'testimonials',content:'Resultados e experiências',settings:{items:[{quote:'Foi a primeira vez que consegui seguir um processo até o fim.',author:'Cliente 1',role:'Cliente'},{quote:'A estrutura tirou a sensação de estar perdido.',author:'Cliente 2',role:'Cliente'}],paddingY:24}},
      {type:'pricing',content:'A oferta',settings:{price:'R$ 197',compareAt:'R$ 397',badge:'Condição especial',features:'Acesso completo\nBônus\nGarantia',buttonText:'Quero acessar',buttonUrl:'#',paddingY:28}},
      {type:'guarantee',content:'Você pode testar com tranquilidade',settings:{days:'7',text:'Consulte os termos para conhecer as condições da garantia.',paddingY:24}},
      {type:'faq',content:'Antes de decidir',settings:{items:[{question:'Funciona para iniciantes?',answer:'A estrutura pode ser adaptada ao estágio do cliente.'},{question:'Como acesso?',answer:'As instruções são enviadas após a confirmação.'}],paddingY:24}},
      {type:'cta',content:'Seu próximo passo',settings:{buttonText:'Quero começar',buttonUrl:'#',paddingY:32}},
    ]
  },
  {
    key:'webinar', label:'Webinar / Evento', description:'Promessa, agenda, prova, urgência e inscrição.',
    blocks:[
      {type:'hero',content:'[Evento]: aprenda [resultado] ao vivo',settings:{subheading:'Uma apresentação prática para [público].',buttonText:'Quero participar',buttonUrl:'#',align:'center',paddingY:32}},
      {type:'countdown',content:'O evento começa em',settings:{endAt:'',paddingY:18}},
      {type:'features',content:'O que você vai aprender',settings:{items:[{title:'Parte 1',text:'Primeira transformação.'},{title:'Parte 2',text:'Segunda transformação.'},{title:'Parte 3',text:'Plano de ação.'}],columns:3,paddingY:24}},
      {type:'stats',content:'Por que participar',settings:{items:[{value:'+500',label:'Inscritos'},{value:'90 min',label:'Conteúdo'},{value:'Ao vivo',label:'Formato'}],columns:3,paddingY:20}},
      {type:'testimonials',content:'Quem já participou',settings:{items:[{quote:'Conteúdo muito acima do esperado.',author:'Participante 1',role:'Participante'},{quote:'Saí com um plano claro.',author:'Participante 2',role:'Participante'}],paddingY:24}},
      {type:'cta',content:'Reserve sua vaga',settings:{subtitle:'As vagas podem ser limitadas.',buttonText:'Quero participar',buttonUrl:'#',paddingY:32}},
      {type:'faq',content:'Perguntas',settings:{items:[{question:'Quando acontece?',answer:'Confira a data e horário informados nesta página.'},{question:'Preciso pagar?',answer:'Consulte as condições de inscrição.'}],paddingY:24}},
    ]
  },
  {
    key:'lead', label:'Lead Magnet', description:'Oferta gratuita, benefícios, prova e CTA.',
    blocks:[
      {type:'hero',content:'Baixe [material] e descubra [resultado]',settings:{subheading:'Um material direto ao ponto para [público].',buttonText:'Quero receber',buttonUrl:'#',align:'center',paddingY:32}},
      {type:'product',content:'O que você vai receber',settings:{imageUrl:'',features:'Checklist prático\nPasso a passo\nExemplos',buttonText:'Receber grátis',buttonUrl:'#',paddingY:26}},
      {type:'benefits',content:'Dentro do material',settings:{items:[{title:'Ação 1',text:'Algo que o leitor poderá fazer.'},{title:'Ação 2',text:'Mais uma ação prática.'},{title:'Ação 3',text:'Um terceiro ganho claro.'}],columns:3,paddingY:24}},
      {type:'testimonial',content:'“Um material simples que já me ajudou a organizar o próximo passo.”',settings:{author:'Leitor',role:'Baixou o material',paddingY:24}},
      {type:'cta',content:'Quero meu material',settings:{buttonText:'Receber grátis',buttonUrl:'#',paddingY:32}},
    ]
  }
];

function defaultSettings(type:BlockType): {content:string;settings:Settings} {
  switch(type){
    case 'hero': return {content:'Sua promessa principal',settings:{subheading:'Explique em uma frase para quem é e qual resultado entrega.',buttonText:'Quero começar',buttonUrl:'#',align:'center',fontSize:'5xl',fontWeight:'bold',paddingY:28}};
    case 'heading': return {content:'Seu título aqui',settings:{fontSize:'3xl',fontFamily:'Inter',align:'center',color:'#0f172a',fontWeight:'bold',paddingY:10}};
    case 'text': return {content:'Escreva seu texto aqui...',settings:{fontSize:'base',fontFamily:'Inter',align:'left',color:'#334155',paddingY:10}};
    case 'image': return {content:'',settings:{align:'center',imageRounded:true,imageWidth:100,paddingY:12}};
    case 'button': return {content:'Quero começar',settings:{fontSize:'base',fontFamily:'Inter',align:'center',buttonUrl:'#',buttonBg:'#0f172a',buttonColor:'#ffffff',buttonRadius:12,paddingY:12}};
    case 'video': return {content:'Assista à apresentação',settings:{videoUrl:'',title:'',paddingY:18}};
    case 'features':
    case 'benefits': return {content:'Benefícios principais',settings:{items:[{title:'Benefício 1',text:'Explique o resultado para o cliente.'},{title:'Benefício 2',text:'Explique o resultado para o cliente.'},{title:'Benefício 3',text:'Explique o resultado para o cliente.'}],columns:3,paddingY:20}};
    case 'testimonial': return {content:'“Escreva aqui um depoimento específico e verificável.”',settings:{author:'Nome do cliente',role:'Cargo / contexto',paddingY:20}};
    case 'testimonials': return {content:'O que nossos clientes dizem',settings:{items:[{quote:'“Resultado claro e específico.”',author:'Cliente 1',role:'Cliente'},{quote:'“Experiência simples e objetiva.”',author:'Cliente 2',role:'Cliente'}],paddingY:20}};
    case 'logos': return {content:'Confiança',settings:{items:[{name:'Cliente A'},{name:'Cliente B'},{name:'Cliente C'}],align:'center',paddingY:18}};
    case 'stats': return {content:'Números',settings:{items:[{value:'4.9/5',label:'Avaliação'},{value:'+1.000',label:'Clientes'},{value:'7 dias',label:'Garantia'}],columns:3,paddingY:18}};
    case 'product': return {content:'Nome do produto',settings:{imageUrl:'',price:'R$ 97',features:'Benefício 1\nBenefício 2\nBenefício 3',buttonText:'Quero comprar',buttonUrl:'#',paddingY:24}};
    case 'pricing': return {content:'Oferta principal',settings:{price:'R$ 197',compareAt:'R$ 397',badge:'Oferta',features:'Benefício 1\nBenefício 2\nBenefício 3',buttonText:'Quero começar',buttonUrl:'#',paddingY:26}};
    case 'comparison': return {content:'Compare as opções',settings:{items:[{feature:'Acesso completo',optionA:'✓',optionB:'—'},{feature:'Suporte',optionA:'✓',optionB:'—'},{feature:'Bônus',optionA:'✓',optionB:'✓'}],paddingY:24}};
    case 'guarantee': return {content:'Garantia de 7 dias',settings:{days:'7',text:'Explique claramente como funciona a garantia e quais são as condições.',paddingY:22}};
    case 'faq': return {content:'Perguntas frequentes',settings:{items:[{question:'Para quem é?',answer:'Resposta objetiva.'},{question:'Como funciona?',answer:'Explique o processo.'},{question:'Existe garantia?',answer:'Explique as condições.'}],paddingY:22}};
    case 'countdown': return {content:'A condição termina em',settings:{endAt:'',paddingY:18}};
    case 'notice': return {content:'Condição especial disponível por tempo limitado.',settings:{bgColor:'#fff7ed',color:'#9a3412',align:'center',paddingY:14}};
    case 'cta': return {content:'Pronto para começar?',settings:{subtitle:'Dê o próximo passo agora.',buttonText:'Quero começar',buttonUrl:'#',align:'center',paddingY:28}};
    case 'spacer': return {content:'',settings:{spacerHeight:48}};
    case 'divider': return {content:'',settings:{color:'#e2e8f0',paddingY:12}};
  }
}

function pageDefaults(page:SalesPage):PageSettings {
  const raw=(page.settings||{}) as PageSettings;
  return {
    backgroundColor:raw.backgroundColor||'#ffffff',
    backgroundImage:raw.backgroundImage||'',
    backgroundSize:raw.backgroundSize||'cover',
    backgroundPosition:raw.backgroundPosition||'center',
    backgroundRepeat:raw.backgroundRepeat||'no-repeat',
    overlayColor:raw.overlayColor||'#000000',
    overlayOpacity:raw.overlayOpacity??0,
    contentWidth:raw.contentWidth||'medium'
  };
}

export function SalesBuilderPage({ pageId, navigate }: {pageId:string;navigate:(path:string)=>void}){
  const {user}=useAuth();
  const [page,setPage]=useState<SalesPage|null>(null);
  const [blocks,setBlocks]=useState<SalesBlock[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [previewMode,setPreviewMode]=useState<'desktop'|'iphone'>('desktop');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [showTemplates,setShowTemplates]=useState(false);
  const [error,setError]=useState('');

  const selectedBlock=useMemo(()=>blocks.find(b=>b.id===selected)||null,[blocks,selected]);

  const load=useCallback(async()=>{
    if(!user)return;
    setError('');
    const [p,b]=await Promise.all([
      supabase.from('sales_pages').select('*').eq('id',pageId).eq('user_id',user.id).maybeSingle(),
      supabase.from('sales_blocks').select('*').eq('page_id',pageId).eq('user_id',user.id).order('sort_order')
    ]);
    if(p.error||b.error){setError(p.error?.message||b.error?.message||'Não foi possível carregar a página.');setLoading(false);return;}
    if(!p.data){setError('Página de venda não encontrada.');setLoading(false);return;}
    setPage(p.data as SalesPage);setBlocks((b.data as SalesBlock[])||[]);setLoading(false);
  },[pageId,user]);

  useEffect(()=>{void load()},[load]);

  async function persistBlock(block:SalesBlock,updates:Partial<SalesBlock>){
    const next={...block,...updates};
    setBlocks(v=>v.map(x=>x.id===block.id?next:x));setSaving(true);
    const {error:updateError}=await supabase.from('sales_blocks').update({content:next.content,settings:next.settings,sort_order:next.sort_order}).eq('id',block.id).eq('user_id',user?.id||'');
    setSaving(false);
    if(updateError){setError(updateError.message);return;}
    setSaved(true);window.setTimeout(()=>setSaved(false),1000);
  }

  async function add(type:BlockType){
    if(!user||!page)return;
    const d=defaultSettings(type);
    const {data,error:e}=await supabase.from('sales_blocks').insert({page_id:page.id,user_id:user.id,block_type:type,content:d.content,settings:d.settings,sort_order:blocks.length}).select().single();
    if(e||!data){setError(e?.message||'Não foi possível adicionar o bloco.');return;}
    setBlocks(v=>[...v,data as SalesBlock]);setSelected((data as SalesBlock).id);setShowAdd(false);
  }

  async function applyTemplate(template:(typeof TEMPLATES)[number]){
    if(!user||!page)return;
    if(blocks.length && !window.confirm('Aplicar este modelo vai substituir os blocos atuais. Continuar?'))return;
    setSaving(true);setError('');
    await supabase.from('sales_blocks').delete().eq('page_id',page.id).eq('user_id',user.id);
    const rows=template.blocks.map((b,index)=>({page_id:page.id,user_id:user.id,block_type:b.type,content:b.content,settings:b.settings,sort_order:index}));
    const {data,error:e}=await supabase.from('sales_blocks').insert(rows).select().order('sort_order');
    if(e||!data){setError(e?.message||'Não foi possível aplicar o modelo.');setSaving(false);return;}
    setBlocks((data as SalesBlock[]));setSelected(null);setShowTemplates(false);setSaving(false);
    setPage({...page,settings:{...(page.settings as Record<string,unknown>||{}),backgroundColor:'#ffffff',backgroundImage:'',overlayOpacity:0}});
  }

  async function remove(id:string){
    if(!user)return;
    const {error:e}=await supabase.from('sales_blocks').delete().eq('id',id).eq('user_id',user.id);
    if(e){setError(e.message);return;}
    const next=blocks.filter(b=>b.id!==id).map((b,i)=>({...b,sort_order:i}));
    setBlocks(next);
    await Promise.all(next.map(b=>supabase.from('sales_blocks').update({sort_order:b.sort_order}).eq('id',b.id).eq('user_id',user.id)));
    setSelected(null);
  }

  async function move(i:number,dir:-1|1){
    const j=i+dir;if(j<0||j>=blocks.length)return;
    const next=[...blocks];[next[i],next[j]]=[next[j],next[i]];setBlocks(next);
    await Promise.all(next.map((b,n)=>supabase.from('sales_blocks').update({sort_order:n}).eq('id',b.id).eq('user_id',user?.id||'')));
  }

  async function duplicate(block:SalesBlock){
    if(!user||!page)return;
    const d=await supabase.from('sales_blocks').insert({page_id:page.id,user_id:user.id,block_type:block.block_type,content:block.content,settings:block.settings,sort_order:block.sort_order+1}).select().single();
    if(!d.data)return;
    const shifted=blocks.map(b=>b.sort_order>=block.sort_order+1?{...b,sort_order:b.sort_order+1}:b);
    await Promise.all(shifted.map(b=>supabase.from('sales_blocks').update({sort_order:b.sort_order}).eq('id',b.id).eq('user_id',user.id)));
    setBlocks([...shifted,d.data as SalesBlock].sort((a,b)=>a.sort_order-b.sort_order));
  }

  async function togglePublish(){
    if(!page)return;
    const {error:e}=await supabase.from('sales_pages').update({is_published:!page.is_published,updated_at:new Date().toISOString()}).eq('id',page.id).eq('user_id',user?.id||'');
    if(e)setError(e.message);else setPage({...page,is_published:!page.is_published});
  }

  async function savePage(){
    if(!page)return;
    setSaving(true);setError('');
    const {error:e}=await supabase.from('sales_pages').update({seo_title:page.seo_title,seo_description:page.seo_description,settings:page.settings||{},updated_at:new Date().toISOString()}).eq('id',page.id).eq('user_id',user?.id||'');
    setSaving(false);
    if(e){setError(e.message);return;}
    setSaved(true);window.setTimeout(()=>setSaved(false),1000);
  }

  async function updatePageSettings(updates:Partial<PageSettings>){
    if(!page)return;
    const next={...pageDefaults(page),...updates};
    setPage({...page,settings:next});
  }

  async function uploadPageBackground(file:File){
    if(!user||!page)return;
    try{
      setSaving(true);const url=await uploadUserImage(user.id,file,'sales-pages');await updatePageSettings({backgroundImage:url});setSaving(false);
    }catch(e){setSaving(false);setError(e instanceof Error?e.message:'Não foi possível enviar a imagem.');}
  }

  const ps=page?pageDefaults(page):pageDefaults({settings:{}} as SalesPage);
  const width=ps.contentWidth==='narrow'?'max-w-3xl':ps.contentWidth==='wide'?'max-w-6xl':'max-w-5xl';

  if(loading)return <Spinner/>;
  if(!page)return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 text-center"><p className="text-sm font-semibold text-slate-800">Não foi possível abrir esta página.</p><p className="text-xs text-red-600 mt-2">{error||'Página não encontrada.'}</p><button onClick={()=>navigate('/sales')} className="mt-5 px-4 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-semibold">Voltar para páginas de venda</button></div></div>;

  const grouped=Array.from(new Set(BLOCKS.map(x=>x.group)));

  return <div className="min-h-screen bg-[#f7f7f5] flex flex-col">
    <header className="sticky top-0 z-40 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-3 lg:px-5">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={()=>navigate('/sales')} className="p-2 rounded-lg hover:bg-slate-100"><ArrowLeft className="w-4 h-4"/></button>
        <div className="min-w-0"><p className="font-semibold text-sm truncate">{page.title}</p><p className="text-[11px] text-slate-400">risegoat.com/p/{page.slug}</p></div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={()=>setShowTemplates(v=>!v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50"><LayoutTemplate className="w-3.5 h-3.5"/> Modelos</button>
        <button onClick={()=>setShowSettings(v=>!v)} className="p-2 rounded-lg hover:bg-slate-100" title="Fundo e SEO"><Settings2 className="w-4 h-4"/></button>
        {saved&&<span className="text-xs text-green-600">Salvo</span>}
        <button onClick={savePage} disabled={saving} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium">{saving?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5 inline mr-1"/>}Salvar</button>
        <button onClick={togglePublish} className={'px-3 py-1.5 rounded-lg text-xs font-medium '+(page.is_published?'bg-amber-50 text-amber-700':'bg-green-50 text-green-700')}>{page.is_published?'Despublicar':'Publicar'}</button>
      </div>
    </header>

    {error&&<div role="alert" className="bg-red-50 border-b border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3"><span>{error}</span><button onClick={()=>setError('')} className="text-xs font-semibold">Fechar</button></div>}

    {showTemplates&&<div className="bg-white border-b border-slate-200 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-3"><div><p className="font-semibold text-sm">Modelos prontos</p><p className="text-xs text-slate-400">Estruturas inspiradas em padrões comuns de páginas de venda de alta conversão.</p></div><Sparkles className="w-5 h-5 text-slate-400"/></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{TEMPLATES.map(t=><button key={t.key} onClick={()=>void applyTemplate(t)} className="text-left p-4 border rounded-2xl hover:border-cyan-400 hover:bg-cyan-50/40 transition"><p className="text-sm font-bold text-slate-800">{t.label}</p><p className="text-xs text-slate-500 mt-1 leading-5">{t.description}</p><span className="inline-block mt-3 text-[11px] font-semibold text-cyan-600">Aplicar modelo →</span></button>)}</div>
      </div>
    </div>}

    {showSettings&&<div className="bg-white border-b border-slate-200 p-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3"><Palette className="w-4 h-4 text-slate-500"/><p className="text-sm font-semibold">Fundo da página</p></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="text-xs text-slate-500">Cor<input type="color" value={ps.backgroundColor||'#ffffff'} onChange={e=>void updatePageSettings({backgroundColor:e.target.value})} className="block w-full h-9 mt-1"/></label>
            <label className="text-xs text-slate-500">Imagem<input type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(file)void uploadPageBackground(file);}} className="block w-full text-[11px] mt-2"/></label>
            <label className="text-xs text-slate-500">Tamanho<select value={ps.backgroundSize} onChange={e=>void updatePageSettings({backgroundSize:e.target.value as PageSettings['backgroundSize']})} className="w-full mt-1 border rounded-lg p-1.5 bg-white"><option value="cover">Cover</option><option value="contain">Contain</option><option value="auto">Original</option></select></label>
            <label className="text-xs text-slate-500">Posição<select value={ps.backgroundPosition} onChange={e=>void updatePageSettings({backgroundPosition:e.target.value})} className="w-full mt-1 border rounded-lg p-1.5 bg-white"><option>center</option><option>top</option><option>bottom</option><option>left</option><option>right</option></select></label>
            <label className="text-xs text-slate-500">Repetição<select value={ps.backgroundRepeat} onChange={e=>void updatePageSettings({backgroundRepeat:e.target.value as PageSettings['backgroundRepeat']})} className="w-full mt-1 border rounded-lg p-1.5 bg-white"><option value="no-repeat">Não repetir</option><option value="repeat">Repetir</option><option value="repeat-x">Horizontal</option><option value="repeat-y">Vertical</option></select></label>
            <label className="text-xs text-slate-500">Overlay<input type="color" value={ps.overlayColor||'#000000'} onChange={e=>void updatePageSettings({overlayColor:e.target.value})} className="block w-full h-9 mt-1"/></label>
            <label className="text-xs text-slate-500">Opacidade: {Math.round((ps.overlayOpacity||0)*100)}%<input type="range" min="0" max="1" step="0.05" value={ps.overlayOpacity||0} onChange={e=>void updatePageSettings({overlayOpacity:Number(e.target.value)})} className="w-full"/></label>
            <label className="text-xs text-slate-500">Largura<select value={ps.contentWidth} onChange={e=>void updatePageSettings({contentWidth:e.target.value as PageSettings['contentWidth']})} className="w-full mt-1 border rounded-lg p-1.5 bg-white"><option value="narrow">Estreita</option><option value="medium">Média</option><option value="wide">Ampla</option></select></label>
          </div>
          {ps.backgroundImage&&<p className="text-[11px] text-slate-400 mt-3 truncate">Imagem atual: {ps.backgroundImage}</p>}
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3"><Settings2 className="w-4 h-4 text-slate-500"/><p className="text-sm font-semibold">SEO</p></div>
          <input value={page.seo_title||''} onChange={e=>setPage(p=>p?{...p,seo_title:e.target.value}:p)} placeholder="Título SEO" className="w-full px-3 py-2 border rounded-lg text-sm mb-2"/>
          <textarea value={page.seo_description||''} onChange={e=>setPage(p=>p?{...p,seo_description:e.target.value}:p)} placeholder="Descrição SEO" rows={4} className="w-full px-3 py-2 border rounded-lg text-sm"/>
        </div>
      </div>
    </div>}

    <div className="flex flex-1 min-h-0">
      <aside className="hidden xl:block w-64 bg-white border-r border-slate-200/80 p-4 sticky top-14 h-[calc(100vh-3.5rem)] self-start overflow-y-auto">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Blocos</p>
        {grouped.map(group=><div key={group} className="mb-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mb-2">{group}</p><div className="grid grid-cols-2 gap-2">{BLOCKS.filter(b=>b.group===group).map(b=><button key={b.type} onClick={()=>void add(b.type)} className="p-2.5 rounded-xl border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 text-xs flex flex-col items-center gap-1.5"><b.icon className="w-4 h-4"/><span>{b.label}</span></button>)}</div></div>)}
      </aside>

      <main className="flex-1 overflow-y-auto p-3 lg:p-8">
        <div className={width+' mx-auto'}>
          <div className="flex items-center justify-between mb-4 bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm">
            <p className="px-2 text-xs font-semibold text-slate-600">Visualização</p>
            <div className="flex items-center gap-1">
              <button onClick={()=>setPreviewMode('iphone')} className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium '+(previewMode==='iphone'?'bg-slate-900 text-white':'text-slate-500 hover:bg-slate-100')}><Smartphone className="w-3.5 h-3.5"/> iPhone</button>
              <button onClick={()=>setPreviewMode('desktop')} className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium '+(previewMode==='desktop'?'bg-slate-900 text-white':'text-slate-500 hover:bg-slate-100')}><Monitor className="w-3.5 h-3.5"/> Desktop</button>
            </div>
          </div>

          <div className={previewMode==='iphone'?'max-w-[390px] mx-auto border-[10px] border-slate-900 rounded-[2.25rem] shadow-xl overflow-hidden':''}>
            <div className="relative min-h-[700px] overflow-hidden rounded-xl" style={{backgroundColor:ps.backgroundColor,backgroundImage:ps.backgroundImage?`url(${ps.backgroundImage})`:'none',backgroundSize:ps.backgroundSize,backgroundPosition:ps.backgroundPosition,backgroundRepeat:ps.backgroundRepeat}}>
              {ps.overlayOpacity! > 0&&<div className="absolute inset-0 pointer-events-none" style={{backgroundColor:ps.overlayColor,opacity:ps.overlayOpacity}}/>}
              <div className="relative" onClick={()=>setSelected(null)}>
                {blocks.length===0?<div className="min-h-[700px] flex items-center justify-center text-slate-400">Adicione seu primeiro bloco ou escolha um modelo.</div>:blocks.map((b,i)=><div key={b.id} onClick={e=>{e.stopPropagation();setSelected(b.id)}} className={'relative '+(selected===b.id?'ring-2 ring-cyan-400 ring-inset':'')}><BlockPreview block={b}/>{selected===b.id&&<div className="absolute right-2 top-2 flex gap-1 bg-white shadow rounded-lg p-1 z-20"><button onClick={()=>void move(i,-1)} disabled={i===0} className="p-1 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5"/></button><button onClick={()=>void move(i,1)} disabled={i===blocks.length-1} className="p-1 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5"/></button><button onClick={()=>void duplicate(b)} className="p-1"><Copy className="w-3.5 h-3.5"/></button><button onClick={()=>void remove(b.id)} className="p-1 text-red-500"><Trash2 className="w-3.5 h-3.5"/></button></div>}</div>)}
              </div>
            </div>
          </div>

          <button onClick={()=>setShowAdd(v=>!v)} className="w-full mt-3 py-3 border-2 border-dashed border-slate-300 rounded-xl bg-white text-slate-500 hover:border-cyan-400 hover:text-cyan-600 text-sm flex justify-center gap-2"><Plus className="w-4 h-4"/>Adicionar bloco</button>
          {showAdd&&<div className="xl:hidden mt-2 p-3 bg-white rounded-xl border">
            {grouped.map(group=><div key={group} className="mb-3"><p className="text-[10px] font-bold uppercase text-slate-300 mb-2">{group}</p><div className="grid grid-cols-3 gap-2">{BLOCKS.filter(b=>b.group===group).map(b=><button key={b.type} onClick={()=>void add(b.type)} className="p-2 border rounded-lg text-xs"><b.icon className="w-4 h-4 mx-auto mb-1"/>{b.label}</button>)}</div></div>)}
          </div>}
        </div>
      </main>

      <aside className="hidden lg:block w-[340px] bg-white border-l border-slate-200/80 p-4 sticky top-14 h-[calc(100vh-3.5rem)] self-start overflow-y-auto">
        {selectedBlock?<Inspector block={selectedBlock} onUpdate={u=>void persistBlock(selectedBlock,u)}/>:<div className="text-center text-slate-400 text-xs pt-16"><Palette className="w-7 h-7 mx-auto mb-2"/>Selecione um bloco para editar</div>}
      </aside>
    </div>
  </div>;
}

function BlockPreview({block}:{block:SalesBlock}){
  const s=block.settings as Settings;
  const align=s.align||'left';
  const wrap=align==='center'?'text-center':align==='right'?'text-right':'text-left';
  const font=sizeClass[s.fontSize||'base']||'text-base';
  const base={fontFamily:s.fontFamily||'Inter',color:s.color||'#0f172a',backgroundColor:s.bgColor||'transparent',paddingTop:s.paddingY??10,paddingBottom:s.paddingY??10};
  const button=(text:string,url:string)=> <a href={url||'#'} onClick={e=>e.preventDefault()} className="inline-block px-7 py-3 font-semibold transition hover:opacity-90" style={{fontFamily:s.fontFamily||'Inter',borderRadius:s.buttonRadius??12,backgroundColor:s.buttonBg||'#0f172a',color:s.buttonColor||'#fff'}}>{text||'Clique aqui'}</a>;
  if(block.block_type==='hero')return (
    <section className={'px-6 '+wrap} style={{...base,paddingTop:s.paddingY??32,paddingBottom:s.paddingY??32}}>
      <p className="text-xs uppercase tracking-[0.2em] opacity-60 mb-3">{s.title||'Oferta'}</p>
      <h1 className={(font==='text-base'?'text-5xl':font)+' font-black leading-tight'}>{block.content}</h1>
      {s.subheading&&<p className="max-w-2xl mx-auto mt-4 text-lg leading-7 opacity-75">{s.subheading}</p>}
      <div className="mt-6">{button(s.buttonText||'Quero começar',s.buttonUrl||'#')}</div>
      {s.imageUrl ? <img src={s.imageUrl} alt="" className="max-w-full max-h-80 object-contain mx-auto mt-8 rounded-2xl"/> : null}
    </section>
  );
  if(block.block_type==='heading'||block.block_type==='text')return <div className={'px-6 '+wrap} style={base}><p className={font+' leading-relaxed '+(s.fontWeight==='bold'?'font-bold':'')+' whitespace-pre-wrap'}>{block.content}</p></div>;
  if(block.block_type==='image')return <div className={'px-6 flex '+(align==='center'?'justify-center':align==='right'?'justify-end':'justify-start')} style={{paddingTop:s.paddingY??12,paddingBottom:s.paddingY??12,backgroundColor:s.bgColor||'transparent'}}>{block.content?<img src={block.content} alt="" style={{width:`${s.imageWidth||100}%`}} className={'max-w-full object-contain '+(s.imageRounded===false?'':'rounded-xl')}/>:<div className="h-40 w-full bg-slate-100 rounded-xl flex items-center justify-center text-slate-400"><ImageIcon/></div>}</div>;
  if(block.block_type==='button')return <div className={'px-6 flex '+(align==='center'?'justify-center':align==='right'?'justify-end':'justify-start')} style={{paddingTop:s.paddingY??12,paddingBottom:s.paddingY??12,backgroundColor:s.bgColor||'transparent'}}>{button(block.content,s.buttonUrl||'#')}</div>;
  if(block.block_type==='video')return <section className="px-6 text-center" style={{paddingTop:s.paddingY??18,paddingBottom:s.paddingY??18,backgroundColor:s.bgColor||'transparent'}}>{s.title&&<h3 className="text-xl font-bold mb-4">{s.title}</h3>}{s.videoUrl?<div className="aspect-video rounded-2xl overflow-hidden bg-black max-w-3xl mx-auto"><iframe title={block.content||'Vídeo'} src={toEmbedUrl(s.videoUrl)} className="w-full h-full" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/></div>:<div className="aspect-video rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 max-w-3xl mx-auto"><Video className="w-7 h-7"/><span className="ml-2 text-sm">{block.content||'Adicione a URL do vídeo'}</span></div>}</section>;
  if(block.block_type==='features'||block.block_type==='benefits')return <section className="px-6" style={{paddingTop:s.paddingY??20,paddingBottom:s.paddingY??20,backgroundColor:s.bgColor||'transparent'}}><h2 className="text-2xl sm:text-3xl font-black text-center mb-6">{block.content}</h2><div className={'grid gap-4 '+(s.columns===2?'md:grid-cols-2':s.columns===4?'md:grid-cols-2 lg:grid-cols-4':'md:grid-cols-3')}>{(s.items||[]).map((item,i)=><div key={i} className="rounded-2xl border border-slate-200 bg-white/80 p-5"><div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold mb-4">{i+1}</div><h3 className="font-bold">{String(item.title||'Benefício')}</h3><p className="text-sm text-slate-600 mt-2 leading-6">{String(item.text||'')}</p></div>)}</div></section>;
  if(block.block_type==='testimonial')return <section className="px-6 text-center" style={{paddingTop:s.paddingY??20,paddingBottom:s.paddingY??20,backgroundColor:s.bgColor||'transparent'}}><div className="max-w-3xl mx-auto rounded-2xl border border-slate-200 bg-white/90 p-7"><Quote className="w-6 h-6 mx-auto mb-3 text-slate-400"/><p className="text-lg leading-8 font-medium">{block.content}</p><p className="text-sm font-bold mt-5">{s.author||'Cliente'}</p><p className="text-xs text-slate-400">{s.role||''}</p></div></section>;
  if(block.block_type==='testimonials')return <section className="px-6" style={{paddingTop:s.paddingY??20,paddingBottom:s.paddingY??20}}><h2 className="text-2xl sm:text-3xl font-black text-center mb-6">{block.content}</h2><div className="grid gap-4 md:grid-cols-2">{(s.items||[]).map((item,i)=><div key={i} className="rounded-2xl border border-slate-200 bg-white/90 p-6"><Quote className="w-5 h-5 text-slate-400 mb-3"/><p className="text-sm leading-7">{String(item.quote||'')}</p><p className="text-xs font-bold mt-4">{String(item.author||'Cliente')}</p><p className="text-[11px] text-slate-400">{String(item.role||'')}</p></div>)}</div></section>;
  if(block.block_type==='logos')return <section className={'px-6 '+wrap} style={{paddingTop:s.paddingY??18,paddingBottom:s.paddingY??18}}><h3 className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-4">{block.content}</h3><div className="flex flex-wrap gap-3 justify-center">{(s.items||[]).map((item,i)=><span key={i} className="px-4 py-2 rounded-full border border-slate-200 bg-white/80 text-sm font-semibold text-slate-500">{String(item.name||'Marca')}</span>)}</div></section>;
  if(block.block_type==='stats')return <section className="px-6" style={{paddingTop:s.paddingY??18,paddingBottom:s.paddingY??18}}><h2 className="text-2xl font-black text-center mb-5">{block.content}</h2><div className={'grid gap-3 '+(s.columns===2?'md:grid-cols-2':s.columns===4?'md:grid-cols-4':'md:grid-cols-3')}>{(s.items||[]).map((item,i)=><div key={i} className="rounded-2xl border border-slate-200 bg-white/80 p-5 text-center"><p className="text-2xl font-black">{String(item.value||'')}</p><p className="text-xs text-slate-500 mt-1">{String(item.label||'')}</p></div>)}</div></section>;
  if(block.block_type==='product')return <section className="px-6" style={{paddingTop:s.paddingY??24,paddingBottom:s.paddingY??24}}><div className="grid md:grid-cols-2 gap-6 items-center rounded-3xl border border-slate-200 bg-white/90 p-6">{s.imageUrl?<img src={s.imageUrl} alt="" className="w-full max-h-80 object-contain rounded-2xl"/>:<div className="aspect-square rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400"><Package/></div>}<div><h2 className="text-3xl font-black">{block.content}</h2>{s.price&&<p className="text-3xl font-black mt-4">{s.price}</p>}<ul className="mt-4 space-y-2 text-sm text-slate-600">{String(s.features||'').split('\n').filter(Boolean).map((x,i)=><li key={i} className="flex gap-2"><span className="text-emerald-600">✓</span>{x}</li>)}</ul><div className="mt-6">{button(s.buttonText||'Quero comprar',s.buttonUrl||'#')}</div></div></div></section>;
  if(block.block_type==='pricing')return <section className="px-6" style={{paddingTop:s.paddingY??26,paddingBottom:s.paddingY??26}}><div className="max-w-md mx-auto rounded-3xl border-2 border-slate-900 bg-white p-7 text-center relative overflow-hidden">{s.badge&&<div className="inline-flex px-3 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">{s.badge}</div>}<h2 className="text-2xl font-black mt-3">{block.content}</h2>{s.compareAt&&<p className="text-sm text-slate-400 line-through mt-3">{s.compareAt}</p>}<p className="text-5xl font-black mt-1">{s.price||'R$ 0'}</p><ul className="mt-5 text-sm text-left space-y-2">{String(s.features||'').split('\n').filter(Boolean).map((x,i)=><li key={i} className="flex gap-2"><span className="text-emerald-600">✓</span>{x}</li>)}</ul><div className="mt-6">{button(s.buttonText||'Quero começar',s.buttonUrl||'#')}</div></div></section>;
  if(block.block_type==='comparison')return <section className="px-6" style={{paddingTop:s.paddingY??24,paddingBottom:s.paddingY??24}}><h2 className="text-2xl font-black text-center mb-5">{block.content}</h2><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full text-sm"><thead><tr className="bg-slate-50"><th className="text-left p-3">Item</th><th className="p-3">Opção A</th><th className="p-3">Opção B</th></tr></thead><tbody>{(s.items||[]).map((item,i)=><tr key={i} className="border-t border-slate-100"><td className="p-3 font-medium">{String(item.feature||'')}</td><td className="p-3 text-center">{String(item.optionA||'')}</td><td className="p-3 text-center">{String(item.optionB||'')}</td></tr>)}</tbody></table></div></section>;
  if(block.block_type==='guarantee')return <section className="px-6 text-center" style={{paddingTop:s.paddingY??22,paddingBottom:s.paddingY??22}}><div className="max-w-2xl mx-auto rounded-3xl border border-emerald-200 bg-emerald-50 p-7"><ShieldCheck className="w-8 h-8 mx-auto text-emerald-600"/><h2 className="text-2xl font-black mt-3">{block.content}</h2><p className="text-sm text-emerald-900/70 leading-6 mt-3">{s.text||''}</p></div></section>;
  if(block.block_type==='faq')return <section className="px-6" style={{paddingTop:s.paddingY??22,paddingBottom:s.paddingY??22}}><h2 className="text-2xl font-black text-center mb-5">{block.content}</h2><div className="max-w-3xl mx-auto space-y-2">{(s.items||[]).map((item,i)=><details key={i} className="rounded-xl border border-slate-200 bg-white/90 p-4"><summary className="cursor-pointer font-semibold text-sm">{String(item.question||'Pergunta')}</summary><p className="text-sm text-slate-600 mt-3 leading-6">{String(item.answer||'')}</p></details>)}</div></section>;
  if(block.block_type==='countdown')return <section className="px-6 text-center" style={{paddingTop:s.paddingY??18,paddingBottom:s.paddingY??18}}><div className="rounded-2xl bg-slate-950 text-white p-5 max-w-2xl mx-auto"><Timer className="w-5 h-5 mx-auto opacity-70"/><p className="font-bold mt-2">{block.content}</p><p className="text-xs text-white/50 mt-2">{s.endAt?s.endAt:'Defina a data final no editor.'}</p></div></section>;
  if(block.block_type==='notice')return <div className={'px-6 '+wrap} style={{...base,fontWeight:'bold'}}><div className="rounded-xl px-4 py-3">{block.content}</div></div>;
  if(block.block_type==='cta')return <section className={'px-6 '+wrap} style={{...base,paddingTop:s.paddingY??28,paddingBottom:s.paddingY??28}}><div className="rounded-3xl bg-slate-950 text-white p-8"><h2 className="text-3xl font-black">{block.content}</h2>{s.subtitle&&<p className="text-white/60 mt-2">{s.subtitle}</p>}<div className="mt-5">{button(s.buttonText||'Quero começar',s.buttonUrl||'#')}</div></div></section>;
  if(block.block_type==='spacer')return <div style={{height:s.spacerHeight||48,backgroundColor:s.bgColor||'transparent'}}/>;
  return <hr className="border-t" style={{marginTop:s.paddingY||12,marginBottom:s.paddingY||12,borderColor:s.color||'#e2e8f0'}}/>;
}

function toEmbedUrl(url:string){try{const u=new URL(url);if(u.hostname.includes('youtube.com')){if(u.pathname.includes('/embed/'))return url;const v=u.searchParams.get('v');if(v)return 'https://www.youtube.com/embed/'+v;const parts=u.pathname.split('/').filter(Boolean);const idx=parts.indexOf('shorts');if(idx>=0&&parts[idx+1])return 'https://www.youtube.com/embed/'+parts[idx+1];}if(u.hostname.includes('youtu.be'))return 'https://www.youtube.com/embed/'+u.pathname.slice(1);return url}catch{return url}}

function Field({label,children}:{label:string;children:ReactNode}){return <label className="text-xs text-slate-500 space-y-1 block">{label}{children}</label>}
function TextInput({value,onChange,placeholder}:{value:string;onChange:(v:string)=>void;placeholder?:string}){return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="w-full border rounded-lg p-2 text-sm bg-white"/>}

function Inspector({block,onUpdate}:{block:SalesBlock;onUpdate:(u:Partial<SalesBlock>)=>void}){
  const {user}=useAuth();
  const s=block.settings as Settings;
  const set=(x:Partial<Settings>)=>onUpdate({settings:{...s,...x}});
  const [content,setContent]=useState(block.content);
  const [uploadingImage,setUploadingImage]=useState(false);
  useEffect(()=>setContent(block.content),[block.id,block.content]);
  const commit=()=>{if(content!==block.content)onUpdate({content})};
  const uploadImage=async(file:File,target:'block'|'image'='block')=>{
    if(!user)return;
    try{setUploadingImage(true);const url=await uploadUserImage(user.id,file,'sales-pages');if(target==='block'){setContent(url);onUpdate({content:url})}else set({imageUrl:url});}
    catch(e){window.alert(e instanceof Error?e.message:'Não foi possível enviar a imagem.')}finally{setUploadingImage(false)}
  };
  function updateItem(index:number,key:string,value:string){
    const items=[...(s.items||[])];items[index]={...items[index],[key]:value};set({items});
  }
  function addItem(initial:Item={title:'Novo item',text:'Descrição'}){
    set({items:[...(s.items||[]),initial]});
  }
  function removeItem(index:number){set({items:(s.items||[]).filter((_,i)=>i!==index)});}
  const listTextFields = block.block_type==='features'||block.block_type==='benefits'
    ? ['title','text'] : block.block_type==='testimonials' ? ['quote','author','role'] : block.block_type==='logos' ? ['name']
    : block.block_type==='stats' ? ['value','label'] : block.block_type==='comparison' ? ['feature','optionA','optionB']
    : block.block_type==='faq' ? ['question','answer'] : null;
  return <div className="space-y-4">
    <div className="flex items-center justify-between"><p className="font-semibold text-sm">Editar {BLOCKS.find(x=>x.type===block.block_type)?.label||block.block_type}</p><span className="text-[10px] text-slate-400">RiseGoat</span></div>

    {['hero','heading','text','button','testimonial','testimonials','logos','stats','product','pricing','comparison','guarantee','faq','countdown','notice','cta'].includes(block.block_type)&&
      <textarea value={content} onChange={e=>setContent(e.target.value)} onBlur={commit} rows={block.block_type==='hero'?3:2} className="w-full border rounded-lg p-2 text-sm" placeholder="Título ou conteúdo"/>}

    {(block.block_type==='image'||block.block_type==='product')&&block.block_type==='image'&&<label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer hover:bg-slate-50 text-sm text-slate-600"><UploadIcon className="w-4 h-4"/><span className="truncate">{uploadingImage?'Enviando...':'Escolher imagem do PC ou celular'}</span><input type="file" accept="image/*" className="hidden" disabled={uploadingImage} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadImage(file);e.currentTarget.value='';}}/></label>}

    <div className="grid grid-cols-2 gap-2">
      <Field label="Fonte"><select value={s.fontFamily||'Inter'} onChange={e=>set({fontFamily:e.target.value})} className="w-full border rounded-lg p-1.5 bg-white">{fonts.map(f=><option key={f}>{f}</option>)}</select></Field>
      <Field label="Tamanho"><select value={s.fontSize||'base'} onChange={e=>set({fontSize:e.target.value})} className="w-full border rounded-lg p-1.5 bg-white">{sizes.map(x=><option key={x}>{x}</option>)}</select></Field>
    </div>

    {['hero','heading','text','button','testimonial','testimonials','logos','stats','product','pricing','comparison','guarantee','faq','countdown','notice','cta','features','benefits','video'].includes(block.block_type)&&<div className="grid grid-cols-3 gap-1">{(['left','center','right'] as const).map(a=><button key={a} onClick={()=>set({align:a})} className={'p-1.5 rounded border text-[11px] '+(s.align===a?'bg-cyan-50 border-cyan-400':'')}>{a==='left'?'Esq.':a==='center'?'Centro':'Dir.'}</button>)}</div>}

    {['hero','heading','text','button','features','benefits','testimonial','testimonials','logos','stats','product','pricing','comparison','guarantee','faq','countdown','notice','cta','video'].includes(block.block_type)&&<div className="grid grid-cols-2 gap-3"><Field label="Texto"><input type="color" value={s.color||'#0f172a'} onChange={e=>set({color:e.target.value})} className="block w-full h-8"/></Field><Field label="Fundo"><input type="color" value={s.bgColor||'#ffffff'} onChange={e=>set({bgColor:e.target.value})} className="block w-full h-8"/></Field></div>}

    {block.block_type==='hero'&&<div className="space-y-2">
      <Field label="Subtítulo"><TextInput value={s.subheading||''} onChange={v=>set({subheading:v})}/></Field>
      <div className="grid grid-cols-2 gap-2"><Field label="Texto do CTA"><TextInput value={s.buttonText||''} onChange={v=>set({buttonText:v})}/></Field><Field label="URL do CTA"><TextInput value={s.buttonUrl||''} onChange={v=>set({buttonUrl:v})}/></Field></div>
      <Field label="Imagem opcional"><TextInput value={s.imageUrl||''} onChange={v=>set({imageUrl:v})}/></Field>
    </div>}

    {block.block_type==='video'&&<Field label="URL do YouTube / vídeo"><TextInput value={s.videoUrl||''} onChange={v=>set({videoUrl:v})} placeholder="https://youtube.com/watch?v=..."/></Field>}

    {(block.block_type==='features'||block.block_type==='benefits'||block.block_type==='testimonials'||block.block_type==='logos'||block.block_type==='stats'||block.block_type==='comparison'||block.block_type==='faq')&&<div className="space-y-3">
      {(block.block_type==='features'||block.block_type==='benefits'||block.block_type==='stats')&&<Field label="Colunas"><select value={s.columns||3} onChange={e=>set({columns:Number(e.target.value)})} className="w-full border rounded-lg p-1.5 bg-white"><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></Field>}
      <div className="space-y-2">
        {(s.items||[]).map((item,i)=><div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
          {(listTextFields||[]).map(field=><Field key={field} label={field==='title'?'Título':field==='text'?'Texto':field==='quote'?'Depoimento':field==='author'?'Autor':field==='role'?'Contexto':field==='name'?'Nome':field==='value'?'Valor':field==='label'?'Rótulo':field==='feature'?'Item':field==='optionA'?'Opção A':field==='optionB'?'Opção B':field==='question'?'Pergunta':'Resposta'}><TextInput value={String(item[field]??'')} onChange={v=>updateItem(i,field,v)}/></Field>)}
          <button onClick={()=>removeItem(i)} className="text-xs text-red-500">Remover</button>
        </div>)}
      </div>
      <button onClick={()=>addItem(block.block_type==='faq'?{question:'Nova pergunta',answer:'Resposta'}:block.block_type==='comparison'?{feature:'Novo item',optionA:'✓',optionB:'—'}:block.block_type==='testimonials'?{quote:'Novo depoimento',author:'Cliente',role:'Cliente'}:block.block_type==='logos'?{name:'Nova marca'}:block.block_type==='stats'?{value:'0',label:'Novo número'}:{title:'Novo benefício',text:'Descrição'})} className="w-full py-2 border border-dashed rounded-lg text-xs font-semibold text-slate-500">+ Adicionar item</button>
    </div>}

    {block.block_type==='testimonial'&&<div className="grid grid-cols-2 gap-2"><Field label="Autor"><TextInput value={s.author||''} onChange={v=>set({author:v})}/></Field><Field label="Contexto"><TextInput value={s.role||''} onChange={v=>set({role:v})}/></Field></div>}
    {block.block_type==='product'&&<div className="space-y-2">
      <Field label="Imagem"><TextInput value={s.imageUrl||''} onChange={v=>set({imageUrl:v})}/></Field>
      <label className="flex items-center gap-2 border rounded-lg p-2 cursor-pointer text-xs text-slate-600"><UploadIcon className="w-4 h-4"/><span>Enviar imagem</span><input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)void uploadImage(f,'image');e.currentTarget.value='';}}/></label>
      <Field label="Preço"><TextInput value={s.price||''} onChange={v=>set({price:v})}/></Field>
      <Field label="Benefícios (um por linha)"><textarea value={s.features||''} onChange={e=>set({features:e.target.value})} rows={5} className="w-full border rounded-lg p-2 text-sm"/></Field>
      <div className="grid grid-cols-2 gap-2"><Field label="CTA"><TextInput value={s.buttonText||''} onChange={v=>set({buttonText:v})}/></Field><Field label="URL"><TextInput value={s.buttonUrl||''} onChange={v=>set({buttonUrl:v})}/></Field></div>
    </div>}

    {block.block_type==='pricing'&&<div className="space-y-2">
      <div className="grid grid-cols-2 gap-2"><Field label="Preço"><TextInput value={s.price||''} onChange={v=>set({price:v})}/></Field><Field label="Preço anterior"><TextInput value={s.compareAt||''} onChange={v=>set({compareAt:v})}/></Field></div>
      <Field label="Badge"><TextInput value={s.badge||''} onChange={v=>set({badge:v})}/></Field>
      <Field label="Inclui (um por linha)"><textarea value={s.features||''} onChange={e=>set({features:e.target.value})} rows={5} className="w-full border rounded-lg p-2 text-sm"/></Field>
      <div className="grid grid-cols-2 gap-2"><Field label="CTA"><TextInput value={s.buttonText||''} onChange={v=>set({buttonText:v})}/></Field><Field label="URL"><TextInput value={s.buttonUrl||''} onChange={v=>set({buttonUrl:v})}/></Field></div>
    </div>}

    {block.block_type==='guarantee'&&<div className="space-y-2"><Field label="Dias"><TextInput value={s.days||''} onChange={v=>set({days:v})}/></Field><Field label="Texto"><textarea value={s.text||''} onChange={e=>set({text:e.target.value})} rows={5} className="w-full border rounded-lg p-2 text-sm"/></Field></div>}
    {block.block_type==='countdown'&&<Field label="Data/hora final"><TextInput value={s.endAt||''} onChange={v=>set({endAt:v})} placeholder="2026-12-31 23:59"/></Field>}
    {block.block_type==='cta'&&<div className="space-y-2"><Field label="Subtítulo"><TextInput value={s.subtitle||''} onChange={v=>set({subtitle:v})}/></Field><div className="grid grid-cols-2 gap-2"><Field label="CTA"><TextInput value={s.buttonText||''} onChange={v=>set({buttonText:v})}/></Field><Field label="URL"><TextInput value={s.buttonUrl||''} onChange={v=>set({buttonUrl:v})}/></Field></div></div>}
    {block.block_type==='button'&&<div className="space-y-2"><Field label="URL"><TextInput value={s.buttonUrl||'#'} onChange={v=>set({buttonUrl:v})}/></Field><div className="grid grid-cols-2 gap-3"><Field label="Botão"><input type="color" value={s.buttonBg||'#0f172a'} onChange={e=>set({buttonBg:e.target.value})} className="block w-full h-8"/></Field><Field label="Texto"><input type="color" value={s.buttonColor||'#ffffff'} onChange={e=>set({buttonColor:e.target.value})} className="block w-full h-8"/></Field></div><Field label="Arredondamento"><input type="range" min="0" max="40" value={s.buttonRadius??12} onChange={e=>set({buttonRadius:Number(e.target.value)})} className="w-full"/></Field></div>}
    {block.block_type==='image'&&<><Field label={'Largura: '+(s.imageWidth??100)+'%'}><input type="range" min="20" max="100" value={s.imageWidth??100} onChange={e=>set({imageWidth:Number(e.target.value)})} className="w-full"/></Field><label className="flex gap-2 text-xs"><input type="checkbox" checked={s.imageRounded!==false} onChange={e=>set({imageRounded:e.target.checked})}/> Cantos arredondados</label></>}
    {block.block_type==='spacer'&&<Field label={'Altura: '+(s.spacerHeight||48)+'px'}><input type="range" min="8" max="240" value={s.spacerHeight||48} onChange={e=>set({spacerHeight:Number(e.target.value)})} className="w-full"/></Field>}
    {block.block_type!=='spacer'&&<Field label={'Espaço vertical: '+(s.paddingY||10)+'px'}><input type="range" min="0" max="64" value={s.paddingY||10} onChange={e=>set({paddingY:Number(e.target.value)})} className="w-full"/></Field>}
  </div>;
}
