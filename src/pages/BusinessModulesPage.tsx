import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, PageHeader, Spinner } from '@/components/ui';
import {
  ArrowLeft, ArrowRight, BarChart3, CalendarDays, Check, ChevronDown,
  CircleDollarSign, Handshake, Layers3, Link2, Plus, Radar as RadarIcon, Target,
  Trash2, TrendingUp, X, Zap,
} from 'lucide-react';

type Tone = 'gold' | 'green' | 'red' | 'gray';

const toneMap: Record<Tone, { badge: string; button: string; icon: string; soft: string }> = {
  gold: { badge: 'bg-amber-50 text-amber-700 border-amber-200', button: 'bg-amber-500 hover:bg-amber-400', icon: 'bg-amber-50 text-amber-700', soft: 'bg-amber-50/60' },
  green: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', button: 'bg-emerald-600 hover:bg-emerald-500', icon: 'bg-emerald-50 text-emerald-700', soft: 'bg-emerald-50/60' },
  red: { badge: 'bg-red-50 text-red-700 border-red-200', button: 'bg-red-600 hover:bg-red-500', icon: 'bg-red-50 text-red-700', soft: 'bg-red-50/60' },
  gray: { badge: 'bg-slate-100 text-slate-700 border-slate-200', button: 'bg-slate-950 hover:bg-slate-800', icon: 'bg-slate-100 text-slate-700', soft: 'bg-slate-50' },
};

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
const shortMoney = (value: number) => {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1000000) return 'R$ ' + (n / 1000000).toFixed(1).replace('.', ',') + ' mi';
  if (Math.abs(n) >= 1000) return 'R$ ' + (n / 1000).toFixed(1).replace('.', ',') + ' mil';
  return money(n);
};
const dateKey = (d = new Date()) => {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
};
const formatDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value + 'T12:00:00')) : '—';

function Section({ title, subtitle, icon: Icon, tone = 'gray', action }: { title: string; subtitle?: string; icon?: typeof Target; tone?: Tone; action?: ReactNode }) {
  const t = toneMap[tone];
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
      <div className="flex items-center gap-3">
        {Icon && <div className={'w-10 h-10 rounded-xl border flex items-center justify-center ' + t.icon}><Icon className="w-4 h-4" /></div>}
        <div>
          <h2 className="text-base font-bold text-slate-950">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function Button({ children, onClick, tone = 'gray', type = 'button', disabled = false }: { children: ReactNode; onClick?: () => void; tone?: Tone; type?: 'button' | 'submit'; disabled?: boolean }) {
  return <button type={type} onClick={onClick} disabled={disabled} className={'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 ' + toneMap[tone].button}>{children}</button>;
}

function Field({ label, value, onChange, type = 'text', placeholder = '', min, max, step }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string; min?: string; max?: string; step?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">{label}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} min={min} max={max} step={step}
        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition" />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> | string[] }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">{label}</span>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full h-11 appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-9 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition">
          {options.map(option => {
            const item = typeof option === 'string' ? { value: option, label: option } : option;
            return <option key={item.value} value={item.value}>{item.label}</option>;
          })}
        </select>
        <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </label>
  );
}

function ErrorNotice({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;
  return <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{message}</span><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-100"><X className="w-4 h-4" /></button></div>;
}

function ProgressBar({ value, tone = 'gray' }: { value: number; tone?: Tone }) {
  return <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className={'h-full rounded-full ' + (tone === 'gold' ? 'bg-amber-500' : tone === 'green' ? 'bg-emerald-500' : tone === 'red' ? 'bg-red-500' : 'bg-slate-950')} style={{ width: Math.max(0, Math.min(100, value)) + '%' }} /></div>;
}

function Modal({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <Card className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-6 py-5 flex items-center justify-between gap-4">
          <div><h2 className="text-lg font-black text-slate-950">{title}</h2>{subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}</div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </Card>
    </div>
  );
}

export function OffersPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [salesPages, setSalesPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({ type: 'infoproduto', status: 'ideia', margin: '100', commission: '0', price: '0', revenue_generated: '0' });

  async function load() {
    if (!user) return;
    setLoading(true); setError('');
    const [o, s] = await Promise.all([
      supabase.from('offers').select('*').eq('user_id', user.id).order('revenue_generated', { ascending: false }),
      supabase.from('sales_pages').select('id,title,slug').eq('user_id', user.id).order('updated_at', { ascending: false }),
    ]);
    const err = o.error || s.error; if (err) setError(err.message);
    setItems(o.data || []); setSalesPages(s.data || []); setLoading(false);
  }
  useEffect(() => { void load(); }, [user?.id]);

  async function save() {
    if (!user || !form.name?.trim()) return;
    const { data, error: e } = await supabase.from('offers').insert({
      user_id: user.id, name: form.name.trim(), type: form.type, status: form.status,
      price: Number(form.price || 0), margin: Number(form.margin || 0), commission: Number(form.commission || 0),
      channel: form.channel || '', revenue_generated: Number(form.revenue_generated || 0),
      sales_page_id: form.sales_page_id || null, needs_audience: form.needs_audience || '',
    }).select().single();
    if (e) return setError(e.message);
    setItems(v => [data, ...v]); setModal(false);
    setForm({ type: 'infoproduto', status: 'ideia', margin: '100', commission: '0', price: '0', revenue_generated: '0' });
  }
  async function updateStatus(id: string, status: string) {
    const { error: e } = await supabase.from('offers').update({ status, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user!.id);
    if (e) setError(e.message); else setItems(v => v.map(x => x.id === id ? { ...x, status } : x));
  }
  async function remove(id: string) {
    if (!window.confirm('Excluir esta oferta?')) return;
    const { error: e } = await supabase.from('offers').delete().eq('id', id).eq('user_id', user!.id);
    if (e) setError(e.message); else setItems(v => v.filter(x => x.id !== id));
  }
  const ranking = [...items].map(x => ({ ...x, profit: Number(x.revenue_generated || 0) * (Number(x.margin || 0) - Number(x.commission || 0)) / 100 })).sort((a,b) => b.profit-a.profit);
  if (loading) return <Spinner />;
  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      <PageHeader title="Ofertas" subtitle="Transforme produtos, serviços e assinaturas em unidades de monetização." action={<Button tone="gold" onClick={() => setModal(true)}><Plus className="w-4 h-4" /> Nova oferta</Button>} />
      <ErrorNotice message={error} onClose={() => setError('')} />
      <div className="grid md:grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Ofertas', value: items.length, Icon: Layers3 },
          { label: 'Vendendo', value: items.filter(x => x.status === 'vendendo').length, Icon: TrendingUp },
          { label: 'Receita gerada', value: shortMoney(items.reduce((s,x)=>s+Number(x.revenue_generated||0),0)), Icon: CircleDollarSign },
        ].map(({ label, value, Icon }) => <Card className="p-5" key={label}><div className="flex justify-between items-center"><span className="text-[10px] uppercase tracking-[.16em] font-bold text-slate-400">{label}</span><Icon className="w-4 h-4 text-amber-500" /></div><p className="text-3xl font-black text-slate-950 mt-2">{String(value)}</p></Card>)}
      </div>
      <div className="grid xl:grid-cols-[1.5fr_.5fr] gap-5">
        <Card className="overflow-hidden">
          <div className="p-5 border-b border-slate-100"><Section title="Tabela de ofertas" subtitle="Preço, margem, comissão, canal e vínculo comercial." icon={CircleDollarSign} tone="gold" /></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400"><tr>{['Oferta','Tipo','Status','Preço','Margem','Receita','Página',''].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">
            {items.map(x=><tr key={x.id} className="hover:bg-slate-50/50">
              <td className="px-4 py-3"><p className="font-semibold text-slate-800">{x.name}</p>{x.channel && <p className="text-[11px] text-slate-400">{x.channel}</p>}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{x.type}</td>
              <td className="px-4 py-3"><select value={x.status} onChange={e=>void updateStatus(x.id,e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"><option>ideia</option><option>criação</option><option>pronto</option><option>vendendo</option></select></td>
              <td className="px-4 py-3 font-semibold">{money(x.price)}</td><td className="px-4 py-3">{x.margin}%</td><td className="px-4 py-3 font-semibold">{money(x.revenue_generated)}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{salesPages.find(s=>s.id===x.sales_page_id)?.title || '—'}</td>
              <td className="px-4 py-3 text-right"><button onClick={()=>void remove(x.id)} className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4"/></button></td>
            </tr>)}
          </tbody></table></div>
          {items.length===0 && <div className="p-10 text-center text-sm text-slate-400">Nenhuma oferta cadastrada.</div>}
        </Card>
        <Card className="p-5 h-fit">
          <Section title="Ranking por lucro" subtitle="Estimativa: receita × (margem − comissão)." icon={TrendingUp} tone="gold" />
          <div className="space-y-3">{ranking.slice(0,8).map((x,i)=><div key={x.id} className="flex items-center gap-3"><span className="w-6 text-xs font-bold text-slate-400">{i+1}</span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-700 truncate">{x.name}</p><p className="text-[11px] text-slate-400">{x.margin}% margem · {x.commission}% comissão</p></div><span className="text-xs font-bold text-slate-900">{money(x.profit)}</span></div>)}{ranking.length===0 && <p className="text-sm text-slate-400">O ranking aparece após cadastrar ofertas.</p>}</div>
        </Card>
      </div>
      {modal && <Modal title="Nova oferta" subtitle="Cadastre a unidade de monetização e conecte uma página de venda." onClose={()=>setModal(false)}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Nome" value={form.name||''} onChange={v=>setForm({...form,name:v})} placeholder="Ex.: Curso, Mentoria, Produto..." />
          <SelectField label="Tipo" value={form.type} onChange={v=>setForm({...form,type:v})} options={['infoproduto','afiliado','serviço','assinatura']} />
          <SelectField label="Status" value={form.status} onChange={v=>setForm({...form,status:v})} options={['ideia','criação','pronto','vendendo']} />
          <Field label="Preço" value={form.price} onChange={v=>setForm({...form,price:v})} type="number" step="0.01" />
          <Field label="Margem (%)" value={form.margin} onChange={v=>setForm({...form,margin:v})} type="number" min="0" max="100" />
          <Field label="Comissão (%)" value={form.commission} onChange={v=>setForm({...form,commission:v})} type="number" min="0" max="100" />
          <Field label="Canal" value={form.channel||''} onChange={v=>setForm({...form,channel:v})} placeholder="YouTube, Instagram, E-mail..." />
          <Field label="Receita gerada" value={form.revenue_generated} onChange={v=>setForm({...form,revenue_generated:v})} type="number" step="0.01" />
          <div className="sm:col-span-2"><Field label="Necessidade de audiência (opcional)" value={form.needs_audience||''} onChange={v=>setForm({...form,needs_audience:v})} placeholder="Ex.: audiência fitness, empreendedores, creators..." /></div>
          <div className="sm:col-span-2"><SelectField label="Página de venda vinculada" value={form.sales_page_id||''} onChange={v=>setForm({...form,sales_page_id:v})} options={[{value:'',label:'Nenhuma'},...salesPages.map(s=>({value:s.id,label:s.title}))]} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-6"><Button onClick={()=>setModal(false)}>Cancelar</Button><Button tone="gold" onClick={()=>void save()}>Salvar oferta</Button></div>
      </Modal>}
    </div>
  );
}

export function RevenuePage() {
  const { user } = useAuth();
  const [rows,setRows]=useState<any[]>([]); const [offers,setOffers]=useState<any[]>([]); const [partners,setPartners]=useState<any[]>([]); const [leads,setLeads]=useState<any[]>([]); const [launches,setLaunches]=useState<any[]>([]);
  const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [modal,setModal]=useState(false);
  const [form,setForm]=useState<any>({date:dateKey(),status:'received'});
  async function load(){
    if(!user){setLoading(false);return;}
    setLoading(true);setError('');
    try{
      const [r,o,p,l,x]=await Promise.all([
        supabase.from('revenues').select('*').eq('user_id',user.id).order('occurred_on',{ascending:false}),
        supabase.from('offers').select('id,name').eq('user_id',user.id).order('name'),
        supabase.from('partnerships').select('id,name').eq('user_id',user.id).order('name'),
        supabase.from('newsletter_leads').select('id,name,email').eq('user_id',user.id).order('created_at',{ascending:false}),
        supabase.from('launches').select('id,name').eq('user_id',user.id).order('date_start',{ascending:false}),
      ]);
      const err=[r,o,p,l,x].find(z=>z.error)?.error;
      if(err) throw err;
      setRows(r.data||[]);setOffers(o.data||[]);setPartners(p.data||[]);setLeads(l.data||[]);setLaunches(x.data||[]);
    }catch(e:any){
      setError(e?.message||'Não foi possível carregar a Receita.');
    }finally{
      setLoading(false);
    }
  }
  useEffect(()=>{void load()},[user?.id]);
  async function save(){if(!user||!form.value)return;const {data,error:e}=await supabase.from('revenues').insert({user_id:user.id,source:form.source||'',value:Number(form.value||0),occurred_on:form.date||dateKey(),offer_id:form.offer_id||null,partnership_id:form.partnership_id||null,lead_id:form.lead_id||null,launch_id:form.launch_id||null,customer:form.customer||'',status:form.status||'received'}).select().single();if(e)return setError(e.message);setRows(v=>[data,...v]);setModal(false);setForm({date:dateKey(),status:'received'});}
  async function setStatus(id:string,status:string){const {error:e}=await supabase.from('revenues').update({status,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user!.id);if(e)setError(e.message);else setRows(v=>v.map(x=>x.id===id?{...x,status}:x));}
  async function remove(id:string){if(!window.confirm('Excluir esta receita?'))return;const {error:e}=await supabase.from('revenues').delete().eq('id',id).eq('user_id',user!.id);if(e)setError(e.message);else setRows(v=>v.filter(x=>x.id!==id));}
  const thisMonth=dateKey().slice(0,7); const monthly=rows.filter(x=>x.occurred_on?.slice(0,7)===thisMonth&&x.status==='received').reduce((s,x)=>s+Number(x.value||0),0);
  const annualProjection=monthly*12; const goalPct=Math.min(100,monthly/1000000*100);
  const months=useMemo(()=>{const out:any[]=[];const now=new Date();for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');out.push({key,label:d.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),value:rows.filter(x=>x.occurred_on?.slice(0,7)===key&&x.status==='received').reduce((s,x)=>s+Number(x.value||0),0)});}return out;},[rows]);
  const max=Math.max(1,...months.map(x=>x.value));
  if(loading)return <Spinner />;
  return <div className="p-5 lg:p-8 max-w-7xl mx-auto">
    <PageHeader title="Receita" subtitle="Acompanhe dinheiro recebido, projeção e distância até R$ 1.000.000/mês." action={<Button tone="green" onClick={()=>setModal(true)}><Plus className="w-4 h-4"/> Registrar receita</Button>}/>
    <ErrorNotice message={error} onClose={()=>setError('')}/>
    <div className="grid md:grid-cols-3 gap-4 mb-5">
      <Card className="p-5"><p className="text-[10px] uppercase tracking-[.16em] font-bold text-slate-400">Total mensal recebido</p><p className="text-3xl font-black mt-2">{shortMoney(monthly)}</p><p className="text-xs text-slate-400 mt-1">mês atual</p></Card>
      <Card className="p-5"><p className="text-[10px] uppercase tracking-[.16em] font-bold text-slate-400">Projeção anual</p><p className="text-3xl font-black mt-2">{shortMoney(annualProjection)}</p><p className="text-xs text-slate-400 mt-1">ritmo do mês atual × 12</p></Card>
      <Card className="p-5"><p className="text-[10px] uppercase tracking-[.16em] font-bold text-slate-400">Pendente</p><p className="text-3xl font-black mt-2">{shortMoney(rows.filter(x=>x.status==='pending').reduce((s,x)=>s+Number(x.value||0),0))}</p><p className="text-xs text-slate-400 mt-1">a receber</p></Card>
    </div>
    <div className="grid lg:grid-cols-[1.25fr_.75fr] gap-5 mb-5">
      <Card className="p-6"><Section title="Evolução da receita" subtitle="Receita recebida nos últimos 6 meses." icon={BarChart3} tone="green"/>
        <div className="h-60 flex items-end gap-3">{months.map(m=><div key={m.key} className="flex-1 h-full flex flex-col justify-end items-center gap-2"><div className="w-full max-w-12 rounded-t-xl bg-emerald-500/80 min-h-1" style={{height:Math.max(3,m.value/max*100)+'%'}} title={money(m.value)}/><span className="text-[10px] text-slate-400 capitalize">{m.label}</span></div>)}</div>
      </Card>
      <Card className="p-6"><Section title="Meta mensal" subtitle="Barra de progresso até R$ 1.000.000/mês." icon={Target} tone="green"/>
        <div className="flex items-end justify-between gap-3"><div><p className="text-4xl font-black">{goalPct.toFixed(1)}%</p><p className="text-xs text-slate-400 mt-1">{money(monthly)} de R$ 1.000.000</p></div><CircleDollarSign className="w-9 h-9 text-emerald-500"/></div>
        <div className="mt-5"><ProgressBar value={goalPct} tone="green"/></div><p className="text-xs text-slate-500 mt-3">Faltam {money(Math.max(0,1000000-monthly))} para a meta deste mês.</p>
      </Card>
    </div>
    <Card className="overflow-hidden"><div className="p-5 border-b border-slate-100"><Section title="Registros de receita" subtitle="Cada receita pode apontar para oferta, parceria, lead e lançamento." icon={Link2} tone="green"/></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400"><tr>{['Fonte','Valor','Data','Oferta','Parceria','Lead','Lançamento','Status',''].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(x=><tr key={x.id}><td className="px-4 py-3 font-semibold text-slate-800">{x.source||'—'}<p className="text-[11px] text-slate-400">{x.customer||''}</p></td><td className="px-4 py-3 font-bold">{money(x.value)}</td><td className="px-4 py-3">{formatDate(x.occurred_on)}</td><td className="px-4 py-3 text-xs">{offers.find(o=>o.id===x.offer_id)?.name||'—'}</td><td className="px-4 py-3 text-xs">{partners.find(o=>o.id===x.partnership_id)?.name||'—'}</td><td className="px-4 py-3 text-xs">{leads.find(o=>o.id===x.lead_id)?.name||'—'}</td><td className="px-4 py-3 text-xs">{launches.find(o=>o.id===x.launch_id)?.name||'—'}</td><td className="px-4 py-3"><select value={x.status} onChange={e=>void setStatus(x.id,e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs"><option value="received">recebido</option><option value="pending">pendente</option></select></td><td className="px-4 py-3 text-right"><button onClick={()=>void remove(x.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></td></tr>)}</tbody></table></div>
      {rows.length===0&&<div className="p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto"><CircleDollarSign className="w-6 h-6"/></div>
        <p className="text-sm font-bold text-slate-700 mt-4">Nenhuma receita registrada</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Comece registrando uma entrada. Depois você poderá vinculá-la a uma oferta, parceria, lead ou lançamento.</p>
        <button onClick={()=>setModal(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"><Plus className="w-4 h-4"/> Registrar primeira receita</button>
      </div>
    </Card>
    {modal&&<Modal title="Registrar receita" subtitle="Conecte o recebimento às peças que geraram o dinheiro." onClose={()=>setModal(false)}><div className="grid sm:grid-cols-2 gap-3">
      <Field label="Fonte" value={form.source||''} onChange={v=>setForm({...form,source:v})} placeholder="Venda direta, checkout, afiliado..." />
      <Field label="Valor" value={form.value||''} onChange={v=>setForm({...form,value:v})} type="number" step="0.01"/>
      <Field label="Data" value={form.date||dateKey()} onChange={v=>setForm({...form,date:v})} type="date"/>
      <Field label="Cliente" value={form.customer||''} onChange={v=>setForm({...form,customer:v})}/>
      <SelectField label="Oferta" value={form.offer_id||''} onChange={v=>setForm({...form,offer_id:v})} options={[{value:'',label:'Nenhuma'},...offers.map(x=>({value:x.id,label:x.name}))]}/>
      <SelectField label="Parceria" value={form.partnership_id||''} onChange={v=>setForm({...form,partnership_id:v})} options={[{value:'',label:'Nenhuma'},...partners.map(x=>({value:x.id,label:x.name}))]}/>
      <SelectField label="Lead" value={form.lead_id||''} onChange={v=>setForm({...form,lead_id:v})} options={[{value:'',label:'Nenhum'},...leads.map(x=>({value:x.id,label:x.name||x.email}))]}/>
      <SelectField label="Lançamento" value={form.launch_id||''} onChange={v=>setForm({...form,launch_id:v})} options={[{value:'',label:'Nenhum'},...launches.map(x=>({value:x.id,label:x.name}))]}/>
      <div className="sm:col-span-2"><SelectField label="Status" value={form.status||'received'} onChange={v=>setForm({...form,status:v})} options={[{value:'received',label:'Recebido'},{value:'pending',label:'Pendente'}]}/></div>
    </div><div className="flex justify-end gap-2 mt-6"><Button onClick={()=>setModal(false)}>Cancelar</Button><Button tone="green" onClick={()=>void save()}>Salvar receita</Button></div></Modal>}
  </div>;
}

export function PartnershipsPage() {
  const { user }=useAuth();
  const [rows,setRows]=useState<any[]>([]); const [leads,setLeads]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [modal,setModal]=useState(false); const [form,setForm]=useState<any>({type:'parceiro',status:'Ativa'});
  async function load(){if(!user)return;const [p,l]=await Promise.all([supabase.from('partnerships').select('*').eq('user_id',user.id).order('sales',{ascending:false}),supabase.from('newsletter_leads').select('id,name,email').eq('user_id',user.id).order('created_at',{ascending:false})]);const err=p.error||l.error;if(err)setError(err.message);setRows(p.data||[]);setLeads(l.data||[]);setLoading(false)}
  useEffect(()=>{void load()},[user?.id]);
  async function save(){if(!user||!form.name?.trim())return;const {data,error:e}=await supabase.from('partnerships').insert({user_id:user.id,name:form.name.trim(),type:form.type,contact:form.contact||'',lead_id:form.lead_id||null,commission:Number(form.commission||0),sales:Number(form.sales||0),value_to_pay:Number(form.value_to_pay||0),status:form.status||'Ativa'}).select().single();if(e)return setError(e.message);setRows(v=>[data,...v]);setModal(false);setForm({type:'parceiro',status:'Ativa'});}
  async function remove(id:string){if(!window.confirm('Excluir esta parceria?'))return;const {error:e}=await supabase.from('partnerships').delete().eq('id',id).eq('user_id',user!.id);if(e)setError(e.message);else setRows(v=>v.filter(x=>x.id!==id))}
  if(loading)return <Spinner/>;
  const ranking=[...rows].sort((a,b)=>Number(b.sales||0)-Number(a.sales||0));
  return <div className="p-5 lg:p-8 max-w-7xl mx-auto"><PageHeader title="Parcerias" subtitle="Organize afiliados, parceiros e colaboradores ligados à sua operação." action={<Button tone="red" onClick={()=>setModal(true)}><Plus className="w-4 h-4"/> Nova parceria</Button>}/><ErrorNotice message={error} onClose={()=>setError('')}/><div className="grid md:grid-cols-3 gap-4 mb-5">{[['Parcerias',rows.length],['Vendas',rows.reduce((s,x)=>s+Number(x.sales||0),0)],['A pagar',shortMoney(rows.reduce((s,x)=>s+Number(x.value_to_pay||0),0))]].map(([l,v])=><Card className="p-5" key={String(l)}><p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">{l}</p><p className="text-3xl font-black mt-2">{String(v)}</p></Card>)}</div>
    <div className="grid xl:grid-cols-[1.5fr_.5fr] gap-5"><Card className="overflow-hidden"><div className="p-5 border-b border-slate-100"><Section title="Tabela de parcerias" subtitle="Contato, comissão, vendas e repasse." icon={Handshake} tone="red"/></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-400"><tr>{['Nome','Tipo','Contato','Comissão','Vendas','Valor a pagar','Lead','Status',''].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map(x=><tr key={x.id}><td className="px-4 py-3 font-semibold">{x.name}</td><td className="px-4 py-3 text-xs">{x.type}</td><td className="px-4 py-3 text-xs">{x.contact||'—'}</td><td className="px-4 py-3">{x.commission}%</td><td className="px-4 py-3 font-bold">{x.sales}</td><td className="px-4 py-3 font-semibold">{money(x.value_to_pay)}</td><td className="px-4 py-3 text-xs">{leads.find(l=>l.id===x.lead_id)?.name||'—'}</td><td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700">{x.status}</span></td><td className="px-4 py-3 text-right"><button onClick={()=>void remove(x.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></td></tr>)}</tbody></table></div>{rows.length===0&&<div className="p-10 text-center text-sm text-slate-400">Nenhuma parceria cadastrada.</div>}</Card>
      <Card className="p-5 h-fit"><Section title="Ranking de afiliados" subtitle="Ordenado por vendas registradas." icon={TrendingUp} tone="red"/><div className="space-y-3">{ranking.slice(0,10).map((x,i)=><div key={x.id} className="flex items-center gap-3"><span className="w-6 text-xs text-slate-400">{i+1}</span><span className="flex-1 text-sm font-semibold truncate">{x.name}</span><span className="text-xs font-bold">{x.sales} vendas</span></div>)}</div></Card></div>
    {modal&&<Modal title="Nova parceria" subtitle="Conecte o parceiro a um lead para manter a origem rastreável." onClose={()=>setModal(false)}><div className="grid sm:grid-cols-2 gap-3"><Field label="Nome" value={form.name||''} onChange={v=>setForm({...form,name:v})}/><SelectField label="Tipo" value={form.type} onChange={v=>setForm({...form,type:v})} options={['afiliado','parceiro','colaborador']}/><Field label="Contato" value={form.contact||''} onChange={v=>setForm({...form,contact:v})}/><Field label="Comissão (%)" value={form.commission||0} onChange={v=>setForm({...form,commission:v})} type="number" min="0" max="100"/><Field label="Vendas" value={form.sales||0} onChange={v=>setForm({...form,sales:v})} type="number" min="0"/><Field label="Valor a pagar" value={form.value_to_pay||0} onChange={v=>setForm({...form,value_to_pay:v})} type="number" step="0.01"/><SelectField label="Lead vinculado" value={form.lead_id||''} onChange={v=>setForm({...form,lead_id:v})} options={[{value:'',label:'Nenhum'},...leads.map(l=>({value:l.id,label:l.name||l.email}))]}/><SelectField label="Status" value={form.status||'Ativa'} onChange={v=>setForm({...form,status:v})} options={['Ativa','Pausada','Encerrada']}/></div><div className="flex justify-end gap-2 mt-6"><Button onClick={()=>setModal(false)}>Cancelar</Button><Button tone="red" onClick={()=>void save()}>Salvar parceria</Button></div></Modal>}</div>;
}

function LaunchCalendar({ rows, month, setMonth }: { rows:any[]; month:Date; setMonth:(d:Date)=>void }) {
  const year=month.getFullYear(); const m=month.getMonth(); const first=new Date(year,m,1); const days=new Date(year,m+1,0).getDate(); const start=(first.getDay()+6)%7;
  const cells:Array<string|null>=Array(start).fill(null).concat(Array.from({length:days},(_,i)=>year+'-'+String(m+1).padStart(2,'0')+'-'+String(i+1).padStart(2,'0')));
  while(cells.length%7)cells.push(null);
  return <div><div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><button onClick={()=>setMonth(new Date(year,m-1,1))} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"><ArrowLeft className="w-4 h-4"/></button><p className="font-bold capitalize">{month.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</p><button onClick={()=>setMonth(new Date(year,m+1,1))} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"><ArrowRight className="w-4 h-4"/></button></div></div>
    <div className="grid grid-cols-7 text-[10px] uppercase tracking-wide text-slate-400 mb-1">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(x=><div key={x} className="p-2 text-center">{x}</div>)}</div>
    <div className="grid grid-cols-7 border-l border-t border-slate-200">{cells.map((day,i)=><div key={i} className="min-h-24 border-r border-b border-slate-200 p-2 bg-white">{day&&<><p className="text-[10px] font-semibold text-slate-400">{Number(day.slice(-2))}</p><div className="space-y-1 mt-1">{rows.filter(x=>x.date_start<=day&&x.date_end>=day).slice(0,3).map(x=><div key={x.id} className="rounded-lg bg-red-50 text-red-700 px-2 py-1 text-[10px] font-semibold truncate" title={x.name}>{x.name}</div>)}</div></>}</div>)}</div>
  </div>;
}

export function LaunchesPage() {
  const {user}=useAuth(); const [rows,setRows]=useState<any[]>([]); const [posts,setPosts]=useState<any[]>([]); const [campaigns,setCampaigns]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [modal,setModal]=useState(false); const [month,setMonth]=useState(new Date()); const [form,setForm]=useState<any>({phase:'pré',date_start:dateKey(),date_end:dateKey()}); const [postIds,setPostIds]=useState<string[]>([]); const [campaignIds,setCampaignIds]=useState<string[]>([]);
  async function load(){if(!user)return;const [l,p,c]=await Promise.all([supabase.from('launches').select('*').eq('user_id',user.id).order('date_start',{ascending:false}),supabase.from('microblog_posts').select('id,title,content,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30),supabase.from('campaigns').select('id,subject,status,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(30)]);const err=[l,p,c].find(x=>x.error)?.error;if(err)setError(err.message);setRows(l.data||[]);setPosts(p.data||[]);setCampaigns(c.data||[]);setLoading(false)}
  useEffect(()=>{void load()},[user?.id]);
  async function save(){if(!user||!form.name?.trim())return;const {data,error:e}=await supabase.from('launches').insert({user_id:user.id,name:form.name.trim(),product:form.product||'',date_start:form.date_start,date_end:form.date_end,phase:form.phase,target_revenue:Number(form.target_revenue||0),real_result:Number(form.real_result||0)}).select().single();if(e||!data)return setError(e?.message||'Não foi possível criar o lançamento.');const links=[...postIds.map(id=>({user_id:user.id,launch_id:data.id,content_type:'post',post_id:id,campaign_id:null})),...campaignIds.map(id=>({user_id:user.id,launch_id:data.id,content_type:'newsletter',post_id:null,campaign_id:id}))];if(links.length){const {error:le}=await supabase.from('launch_content_links').insert(links);if(le)setError(le.message)}setRows(v=>[data,...v]);setModal(false);setPostIds([]);setCampaignIds([]);setForm({phase:'pré',date_start:dateKey(),date_end:dateKey()})}
  async function updatePhase(id:string,phase:string){const {error:e}=await supabase.from('launches').update({phase,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user!.id);if(e)setError(e.message);else setRows(v=>v.map(x=>x.id===id?{...x,phase}:x))}
  async function remove(id:string){if(!window.confirm('Excluir este lançamento?'))return;const {error:e}=await supabase.from('launches').delete().eq('id',id).eq('user_id',user!.id);if(e)setError(e.message);else setRows(v=>v.filter(x=>x.id!==id))}
  if(loading)return <Spinner/>;
  const phases=['pré','lançamento','pós'];
  return <div className="p-5 lg:p-8 max-w-7xl mx-auto"><PageHeader title="Lançamentos" subtitle="Planeje campanhas por fase, conteúdo e meta de receita." action={<Button tone="red" onClick={()=>setModal(true)}><Plus className="w-4 h-4"/> Novo lançamento</Button>}/><ErrorNotice message={error} onClose={()=>setError('')}/>
    <Card className="p-5 mb-5"><Section title="Kanban de lançamento" subtitle="Mova cada lançamento entre pré, lançamento e pós." icon={Layers3} tone="red"/><div className="grid lg:grid-cols-3 gap-3">{phases.map(phase=><div key={phase} className="rounded-2xl bg-slate-50 p-3 min-h-64"><div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{phase}</h3><span className="text-[10px] text-slate-400">{rows.filter(x=>x.phase===phase).length}</span></div><div className="space-y-2">{rows.filter(x=>x.phase===phase).map(x=><div key={x.id} className="bg-white border border-slate-200 rounded-xl p-3"><div className="flex justify-between gap-2"><div><p className="font-semibold text-sm">{x.name}</p><p className="text-[11px] text-slate-400">{x.product||'Produto não informado'}</p></div><button onClick={()=>void remove(x.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></div><div className="flex items-center justify-between mt-3"><span className="text-[11px] text-slate-500">{formatDate(x.date_start)} → {formatDate(x.date_end)}</span><span className="text-xs font-bold">{money(x.real_result)}</span></div><select value={x.phase} onChange={e=>void updatePhase(x.id,e.target.value)} className="mt-2 w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white">{phases.map(p=><option key={p}>{p}</option>)}</select></div>)}</div></div>)}</div></Card>
    <Card className="p-5"><Section title="Calendário" subtitle="Visualize a janela de cada lançamento e sobreposição de campanhas." icon={CalendarDays} tone="red"/><LaunchCalendar rows={rows} month={month} setMonth={setMonth}/></Card>
    {modal&&<Modal title="Novo lançamento" subtitle="Vincule posts e campanhas de newsletter já existentes." onClose={()=>setModal(false)}><div className="grid sm:grid-cols-2 gap-3"><Field label="Nome" value={form.name||''} onChange={v=>setForm({...form,name:v})}/><Field label="Produto" value={form.product||''} onChange={v=>setForm({...form,product:v})}/><Field label="Data início" value={form.date_start||dateKey()} onChange={v=>setForm({...form,date_start:v})} type="date"/><Field label="Data fim" value={form.date_end||dateKey()} onChange={v=>setForm({...form,date_end:v})} type="date"/><SelectField label="Fase" value={form.phase||'pré'} onChange={v=>setForm({...form,phase:v})} options={['pré','lançamento','pós']}/><Field label="Meta de receita" value={form.target_revenue||0} onChange={v=>setForm({...form,target_revenue:v})} type="number" step="0.01"/><Field label="Resultado real" value={form.real_result||0} onChange={v=>setForm({...form,real_result:v})} type="number" step="0.01"/></div>
      <div className="mt-5 grid md:grid-cols-2 gap-4"><div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold text-slate-700 mb-3">Posts vinculados</p>{posts.slice(0,12).map(p=><label key={p.id} className="flex items-center gap-2 py-1.5 text-xs text-slate-600"><input type="checkbox" checked={postIds.includes(p.id)} onChange={e=>setPostIds(v=>e.target.checked?[...v,p.id]:v.filter(id=>id!==p.id))}/><span className="truncate">{p.title||p.content?.slice(0,50)||'Post'}</span></label>)}</div>
      <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold text-slate-700 mb-3">Newsletters vinculadas</p>{campaigns.slice(0,12).map(c=><label key={c.id} className="flex items-center gap-2 py-1.5 text-xs text-slate-600"><input type="checkbox" checked={campaignIds.includes(c.id)} onChange={e=>setCampaignIds(v=>e.target.checked?[...v,c.id]:v.filter(id=>id!==c.id))}/><span className="truncate">{c.subject}</span></label>)}</div></div>
      <div className="flex justify-end gap-2 mt-6"><Button onClick={()=>setModal(false)}>Cancelar</Button><Button tone="red" onClick={()=>void save()}>Salvar lançamento</Button></div></Modal>}
  </div>;
}

const goalModules=['Dashboard','Perfil','Links','Microblog','Newsletter','Leads','Analytics','Posts','Rascunhos','Páginas de Venda','Ofertas','Receita','Centro de Comando','GOAT','Parcerias','Lançamentos','Radar','Configurações'];

export function GoalsPage() {
  const {user}=useAuth(); const [rows,setRows]=useState<any[]>([]); const [links,setLinks]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [modal,setModal]=useState(false); const [form,setForm]=useState<any>({progress:'0'}); const [selectedModules,setSelectedModules]=useState<string[]>([]);
  async function load(){if(!user)return;const [g,l]=await Promise.all([supabase.from('goals').select('*').eq('user_id',user.id).order('deadline',{ascending:true,nullsFirst:false}),supabase.from('goal_links').select('*').eq('user_id',user.id).order('created_at',{ascending:false})]);const err=g.error||l.error;if(err)setError(err.message);setRows(g.data||[]);setLinks(l.data||[]);setLoading(false)}
  useEffect(()=>{void load()},[user?.id]);
  async function save(){if(!user||!form.objective_macro?.trim())return;const {data,error:e}=await supabase.from('goals').insert({user_id:user.id,objective_macro:form.objective_macro.trim(),key_result_1:form.key_result_1||'',key_result_2:form.key_result_2||'',key_result_3:form.key_result_3||'',progress:Number(form.progress||0),deadline:form.deadline||null,weekly_review:form.weekly_review||''}).select().single();if(e||!data)return setError(e?.message||'Não foi possível criar a meta.');if(selectedModules.length){const {error:le}=await supabase.from('goal_links').insert(selectedModules.map(module_name=>({user_id:user.id,goal_id:data.id,module_name,label:module_name})));if(le)setError(le.message)}setRows(v=>[data,...v]);setModal(false);setSelectedModules([]);setForm({progress:'0'})}
  async function updateProgress(id:string,progress:string){const value=Math.max(0,Math.min(100,Number(progress)||0));const {error:e}=await supabase.from('goals').update({progress:value,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user!.id);if(e)setError(e.message);else setRows(v=>v.map(x=>x.id===id?{...x,progress:value}:x))}
  async function remove(id:string){if(!window.confirm('Excluir esta meta?'))return;const {error:e}=await supabase.from('goals').delete().eq('id',id).eq('user_id',user!.id);if(e)setError(e.message);else setRows(v=>v.filter(x=>x.id!==id))}
  if(loading)return <Spinner/>; const avg=rows.length?rows.reduce((s,x)=>s+Number(x.progress||0),0)/rows.length:0;
  return <div className="p-5 lg:p-8 max-w-7xl mx-auto"><PageHeader title="Metas" subtitle="Transforme objetivos macro em resultados-chave revisados semanalmente." action={<Button onClick={()=>setModal(true)}><Plus className="w-4 h-4"/> Nova meta</Button>}/><ErrorNotice message={error} onClose={()=>setError('')}/><Card className="p-6 mb-5"><div className="grid md:grid-cols-3 gap-5"><div><p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">Metas ativas</p><p className="text-4xl font-black mt-2">{rows.length}</p></div><div><p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">Progresso médio</p><p className="text-4xl font-black mt-2">{avg.toFixed(0)}%</p></div><div><p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">Módulos conectados</p><p className="text-4xl font-black mt-2">{new Set(links.map(x=>x.module_name)).size}</p></div></div></Card>
    <div className="grid xl:grid-cols-2 gap-4">{rows.map(g=><Card className="p-5" key={g.id}><div className="flex justify-between gap-3"><div><p className="text-lg font-black text-slate-950">{g.objective_macro}</p><p className="text-xs text-slate-400 mt-1">{g.deadline?'Prazo: '+formatDate(g.deadline):'Sem prazo'}</p></div><button onClick={()=>void remove(g.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></div><div className="mt-5"><div className="flex justify-between text-xs mb-2"><span className="font-semibold text-slate-500">Progresso</span><span className="font-black">{Number(g.progress||0).toFixed(0)}%</span></div><ProgressBar value={Number(g.progress||0)}/><input aria-label="Progresso da meta" type="range" min="0" max="100" value={Number(g.progress||0)} onChange={e=>void updateProgress(g.id,e.target.value)} className="w-full mt-2"/></div><div className="mt-5 space-y-2">{[g.key_result_1,g.key_result_2,g.key_result_3].filter(Boolean).map((x:string,i:number)=><div key={i} className="flex gap-2 text-xs text-slate-600"><span className="w-5 h-5 rounded-full bg-slate-950 text-white flex items-center justify-center text-[9px]">{i+1}</span><span>{x}</span></div>)}</div><div className="flex flex-wrap gap-1.5 mt-5">{links.filter(x=>x.goal_id===g.id).map(x=><span key={x.id} className="text-[10px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-500">{x.module_name}</span>)}</div>{g.weekly_review&&<p className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500"><b>Revisão semanal:</b> {g.weekly_review}</p>}</Card>)}</div>
    {rows.length===0&&<Card className="p-12 text-center text-sm text-slate-400">Crie sua primeira meta macro.</Card>}
    {modal&&<Modal title="Nova meta" subtitle="Conecte a meta aos módulos que participam da execução." onClose={()=>setModal(false)}><div className="space-y-4"><Field label="Objetivo macro" value={form.objective_macro||''} onChange={v=>setForm({...form,objective_macro:v})} placeholder="Ex.: Chegar a R$ 100 mil/mês" /><div className="grid sm:grid-cols-2 gap-3"><Field label="Resultado-chave 1" value={form.key_result_1||''} onChange={v=>setForm({...form,key_result_1:v})}/><Field label="Resultado-chave 2" value={form.key_result_2||''} onChange={v=>setForm({...form,key_result_2:v})}/><Field label="Resultado-chave 3" value={form.key_result_3||''} onChange={v=>setForm({...form,key_result_3:v})}/><Field label="Progresso (%)" value={form.progress||0} onChange={v=>setForm({...form,progress:v})} type="number" min="0" max="100"/><Field label="Prazo" value={form.deadline||''} onChange={v=>setForm({...form,deadline:v})} type="date"/></div><label className="block"><span className="text-[11px] font-semibold text-slate-500">Revisão semanal</span><textarea rows={3} value={form.weekly_review||''} onChange={e=>setForm({...form,weekly_review:e.target.value})} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-4 focus:ring-slate-100" placeholder="O que será revisado toda semana?"/></label><div><p className="text-[11px] font-semibold text-slate-500 mb-2">Módulos vinculados</p><div className="grid sm:grid-cols-3 gap-2">{goalModules.map(m=><label key={m} className="flex items-center gap-2 text-xs text-slate-600 p-2 rounded-lg hover:bg-slate-50"><input type="checkbox" checked={selectedModules.includes(m)} onChange={e=>setSelectedModules(v=>e.target.checked?[...v,m]:v.filter(x=>x!==m))}/>{m}</label>)}</div></div></div><div className="flex justify-end gap-2 mt-6"><Button onClick={()=>setModal(false)}>Cancelar</Button><Button onClick={()=>void save()}>Salvar meta</Button></div></Modal>}
  </div>;
}

type RadarItem = { id:string; category:string; title:string; reason:string; source_id:string|null; source_type:'contact'|'property'; target_id:string|null; target_type:'contact'|'offer'; score:number };

function normalizeTokens(input:string){return new Set(input.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').split(/[^a-z0-9]+/).filter(x=>x.length>2));}
function overlap(a:string,b:string){const A=normalizeTokens(a);const B=normalizeTokens(b);return [...A].filter(x=>B.has(x));}

export function RadarPage() {
  const {user}=useAuth(); const [contacts,setContacts]=useState<any[]>([]); const [dossiers,setDossiers]=useState<any[]>([]); const [properties,setProperties]=useState<any[]>([]); const [offers,setOffers]=useState<any[]>([]); const [leverage,setLeverage]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [refreshing,setRefreshing]=useState(false);
  async function load(){if(!user)return;setRefreshing(true);setError('');try{const refresh=await supabase.rpc('authority_refresh_leverage',{p_user_id:user.id});if(refresh.error)throw refresh.error;const [c,d,p,o,l]=await Promise.all([supabase.from('authority_contacts').select('*').eq('user_id',user.id),supabase.from('contact_dossiers').select('*').eq('user_id',user.id),supabase.from('authority_properties').select('*').eq('user_id',user.id),supabase.from('offers').select('*').eq('user_id',user.id),supabase.from('authority_leverage').select('*').eq('user_id',user.id).order('score',{ascending:false})]);const err=[c,d,p,o,l].find(x=>x.error)?.error;if(err)throw err;setContacts(c.data||[]);setDossiers(d.data||[]);setProperties(p.data||[]);setOffers(o.data||[]);setLeverage(l.data||[])}catch(e:any){setError(e?.message||'Não foi possível executar o Radar.')}finally{setLoading(false);setRefreshing(false)}}
  useEffect(()=>{void load()},[user?.id]);
  const alerts=useMemo<RadarItem[]>(()=>{const out:RadarItem[]=[];for(const a of contacts){const wants=dossiers.find(d=>d.contact_id===a.id)?.wants||'';if(!wants)continue;for(const b of contacts){if(a.id===b.id)continue;const match=overlap(wants,b.strategic_value||'');if(match.length)out.push({id:'cc-'+a.id+'-'+b.id,category:'Contato × Contato',title:a.name+' quer '+match.slice(0,3).join(', '),reason:b.name+' possui valor estratégico relacionado: '+match.slice(0,5).join(', ')+'.',source_id:a.id,source_type:'contact',target_id:b.id,target_type:'contact',score:Math.min(100,40+match.length*15)})}}for(const p of properties){for(const o of offers){const match=overlap(String(p.tags||'')+' '+String(p.description||''),String(o.needs_audience||''));if(match.length)out.push({id:'po-'+p.id+'-'+o.id,category:'Audiência × Oferta',title:p.name+' pode alimentar '+o.name,reason:'Sinais de audiência/descrição em comum: '+match.slice(0,5).join(', ')+'.',source_id:p.id,source_type:'property',target_id:o.id,target_type:'offer',score:Math.min(100,45+match.length*12)})}}return out.sort((a,b)=>b.score-a.score)},[contacts,dossiers,properties,offers]);
  const top=useMemo(()=>leverage.slice(0,10).map((x,i)=>{const c=contacts.find(v=>v.id===x.entity_id);const p=properties.find(v=>v.id===x.entity_id);return {...x,rank:i+1,name:c?.name||p?.name||'Nó',type:c?'Contato':'Propriedade'}}),[leverage,contacts,properties]);
  async function createTask(item:RadarItem){if(!user||!item.source_id)return;const {error:e}=await supabase.from('authority_tasks').insert({user_id:user.id,title:'Radar: '+item.title,entity_id:item.source_id,entity_type:item.source_type,task_type:item.source_type==='contact'?'Contatar':'Analisar',priority:item.score>=75?'Alta':'Média',due_date:dateKey(),status:'Aberta'});if(e)setError(e.message);else setError('')}
  if(loading)return <Spinner/>;
  return <div className="p-5 lg:p-8 max-w-7xl mx-auto"><PageHeader title="Radar" subtitle="Cruza seus dados para encontrar conexões acionáveis e atualizar o score de alavancagem." action={<Button onClick={()=>void load()} disabled={refreshing}><RadarIcon className={'w-4 h-4 '+(refreshing?'animate-spin':'')}/> {refreshing?'Atualizando...':'Atualizar radar'}</Button>}/><ErrorNotice message={error} onClose={()=>setError('')}/><div className="grid md:grid-cols-3 gap-4 mb-5"><Card className="p-5"><p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">Alertas encontrados</p><p className="text-4xl font-black mt-2">{alerts.length}</p></Card><Card className="p-5"><p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">Nós avaliados</p><p className="text-4xl font-black mt-2">{leverage.length}</p></Card><Card className="p-5"><p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">Conexões potenciais</p><p className="text-4xl font-black mt-2">{alerts.filter(x=>x.category==='Contato × Contato').length}</p></Card></div>
    <div className="grid xl:grid-cols-[1.4fr_.6fr] gap-5"><Card className="p-5"><Section title="Alertas automáticos" subtitle="Contato A × Contato B e Audiência × Oferta." icon={Zap} tone="red"/><div className="space-y-3">{alerts.length===0?<div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-400">Nenhum cruzamento encontrado com os dados atuais.</div>:alerts.map(x=><div key={x.id} className="rounded-2xl border border-slate-200 p-4 bg-white"><div className="flex items-start gap-3"><div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0"><Zap className="w-4 h-4"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] uppercase tracking-wide font-bold text-red-600">{x.category}</span><span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">Score {x.score}</span></div><p className="text-sm font-bold text-slate-800 mt-1">{x.title}</p><p className="text-xs text-slate-500 mt-1 leading-5">{x.reason}</p><button onClick={()=>void createTask(x)} className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950 text-white text-xs font-semibold"><Check className="w-3.5 h-3.5"/> Criar tarefa</button></div></div></div>)}</div></Card>
      <Card className="p-5"><Section title="Nós por potencial" subtitle="Ranking baseado no score de alavancagem atualizado agora." icon={TrendingUp} tone="red"/><div className="space-y-3">{top.map(x=><div key={x.id} className="flex items-center gap-3"><span className="w-6 text-xs text-slate-400">{x.rank}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{x.name}</p><p className="text-[10px] text-slate-400">{x.type} · {Number(x.score||0).toFixed(0)} pontos</p><ProgressBar value={Number(x.score||0)} tone="red"/></div></div>)}{top.length===0&&<p className="text-sm text-slate-400">Crie propriedades, contatos e conexões no Centro de Comando.</p>}</div></Card></div>
  </div>;
}
