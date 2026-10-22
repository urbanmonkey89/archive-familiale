/** Redimensionnement d'images dans le navigateur (miniatures, export du site). */

export interface Resized {
  blob: Blob;
  width: number;
  height: number;
}

export async function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  const bmp = await createImageBitmap(blob);
  const r = { width: bmp.width, height: bmp.height };
  bmp.close();
  return r;
}

/** Réduit l'image pour que son plus grand côté fasse au plus `max` pixels (JPEG). */
export async function resizeImage(blob: Blob, max: number, quality = 0.85): Promise<Resized> {
  const bmp = await createImageBitmap(blob);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const width = Math.max(1, Math.round(bmp.width * scale));
  const height = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const out = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Conversion de l’image impossible'))), 'image/jpeg', quality),
  );
  return { blob: out, width, height };
}

export function extensionOf(name: string): string {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : 'jpg';
}

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
