import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, Loader2 } from 'lucide-react';
import type { SalesPage, SalesBlock } from '@/types';

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

export function PublicSalesPage({ slug }: { slug: string }) {
  const [page, setPage] = useState<SalesPage | null>(null);
  const [blocks, setBlocks] = useState<SalesBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from('sales_pages')
      .select('*')
      .eq('slug', slug.toLowerCase())
      .maybeSingle()
      .then(({ data }) => {
        if (!data || !(data as SalesPage).is_published) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const p = data as SalesPage;
        setPage(p);
        document.title = p.seo_title || p.title;
        if (p.seo_description) {
          let meta = document.querySelector('meta[name="description"]');
          if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'description');
            document.head.appendChild(meta);
          }
          meta.setAttribute('content', p.seo_description);
        }
        supabase
          .from('sales_blocks')
          .select('*')
          .eq('page_id', p.id)
          .order('sort_order')
          .then(({ data: b }) => {
            setBlocks((b as SalesBlock[]) ?? []);
            setLoading(false);
          });
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-center px-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Página não encontrada</h1>
        <p className="text-sm text-slate-400">Esta página de venda não existe ou não está publicada.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {blocks.length === 0 ? (
          <p className="text-center text-slate-400 py-20">Esta página está vazia.</p>
        ) : (
          <div className="space-y-1">
            {blocks.map((block) => {
              const settings = block.settings as unknown as BlockSettings;
              const fontSize = FONT_SIZES[settings.fontSize || 'base'] || 'text-base';
              const align = ALIGN[settings.align || 'left'] || 'text-left';

              switch (block.block_type) {
                case 'heading':
                  return (
                    <div key={block.id} className="py-2">
                      <p
                        className={`${fontSize} ${align} ${settings.fontWeight === 'bold' ? 'font-bold' : 'font-normal'} leading-tight`}
                        style={{ color: settings.color || '#0f172a' }}
                      >
                        {block.content}
                      </p>
                    </div>
                  );
                case 'text':
                  return (
                    <div key={block.id} className="py-2">
                      <p
                        className={`${fontSize} ${align} whitespace-pre-wrap leading-relaxed`}
                        style={{ color: settings.color || '#334155' }}
                      >
                        {block.content}
                      </p>
                    </div>
                  );
                case 'image':
                  return block.content ? (
                    <div key={block.id} className="py-3">
                      <div className={align === 'text-center' ? 'flex justify-center' : align === 'text-right' ? 'flex justify-end' : ''}>
                        <img
                          src={block.content}
                          alt=""
                          className={`max-w-full max-h-96 object-cover ${settings.imageRounded ? 'rounded-xl' : ''}`}
                        />
                      </div>
                    </div>
                  ) : null;
                case 'button':
                  return (
                    <div key={block.id} className="py-3">
                      <div className={align === 'text-center' ? 'flex justify-center' : align === 'text-right' ? 'flex justify-end' : ''}>
                        <a
                          href={settings.buttonUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-6 py-3 rounded-xl font-medium text-sm transition hover:opacity-90"
                          style={{
                            backgroundColor: settings.buttonBg || '#0f172a',
                            color: settings.buttonColor || '#ffffff',
                          }}
                        >
                          {block.content || 'Clique aqui'}
                        </a>
                      </div>
                    </div>
                  );
                case 'spacer':
                  return <div key={block.id} style={{ height: settings.spacerHeight || 32 }} />;
                case 'divider':
                  return <hr key={block.id} style={{ borderColor: settings.color || '#e2e8f0' }} className="border-t my-3" />;
                default:
                  return null;
              }
            })}
          </div>
        )}
      </div>

      <div className="text-center pb-8">
        <a
          href="#/auth"
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-slate-400 transition"
        >
          <Sparkles className="w-3 h-3" />
          Powered by risegoat
        </a>
      </div>
    </div>
  );
}
