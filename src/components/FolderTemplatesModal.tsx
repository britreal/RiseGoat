import { useEffect, useState } from 'react';
import { BookOpen, CheckSquare, ChevronDown, ChevronRight, FolderPlus, KeyRound, Network, ShieldAlert, X, type LucideIcon } from 'lucide-react';
import { folderTemplates, type FolderTemplate, type FolderTemplateIcon } from '@/lib/folderTemplates';
import '@/lib/folder-templates.css';

type FolderTemplatesModalProps = {
  open: boolean;
  busyTemplateId: string | null;
  onClose: () => void;
  onCreate: (templateId: string) => Promise<void>;
  onCreateCustom: (name: string) => Promise<void>;
};

const iconMap: Record<FolderTemplateIcon, LucideIcon> = {
  network: Network,
  'key-round': KeyRound,
  'book-open': BookOpen,
};

function templateCounts(template: FolderTemplate) {
  return {
    notes: template.notes.length,
    checklists: template.notes.filter(note => note.type === 'checklist').length,
    connections: template.connections.length,
    labels: new Set(template.notes.flatMap(note => note.tags)).size,
  };
}

export function FolderTemplatesModal({ open, busyTemplateId, onClose, onCreate, onCreateCustom }: FolderTemplatesModalProps) {
  const [customFolderName, setCustomFolderName] = useState('');
  useEffect(() => { if (open) setCustomFolderName(''); }, [open]);
  if (!open) return null;
  const busy = busyTemplateId !== null;

  return (
    <div className="folder-templates-overlay" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="folder-templates-dialog" role="dialog" aria-modal="true" aria-labelledby="folder-templates-title">
        <header className="folder-templates-header">
          <div className="folder-templates-header-mark"><FolderPlus size={20}/></div>
          <div className="folder-templates-heading">
            <span className="folder-templates-eyebrow">RISEGOAT · ORGANIZAÇÃO</span>
            <h2 id="folder-templates-title">Pasta Template</h2>
            <p>Comece com uma pasta vazia ou escolha uma estrutura pronta com notas, checklists, etiquetas e conexões.</p>
          </div>
          <button type="button" className="folder-templates-close" onClick={onClose} disabled={busy} aria-label="Fechar"><X size={18}/></button>
        </header>

        <div className="folder-templates-content">
          <div className="folder-templates-intro">
            <div>
              <strong>Comece do seu jeito</strong>
              <span>Crie uma pasta vazia ou use um modelo pronto. Você pode editar tudo depois.</span>
            </div>
            <span className="folder-templates-count">{folderTemplates.length} modelos prontos</span>
          </div>

          <div className="folder-template-custom-create">
            <div className="folder-template-custom-icon"><FolderPlus size={19}/></div>
            <div className="folder-template-custom-copy">
              <strong>Criar do zero</strong>
              <span>Uma pasta vazia, com o nome que você escolher.</span>
            </div>
            <form className="folder-template-custom-form" onSubmit={event => { event.preventDefault(); if (!busy && customFolderName.trim()) void onCreateCustom(customFolderName.trim()); }}>
              <input type="text" value={customFolderName} onChange={event => setCustomFolderName(event.target.value)} maxLength={80} aria-label="Nome da pasta" placeholder="Nome da nova pasta" required disabled={busy}/>
              <button type="submit" disabled={busy || !customFolderName.trim()}>
                {busyTemplateId === '__custom__' ? <span className="folder-template-spinner"/> : <FolderPlus size={14}/>}
                {busyTemplateId === '__custom__' ? 'Criando pasta…' : 'Criar pasta'}
              </button>
            </form>
          </div>

          <div className="folder-templates-grid">
            {folderTemplates.map(template => {
              const Icon = iconMap[template.icon];
              const counts = templateCounts(template);
              const isBusy = busyTemplateId === template.id;
              return (
                <article key={template.id} className="folder-template-card" style={{ borderTopColor: template.color }}>
                  <div className="folder-template-card-top">
                    <span className="folder-template-icon" style={{ color: template.color, backgroundColor: template.color + '18' }}><Icon size={21}/></span>
                    <span className="folder-template-badge">{counts.notes} notas</span>
                  </div>
                  <h3>{template.name}</h3>
                  <p className="folder-template-description">{template.description}</p>
                  <p className="folder-template-purpose">{template.purpose}</p>
                  <div className="folder-template-stats">
                    <span><CheckSquare size={13}/>{counts.checklists} checklists</span>
                    <span><Network size={13}/>{counts.connections} conexões</span>
                    <span>{counts.labels} etiquetas</span>
                  </div>
                  <details className="folder-template-preview">
                    <summary>Ver o que será criado <ChevronDown size={14}/></summary>
                    <ul>
                      {template.notes.map(note => <li key={note.key}><span>{note.title}</span>{note.type === 'checklist' && <small>Checklist · {(note.checklistItems ?? []).length} itens</small>}</li>)}
                    </ul>
                    <p>As conexões listadas abaixo serão adicionadas ao Mapa:</p>
                    <div className="folder-template-edges">{template.connections.map(edge => {
                      const from = template.notes.find(note => note.key === edge.from)?.title ?? edge.from;
                      const to = template.notes.find(note => note.key === edge.to)?.title ?? edge.to;
                      return <span key={edge.from + '-' + edge.to}>{from} <ChevronRight size={12}/> {to}</span>;
                    })}</div>
                  </details>
                  <button type="button" className="folder-template-create" disabled={busy} onClick={() => void onCreate(template.id)}>
                    {isBusy ? <span className="folder-template-spinner"/> : <FolderPlus size={15}/>}
                    {isBusy ? 'Criando estrutura…' : 'Criar esta pasta'}
                  </button>
                </article>
              );
            })}
          </div>

          <div className="folder-templates-privacy">
            <ShieldAlert size={16}/>
            <p><strong>Uma observação sobre o modelo Acesso</strong> Use informações públicas e relevantes, respeite a privacidade e os limites das pessoas. Os modelos são pontos de partida, não um convite para registrar segredos ou dados sensíveis.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
