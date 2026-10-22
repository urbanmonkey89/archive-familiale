import { useEffect, useState } from 'react';
import { useApp, useCanEdit } from './data/store';
import { Home } from './screens/Home';
import { PersonPage } from './screens/PersonPage';
import { PhotosPage } from './screens/PhotosPage';
import { PlacePage, PlacesPage } from './screens/PlacesPage';
import { SettingsPage } from './screens/SettingsPage';
import { TreePage } from './screens/TreePage';
import { Welcome } from './screens/Welcome';
import { StaticAdapter, isStaticSite } from './storage/staticAdapter';
import { ModalHost } from './forms/ModalHost';
import { openModal } from './ui/modals';
import { href, useRoute, type Route } from './ui/router';
import { SearchBox } from './ui/SearchBox';
import { UpdateBanner } from './ui/UpdateBanner';

export function App() {
  const archive = useApp((s) => s.archive);
  const [siteError, setSiteError] = useState<string | null>(null);

  useEffect(() => {
    if (isStaticSite()) useApp.getState().open(new StaticAdapter()).catch((e) => setSiteError(String(e.message ?? e)));
  }, []);

  if (isStaticSite() && !archive) {
    return <div className="welcome"><p>{siteError ?? 'Chargement…'}</p></div>;
  }
  return (
    <>
      <UpdateBanner />
      {archive ? <Shell /> : <Welcome />}
    </>
  );
}

function Shell() {
  const route = useRoute();
  const archive = useApp((s) => s.archive)!;
  const adapter = useApp((s) => s.adapter)!;
  const canEdit = useCanEdit();
  const toasts = useApp((s) => s.toasts);

  useEffect(() => {
    document.title = archive.meta.title;
  }, [archive.meta.title]);

  const words = archive.meta.title.replace(/^(les|la|le|famille)\s+/i, '').trim();
  const mark = (words.split(/\s+/).pop()?.[0] ?? 'A').toUpperCase();
  const tab = route.name === 'person' ? 'home' : route.name === 'place' ? 'places' : route.name;

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href={href.home()}>
          <span className="brand-mark">{mark}</span>
          <span>
            <span className="brand-name" style={{ display: 'block' }}>{archive.meta.title}</span>
            <span className="brand-sub">Archive familiale</span>
          </span>
        </a>
        <nav className="nav">
          <a href={href.home()} className={tab === 'home' ? 'active' : ''}>Famille</a>
          <a href={href.tree()} className={tab === 'tree' ? 'active' : ''}>Arbre</a>
          <a href={href.photos()} className={tab === 'photos' ? 'active' : ''}>Photos</a>
          <a href={href.places()} className={tab === 'places' ? 'active' : ''}>Lieux</a>
        </nav>
        <div className="spacer" />
        <SearchBox />
        {canEdit && <SaveIndicator />}
        {canEdit && (
          <a className="icon-btn" href={href.settings()} title="Réglages, sauvegarde et publication" aria-label="Réglages">⚙</a>
        )}
        {canEdit && (
          <button className="btn btn-primary" onClick={() => openModal({ type: 'person', relation: { kind: 'none' } })}>
            <span className="plus">＋</span><span className="add-label">Ajouter une personne</span>
          </button>
        )}
      </header>
      {adapter.kind === 'demo' && (
        <div className="banner">
          Famille d'exemple : vous pouvez tout modifier, mais rien n'est enregistré.
          <button onClick={() => useApp.getState().close()}>Quitter l'exemple</button>
        </div>
      )}
      <main>
        <Screen route={route} />
      </main>
      <ModalHost />
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}
      </div>
    </div>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'person': return <PersonPage id={route.id} />;
    case 'tree': return <TreePage focusId={route.id} />;
    case 'photos': return <PhotosPage />;
    case 'places': return <PlacesPage />;
    case 'place': return <PlacePage id={route.id} />;
    case 'settings': return <SettingsPage />;
    default: return <Home />;
  }
}

function SaveIndicator() {
  const state = useApp((s) => s.saveState);
  const err = useApp((s) => s.saveError);
  const kind = useApp((s) => s.adapter?.kind);
  if (kind === 'demo') return null;
  const label = { saved: '✓ Enregistré', pending: 'Modifié…', saving: 'Enregistrement…', error: '⚠ Non enregistré' }[state];
  return <span className={`save-state${state === 'error' ? ' error' : ''}`} title={err}>{label}</span>;
}
