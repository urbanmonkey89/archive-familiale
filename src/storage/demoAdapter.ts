import type { Archive } from '../data/schema';
import { sampleArchive } from '../data/sample';
import { resizeImage } from './images';
import type { ImportedFile, StorageAdapter } from './StorageAdapter';

/** Famille d'exemple en mémoire : on peut tout essayer, rien n'est enregistré. */
export class DemoAdapter implements StorageAdapter {
  readonly kind = 'demo' as const;
  readonly readOnly = false;
  readonly label = 'Exemple';
  private blobs = new Map<string, Blob>();
  private urls = new Map<string, string>();

  async load(): Promise<Archive> {
    return sampleArchive();
  }
  async save() {}
  async backup() {}

  async importMedia(file: Blob, id: string, ext: string): Promise<ImportedFile> {
    const path = `medias/${id}.${ext}`;
    const thumb = await resizeImage(file, 480, 0.8);
    this.blobs.set(path, file);
    this.blobs.set(`medias/miniatures/${id}.jpg`, thumb.blob);
    const bmp = await createImageBitmap(file);
    const r = { file: path, thumb: `medias/miniatures/${id}.jpg`, width: bmp.width, height: bmp.height };
    bmp.close();
    return r;
  }

  async mediaUrl(path: string): Promise<string> {
    const hit = this.urls.get(path);
    if (hit) return hit;
    const blob = this.blobs.get(path);
    if (!blob) throw new Error('absent');
    const url = URL.createObjectURL(blob);
    this.urls.set(path, url);
    return url;
  }

  async readFile(path: string): Promise<Blob> {
    const blob = this.blobs.get(path);
    if (!blob) throw new Error(`Fichier absent : ${path}`);
    return blob;
  }
}
