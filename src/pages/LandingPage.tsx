import { Archive, ArrowRight, AudioLines, Bell, Check, Clock3, Command, FileCheck2, Folder, Grid2X2, ImagePlus, Lock, Menu, MoreHorizontal, Palette, Search, Share2, Sparkles, Tag, X, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

const benefits = [
  { icon: FileCheck2, title: 'Capture rápido', copy: 'Uma nota aberta em segundos para registrar o que importa agora.' },
  { icon: Folder, title: 'Organize do seu jeito', copy: 'Pastas, cores e marcadores sem transformar a organização em trabalho.' },
  { icon: Tag, title: 'Encontre contexto', copy: 'Busque pelo título, conteúdo e tudo o que você já salvou.' },
  { icon: AudioLines, title: 'Escreva com a voz', copy: 'Grave ideias, mantenha o áudio e transforme fala em texto quando disponível.' },
  { icon: Bell, title: 'Lembre quando importa', copy: 'Use lembretes para tirar as coisas da cabeça e voltar no momento certo.' },
  { icon: Lock, title: 'Seu espaço pessoal', copy: 'A experiência começa pela sua conta e fica separada do resto.' },
];

function PinDot(){ return <span className="landing-pin-dot" aria-hidden="true" />; }

export function LandingPage() {
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.title = 'Notas — seu espaço para pensar';
    return () => { document.title = 'Notas'; };
  }, []);

  const action = session ? '/notes' : '/auth';

  return (
    <div className="landing-shell">
      <div className="landing-noise" />
      <header className="landing-nav">
        <a href="/" className="landing-brand" aria-label="Notas — início">
          <span className="landing-brand-mark">N</span>
          <span>Notas</span>
        </a>

        <nav className={menuOpen ? 'landing-links open' : 'landing-links'}>
          <a href="#recursos" onClick={() => setMenuOpen(false)}>Recursos</a>
          <a href="#filosofia" onClick={() => setMenuOpen(false)}>Filosofia</a>
          <a href={action} className="landing-nav-cta" onClick={() => setMenuOpen(false)}>
            {session ? 'Abrir Notas' : 'Entrar'}
          </a>
          <button className="landing-mobile-close" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={18} /></button>
        </nav>

        <button className="landing-menu" onClick={() => setMenuOpen(true)} aria-label="Abrir menu"><Menu size={19} /></button>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow"><Sparkles size={13} /> Feito para pensar</div>
            <h1>Capture antes que esqueça.<br /><em>Organize sem complicar.</em></h1>
            <p>Notas é um espaço pessoal para ideias, listas, referências e pensamentos. Abra, escreva e volte para o que importa.</p>
            <div className="landing-actions">
              <a href={action} className="landing-primary">Começar a escrever <ArrowRight size={17} /></a>
              <a href="#recursos" className="landing-secondary">Conhecer o Notas</a>
            </div>
            <div className="landing-meta"><span><Check size={14} /> Sem curva de aprendizado</span><span><Check size={14} /> Sincronizado</span><span><Check size={14} /> Pensado para uso diário</span></div>
          </div>

          <div className="landing-product-wrap" aria-label="Prévia do aplicativo Notas">
            <div className="landing-glow" />
            <div className="landing-window landing-app-preview">
              <div className="landing-window-top">
                <div className="window-dots"><i /><i /><i /></div>
                <div className="window-search"><Search size={13} /><span>Buscar notas...</span><kbd><Command size={10} /> K</kbd></div>
                <div className="window-avatar">N</div>
              </div>
              <div className="landing-window-body landing-app-body">
                <aside className="landing-app-sidebar">
                  <div className="landing-app-brand"><span className="landing-brand-mark small">N</span><div><strong>Notas</strong><small>Espaço pessoal</small></div></div>
                  <div className="landing-app-new"><Plus size={11}/> Nova nota <kbd>⌘N</kbd></div>
                  <span className="landing-app-section">Biblioteca</span>
                  <div className="landing-app-nav active"><Grid2X2 size={11}/> Todas <b>8</b></div>
                  <div className="landing-app-folder-heading"><span>Pastas</span><MoreHorizontal size={10}/></div>
                  <div className="landing-app-nav"><Folder size={11}/> Produto <b>3</b></div>
                  <div className="landing-app-nav"><Folder size={11}/> Estudos <b>2</b></div>
                  <div className="landing-app-nav"><Folder size={11}/> Ideias <b>4</b></div>
                  <div className="landing-app-nav"><Archive size={11}/> Arquivo</div>
                  <div className="landing-app-nav"><span className="landing-app-trash-dot" /> Lixeira</div>
                </aside>
                <div className="landing-app-main">
                  <div className="landing-app-heading">
                    <div><span>Seu espaço</span><strong>Todas as notas</strong></div>
                    <b>8</b>
                  </div>
                  <div className="landing-app-grid">
                    <article className="landing-note-card warm">
                      <div className="landing-note-top"><span>Hoje</span><small>12:42</small></div>
                      <strong>Uma ideia simples pode mudar tudo.</strong>
                      <p>Não precisa de um sistema complicado. Precisa de um lugar para pensar.</p>
                      <div className="landing-note-tags"><i>ideia</i><i>produto</i></div>
                      <div className="landing-note-actions"><Palette size={10}/><Clock3 size={10}/><Share2 size={10}/><ImagePlus size={10}/><Archive size={10}/><MoreHorizontal size={10}/></div>
                    </article>
                    <article className="landing-note-card yellow">
                      <div className="landing-note-top"><span>Hoje</span><small>09:18</small></div>
                      <strong>Lista da manhã</strong>
                      <p>Escrever. Caminhar. Fazer uma coisa importante.</p>
                      <div className="landing-note-actions"><Palette size={10}/><Clock3 size={10}/><Share2 size={10}/><ImagePlus size={10}/><Archive size={10}/><MoreHorizontal size={10}/></div>
                    </article>
                    <article className="landing-note-card blue">
                      <div className="landing-note-top"><span>Ontem</span><small>18:05</small></div>
                      <strong>Para lembrar</strong>
                      <p>Voltar para a ideia do produto mínimo e testar com alguém.</p>
                      <div className="landing-note-tags"><i>teste</i></div>
                      <div className="landing-note-actions"><Palette size={10}/><Clock3 size={10}/><Share2 size={10}/><ImagePlus size={10}/><Archive size={10}/><MoreHorizontal size={10}/></div>
                    </article>
                    <article className="landing-note-card green">
                      <div className="landing-note-top"><span>Ontem</span><small>16:27</small></div>
                      <strong>Leitura</strong>
                      <p>Uma boa nota preserva contexto, não apenas palavras.</p>
                      <div className="landing-note-actions"><Palette size={10}/><Clock3 size={10}/><Share2 size={10}/><ImagePlus size={10}/><Archive size={10}/><MoreHorizontal size={10}/></div>
                    </article>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="filosofia" className="landing-statement">
          <p className="landing-eyebrow">Menos interface. Mais pensamento.</p>
          <h2>Seu espaço não precisa competir<br />com a sua atenção.</h2>
          <p>O Notas foi desenhado para desaparecer quando você começa a escrever.</p>
        </section>

        <section className="landing-usecases">
          <div className="landing-usecase-copy">
            <p className="landing-eyebrow">Do primeiro pensamento ao arquivo</p>
            <h2>Uma nota pode ser pequena.<br /><em>O contexto não precisa ser.</em></h2>
            <p>Separe ideias por pastas, use cores para enxergar o que merece atenção e deixe a busca fazer o trabalho pesado.</p>
            <div className="landing-usecase-list">
              <div><Folder size={16}/><span><strong>Pastas</strong><small>Crie espaços diferentes sem perder a visão geral.</small></span></div>
              <div><Tag size={16}/><span><strong>Marcadores</strong><small>Conecte assuntos sem mover a nota de lugar.</small></span></div>
              <div><AudioLines size={16}/><span><strong>Áudio</strong><small>Registre uma ideia no instante em que ela surgir.</small></span></div>
            </div>
          </div>
          <div className="landing-feature-preview landing-editor-preview">
            <div className="landing-editor-toolbar">
              <span className="landing-editor-back">‹</span>
              <div><small>Salvo</small><b>•</b></div>
              <div className="landing-editor-icons"><PinDot /><Archive size={10}/><Clock3 size={10}/><Share2 size={10}/><Tag size={10}/><Folder size={10}/><MoreHorizontal size={10}/></div>
            </div>
            <div className="landing-editor-tabs"><span className="active">Texto</span><span>Checklist</span><span>Imagem</span><span>Desenho</span><span>Áudio</span></div>
            <div className="landing-editor-content">
              <small>CRIADA HOJE</small>
              <strong>Uma ideia para testar amanhã.</strong>
              <p>Proposta simples, primeira versão, feedback rápido. O editor real mantém o foco no conteúdo.</p>
              <div className="landing-editor-labels"><i>produto</i><i>teste</i></div>
            </div>
            <div className="landing-editor-footer"><span>Neutro</span><span>Salvo automaticamente</span></div>
          </div>
        </section>

        <section id="recursos" className="landing-features">
          <div className="landing-section-head">
            <p className="landing-eyebrow">Tudo o que importa</p>
            <h2>Ferramentas que ficam<br />no seu caminho — não na sua frente.</h2>
          </div>
          <div className="landing-feature-grid">
            {benefits.map(({ icon: Icon, title, copy }) => (
              <article key={title} className="landing-feature">
                <div className="feature-icon"><Icon size={17} /></div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-final">
          <div className="landing-final-inner">
            <div><p className="landing-eyebrow">Comece agora</p><h2>Abra espaço<br />para uma ideia.</h2></div>
            <a href={action} className="landing-primary">Abrir o Notas <ArrowRight size={17} /></a>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <span>Notas</span>
        <span>Um lugar para pensar.</span>
      </footer>
    </div>
  );
}
