import { shortDate, yearOf } from './dates';
import type { Person } from './schema';

/** Palette des pastilles d'initiales (reprise de la maquette). */
export const TINTS = ['#5b6e63', '#8a6f4b', '#6a6f86', '#7d6a6a', '#6e7a5a', '#866a78'];

export function fullName(p: Person | undefined): string {
  if (!p) return 'Inconnu';
  const n = `${p.given} ${p.surname}`.trim();
  return n || 'Sans nom';
}

export function firstName(p: Person | undefined): string {
  if (!p) return 'Inconnu';
  return p.given.split(/\s+/)[0] || p.surname || 'Sans nom';
}

/** « de Margaret », « d’Eleanor » (élision devant une voyelle ou un h muet probable). */
export function de(name: string): string {
  return /^[aeiouyhàâéèêëîïôöûüœ]/i.test(name) ? `d’${name}` : `de ${name}`;
}

export function initials(p: Person | undefined): string {
  if (!p) return '?';
  const a = p.given.trim()[0] ?? '';
  const b = p.surname.trim()[0] ?? '';
  return (a + b).toUpperCase() || '?';
}

/** Couleur stable dérivée de l'identifiant. */
export function tintOf(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function isDeceased(p: Person): boolean {
  return p.deceased || !!p.death.date;
}

export function isLiving(p: Person, now = new Date().getFullYear()): boolean {
  if (isDeceased(p)) return false;
  const by = yearOf(p.birth.date);
  return by === null || now - by < 105;
}

const agree = (p: Person, m: string, f: string, u: string) => (p.sex === 'M' ? m : p.sex === 'F' ? f : u);

/** « 1931 – 2019 », « née en 1984 », « † 1952 », « Dates inconnues ». */
export function lifespan(p: Person | undefined): string {
  if (!p) return '';
  const b = shortDate(p.birth.date);
  const d = shortDate(p.death.date);
  if (b && d) return `${b} – ${d}`;
  if (b && p.deceased) return `${b} – ?`;
  if (b) return `${agree(p, 'né', 'née', 'né(e)')} en ${b}`;
  if (d) return `† ${d}`;
  if (p.deceased) return agree(p, 'Décédé', 'Décédée', 'Décédé(e)');
  return 'Dates inconnues';
}

export function subtitle(p: Person): string {
  return p.role || p.occupation || '';
}

export function bornLabel(p: Person): string {
  return agree(p, 'Né', 'Née', 'Né(e)');
}

export function diedLabel(p: Person): string {
  return agree(p, 'Décédé', 'Décédée', 'Décédé(e)');
}

/** Comparaison insensible aux accents et à la casse, pour la recherche. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function matchesQuery(p: Person, q: string): boolean {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  const hay = fold([p.given, p.surname, p.birthSurname, p.role, p.occupation, p.birth.place].filter(Boolean).join(' '));
  return words.every((w) => hay.includes(w));
}
