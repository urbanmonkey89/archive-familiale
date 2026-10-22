/** Famille d'exemple (fictive), reprise de la maquette Claude Design. */
import { SCHEMA_VERSION, type Archive, type Person, type Union } from './schema';

const T = '2026-10-01T10:00:00.000Z';

function person(p: Partial<Person> & Pick<Person, 'id' | 'given' | 'surname'>): Person {
  return { sex: 'U', birth: {}, death: {}, deceased: false, events: [], updatedAt: T, ...p };
}

function union(u: Partial<Union> & Pick<Union, 'id' | 'partners'>): Union {
  return { status: 'married', children: [], updatedAt: T, ...u };
}

export function sampleArchive(): Archive {
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      title: 'Les Whitfield',
      subtitle: 'Famille d’exemple — essayez librement, rien n’est enregistré.',
      homePersonId: 'eleanor',
      createdAt: T,
      updatedAt: T,
    },
    branches: [
      { id: 'fondateurs', label: 'Fondateurs', color: '#a9763f' },
      { id: 'cole', label: 'Lignée Cole', color: '#5a6b86' },
      { id: 'whitfield', label: 'Lignée Whitfield', color: '#5b7a5e' },
    ],
    persons: [
      person({ id: 'walter', given: 'Walter', surname: 'Hart', sex: 'M', birth: { date: 'vers 1902', place: 'Charleston, SC' }, death: { date: '1975' }, occupation: 'Boulanger', branchId: 'fondateurs',
        bio: 'Le père d’Eleanor. C’est de lui qu’elle tenait le goût du pain levé avant l’aube.' }),
      person({ id: 'rose', given: 'Rose', surname: 'Hart', birthSurname: 'Dumas', sex: 'F', birth: { date: '1905' }, death: { date: '1980' }, branchId: 'fondateurs' }),
      person({ id: 'eleanor', given: 'Eleanor', surname: 'Whitfield', birthSurname: 'Hart', sex: 'F', role: 'Grand-mère', branchId: 'fondateurs',
        birth: { date: '14 mars 1931', place: 'Savannah, GA' }, death: { date: '2019' },
        bio: 'Eleanor menait la famille avec de la farine sur les mains et une liste dans la tête. Sa cuisine aux carreaux bleus a été le cœur de tout pendant près de cinquante ans.',
        events: [
          { id: 'e1', date: '1949', title: 'Diplômée du lycée de Savannah', detail: 'La première de sa famille à terminer ses études.' },
          { id: 'e2', date: '1972', title: 'Ouverture de la boulangerie Hart', detail: 'La cuisine aux carreaux bleus qui nourrissait tout le quartier.' },
        ] }),
      person({ id: 'james', given: 'James', surname: 'Whitfield', sex: 'M', role: 'Grand-père', occupation: 'Cheminot', branchId: 'fondateurs',
        birth: { date: '1928', place: 'Macon, GA' }, death: { date: '2011' },
        bio: 'Cheminot, et homme discret, James gardait les lettres, actes et photographies de la famille dans un coffret en cèdre qu’il avait fabriqué lui-même.',
        events: [{ id: 'e3', date: '1951', title: 'Entrée à la compagnie de chemin de fer de Géorgie', detail: 'Il a travaillé sur la même ligne pendant 34 ans.' }] }),
      person({ id: 'ruth', given: 'Ruth', surname: 'Whitfield', birthSurname: 'Bellamy', sex: 'F', role: 'Première épouse de James', branchId: 'fondateurs',
        birth: { date: '1929', place: 'Macon, GA' }, death: { date: '1952' },
        bio: 'La première épouse de James. Mariés jeunes, elle est morte de la fièvre deux ans plus tard.' }),
      person({ id: 'margaret', given: 'Margaret', surname: 'Cole', birthSurname: 'Whitfield', sex: 'F', role: 'Fille', branchId: 'cole',
        birth: { date: '1955', place: 'Savannah, GA' },
        bio: 'La gardienne des dates et des anniversaires. Si vous oubliez un anniversaire, Margaret, elle, ne l’oubliera pas.' }),
      person({ id: 'carl', given: 'Carl', surname: 'Reed', sex: 'M', role: 'Premier mari de Margaret', branchId: 'cole',
        birth: { date: '1952', place: 'Atlanta, GA' },
        bio: 'Divorcés en 1982, ils restent en bons termes aux mariages de famille.' }),
      person({ id: 'tom', given: 'Tom', surname: 'Cole', sex: 'M', role: 'Gendre', branchId: 'cole',
        birth: { date: '1953', place: 'Atlanta, GA' },
        bio: 'Entré dans la famille en 1985, il répare tout dans la maison depuis.' }),
      person({ id: 'robert', given: 'Robert', surname: 'Whitfield', sex: 'M', role: 'Fils', branchId: 'whitfield',
        birth: { date: '1958', place: 'Savannah, GA' },
        bio: 'A hérité du coffret en cèdre de son père et de l’obstination de sa mère. C’est lui qui a lancé cette archive.' }),
      person({ id: 'lucia', given: 'Lucía', surname: 'Whitfield', birthSurname: 'Reyes', sex: 'F', role: 'Belle-fille', branchId: 'whitfield',
        birth: { date: '1961', place: 'San Juan, PR' },
        bio: 'A apporté une deuxième langue et mille recettes dans la famille.' }),
      person({ id: 'sarah', given: 'Sarah', surname: 'Cole', sex: 'F', role: 'Petite-fille', occupation: 'Photographe', branchId: 'cole',
        birth: { date: '1984', place: 'Savannah, GA' },
        bio: 'Photographe. C’est grâce à elle que la plupart des photos récentes existent.' }),
      person({ id: 'daniel', given: 'Daniel', surname: 'Whitfield', sex: 'M', role: 'Petit-fils', branchId: 'whitfield',
        birth: { date: '1989' },
        bio: 'Le plus jeune de la lignée, pour l’instant.' }),
    ],
    unions: [
      union({ id: 'u_hart', partners: ['walter', 'rose'], start: '1928', children: ['eleanor'] }),
      union({ id: 'u_james_ruth', partners: ['james', 'ruth'], status: 'widowed', start: '1950', end: '1952' }),
      union({ id: 'u_james_eleanor', partners: ['james', 'eleanor'], status: 'widowed', start: '1953', end: '2011', place: 'Christ Church, Savannah', children: ['margaret', 'robert'] }),
      union({ id: 'u_margaret_carl', partners: ['margaret', 'carl'], status: 'divorced', start: '1976', end: '1982' }),
      union({ id: 'u_margaret_tom', partners: ['margaret', 'tom'], status: 'married', start: '1985', children: ['sarah'] }),
      union({ id: 'u_robert_lucia', partners: ['robert', 'lucia'], status: 'married', start: '1986', children: ['daniel'] }),
    ],
    places: [
      { id: 'bakery', name: 'La boulangerie Hart', type: 'Commerce', location: 'Savannah, GA', era: '1972 – 2003', branchId: 'fondateurs', updatedAt: T,
        blurb: 'La boulangerie aux carreaux bleus d’Eleanor, sur Abercorn Street.',
        story: 'Pendant trente et un ans, la boulangerie a ouvert avant l’aube. Eleanor la tenait avec Margaret à la caisse et, plus tard, Sarah derrière l’appareil photo.',
        personIds: ['eleanor', 'margaret', 'sarah'] },
      { id: 'jones', name: 'La maison de Jones Street', type: 'Maison', location: 'Savannah, GA', era: '1953 – 2019', branchId: 'fondateurs', updatedAt: T,
        blurb: 'La maison de famille pendant trois générations.',
        story: 'James et Eleanor ont acheté la maison l’année de leur mariage. Les deux enfants y ont grandi, et Eleanor y a vécu jusqu’au bout. Le coffret en cèdre était rangé dans le placard de l’entrée.',
        personIds: ['eleanor', 'james', 'margaret', 'robert'] },
      { id: 'church', name: 'Christ Church', type: 'Église', location: 'Savannah, GA', era: '1953', branchId: 'fondateurs', updatedAt: T,
        blurb: 'Là où Eleanor et James se sont mariés.',
        story: 'Une petite cérémonie un samedi matin de printemps, avec plus de famille que les bancs ne pouvaient en contenir.',
        personIds: ['eleanor', 'james'] },
      { id: 'cabin', name: 'Le chalet du lac', type: 'Lieu de réunion', location: 'Lake Burton, GA', era: '1990 – aujourd’hui', branchId: 'whitfield', updatedAt: T,
        blurb: 'Là où la famille se retrouve encore chaque été.',
        story: 'Robert a acheté le chalet en 1990. Toutes les photos de réunion depuis ont été prises sur son porche.',
        personIds: ['robert', 'lucia', 'daniel', 'margaret', 'tom', 'sarah'] },
    ],
    media: [
      { id: 'a1', file: 'exemple/a1.jpg', caption: 'Eleanor et James, 1953', date: '1953', personIds: ['eleanor', 'james'], placeIds: ['church'], updatedAt: T },
      { id: 'a2', file: 'exemple/a2.jpg', caption: 'La boulangerie, le jour de l’ouverture', date: '1972', personIds: ['eleanor'], placeIds: ['bakery'], updatedAt: T },
      { id: 'a3', file: 'exemple/a3.jpg', caption: 'Déjeuner du dimanche, 1991', date: '1991', personIds: [], placeIds: ['jones'], updatedAt: T },
      { id: 'a4', file: 'exemple/a4.jpg', caption: 'Robert et Daniel', personIds: ['robert', 'daniel'], placeIds: ['cabin'], updatedAt: T },
      { id: 'a5', file: 'exemple/a5.jpg', caption: 'Réunion de famille, 2008', date: '2008', personIds: [], placeIds: ['cabin'], updatedAt: T },
      { id: 'a6', file: 'exemple/a6.jpg', caption: 'Le premier appareil de Sarah', personIds: ['sarah'], placeIds: [], updatedAt: T },
      { id: 'a7', file: 'exemple/a7.jpg', caption: 'Le coffret en cèdre', personIds: ['james'], placeIds: ['jones'], updatedAt: T },
      { id: 'a8', file: 'exemple/a8.jpg', caption: 'La cuisine de Lucía', personIds: ['lucia'], placeIds: [], updatedAt: T },
    ],
    stories: [
      { id: 's1', title: 'La cuisine bleue', author: 'Margaret', personIds: ['eleanor'], placeIds: ['bakery'], mediaIds: [], updatedAt: T,
        text: 'À six heures du matin, chaque surface était couverte de farine. On apprenait à faire le pain rien qu’en restant à côté d’elle.' },
      { id: 's2', title: 'Le pain du dimanche', author: 'Sarah', personIds: ['eleanor'], placeIds: [], mediaIds: [], updatedAt: T,
        text: 'Elle n’a jamais écrit la recette. « Tes mains s’en souviendront », disait-elle — et d’une certaine façon, c’est vrai.' },
      { id: 's3', title: 'Le coffret en cèdre', author: 'Robert', personIds: ['james'], placeIds: ['jones'], mediaIds: ['a7'], updatedAt: T,
        text: 'Tout ce qu’on sait de la famille avant 1950 est sorti de ce coffret. Il avait légendé chaque photo au crayon.' },
      { id: 's4', title: 'Chaque anniversaire, à l’heure', author: 'Sarah', personIds: ['margaret'], placeIds: [], mediaIds: [], updatedAt: T,
        text: 'Maman a envoyé une carte écrite à la main, le bon jour, chaque année, à tout le monde. On n’a jamais compris comment.' },
    ],
  };
}
