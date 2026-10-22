import { useApp } from '../data/store';

export function ExportPanel() {
  const adapter = useApp((s) => s.adapter)!;
  return (
    <div className="card card-pad">
      <h2>Sauvegardes</h2>
      <p>
        Chaque modification est enregistrée automatiquement dans le fichier <code>archive.json</code> du dossier « {adapter.label} ».
        À chaque ouverture, une copie est faite dans son sous-dossier <code>sauvegardes</code> (les 20 dernières sont gardées).
        Pensez à copier régulièrement tout le dossier sur une clé USB ou un disque externe.
      </p>
    </div>
  );
}
