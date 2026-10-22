import { z } from 'zod';

/**
 * Format du fichier archive.json.
 * Toute modification incompatible doit incrémenter SCHEMA_VERSION
 * et ajouter une migration dans migrations.ts.
 */
export const SCHEMA_VERSION = 1;

// Les dates sont saisies librement (« vers 1890 », « 12/03/1931 », « avant 1900 »…)
// et interprétées par dates.ts pour le tri et l'affichage.
const text = z.string().optional();
const ids = z.array(z.string()).default([]);
const stamp = z.string().default(() => new Date().toISOString());

export const LifeEventSchema = z.object({
  date: text,
  place: text,
});

export const EventSchema = z.object({
  id: z.string(),
  date: text,
  title: z.string(),
  detail: text,
  place: text,
});

export const SexSchema = z.enum(['M', 'F', 'U']);

export const PersonSchema = z.object({
  id: z.string(),
  given: z.string().default(''),
  surname: z.string().default(''),
  birthSurname: text,
  sex: SexSchema.default('U'),
  birth: LifeEventSchema.default({}),
  death: LifeEventSchema.default({}),
  /** true = décédé(e) même sans date connue. */
  deceased: z.boolean().default(false),
  occupation: text,
  /** Libellé libre affiché sous le nom (« Grand-mère », « Le boulanger »…). */
  role: text,
  bio: text,
  notes: text,
  branchId: text,
  portraitId: text,
  events: z.array(EventSchema).default([]),
  updatedAt: stamp,
});

export const UnionStatusSchema = z.enum(['married', 'partner', 'divorced', 'widowed', 'separated', 'unknown']);

/** Une union relie 0 à 2 parents et leurs enfants (équivalent FAM en GEDCOM). */
export const UnionSchema = z.object({
  id: z.string(),
  partners: z.array(z.string()).max(2).default([]),
  status: UnionStatusSchema.default('married'),
  start: text,
  end: text,
  place: text,
  children: ids,
  updatedAt: stamp,
});

export const PlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().default('Maison'),
  location: text,
  era: text,
  blurb: text,
  story: text,
  personIds: ids,
  branchId: text,
  coverId: text,
  updatedAt: stamp,
});

export const MediaSchema = z.object({
  id: z.string(),
  /** Chemin relatif au dossier de l'archive, ex. « medias/ab12cd.jpg ». */
  file: z.string(),
  /** Miniature (≈400 px), ex. « medias/miniatures/ab12cd.jpg ». */
  thumb: text,
  caption: z.string().default(''),
  date: text,
  personIds: ids,
  placeIds: ids,
  width: z.number().optional(),
  height: z.number().optional(),
  updatedAt: stamp,
});

export const StorySchema = z.object({
  id: z.string(),
  title: z.string(),
  author: text,
  text: z.string().default(''),
  date: text,
  personIds: ids,
  placeIds: ids,
  mediaIds: ids,
  updatedAt: stamp,
});

export const BranchSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string(),
});

export const ArchiveSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  meta: z.object({
    title: z.string().default('Notre famille'),
    subtitle: text,
    homePersonId: text,
    createdAt: stamp,
    updatedAt: stamp,
  }),
  persons: z.array(PersonSchema).default([]),
  unions: z.array(UnionSchema).default([]),
  places: z.array(PlaceSchema).default([]),
  media: z.array(MediaSchema).default([]),
  stories: z.array(StorySchema).default([]),
  branches: z.array(BranchSchema).default([]),
});

export type LifeEvent = z.infer<typeof LifeEventSchema>;
export type TimelineEvent = z.infer<typeof EventSchema>;
export type Sex = z.infer<typeof SexSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type UnionStatus = z.infer<typeof UnionStatusSchema>;
export type Union = z.infer<typeof UnionSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type Media = z.infer<typeof MediaSchema>;
export type Story = z.infer<typeof StorySchema>;
export type Branch = z.infer<typeof BranchSchema>;
export type Archive = z.infer<typeof ArchiveSchema>;

export function emptyArchive(title = 'Notre famille'): Archive {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { title, createdAt: now, updatedAt: now },
    persons: [],
    unions: [],
    places: [],
    media: [],
    stories: [],
    branches: [],
  };
}

export function newId(prefix: string): string {
  const rnd = crypto.getRandomValues(new Uint32Array(2));
  return prefix + '_' + rnd[0].toString(36) + rnd[1].toString(36).slice(0, 3);
}
