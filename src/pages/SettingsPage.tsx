import { ArrowLeft, Check, LogOut, Moon, Monitor, Sun } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

type Theme='system'|'light'|'dark';

export function SettingsPage(){
  const {user,signOut}=useAuth();
  const [theme,setTheme]=useState<Theme>((localStorage.getItem('notes-theme') as Theme)||'system');
  const selectTheme=(value:Theme)=>{setTheme(value);localStorage.setItem('notes-theme',value);window.location.reload()};
  const goBack=()=>{window.history.pushState({},'','/notes');window.dispatchEvent(new PopStateEvent('popstate'))};

  return <div className="settings-shell">
    <header className="settings-header">
      <button className="settings-back" onClick={goBack}><ArrowLeft size={18}/><span>Notas</span></button>
      <h1>Configurações</h1>
      <div className="settings-header-spacer"/>
    </header>
    <main className="settings-main">
      <section className="settings-section">
        <div className="settings-section-title"><h2>Aparência</h2><p>Personalize como o Notas aparece para você.</p></div>
        <div className="settings-group">
          <button className={theme==='system'?'selected':''} onClick={()=>selectTheme('system')}><Monitor size={19}/><span><strong>Sistema</strong><small>Segue a aparência do seu dispositivo</small></span>{theme==='system'&&<Check size={17}/>}</button>
          <button className={theme==='light'?'selected':''} onClick={()=>selectTheme('light')}><Sun size={19}/><span><strong>Claro</strong><small>Interface clara e limpa</small></span>{theme==='light'&&<Check size={17}/>}</button>
          <button className={theme==='dark'?'selected':''} onClick={()=>selectTheme('dark')}><Moon size={19}/><span><strong>Escuro</strong><small>Confortável para ambientes escuros</small></span>{theme==='dark'&&<Check size={17}/>}</button>
        </div>
      </section>
      <section className="settings-section">
        <div className="settings-section-title"><h2>Conta</h2><p>Sua sessão e acesso ao Notas.</p></div>
        <div className="settings-group settings-account">
          <div><strong>Conta conectada</strong><small>{user?.email||'Usuário autenticado'}</small></div>
          <button className="settings-danger" onClick={()=>void signOut()}><LogOut size={17}/><span>Sair da conta</span></button>
        </div>
      </section>
      <section className="settings-section settings-about">
        <div className="settings-section-title"><h2>Sobre o Notas</h2><p>Seu espaço pessoal para capturar ideias, pensamentos e listas.</p></div>
      </section>
    </main>
  </div>;
}
