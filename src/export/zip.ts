import { zip, type Zippable } from 'fflate';
import type { Archive } from '../data/schema';
import type { StorageAdapter } from '../storage/StorageAdapter';
import { serialize } from '../storage/StorageAdapter';

/** Archive complète (données + photos originales) dans un seul fichier ZIP. */
export async function buildZip(archive: Archive, adapter: StorageAdapter, progress: (ratio: number) => void): Promise<{ blob: Blob; missing: number }> {
  const files: Zippable = {
    'archive.json': new TextEncoder().encode(serialize(archive)),
  };
  let missing = 0;
  for (const [i, m] of archive.media.entries()) {
    progress(i / Math.max(1, archive.media.length));
    try {
      // Les photos sont déjà compressées : on les range sans les recompresser (level 0).
      files[m.file] = [new Uint8Array(await (await adapter.readFile(m.file)).arrayBuffer()), { level: 0 }];
    } catch {
      missing++;
    }
  }
  const data = await new Promise<Uint8Array>((resolve, reject) => zip(files, { level: 6 }, (err, out) => (err ? reject(err) : resolve(out))));
  progress(1);
  return { blob: new Blob([data as BlobPart], { type: 'application/zip' }), missing };
}
