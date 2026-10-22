import { useState } from 'react';
import { addBranch, deleteBranch, updateBranch } from '../data/actions';
import { flush, update, useApp, useArchive } from '../data/store';
import { Field, PersonSelect } from '../ui/components';
import { confirmAction } from '../ui/modals';
import { href } from '../ui/router';
import { ExportPanel } from './ExportPanel';

const NEW_COLORS = ['#a9763f', '#5a6b86', '#5b7a5e', '#866a78', '#8a4f43', '#6a7d7a', '#7d6a6a'];

export function SettingsPage() {
  const archive = useArchive();
  const adapter = useApp((s) => s.adapter)!;
  const close = useApp((s) => s.close);
  const [newBranch, setNewBranch] = useState('');

  return (
    <section className="screen narrow" style={{ paddingTop: 40 }}>
      <a className="back" href={href.home()}>← Retour</a>
      <div className="page-head">
        <div>
          <div className="eyebrow">Réglages</div>
          <h1 className="page-title">L'archive</h1>
          <p className="lede">Dossier ouvert : <b>{adapter.label}</b>{adapter.kind === 'demo' && ' (exemple, rien n’est enregistré)'}</p>
        </div>
        <button className="btn btn-ghost" onClick={async () => { await flush(); close(); }}>Fermer l'archive</button>
      </div>

      <div className="settings">
        <div className="card card-pad">
          <h2>Présentation</h2>
          <p>Ce qui s'affiche en haut de la page d'accueil et dans l'onglet du navigateur.</p>
          <div style={{ display: 'grid', gap: 14 }}>
            <Field label="Nom de l'archive">
              <input className="input" value={archive.meta.title} onChange={(e) => update((a) => { a.meta.title = e.target.value; })} />
            </Field>
            <Field label="Phrase d'accueil" hint="Facultatif : remplace le résumé automatique (« 12 personnes · 4 générations »).">
              <input className="input" value={archive.meta.subtitle ?? ''} onChange={(e) => update((a) => { a.meta.subtitle = e.target.value || undefined; })} />
            </Field>
            <Field label="Personne de référence" hint="L'arbre est centré sur elle par défaut.">
              <PersonSelect value={archive.meta.homePersonId ?? ''} onChange={(v) => update((a) => { a.meta.homePersonId = v || undefined; })} />
            </Field>
          </div>
        </div>

        <div className="card card-pad">
          <h2>Branches de la famille</h2>
          <p>Les branches colorent les personnes et les traits de l'arbre (par exemple côté paternel / côté maternel).</p>
          {archive.branches.map((b) => (
            <div className="branch-row" key={b.id}>
              <input type="color" value={b.color} onChange={(e) => update((a) => updateBranch(a, b.id, { color: e.target.value }))} aria-label="Couleur" />
              <input className="input" value={b.label} onChange={(e) => update((a) => updateBranch(a, b.id, { label: e.target.value }))} />
              <button className="btn btn-danger" onClick={() => confirmAction(`Supprimer la branche « ${b.label} » ?`, 'Les personnes et lieux de cette branche ne seront plus colorés. Ils ne sont pas supprimés.', 'Supprimer', () => update((a) => deleteBranch(a, b.id)))}>
                Supprimer
              </button>
            </div>
          ))}
          <form className="branch-row" style={{ marginTop: 14 }} onSubmit={(e) => {
            e.preventDefault();
            if (!newBranch.trim()) return;
            update((a) => addBranch(a, newBranch.trim(), NEW_COLORS[a.branches.length % NEW_COLORS.length]));
            setNewBranch('');
          }}>
            <input className="input" placeholder="Nouvelle branche, ex. « Côté Martin »" value={newBranch} onChange={(e) => setNewBranch(e.target.value)} />
            <button className="btn btn-soft" type="submit">Ajouter</button>
          </form>
        </div>

        <ExportPanel />
      </div>
    </section>
  );
}
