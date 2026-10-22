import { produce } from 'immer';
import { describe, expect, it } from 'vitest';
import * as A from './actions';
import { emptyArchive, type Archive } from './schema';
import { childrenOf, getIndex, parentsOf, partnershipsOf, siblingsOf } from './selectors';
import { sampleArchive } from './sample';
import { parseArchive } from './migrations';

const base = (given: string): A.PersonInput => ({ given, surname: 'Test', sex: 'U', birth: {}, death: {}, deceased: false });

function run<T>(a: Archive, fn: (d: Archive) => T): [Archive, T] {
  let r!: T;
  const next = produce(a, (d) => {
    r = fn(d as Archive);
  });
  return [next, r];
}

describe('relations', () => {
  it('ajoute parent, conjoint, enfant et frère', () => {
    let a = emptyArchive();
    let me: string, dad: string, mum: string, wife: string, kid: string, bro: string;
    [a, me] = run(a, (d) => A.addPerson(d, base('Moi')));
    [a, dad] = run(a, (d) => A.addPerson(d, base('Papa'), { kind: 'parent', of: me }));
    [a, mum] = run(a, (d) => A.addPerson(d, base('Maman'), { kind: 'parent', of: me }));
    [a, wife] = run(a, (d) => A.addPerson(d, base('Épouse'), { kind: 'partner', of: me, status: 'married', start: '2010' }));
    const unionId = getIndex(a).unionsOf.get(me)![0].id;
    [a, kid] = run(a, (d) => A.addPerson(d, base('Enfant'), { kind: 'child', of: me, unionId }));
    [a, bro] = run(a, (d) => A.addPerson(d, base('Frère'), { kind: 'sibling', of: me }));

    const ix = getIndex(a);
    expect(parentsOf(ix, me).map((p) => p.id).sort()).toEqual([dad, mum].sort());
    expect(partnershipsOf(ix, me).map((x) => x.partner?.id)).toEqual([wife]);
    expect(childrenOf(ix, me).map((p) => p.id)).toEqual([kid]);
    expect(childrenOf(ix, wife).map((p) => p.id)).toEqual([kid]);
    expect(siblingsOf(ix, me).map((p) => p.id)).toEqual([bro]);
    expect(() => run(a, (d) => A.addPerson(d, base('Trop'), { kind: 'parent', of: me }))).toThrow(A.FamilyError);
  });

  it('enfant avec un autre parent inconnu', () => {
    let a = emptyArchive();
    let me: string, kid: string;
    [a, me] = run(a, (d) => A.addPerson(d, base('Moi')));
    [a, kid] = run(a, (d) => A.addPerson(d, base('Enfant'), { kind: 'child', of: me, unionId: 'single' }));
    [a] = run(a, (d) => A.addPerson(d, base('Enfant 2'), { kind: 'child', of: me, unionId: 'single' }));
    expect(a.unions).toHaveLength(1);
    expect(parentsOf(getIndex(a), kid).map((p) => p.id)).toEqual([me]);
  });

  it('la suppression nettoie les liens', () => {
    let a = sampleArchive();
    [a] = run(a, (d) => A.deletePerson(d, 'james'));
    expect(a.persons.find((p) => p.id === 'james')).toBeUndefined();
    expect(a.unions.some((u) => u.partners.includes('james'))).toBe(false);
    // L'union avec Ruth (sans enfant) disparaît, celle avec Eleanor reste (elle a des enfants).
    expect(a.unions.find((u) => u.id === 'u_james_ruth')).toBeUndefined();
    expect(a.unions.find((u) => u.id === 'u_james_eleanor')?.partners).toEqual(['eleanor']);
    expect(a.media.some((m) => m.personIds.includes('james'))).toBe(false);
    expect(a.places.some((p) => p.personIds.includes('james'))).toBe(false);
  });

  it("rattacher un enfant le détache de l'ancienne union", () => {
    let a = sampleArchive();
    [a] = run(a, (d) => A.attachChild(d, 'u_margaret_carl', 'sarah'));
    expect(parentsOf(getIndex(a), 'sarah').map((p) => p.id).sort()).toEqual(['carl', 'margaret']);
    expect(a.unions.find((u) => u.id === 'u_margaret_tom')?.children).toEqual([]);
  });
});

describe('format', () => {
  it("l'exemple est une archive valide", () => {
    expect(() => parseArchive(JSON.parse(JSON.stringify(sampleArchive())))).not.toThrow();
  });
  it('refuse une archive plus récente', () => {
    expect(() => parseArchive({ ...sampleArchive(), schemaVersion: 99 })).toThrow(/plus récente/);
  });
});
