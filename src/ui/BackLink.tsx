import { fullName } from '../data/people';
import { getIndex } from '../data/selectors';
import { useArchive } from '../data/store';
import { goBack, parseRoute, previousHash } from './router';

/**
 * Lien « ← … » qui ramène à l'écran d'où l'on vient (arbre, famille, photos, autre fiche…).
 * Sans écran précédent (page ouverte directement), il mène à `fallbackHref`.
 */
export function BackLink({ fallbackHref, fallbackLabel }: { fallbackHref: string; fallbackLabel: string }) {
  const archive = useArchive();
  const prev = previousHash();
  if (!prev) {
    return <a className="back" href={fallbackHref}>← {fallbackLabel}</a>;
  }
  return (
    <a className="back" href={prev} onClick={(e) => { e.preventDefault(); goBack(); }}>
      ← {labelFor(prev, archive)}
    </a>
  );
}

function labelFor(hash: string, archive: ReturnType<typeof useArchive>): string {
  const r = parseRoute(hash);
  const ix = getIndex(archive);
  switch (r.name) {
    case 'tree': return "Retour à l'arbre";
    case 'photos': return 'Photos';
    case 'places': return 'Tous les lieux';
    case 'place': return ix.place.get(r.id)?.name ?? 'Lieu';
    case 'person': return ix.person.has(r.id) ? fullName(ix.person.get(r.id)) : 'Retour';
    case 'settings': return 'Réglages';
    default: return 'Toute la famille';
  }
}
