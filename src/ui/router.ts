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

// ───────── Parcours de navigation (pour le lien « ← retour ») ─────────

const norm = (h: string) => (h && h !== '#' ? h : '#/');

/** Écrans visités, du plus ancien au plus récent. On en retire un quand on revient en arrière. */
const trail: string[] = [typeof location !== 'undefined' ? norm(location.hash) : '#/'];
/** Position de défilement de chaque écran, restaurée quand on y revient. */
const scrolls = new Map<string, number>();
let lastWasBack = false;

if (typeof window !== 'undefined') window.addEventListener('hashchange', (e) => {
  const from = norm(new URL(e.oldURL).hash);
  const to = norm(location.hash);
  scrolls.set(from, window.scrollY);
  lastWasBack = trail.length > 1 && trail[trail.length - 2] === to;
  if (lastWasBack) trail.pop();
  else trail.push(to);
});

/** Écran précédent dans le parcours, s'il y en a un. */
export function previousHash(): string | null {
  return trail.length > 1 ? trail[trail.length - 2] : null;
}

/** Revient à l'écran précédent comme le bouton « Précédent » du navigateur. */
export function goBack() {
  history.back();
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => {
      const r = parseRoute(location.hash);
      setRoute(r);
      if (r.name === 'tree') return;
      const y = lastWasBack ? scrolls.get(norm(location.hash)) ?? 0 : 0;
      // Après l'affichage du nouvel écran.
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
