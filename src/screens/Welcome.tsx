import { useEffect, useState } from 'react';
import { useApp } from '../data/store';
import { DemoAdapter } from '../storage/demoAdapter';
import { getPlatform, isCancel, type LastArchive, type Platform } from '../storage/platform';
import type { StorageAdapter } from '../storage/StorageAdapter';

/** Écran affiché quand aucune archive n'est ouverte. */
export function Welcome() {
  const openArchive = useApp((s) => s.open);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [last, setLast] = useState<LastArchive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    getPlatform().then(async (p) => {
      setPlatform(p);
      const l = await p.lastArchive().catch(() => null);
      if (l?.granted && !useApp.getState().closedByUser) {
        // Au lancement : réouverture automatique de la dernière archive.
        run(l.reopen);
      } else setLast(l);
    });
  }, []);

  async function run(get: () => Promise<StorageAdapter>) {
    setError(null);
    setBusy(true);
    try {
      await openArchive(await get());
    } catch (e) {
      if (!isCancel(e)) setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const supported = platform && platform.name !== 'unsupported';

  return (
    <div className="welcome">
      <div className="welcome-box">
        <div className="brand-mark" style={{ width: 56, height: 56, fontSize: 26, margin: '0 auto' }}>❦</div>
        <h1>Archive familiale</h1>
        <p>Les personnes, les liens, les photos et les histoires de la famille, rassemblés au même endroit.</p>

        {creating ? (
          <form
            className="welcome-actions"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => platform!.createArchive(title.trim() || 'Notre famille'));
            }}
          >
            <label className="field">
              <span style={{ color: 'var(--night-ink)' }}>Nom de l'archive</span>
              <input className="input" autoFocus placeholder="Ex. : La famille Martin" value={title} onChange={(e) => setTitle(e.target.value)} style={{ color: 'var(--ink)' }} />
            </label>
            <p className="small" style={{ color: 'var(--night-muted)' }}>
              Choisissez ensuite un dossier vide (par exemple « Documents\Archive Famille »). Toutes les données et les photos y seront rangées.
            </p>
            <div className="actions-row">
              <button className="btn btn-primary" type="submit" disabled={busy}>Choisir le dossier…</button>
              <button className="btn btn-ghost" type="button" style={{ color: 'var(--night-ink)' }} onClick={() => setCreating(false)}>Retour</button>
            </div>
          </form>
        ) : (
          <div className="welcome-actions">
            {last && (
              <button className="welcome-action" disabled={busy} onClick={() => run(last.reopen)}>
                <span className="ic">↺</span>
                <span><b>Rouvrir « {last.name} »</b><small>La dernière archive utilisée sur cet ordinateur.</small></span>
              </button>
            )}
            {supported && (
              <>
                <button className="welcome-action" disabled={busy} onClick={() => run(platform!.openArchive)}>
                  <span className="ic">📂</span>
                  <span><b>Ouvrir une archive existante</b><small>Choisir le dossier qui contient le fichier archive.json.</small></span>
                </button>
                <button className="welcome-action" disabled={busy} onClick={() => setCreating(true)}>
                  <span className="ic">＋</span>
                  <span><b>Créer une nouvelle archive</b><small>Commencer un arbre à partir de zéro.</small></span>
                </button>
              </>
            )}
            <button className="welcome-action" disabled={busy} onClick={() => run(async () => new DemoAdapter())}>
              <span className="ic">✦</span>
              <span><b>Découvrir avec une famille d'exemple</b><small>Pour essayer librement : rien n'est enregistré.</small></span>
            </button>
          </div>
        )}

        {platform?.name === 'unsupported' && (
          <div className="welcome-error">
            Ce navigateur ne permet pas d'enregistrer une archive sur l'ordinateur. Utilisez l'application installée, ou Microsoft Edge / Google Chrome.
          </div>
        )}
        {error && <div className="welcome-error">{error}</div>}
      </div>
    </div>
  );
}
