import { useEffect, useState } from 'react';

/**
 * Navigation par « hash » (#/personne/eleanor) : fonctionne sans serveur,
 * aussi bien dans l'application installée que sur le site publié.
 */
export type Route =
  | { name: 'home' }
  | { name: 'person'; id: string }
  | { name: 'tree'; id?: string }
  | { name: 'photos' }
  | { name: 'places' }
  | { name: 'place'; id: string }
  | { name: 'settings' };

export function parseRoute(hash: string): Route {
  const [, a, b] = hash.replace(/^#/, '').split('/').map(decodeURIComponent);
  switch (a) {
    case 'personne': return b ? { name: 'person', id: b } : { name: 'home' };
    case 'arbre': return { name: 'tree', id: b || undefined };
    case 'photos': return { name: 'photos' };
    case 'lieux': return { name: 'places' };
    case 'lieu': return b ? { name: 'place', id: b } : { name: 'places' };
    case 'reglages': return { name: 'settings' };
    default: return { name: 'home' };
  }
}

export const href = {
  home: () => '#/',
  person: (id: string) => `#/personne/${encodeURIComponent(id)}`,
  tree: (id?: string) => (id ? `#/arbre/${encodeURIComponent(id)}` : '#/arbre'),
  photos: () => '#/photos',
  places: () => '#/lieux',
  place: (id: string) => `#/lieu/${encodeURIComponent(id)}`,
  settings: () => '#/reglages',
};

export function go(hash: string) {
  if (location.hash !== hash) location.hash = hash;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => {
      const r = parseRoute(location.hash);
      setRoute(r);
      if (r.name !== 'tree') window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
