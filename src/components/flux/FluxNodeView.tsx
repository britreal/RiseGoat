import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FileOutput, FileText, FormInput, GripVertical } from 'lucide-react';
import type { FluxNode } from '@/lib/flux/types';

const meta = {
  entrada: { icon: FormInput, tone: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100', dot: 'bg-cyan-400' },
  template: { icon: FileText, tone: 'border-violet-400/30 bg-violet-400/10 text-violet-100', dot: 'bg-violet-400' },
  exportar: { icon: FileOutput, tone: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100', dot: 'bg-emerald-400' },
} as const;

export function FluxNodeView({ data, selected }: NodeProps<FluxNode>) {
  const config = meta[data.nodeType];
  const Icon = config.icon;
  return (
    <div className={'w-[250px] overflow-hidden rounded-2xl border bg-[#111827] shadow-2xl shadow-black/30 ' + (selected ? 'border-white/50 ring-2 ring-white/10' : 'border-white/10')}>
      {data.nodeType !== 'entrada' && <Handle type="target" id="input" position={Position.Left} className="!w-3 !h-3 !border-2 !border-[#111827] !bg-slate-300" />}
      <div className={'flex items-center gap-2 border-b px-3 py-2.5 ' + config.tone}>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/20"><Icon className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={'h-1.5 w-1.5 rounded-full ' + config.dot} />
            <span className="text-[11px] font-black uppercase tracking-[0.14em]">{data.nodeType}</span>
          </div>
          <p className="truncate text-sm font-bold text-white">{data.title}</p>
        </div>
        <GripVertical className="h-4 w-4 text-white/25" />
      </div>
      <div className="px-3 py-3">
        <p className="text-[11px] leading-5 text-slate-400">{data.description}</p>
        <div className="mt-3 rounded-xl border border-white/5 bg-black/20 px-2.5 py-2 text-[10px] font-mono text-slate-500">{data.key}</div>
      </div>
      {data.nodeType !== 'exportar' && <Handle type="source" id="output" position={Position.Right} className="!w-3 !h-3 !border-2 !border-[#111827] !bg-slate-300" />}
    </div>
  );
}
