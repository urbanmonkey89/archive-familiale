/**
 * Choix du stockage selon l'environnement :
 * application installée (Tauri) ou navigateur Edge/Chrome.
 */
import { BrowserFsAdapter, browserFsSupported } from './browserFsAdapter';
import type { StorageAdapter } from './StorageAdapter';

export interface LastArchive {
  name: string;
  /** true = peut être rouvert sans clic (permission déjà accordée). */
  granted: boolean;
  reopen: () => Promise<StorageAdapter>;
}

export interface Platform {
  name: 'browser' | 'tauri' | 'unsupported';
  createArchive: (title: string) => Promise<StorageAdapter>;
  openArchive: () => Promise<StorageAdapter>;
  lastArchive: () => Promise<LastArchive | null>;
  forgetLast: () => Promise<void>;
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const browserPlatform: Platform = {
  name: 'browser',
  createArchive: (title) => BrowserFsAdapter.pick(true, title),
  openArchive: () => BrowserFsAdapter.pick(false),
  lastArchive: () => BrowserFsAdapter.last(),
  forgetLast: () => BrowserFsAdapter.forget(),
};

const unsupported: Platform = {
  name: 'unsupported',
  createArchive: () => Promise.reject(new Error('Navigateur non compatible.')),
  openArchive: () => Promise.reject(new Error('Navigateur non compatible.')),
  lastArchive: async () => null,
  forgetLast: async () => {},
};

export async function getPlatform(): Promise<Platform> {
  if (isTauri()) return (await import('./tauriAdapter')).tauriPlatform;
  return browserFsSupported() ? browserPlatform : unsupported;
}

/** L'utilisateur a fermé la fenêtre de choix de dossier : ce n'est pas une erreur. */
export function isCancel(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}
