import { produce } from 'immer';
import { create } from 'zustand';
import type { StorageAdapter } from '../storage/StorageAdapter';
import type { Archive } from './schema';

type SaveState = 'saved' | 'pending' | 'saving' | 'error';

interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error';
}

interface AppState {
  archive: Archive | null;
  adapter: StorageAdapter | null;
  readOnly: boolean;
  saveState: SaveState;
  saveError?: string;
  toasts: Toast[];
  open: (adapter: StorageAdapter) => Promise<void>;
  close: () => void;
  toast: (text: string, kind?: Toast['kind']) => void;
}

export const useApp = create<AppState>((set, get) => ({
  archive: null,
  adapter: null,
  readOnly: false,
  saveState: 'saved',
  toasts: [],

  open: async (adapter) => {
    const archive = await adapter.load();
    set({ archive, adapter, readOnly: adapter.readOnly, saveState: 'saved', saveError: undefined });
    if (!adapter.readOnly) {
      adapter.backup().catch((e) => console.warn('Sauvegarde automatique impossible', e));
    }
  },

  close: () => set({ archive: null, adapter: null, readOnly: false }),

  toast: (text, kind = 'info') => {
    const id = Date.now() + Math.random();
    set({ toasts: [...get().toasts, { id, text, kind }] });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), kind === 'error' ? 7000 : 3500);
  },
}));

let timer: ReturnType<typeof setTimeout> | undefined;
let saving: Promise<void> | null = null;

async function flushNow() {
  const { archive, adapter } = useApp.getState();
  if (!archive || !adapter || adapter.readOnly) return;
  useApp.setState({ saveState: 'saving' });
  try {
    await adapter.save(archive);
    // Si une modification est arrivée pendant l'écriture, un autre enregistrement est déjà programmé.
    if (useApp.getState().archive === archive) useApp.setState({ saveState: 'saved', saveError: undefined });
  } catch (e) {
    useApp.setState({ saveState: 'error', saveError: e instanceof Error ? e.message : String(e) });
  }
}

/** Enregistre immédiatement les modifications en attente. */
export async function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = undefined;
    saving = flushNow();
  }
  await saving;
}

function scheduleSave() {
  useApp.setState({ saveState: 'pending' });
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = undefined;
    saving = (saving ?? Promise.resolve()).then(flushNow);
  }, 600);
}

/**
 * Applique une modification à l'archive (via les fonctions de actions.ts)
 * puis programme l'enregistrement. Renvoie le résultat de la fonction (ex. nouvel id).
 * Les erreurs (FamilyError) remontent à l'appelant et l'archive n'est pas modifiée.
 */
export function update<T>(fn: (draft: Archive) => T): T {
  const { archive, readOnly } = useApp.getState();
  if (!archive) throw new Error('Aucune archive ouverte.');
  if (readOnly) throw new Error('Lecture seule.');
  let result!: T;
  const next = produce(archive, (d) => {
    result = fn(d as Archive);
  });
  useApp.setState({ archive: next });
  scheduleSave();
  return result;
}

export function useArchive(): Archive {
  const a = useApp((s) => s.archive);
  if (!a) throw new Error('Aucune archive ouverte.');
  return a;
}

export function useCanEdit(): boolean {
  return useApp((s) => !s.readOnly);
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    const s = useApp.getState().saveState;
    if (s === 'pending' || s === 'saving') {
      void flush();
      e.preventDefault();
    }
  });
}
