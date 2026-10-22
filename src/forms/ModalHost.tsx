import { Modal } from '../ui/components';
import { closeModal, useModals, type ModalSpec } from '../ui/modals';
import { EventForm, PlaceForm, StoryForm } from './ContentForms';
import { PhotoForm, PhotoView } from './MediaForms';
import { PersonForm } from './PersonForm';
import { LinkForm, UnionForm } from './RelationForms';

/** Affiche les fenêtres ouvertes (empilées : une confirmation peut s'ouvrir par-dessus un formulaire). */
export function ModalHost() {
  const stack = useModals((s) => s.stack);
  return (
    <>
      {stack.map((m, i) => (
        <ModalView key={i + m.type} spec={m} />
      ))}
    </>
  );
}

function ModalView({ spec }: { spec: ModalSpec }) {
  switch (spec.type) {
    case 'person': return <PersonForm personId={spec.personId} relation={spec.relation} />;
    case 'link': return <LinkForm personId={spec.personId} />;
    case 'union': return <UnionForm unionId={spec.unionId} />;
    case 'place': return <PlaceForm placeId={spec.placeId} personIds={spec.personIds} />;
    case 'photo': return <PhotoForm {...spec} />;
    case 'photoView': return <PhotoView mediaId={spec.mediaId} list={spec.list} />;
    case 'story': return <StoryForm storyId={spec.storyId} personIds={spec.personIds} placeIds={spec.placeIds} />;
    case 'event': return <EventForm personId={spec.personId} eventId={spec.eventId} />;
    case 'confirm':
      return (
        <Modal
          title={spec.title}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-ghost" onClick={closeModal}>Annuler</button>
              <button className="btn btn-primary" style={{ background: 'var(--error)', color: '#fff' }} onClick={() => { closeModal(); spec.onConfirm(); }}>
                {spec.confirmLabel}
              </button>
            </>
          }
        >
          <p style={{ fontSize: 14.5, color: 'var(--text-2)' }}>{spec.text}</p>
        </Modal>
      );
  }
}
