import { sortKeyOf, yearOf } from './dates';
import { de, firstName, fullName } from './people';
import type { Archive, Media, Person, Place, Story, Union } from './schema';

/** Index de recherche rapide, recalculé à chaque modification de l'archive. */
export interface Index {
  person: Map<string, Person>;
  union: Map<string, Union>;
  place: Map<string, Place>;
  media: Map<string, Media>;
  story: Map<string, Story>;
  /** Unions où la personne est partenaire, triées par date de début. */
  unionsOf: Map<string, Union[]>;
  /** Union dont la personne est l'enfant. */
  parentUnionOf: Map<string, Union>;
  mediaOfPerson: Map<string, Media[]>;
  mediaOfPlace: Map<string, Media[]>;
  storiesOfPerson: Map<string, Story[]>;
  placesOfPerson: Map<string, Place[]>;
}

const cache = new WeakMap<Archive, Index>();

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const arr = m.get(k);
  if (arr) arr.push(v);
  else m.set(k, [v]);
}

export function getIndex(a: Archive): Index {
  const hit = cache.get(a);
  if (hit) return hit;
  const ix: Index = {
    person: new Map(a.persons.map((p) => [p.id, p])),
    union: new Map(a.unions.map((u) => [u.id, u])),
    place: new Map(a.places.map((p) => [p.id, p])),
    media: new Map(a.media.map((m) => [m.id, m])),
    story: new Map(a.stories.map((s) => [s.id, s])),
    unionsOf: new Map(),
    parentUnionOf: new Map(),
    mediaOfPerson: new Map(),
    mediaOfPlace: new Map(),
    storiesOfPerson: new Map(),
    placesOfPerson: new Map(),
  };
  for (const u of a.unions) {
    for (const pid of u.partners) push(ix.unionsOf, pid, u);
    for (const cid of u.children) if (!ix.parentUnionOf.has(cid)) ix.parentUnionOf.set(cid, u);
  }
  for (const list of ix.unionsOf.values()) list.sort(byStart);
  for (const m of a.media) {
    for (const pid of m.personIds) push(ix.mediaOfPerson, pid, m);
    for (const plid of m.placeIds) push(ix.mediaOfPlace, plid, m);
  }
  for (const s of a.stories) for (const pid of s.personIds) push(ix.storiesOfPerson, pid, s);
  for (const pl of a.places) for (const pid of pl.personIds) push(ix.placesOfPerson, pid, pl);
  cache.set(a, ix);
  return ix;
}

function byStart(a: Union, b: Union): number {
  return (sortKeyOf(a.start) ?? Infinity) - (sortKeyOf(b.start) ?? Infinity);
}

export function byBirth(a: Person, b: Person): number {
  return (sortKeyOf(a.birth.date) ?? Infinity) - (sortKeyOf(b.birth.date) ?? Infinity);
}

export function parentsOf(ix: Index, id: string): Person[] {
  const u = ix.parentUnionOf.get(id);
  return u ? (u.partners.map((p) => ix.person.get(p)).filter(Boolean) as Person[]) : [];
}

export interface Partnership {
  union: Union;
  partner?: Person;
}

export function partnershipsOf(ix: Index, id: string): Partnership[] {
  return (ix.unionsOf.get(id) ?? []).map((union) => {
    const other = union.partners.find((p) => p !== id);
    return { union, partner: other ? ix.person.get(other) : undefined };
  });
}

export function childrenOfUnion(ix: Index, u: Union): Person[] {
  return (u.children.map((c) => ix.person.get(c)).filter(Boolean) as Person[]).sort(byBirth);
}

export function childrenOf(ix: Index, id: string): Person[] {
  const seen = new Set<string>();
  const out: Person[] = [];
  for (const u of ix.unionsOf.get(id) ?? []) {
    for (const c of childrenOfUnion(ix, u)) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        out.push(c);
      }
    }
  }
  return out;
}

export function siblingsOf(ix: Index, id: string): Person[] {
  const u = ix.parentUnionOf.get(id);
  return u ? childrenOfUnion(ix, u).filter((p) => p.id !== id) : [];
}

/** Nombre de générations de la plus longue lignée. */
export function generationCount(a: Archive): number {
  const ix = getIndex(a);
  const memo = new Map<string, number>();
  const depth = (id: string, guard: Set<string>): number => {
    const known = memo.get(id);
    if (known !== undefined) return known;
    if (guard.has(id)) return 0;
    guard.add(id);
    let best = 0;
    for (const u of ix.unionsOf.get(id) ?? []) for (const c of u.children) best = Math.max(best, depth(c, guard));
    guard.delete(id);
    memo.set(id, best + 1);
    return best + 1;
  };
  let max = 0;
  for (const p of a.persons) if (!ix.parentUnionOf.has(p.id)) max = Math.max(max, depth(p.id, new Set()));
  return max;
}

export function earliestYear(a: Archive): number | null {
  let min: number | null = null;
  for (const p of a.persons) {
    const y = yearOf(p.birth.date);
    if (y !== null && (min === null || y < min)) min = y;
  }
  return min;
}

export interface Suggestion {
  text: string;
  personId: string;
  action: 'edit' | 'photo' | 'story' | 'open';
}

/** Suggestions « À compléter » de la page d'accueil. */
export function suggestions(a: Archive, max = 4): Suggestion[] {
  const ix = getIndex(a);
  const out: Suggestion[] = [];
  for (const p of a.persons) {
    if (out.length >= max) break;
    if (!p.birth.date) out.push({ text: `Date de naissance ${de(fullName(p))} ?`, personId: p.id, action: 'edit' });
    else if (!p.portraitId && !(ix.mediaOfPerson.get(p.id)?.length)) out.push({ text: `Ajouter une photo ${de(firstName(p))}`, personId: p.id, action: 'photo' });
    else if (!p.bio && !(ix.storiesOfPerson.get(p.id)?.length)) out.push({ text: `Raconter un souvenir ${de(firstName(p))}`, personId: p.id, action: 'story' });
  }
  return out;
}

export interface Change {
  kind: 'person' | 'place' | 'media' | 'story';
  id: string;
  label: string;
  at: string;
  personId?: string;
}

export function recentChanges(a: Archive, max = 5): Change[] {
  const all: Change[] = [
    ...a.persons.map((p) => ({ kind: 'person' as const, id: p.id, label: `Fiche ${de(fullName(p))}`, at: p.updatedAt, personId: p.id })),
    ...a.places.map((p) => ({ kind: 'place' as const, id: p.id, label: `Lieu « ${p.name} »`, at: p.updatedAt })),
    ...a.media.map((m) => ({ kind: 'media' as const, id: m.id, label: `Photo « ${m.caption || 'sans titre'} »`, at: m.updatedAt, personId: m.personIds[0] })),
    ...a.stories.map((s) => ({ kind: 'story' as const, id: s.id, label: `Récit « ${s.title} »`, at: s.updatedAt, personId: s.personIds[0] })),
  ];
  return all.sort((x, y) => y.at.localeCompare(x.at)).slice(0, max);
}

const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

export function timeAgo(iso: string, now = Date.now()): string {
  const s = (new Date(iso).getTime() - now) / 1000;
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year'],
  ];
  let v = s;
  for (const [n, unit] of steps) {
    if (Math.abs(v) < n) return rtf.format(Math.round(v), unit);
    v /= n;
  }
  return '';
}
