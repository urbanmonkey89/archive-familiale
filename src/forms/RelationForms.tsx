import { useState } from 'react';
import { attachChild, deleteUnion, detachChild, FamilyError, linkChild, linkParent, linkPartners, linkSibling, updateUnion } from '../data/actions';
import { firstName, fullName } from '../data/people';
import type { UnionStatus } from '../data/schema';
import { childrenOfUnion, getIndex, partnershipsOf } from '../data/selectors';
import { update, useApp, useArchive } from '../data/store';
import { Avatar, Field, Modal, PersonSelect } from '../ui/components';
import { closeModal, confirmAction } from '../ui/modals';
import { STATUS_LABEL, STATUS_OPTIONS } from '../ui/unionStatus';

type Kind = 'partner' | 'child' | 'parent' | 'sibling';
const LABELS: Record<Kind, string> = { partner: 'Conjoint', child: 'Enfant', parent: 'Parent', sibling: 'Frère / sœur' };

/** Relier deux personnes déjà présentes dans l'archive. */
export function LinkForm({ personId }: { personId: string }) {
  const archive = useArchive();
  const toast = useApp((s) => s.toast);
  const ix = getIndex(archive);
  const me = ix.person.get(personId);
  const [kind, setKind] = useState<Kind>('partner');
  const [other, setOther] = useState('');
  const [unionId, setUnionId] = useState('');
  const [status, setStatus] = useState<UnionStatus>('married');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!me) return null;
  const myUnions = partnershipsOf(ix, personId).filter((x) => x.partner);

  function submit() {
    if (!other) return setError('Choisissez une personne.');
    try {
      update((a) => {
        if (kind === 'partner') linkPartners(a, personId, other, { status, start: start || undefined, end: end || undefined });
        else if (kind === 'child') linkChild(a, personId, unionId || myUnions[0]?.union.id || 'single', other);
        else if (kind === 'parent') linkParent(a, personId, other);
        else linkSibling(a, personId, other);
      });
      closeModal();
      toast('Lien ajouté.');
    } catch (e) {
      setError(e instanceof FamilyError ? e.message : String(e));
    }
  }

  return (
    <Modal
      title={`Relier ${firstName(me)} à une personne existante`}
      subtitle="Pour une personne qui est déjà dans l'archive. Sinon, utilisez « ＋ Enfant », « ＋ Conjoint »…"
      onClose={closeModal}
      footer={<><button className="btn btn-ghost" onClick={closeModal}>Annuler</button><button className="btn btn-primary" onClick={submit}>Relier</button></>}
    >
      <div>
        <span className="field-label">{fullName(me)} a pour…</span>
        <div className="seg">
          {(Object.keys(LABELS) as Kind[]).map((k) => (
            <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => { setKind(k); setError(null); }}>{LABELS[k]}</button>
          ))}
        </div>
      </div>
      <Field label="Personne">
        <PersonSelect value={other} onChange={(v) => { setOther(v); setError(null); }} exclude={[personId]} />
      </Field>
      {kind === 'child' && myUnions.length > 0 && (
        <Field label="Avec">
          <select className="input" value={unionId || myUnions[0].union.id} onChange={(e) => setUnionId(e.target.value)}>
            {myUnions.map(({ union, partner }) => <option key={union.id} value={union.id}>{fullName(partner)}</option>)}
            <option value="single">Autre parent inconnu</option>
          </select>
        </Field>
      )}
      {kind === 'child' && <p className="hint">Si cet enfant avait déjà des parents dans l'archive, il sera détaché de ceux-ci.</p>}
      {kind === 'partner' && (
        <div className="row3">
          <Field label="Statut">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as UnionStatus)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Depuis"><input className="input" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Jusqu'à"><input className="input" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
    </Modal>
  );
}

/** Modifier une union : statut, dates, lieu, enfants. */
export function UnionForm({ unionId }: { unionId: string }) {
  const archive = useArchive();
  const toast = useApp((s) => s.toast);
  const ix = getIndex(archive);
  const u = ix.union.get(unionId);
  const [status, setStatus] = useState<UnionStatus>(u?.status ?? 'married');
  const [start, setStart] = useState(u?.start ?? '');
  const [end, setEnd] = useState(u?.end ?? '');
  const [place, setPlace] = useState(u?.place ?? '');
  const [addChild, setAddChild] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!u) return null;
  const partners = u.partners.map((p) => ix.person.get(p)).filter(Boolean);
  const kids = childrenOfUnion(ix, u);
  const names = partners.map((p) => firstName(p)).join(' et ');

  function save() {
    update((a) => updateUnion(a, unionId, { status, start: start.trim() || undefined, end: end.trim() || undefined, place: place.trim() || undefined }));
    closeModal();
  }

  function remove() {
    confirmAction(
      `Supprimer l'union de ${names} ?`,
      kids.length ? `Les enfants (${kids.map((k) => firstName(k)).join(', ')}) ne seront plus rattachés à ces parents. Les personnes elles-mêmes ne sont pas supprimées.` : 'Les personnes elles-mêmes ne sont pas supprimées.',
      "Supprimer l'union",
      () => {
        update((a) => deleteUnion(a, unionId));
        closeModal();
        toast('Union supprimée.');
      },
    );
  }

  return (
    <Modal
      title={`Union de ${names}`}
      onClose={closeModal}
      footer={
        <>
          <button className="btn btn-danger left" onClick={remove}>Supprimer l'union</button>
          <button className="btn btn-ghost" onClick={closeModal}>Annuler</button>
          <button className="btn btn-primary" onClick={save}>Enregistrer</button>
        </>
      }
    >
      <div className="row3">
        <Field label="Statut">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as UnionStatus)}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Début / mariage"><input className="input" value={start} onChange={(e) => setStart(e.target.value)} placeholder="1953" /></Field>
        <Field label="Fin"><input className="input" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="—" /></Field>
      </div>
      <Field label="Lieu du mariage">
        <input className="input" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Christ Church, Savannah" />
      </Field>
      <div>
        <span className="field-label">Enfants de cette union</span>
        <div className="pick-list">
          {kids.map((k) => (
            <span key={k.id} className="pick">
              <Avatar person={k} size={20} />{fullName(k)}
              <button className="mini-btn" title="Détacher" onClick={() => update((a) => detachChild(a, unionId, k.id))}>✕</button>
            </span>
          ))}
          {!kids.length && <span className="hint">Aucun enfant.</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 8 }}>
          <div style={{ flex: 1 }}>
            <PersonSelect value={addChild} onChange={setAddChild} exclude={[...u.partners, ...u.children]} placeholder="Rattacher un enfant existant…" />
          </div>
          <button className="btn btn-soft" disabled={!addChild} onClick={() => {
            try {
              update((a) => attachChild(a, unionId, addChild));
              setAddChild('');
              setError(null);
            } catch (e) {
              setError(e instanceof FamilyError ? e.message : String(e));
            }
          }}>Rattacher</button>
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}
    </Modal>
  );
}
