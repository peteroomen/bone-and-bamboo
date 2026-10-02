import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/ui/App';
import { registerSW } from 'virtual:pwa-register';
import { registerFaces } from '@/ui/art/icons';
import { initPwa } from '@/ui/state/pwa';
import '@/ui/styles/global.css';
import '@/ui/styles/game.css';

registerFaces();

const worker = import.meta.env.PROD && !navigator.webdriver;
initPwa(worker);
if (worker) registerSW({ immediate: true });

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
