import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// No web-components import: the React wrappers register the kai-* tags they render.
import '@kitn.ai/ui/theme.tokens.css'; // plain --color-* tokens for the shell (NOT the tailwind source)
import './index.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
