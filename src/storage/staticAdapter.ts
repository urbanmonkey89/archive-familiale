import { parseArchive } from '../data/migrations';
import type { Archive } from '../data/schema';
import type { StorageAdapter } from './StorageAdapter';

/** Site publié : lit data.json à côté de la page, aucune modification possible. */
export class StaticAdapter implements StorageAdapter {
  readonly kind = 'static' as const;
  readonly readOnly = true;
  readonly label = 'Site';

  async load(): Promise<Archive> {
    const res = await fetch('data.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('Impossible de charger les données du site.');
    return parseArchive(await res.json());
  }
  async save() {
    throw new Error('Site en lecture seule.');
  }
  async backup() {}
  async importMedia(): Promise<never> {
    throw new Error('Site en lecture seule.');
  }
  async mediaUrl(path: string) {
    return path;
  }
  async readFile(path: string) {
    return (await fetch(path)).blob();
  }
}

/** Le site exporté contient un marqueur dans index.html. */
export function isStaticSite(): boolean {
  return document.documentElement.dataset.mode === 'site';
}
