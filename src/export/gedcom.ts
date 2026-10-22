/**
 * GEDCOM 5.5.1 : le format d'échange standard des logiciels de généalogie
 * (Geneanet, Heredis, Gramps, Ancestry, MyHeritage…).
 * On importe et exporte l'essentiel : personnes, noms, sexe, naissances, décès,
 * métiers, notes, événements, unions (mariage, divorce) et filiations.
 */
import { longDate, parseGenDate } from '../data/dates';
import { newId, type Archive, type Person, type Union, type UnionStatus } from '../data/schema';

const GED_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// ───────────────────────── Export ─────────────────────────

export function toGedDate(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const d = parseGenDate(text);
  if (!d) return `(${text.trim()})`;
  const core = (day?: number, month?: number, year?: number) => [day, month ? GED_MONTHS[month - 1] : undefined, year].filter(Boolean).join(' ');
  const c = core(d.day, d.month, d.year);
  switch (d.qualifier) {
    case 'about': return `ABT ${c}`;
    case 'before': return `BEF ${c}`;
    case 'after': return `AFT ${c}`;
    case 'between': return `BET ${c} AND ${d.yearEnd}`;
    default: return c;
  }
}

/** Ligne GEDCOM, découpée en CONT (retour à la ligne) / CONC (suite) si nécessaire. */
function lines(level: number, tag: string, value?: string): string[] {
  if (value === undefined || value === '') return [`${level} ${tag}`];
  const out: string[] = [];
  value.replace(/\r/g, '').split('\n').forEach((para, i) => {
    const chunks = para.match(/.{1,200}/gsu) ?? [''];
    chunks.forEach((chunk, j) => {
      if (i === 0 && j === 0) out.push(`${level} ${tag} ${chunk}`);
      else out.push(`${level + 1} ${j === 0 ? 'CONT' : 'CONC'} ${chunk}`);
    });
  });
  return out;
}

export function exportGedcom(a: Archive, appVersion = '0.1.0'): string {
  const iId = new Map(a.persons.map((p, i) => [p.id, `@I${i + 1}@`]));
  const fId = new Map(a.unions.map((u, i) => [u.id, `@F${i + 1}@`]));
  const out: string[] = [
    '0 HEAD', '1 SOUR ARCHIVE_FAMILIALE', '2 NAME Archive familiale', `2 VERS ${appVersion}`,
    '1 GEDC', '2 VERS 5.5.1', '2 FORM LINEAGE-LINKED', '1 CHAR UTF-8', '1 LANG French',
    ...lines(1, 'NOTE', a.meta.title),
  ];

  const event = (tag: string, date?: string, place?: string, force = false) => {
    if (!date && !place && !force) return [];
    return [force && !date && !place ? `1 ${tag} Y` : `1 ${tag}`, ...(date ? lines(2, 'DATE', toGedDate(date)) : []), ...(place ? lines(2, 'PLAC', place) : [])];
  };

  for (const p of a.persons) {
    const birthName = p.birthSurname || p.surname;
    out.push(`0 ${iId.get(p.id)} INDI`);
    out.push(...lines(1, 'NAME', `${p.given} /${birthName}/`.trim()));
    if (p.given) out.push(...lines(2, 'GIVN', p.given));
    if (birthName) out.push(...lines(2, 'SURN', birthName));
    if (p.birthSurname && p.surname && p.birthSurname !== p.surname) {
      out.push(...lines(1, 'NAME', `${p.given} /${p.surname}/`.trim()), '2 TYPE married');
    }
    out.push(`1 SEX ${p.sex}`);
    out.push(...event('BIRT', p.birth.date, p.birth.place));
    out.push(...event('DEAT', p.death.date, p.death.place, p.deceased));
    if (p.occupation) out.push(...lines(1, 'OCCU', p.occupation));
    for (const e of p.events) {
      out.push(...lines(1, 'EVEN', e.detail), ...lines(2, 'TYPE', e.title));
      if (e.date) out.push(...lines(2, 'DATE', toGedDate(e.date)));
      if (e.place) out.push(...lines(2, 'PLAC', e.place));
    }
    const note = [p.bio, p.notes].filter(Boolean).join('\n\n');
    if (note) out.push(...lines(1, 'NOTE', note));
    for (const u of a.unions) {
      if (u.partners.includes(p.id)) out.push(`1 FAMS ${fId.get(u.id)}`);
      if (u.children.includes(p.id)) out.push(`1 FAMC ${fId.get(u.id)}`);
    }
  }

  const sexOf = (id: string) => a.persons.find((p) => p.id === id)?.sex;
  for (const u of a.unions) {
    out.push(`0 ${fId.get(u.id)} FAM`);
    const [x, y] = u.partners;
    // HUSB / WIFE selon le sexe quand il est connu.
    let husb = x, wife = y;
    if (sexOf(x) === 'F' || sexOf(y) === 'M') [husb, wife] = [y, x];
    if (husb) out.push(`1 HUSB ${iId.get(husb)}`);
    if (wife) out.push(`1 WIFE ${iId.get(wife)}`);
    for (const c of u.children) out.push(`1 CHIL ${iId.get(c)}`);
    if (u.status !== 'partner' && u.status !== 'unknown' && (u.start || u.place || u.status === 'married')) {
      out.push('1 MARR' + (u.start || u.place ? '' : ' Y'), ...(u.start ? lines(2, 'DATE', toGedDate(u.start)) : []), ...(u.place ? lines(2, 'PLAC', u.place) : []));
    }
    if (u.status === 'divorced') out.push('1 DIV' + (u.end ? '' : ' Y'), ...(u.end ? lines(2, 'DATE', toGedDate(u.end)) : []));
    if (u.status === 'partner') out.push('1 _UST COHABITATION');
  }
  out.push('0 TRLR');
  return out.join('\r\n') + '\r\n';
}

// ───────────────────────── Import ─────────────────────────

interface Node {
  tag: string;
  xref?: string;
  value: string;
  children: Node[];
}

function parseLines(text: string): Node[] {
  const roots: Node[] = [];
  const stack: Node[] = [];
  for (const raw of text.replace(/^﻿/, '').split(/\r\n|\r|\n/)) {
    const m = raw.match(/^\s*(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?: (.*))?$/);
    if (!m) continue;
    const level = Number(m[1]);
    const node: Node = { tag: m[3].toUpperCase(), xref: m[2], value: m[4] ?? '', children: [] };
    if (node.tag === 'CONT' || node.tag === 'CONC') {
      const parent = stack[level - 1];
      if (parent) parent.value += (node.tag === 'CONT' ? '\n' : '') + node.value;
      continue;
    }
    stack.length = level;
    if (level === 0) roots.push(node);
    else stack[level - 1]?.children.push(node);
    stack[level] = node;
  }
  return roots;
}

const child = (n: Node, tag: string) => n.children.find((c) => c.tag === tag);
const kids = (n: Node, tag: string) => n.children.filter((c) => c.tag === tag);
const val = (n: Node | undefined, tag: string) => (n ? child(n, tag)?.value.trim() || undefined : undefined);

/** Convertit une date GEDCOM en date lisible en français (« ABT 1890 » → « vers 1890 »). */
export function fromGedDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim().replace(/^\((.*)\)$/, '$1');
  if (!s) return undefined;
  if (/^(INT|EST|CAL)\b/i.test(s)) return fromGedDate(s.replace(/^\w+\s*/, 'ABT '));
  return parseGenDate(s) ? longDate(s) : s;
}

const EVENT_LABELS: Record<string, string> = {
  BAPM: 'Baptême', CHR: 'Baptême', CONF: 'Confirmation', FCOM: 'Première communion', GRAD: 'Diplôme', EDUC: 'Études',
  RESI: 'Résidence', EMIG: 'Émigration', IMMI: 'Immigration', NATU: 'Naturalisation', MILI: 'Service militaire',
  RETI: 'Retraite', BURI: 'Inhumation', CREM: 'Crémation', PROB: 'Succession', WILL: 'Testament', CENS: 'Recensement',
};

export interface ImportResult {
  persons: number;
  unions: number;
}

/** Ajoute le contenu d'un fichier GEDCOM à l'archive (brouillon immer). */
export function importGedcom(a: Archive, text: string): ImportResult {
  const roots = parseLines(text);
  const now = new Date().toISOString();
  const pid = new Map<string, string>();
  const notes = new Map(roots.filter((r) => r.tag === 'NOTE' && r.xref).map((r) => [r.xref!, r.value]));
  const noteText = (n: Node) => (n.value.startsWith('@') ? notes.get(n.value.trim()) ?? '' : n.value);

  let persons = 0;
  for (const r of roots.filter((x) => x.tag === 'INDI' && x.xref)) {
    const names = kids(r, 'NAME');
    const parseName = (n: Node | undefined) => {
      const v = n?.value ?? '';
      const m = v.match(/^([^/]*)\/([^/]*)\/?(.*)$/);
      const given = val(n, 'GIVN') ?? (m ? m[1] : v).trim();
      const surname = val(n, 'SURN') ?? (m ? m[2] : '').trim();
      return { given, surname };
    };
    const main = parseName(names[0]);
    const married = names.find((n) => /married/i.test(val(n, 'TYPE') ?? ''));
    const sexRaw = val(r, 'SEX');
    const birth = child(r, 'BIRT') ?? child(r, 'CHR') ?? child(r, 'BAPM');
    const death = child(r, 'DEAT') ?? child(r, 'BURI');
    const events: Person['events'] = [];
    for (const n of r.children) {
      if (n === birth || n === death) continue;
      const isEven = n.tag === 'EVEN';
      const type = isEven ? val(n, 'TYPE') : undefined;
      const title = isEven ? type || n.value || 'Événement' : EVENT_LABELS[n.tag];
      if (!title) continue;
      const detail = isEven ? (type ? n.value : '') : n.value;
      events.push({ id: newId('e'), title, date: fromGedDate(val(n, 'DATE')), place: val(n, 'PLAC'), detail: detail || undefined });
    }
    const id = newId('p');
    pid.set(r.xref!, id);
    a.persons.push({
      id,
      given: main.given,
      surname: married ? parseName(married).surname : main.surname,
      birthSurname: married ? main.surname : undefined,
      sex: sexRaw === 'M' || sexRaw === 'F' ? sexRaw : 'U',
      birth: { date: fromGedDate(val(birth, 'DATE')), place: val(birth, 'PLAC') },
      death: { date: fromGedDate(val(death, 'DATE')), place: val(death, 'PLAC') },
      deceased: !!death,
      occupation: kids(r, 'OCCU').map((o) => o.value).filter(Boolean).join(', ') || undefined,
      notes: kids(r, 'NOTE').map(noteText).filter(Boolean).join('\n\n') || undefined,
      events,
      updatedAt: now,
    });
    persons++;
  }

  let unions = 0;
  for (const r of roots.filter((x) => x.tag === 'FAM')) {
    const partners = [val(r, 'HUSB'), val(r, 'WIFE')].map((x) => (x ? pid.get(x) : undefined)).filter(Boolean) as string[];
    const children = kids(r, 'CHIL').map((c) => pid.get(c.value.trim())).filter(Boolean) as string[];
    if (partners.length + children.length < 2) continue;
    const marr = child(r, 'MARR');
    const div = child(r, 'DIV');
    let status: UnionStatus = partners.length === 2 ? (marr ? 'married' : 'partner') : 'unknown';
    if (div) status = 'divorced';
    const u: Union = {
      id: newId('u'), partners, status, children,
      start: fromGedDate(val(marr, 'DATE')), end: fromGedDate(val(div, 'DATE')), place: val(marr, 'PLAC'),
      updatedAt: now,
    };
    // Un enfant ne peut avoir qu'une union parentale : la première rencontrée l'emporte.
    u.children = u.children.filter((c) => !a.unions.some((x) => x.children.includes(c)));
    a.unions.push(u);
    unions++;
  }
  if (!a.meta.homePersonId && a.persons[0]) a.meta.homePersonId = a.persons[0].id;
  return { persons, unions };
}

/** Lit un fichier GEDCOM en respectant son encodage déclaré (UTF-8 ou ANSI). */
export async function readGedcomFile(file: Blob): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const head = new TextDecoder('latin1').decode(buf.slice(0, 2000));
  const ansi = /1 CHAR (ANSI|WINDOWS|IBMPC|ISO-8859-1|ISO8859-1)/i.test(head);
  return new TextDecoder(ansi ? 'windows-1252' : 'utf-8').decode(buf);
}
