import { ArrowRight, AudioLines, Bell, Check, Command, FileCheck2, Folder, Lock, Menu, Search, Sparkles, Tag, X } from 'lucide-react';
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
            <div className="landing-window">
              <div className="landing-window-top">
                <div className="window-dots"><i /><i /><i /></div>
                <div className="window-search"><Search size={13} /><span>Buscar notas...</span><kbd><Command size={10} /> K</kbd></div>
                <div className="window-avatar">N</div>
              </div>
              <div className="landing-window-body">
                <aside>
                  <div className="preview-brand"><span className="landing-brand-mark small">N</span><strong>Notas</strong></div>
                  <div className="preview-new">+ Nova nota</div>
                  <span className="preview-section">Biblioteca</span>
                  <div className="preview-item active">Todas <b>8</b></div>
                  <div className="preview-item">Fixadas <b>2</b></div>
                  <div className="preview-item">Arquivo</div>
                  <div className="preview-item">Lixeira</div>
                </aside>
                <div className="preview-main">
                  <div className="preview-heading"><span>Seu espaço</span><strong>Todas as notas</strong></div>
                  <div className="preview-grid">
                    <article className="preview-note note-cream"><span>Hoje</span><strong>Uma ideia simples pode mudar tudo.</strong><p>Não precisa de um sistema complicado. Precisa de um lugar onde pensar seja fácil.</p></article>
                    <article className="preview-note note-blue"><span>Hoje</span><strong>Lista da manhã</strong><p>Escrever. Caminhar. Fazer uma coisa importante.</p></article>
                    <article className="preview-note note-lilac"><span>Ontem</span><strong>Para lembrar</strong><p>Voltar para a ideia do produto mínimo.</p></article>
                    <article className="preview-note note-green"><span>Ontem</span><strong>Leitura</strong><p>Uma boa nota preserva contexto, não apenas palavras.</p></article>
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
          <div className="landing-feature-preview">
            <div className="feature-preview-top"><span>Hoje</span><b>3 notas</b></div>
            <article><span>Produto</span><strong>Uma ideia para testar amanhã.</strong><p>Proposta simples, primeira versão, feedback rápido.</p><div className="preview-chips"><i>produto</i><i>teste</i></div></article>
            <article className="preview-compact"><span>Áudio</span><strong>Rascunho gravado</strong><p>0:42 · transcrição disponível</p></article>
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
