import { ChevronDown, RotateCcw, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type {
  MagnateAtividade, MagnatePatrimonioFaixa, MagnateSetor, MagnateTipo,
  TabuleiroFilterOptions, TabuleiroFiltros,
} from '@/types/tabuleiro';

const sectors: Array<{ value: MagnateSetor; label: string }> = [
  { value: 'tech', label: 'Tecnologia' }, { value: 'financas', label: 'Finanças' },
  { value: 'imobiliario', label: 'Imobiliário' }, { value: 'energia', label: 'Energia' },
  { value: 'industria', label: 'Indústria' }, { value: 'midia', label: 'Mídia' },
  { value: 'saude', label: 'Saúde' }, { value: 'varejo', label: 'Varejo' },
  { value: 'logistica', label: 'Logística' }, { value: 'agro', label: 'Agronegócio' },
  { value: 'educacao', label: 'Educação' }, { value: 'outros', label: 'Outros' },
];
const wealth: MagnatePatrimonioFaixa[] = ['<1B', '1-10B', '10-50B', '50-100B', '100B+'];
const wealthLabels: Record<MagnatePatrimonioFaixa, string> = {
  '<1B': 'Abaixo de US$ 1 bi', '1-10B': 'US$ 1–10 bi', '10-50B': 'US$ 10–50 bi',
  '50-100B': 'US$ 50–100 bi', '100B+': 'US$ 100 bi+',
};
const types: Array<{ value: MagnateTipo; label: string }> = [
  { value: 'self-made', label: 'Construiu a própria fortuna' }, { value: 'herdeiro', label: 'Herdeiro' },
  { value: 'familia', label: 'Família' }, { value: 'estatal', label: 'Estatal' }, { value: 'indefinido', label: 'Não classificado' },
];
const activities: Array<{ value: MagnateAtividade; label: string }> = [
  { value: 'ativo', label: 'Ativo' }, { value: 'silencioso', label: 'Silencioso' },
  { value: 'aposentado', label: 'Aposentado' }, { value: 'falecido', label: 'Falecido' },
];

function Group({ title, children, count }: { title: string; children: ReactNode; count: number }) {
  return <details className="tabuleiro-filter-group"><summary>{title}<span>{count || ''}</span><ChevronDown size={14} /></summary><div className="tabuleiro-filter-options">{children}</div></details>;
}

function CheckGroup<T extends string>({
  options, selected, onToggle,
}: { options: Array<{ value: T; label: string }>; selected: T[]; onToggle: (value: T) => void }) {
  return <>{options.map((option) => <label key={option.value} className="tabuleiro-filter-option">
    <input type="checkbox" checked={selected.includes(option.value)} onChange={() => onToggle(option.value)} />
    <span>{option.label}</span>
  </label>)}</>;
}

function toggle<T extends string>(selected: T[] | undefined, value: T) {
  const current = selected ?? [];
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

export function FiltrosTabuleiro({
  filtros, options, onChange, onClear, onClose,
}: {
  filtros: TabuleiroFiltros;
  options: TabuleiroFilterOptions;
  onChange: (next: TabuleiroFiltros) => void;
  onClear: () => void;
  onClose?: () => void;
}) {
  const activeCount = (filtros.setor?.length ?? 0) + (filtros.regiao?.length ?? 0) + (filtros.pais?.length ?? 0)
    + (filtros.patrimonio_faixa?.length ?? 0) + (filtros.tipo?.length ?? 0) + (filtros.atividade?.length ?? 0) + (filtros.tags?.length ?? 0);
  const stringOptions = (values: string[]) => values.map((value) => ({ value, label: value }));
  return <aside className="tabuleiro-filters" aria-label="Filtros do Tabuleiro">
    <div className="tabuleiro-filters-title"><div><strong>Filtros</strong><span>{activeCount ? activeCount + ' selecionados' : 'Refine a busca'}</span></div>
      {onClose && <button type="button" className="tabuleiro-small-icon" onClick={onClose} aria-label="Fechar filtros"><X size={16} /></button>}
    </div>
    <Group title="Setor" count={filtros.setor?.length ?? 0}>
      <CheckGroup options={sectors} selected={filtros.setor ?? []} onToggle={(value) => onChange({ ...filtros, setor: toggle(filtros.setor, value) })} />
    </Group>
    <Group title="Região" count={filtros.regiao?.length ?? 0}>
      <CheckGroup options={stringOptions(options.regiao)} selected={filtros.regiao ?? []} onToggle={(value) => onChange({ ...filtros, regiao: toggle(filtros.regiao, value) })} />
    </Group>
    <Group title="País" count={filtros.pais?.length ?? 0}>
      <CheckGroup options={stringOptions(options.pais)} selected={filtros.pais ?? []} onToggle={(value) => onChange({ ...filtros, pais: toggle(filtros.pais, value) })} />
    </Group>
    <Group title="Patrimônio estimado" count={filtros.patrimonio_faixa?.length ?? 0}>
      <CheckGroup options={wealth.map((value) => ({ value, label: wealthLabels[value] }))} selected={filtros.patrimonio_faixa ?? []} onToggle={(value) => onChange({ ...filtros, patrimonio_faixa: toggle(filtros.patrimonio_faixa, value) })} />
    </Group>
    <Group title="Origem da fortuna" count={filtros.tipo?.length ?? 0}>
      <CheckGroup options={types} selected={filtros.tipo ?? []} onToggle={(value) => onChange({ ...filtros, tipo: toggle(filtros.tipo, value) })} />
    </Group>
    <Group title="Atividade" count={filtros.atividade?.length ?? 0}>
      <CheckGroup options={activities} selected={filtros.atividade ?? []} onToggle={(value) => onChange({ ...filtros, atividade: toggle(filtros.atividade, value) })} />
    </Group>
    <Group title="Tags" count={filtros.tags?.length ?? 0}>
      {options.tags.length
        ? <CheckGroup options={stringOptions(options.tags)} selected={filtros.tags ?? []} onToggle={(value) => onChange({ ...filtros, tags: toggle(filtros.tags, value) })} />
        : <p className="tabuleiro-filter-empty">As tags cadastradas aparecerão aqui.</p>}
    </Group>
    <button type="button" className="tabuleiro-clear-filters" onClick={onClear}><RotateCcw size={14} />Limpar filtros</button>
  </aside>;
}
