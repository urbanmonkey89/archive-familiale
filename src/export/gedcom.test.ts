import { produce } from 'immer';
import { describe, expect, it } from 'vitest';
import { fullName } from '../data/people';
import { sampleArchive } from '../data/sample';
import { emptyArchive, type Archive } from '../data/schema';
import { getIndex, parentsOf, partnershipsOf } from '../data/selectors';
import { exportGedcom, fromGedDate, importGedcom, toGedDate } from './gedcom';

function importInto(text: string): Archive {
  return produce(emptyArchive(), (d) => {
    importGedcom(d as Archive, text);
  });
}

describe('dates GEDCOM', () => {
  it('conversion dans les deux sens', () => {
    expect(toGedDate('14/03/1931')).toBe('14 MAR 1931');
    expect(toGedDate('vers 1890')).toBe('ABT 1890');
    expect(toGedDate('entre 1890 et 1895')).toBe('BET 1890 AND 1895');
    expect(toGedDate('un jour de pluie')).toBe('(un jour de pluie)');
    expect(fromGedDate('14 MAR 1931')).toBe('14 mars 1931');
    expect(fromGedDate('ABT 1890')).toBe('vers 1890');
    expect(fromGedDate('EST 1890')).toBe('vers 1890');
    expect(fromGedDate('(un jour de pluie)')).toBe('un jour de pluie');
  });
});

describe('aller-retour', () => {
  it("l'exemple ressort identique (personnes, liens, dates)", () => {
    const src = sampleArchive();
    const back = importInto(exportGedcom(src));
    expect(back.persons).toHaveLength(src.persons.length);
    expect(back.unions).toHaveLength(src.unions.length);

    const byName = (a: Archive, n: string) => a.persons.find((p) => fullName(p) === n)!;
    const eleanor = byName(back, 'Eleanor Whitfield');
    expect(eleanor.birthSurname).toBe('Hart');
    expect(eleanor.birth).toEqual({ date: '14 mars 1931', place: 'Savannah, GA' });
    expect(eleanor.events.map((e) => e.title)).toContain('Ouverture de la boulangerie Hart');

    const ix = getIndex(back);
    const margaret = byName(back, 'Margaret Cole');
    expect(parentsOf(ix, margaret.id).map(fullName).sort()).toEqual(['Eleanor Whitfield', 'James Whitfield']);
    const unions = partnershipsOf(ix, margaret.id);
    expect(unions.map((u) => [fullName(u.partner), u.union.status])).toEqual([
      ['Carl Reed', 'divorced'],
      ['Tom Cole', 'married'],
    ]);
    const walter = byName(back, 'Walter Hart');
    expect(walter.birth.date).toBe('vers 1902');
    expect(walter.occupation).toBe('Boulanger');
  });

  it('lit un fichier GEDCOM « du commerce »', () => {
    const ged = [
      '0 HEAD', '1 CHAR UTF-8',
      '0 @I1@ INDI', '1 NAME Jean /Martin/', '1 SEX M', '1 BIRT', '2 DATE 3 FEB 1850', '2 PLAC Lyon, Rhône, France',
      '1 DEAT', '2 DATE BEF 1920', '1 OCCU Tisserand', '1 NOTE Ligne un', '2 CONT ligne deux', '2 CONC  suite',
      '1 RESI', '2 DATE 1880', '2 PLAC Villeurbanne',
      '0 @I2@ INDI', '1 NAME Marie /Durand/', '1 SEX F',
      '0 @I3@ INDI', '1 NAME Paul /Martin/', '1 SEX M',
      '0 @F1@ FAM', '1 HUSB @I1@', '1 WIFE @I2@', '1 CHIL @I3@', '1 MARR', '2 DATE 1875',
      '0 TRLR',
    ].join('\n');
    const a = importInto(ged);
    const jean = a.persons.find((p) => p.given === 'Jean')!;
    expect(jean.surname).toBe('Martin');
    expect(jean.birth).toEqual({ date: '3 février 1850', place: 'Lyon, Rhône, France' });
    expect(jean.death.date).toBe('avant 1920');
    expect(jean.notes).toBe('Ligne un\nligne deux suite');
    expect(jean.events[0]).toMatchObject({ title: 'Résidence', date: '1880', place: 'Villeurbanne' });
    expect(a.unions[0]).toMatchObject({ status: 'married', start: '1875' });
    expect(parentsOf(getIndex(a), a.persons.find((p) => p.given === 'Paul')!.id)).toHaveLength(2);
  });
});
