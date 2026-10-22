import { useEffect, useState } from 'react';
import { flush } from '../data/store';
import { isTauri } from '../storage/platform';

type Update = Awaited<ReturnType<typeof import('@tauri-apps/plugin-updater').check>>;

/**
 * Application installée : vérifie au démarrage si une nouvelle version a été publiée
 * sur GitHub et propose de l'installer en un clic.
 */
export function UpdateBanner() {
  const [update, setUpdate] = useState<NonNullable<Update> | null>(null);
  const [state, setState] = useState<'idle' | 'downloading' | 'error'>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isTauri()) return;
    import('@tauri-apps/plugin-updater')
      .then(({ check }) => check())
      .then((u) => u && setUpdate(u))
      .catch((e) => console.info('Vérification des mises à jour impossible :', e));
  }, []);

  if (!update) return null;

  async function install() {
    if (!update) return;
    setState('downloading');
    try {
      await flush();
      let total = 0;
      let done = 0;
      await update.downloadAndInstall((ev) => {
        if (ev.event === 'Started') total = ev.data.contentLength ?? 0;
        if (ev.event === 'Progress') {
          done += ev.data.chunkLength;
          if (total) setProgress(Math.round((done / total) * 100));
        }
      });
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (e) {
      console.error(e);
      setState('error');
    }
  }

  return (
    <div className="banner" style={{ position: 'relative', zIndex: 45 }}>
      {state === 'error' ? (
        <>La mise à jour a échoué. Réessayez plus tard.</>
      ) : state === 'downloading' ? (
        <>Téléchargement de la version {update.version}… {progress ? `${progress} %` : ''}</>
      ) : (
        <>
          Une nouvelle version de l'application est disponible ({update.version}).
          <button onClick={install}>Installer et redémarrer</button>
          <button onClick={() => setUpdate(null)} style={{ fontWeight: 400 }}>Plus tard</button>
        </>
      )}
    </div>
  );
}
