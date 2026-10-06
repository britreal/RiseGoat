import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

type NotasInstallPrompt = {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

declare global {
  interface Window {
    __notasInstallPrompt?: NotasInstallPrompt;
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  window.__notasInstallPrompt = event as unknown as NotasInstallPrompt;
  window.dispatchEvent(new Event('pwa-install-available'));
});

window.addEventListener('appinstalled', () => {
  window.__notasInstallPrompt = undefined;
  window.dispatchEvent(new Event('pwa-install-available'));
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').then((registration) => registration.update()).catch(() => undefined);
  }, { once: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
