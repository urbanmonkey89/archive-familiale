/**
 * Toutes les modifications de l'archive passent par ces fonctions.
 * Elles reçoivent un « brouillon » immer (qu'on peut modifier directement)
 * et garantissent la cohérence des liens (unions, tags des photos, etc.).
 */
import { newId, type Archive, type Branch, type Media, type Person, type Place, type Story, type Union, type UnionStatus } from './schema';

const now = () => new Date().toISOString();

export class FamilyError extends Error {}

function personOrThrow(a: Archive, id: string): Person {
  const p = a.persons.find((x) => x.id === id);
  if (!p) throw new FamilyError('Personne introuvable.');
  return p;
}

function unionOrThrow(a: Archive, id: string): Union {
  const u = a.unions.find((x) => x.id === id);
  if (!u) throw new FamilyError('Union introuvable.');
  return u;
}

function parentUnion(a: Archive, childId: string): Union | undefined {
  return a.unions.find((u) => u.children.includes(childId));
}

function newUnion(a: Archive, partners: string[], extra: Partial<Union> = {}): Union {
  const u: Union = { id: newId('u'), partners, status: partners.length === 2 ? 'married' : 'unknown', children: [], updatedAt: now(), ...extra };
  a.unions.push(u);
  return u;
}

/** Une union n'a de sens que si elle relie au moins deux personnes. */
function pruneUnions(a: Archive) {
  a.unions = a.unions.filter((u) => u.partners.length + u.children.length >= 2);
}

function touchPeople(a: Archive, ids: string[]) {
  const t = now();
  for (const p of a.persons) if (ids.includes(p.id)) p.updatedAt = t;
}

// ───────────────────────── Personnes ─────────────────────────

export type PersonInput = Omit<Person, 'id' | 'updatedAt' | 'events'> & { events?: Person['events'] };

export type Relation =
  | { kind: 'none' }
  | { kind: 'child'; of: string; /** id d'union, ou 'single' = autre parent inconnu */ unionId: string }
  | { kind: 'partner'; of: string; status: UnionStatus; start?: string; end?: string }
  | { kind: 'parent'; of: string }
  | { kind: 'sibling'; of: string };

export function addPerson(a: Archive, input: PersonInput, rel: Relation = { kind: 'none' }): string {
  // Vérifications avant toute modification
  if (rel.kind === 'parent') {
    const u = parentUnion(a, rel.of);
    if (u && u.partners.length >= 2) throw new FamilyError('Cette personne a déjà deux parents.');
  }
  if (rel.kind !== 'none') personOrThrow(a, rel.of);

  const id = newId('p');
  a.persons.push({ events: [], ...input, id, updatedAt: now() });

  switch (rel.kind) {
    case 'child': {
      let u = rel.unionId !== 'single' ? a.unions.find((x) => x.id === rel.unionId) : undefined;
      if (!u) u = a.unions.find((x) => x.partners.length === 1 && x.partners[0] === rel.of) ?? newUnion(a, [rel.of]);
      u.children.push(id);
      u.updatedAt = now();
      break;
    }
    case 'partner':
      newUnion(a, [rel.of, id], { status: rel.status, start: rel.start || undefined, end: rel.end || undefined });
      break;
    case 'parent': {
      const u = parentUnion(a, rel.of);
      if (u) {
        u.partners.push(id);
        if (u.partners.length === 2 && u.status === 'unknown') u.status = 'married';
        u.updatedAt = now();
      } else newUnion(a, [id], { children: [rel.of] });
      break;
    }
    case 'sibling': {
      const u = parentUnion(a, rel.of) ?? newUnion(a, [], { children: [rel.of] });
      u.children.push(id);
      u.updatedAt = now();
      break;
    }
  }
  if (rel.kind !== 'none') touchPeople(a, [rel.of]);
  if (!a.meta.homePersonId) a.meta.homePersonId = id;
  return id;
}

export function updatePerson(a: Archive, id: string, patch: Partial<Omit<Person, 'id'>>) {
  const p = personOrThrow(a, id);
  Object.assign(p, patch, { updatedAt: now() });
}

export function deletePerson(a: Archive, id: string) {
  a.persons = a.persons.filter((p) => p.id !== id);
  for (const u of a.unions) {
    u.partners = u.partners.filter((x) => x !== id);
    u.children = u.children.filter((x) => x !== id);
  }
  pruneUnions(a);
  for (const m of a.media) m.personIds = m.personIds.filter((x) => x !== id);
  for (const s of a.stories) s.personIds = s.personIds.filter((x) => x !== id);
  for (const pl of a.places) pl.personIds = pl.personIds.filter((x) => x !== id);
  if (a.meta.homePersonId === id) a.meta.homePersonId = a.persons[0]?.id;
}

export function addEvent(a: Archive, personId: string, ev: Omit<Person['events'][number], 'id'>): string {
  const p = personOrThrow(a, personId);
  const id = newId('e');
  p.events.push({ ...ev, id });
  p.updatedAt = now();
  return id;
}

export function updateEvent(a: Archive, personId: string, eventId: string, patch: Partial<Person['events'][number]>) {
  const p = personOrThrow(a, personId);
  const ev = p.events.find((e) => e.id === eventId);
  if (ev) Object.assign(ev, patch);
  p.updatedAt = now();
}

export function deleteEvent(a: Archive, personId: string, eventId: string) {
  const p = personOrThrow(a, personId);
  p.events = p.events.filter((e) => e.id !== eventId);
  p.updatedAt = now();
}

// ───────────────────────── Unions ─────────────────────────

export function linkPartners(a: Archive, aId: string, bId: string, extra: Partial<Union> = {}): string {
  if (aId === bId) throw new FamilyError('Une personne ne peut pas être unie à elle-même.');
  personOrThrow(a, aId);
  personOrThrow(a, bId);
  const exists = a.unions.find((u) => u.partners.includes(aId) && u.partners.includes(bId));
  if (exists) throw new FamilyError('Ces deux personnes sont déjà liées.');
  touchPeople(a, [aId, bId]);
  return newUnion(a, [aId, bId], extra).id;
}

export function updateUnion(a: Archive, id: string, patch: Partial<Omit<Union, 'id'>>) {
  const u = unionOrThrow(a, id);
  Object.assign(u, patch, { updatedAt: now() });
}

export function deleteUnion(a: Archive, id: string) {
  const u = unionOrThrow(a, id);
  touchPeople(a, [...u.partners, ...u.children]);
  a.unions = a.unions.filter((x) => x.id !== id);
}

/** Rattache un enfant existant à une union (en le détachant de ses parents précédents). */
export function attachChild(a: Archive, unionId: string, childId: string) {
  const u = unionOrThrow(a, unionId);
  personOrThrow(a, childId);
  if (u.partners.includes(childId)) throw new FamilyError('Une personne ne peut pas être son propre enfant.');
  if (u.partners.some((p) => isAncestor(a, childId, p))) throw new FamilyError('Impossible : cette personne est déjà un ancêtre de ce couple.');
  for (const other of a.unions) other.children = other.children.filter((c) => c !== childId);
  u.children.push(childId);
  u.updatedAt = now();
  pruneUnions(a);
}

/** `childId` devient l'enfant de `parentId` (dans l'union choisie, ou 'single' = autre parent inconnu). */
function isAncestor(a: Archive, candidate: string, of: string): boolean {
  const seen = new Set<string>();
  const stack = [of];
  while (stack.length) {
    const id = stack.pop()!;
    for (const pid of parentUnion(a, id)?.partners ?? []) {
      if (pid === candidate) return true;
      if (!seen.has(pid)) {
        seen.add(pid);
        stack.push(pid);
      }
    }
  }
  return false;
}

export function linkChild(a: Archive, parentId: string, unionId: string, childId: string) {
  if (parentId === childId) throw new FamilyError('Une personne ne peut pas être son propre enfant.');
  if (isAncestor(a, childId, parentId)) throw new FamilyError('Impossible : cette personne est déjà un ancêtre de l’autre.');
  let u = unionId !== 'single' ? a.unions.find((x) => x.id === unionId) : undefined;
  if (!u) u = a.unions.find((x) => x.partners.length === 1 && x.partners[0] === parentId) ?? newUnion(a, [parentId]);
  attachChild(a, u.id, childId);
  touchPeople(a, [parentId, childId]);
}

/** `parentId` devient un parent de `childId`. */
export function linkParent(a: Archive, childId: string, parentId: string) {
  if (parentId === childId) throw new FamilyError('Une personne ne peut pas être son propre parent.');
  if (isAncestor(a, childId, parentId)) throw new FamilyError('Impossible : cette personne est déjà un ancêtre de l’autre.');
  const u = parentUnion(a, childId);
  if (u) {
    if (u.partners.includes(parentId)) throw new FamilyError('Ce lien existe déjà.');
    if (u.partners.length >= 2) throw new FamilyError('Cette personne a déjà deux parents.');
    u.partners.push(parentId);
    if (u.partners.length === 2 && u.status === 'unknown') u.status = 'married';
    u.updatedAt = now();
  } else {
    linkChild(a, parentId, 'single', childId);
  }
  touchPeople(a, [parentId, childId]);
}

export function linkSibling(a: Archive, aId: string, bId: string) {
  if (aId === bId) throw new FamilyError('Choisissez une autre personne.');
  const ua = parentUnion(a, aId);
  const ub = parentUnion(a, bId);
  if (ua && ub && ua.id === ub.id) throw new FamilyError('Ils sont déjà frères et sœurs.');
  if (ua && ub) throw new FamilyError('Ces deux personnes ont déjà des parents différents. Modifiez plutôt leurs parents.');
  if (ua) attachChild(a, ua.id, bId);
  else if (ub) attachChild(a, ub.id, aId);
  else newUnion(a, [], { children: [aId, bId] });
  touchPeople(a, [aId, bId]);
}

export function detachChild(a: Archive, unionId: string, childId: string) {
  const u = unionOrThrow(a, unionId);
  u.children = u.children.filter((c) => c !== childId);
  u.updatedAt = now();
  pruneUnions(a);
}

// ───────────────────────── Lieux ─────────────────────────

export type PlaceInput = Omit<Place, 'id' | 'updatedAt'>;

export function addPlace(a: Archive, input: PlaceInput): string {
  const id = newId('l');
  a.places.push({ ...input, id, updatedAt: now() });
  return id;
}

export function updatePlace(a: Archive, id: string, patch: Partial<Omit<Place, 'id'>>) {
  const pl = a.places.find((x) => x.id === id);
  if (pl) Object.assign(pl, patch, { updatedAt: now() });
}

export function deletePlace(a: Archive, id: string) {
  a.places = a.places.filter((p) => p.id !== id);
  for (const m of a.media) m.placeIds = m.placeIds.filter((x) => x !== id);
  for (const s of a.stories) s.placeIds = s.placeIds.filter((x) => x !== id);
}

// ───────────────────────── Photos ─────────────────────────

export type MediaInput = Omit<Media, 'id' | 'updatedAt'>;

export function addMedia(a: Archive, input: MediaInput & { id?: string }): string {
  const id = input.id ?? newId('m');
  a.media.push({ ...input, id, updatedAt: now() });
  return id;
}

export function updateMedia(a: Archive, id: string, patch: Partial<Omit<Media, 'id'>>) {
  const m = a.media.find((x) => x.id === id);
  if (m) Object.assign(m, patch, { updatedAt: now() });
}

/** Retire la photo de l'archive. Le fichier reste dans medias/ (rien n'est détruit). */
export function deleteMedia(a: Archive, id: string) {
  a.media = a.media.filter((m) => m.id !== id);
  for (const p of a.persons) if (p.portraitId === id) p.portraitId = undefined;
  for (const pl of a.places) if (pl.coverId === id) pl.coverId = undefined;
  for (const s of a.stories) s.mediaIds = s.mediaIds.filter((x) => x !== id);
}

// ───────────────────────── Récits ─────────────────────────

export type StoryInput = Omit<Story, 'id' | 'updatedAt'>;

export function addStory(a: Archive, input: StoryInput): string {
  const id = newId('r');
  a.stories.push({ ...input, id, updatedAt: now() });
  return id;
}

export function updateStory(a: Archive, id: string, patch: Partial<Omit<Story, 'id'>>) {
  const s = a.stories.find((x) => x.id === id);
  if (s) Object.assign(s, patch, { updatedAt: now() });
}

export function deleteStory(a: Archive, id: string) {
  a.stories = a.stories.filter((s) => s.id !== id);
}

// ───────────────────────── Branches ─────────────────────────

export function addBranch(a: Archive, label: string, color: string): string {
  const id = newId('b');
  a.branches.push({ id, label, color });
  return id;
}

export function updateBranch(a: Archive, id: string, patch: Partial<Omit<Branch, 'id'>>) {
  const b = a.branches.find((x) => x.id === id);
  if (b) Object.assign(b, patch);
}

export function deleteBranch(a: Archive, id: string) {
  a.branches = a.branches.filter((b) => b.id !== id);
  for (const p of a.persons) if (p.branchId === id) p.branchId = undefined;
  for (const pl of a.places) if (pl.branchId === id) pl.branchId = undefined;
}
