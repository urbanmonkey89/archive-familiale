import { fullName, subtitle, lifespan } from '../data/people';
import { getIndex } from '../data/selectors';
import { useArchive, useCanEdit } from '../data/store';
import { Avatar, BranchPill, MediaImg, SectionTitle, placeTypeColor } from '../ui/components';
import { openModal } from '../ui/modals';
import { href } from '../ui/router';

export function PlacesPage() {
  const archive = useArchive();
  const canEdit = useCanEdit();
  const ix = getIndex(archive);

  return (
    <section className="screen wide">
      <div className="page-head">
        <div>
          <div className="eyebrow">Là où tout s'est passé</div>
          <h1 className="page-title">Lieux</h1>
          <p className="lede">Les maisons, les commerces et les coins du monde qui ont compté pour la famille.</p>
        </div>
        {canEdit && <button className="btn btn-primary" onClick={() => openModal({ type: 'place' })}><span className="plus">＋</span> Ajouter un lieu</button>}
      </div>
      <div className="places-grid">
        {archive.places.map((pl) => {
          const people = pl.personIds.map((id) => ix.person.get(id)).filter(Boolean);
          const cover = (pl.coverId && ix.media.get(pl.coverId)) || ix.mediaOfPlace.get(pl.id)?.[0];
          return (
            <a key={pl.id} className="place-card lift" href={href.place(pl.id)}>
              <div className="place-cover">
                {cover && <MediaImg media={cover} style={{ width: '100%', height: '100%', borderRadius: 0 }} />}
                <span className="tag" style={{ background: placeTypeColor(pl.type) }}>{pl.type}</span>
              </div>
              <div className="place-body">
                <h3>{pl.name}</h3>
                <div className="sub">{[pl.location, pl.era].filter(Boolean).join(' · ')}</div>
                {pl.blurb && <p>{pl.blurb}</p>}
                <div className="faces">
                  {people.slice(0, 5).map((p) => <span key={p!.id} title={fullName(p)}><Avatar person={p} size={30} fontSize={12} /></span>)}
                  {people.length > 5 && <span style={{ marginLeft: 4 }}>+{people.length - 5}</span>}
                  {!people.length && <span className="faint">Personne n'est encore associé à ce lieu</span>}
                </div>
              </div>
            </a>
          );
        })}
        {canEdit && (
          <button className="dashed" style={{ minHeight: 200, borderRadius: 16 }} onClick={() => openModal({ type: 'place' })}>
            <span className="big">＋</span><span style={{ fontSize: 13.5, fontWeight: 600 }}>Ajouter un lieu</span>
          </button>
        )}
      </div>
      {!archive.places.length && !canEdit && <p className="muted">Aucun lieu pour l'instant.</p>}
    </section>
  );
}

export function PlacePage({ id }: { id: string }) {
  const archive = useArchive();
  const canEdit = useCanEdit();
  const ix = getIndex(archive);
  const pl = ix.place.get(id);
  if (!pl) {
    return (
      <section className="screen narrow">
        <a className="back" href={href.places()}>← Tous les lieux</a>
        <p className="muted">Ce lieu n'existe pas (ou plus).</p>
      </section>
    );
  }
  const people = pl.personIds.map((x) => ix.person.get(x)).filter(Boolean);
  const photos = ix.mediaOfPlace.get(id) ?? [];
  const cover = (pl.coverId && ix.media.get(pl.coverId)) || photos[0];
  const stories = archive.stories.filter((s) => s.placeIds.includes(id));

  return (
    <section className="screen narrow">
      <a className="back" href={href.places()}>← Tous les lieux</a>
      <div className="profile-grid">
        <div className="profile-side">
          <div className="profile-card">
            <div className="portrait" style={{ height: 220 }}>
              {cover ? <MediaImg media={cover} full style={{ width: '100%', height: '100%', borderRadius: 0 }} /> : <span className="mono-label">photo du lieu</span>}
              <span className="tag" style={{ position: 'absolute', top: 14, left: 14, background: placeTypeColor(pl.type) }}>{pl.type}</span>
            </div>
            <div className="card-pad">
              <h1 style={{ fontSize: 26, lineHeight: 1.12 }}>{pl.name}</h1>
              {pl.branchId && <div style={{ marginTop: 10 }}><BranchPill branchId={pl.branchId} /></div>}
              <div className="facts">
                {pl.location && <div><span className="k">Où</span><span>{pl.location}</span></div>}
                {pl.era && <div><span className="k">Quand</span><span>{pl.era}</span></div>}
              </div>
              {canEdit && <button className="btn btn-soft btn-block" style={{ marginTop: 18 }} onClick={() => openModal({ type: 'place', placeId: id })}>Modifier</button>}
            </div>
          </div>
          <div className="rel-box">
            <div className="rel-head">Personnes liées à ce lieu</div>
            {people.map((p) => (
              <a key={p!.id} className="partner-row" href={href.person(p!.id)} style={{ textDecoration: 'none' }}>
                <Avatar person={p} size={30} fontSize={12} />
                <span style={{ minWidth: 0, lineHeight: 1.25 }}>
                  <span className="nm" style={{ display: 'block', fontSize: 13.5 }}>{fullName(p)}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--faint)' }}>{subtitle(p!) || lifespan(p)}</span>
                </span>
              </a>
            ))}
            {!people.length && <div className="faint small">Personne pour l'instant.</div>}
          </div>
        </div>
        <div>
          {(pl.story || pl.blurb) && <p className="bio">{pl.story || pl.blurb}</p>}
          <SectionTitle title="Photos" />
          <div className="photo-grid three">
            {photos.map((m) => (
              <MediaImg key={m.id} media={m} caption={m.caption} style={{ cursor: 'zoom-in' }}
                onClick={() => openModal({ type: 'photoView', mediaId: m.id, list: photos.map((x) => x.id) })} />
            ))}
            {canEdit && (
              <button className="dashed" style={{ borderRadius: 10 }} onClick={() => openModal({ type: 'photo', placeIds: [id] })}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>＋</span><span style={{ fontSize: 11 }}>Ajouter</span>
              </button>
            )}
          </div>
          {stories.length > 0 && (
            <>
              <SectionTitle title="Histoires" />
              {stories.map((s) => (
                <div className="story" key={s.id}>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                    {s.author && <div className="by">Raconté par {s.author}</div>}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
