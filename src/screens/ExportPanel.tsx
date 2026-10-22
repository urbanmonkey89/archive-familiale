import { useRef, useState } from 'react';
import { buildSite } from '../export/buildSite';
import { exportGedcom, importGedcom, readGedcomFile } from '../export/gedcom';
import { buildZip } from '../export/zip';
import { flush, update, useApp, useArchive } from '../data/store';
import { datedName, isCancel, pickOutputDir, saveFile } from '../storage/output';
import { confirmAction } from '../ui/modals';
import { browserFsSupported } from '../storage/browserFsAdapter';
import { isTauri } from '../storage/platform';

export function ExportPanel() {
  const archive = useArchive();
  const adapter = useApp((s) => s.adapter)!;
  const toast = useApp((s) => s.toast);
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const gedInput = useRef<HTMLInputElement>(null);
  const canPickDir = isTauri() || browserFsSupported();
  const slug = archive.meta.title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'archive';

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setReport(null);
    try {
      await flush();
      await fn();
    } catch (e) {
      if (!isCancel(e)) toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setBusy(null);
    }
  }

  const publish = () => run('Préparation du site…', async () => {
    const out = await pickOutputDir();
    const r = await buildSite(archive, adapter, out, (text, ratio) => setBusy(`${text} ${Math.round(ratio * 100)} %`));
    setReport(
      `Site créé dans le dossier « ${out.name} » (${r.files} fichiers, ${r.photos} photos).` +
      (r.missingPhotos.length ? ` ${r.missingPhotos.length} photo(s) introuvable(s) ont été remplacées par un motif.` : '') +
      ' Il reste à déposer ce dossier sur Cloudflare Pages (voir le guide).',
    );
  });

  const exportZip = () => run('Création du ZIP…', async () => {
    const { blob, missing } = await buildZip(archive, adapter, (r) => setBusy(`Création du ZIP… ${Math.round(r * 100)} %`));
    if (await saveFile(datedName(slug, 'zip'), blob)) {
      toast(missing ? `ZIP enregistré (${missing} photo(s) introuvable(s)).` : 'ZIP enregistré.');
    }
  });

  const exportGed = () => run('Export GEDCOM…', async () => {
    const blob = new Blob([exportGedcom(archive, __APP_VERSION__)], { type: 'text/plain;charset=utf-8' });
    if (await saveFile(datedName(slug, 'ged'), blob)) toast('Fichier GEDCOM enregistré.');
  });

  const importGed = (file: File | undefined) => {
    if (!file) return;
    const go = () => run('Import GEDCOM…', async () => {
      const text = await readGedcomFile(file);
      const r = update((a) => importGedcom(a, text));
      toast(`${r.persons} personnes et ${r.unions} unions importées.`);
    });
    if (archive.persons.length) {
      confirmAction(
        'Ajouter le contenu du fichier à cette archive ?',
        `Les personnes du fichier seront ajoutées aux ${archive.persons.length} personnes déjà présentes, sans fusion des doublons. Pour repartir de zéro, créez d'abord une nouvelle archive vide.`,
        'Importer',
        go,
      );
    } else go();
  };

  const demo = adapter.kind === 'demo';

  return (
    <>
      <div className="card card-pad">
        <h2>Publier le site familial</h2>
        <p>
          Crée une copie consultable de l'archive (lecture seule) dans un dossier, avec des photos allégées.
          Ce dossier se dépose ensuite sur Cloudflare Pages ; l'accès est réservé à la famille grâce à Cloudflare Access.
          Pensez à republier après vos modifications.
        </p>
        <div className="actions-row">
          <button className="btn btn-primary" disabled={!!busy || !canPickDir} onClick={publish}>Créer le site dans un dossier…</button>
        </div>
        {!canPickDir && <p className="hint" style={{ marginTop: 8 }}>Disponible dans l'application installée, ou avec Edge / Chrome.</p>}
      </div>

      <div className="card card-pad">
        <h2>Sauvegardes</h2>
        <p>
          Chaque modification est enregistrée automatiquement dans le fichier <code>archive.json</code> du dossier « {adapter.label} ».
          À chaque ouverture, une copie est faite dans son sous-dossier <code>sauvegardes</code> (les 20 dernières sont gardées).
          Pour vous protéger d'une panne de l'ordinateur, copiez régulièrement ce ZIP sur une clé USB ou un disque externe.
        </p>
        <div className="actions-row">
          <button className="btn btn-soft" disabled={!!busy || demo} onClick={exportZip}>Télécharger toute l'archive (ZIP)</button>
        </div>
      </div>

      <div className="card card-pad">
        <h2>Échanger avec d'autres logiciels (GEDCOM)</h2>
        <p>
          Le GEDCOM est le format standard de la généalogie (Geneanet, Heredis, Gramps, Ancestry…).
          L'import ajoute les personnes et leurs liens ; les photos ne sont pas importées.
        </p>
        <div className="actions-row">
          <button className="btn btn-soft" disabled={!!busy} onClick={exportGed}>Exporter en GEDCOM</button>
          <button className="btn btn-soft" disabled={!!busy} onClick={() => gedInput.current?.click()}>Importer un fichier GEDCOM…</button>
          <input ref={gedInput} type="file" accept=".ged,.gedcom,text/plain" hidden onChange={(e) => { importGed(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </div>

      {(busy || report) && (
        <div className="card card-pad" style={{ borderColor: 'var(--accent)' }}>
          <p style={{ margin: 0, color: 'var(--ink)' }}>{busy ?? report}</p>
        </div>
      )}
    </>
  );
}
