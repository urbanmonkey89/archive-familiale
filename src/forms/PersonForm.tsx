import { useState } from 'react';
import { addPerson, deletePerson, FamilyError, updatePerson, type Relation } from '../data/actions';
import { de, firstName, fullName } from '../data/people';
import type { Sex, UnionStatus } from '../data/schema';
import { getIndex, parentsOf, partnershipsOf } from '../data/selectors';
import { update, useApp, useArchive } from '../data/store';
import { BranchPicker, Field, Modal, PersonSelect } from '../ui/components';
import { closeModal, confirmAction } from '../ui/modals';
import { go, href } from '../ui/router';
import { STATUS_LABEL, STATUS_OPTIONS } from '../ui/unionStatus';

type RelKind = Relation['kind'];

const REL_LABELS: Record<RelKind, string> = { none: 'Sans lien', child: 'Enfant', partner: 'Conjoint', parent: 'Parent', sibling: 'Frère / sœur' };
const REL_TO: Record<RelKind, string> = { none: '', child: 'Enfant de…', partner: 'En couple / marié(e) avec…', parent: 'Parent de…', sibling: 'Frère ou sœur de…' };

export function PersonForm({ personId, relation }: { personId?: string; relation?: Relation }) {
  const archive = useArchive();
  const toast = useApp((s) => s.toast);
  const ix = getIndex(archive);
  const editing = personId ? ix.person.get(personId) : undefined;

  const [f, setF] = useState(() => ({
    given: editing?.given ?? '',
    surname: editing?.surname ?? (relation && relation.kind === 'child' ? ix.person.get(relation.of)?.surname ?? '' : ''),
    birthSurname: editing?.birthSurname ?? '',
    sex: (editing?.sex ?? 'U') as Sex,
    birthDate: editing?.birth.date ?? '',
    birthPlace: editing?.birth.place ?? '',
    deathDate: editing?.death.date ?? '',
    deathPlace: editing?.death.place ?? '',
    deceased: editing?.deceased ?? false,
    occupation: editing?.occupation ?? '',
    role: editing?.role ?? '',
    bio: editing?.bio ?? '',
    notes: editing?.notes ?? '',
    branchId: editing?.branchId ?? (relation && relation.kind !== 'none' ? ix.person.get(relation.of)?.branchId : undefined),
  }));
  const [relKind, setRelKind] = useState<RelKind>(relation?.kind ?? (archive.persons.length ? 'child' : 'none'));
  const [relTo, setRelTo] = useState(relation && relation.kind !== 'none' ? relation.of : '');
  const [unionId, setUnionId] = useState(relation?.kind === 'child' ? relation.unionId : '');
  const [status, setStatus] = useState<UnionStatus>('married');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(!!(editing && (editing.notes || editing.role || editing.occupation)));

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const relFixed = !!relation && relation.kind !== 'none';
  const relPerson = relTo ? ix.person.get(relTo) : undefined;
  const relUnions = relKind === 'child' && relTo ? partnershipsOf(ix, relTo) : [];

  function buildRelation(): Relation {
    if (relKind === 'none' || !relTo) return { kind: 'none' };
    switch (relKind) {
      case 'child': return { kind: 'child', of: relTo, unionId: unionId || relUnions.find((x) => x.partner)?.union.id || 'single' };
      case 'partner': return { kind: 'partner', of: relTo, status, start, end };
      default: return { kind: relKind, of: relTo };
    }
  }

  function submit() {
    if (!f.given.trim() && !f.surname.trim()) return setError('Indiquez au moins un prénom ou un nom.');
    if (!editing && relKind !== 'none' && !relTo) return setError('Choisissez la personne à laquelle la relier, ou « Sans lien ».');
    const data = {
      given: f.given.trim(),
      surname: f.surname.trim(),
      birthSurname: f.birthSurname.trim() || undefined,
      sex: f.sex,
      birth: { date: f.birthDate.trim() || undefined, place: f.birthPlace.trim() || undefined },
      death: { date: f.deathDate.trim() || undefined, place: f.deathPlace.trim() || undefined },
      deceased: f.deceased || !!f.deathDate.trim(),
      occupation: f.occupation.trim() || undefined,
      role: f.role.trim() || undefined,
      bio: f.bio.trim() || undefined,
      notes: f.notes.trim() || undefined,
      branchId: f.branchId,
    };
    try {
      if (editing) {
        update((a) => updatePerson(a, editing.id, data));
        closeModal();
      } else {
        const id = update((a) => addPerson(a, { ...data, portraitId: undefined }, buildRelation()));
        closeModal();
        toast(`${`${data.given} ${data.surname}`.trim()} a été ajouté(e) à l'archive.`);
        go(href.person(id));
      }
    } catch (e) {
      setError(e instanceof FamilyError ? e.message : String(e));
    }
  }

  function remove() {
    if (!editing) return;
    confirmAction(
      `Supprimer ${fullName(editing)} ?`,
      'La fiche, ses liens familiaux et ses événements seront supprimés. Ses photos et ses histoires restent dans l\'archive. Une copie de sauvegarde est faite à chaque ouverture de l\'archive.',
      'Supprimer définitivement',
      () => {
        update((a) => deletePerson(a, editing.id));
        closeModal();
        go(href.home());
        toast(`${fullName(editing)} a été supprimé(e).`);
      },
    );
  }

  const parentCount = relKind === 'parent' && relTo ? parentsOf(ix, relTo).length : 0;

  return (
    <Modal
      title={editing ? `Modifier ${firstName(editing)}` : relFixed && relPerson ? `Ajouter : ${REL_LABELS[relKind].toLowerCase()} ${de(firstName(relPerson))}` : 'Ajouter une personne'}
      subtitle="Seul un prénom ou un nom est obligatoire — le reste pourra être complété plus tard."
      onClose={closeModal}
      wide
      footer={
        <>
          {editing && <button className="btn btn-danger left" onClick={remove}>Supprimer</button>}
          <button className="btn btn-ghost" onClick={closeModal}>Annuler</button>
          <button className="btn btn-primary" onClick={submit}>{editing ? 'Enregistrer' : 'Ajouter à la famille'}</button>
        </>
      }
    >
      <div className="row2">
        <Field label="Prénom(s)">
          <input className={`input${error && !f.given && !f.surname ? ' invalid' : ''}`} autoFocus value={f.given} onChange={(e) => { set('given', e.target.value); setError(null); }} placeholder="Eleanor Rose" />
        </Field>
        <Field label="Nom">
          <input className="input" value={f.surname} onChange={(e) => { set('surname', e.target.value); setError(null); }} placeholder="Whitfield" />
        </Field>
      </div>

      <div className="row2">
        <div>
          <span className="field-label">Sexe</span>
          <div className="seg">
            {([['F', 'Femme'], ['M', 'Homme'], ['U', 'Non précisé']] as const).map(([v, l]) => (
              <button type="button" key={v} className={f.sex === v ? 'on' : ''} onClick={() => set('sex', v)}>{l}</button>
            ))}
          </div>
        </div>
        <Field label="Nom de naissance" hint="Si différent (ex. nom de jeune fille)">
          <input className="input" value={f.birthSurname} onChange={(e) => set('birthSurname', e.target.value)} placeholder="Hart" />
        </Field>
      </div>

      {!editing && archive.persons.length > 0 && (
        <div>
          <span className="field-label">Lien avec la famille</span>
          {!relFixed && (
            <div className="seg">
              {(['child', 'partner', 'parent', 'sibling', 'none'] as RelKind[]).map((k) => (
                <button type="button" key={k} className={relKind === k ? 'on' : ''} onClick={() => setRelKind(k)}>{REL_LABELS[k]}</button>
              ))}
            </div>
          )}
          {relKind !== 'none' && (
            <div className={relKind === 'child' && relUnions.length ? 'row2' : ''} style={{ marginTop: 8 }}>
              <Field label={REL_TO[relKind]}>
                {relFixed ? (
                  <input className="input" value={relPerson ? fullName(relPerson) : ''} disabled />
                ) : (
                  <PersonSelect value={relTo} onChange={(v) => { setRelTo(v); setUnionId(''); setError(null); }} />
                )}
              </Field>
              {relKind === 'child' && relTo && (
                <Field label="Avec">
                  <select className="input" value={unionId || relUnions.find((x) => x.partner)?.union.id || 'single'} onChange={(e) => setUnionId(e.target.value)}>
                    {relUnions.filter((x) => x.partner).map(({ union, partner }) => (
                      <option key={union.id} value={union.id}>{fullName(partner)}</option>
                    ))}
                    <option value="single">Autre parent inconnu</option>
                  </select>
                </Field>
              )}
            </div>
          )}
          {relKind === 'partner' && relTo && (
            <div className="row3" style={{ marginTop: 12 }}>
              <Field label="Statut">
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value as UnionStatus)}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Depuis"><input className="input" value={start} onChange={(e) => setStart(e.target.value)} placeholder="1985" /></Field>
              <Field label="Jusqu'à"><input className="input" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="—" /></Field>
            </div>
          )}
          {parentCount >= 2 && <p className="error-text" style={{ marginTop: 6 }}>Cette personne a déjà deux parents.</p>}
        </div>
      )}

      <div className="row2">
        <Field label="Naissance" hint="« 1931 », « 14/03/1931 », « vers 1890 »…">
          <input className="input" value={f.birthDate} onChange={(e) => set('birthDate', e.target.value)} placeholder="14/03/1931" />
        </Field>
        <Field label="Lieu de naissance" hint="Ville, région ou pays">
          <input className="input" value={f.birthPlace} onChange={(e) => set('birthPlace', e.target.value)} placeholder="Savannah, Géorgie" />
        </Field>
      </div>
      <div className="row2">
        <Field label="Décès">
          <input className="input" value={f.deathDate} onChange={(e) => set('deathDate', e.target.value)} placeholder="Laisser vide si vivant(e)" />
        </Field>
        <Field label="Lieu de décès">
          <input className="input" value={f.deathPlace} onChange={(e) => set('deathPlace', e.target.value)} />
        </Field>
      </div>
      {!f.deathDate && (
        <label className="check">
          <input type="checkbox" checked={f.deceased} onChange={(e) => set('deceased', e.target.checked)} />
          Décédé(e), date inconnue
        </label>
      )}

      <BranchPicker value={f.branchId} onChange={(v) => set('branchId', v)} />

      <Field label="Biographie" hint="Quelques phrases sur qui était cette personne.">
        <textarea className="input" rows={3} value={f.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Ce dont on se souvient : un caractère, une habitude, une phrase…" />
      </Field>

      {showMore ? (
        <>
          <div className="row2">
            <Field label="Métier"><input className="input" value={f.occupation} onChange={(e) => set('occupation', e.target.value)} placeholder="Boulangère" /></Field>
            <Field label="Surnom ou rôle" hint="Affiché sous le nom"><input className="input" value={f.role} onChange={(e) => set('role', e.target.value)} placeholder="Mamie Lou" /></Field>
          </div>
          <Field label="Notes de recherche" hint="Sources, actes, pistes à vérifier…">
            <textarea className="input" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </>
      ) : (
        <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => setShowMore(true)}>＋ Métier, surnom, notes de recherche</button>
      )}

      {error && <p className="error-text">{error}</p>}
    </Modal>
  );
}
