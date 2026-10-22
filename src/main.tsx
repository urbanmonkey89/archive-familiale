import '@fontsource/spectral/400.css';
import '@fontsource/spectral/500.css';
import '@fontsource/spectral/400-italic.css';
import '@fontsource/mulish/400.css';
import '@fontsource/mulish/600.css';
import '@fontsource/mulish/700.css';
import './theme/app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
