import { useState } from 'react';
import { addEvent, addPlace, addStory, deleteEvent, deletePlace, deleteStory, updateEvent, updatePlace, updateStory } from '../data/actions';
import { de, firstName } from '../data/people';
import { getIndex } from '../data/selectors';
import { update, useApp, useArchive } from '../data/store';
import { BranchPicker, Field, Modal, PeoplePicker, PlacesPicker, PLACE_TYPES } from '../ui/components';
import { closeModal, confirmAction } from '../ui/modals';
import { go, href } from '../ui/router';

export function PlaceForm({ placeId, personIds = [] }: { placeId?: string; personIds?: string[] }) {
  const archive = useArchive();
  const toast = useApp((s) => s.toast);
  const editing = placeId ? getIndex(archive).place.get(placeId) : undefined;
  const [f, setF] = useState({
    name: editing?.name ?? '',
    type: editing?.type ?? 'Maison',
    location: editing?.location ?? '',
    era: editing?.era ?? '',
    blurb: editing?.blurb ?? '',
    story: editing?.story ?? '',
    personIds: editing?.personIds ?? personIds,
    branchId: editing?.branchId,
  });
  const [error, setError] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  function submit() {
    if (!f.name.trim()) return setError(true);
    const data = {
      name: f.name.trim(), type: f.type, location: f.location.trim() || undefined, era: f.era.trim() || undefined,
      blurb: f.blurb.trim() || undefined, story: f.story.trim() || undefined, personIds: f.personIds, branchId: f.branchId,
    };
    if (editing) {
      update((a) => updatePlace(a, editing.id, data));
      closeModal();
    } else {
      const id = update((a) => addPlace(a, { ...data, coverId: undefined }));
      closeModal();
      go(href.place(id));
    }
  }

  function remove() {
    if (!editing) return;
    confirmAction(`Supprimer « ${editing.name} » ?`, 'Les photos et les personnes liées restent dans l’archive.', 'Supprimer', () => {
      update((a) => deletePlace(a, editing.id));
      closeModal();
      go(href.places());
      toast('Lieu supprimé.');
    });
  }

  return (
    <Modal
      title={editing ? 'Modifier le lieu' : 'Ajouter un lieu'}
      subtitle="Une maison, un commerce, une église, un village… tout endroit qui a compté."
      onClose={closeModal}
      wide
      footer={
        <>
          {editing && <button className="btn btn-danger left" onClick={remove}>Supprimer</button>}
          <button className="btn btn-ghost" onClick={closeModal}>Annuler</button>
          <button className="btn btn-primary" onClick={submit}>{editing ? 'Enregistrer' : 'Ajouter le lieu'}</button>
        </>
      }
    >
      <div className="row2">
        <Field label="Nom du lieu *">
          <input className={`input${error ? ' invalid' : ''}`} autoFocus value={f.name} onChange={(e) => { set('name', e.target.value); setError(false); }} placeholder="La maison de la rue Haute" />
        </Field>
        <Field label="Type">
          <select className="input" value={f.type} onChange={(e) => set('type', e.target.value)}>
            {PLACE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      {error && <p className="error-text">Indiquez le nom du lieu.</p>}
      <div className="row2">
        <Field label="Localisation"><input className="input" value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="Lyon, France" /></Field>
        <Field label="Époque"><input className="input" value={f.era} onChange={(e) => set('era', e.target.value)} placeholder="1953 – 2019" /></Field>
      </div>
      <Field label="En une phrase"><input className="input" value={f.blurb} onChange={(e) => set('blurb', e.target.value)} placeholder="La maison de famille pendant trois générations." /></Field>
      <Field label="Son histoire"><textarea className="input" rows={4} value={f.story} onChange={(e) => set('story', e.target.value)} /></Field>
      <PeoplePicker label="Personnes liées à ce lieu" value={f.personIds} onChange={(v) => set('personIds', v)} />
      <BranchPicker value={f.branchId} onChange={(v) => set('branchId', v)} />
    </Modal>
  );
}

export function StoryForm({ storyId, personIds = [], placeIds = [] }: { storyId?: string; personIds?: string[]; placeIds?: string[] }) {
  const archive = useArchive();
  const editing = storyId ? getIndex(archive).story.get(storyId) : undefined;
  const [title, setTitle] = useState(editing?.title ?? '');
  const [text, setText] = useState(editing?.text ?? '');
  const [author, setAuthor] = useState(editing?.author ?? '');
  const [date, setDate] = useState(editing?.date ?? '');
  const [people, setPeople] = useState(editing?.personIds ?? personIds);
  const [places, setPlaces] = useState(editing?.placeIds ?? placeIds);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!text.trim()) return setError('Écrivez le souvenir.');
    const data = {
      title: title.trim() || text.trim().split(/[.!?\n]/)[0].slice(0, 60),
      text: text.trim(), author: author.trim() || undefined, date: date.trim() || undefined,
      personIds: people, placeIds: places, mediaIds: editing?.mediaIds ?? [],
    };
    if (editing) update((a) => updateStory(a, editing.id, data));
    else update((a) => addStory(a, data));
    closeModal();
  }

  function remove() {
    if (!editing) return;
    confirmAction(`Supprimer « ${editing.title} » ?`, 'Ce texte sera définitivement retiré de l’archive.', 'Supprimer', () => {
      update((a) => deleteStory(a, editing.id));
      closeModal();
    });
  }

  return (
    <Modal
      title={editing ? 'Modifier l’histoire' : 'Raconter un souvenir'}
      subtitle="Une anecdote, une habitude, une phrase qu'on répète encore…"
      onClose={closeModal}
      wide
      footer={
        <>
          {editing && <button className="btn btn-danger left" onClick={remove}>Supprimer</button>}
          <button className="btn btn-ghost" onClick={closeModal}>Annuler</button>
          <button className="btn btn-primary" onClick={submit}>Enregistrer</button>
        </>
      }
    >
      <Field label="Titre"><input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Le pain du dimanche" /></Field>
      <Field label="Le souvenir *">
        <textarea className={`input${error ? ' invalid' : ''}`} rows={7} value={text} onChange={(e) => { setText(e.target.value); setError(null); }} />
      </Field>
      <div className="row2">
        <Field label="Raconté par"><input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Margaret" /></Field>
        <Field label="Date ou époque"><input className="input" value={date} onChange={(e) => setDate(e.target.value)} placeholder="vers 1975" /></Field>
      </div>
      <PeoplePicker label="Personnes concernées" value={people} onChange={setPeople} />
      <PlacesPicker value={places} onChange={setPlaces} />
      {error && <p className="error-text">{error}</p>}
    </Modal>
  );
}

export function EventForm({ personId, eventId }: { personId: string; eventId?: string }) {
  const archive = useArchive();
  const p = getIndex(archive).person.get(personId);
  const editing = p?.events.find((e) => e.id === eventId);
  const [date, setDate] = useState(editing?.date ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [detail, setDetail] = useState(editing?.detail ?? '');
  const [place, setPlace] = useState(editing?.place ?? '');
  const [error, setError] = useState(false);
  if (!p) return null;

  function submit() {
    if (!title.trim()) return setError(true);
    const data = { date: date.trim() || undefined, title: title.trim(), detail: detail.trim() || undefined, place: place.trim() || undefined };
    if (editing) update((a) => updateEvent(a, personId, editing.id, data));
    else update((a) => addEvent(a, personId, data));
    closeModal();
  }

  return (
    <Modal
      title={editing ? 'Modifier l’événement' : `Un moment de la vie ${de(firstName(p))}`}
      subtitle="Études, déménagement, métier, service militaire, distinction…"
      onClose={closeModal}
      footer={
        <>
          {editing && <button className="btn btn-danger left" onClick={() => { update((a) => deleteEvent(a, personId, editing.id)); closeModal(); }}>Supprimer</button>}
          <button className="btn btn-ghost" onClick={closeModal}>Annuler</button>
          <button className="btn btn-primary" onClick={submit}>Enregistrer</button>
        </>
      }
    >
      <div className="row2">
        <Field label="Date"><input className="input" autoFocus value={date} onChange={(e) => setDate(e.target.value)} placeholder="1972" /></Field>
        <Field label="Lieu"><input className="input" value={place} onChange={(e) => setPlace(e.target.value)} /></Field>
      </div>
      <Field label="Ce qui s'est passé *"><input className={`input${error ? ' invalid' : ''}`} value={title} onChange={(e) => { setTitle(e.target.value); setError(false); }} placeholder="Ouverture de la boulangerie" /></Field>
      <Field label="Détail"><textarea className="input" rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} /></Field>
    </Modal>
  );
}
