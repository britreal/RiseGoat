import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadUserImage } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { Card, PageHeader, Spinner } from '@/components/ui';
import { Activity, Check, Plus, Trash2, X, Upload } from 'lucide-react';

const cats = ['Mente', 'Físico', 'Espiritual', 'Trabalho', 'Relacionamentos', 'Outro'];
const dayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const offsetDate = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return dayKey(d); };
const goatScore = (m: any) => {
  if (!m) return 0;
  const values = [
    m.sleep_hours == null ? null : Math.min(100, Number(m.sleep_hours) / 8 * 100),
    m.training_minutes == null ? null : Math.min(100, Number(m.training_minutes) / 60 * 100),
    m.nutrition_score, m.energy_score, m.focus_score, m.spiritual_score,
  ].filter((x): x is number => x !== null && Number.isFinite(Number(x)));
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
};
const scorePeriod = (metrics: any[], from: string, to: string) => {
  const rows = metrics.filter(m => m.recorded_on >= from && m.recorded_on <= to);
  return rows.length ? Math.round(rows.reduce((sum, m) => sum + goatScore(m), 0) / rows.length) : 0;
};

export function GoatPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Hoje');
  const [habits, setHabits] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [audio, setAudio] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [modal, setModal] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bulkText, setBulkText] = useState('');

  const today = dayKey();
  const last7 = offsetDate(-6);
  const monthStart = `${today.slice(0, 7)}-01`;
  const yearStart = `${today.slice(0, 4)}-01-01`;

  async function load() {
    if (!user) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [h, l, b, a, m] = await Promise.all([
        supabase.from('goat_habits').select('*').eq('user_id', user.id).eq('is_active', true).order('sort_order'),
        supabase.from('goat_habit_logs').select('*').eq('user_id', user.id).gte('completed_on', yearStart),
        supabase.from('goat_books').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('goat_audiobooks').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('goat_body_metrics').select('*').eq('user_id', user.id).order('recorded_on', { ascending: true }),
      ]);
      const firstError = [h, l, b, a, m].find(x => x.error)?.error;
      if (firstError) throw firstError;
      setHabits(h.data || []); setLogs(l.data || []); setBooks(b.data || []);
      setAudio(a.data || []); setMetrics(m.data || []);
    } catch (e: any) { setError(e?.message || 'Não foi possível carregar o GOAT.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [user?.id]);

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') resetModal(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modal]);

  async function toggle(h: any) {
    if (!user) return;
    const completed = logs.some(x => x.habit_id === h.id && x.completed_on === today);
    const result = completed
      ? await supabase.from('goat_habit_logs').delete().eq('user_id', user.id).eq('habit_id', h.id).eq('completed_on', today)
      : await supabase.from('goat_habit_logs').insert({ user_id: user.id, habit_id: h.id, completed_on: today, duration_minutes: h.duration_minutes });
    if (result.error) setError(result.error.message);
    await load();
  }

  function resetModal() {
    setModal(''); setForm({}); setSelectedFile(null); setBulkText('');
  }

  async function add() {
    if (!user) return;
    try {
      let imageUrl = form.image_url || '';
      if (selectedFile) imageUrl = await uploadUserImage(user.id, selectedFile, modal === 'habit' ? 'goat-habits' : 'goat-library');

      let result: any;
      if (modal === 'metric') {
        result = await supabase.from('goat_body_metrics').upsert({
          user_id: user.id, recorded_on: form.recorded_on || today,
          weight_kg: form.weight_kg === '' ? null : Number(form.weight_kg) || null,
          body_fat_pct: form.body_fat_pct === '' ? null : Number(form.body_fat_pct) || null,
          waist_cm: form.waist_cm === '' ? null : Number(form.waist_cm) || null,
          chest_cm: form.chest_cm === '' ? null : Number(form.chest_cm) || null,
          arm_cm: form.arm_cm === '' ? null : Number(form.arm_cm) || null,
          leg_cm: form.leg_cm === '' ? null : Number(form.leg_cm) || null,
          sleep_hours: form.sleep_hours === '' ? null : Number(form.sleep_hours) || null,
          training_minutes: form.training_minutes === '' ? null : Number(form.training_minutes) || null,
          nutrition_score: form.nutrition_score === '' ? null : Number(form.nutrition_score) || null,
          energy_score: form.energy_score === '' ? null : Number(form.energy_score) || null,
          focus_score: form.focus_score === '' ? null : Number(form.focus_score) || null,
          spiritual_score: form.spiritual_score === '' ? null : Number(form.spiritual_score) || null,
          notes: form.notes || null,
        }, { onConflict: 'user_id,recorded_on' });
      } else if (modal === 'habit') {
        result = await supabase.from('goat_habits').insert({
          user_id: user.id, name: form.name, image_url: imageUrl,
          duration_minutes: Number(form.duration || 15), category: form.category || 'Mente', sort_order: habits.length
        });
      } else {
        const lines = bulkText.split('\n').map(x => x.trim()).filter(Boolean);
        if (!lines.length) throw new Error('Adicione pelo menos um item.');
        const table = modal === 'book' ? 'goat_books' : 'goat_audiobooks';
        const status = form.status || (modal === 'book' ? 'Ainda vou ler' : 'Ainda vou ouvir');
        const rows = lines.map(line => {
          const [title, ...authorParts] = line.split('|');
          return { user_id: user.id, title: title.trim(), author: authorParts.join('|').trim(), image_url: imageUrl, status, progress: 0 };
        }).filter(x => x.title);
        result = await supabase.from(table).insert(rows);
      }
      if (result?.error) throw result.error;
      resetModal();
      await load();
    } catch (e: any) { setError(e?.message || 'Não foi possível salvar.'); }
  }

  async function del(table: string, id: string) {
    if (!user) return;
    const result = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id);
    if (result.error) setError(result.error.message);
    await load();
  }

  const done = (h: any) => logs.some(x => x.habit_id === h.id && x.completed_on === today);
  const daily = useMemo(() => scorePeriod(metrics, today, today), [metrics, today]);
  const weekly = useMemo(() => scorePeriod(metrics, last7, today), [metrics, last7, today]);
  const monthly = useMemo(() => scorePeriod(metrics, monthStart, today), [metrics, monthStart, today]);
  const counts = [
    ['Semanal', logs.filter(x => x.completed_on >= last7 && x.completed_on <= today).length],
    ['Mensal', logs.filter(x => x.completed_on >= monthStart && x.completed_on <= today).length],
    ['Anual', logs.filter(x => x.completed_on >= yearStart && x.completed_on <= today).length],
  ];

  if (loading) return <Spinner />;

  return <div className='p-6 lg:p-8 max-w-7xl mx-auto'>
    <PageHeader title='GOAT' subtitle='Physicamente. Mentalmente. Espiritualmente.' action={<div className='flex gap-1'>{['Hoje', 'Tracking', 'Livros', 'Audiobooks'].map(x => <button key={x} onClick={() => setTab(x)} className={`px-3 py-2 rounded-lg text-xs ${tab === x ? 'bg-slate-900 text-white' : 'bg-white border'}`}>{x}</button>)}</div>} />
    {error && <div className='mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 p-3 text-sm'>{error}</div>}

    {tab === 'Hoje' && <Card className='p-5'>
      <div className='flex justify-between mb-5'><div><h2 className='font-semibold'>Hábitos de hoje</h2><p className='text-xs text-slate-400'>{logs.filter(x => x.completed_on === today).length} concluídos</p></div><button onClick={() => { setForm({ category: 'Mente', duration: 15 }); setModal('habit'); }} className='bg-slate-900 text-white px-3 py-2 rounded-lg text-sm'><Plus className='w-4 inline' /> Novo</button></div>
      {habits.length === 0 ? <p className='text-sm text-slate-400'>Nenhum hábito cadastrado. Crie o primeiro.</p> : <div className='grid md:grid-cols-2 gap-3'>{habits.map(h => <div key={h.id} className='border rounded-xl p-3 flex items-center gap-3'><div className='w-12 h-12 rounded-lg bg-slate-100 overflow-hidden'>{h.image_url ? <img src={h.image_url} className='w-full h-full object-cover' /> : <Activity className='m-3 text-slate-400' />}</div><div className='flex-1'><b>{h.name}</b><p className='text-xs text-slate-400'>{h.category} · {h.duration_minutes} min</p></div><button onClick={() => void toggle(h)} className={`w-9 h-9 rounded-full border ${done(h) ? 'bg-emerald-500 text-white' : ''}`}><Check /></button><button onClick={() => void del('goat_habits', h.id)}><Trash2 className='w-4 text-slate-300' /></button></div>)}</div>}
    </Card>}

    {tab === 'Tracking' && <div className='space-y-5'>
      <Card className='p-5'><h2 className='font-semibold mb-4'>Mapa de calor — 365 dias</h2><div className='flex flex-wrap gap-1'>{Array.from({ length: 365 }, (_, i) => { const k = offsetDate(i - 364); const n = logs.filter(x => x.completed_on === k).length; return <div key={k} title={`${k}: ${n} check-ins`} className={`w-3 h-3 rounded-sm ${n ? 'bg-emerald-500' : 'bg-slate-100'}`} />; })}</div></Card>
      <Card className='p-5'><h2 className='font-semibold mb-4'>Tracking semanal · mensal · anual</h2><div className='grid md:grid-cols-3 gap-4'>{counts.map(([name, count]) => <div className='border rounded-xl p-4' key={name}><b>{name}</b><p className='text-3xl mt-3'>{count}</p><span className='text-xs text-slate-400'>check-ins registrados</span></div>)}</div></Card>
      <Card className='p-5'><div className='flex justify-between items-center mb-4'><h2 className='font-semibold'>GOAT Body Analytics</h2><button onClick={() => { setForm({ recorded_on: today }); setModal('metric'); }} className='bg-slate-900 text-white px-3 py-2 rounded-lg text-sm'>Registrar evolução</button></div>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-5'>{[['Peso', 'weight_kg', 'kg'], ['Gordura', 'body_fat_pct', '%'], ['Cintura', 'waist_cm', 'cm'], ['Peito', 'chest_cm', 'cm'], ['Braço', 'arm_cm', 'cm'], ['Perna', 'leg_cm', 'cm'], ['Sono', 'sleep_hours', 'h'], ['Treino', 'training_minutes', 'min']].map(([label, key, unit]) => { const latest = metrics.length ? metrics[metrics.length - 1] : null; return <div className='border rounded-xl p-3' key={key}><p className='text-xs text-slate-400'>{label}</p><b className='text-xl'>{latest?.[key] ?? '—'}{latest?.[key] != null ? unit : ''}</b></div>; })}</div>
        <div className='grid grid-cols-3 gap-3 mb-5'>{[['Hoje', daily], ['7 dias', weekly], ['Mês', monthly]].map(([label, value]) => <div className='border rounded-xl p-4' key={label}><p className='text-xs text-slate-400'>GOAT Score {label}</p><b className='text-3xl'>{value || '—'}{value ? '/100' : ''}</b></div>)}</div>
        <div className='grid md:grid-cols-2 items-center'><svg viewBox='0 0 180 360' className='h-80 mx-auto'><circle cx='90' cy='32' r='25' fill='none' stroke='currentColor' strokeWidth='3' /><path d='M90 57C65 58 58 82 60 115L65 180 45 250 55 345M90 57C115 58 122 82 120 115L115 180 135 250 125 345M30 115L65 180M150 115L115 180M65 180H115M78 345L90 180 102 345' fill='none' stroke='currentColor' strokeWidth='5' /><text x='90' y='95' textAnchor='middle' fontSize='9'>MENTE</text><text x='90' y='150' textAnchor='middle' fontSize='9'>FÍSICO</text><text x='90' y='220' textAnchor='middle' fontSize='9'>CORE</text></svg><div>{cats.map(c => <div key={c} className='py-2 border-b text-sm flex justify-between'><span>{c}</span><span>{habits.filter(h => h.category === c).filter(done).length}/{habits.filter(h => h.category === c).length}</span></div>)}</div></div>
      </Card>
    </div>}

    {(tab === 'Livros' || tab === 'Audiobooks') && <Library items={tab === 'Livros' ? books : audio} audio={tab === 'Audiobooks'} add={() => { setForm({ status: tab === 'Livros' ? 'Ainda vou ler' : 'Ainda vou ouvir' }); setBulkText(''); setSelectedFile(null); setModal(tab === 'Livros' ? 'book' : 'audio'); }} del={del} />}

    {modal && <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onMouseDown={e => { if (e.target === e.currentTarget) resetModal(); }}>
      <Card className='relative p-6 pt-14 w-full max-w-md max-h-[90vh] overflow-y-auto'>
        <button type='button' aria-label='Fechar popup' title='Fechar popup' onClick={resetModal} className='absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-900 shadow-md hover:bg-slate-100 hover:text-black focus:outline-none focus:ring-2 focus:ring-slate-400' ><X className='w-6 h-6' strokeWidth={3} /></button>
        <h2 className='font-bold mb-4 pr-8'>{modal === 'metric' ? 'Registrar evolução' : modal === 'habit' ? 'Novo hábito' : modal === 'book' ? 'Adicionar livros' : 'Adicionar audiobooks'}</h2>
        {modal === 'metric' ? <>
          <input type='date' className='w-full border p-2 rounded mb-2' value={form.recorded_on || today} onChange={e => setForm({ ...form, recorded_on: e.target.value })} />
          {[['weight_kg','Peso (kg)'],['body_fat_pct','Gordura corporal (%)'],['waist_cm','Cintura (cm)'],['chest_cm','Peito (cm)'],['arm_cm','Braço (cm)'],['leg_cm','Perna (cm)'],['sleep_hours','Sono (horas)'],['training_minutes','Treino (minutos)']].map(([key, placeholder]) => <input key={key} type='number' step='0.1' className='w-full border p-2 rounded mb-2' placeholder={placeholder} value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />)}
          <div className='grid grid-cols-2 gap-2'>{[['nutrition_score','Nutrição'],['energy_score','Energia'],['focus_score','Foco'],['spiritual_score','Espiritual']].map(([key, placeholder]) => <input key={key} type='number' min='0' max='100' className='border p-2 rounded' placeholder={`${placeholder} (0-100)`} value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />)}</div>
          <textarea className='w-full border p-2 rounded mt-2' rows={4} placeholder='Observações' value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </> : modal === 'habit' ? <>
          <input className='w-full border p-2 rounded mb-2' placeholder='Nome' value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
          <label className='flex items-center gap-2 border rounded-lg p-3 mb-2 cursor-pointer hover:bg-slate-50'><Upload className='w-4 h-4' /><span className='text-sm flex-1'>{selectedFile ? selectedFile.name : 'Escolher imagem do PC ou celular'}</span><input type='file' accept='image/*' className='hidden' onChange={e => setSelectedFile(e.target.files?.[0] || null)} /></label>
          <input className='w-full border p-2 rounded mb-2' type='number' min='1' max='1440' placeholder='Minutos' value={form.duration || 15} onChange={e => setForm({ ...form, duration: e.target.value })} />
          <select className='w-full border p-2 rounded' value={form.category || 'Mente'} onChange={e => setForm({ ...form, category: e.target.value })}>{cats.map(c => <option key={c}>{c}</option>)}</select>
        </> : <>
          <textarea rows={9} className='w-full border p-3 rounded-lg mb-2 resize-y' placeholder={'Um item por linha.\nFormato opcional: Título | Autor\nExemplo:\nO Príncipe | Nicolau Maquiavel\nAtomic Habits | James Clear'} value={bulkText} onChange={e => setBulkText(e.target.value)} />
          <label className='flex items-center gap-2 border rounded-lg p-3 mb-2 cursor-pointer hover:bg-slate-50'><Upload className='w-4 h-4' /><span className='text-sm flex-1'>{selectedFile ? selectedFile.name : 'Capa opcional — escolher do PC ou celular'}</span><input type='file' accept='image/*' className='hidden' onChange={e => setSelectedFile(e.target.files?.[0] || null)} /></label>
          <select className='w-full border p-2 rounded' value={form.status || ''} onChange={e => setForm({ ...form, status: e.target.value })}>{(modal === 'book' ? ['Lendo', 'Ainda vou ler', 'Completo'] : ['Ouvindo', 'Ainda vou ouvir', 'Completo']).map(s => <option key={s}>{s}</option>)}</select>
          <p className='text-xs text-slate-400 mt-2'>Sem porcentagem: o acompanhamento é feito pelo status.</p>
        </>}
        <button onClick={() => void add()} className='w-full mt-4 bg-slate-900 text-white p-2.5 rounded-lg'>Salvar</button>
      </Card>
    </div>}
  </div>;
}

function Library({ items, audio, add, del }: { items: any[]; audio: boolean; add: () => void; del: (table: string, id: string) => void }) {
  const statuses = audio ? ['Ouvindo', 'Ainda vou ouvir', 'Completo'] : ['Lendo', 'Ainda vou ler', 'Completo'];
  return <div className='space-y-4'>
    <button onClick={add} className='bg-slate-900 text-white px-3 py-2 rounded-lg'><Plus className='w-4 inline' /> Adicionar</button>
    {statuses.map(status => <Card className='p-5' key={status}><h2 className='font-semibold mb-3'>{status}</h2><div className='grid md:grid-cols-3 gap-3'>
      {items.filter(x => x.status === status).map(x => <div className='border rounded-xl p-3 flex gap-3' key={x.id}><div className='w-14 h-16 bg-slate-100 rounded overflow-hidden'>{x.image_url && <img src={x.image_url} className='w-full h-full object-cover' />}</div><div className='flex-1'><b className='text-sm'>{x.title}</b><p className='text-xs text-slate-400'>{x.author}</p><p className='text-xs mt-2'>{status}</p></div><button aria-label='Excluir' onClick={() => void del(audio ? 'goat_audiobooks' : 'goat_books', x.id)}><Trash2 className='w-4' /></button></div>)}
    </div></Card>)}
  </div>;
}
