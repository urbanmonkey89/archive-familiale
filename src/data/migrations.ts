import { ArchiveSchema, SCHEMA_VERSION, type Archive } from './schema';

/**
 * Migrations du format archive.json.
 * Clé = version de départ ; la fonction renvoie les données au format version+1.
 * Exemple quand on passera en v2 :
 *   1: (d) => ({ ...d, schemaVersion: 2, persons: d.persons.map(...) }),
 */
const migrations: Record<number, (data: any) => any> = {};

export class ArchiveFormatError extends Error {}

export function parseArchive(raw: unknown): Archive {
  if (!raw || typeof raw !== 'object') throw new ArchiveFormatError('Le fichier archive.json est vide ou illisible.');
  let data: any = raw;
  let version = Number(data.schemaVersion ?? 0);
  if (version > SCHEMA_VERSION) {
    throw new ArchiveFormatError(
      `Cette archive a été créée avec une version plus récente de l'application (format ${version}). Mettez l'application à jour.`,
    );
  }
  while (version < SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) throw new ArchiveFormatError(`Format d'archive inconnu (version ${version}).`);
    data = step(data);
    version = Number(data.schemaVersion);
  }
  const result = ArchiveSchema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new ArchiveFormatError(`archive.json invalide : ${first.path.join('.')} — ${first.message}`);
  }
  return result.data;
}
