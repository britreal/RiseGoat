import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadUserImage } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { Card, PageHeader, Spinner } from '@/components/ui';
import {
  Activity, BookOpen, Brain, CalendarDays, Check, ChevronRight, Clock3,
  Dumbbell, Flame, Headphones, Heart, Moon, Plus, Sparkles, Target,
  Trash2, TrendingUp, Upload, X, Zap,
} from 'lucide-react';

const cats = ['Mente', 'Físico', 'Espiritual', 'Trabalho', 'Relacionamentos', 'Outro'];

const tabMeta = [
  { id: 'Hoje', label: 'Hoje', icon: CalendarDays },
  { id: 'Tracking', label: 'Tracking', icon: TrendingUp },
  { id: 'Livros', label: 'Livros', icon: BookOpen },
  { id: 'Audiobooks', label: 'Audiobooks', icon: Headphones },
];

const categoryMeta: Record<string, { icon: typeof Brain; tone: string }> = {
  Mente: { icon: Brain, tone: 'bg-violet-50 text-violet-700 border-violet-100' },
  Físico: { icon: Dumbbell, tone: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  Espiritual: { icon: Sparkles, tone: 'bg-amber-50 text-amber-700 border-amber-100' },
  Trabalho: { icon: Target, tone: 'bg-blue-50 text-blue-700 border-blue-100' },
  Relacionamentos: { icon: Heart, tone: 'bg-rose-50 text-rose-700 border-rose-100' },
  Outro: { icon: Zap, tone: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const dayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const offsetDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dayKey(d);
};

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

function ScoreRing({ value, size = 118 }: { value: number; size?: number }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div
      className="relative shrink-0 rounded-full p-1"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(#0f172a ${safe * 3.6}deg, #e2e8f0 0deg)`,
      }}
    >
      <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
        <span className="text-3xl font-black tracking-tight text-slate-950">{safe || '—'}</span>
        {safe > 0 && <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">score</span>}
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow, title, subtitle, action,
}: {
  eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
      <div>
        {eyebrow && <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400 mb-1">{eyebrow}</p>}
        <h2 className="text-base font-bold text-slate-950 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function PrimaryButton({ children, onClick, type = 'button' }: { children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 text-white text-sm font-semibold shadow-sm hover:bg-slate-800 active:scale-[0.99] transition"
    >
      {children}
    </button>
  );
}

function Field({
  label, value, onChange, placeholder, type = 'text', min, max, step,
}: {
  label: string; value: string | number; onChange: (value: string) => void;
  placeholder?: string; type?: string; min?: string; max?: string; step?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">{label}</span>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-300 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition"
      />
    </label>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (value: string) => void; options: string[];
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition"
      >
        {options.map(option => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

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
    setLoading(true);
    setError('');
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
      setHabits(h.data || []);
      setLogs(l.data || []);
      setBooks(b.data || []);
      setAudio(a.data || []);
      setMetrics(m.data || []);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar o GOAT.');
    } finally {
      setLoading(false);
    }
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
      : await supabase.from('goat_habit_logs').insert({
        user_id: user.id, habit_id: h.id, completed_on: today, duration_minutes: h.duration_minutes,
      });
    if (result.error) setError(result.error.message);
    await load();
  }

  function resetModal() {
    setModal('');
    setForm({});
    setSelectedFile(null);
    setBulkText('');
  }

  async function add() {
    if (!user) return;
    try {
      let imageUrl = form.image_url || '';
      if (selectedFile) {
        imageUrl = await uploadUserImage(
          user.id,
          selectedFile,
          modal === 'habit' ? 'goat-habits' : 'goat-library',
        );
      }

      let result: any;
      if (modal === 'metric') {
        result = await supabase.from('goat_body_metrics').upsert({
          user_id: user.id,
          recorded_on: form.recorded_on || today,
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
          user_id: user.id,
          name: form.name,
          image_url: imageUrl,
          duration_minutes: Number(form.duration || 15),
          category: form.category || 'Mente',
          sort_order: habits.length,
        });
      } else {
        const lines = bulkText.split('\n').map(x => x.trim()).filter(Boolean);
        if (!lines.length) throw new Error('Adicione pelo menos um item.');
        const table = modal === 'book' ? 'goat_books' : 'goat_audiobooks';
        const status = form.status || (modal === 'book' ? 'Ainda vou ler' : 'Ainda vou ouvir');
        const rows = lines
          .map(line => {
            const [title, ...authorParts] = line.split('|');
            return {
              user_id: user.id,
              title: title.trim(),
              author: authorParts.join('|').trim(),
              image_url: imageUrl,
              status,
              progress: 0,
            };
          })
          .filter(x => x.title);
        result = await supabase.from(table).insert(rows);
      }

      if (result?.error) throw result.error;
      resetModal();
      await load();
    } catch (e: any) {
      setError(e?.message || 'Não foi possível salvar.');
    }
  }

  async function del(table: string, id: string) {
    if (!user) return;
    const accepted = window.confirm('Excluir este item? Essa ação não pode ser desfeita.');
    if (!accepted) return;
    const result = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id);
    if (result.error) setError(result.error.message);
    await load();
  }

  const done = (h: any) => logs.some(x => x.habit_id === h.id && x.completed_on === today);
  const completedToday = habits.filter(done).length;
  const daily = useMemo(() => scorePeriod(metrics, today, today), [metrics, today]);
  const weekly = useMemo(() => scorePeriod(metrics, last7, today), [metrics, last7, today]);
  const monthly = useMemo(() => scorePeriod(metrics, monthStart, today), [metrics, monthStart, today]);

  const logCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const log of logs) map[log.completed_on] = (map[log.completed_on] || 0) + 1;
    return map;
  }, [logs]);

  const counts = useMemo(() => [
    ['Semanal', logs.filter(x => x.completed_on >= last7 && x.completed_on <= today).length],
    ['Mensal', logs.filter(x => x.completed_on >= monthStart && x.completed_on <= today).length],
    ['Anual', logs.filter(x => x.completed_on >= yearStart && x.completed_on <= today).length],
  ], [logs, last7, today, monthStart, yearStart]);

  const categoryStats = useMemo(() => cats.map(category => {
    const items = habits.filter(h => h.category === category);
    const completed = items.filter(done).length;
    return { category, total: items.length, completed };
  }), [habits, logs]);

  const latest = metrics.length ? metrics[metrics.length - 1] : null;
  const totalHabits = habits.length;
  const completionPct = totalHabits ? Math.round((completedToday / totalHabits) * 100) : 0;
  const currentMainScore = daily || weekly || monthly || 0;

  const openModal = (name: string, initial: any = {}) => {
    setForm(initial);
    setBulkText('');
    setSelectedFile(null);
    setModal(name);
  };

  const currentTab = tabMeta.find(item => item.id === tab) || tabMeta[0];
  const TabIcon = currentTab.icon;

  if (loading) return <Spinner />;

  return (
    <div className="min-h-full bg-slate-50/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-8">
        <PageHeader
          title="GOAT"
          subtitle="Physicamente. Mentalmente. Espiritualmente."
          action={
            <div className="inline-flex p-1 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-x-auto max-w-full">
              {tabMeta.map(item => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition ${
                      active ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          }
        />

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => setError('')} aria-label="Fechar aviso" className="p-1.5 rounded-lg hover:bg-red-100"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="grid xl:grid-cols-[1.45fr_0.55fr] gap-5 mb-5">
          <Card className="overflow-hidden border-slate-200">
            <div className="relative p-6 sm:p-7 bg-slate-950 text-white">
              <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute right-20 -bottom-20 w-44 h-44 rounded-full bg-cyan-300/10 blur-3xl" />
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                    <Flame className="w-3.5 h-3.5" />
                    GOAT mode
                  </div>
                  <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight">Construa seu padrão.</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300 max-w-xl">
                    Pequenas ações repetidas todos os dias viram evidência. Use esta página para transformar intenção em execução.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-5">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-slate-200">
                      <Check className="w-3.5 h-3.5" /> {completedToday}/{totalHabits} hoje
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-slate-200">
                      <Clock3 className="w-3.5 h-3.5" /> {habits.reduce((sum, h) => sum + Number(h.duration_minutes || 0), 0)} min planejados
                    </span>
                  </div>
                </div>
                <ScoreRing value={currentMainScore} />
              </div>
            </div>
          </Card>

          <Card className="p-5 flex flex-col justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Progresso de hoje</p>
              <div className="flex items-end justify-between mt-3 gap-3">
                <div>
                  <p className="text-4xl font-black tracking-tight text-slate-950">{completionPct}%</p>
                  <p className="text-xs text-slate-400 mt-1">dos hábitos concluídos</p>
                </div>
                <div className="w-16 h-16 rounded-full border-[6px] border-slate-100 flex items-center justify-center relative">
                  <div className="absolute inset-[-6px] rounded-full" style={{ background: `conic-gradient(#0f172a ${completionPct * 3.6}deg, transparent 0deg)`, mask: 'radial-gradient(circle, transparent 53%, #000 55%)' }} />
                  <Check className="w-5 h-5 text-slate-700" />
                </div>
              </div>
            </div>
            <div className="mt-5">
              <div className="flex justify-between text-[11px] text-slate-400 mb-2">
                <span>Consistência</span><span>{completedToday} de {totalHabits}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-slate-950 transition-all" style={{ width: `${completionPct}%` }} />
              </div>
            </div>
          </Card>
        </div>

        {tab === 'Hoje' && (
          <div className="space-y-5">
            <Card className="p-5 sm:p-6">
              <SectionHeading
                eyebrow="Ritual diário"
                title="Hábitos de hoje"
                subtitle={habits.length ? 'Marque cada ação assim que ela acontecer.' : 'Comece criando o primeiro hábito.'}
                action={
                  <PrimaryButton onClick={() => openModal('habit', { category: 'Mente', duration: 15 })}>
                    <Plus className="w-4 h-4" /> Novo hábito
                  </PrimaryButton>
                }
              />
              {habits.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <Activity className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-700">Nenhum hábito cadastrado</p>
                  <p className="text-xs text-slate-400 mt-1">Crie algo pequeno, claro e repetível.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {habits.map(h => {
                    const completed = done(h);
                    const meta = categoryMeta[h.category] || categoryMeta.Outro;
                    const Icon = meta.icon;
                    return (
                      <div key={h.id} className={`group p-3 rounded-2xl border transition ${
                        completed ? 'border-slate-200 bg-slate-50/80' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-14 shrink-0 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                            {h.image_url ? (
                              <img src={h.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className={`w-full h-full flex items-center justify-center ${meta.tone.split(' ').slice(0, 2).join(' ')}`}>
                                <Icon className="w-6 h-6" />
                              </div>
                            )}
                            {completed && <div className="absolute inset-0 bg-slate-950/35 flex items-center justify-center"><Check className="w-6 h-6 text-white" strokeWidth={3} /></div>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`font-bold text-sm truncate ${completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{h.name}</p>
                              <button
                                onClick={() => void del('goat_habits', h.id)}
                                aria-label={`Excluir hábito ${h.name}`}
                                className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition opacity-70 sm:opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${meta.tone}`}>{h.category}</span>
                              <span className="text-[11px] text-slate-400 flex items-center gap-1"><Clock3 className="w-3 h-3" /> {h.duration_minutes} min</span>
                            </div>
                          </div>
                          <button
                            onClick={() => void toggle(h)}
                            aria-label={completed ? 'Desmarcar hábito' : 'Concluir hábito'}
                            className={`w-11 h-11 shrink-0 rounded-full border flex items-center justify-center transition ${
                              completed ? 'bg-slate-950 border-slate-950 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-300 hover:text-slate-950 hover:border-slate-400'
                            }`}
                          >
                            <Check className="w-5 h-5" strokeWidth={completed ? 3 : 2} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryStats.filter(x => x.total > 0).map(item => {
                const meta = categoryMeta[item.category] || categoryMeta.Outro;
                const Icon = meta.icon;
                const pct = item.total ? Math.round(item.completed / item.total * 100) : 0;
                return (
                  <Card key={item.category} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${meta.tone}`}><Icon className="w-5 h-5" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800">{item.category}</p>
                        <p className="text-[11px] text-slate-400">{item.completed}/{item.total} concluídos</p>
                      </div>
                      <span className="text-sm font-black text-slate-700">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-4">
                      <div className="h-full rounded-full bg-slate-950" style={{ width: `${pct}%` }} />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'Tracking' && (
          <div className="space-y-5">
            <Card className="p-5 sm:p-6">
              <SectionHeading
                eyebrow="Consistência"
                title="Mapa de calor — últimos 365 dias"
                subtitle="Cada quadrado representa um dia. Quanto mais ativo, maior a densidade."
              />
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className="grid grid-flow-col grid-rows-7 auto-cols-[14px] gap-1">
                    {Array.from({ length: 365 }, (_, i) => {
                      const k = offsetDate(i - 364);
                      const n = logCountMap[k] || 0;
                      const level = n >= 5 ? 'bg-slate-950' : n >= 3 ? 'bg-slate-700' : n >= 2 ? 'bg-slate-500' : n >= 1 ? 'bg-slate-300' : 'bg-slate-100 border border-slate-100';
                      return <div key={k} title={`${k}: ${n} check-ins`} className={`w-3.5 h-3.5 rounded-[3px] ${level}`} />;
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-slate-400">
                <span>Menos</span><i className="w-3.5 h-3.5 rounded-[3px] bg-slate-100 border border-slate-100" />
                <i className="w-3.5 h-3.5 rounded-[3px] bg-slate-300" />
                <i className="w-3.5 h-3.5 rounded-[3px] bg-slate-500" />
                <i className="w-3.5 h-3.5 rounded-[3px] bg-slate-700" />
                <i className="w-3.5 h-3.5 rounded-[3px] bg-slate-950" /><span>Mais</span>
              </div>
            </Card>

            <div className="grid md:grid-cols-3 gap-4">
              {counts.map(([name, count], index) => (
                <Card key={name} className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center">
                      {index === 0 ? <CalendarDays className="w-5 h-5" /> : index === 1 ? <TrendingUp className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-slate-400 mt-5">{name}</p>
                  <p className="text-4xl font-black text-slate-950 tracking-tight mt-1">{count}</p>
                  <p className="text-xs text-slate-400 mt-1">check-ins registrados</p>
                </Card>
              ))}
            </div>

            <Card className="overflow-hidden border-slate-200">
              <div className="p-5 sm:p-6 border-b border-slate-100">
                <SectionHeading
                  eyebrow="Evolução"
                  title="GOAT Body Analytics"
                  subtitle="Registre indicadores físicos e mentais para acompanhar sua evolução."
                  action={
                    <PrimaryButton onClick={() => openModal('metric', { recorded_on: today })}>
                      <Plus className="w-4 h-4" /> Registrar evolução
                    </PrimaryButton>
                  }
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    ['Peso', 'weight_kg', 'kg'], ['Gordura', 'body_fat_pct', '%'],
                    ['Cintura', 'waist_cm', 'cm'], ['Peito', 'chest_cm', 'cm'],
                    ['Braço', 'arm_cm', 'cm'], ['Perna', 'leg_cm', 'cm'],
                    ['Sono', 'sleep_hours', 'h'], ['Treino', 'training_minutes', 'min'],
                  ].map(([label, key, unit]) => (
                    <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400">{label}</p>
                      <div className="flex items-end gap-1 mt-2">
                        <span className="text-xl font-black text-slate-950">{latest?.[key] ?? '—'}</span>
                        {latest?.[key] != null && <span className="text-xs text-slate-400 mb-0.5">{unit}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 sm:p-6 bg-slate-50/50">
                <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5 items-stretch">
                  <div className="rounded-2xl bg-white border border-slate-200 p-5">
                    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">GOAT Score</p>
                        <h3 className="text-lg font-bold text-slate-950 mt-1">Ritmo de evolução</h3>
                      </div>
                      <span className="text-xs text-slate-400">{latest?.recorded_on || 'Sem registros'}</span>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {[['Hoje', daily], ['7 dias', weekly], ['Mês', monthly]].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-slate-200 p-4">
                          <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-slate-400">{label}</p>
                          <p className="text-3xl font-black tracking-tight text-slate-950 mt-2">{value || '—'}</p>
                          {value ? <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-3"><div className="h-full rounded-full bg-slate-950" style={{ width: `${Number(value)}%` }} /></div> : <p className="text-[11px] text-slate-400 mt-3">Registre dados para calcular.</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-950 text-white p-5 overflow-hidden relative">
                    <div className="absolute -right-12 -top-12 w-36 h-36 rounded-full border border-white/10" />
                    <div className="absolute right-4 top-4 w-16 h-16 rounded-full border border-white/10" />
                    <p className="relative text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">Body map</p>
                    <div className="relative grid grid-cols-[150px_1fr] gap-4 items-center mt-2">
                      <svg viewBox="0 0 180 360" className="h-72 w-full text-slate-200">
                        <circle cx="90" cy="32" r="25" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path d="M90 57C65 58 58 82 60 115L65 180 45 250 55 345M90 57C115 58 122 82 120 115L115 180 135 250 125 345M30 115L65 180M150 115L115 180M65 180H115M78 345L90 180 102 345" fill="none" stroke="currentColor" strokeWidth="5" />
                        <circle cx="90" cy="93" r="8" fill="currentColor" opacity="0.15" />
                        <circle cx="90" cy="150" r="8" fill="currentColor" opacity="0.15" />
                        <circle cx="90" cy="220" r="8" fill="currentColor" opacity="0.15" />
                        <text x="90" y="95" textAnchor="middle" fontSize="8" fill="currentColor">MENTE</text>
                        <text x="90" y="150" textAnchor="middle" fontSize="8" fill="currentColor">FÍSICO</text>
                        <text x="90" y="220" textAnchor="middle" fontSize="8" fill="currentColor">CORE</text>
                      </svg>
                      <div className="space-y-2.5">
                        {categoryStats.map(item => {
                          const meta = categoryMeta[item.category] || categoryMeta.Outro;
                          const Icon = meta.icon;
                          return (
                            <div key={item.category} className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><Icon className="w-3.5 h-3.5 text-slate-300" /></div>
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between gap-2 text-[10px]">
                                  <span className="text-slate-300 truncate">{item.category}</span>
                                  <span className="text-slate-500">{item.completed}/{item.total}</span>
                                </div>
                                <div className="h-1 rounded-full bg-white/10 mt-1 overflow-hidden">
                                  <div className="h-full rounded-full bg-white" style={{ width: `${item.total ? item.completed / item.total * 100 : 0}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {(tab === 'Livros' || tab === 'Audiobooks') && (
          <Library
            items={tab === 'Livros' ? books : audio}
            audio={tab === 'Audiobooks'}
            add={() => openModal(tab === 'Livros' ? 'book' : 'audio', {
              status: tab === 'Livros' ? 'Ainda vou ler' : 'Ainda vou ouvir',
            })}
            del={del}
          />
        )}

        {modal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4"
            onMouseDown={e => { if (e.target === e.currentTarget) resetModal(); }}
          >
            <Card className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border-slate-200 shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-5 bg-white/95 backdrop-blur border-b border-slate-100">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">
                    {modal === 'metric' ? 'Body Analytics' : modal === 'habit' ? 'Ritual diário' : 'Biblioteca'}
                  </p>
                  <h2 className="text-lg font-black tracking-tight text-slate-950 mt-0.5">
                    {modal === 'metric' ? 'Registrar evolução' : modal === 'habit' ? 'Novo hábito' : modal === 'book' ? 'Adicionar livros' : 'Adicionar audiobooks'}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Fechar popup"
                  title="Fechar popup"
                  onClick={resetModal}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950 transition"
                >
                  <X className="w-5 h-5" strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-6">
                {modal === 'metric' ? (
                  <div className="space-y-4">
                    <label className="block">
                      <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">Data</span>
                      <input type="date" value={form.recorded_on || today} onChange={e => setForm({ ...form, recorded_on: e.target.value })} className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100" />
                    </label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        ['weight_kg', 'Peso (kg)'], ['body_fat_pct', 'Gordura corporal (%)'],
                        ['waist_cm', 'Cintura (cm)'], ['chest_cm', 'Peito (cm)'],
                        ['arm_cm', 'Braço (cm)'], ['leg_cm', 'Perna (cm)'],
                        ['sleep_hours', 'Sono (horas)'], ['training_minutes', 'Treino (minutos)'],
                      ].map(([key, label]) => (
                        <Field key={key} label={label} value={form[key] ?? ''} onChange={v => setForm({ ...form, [key]: v })} type="number" step="0.1" />
                      ))}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 mb-2">Indicadores 0–100</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          ['nutrition_score', 'Nutrição'], ['energy_score', 'Energia'],
                          ['focus_score', 'Foco'], ['spiritual_score', 'Espiritual'],
                        ].map(([key, label]) => (
                          <Field key={key} label={label} value={form[key] ?? ''} onChange={v => setForm({ ...form, [key]: v })} type="number" min="0" max="100" />
                        ))}
                      </div>
                    </div>
                    <label className="block">
                      <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">Observações</span>
                      <textarea rows={4} placeholder="Como foi sua energia, foco, treino ou rotina?" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3.5 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 resize-y" />
                    </label>
                  </div>
                ) : modal === 'habit' ? (
                  <div className="space-y-4">
                    <Field label="Nome do hábito" value={form.name || ''} onChange={v => setForm({ ...form, name: v })} placeholder="Ex.: Treinar, meditar, estudar..." />
                    <label className="block">
                      <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">Imagem</span>
                      <label className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 cursor-pointer hover:bg-white transition">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center"><Upload className="w-4 h-4 text-slate-500" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-700 truncate">{selectedFile ? selectedFile.name : 'Escolher do PC ou celular'}</p>
                          <p className="text-[11px] text-slate-400">Imagem opcional · máximo 8 MB</p>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                      </label>
                    </label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Field label="Duração em minutos" value={form.duration || 15} onChange={v => setForm({ ...form, duration: v })} type="number" min="1" max="1440" />
                      <SelectField label="Categoria" value={form.category || 'Mente'} onChange={v => setForm({ ...form, category: v })} options={cats} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Itens</label>
                      <textarea
                        rows={10}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 resize-y"
                        placeholder={'Um item por linha.\nFormato opcional: Título | Autor\n\nO Príncipe | Nicolau Maquiavel\nAtomic Habits | James Clear'}
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                      />
                      <p className="text-[11px] text-slate-400 mt-1.5">Você pode colar vários itens de uma vez. O acompanhamento é por status, sem porcentagem.</p>
                    </div>
                    <label className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 cursor-pointer hover:bg-white transition">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center"><Upload className="w-4 h-4 text-slate-500" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-700 truncate">{selectedFile ? selectedFile.name : 'Capa opcional'}</p>
                        <p className="text-[11px] text-slate-400">A mesma capa será aplicada aos itens adicionados.</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                    </label>
                    <SelectField
                      label="Status"
                      value={form.status || ''}
                      onChange={v => setForm({ ...form, status: v })}
                      options={modal === 'book' ? ['Lendo', 'Ainda vou ler', 'Completo'] : ['Ouvindo', 'Ainda vou ouvir', 'Completo']}
                    />
                  </div>
                )}

                <div className="flex gap-2 mt-6">
                  <button type="button" onClick={resetModal} className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
                  <button type="button" onClick={() => void add()} className="flex-[1.5] h-11 rounded-xl bg-slate-950 text-white text-sm font-semibold hover:bg-slate-800">Salvar</button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function Library({
  items, audio, add, del,
}: {
  items: any[]; audio: boolean; add: () => void; del: (table: string, id: string) => void;
}) {
  const statuses = audio ? ['Ouvindo', 'Ainda vou ouvir', 'Completo'] : ['Lendo', 'Ainda vou ler', 'Completo'];
  const Icon = audio ? Headphones : BookOpen;
  const table = audio ? 'goat_audiobooks' : 'goat_books';
  const total = items.length;
  const completed = items.filter(item => item.status === 'Completo').length;

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center"><Icon className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-400">{audio ? 'Escuta' : 'Leitura'}</p>
              <h2 className="text-xl font-black tracking-tight text-slate-950">{audio ? 'Audiobooks' : 'Livros'}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{completed} completos · {total} no total</p>
            </div>
          </div>
          <PrimaryButton onClick={add}><Plus className="w-4 h-4" /> Adicionar</PrimaryButton>
        </div>
      </Card>

      {statuses.map(status => {
        const group = items.filter(x => x.status === status);
        return (
          <Card className="p-5 sm:p-6" key={status}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-950">{status}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{group.length} {group.length === 1 ? 'item' : 'itens'}</p>
              </div>
              <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">{group.length}</span>
            </div>

            {group.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
                <p className="text-xs font-semibold text-slate-500">Nada aqui ainda</p>
                <p className="text-[11px] text-slate-400 mt-1">Adicione itens usando o botão acima.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.map(item => (
                  <div key={item.id} className="group rounded-2xl border border-slate-200 bg-white p-3 hover:border-slate-300 hover:shadow-sm transition">
                    <div className="flex gap-3">
                      <div className="w-16 h-20 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                        {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> : <Icon className="w-6 h-6 text-slate-300" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className="text-sm font-bold text-slate-800 line-clamp-2">{item.title}</p>
                          <button
                            aria-label={`Excluir ${item.title}`}
                            onClick={() => void del(table, item.id)}
                            className="shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition opacity-70 sm:opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {item.author && <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.author}</p>}
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-100 px-2 py-1 mt-3">
                          <span className={`w-1.5 h-1.5 rounded-full ${status === 'Completo' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          <span className="text-[10px] font-semibold text-slate-500">{status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
