import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import HeatMap from '@uiw/react-heat-map';
import { BarChart3, CalendarDays, Check, CheckCircle2, Circle, Clock3, Flame, ListChecks, Target, TrendingUp, Trophy, X } from 'lucide-react';

type Activity = Record<string, number>;
type DailyItems = Record<string, string[]>;
type ChecklistItem = {
  id: string;
  title: string;
  is_completed: boolean;
  position: number;
  parent_id: string | null;
};
type Period = 'day' | 'month' | 'year' | 'all';

function readDailyItems(value: unknown): DailyItems {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: DailyItems = {};
  for (const [date, rawItems] of Object.entries(value as Record<string, unknown>)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(rawItems)) {
      const ids = [...new Set(rawItems.filter((id): id is string => typeof id === 'string' && id.length > 0))];
      if (ids.length) result[date] = ids;
    }
  }
  return result;
}

function readActivity(value: unknown, dailyItemsValue: unknown): Activity {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const dailyItems = readDailyItems(dailyItemsValue);
  const result: Activity = {};
  for (const [date, rawCount] of Object.entries(value as Record<string, unknown>)) {
    const count = Number(rawCount);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(count) && count > 0) {
      // Legacy click counters are normalized to one event per active day unless item IDs exist.
      result[date] = dailyItems[date]?.length ?? 1;
    }
  }
  for (const [date, ids] of Object.entries(dailyItems)) result[date] = ids.length;
  return result;
}

function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function shiftedDay(key: string, amount: number): string {
  const parts = key.split('-').map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

function monthKey(date: Date): string {
  return dateKey(new Date(date.getFullYear(), date.getMonth(), 1)).slice(0, 7);
}

function prettyDay(key: string, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }): string {
  const parts = key.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', options).format(new Date(parts[0], parts[1] - 1, parts[2]));
}

function intensity(count: number): { level: number; label: string } {
  if (count <= 0) return { level: 0, label: 'Sem atividade' };
  if (count === 1) return { level: 1, label: 'Acendendo' };
  if (count <= 3) return { level: 2, label: 'Aquecido' };
  if (count <= 5) return { level: 3, label: 'Forte' };
  if (count <= 8) return { level: 4, label: 'Muito forte' };
  return { level: 5, label: 'Máximo' };
}

function summariseEntries(activity: Activity, predicate: (date: string) => boolean) {
  const entries = Object.entries(activity).filter(([date]) => predicate(date));
  return {
    activeDays: entries.length,
    completions: entries.reduce((sum, [, count]) => sum + count, 0),
    peak: entries.reduce((max, [, count]) => Math.max(max, count), 0),
  };
}

function streakData(activeDates: string[]) {
  const active = new Set(activeDates);
  const today = dateKey(new Date());
  let anchor = active.has(today) ? today : shiftedDay(today, -1);
  let current = 0;
  while (active.has(anchor)) {
    current += 1;
    anchor = shiftedDay(anchor, -1);
  }

  let best = 0;
  let run = 0;
  let previous = '';
  for (const date of activeDates) {
    run = previous && shiftedDay(previous, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return { current, best };
}

type NoteHeatmapProps = {
  activity: unknown;
  dailyItems: unknown;
  checklistItems: ChecklistItem[];
  noteTitle: string;
  dark?: boolean;
};

export function NoteHeatmap({ activity, dailyItems, checklistItems, noteTitle, dark = false }: NoteHeatmapProps) {
  const [statsOpen, setStatsOpen] = useState(false);
  const [period, setPeriod] = useState<Period>('day');
  const today = dateKey(new Date());
  const history = useMemo(() => readActivity(activity, dailyItems), [activity, dailyItems]);
  const dailyItemMap = useMemo(() => readDailyItems(dailyItems), [dailyItems]);
  const allActiveDates = Object.keys(history).filter(date => history[date] > 0).sort();
  const activeDateSet = new Set(allActiveDates);
  const streaks = streakData(allActiveDates);

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 83);
  startDate.setHours(0, 0, 0, 0);
  const startKey = dateKey(startDate);
  const recentEntries = Object.entries(history)
    .filter(([date]) => date >= startKey && date <= today)
    .sort(([a], [b]) => a.localeCompare(b));
  const heatValue = recentEntries.map(([date, count]) => ({ date: date.replace(/-/g, '/'), count }));

  const todayCount = history[today] ?? 0;
  const todayIntensity = intensity(todayCount);
  const peak = allActiveDates.reduce((max, date) => Math.max(max, history[date]), 0);
  const totalHistoricalCompletions = Object.values(history).reduce((sum, count) => sum + count, 0);

  const currentTasks = checklistItems.filter(item => item.title.trim()).slice().sort((a, b) => a.position - b.position);
  const doneTasks = currentTasks.filter(item => item.is_completed);
  const pendingTasks = currentTasks.filter(item => !item.is_completed);
  const taskPercent = currentTasks.length ? Math.round((doneTasks.length / currentTasks.length) * 100) : 0;

  const periodSummary = (() => {
    if (period === 'day') return summariseEntries(history, date => date === today);
    if (period === 'month') {
      const month = today.slice(0, 7);
      return summariseEntries(history, date => date.startsWith(month));
    }
    if (period === 'year') {
      const year = today.slice(0, 4);
      return summariseEntries(history, date => date.startsWith(year));
    }
    return summariseEntries(history, () => true);
  })();

  const periodRows = (() => {
    if (period === 'day') {
      return Array.from({ length: 7 }, (_, index) => shiftedDay(today, index - 6)).map(date => ({
        key: date,
        label: date === today ? 'Hoje' : prettyDay(date, { weekday: 'short', day: '2-digit', month: 'short' }),
        activeDays: history[date] ? 1 : 0,
        completions: history[date] ?? 0,
        peak: history[date] ?? 0,
      }));
    }
    if (period === 'month') {
      return Array.from({ length: 12 }, (_, index) => {
        const date = new Date(new Date().getFullYear(), new Date().getMonth() - (11 - index), 1);
        const key = monthKey(date);
        const summary = summariseEntries(history, dateKeyValue => dateKeyValue.startsWith(key));
        return {
          key,
          label: new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(date),
          ...summary,
        };
      });
    }
    const currentYear = new Date().getFullYear();
    const years = period === 'year'
      ? Array.from({ length: 5 }, (_, index) => String(currentYear - (4 - index)))
      : [...new Set([String(currentYear), ...allActiveDates.map(date => date.slice(0, 4))])].sort();
    return years.map(year => {
      const summary = summariseEntries(history, date => date.startsWith(year));
      return { key: year, label: year, ...summary };
    });
  })();

  useEffect(() => {
    if (!statsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStatsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [statsOpen]);

  const periodLabels: Record<Period, string> = {
    day: 'Dia',
    month: 'Mês',
    year: 'Ano',
    all: 'Tudo',
  };

  const dialog = statsOpen && typeof document !== 'undefined' ? createPortal(
    <div className="note-heatmap-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setStatsOpen(false); }}>
      <section className="note-heatmap-dialog" role="dialog" aria-modal="true" aria-labelledby="note-heatmap-stats-title" onClick={event => event.stopPropagation()}>
        <header className="note-heatmap-dialog-header">
          <div className="note-heatmap-dialog-brand"><span className="note-heatmap-dialog-flame"><Flame size={17}/></span><span>Estatísticas do Calor</span></div>
          <button type="button" className="note-heatmap-dialog-close" aria-label="Fechar estatísticas" onClick={() => setStatsOpen(false)}><X size={19}/></button>
        </header>

        <div className="note-heatmap-dialog-title">
          <p>PROGRESSO DA NOTA</p>
          <h2 id="note-heatmap-stats-title">{noteTitle.trim() || 'Sem título'}</h2>
          <span>A atividade é registrada por checklist e por dia enquanto o Calor está ativado.</span>
        </div>

        <div className="note-heatmap-stat-grid">
          <article className="note-heatmap-stat-card">
            <span className="note-heatmap-stat-icon"><CalendarDays size={17}/></span>
            <span className="note-heatmap-stat-label">Dias ativos</span>
            <strong>{allActiveDates.length}</strong>
            <small>no histórico registrado</small>
          </article>
          <article className="note-heatmap-stat-card">
            <span className="note-heatmap-stat-icon"><Flame size={17}/></span>
            <span className="note-heatmap-stat-label">Sequência atual</span>
            <strong>{streaks.current}</strong>
            <small>{streaks.current === 1 ? 'dia consecutivo' : 'dias consecutivos'}</small>
          </article>
          <article className="note-heatmap-stat-card">
            <span className="note-heatmap-stat-icon"><Trophy size={17}/></span>
            <span className="note-heatmap-stat-label">Melhor sequência</span>
            <strong>{streaks.best}</strong>
            <small>{streaks.best === 1 ? 'dia seguido' : 'dias seguidos'}</small>
          </article>
          <article className="note-heatmap-stat-card">
            <span className="note-heatmap-stat-icon"><ListChecks size={17}/></span>
            <span className="note-heatmap-stat-label">Conclusões no Calor</span>
            <strong>{totalHistoricalCompletions}</strong>
            <small>itens distintos por dia</small>
          </article>
        </div>

        <section className="note-heatmap-intensity-panel">
          <div className="note-heatmap-intensity-top">
            <div>
              <span className="note-heatmap-section-kicker">INTENSIDADE DE HOJE</span>
              <h3>{todayIntensity.label}</h3>
              <p>{todayCount} {todayCount === 1 ? 'item concluído' : 'itens concluídos'} hoje com o Calor ligado</p>
            </div>
            <div className={'note-heatmap-intensity-level level-' + todayIntensity.level}>
              <Flame size={27}/>
              <strong>{todayIntensity.level}/5</strong>
            </div>
          </div>
          <div className="note-heatmap-level-track" aria-label={'Intensidade ' + todayIntensity.level + ' de 5'}>
            {[1, 2, 3, 4, 5].map(level => <span key={level} className={level <= todayIntensity.level ? 'filled level-' + level : ''}/>)}
          </div>
          <div className="note-heatmap-intensity-foot"><span>Leve</span><span>Média</span><span>Forte</span><span>Máxima</span></div>
          <p className="note-heatmap-peak">Seu maior nível em um único dia foi <strong>{intensity(peak).label.toLowerCase()}</strong>, com <strong>{peak}</strong> {peak === 1 ? 'item' : 'itens'} concluídos.</p>
        </section>

        <section className="note-heatmap-period-panel">
          <div className="note-heatmap-section-header">
            <div><span className="note-heatmap-section-kicker">RESUMO DE ATIVIDADE</span><h3>Veja seu progresso por período</h3></div>
            <div className="note-heatmap-period-tabs" role="tablist" aria-label="Período das estatísticas">
              {(Object.keys(periodLabels) as Period[]).map(key => <button key={key} type="button" role="tab" aria-selected={period === key} className={period === key ? 'active' : ''} onClick={() => setPeriod(key)}>{periodLabels[key]}</button>)}
            </div>
          </div>
          <div className="note-heatmap-period-kpis">
            <div><span>Dias ativos</span><strong>{periodSummary.activeDays}</strong></div>
            <div><span>Conclusões registradas</span><strong>{periodSummary.completions}</strong></div>
            <div><span>Pico diário</span><strong>{periodSummary.peak}</strong></div>
          </div>
          <div className="note-heatmap-history-list">
            {periodRows.slice().reverse().map(row => {
              const level = intensity(row.peak).level;
              const max = Math.max(1, ...periodRows.map(item => item.completions));
              const width = Math.min(100, Math.round((row.completions / max) * 100));
              return <div className="note-heatmap-history-row" key={row.key}>
                <span className="note-heatmap-history-name">{row.label}</span>
                <div className="note-heatmap-history-bar"><span className={'level-' + level} style={{ width: width + '%' }}/></div>
                <span className="note-heatmap-history-days">{row.activeDays} {row.activeDays === 1 ? 'dia' : 'dias'}</span>
                <strong>{row.completions}</strong>
              </div>;
            })}
            {periodSummary.activeDays === 0 && <p className="note-heatmap-no-data">Ainda não há atividade registrada neste período. Marque uma tarefa com o Calor ativado para começar.</p>}
          </div>
        </section>

        <section className="note-heatmap-checklist-panel">
          <div className="note-heatmap-section-header">
            <div><span className="note-heatmap-section-kicker">CHECKLIST ATUAL</span><h3>O que está feito e o que falta</h3></div>
            <span className="note-heatmap-progress-pill">{taskPercent}% concluído</span>
          </div>
          <div className="note-heatmap-progress"><span style={{ width: taskPercent + '%' }}/></div>
          <div className="note-heatmap-task-columns">
            <div className="note-heatmap-task-list">
              <h4><CheckCircle2 size={16}/> Feitas <span>{doneTasks.length}</span></h4>
              {doneTasks.length ? doneTasks.map(item => <div className="note-heatmap-task" key={item.id}><CheckCircle2 size={15}/><span>{item.title}</span></div>) : <p className="note-heatmap-task-empty">Nenhuma tarefa concluída no estado atual.</p>}
            </div>
            <div className="note-heatmap-task-list pending">
              <h4><Circle size={16}/> Pendentes <span>{pendingTasks.length}</span></h4>
              {pendingTasks.length ? pendingTasks.map(item => <div className="note-heatmap-task" key={item.id}><Circle size={15}/><span>{item.title}</span></div>) : <p className="note-heatmap-task-empty">Tudo concluído nesta checklist.</p>}
            </div>
          </div>
          {!currentTasks.length && <p className="note-heatmap-task-empty">Esta nota ainda não tem itens de checklist com título.</p>}
        </section>

        <footer className="note-heatmap-dialog-footnote">
          <Clock3 size={14}/>
          <span>Uma mesma caixa conta no máximo uma vez por dia. Desmarcar e marcar novamente não duplica o registro. As estatísticas históricas começam quando o Calor está ativo.</span>
        </footer>
      </section>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <div className="note-heatmap" onClick={event => event.stopPropagation()}>
        <div className="note-heatmap-heading">
          <span>Calor</span>
          <span>{allActiveDates.length} {allActiveDates.length === 1 ? 'dia ativo' : 'dias ativos'}</span>
          <button type="button" className="note-heatmap-open-stats" aria-label={'Abrir estatísticas de Calor para ' + (noteTitle.trim() || 'esta nota')} title="Ver estatísticas completas" onClick={() => setStatsOpen(true)}><Flame size={16}/></button>
        </div>
        <HeatMap
          value={heatValue}
          width={240}
          startDate={startDate}
          endDate={endDate}
          rectSize={5}
          space={2}
          weekLabels={false}
          monthLabels={false}
          legendCellSize={0}
          rectProps={{ rx: 2 }}
          panelColors={{
            0: dark ? '#36363b' : '#f1f1f5',
            1: '#fed7aa',
            2: '#fb923c',
            3: '#ef4444',
            4: '#b91c1c',
            5: '#7f1d1d',
          }}
        />
      </div>
      {dialog}
    </>
  );
}
