import { useEffect, useRef, useState } from 'react';
import { addMedia, deleteMedia, updateMedia, updatePerson, updatePlace } from '../data/actions';
import { longDate } from '../data/dates';
import { de, firstName } from '../data/people';
import { newId } from '../data/schema';
import { getIndex } from '../data/selectors';
import { update, useApp, useArchive, useCanEdit } from '../data/store';
import { extensionOf, IMAGE_ACCEPT } from '../storage/images';
import { Field, MediaImg, Modal, PeoplePicker, PersonChip, PlacesPicker } from '../ui/components';
import { closeModal, confirmAction, useModals } from '../ui/modals';

export function PhotoForm({ mediaId, personIds = [], placeIds = [], portraitFor, coverFor }: {
  mediaId?: string;
  personIds?: string[];
  placeIds?: string[];
  portraitFor?: string;
  coverFor?: string;
}) {
  const archive = useArchive();
  const adapter = useApp((s) => s.adapter)!;
  const toast = useApp((s) => s.toast);
  const ix = getIndex(archive);
  const editing = mediaId ? ix.media.get(mediaId) : undefined;
  const portraitPerson = portraitFor ? ix.person.get(portraitFor) : undefined;

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState(editing?.caption ?? '');
  const [date, setDate] = useState(editing?.date ?? '');
  const [people, setPeople] = useState<string[]>(editing?.personIds ?? personIds);
  const [places, setPlaces] = useState<string[]>(editing?.placeIds ?? placeIds);
  const [asPortrait, setAsPortrait] = useState(!!portraitFor);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setError('Ce fichier n’est pas une image (JPG, PNG, WebP).');
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!caption) setCaption(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
  }

  async function submit() {
    if (!editing && !file) return setError('Choisissez une photo.');
    setBusy(true);
    try {
      const patch = { caption: caption.trim(), date: date.trim() || undefined, personIds: people, placeIds: places };
      let id = editing?.id;
      if (editing) {
        update((a) => updateMedia(a, editing.id, patch));
      } else {
        id = newId('m');
        const stored = await adapter.importMedia(file!, id, extensionOf(file!.name));
        update((a) => addMedia(a, { id, ...stored, ...patch }));
      }
      if (asPortrait && portraitFor) {
        update((a) => updatePerson(a, portraitFor, { portraitId: id }));
        if (!people.includes(portraitFor)) update((a) => updateMedia(a, id!, { personIds: [...people, portraitFor] }));
      }
      if (coverFor) update((a) => updatePlace(a, coverFor, { coverId: id }));
      closeModal();
      if (!editing) toast('Photo ajoutée.');
    } catch (e) {
      setError(`Impossible d'enregistrer la photo : ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    if (!editing) return;
    confirmAction('Retirer cette photo ?', "Elle n'apparaîtra plus dans l'archive. Le fichier reste dans le dossier « medias » de l'archive.", 'Retirer', () => {
      update((a) => deleteMedia(a, editing.id));
      useModals.setState({ stack: [] });
      toast('Photo retirée.');
    });
  }

  return (
    <Modal
      title={editing ? 'Modifier la photo' : portraitPerson ? `Portrait ${de(firstName(portraitPerson))}` : 'Ajouter une photo'}
      subtitle="Indiquez qui est dessus et où elle a été prise : elle apparaîtra sur leurs pages."
      onClose={closeModal}
      footer={
        <>
          {editing && <button className="btn btn-danger left" onClick={remove}>Retirer</button>}
          <button className="btn btn-ghost" onClick={closeModal}>Annuler</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Ajouter'}</button>
        </>
      }
    >
      {editing ? (
        <MediaImg media={editing} style={{ height: 200 }} />
      ) : (
        <div
          className={`dashed drop${drag ? ' drag' : ''}`}
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files[0]); }}
          role="button"
        >
          {preview ? (
            <img src={preview} alt="" />
          ) : (
            <>
              <span className="big">⤓</span>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Déposez une photo ici, ou cliquez pour la choisir</span>
              <span className="hint">JPG, PNG ou WebP · la photo originale est conservée dans l'archive</span>
            </>
          )}
          <input ref={input} type="file" accept={IMAGE_ACCEPT} hidden onChange={(e) => choose(e.target.files?.[0])} />
        </div>
      )}
      <div className="row2">
        <Field label="Légende"><input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Mariage d'Eleanor et James" /></Field>
        <Field label="Date"><input className="input" value={date} onChange={(e) => setDate(e.target.value)} placeholder="vers 1953" /></Field>
      </div>
      <PeoplePicker value={people} onChange={setPeople} />
      <PlacesPicker value={places} onChange={setPlaces} />
      {portraitPerson && (
        <label className="check">
          <input type="checkbox" checked={asPortrait} onChange={(e) => setAsPortrait(e.target.checked)} />
          Utiliser comme portrait de {firstName(portraitPerson)}
        </label>
      )}
      {error && <p className="error-text">{error}</p>}
    </Modal>
  );
}

/** Visionneuse plein écran, avec photo précédente / suivante. */
export function PhotoView({ mediaId, list }: { mediaId: string; list?: string[] }) {
  const archive = useArchive();
  const canEdit = useCanEdit();
  const ix = getIndex(archive);
  const [current, setCurrent] = useState(mediaId);
  const m = ix.media.get(current);
  const ids = list ?? [mediaId];
  const pos = ids.indexOf(current);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && pos < ids.length - 1) setCurrent(ids[pos + 1]);
      if (e.key === 'ArrowLeft' && pos > 0) setCurrent(ids[pos - 1]);
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pos, ids]);

  if (!m) return null;
  return (
    <div className="overlay" style={{ background: 'rgba(8,10,8,.88)' }} onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
      <div className="modal photo-view">
        <div className="photo-view-body">
          <MediaImg media={m} full style={{ borderRadius: 0, minHeight: 300, background: '#000' }} />
        </div>
        <div className="photo-view-info">
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="serif" style={{ fontSize: 19 }}>{m.caption || 'Sans légende'}</div>
            {m.date && <div style={{ fontSize: 12.5, color: 'var(--night-muted)' }}>{longDate(m.date)}</div>}
            <div className="album-tags" style={{ marginTop: 8 }}>
              {m.personIds.map((id) => ix.person.get(id)).filter(Boolean).map((p) => (
                <span key={p!.id} onClick={() => useModals.setState({ stack: [] })}><PersonChip person={p!} small /></span>
              ))}
            </div>
          </div>
          {ids.length > 1 && <span style={{ fontSize: 12, color: 'var(--night-muted)' }}>{pos + 1} / {ids.length}</span>}
          <button className="btn btn-ghost" style={{ color: 'var(--night-ink)' }} disabled={pos <= 0} onClick={() => setCurrent(ids[pos - 1])}>←</button>
          <button className="btn btn-ghost" style={{ color: 'var(--night-ink)' }} disabled={pos >= ids.length - 1} onClick={() => setCurrent(ids[pos + 1])}>→</button>
          {canEdit && <button className="btn btn-soft" onClick={() => useModals.getState().open({ type: 'photo', mediaId: m.id })}>Modifier</button>}
          <button className="btn btn-primary" onClick={closeModal}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
