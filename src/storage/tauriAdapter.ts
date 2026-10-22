/** Stockage de l'application installée (Tauri) : accès direct au disque. */
import { convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { exists, mkdir, readDir, readFile, readTextFile, remove, rename, writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { parseArchive } from '../data/migrations';
import { emptyArchive, type Archive } from '../data/schema';
import { resizeImage } from './images';
import type { Platform } from './platform';
import {
  ARCHIVE_FILE, BACKUP_DIR, MAX_BACKUPS, MEDIA_DIR, THUMB_DIR,
  backupName, serialize, type ImportedFile, type StorageAdapter,
} from './StorageAdapter';

const LAST_KEY = 'derniere-archive';

function join(root: string, rel: string): string {
  const sep = root.includes('\\') ? '\\' : '/';
  return root.replace(/[\\/]+$/, '') + sep + rel.split('/').join(sep);
}

function baseName(path: string): string {
  return path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || path;
}

async function ensureDir(path: string) {
  if (!(await exists(path))) await mkdir(path, { recursive: true });
}

class TauriAdapter implements StorageAdapter {
  readonly kind = 'tauri' as const;
  readonly readOnly = false;

  constructor(private root: string, private fresh: Archive | null) {}

  get label() {
    return baseName(this.root);
  }

  async load(): Promise<Archive> {
    if (this.fresh) {
      const a = this.fresh;
      this.fresh = null;
      await this.save(a);
      return a;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(await readTextFile(join(this.root, ARCHIVE_FILE)));
    } catch {
      throw new Error(`${ARCHIVE_FILE} est illisible. Restaurez une copie depuis le dossier ${BACKUP_DIR}.`);
    }
    return parseArchive(raw);
  }

  async save(archive: Archive) {
    // Écriture dans un fichier temporaire puis remplacement : jamais de fichier à moitié écrit.
    const tmp = join(this.root, ARCHIVE_FILE + '.tmp');
    await writeTextFile(tmp, serialize(archive));
    await rename(tmp, join(this.root, ARCHIVE_FILE));
  }

  async backup() {
    const src = join(this.root, ARCHIVE_FILE);
    if (!(await exists(src))) return;
    const dir = join(this.root, BACKUP_DIR);
    await ensureDir(dir);
    await writeFile(join(dir, backupName()), await readFile(src));
    const names = (await readDir(dir)).filter((e) => e.isFile && e.name.endsWith('.json')).map((e) => e.name).sort();
    for (const old of names.slice(0, Math.max(0, names.length - MAX_BACKUPS))) await remove(join(dir, old));
  }

  async importMedia(file: Blob, id: string, ext: string): Promise<ImportedFile> {
    await ensureDir(join(this.root, THUMB_DIR));
    const path = `${MEDIA_DIR}/${id}.${ext}`;
    await writeFile(join(this.root, path), new Uint8Array(await file.arrayBuffer()));
    const thumb = await resizeImage(file, 480, 0.8);
    const thumbPath = `${THUMB_DIR}/${id}.jpg`;
    await writeFile(join(this.root, thumbPath), new Uint8Array(await thumb.blob.arrayBuffer()));
    const bmp = await createImageBitmap(file);
    const r = { file: path, thumb: thumbPath, width: bmp.width, height: bmp.height };
    bmp.close();
    return r;
  }

  async mediaUrl(path: string): Promise<string> {
    const abs = join(this.root, path);
    if (!(await exists(abs))) throw new Error('absent');
    return convertFileSrc(abs);
  }

  async readFile(path: string): Promise<Blob> {
    return new Blob([await readFile(join(this.root, path))]);
  }
}

async function pickFolder(title: string): Promise<string | null> {
  const r = await open({ directory: true, multiple: false, title });
  return typeof r === 'string' ? r : null;
}

class Cancelled extends DOMException {
  constructor() {
    super('Annulé', 'AbortError');
  }
}

export const tauriPlatform: Platform = {
  name: 'tauri',
  async createArchive(title) {
    const root = await pickFolder('Choisir (ou créer) le dossier de la nouvelle archive');
    if (!root) throw new Cancelled();
    if (await exists(join(root, ARCHIVE_FILE))) throw new Error(`Le dossier « ${baseName(root)} » contient déjà une archive. Utilisez « Ouvrir une archive existante ».`);
    localStorage.setItem(LAST_KEY, root);
    return new TauriAdapter(root, emptyArchive(title));
  },
  async openArchive() {
    const root = await pickFolder('Choisir le dossier de l’archive');
    if (!root) throw new Cancelled();
    if (!(await exists(join(root, ARCHIVE_FILE)))) throw new Error(`Le dossier « ${baseName(root)} » ne contient pas de fichier ${ARCHIVE_FILE}.`);
    localStorage.setItem(LAST_KEY, root);
    return new TauriAdapter(root, null);
  },
  async lastArchive() {
    const root = localStorage.getItem(LAST_KEY);
    if (!root || !(await exists(join(root, ARCHIVE_FILE)).catch(() => false))) return null;
    return { name: baseName(root), granted: true, reopen: async () => new TauriAdapter(root, null) };
  },
  async forgetLast() {
    localStorage.removeItem(LAST_KEY);
  },
};
