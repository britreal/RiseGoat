import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { PageHeader, Card, Spinner, EmptyState } from '@/components/ui';
import { Plus, Trash2, GripVertical, Eye, EyeOff, ExternalLink, Link2 } from 'lucide-react';
import type { Link } from '@/types';

const ICON_OPTIONS = [
  'link', 'instagram', 'spotify', 'soundcloud', 'youtube', 'twitter',
  'github', 'globe', 'mail', 'phone', 'music', 'mic', 'headphones',
  'camera', 'shopping-bag', 'calendar', 'map-pin', 'star', 'heart',
];

export function LinksPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newIcon, setNewIcon] = useState('link');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('links')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setLinks((data as Link[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  async function addLink() {
    if (!user || !newLabel.trim() || !newUrl.trim()) return;
    const sortOrder = links.length;
    const { data, error } = await supabase
      .from('links')
      .insert({
        user_id: user.id,
        label: newLabel,
        url: newUrl,
        icon: newIcon,
        sort_order: sortOrder,
      })
      .select()
      .single();
    if (!error && data) {
      setLinks([...links, data as Link]);
      setNewLabel('');
      setNewUrl('');
      setNewIcon('link');
      setAdding(false);
    }
  }

  async function deleteLink(id: string) {
    const { error } = await supabase.from('links').delete().eq('id', id);
    if (!error) setLinks(links.filter((l) => l.id !== id));
  }

  async function toggleActive(link: Link) {
    const { error } = await supabase
      .from('links')
      .update({ is_active: !link.is_active })
      .eq('id', link.id);
    if (!error) {
      setLinks(links.map((l) => (l.id === link.id ? { ...l, is_active: !l.is_active } : l)));
    }
  }

  async function moveLink(index: number, dir: -1 | 1) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= links.length) return;
    const updated = [...links];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setLinks(updated);
    for (let i = 0; i < updated.length; i++) {
      await supabase.from('links').update({ sort_order: i }).eq('id', updated[i].id);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Links"
        subtitle="Os botões que aparecem na sua página pública"
        action={
          <button
            onClick={() => setAdding(!adding)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition"
          >
            <Plus className="w-4 h-4" /> Novo link
          </button>
        }
      />

      {adding && (
        <Card className="p-5 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Texto</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Instagram"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">URL</label>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  onClick={() => setNewIcon(icon)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                    newIcon === icon
                      ? 'border-cyan-400 bg-cyan-50 text-cyan-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addLink}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition"
            >
              Adicionar
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2 text-slate-500 text-sm font-medium rounded-lg hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
          </div>
        </Card>
      )}

      {links.length === 0 && !adding ? (
        <Card>
          <EmptyState icon={Link2} title="Nenhum link ainda" subtitle="Adicione seus links sociais e personalizados" />
        </Card>
      ) : (
        <div className="space-y-2">
          {links.map((link, index) => (
            <Card key={link.id} className="p-4 flex items-center gap-3 group">
              <div className="flex flex-col">
                <button
                  onClick={() => moveLink(index, -1)}
                  disabled={index === 0}
                  className="text-slate-300 hover:text-slate-600 disabled:opacity-30"
                >
                  <GripVertical className="w-4 h-4 rotate-180" />
                </button>
                <button
                  onClick={() => moveLink(index, 1)}
                  disabled={index === links.length - 1}
                  className="text-slate-300 hover:text-slate-600 disabled:opacity-30"
                >
                  <GripVertical className="w-4 h-4" />
                </button>
              </div>

              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4 text-slate-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-800 truncate">{link.label}</p>
                  {!link.is_active && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded">oculto</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">{link.url}</p>
              </div>

              <span className="text-xs text-slate-400 hidden sm:block">{link.clicks} cliques</span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleActive(link)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition"
                  title={link.is_active ? 'Ocultar' : 'Mostrar'}
                >
                  {link.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => deleteLink(link.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
