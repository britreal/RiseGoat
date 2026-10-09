import { Check, Download, LogOut, Moon, Monitor, Settings as SettingsIcon, Sun, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

type Theme='system'|'light'|'dark';
type SettingsPageProps = {
  open: boolean;
  onClose: () => void;
  onThemeChange: (theme: Theme) => void;
};

export function SettingsPage({ open, onClose, onThemeChange }: SettingsPageProps) {
  const { user, signOut } = useAuth();
  const [theme, setTheme] = useState<Theme>((localStorage.getItem('notes-theme') as Theme) || 'system');
  const [installAvailable, setInstallAvailable] = useState(Boolean(window.__notasInstallPrompt));
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const sync = () => setInstallAvailable(Boolean(window.__notasInstallPrompt));
    window.addEventListener('pwa-install-available', sync);
    return () => window.removeEventListener('pwa-install-available', sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    setTheme((localStorage.getItem('notes-theme') as Theme) || 'system');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const selectTheme = (value: Theme) => {
    setTheme(value);
    localStorage.setItem('notes-theme', value);
    onThemeChange(value);
  };

  const installApp = async () => {
    const prompt = window.__notasInstallPrompt;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    window.__notasInstallPrompt = undefined;
    setInstallAvailable(false);
  };

  return (
    <div className="settings-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title">
        <header className="settings-header">
          <div className="settings-header-mark"><SettingsIcon size={19}/></div>
          <div className="settings-heading">
            <h1 id="settings-dialog-title">Configurações</h1>
            <p>Personalize sua experiência no Notas.</p>
          </div>
          <button ref={closeButtonRef} type="button" className="settings-close" onClick={onClose} aria-label="Fechar configurações"><X size={18}/></button>
        </header>

        <main className="settings-main">
          <section className="settings-section">
            <div className="settings-section-title">
              <h2>Aparência</h2>
              <p>Escolha como o Notas aparece para você.</p>
            </div>
            <div className="settings-group settings-theme-group">
              <button type="button" className={theme === 'system' ? 'selected' : ''} aria-pressed={theme === 'system'} onClick={() => selectTheme('system')}>
                <Monitor size={19}/><span><strong>Sistema</strong><small>Segue a aparência do dispositivo</small></span>{theme === 'system' && <Check size={17}/>}
              </button>
              <button type="button" className={theme === 'light' ? 'selected' : ''} aria-pressed={theme === 'light'} onClick={() => selectTheme('light')}>
                <Sun size={19}/><span><strong>Claro</strong><small>Interface clara e limpa</small></span>{theme === 'light' && <Check size={17}/>}
              </button>
              <button type="button" className={theme === 'dark' ? 'selected' : ''} aria-pressed={theme === 'dark'} onClick={() => selectTheme('dark')}>
                <Moon size={19}/><span><strong>Escuro</strong><small>Confortável para ambientes escuros</small></span>{theme === 'dark' && <Check size={17}/>}
              </button>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section-title">
              <h2>Aplicativo</h2>
              <p>Use o Notas como um aplicativo no seu dispositivo.</p>
            </div>
            <div className="settings-group settings-account">
              <div><strong>Instalar o Notas</strong><small>{installAvailable ? 'Adicione à tela inicial ou ao computador.' : 'A opção aparece quando o navegador permitir a instalação.'}</small></div>
              {installAvailable && <button type="button" className="settings-install" onClick={() => void installApp()}><Download size={16}/><span>Instalar app</span></button>}
            </div>
          </section>

          <section className="settings-section settings-account-section">
            <div className="settings-section-title">
              <h2>Conta</h2>
              <p>Gerencie sua sessão e acesso ao Notas.</p>
            </div>
            <div className="settings-group settings-account">
              <div><strong>Conta conectada</strong><small title={user?.email || ''}>{user?.email || 'Usuário autenticado'}</small></div>
              <button type="button" className="settings-danger" onClick={() => { onClose(); void signOut(); }}><LogOut size={16}/><span>Sair da conta</span></button>
            </div>
          </section>
        </main>
      </section>
    </div>
  );
}
