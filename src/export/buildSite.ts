/**
 * Export du site : recopie l'application (mode lecture seule), les données
 * et des versions allégées des photos dans un dossier prêt à mettre en ligne.
 */
import type { Archive } from '../data/schema';
import { resizeImage } from '../storage/images';
import type { OutputDir } from '../storage/output';
import type { StorageAdapter } from '../storage/StorageAdapter';

export interface SiteReport {
  files: number;
  photos: number;
  missingPhotos: string[];
}

const PHOTO_MAX = 1600;
const THUMB_MAX = 480;

export async function buildSite(
  archive: Archive,
  adapter: StorageAdapter,
  out: OutputDir,
  progress: (text: string, ratio: number) => void,
): Promise<SiteReport> {
  // 1. L'application elle-même (liste écrite au moment du build par vite.config.ts).
  const res = await fetch('site-manifest.json').catch(() => null);
  if (!res?.ok) {
    throw new Error("L'export du site n'est disponible que dans l'application installée (ou après « npm run build »), pas en mode développement.");
  }
  const appFiles: string[] = await res.json();
  let files = 0;
  for (const [i, f] of appFiles.entries()) {
    progress('Copie de l’application…', (i / appFiles.length) * 0.2);
    // Les variantes de polices inutiles (cyrillique, vietnamien) restent : elles ne sont chargées que si besoin.
    await out.write(f, await (await fetch(f)).blob());
    files++;
  }
  const html = (await (await fetch('index.html')).text())
    .replace('<html lang="fr">', '<html lang="fr" data-mode="site">')
    .replace('<head>', '<head>\n    <meta name="robots" content="noindex, nofollow" />');
  await out.write('index.html', html);
  await out.write('robots.txt', 'User-agent: *\nDisallow: /\n');
  files += 2;

  // 2. Les photos, redimensionnées (le site reste léger, les originaux restent dans l'archive).
  const missing: string[] = [];
  const media: Archive['media'] = [];
  for (const [i, m] of archive.media.entries()) {
    progress(`Photos ${i + 1} / ${archive.media.length}…`, 0.2 + (i / Math.max(1, archive.media.length)) * 0.75);
    try {
      const blob = await adapter.readFile(m.file);
      const big = await resizeImage(blob, PHOTO_MAX, 0.85);
      const small = await resizeImage(blob, THUMB_MAX, 0.8);
      const file = `medias/${m.id}.jpg`;
      const thumb = `medias/miniatures/${m.id}.jpg`;
      await out.write(file, big.blob);
      await out.write(thumb, small.blob);
      files += 2;
      media.push({ ...m, file, thumb, width: big.width, height: big.height });
    } catch {
      missing.push(m.caption || m.file);
      media.push({ ...m, file: '', thumb: undefined });
    }
  }

  // 3. Les données.
  progress('Données…', 0.97);
  const data: Archive = { ...archive, media };
  await out.write('data.json', JSON.stringify(data));
  files++;
  progress('Terminé', 1);
  return { files, photos: archive.media.length - missing.length, missingPhotos: missing };
}
