import { produce } from 'immer';
import { describe, expect, it } from 'vitest';
import * as A from '../data/actions';
import { sampleArchive } from '../data/sample';
import { emptyArchive, type Archive } from '../data/schema';
import { getIndex } from '../data/selectors';
import { CARD_W, layoutTree, type TreeLayout } from './layout';

function overlaps(l: TreeLayout): string[] {
  const problems: string[] = [];
  const rows = new Map<number, { x: number; w: number; what: string }[]>();
  for (const n of l.nodes) {
    const r = rows.get(n.y) ?? [];
    r.push({ x: n.x, w: CARD_W, what: n.personId });
    rows.set(n.y, r);
  }
  for (const k of l.links) {
    const r = rows.get(k.y) ?? [];
    r.push({ x: k.x, w: k.width, what: 'lien ' + k.unionId });
    rows.set(k.y, r);
  }
  for (const [y, items] of rows) {
    items.sort((a, b) => a.x - b.x);
    for (let i = 1; i < items.length; i++) {
      if (items[i - 1].x + items[i - 1].w > items[i].x + 0.5) problems.push(`ligne ${y} : ${items[i - 1].what} chevauche ${items[i].what}`);
    }
  }
  return problems;
}

/** Grande famille générée : 4 enfants par couple, remariages, sur plusieurs générations. */
function bigFamily(): Archive {
  return produce(emptyArchive(), (d) => {
    const P = (g: string): A.PersonInput => ({ given: g, surname: 'X', sex: 'U', birth: {}, death: {}, deceased: false });
    const root = A.addPerson(d, P('Racine'));
    A.addPerson(d, P('Grand-père'), { kind: 'parent', of: root });
    A.addPerson(d, P('Grand-mère'), { kind: 'parent', of: root });
    let gen = [root];
    for (let g = 0; g < 4; g++) {
      const next: string[] = [];
      for (const p of gen) {
        A.addPerson(d, P(`Conjoint ${g}`), { kind: 'partner', of: p, status: 'divorced' });
        A.addPerson(d, P(`Conjoint bis ${g}`), { kind: 'partner', of: p, status: 'married' });
        const unions = d.unions.filter((u) => u.partners.includes(p) && u.partners.length === 2);
        for (let c = 0; c < (g < 2 ? 3 : 1); c++) {
          next.push(A.addPerson(d, P(`Enfant ${g}.${c}`), { kind: 'child', of: p, unionId: unions[c % unions.length].id }));
        }
        A.addPerson(d, P(`Frère ${g}`), { kind: 'sibling', of: p });
      }
      gen = next;
    }
  });
}

describe('layoutTree', () => {
  it("place l'exemple sans chevauchement, quel que soit le centre", () => {
    const a = sampleArchive();
    const ix = getIndex(a);
    for (const p of a.persons) {
      const l = layoutTree(ix, p.id, { up: 3, down: 3 });
      expect(overlaps(l), `centré sur ${p.id}`).toEqual([]);
      expect(l.nodes.filter((n) => n.focus)).toHaveLength(1);
    }
  });

  it('affiche ancêtres, conjoints (dont ex), enfants et frères', () => {
    const ix = getIndex(sampleArchive());
    const ids = layoutTree(ix, 'margaret', { up: 2, down: 2 }).nodes.map((n) => n.personId);
    expect(ids).toEqual(expect.arrayContaining(['margaret', 'carl', 'tom', 'sarah', 'robert', 'james', 'eleanor', 'walter', 'rose']));
    // Ruth (1re épouse de James) n'est pas une ancêtre de Margaret.
    expect(ids).not.toContain('ruth');
  });

  it('respecte le nombre de générations demandé', () => {
    const ix = getIndex(sampleArchive());
    const l = layoutTree(ix, 'eleanor', { up: 0, down: 1 });
    const ids = l.nodes.map((n) => n.personId);
    expect(ids).toContain('margaret');
    expect(ids).not.toContain('sarah');
    expect(ids).not.toContain('walter');
    expect(l.nodes.find((n) => n.personId === 'margaret')?.moreDown).toBe(true);
    expect(l.nodes.find((n) => n.focus)?.moreUp).toBe(true);
  });

  it('grande famille avec remariages : aucun chevauchement', () => {
    const a = bigFamily();
    const ix = getIndex(a);
    expect(a.persons.length).toBeGreaterThan(60);
    for (const p of a.persons.slice(0, 25)) {
      expect(overlaps(layoutTree(ix, p.id, { up: 4, down: 4 })), p.given).toEqual([]);
    }
  });

  it('résiste à une boucle dans les données', () => {
    // Données corrompues : A parent de B et B parent de A.
    const a = produce(emptyArchive(), (d) => {
      d.persons.push(
        { id: 'a', given: 'A', surname: '', sex: 'U', birth: {}, death: {}, deceased: false, events: [], updatedAt: '' },
        { id: 'b', given: 'B', surname: '', sex: 'U', birth: {}, death: {}, deceased: false, events: [], updatedAt: '' },
      );
      d.unions.push({ id: 'u1', partners: ['a'], status: 'unknown', children: ['b'], updatedAt: '' });
      d.unions.push({ id: 'u2', partners: ['b'], status: 'unknown', children: ['a'], updatedAt: '' });
    });
    const l = layoutTree(getIndex(a), 'a', { up: 5, down: 5 });
    expect(l.nodes.length).toBeLessThan(20);
  });
});
