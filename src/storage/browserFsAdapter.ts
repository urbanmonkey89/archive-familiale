/**
 * Stockage via l'API File System Access (Edge, Chrome, Chromium).
 * Sert pendant le développement (`npm run dev`) et comme solution de secours
 * si l'application installée n'est pas disponible.
 */
import { del, get, set } from 'idb-keyval';
import { parseArchive } from '../data/migrations';
import { emptyArchive, type Archive } from '../data/schema';
import { resizeImage } from './images';
import {
  ARCHIVE_FILE, BACKUP_DIR, MAX_BACKUPS, MEDIA_DIR, THUMB_DIR,
  backupName, serialize, type ImportedFile, type StorageAdapter,
} from './StorageAdapter';

const LAST_KEY = 'derniere-archive';

export function browserFsSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

async function dirAt(root: FileSystemDirectoryHandle, path: string, create: boolean): Promise<FileSystemDirectoryHandle> {
  let d = root;
  for (const part of path.split('/').filter(Boolean)) d = await d.getDirectoryHandle(part, { create });
  return d;
}

async function fileAt(root: FileSystemDirectoryHandle, path: string, create = false): Promise<FileSystemFileHandle> {
  const parts = path.split('/');
  const name = parts.pop()!;
  const dir = await dirAt(root, parts.join('/'), create);
  return dir.getFileHandle(name, { create });
}

async function writeFile(root: FileSystemDirectoryHandle, path: string, data: Blob | string) {
  const h = await fileAt(root, path, true);
  // createWritable écrit dans un fichier temporaire, remplacé d'un coup à close() : pas de fichier à moitié écrit.
  const w = await h.createWritable();
  await w.write(data);
  await w.close();
}

async function exists(root: FileSystemDirectoryHandle, path: string): Promise<boolean> {
  try {
    await fileAt(root, path);
    return true;
  } catch {
    return false;
  }
}

export class BrowserFsAdapter implements StorageAdapter {
  readonly kind = 'browser' as const;
  readonly readOnly = false;
  private urls = new Map<string, string>();

  private constructor(private root: FileSystemDirectoryHandle, private fresh: Archive | null) {}

  get label() {
    return this.root.name;
  }

  /** Choisir un dossier : `create` = nouvelle archive (dossier vide ou existant). */
  static async pick(create: boolean, title?: string): Promise<BrowserFsAdapter> {
    const root = await window.showDirectoryPicker({ id: 'archive-famille', mode: 'readwrite' });
    const has = await exists(root, ARCHIVE_FILE);
    if (!create && !has) throw new Error(`Le dossier « ${root.name} » ne contient pas de fichier ${ARCHIVE_FILE}. Choisissez le dossier de l'archive, ou créez une nouvelle archive.`);
    if (create && has) throw new Error(`Le dossier « ${root.name} » contient déjà une archive. Utilisez « Ouvrir une archive existante ».`);
    await set(LAST_KEY, root);
    return new BrowserFsAdapter(root, create ? emptyArchive(title) : null);
  }

  /** Dernière archive ouverte (la permission doit souvent être redemandée par un clic). */
  static async last(): Promise<{ name: string; granted: boolean; reopen: () => Promise<BrowserFsAdapter> } | null> {
    if (!browserFsSupported()) return null;
    const root = (await get(LAST_KEY)) as FileSystemDirectoryHandle | undefined;
    if (!root) return null;
    const granted = (await root.queryPermission({ mode: 'readwrite' })) === 'granted';
    return {
      name: root.name,
      granted,
      reopen: async () => {
        if ((await root.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error('Accès au dossier refusé.');
        return new BrowserFsAdapter(root, null);
      },
    };
  }

  static async forget() {
    await del(LAST_KEY);
  }

  async load(): Promise<Archive> {
    if (this.fresh) {
      const a = this.fresh;
      this.fresh = null;
      await this.save(a);
      return a;
    }
    const f = await (await fileAt(this.root, ARCHIVE_FILE)).getFile();
    let raw: unknown;
    try {
      raw = JSON.parse(await f.text());
    } catch {
      throw new Error(`${ARCHIVE_FILE} est illisible (JSON invalide). Restaurez une copie depuis le dossier ${BACKUP_DIR}.`);
    }
    return parseArchive(raw);
  }

  async save(archive: Archive) {
    await writeFile(this.root, ARCHIVE_FILE, serialize(archive));
  }

  async backup() {
    if (!(await exists(this.root, ARCHIVE_FILE))) return;
    const src = await (await fileAt(this.root, ARCHIVE_FILE)).getFile();
    await writeFile(this.root, `${BACKUP_DIR}/${backupName()}`, src);
    const dir = await dirAt(this.root, BACKUP_DIR, true);
    const names: string[] = [];
    for await (const [name, h] of dir.entries()) if (h.kind === 'file' && name.endsWith('.json')) names.push(name);
    names.sort();
    for (const old of names.slice(0, Math.max(0, names.length - MAX_BACKUPS))) await dir.removeEntry(old);
  }

  async importMedia(file: Blob, id: string, ext: string): Promise<ImportedFile> {
    const path = `${MEDIA_DIR}/${id}.${ext}`;
    await writeFile(this.root, path, file);
    const thumb = await resizeImage(file, 480, 0.8);
    const thumbPath = `${THUMB_DIR}/${id}.jpg`;
    await writeFile(this.root, thumbPath, thumb.blob);
    const full = await createImageBitmap(file);
    const r = { file: path, thumb: thumbPath, width: full.width, height: full.height };
    full.close();
    return r;
  }

  async mediaUrl(path: string): Promise<string> {
    const hit = this.urls.get(path);
    if (hit) return hit;
    const blob = await this.readFile(path);
    const url = URL.createObjectURL(blob);
    this.urls.set(path, url);
    return url;
  }

  async readFile(path: string): Promise<Blob> {
    return (await fileAt(this.root, path)).getFile();
  }
}
