import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/ui/App';
import { registerFaces } from '@/ui/art/icons';
import '@/ui/styles/global.css';
import '@/ui/styles/game.css';

registerFaces();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
