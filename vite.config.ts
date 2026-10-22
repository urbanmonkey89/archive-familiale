/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const version: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;

/**
 * Écrit la liste des fichiers produits par le build (site-manifest.json).
 * L'export du site s'en sert pour recopier l'application en mode « lecture seule ».
 */
function siteManifest(): Plugin {
  return {
    name: 'site-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      this.emitFile({ type: 'asset', fileName: 'site-manifest.json', source: JSON.stringify(files) });
    },
  };
}

// base './' : le build fonctionne depuis n'importe quel dossier
// (site exporté, application Tauri).
export default defineConfig({
  base: './',
  plugins: [react(), siteManifest()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: { port: 5173, strictPort: true },
  test: { environment: 'node' },
});
