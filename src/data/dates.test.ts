import { describe, expect, it } from 'vitest';
import { longDate, parseGenDate, shortDate, sortKeyOf, span } from './dates';

describe('parseGenDate', () => {
  it.each([
    ['1931', { qualifier: 'exact', year: 1931 }],
    ['12/03/1931', { qualifier: 'exact', year: 1931, month: 3, day: 12 }],
    ['1931-03-12', { qualifier: 'exact', year: 1931, month: 3, day: 12 }],
    ['12 mars 1931', { qualifier: 'exact', year: 1931, month: 3, day: 12 }],
    ['1er Février 1931', { qualifier: 'exact', year: 1931, month: 2, day: 1 }],
    ['août 1944', { qualifier: 'exact', year: 1944, month: 8 }],
    ['vers 1890', { qualifier: 'about', year: 1890 }],
    ['v. 1890', { qualifier: 'about', year: 1890 }],
    ['~1890', { qualifier: 'about', year: 1890 }],
    ['avant 1900', { qualifier: 'before', year: 1900 }],
    ['après 1900', { qualifier: 'after', year: 1900 }],
    ['1890-1895', { qualifier: 'between', year: 1890, yearEnd: 1895 }],
    ['entre 1890 et 1895', { qualifier: 'between', year: 1890, yearEnd: 1895 }],
    ['ABT 1890', { qualifier: 'about', year: 1890 }],
    ['12 MAR 1931', { qualifier: 'exact', year: 1931, month: 3, day: 12 }],
    ['BET 1890 AND 1895', { qualifier: 'between', year: 1890, yearEnd: 1895 }],
  ])('%s', (input, expected) => {
    expect(parseGenDate(input)).toMatchObject(expected);
  });

  it('refuse le texte libre', () => {
    expect(parseGenDate('je ne sais pas')).toBeNull();
    expect(parseGenDate('')).toBeNull();
    expect(parseGenDate('31/13/1931')).toBeNull();
  });
});

describe('tri et affichage', () => {
  it('trie les dates précises après les années seules de la même année', () => {
    const keys = ['12/03/1931', '1931', '1930', 'vers 1932'].map(sortKeyOf);
    expect(keys[1]! < keys[0]!).toBe(true);
    expect(keys[2]! < keys[1]!).toBe(true);
    expect(keys[3]! > keys[0]!).toBe(true);
  });

  it('formes courtes et longues', () => {
    expect(shortDate('vers 1890')).toBe('v. 1890');
    expect(shortDate('12/03/1931')).toBe('1931');
    expect(shortDate('texte libre')).toBe('texte libre');
    expect(longDate('12/03/1931')).toBe('12 mars 1931');
    expect(longDate('01/02/1931')).toBe('1er février 1931');
    expect(longDate('1890-1895')).toBe('entre 1890 et 1895');
  });

  it('périodes', () => {
    expect(span('1953', '2011')).toBe('1953–2011');
    expect(span('1985')).toBe('depuis 1985');
    expect(span(undefined, '1982')).toBe("jusqu'en 1982");
    expect(span()).toBe('');
  });
});
