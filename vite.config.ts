/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' : le build fonctionne depuis n'importe quel dossier
// (site exporté, application Tauri).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  test: { environment: 'node' },
});
