import type { Archive } from '../data/schema';

/** Résultat de l'import d'une photo dans le dossier de l'archive. */
export interface ImportedFile {
  file: string;
  thumb?: string;
  width?: number;
  height?: number;
}

/**
 * Accès au dossier « Archive Famille ». Une implémentation par environnement :
 *  - browser : Edge/Chrome via l'API File System Access (développement, secours)
 *  - tauri   : application installée (Windows / Linux)
 *  - demo    : famille d'exemple en mémoire, rien n'est enregistré
 *  - static  : site publié, lecture seule
 */
export interface StorageAdapter {
  readonly kind: 'browser' | 'tauri' | 'demo' | 'static';
  readonly readOnly: boolean;
  /** Nom affiché du dossier ouvert. */
  readonly label: string;
  load(): Promise<Archive>;
  save(archive: Archive): Promise<void>;
  /** Copie horodatée de archive.json dans sauvegardes/ (on garde les 20 dernières). */
  backup(): Promise<void>;
  importMedia(file: Blob, id: string, ext: string): Promise<ImportedFile>;
  /** URL affichable d'un fichier de l'archive (chemin relatif). */
  mediaUrl(path: string): Promise<string>;
  /** Lecture brute d'un fichier de l'archive (export du site, ZIP). */
  readFile(path: string): Promise<Blob>;
}

export const ARCHIVE_FILE = 'archive.json';
export const MEDIA_DIR = 'medias';
export const THUMB_DIR = 'medias/miniatures';
export const BACKUP_DIR = 'sauvegardes';
export const MAX_BACKUPS = 20;

export function backupName(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `archive-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}h${p(d.getMinutes())}m${p(d.getSeconds())}.json`;
}

export function serialize(archive: Archive): string {
  return JSON.stringify({ ...archive, meta: { ...archive.meta, updatedAt: new Date().toISOString() } }, null, 2);
}
