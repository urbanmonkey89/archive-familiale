import { useMemo, useState } from 'react';
import { sortKeyOf } from '../data/dates';
import { getIndex } from '../data/selectors';
import { useArchive, useCanEdit } from '../data/store';
import { MediaImg, PersonChip, placeTypeColor, placeholderRatio } from '../ui/components';
import { openModal } from '../ui/modals';
import { href } from '../ui/router';

export function PhotosPage() {
  const archive = useArchive();
  const canEdit = useCanEdit();
  const ix = getIndex(archive);
  const [order, setOrder] = useState<'recent' | 'date'>('recent');

  const list = useMemo(() => {
    const l = [...archive.media];
    if (order === 'date') l.sort((a, b) => (sortKeyOf(a.date) ?? Infinity) - (sortKeyOf(b.date) ?? Infinity));
    else l.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return l;
  }, [archive.media, order]);
  const ids = list.map((m) => m.id);

  return (
    <section className="screen narrow" style={{ paddingTop: 40 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Album de famille</div>
          <h1 className="page-title">Photos</h1>
          <p className="lede">{archive.media.length} photo{archive.media.length > 1 ? 's' : ''}</p>
        </div>
        <div className="actions-row">
          <div className="filters" style={{ margin: 0 }}>
            <button className={`filter${order === 'recent' ? ' on' : ''}`} onClick={() => setOrder('recent')}>Ajoutées récemment</button>
            <button className={`filter${order === 'date' ? ' on' : ''}`} onClick={() => setOrder('date')}>Par date</button>
          </div>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => openModal({ type: 'photo' })}><span className="plus">＋</span> Ajouter une photo</button>
          )}
        </div>
      </div>
      {!list.length && <p className="muted">Aucune photo pour l'instant.</p>}
      <div className="album">
        {list.map((m) => (
          <div className="album-item" key={m.id}>
            <MediaImg media={m} style={{ aspectRatio: `1 / ${placeholderRatio(m)}` }} onClick={() => openModal({ type: 'photoView', mediaId: m.id, list: ids })} />
            {m.caption && <div className="album-cap">{m.caption}</div>}
            <div className="album-tags">
              {m.personIds.map((id) => ix.person.get(id)).filter(Boolean).map((p) => <PersonChip key={p!.id} person={p!} small />)}
              {m.placeIds.map((id) => ix.place.get(id)).filter(Boolean).map((pl) => (
                <a key={pl!.id} className="chip small place" href={href.place(pl!.id)}>
                  <span className="square" style={{ width: 8, height: 8, borderRadius: 2, background: placeTypeColor(pl!.type) }} />{pl!.name}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
