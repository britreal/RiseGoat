import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui';
import {
  ArrowLeft, Plus, Trash2, GripVertical, Eye, Save, Loader2,
  Type, Image as ImageIcon, MousePointer, Minus, Separator, Settings,
  X, ChevronUp, ChevronDown,
} from 'lucide-react';
import type { SalesPage, SalesBlock } from '@/types';

const BLOCK_TYPES = [
  { type: 'heading', label: 'Título', icon: Type },
  { type: 'text', label: 'Texto', icon: Type },
  { type: 'image', label: 'Imagem', icon: ImageIcon },
  { type: 'button', label: 'Botão', icon: MousePointer },
  { type: 'spacer', label: 'Espaço', icon: Minus },
  { type: 'divider', label: 'Divisor', icon: Separator },
] as const;

type BlockType = typeof BLOCK_TYPES[number]['type'];

const FONT_SIZES: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
};

const ALIGN: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

interface BlockSettings {
  fontSize?: string;
  align?: string;
  color?: string;
  bgColor?: string;
  fontWeight?: string;
  buttonUrl?: string;
  buttonBg?: string;
  buttonColor?: string;
  spacerHeight?: number;
  imageRounded?: boolean;
}

export function SalesEditorPage({ pageId, navigate }: { pageId: string; navigate: (path: string) => void }) {
  const { user } = useAuth();
  const [page, setPage] = useState<SalesPage | null>(null);
  const [blocks, setBlocks] = useState<SalesBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [pageSeoTitle, setPageSeoTitle] = useState('');
  const [pageSeoDesc, setPageSeoDesc] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    const [p, b] = await Promise.all([
      supabase.from('sales_pages').select('*').eq('id', pageId).maybeSingle(),
      supabase.from('sales_blocks').select('*').eq('page_id', pageId).order('sort_order'),
    ]);
    setPage(p.data as SalesPage);
    setPageSeoTitle((p.data as SalesPage)?.seo_title || '');
    setPageSeoDesc((p.data as SalesPage)?.seo_description || '');
    setBlocks((b.data as SalesBlock[]) ?? []);
    setLoading(false);
  }, [pageId, user]);

  useEffect(() => {
    load();
  }, [load]);

  async function addBlock(type: BlockType) {
    if (!user || !page) return;
    const sortOrder = blocks.length;
    const defaultContent: Record<string, string> = {
      heading: 'Novo título',
      text: 'Escreva seu texto aqui...',
      image: '',
      button: 'Clique aqui',
      spacer: '',
      divider: '',
    };
    const defaultSettings: Record<string, BlockSettings> = {
      heading: { fontSize: '3xl', align: 'center', color: '#0f172a', fontWeight: 'bold' },
      text: { fontSize: 'base', align: 'left', color: '#334155' },
      image: { align: 'center', imageRounded: true },
      button: { align: 'center', buttonUrl: '#', buttonBg: '#0f172a', buttonColor: '#ffffff' },
      spacer: { spacerHeight: 32 },
      divider: { color: '#e2e8f0' },
    };
    const { data, error } = await supabase
      .from('sales_blocks')
      .insert({
        page_id: page.id,
        user_id: user.id,
        block_type: type,
        content: defaultContent[type],
        settings: defaultSettings[type] || {},
        sort_order: sortOrder,
      })
      .select()
      .single();
    if (!error && data) {
      setBlocks([...blocks, data as SalesBlock]);
    }
    setShowAddMenu(false);
  }

  async function updateBlock(block: SalesBlock, updates: Partial<SalesBlock>) {
    const updated = { ...block, ...updates };
    setBlocks(blocks.map((b) => (b.id === block.id ? updated : b)));
    await supabase.from('sales_blocks').update({
      content: updated.content,
      settings: updated.settings,
    }).eq('id', block.id);
  }

  async function deleteBlock(id: string) {
    await supabase.from('sales_blocks').delete().eq('id', id);
    const updated = blocks.filter((b) => b.id !== id);
    setBlocks(updated);
    for (let i = 0; i < updated.length; i++) {
      await supabase.from('sales_blocks').update({ sort_order: i }).eq('id', updated[i].id);
    }
  }

  async function moveBlock(index: number, dir: -1 | 1) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const updated = [...blocks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setBlocks(updated);
    for (let i = 0; i < updated.length; i++) {
      await supabase.from('sales_blocks').update({ sort_order: i }).eq('id', updated[i].id);
    }
  }

  async function savePage() {
    if (!page) return;
    setSaving(true);
    await supabase.from('sales_pages').update({
      seo_title: pageSeoTitle,
      seo_description: pageSeoDesc,
      updated_at: new Date().toISOString(),
    }).eq('id', page.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function togglePublish() {
    if (!page) return;
    const { error } = await supabase
      .from('sales_pages')
      .update({ is_published: !page.is_published, updated_at: new Date().toISOString() })
      .eq('id', page.id);
    if (!error) {
      setPage({ ...page, is_published: !page.is_published });
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Toolbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/sales')}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{page?.title}</p>
            <p className="text-xs text-slate-400">/p/{page?.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPageSettings(!showPageSettings)}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
            title="Configurações da página"
          >
            <Settings className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={togglePublish}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              page?.is_published
                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {page?.is_published ? 'Despublicar' : 'Publicar'}
          </button>
          <button
            onClick={savePage}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar
          </button>
          {saved && <span className="text-xs text-green-600">Salvo!</span>}
        </div>
      </header>

      {/* Page settings panel */}
      {showPageSettings && (
        <div className="bg-white border-b border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">SEO da página</h3>
            <button onClick={() => setShowPageSettings(false)} className="p-1 rounded hover:bg-slate-100">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <input
            type="text"
            value={pageSeoTitle}
            onChange={(e) => setPageSeoTitle(e.target.value)}
            placeholder="Título SEO"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400"
          />
          <textarea
            value={pageSeoDesc}
            onChange={(e) => setPageSeoDesc(e.target.value)}
            placeholder="Descrição SEO (meta description)"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 resize-none"
          />
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Blocks */}
          <div className="space-y-1">
            {blocks.map((block, index) => (
              <BlockEditor
                key={block.id}
                block={block}
                isEditing={editingBlock === block.id}
                onEdit={() => setEditingBlock(editingBlock === block.id ? null : block.id)}
                onUpdate={(updates) => updateBlock(block, updates)}
                onDelete={() => deleteBlock(block.id)}
                onMoveUp={() => moveBlock(index, -1)}
                onMoveDown={() => moveBlock(index, 1)}
                canMoveUp={index > 0}
                canMoveDown={index < blocks.length - 1}
              />
            ))}
          </div>

          {/* Add block */}
          {showAddMenu ? (
            <div className="mt-2 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-slate-700">Adicionar bloco</p>
                <button onClick={() => setShowAddMenu(false)} className="p-1 rounded hover:bg-slate-100">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {BLOCK_TYPES.map((bt) => (
                  <button
                    key={bt.type}
                    onClick={() => addBlock(bt.type)}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 transition"
                  >
                    <bt.icon className="w-5 h-5 text-slate-500" />
                    <span className="text-xs font-medium text-slate-600">{bt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddMenu(true)}
              className="w-full mt-2 py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 hover:border-cyan-400 hover:text-cyan-500 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Adicionar bloco
            </button>
          )}

          {/* Preview link */}
          {page?.is_published && (
            <div className="mt-6 text-center">
              <a
                href={`#/p/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-cyan-600 hover:text-cyan-500 font-medium"
              >
                Ver página publicada →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BlockEditor({
  block,
  isEditing,
  onEdit,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  block: SalesBlock;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (updates: Partial<SalesBlock>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const settings = block.settings as unknown as BlockSettings;
  const [localContent, setLocalContent] = useState(block.content);

  function updateSettings(updates: Partial<BlockSettings>) {
    onUpdate({ settings: { ...settings, ...updates } });
  }

  function renderPreview() {
    const fontSize = FONT_SIZES[settings.fontSize || 'base'] || 'text-base';
    const align = ALIGN[settings.align || 'left'] || 'text-left';

    switch (block.block_type) {
      case 'heading':
        return (
          <p
            className={`${fontSize} ${align} ${settings.fontWeight === 'bold' ? 'font-bold' : 'font-normal'}`}
            style={{ color: settings.color || '#0f172a' }}
          >
            {block.content || 'Novo título'}
          </p>
        );
      case 'text':
        return (
          <p
            className={`${fontSize} ${align} whitespace-pre-wrap`}
            style={{ color: settings.color || '#334155' }}
          >
            {block.content || 'Escreva seu texto aqui...'}
          </p>
        );
      case 'image':
        return block.content ? (
          <div className={align === 'text-center' ? 'flex justify-center' : align === 'text-right' ? 'flex justify-end' : ''}>
            <img
              src={block.content}
              alt=""
              className={`max-w-full max-h-80 object-cover ${settings.imageRounded ? 'rounded-xl' : ''}`}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 bg-slate-100 rounded-lg text-slate-400 text-sm">
            <ImageIcon className="w-6 h-6" />
          </div>
        );
      case 'button':
        return (
          <div className={align === 'text-center' ? 'flex justify-center' : align === 'text-right' ? 'flex justify-end' : ''}>
            <span
              className="px-6 py-3 rounded-xl font-medium text-sm"
              style={{
                backgroundColor: settings.buttonBg || '#0f172a',
                color: settings.buttonColor || '#ffffff',
              }}
            >
              {block.content || 'Clique aqui'}
            </span>
          </div>
        );
      case 'spacer':
        return <div style={{ height: settings.spacerHeight || 32 }} />;
      case 'divider':
        return <hr style={{ borderColor: settings.color || '#e2e8f0' }} className="border-t" />;
      default:
        return null;
    }
  }

  function renderEditor() {
    return (
      <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
        {(block.block_type === 'heading' || block.block_type === 'text') && (
          <>
            <textarea
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              onBlur={() => onUpdate({ content: localContent })}
              placeholder={block.block_type === 'heading' ? 'Título' : 'Texto'}
              rows={block.block_type === 'heading' ? 1 : 4}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 resize-none"
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={settings.fontSize || 'base'}
                onChange={(e) => updateSettings({ fontSize: e.target.value })}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
              >
                {Object.keys(FONT_SIZES).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={settings.align || 'left'}
                onChange={(e) => updateSettings({ align: e.target.value })}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
                <option value="right">Direita</option>
              </select>
              <label className="flex items-center gap-1 text-xs text-slate-500">
                Cor:
                <input
                  type="color"
                  value={settings.color || '#334155'}
                  onChange={(e) => updateSettings({ color: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer border border-slate-200"
                />
              </label>
              {block.block_type === 'heading' && (
                <label className="flex items-center gap-1 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={settings.fontWeight === 'bold'}
                    onChange={(e) => updateSettings({ fontWeight: e.target.checked ? 'bold' : 'normal' })}
                  />
                  Negrito
                </label>
              )}
            </div>
          </>
        )}

        {block.block_type === 'image' && (
          <>
            <input
              type="url"
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              onBlur={() => onUpdate({ content: localContent })}
              placeholder="URL da imagem"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400"
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={settings.align || 'center'}
                onChange={(e) => updateSettings({ align: e.target.value })}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
                <option value="right">Direita</option>
              </select>
              <label className="flex items-center gap-1 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={settings.imageRounded ?? true}
                  onChange={(e) => updateSettings({ imageRounded: e.target.checked })}
                />
                Cantos arredondados
              </label>
            </div>
          </>
        )}

        {block.block_type === 'button' && (
          <>
            <input
              type="text"
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              onBlur={() => onUpdate({ content: localContent })}
              placeholder="Texto do botão"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400"
            />
            <input
              type="url"
              value={settings.buttonUrl || '#'}
              onChange={(e) => updateSettings({ buttonUrl: e.target.value })}
              placeholder="URL de destino"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400"
            />
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-1 text-xs text-slate-500">
                Fundo:
                <input
                  type="color"
                  value={settings.buttonBg || '#0f172a'}
                  onChange={(e) => updateSettings({ buttonBg: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer border border-slate-200"
                />
              </label>
              <label className="flex items-center gap-1 text-xs text-slate-500">
                Texto:
                <input
                  type="color"
                  value={settings.buttonColor || '#ffffff'}
                  onChange={(e) => updateSettings({ buttonColor: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer border border-slate-200"
                />
              </label>
              <select
                value={settings.align || 'center'}
                onChange={(e) => updateSettings({ align: e.target.value })}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
                <option value="right">Direita</option>
              </select>
            </div>
          </>
        )}

        {block.block_type === 'spacer' && (
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Altura:
            <input
              type="number"
              value={settings.spacerHeight || 32}
              onChange={(e) => updateSettings({ spacerHeight: parseInt(e.target.value) || 32 })}
              className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-lg"
            />
            px
          </label>
        )}

        {block.block_type === 'divider' && (
          <label className="flex items-center gap-1 text-xs text-slate-500">
            Cor:
            <input
              type="color"
              value={settings.color || '#e2e8f0'}
              onChange={(e) => updateSettings({ color: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer border border-slate-200"
            />
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="group relative">
      {/* Controls */}
      <div className="absolute -left-10 top-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="p-1 rounded bg-white border border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="p-1 rounded bg-white border border-slate-200 text-slate-400 hover:text-slate-600 disabled:opacity-30"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded bg-white border border-slate-200 text-slate-400 hover:text-red-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        className={`relative p-4 bg-white rounded-xl border transition cursor-pointer ${
          isEditing ? 'border-cyan-400 shadow-sm' : 'border-slate-200 hover:border-slate-300'
        }`}
        onClick={onEdit}
      >
        {isEditing ? renderEditor() : renderPreview()}
      </div>
    </div>
  );
}
