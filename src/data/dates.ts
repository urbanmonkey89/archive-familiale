/**
 * Dates généalogiques « floues » : l'utilisateur tape ce qu'il sait,
 * on en déduit une année et une clé de tri.
 *   « 1931 », « 12/03/1931 », « 12 mars 1931 », « mars 1931 », « 1931-03-12 »,
 *   « vers 1890 », « avant 1900 », « après 1900 », « 1890-1895 », « entre 1890 et 1895 »,
 *   ainsi que le format GEDCOM (« 12 MAR 1931 », « ABT 1890 », « BEF 1900 »…).
 */

export type Qualifier = 'exact' | 'about' | 'before' | 'after' | 'between';

export interface ParsedDate {
  qualifier: Qualifier;
  year: number;
  month?: number;
  day?: number;
  /** Fin de l'intervalle pour « entre … et … ». */
  yearEnd?: number;
  sortKey: number;
}

const MONTHS: Record<string, number> = {
  janvier: 1, janv: 1, jan: 1, january: 1,
  fevrier: 2, fevr: 2, fev: 2, feb: 2, february: 2,
  mars: 3, mar: 3, march: 3,
  avril: 4, avr: 4, apr: 4, april: 4,
  mai: 5, may: 5,
  juin: 6, jun: 6, june: 6,
  juillet: 7, juil: 7, jul: 7, july: 7,
  aout: 8, aug: 8, august: 8,
  septembre: 9, sept: 9, sep: 9, september: 9,
  octobre: 10, oct: 10, october: 10,
  novembre: 11, nov: 11, november: 11,
  decembre: 12, dec: 12, december: 12,
};

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

interface Core { year: number; month?: number; day?: number }

function parseCore(s: string): Core | null {
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return mk(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) return mk(+m[3], +m[2], +m[1]);
  if ((m = s.match(/^(\d{1,2})[/.-](\d{4})$/))) return mk(+m[2], +m[1]);
  if ((m = s.match(/^(\d{1,2})(?:er)? ([a-z]+)\.? (\d{4})$/))) {
    const mo = MONTHS[m[2]];
    return mo ? mk(+m[3], mo, +m[1]) : null;
  }
  if ((m = s.match(/^([a-z]+)\.? (\d{4})$/))) {
    const mo = MONTHS[m[1]];
    return mo ? mk(+m[2], mo) : null;
  }
  if ((m = s.match(/^(\d{3,4})$/))) return mk(+m[1]);
  return null;
}

function mk(year: number, month?: number, day?: number): Core | null {
  if (month !== undefined && (month < 1 || month > 12)) return null;
  if (day !== undefined && (day < 1 || day > 31)) return null;
  return { year, month, day };
}

function key(c: Core): number {
  return c.year * 10000 + (c.month ?? 0) * 100 + (c.day ?? 0);
}

export function parseGenDate(input: string | undefined | null): ParsedDate | null {
  if (!input) return null;
  let s = normalize(input);
  if (!s) return null;

  let m: RegExpMatchArray | null;
  // Intervalles
  if ((m = s.match(/^(?:entre|bet) (.+) (?:et|and) (.+)$/)) || (m = s.match(/^(\d{4}) ?[-–/] ?(\d{4})$/)) || (m = s.match(/^(?:de|from) (.+) (?:a|to) (.+)$/))) {
    const a = parseCore(m[1]);
    const b = parseCore(m[2]);
    if (a && b) return { qualifier: 'between', year: a.year, month: a.month, day: a.day, yearEnd: b.year, sortKey: key(a) };
  }

  let qualifier: Qualifier = 'exact';
  const prefixes: [RegExp, Qualifier][] = [
    [/^(?:vers|v\.|v|env\.?|environ|~|ca\.?|circa|abt|about|est|cal)\s*/, 'about'],
    [/^(?:avant|av\.?|bef\.?|before|<)\s*/, 'before'],
    [/^(?:apres|ap\.?|aft\.?|after|>)\s*/, 'after'],
  ];
  for (const [re, q] of prefixes) {
    if (re.test(s)) {
      s = s.replace(re, '');
      qualifier = q;
      break;
    }
  }
  const core = parseCore(s);
  if (!core) return null;
  return { qualifier, ...core, sortKey: key(core) };
}

export function yearOf(input: string | undefined | null): number | null {
  return parseGenDate(input)?.year ?? null;
}

export function sortKeyOf(input: string | undefined | null): number | null {
  return parseGenDate(input)?.sortKey ?? null;
}

/** Forme courte pour les cartes : « 1931 », « v. 1890 », « av. 1900 », « 1890–1895 ». */
export function shortDate(input: string | undefined | null): string {
  if (!input) return '';
  const d = parseGenDate(input);
  if (!d) return input.trim();
  switch (d.qualifier) {
    case 'about': return `v. ${d.year}`;
    case 'before': return `av. ${d.year}`;
    case 'after': return `ap. ${d.year}`;
    case 'between': return `${d.year}–${d.yearEnd}`;
    default: return String(d.year);
  }
}

/** Forme longue pour les fiches : « 12 mars 1931 », « vers 1890 », « entre 1890 et 1895 ». */
export function longDate(input: string | undefined | null): string {
  if (!input) return '';
  const d = parseGenDate(input);
  if (!d) return input.trim();
  const core = (d.day ? `${d.day === 1 ? '1er' : d.day} ` : '') + (d.month ? `${MONTH_NAMES[d.month - 1]} ` : '') + d.year;
  switch (d.qualifier) {
    case 'about': return `vers ${core}`;
    case 'before': return `avant ${core}`;
    case 'after': return `après ${core}`;
    case 'between': return `entre ${core} et ${d.yearEnd}`;
    default: return core;
  }
}

/** Période d'une union ou d'un lieu : « 1953–2011 », « depuis 1985 », « jusqu'en 1982 ». */
export function span(start?: string, end?: string): string {
  const a = shortDate(start);
  const b = shortDate(end);
  if (a && b) return `${a}–${b}`;
  if (a) return `depuis ${a}`;
  if (b) return `jusqu'en ${b}`;
  return '';
}
