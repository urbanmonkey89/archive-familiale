/** Écriture de fichiers hors de l'archive : dossier du site exporté, fichier ZIP, GEDCOM. */
import { isCancel, isTauri } from './platform';

export interface OutputDir {
  name: string;
  write(path: string, data: Blob | string): Promise<void>;
}

export { isCancel };

export async function pickOutputDir(): Promise<OutputDir> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { mkdir, writeFile } = await import('@tauri-apps/plugin-fs');
    const root = await open({ directory: true, title: 'Choisir le dossier où créer le site' });
    if (typeof root !== 'string') throw new DOMException('Annulé', 'AbortError');
    const sep = root.includes('\\') ? '\\' : '/';
    const made = new Set<string>();
    return {
      name: root.split(/[\\/]/).pop() || root,
      async write(path, data) {
        const parts = path.split('/');
        const dir = [root, ...parts.slice(0, -1)].join(sep);
        if (!made.has(dir)) {
          await mkdir(dir, { recursive: true });
          made.add(dir);
        }
        const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(await data.arrayBuffer());
        await writeFile([root, ...parts].join(sep), bytes);
      },
    };
  }
  const root = await window.showDirectoryPicker({ id: 'export-site', mode: 'readwrite' });
  return {
    name: root.name,
    async write(path, data) {
      const parts = path.split('/');
      let dir = root;
      for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p, { create: true });
      const w = await (await dir.getFileHandle(parts[parts.length - 1], { create: true })).createWritable();
      await w.write(data);
      await w.close();
    },
  };
}

/** Propose d'enregistrer un fichier (ZIP, GEDCOM…) là où l'utilisateur le souhaite. */
export async function saveFile(name: string, data: Blob): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({ defaultPath: name, title: 'Enregistrer sous…' });
    if (!path) return false;
    await writeFile(path, new Uint8Array(await data.arrayBuffer()));
    return true;
  }
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

export function datedName(base: string, ext: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${base}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.${ext}`;
}
