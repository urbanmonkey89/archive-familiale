import { longDate, sortKeyOf, span } from '../data/dates';
import { bornLabel, de, diedLabel, firstName, fullName, isDeceased, lifespan, subtitle } from '../data/people';
import type { Person } from '../data/schema';
import { childrenOfUnion, getIndex, parentsOf, partnershipsOf, siblingsOf } from '../data/selectors';
import { useArchive, useCanEdit } from '../data/store';
import { Avatar, BranchPill, MediaImg, PersonChip, SectionTitle, placeTypeColor } from '../ui/components';
import { openModal } from '../ui/modals';
import { href } from '../ui/router';
import { STATUS_LABEL, statusColor } from '../ui/unionStatus';

interface TLItem {
  key: string;
  date?: string;
  title: string;
  detail?: string;
  eventId?: string;
}

export function PersonPage({ id }: { id: string }) {
  const archive = useArchive();
  const canEdit = useCanEdit();
  const ix = getIndex(archive);
  const p = ix.person.get(id);
  if (!p) {
    return (
      <section className="screen narrow">
        <a className="back" href={href.home()}>← Toute la famille</a>
        <p className="muted">Cette personne n'existe pas (ou plus) dans l'archive.</p>
      </section>
    );
  }

  const parents = parentsOf(ix, id);
  const siblings = siblingsOf(ix, id);
  const partnerships = partnershipsOf(ix, id);
  const stories = ix.storiesOfPerson.get(id) ?? [];
  const photos = ix.mediaOfPerson.get(id) ?? [];
  const places = ix.placesOfPerson.get(id) ?? [];
  const portrait = p.portraitId ? ix.media.get(p.portraitId) : undefined;
  const firstUnion = partnerships.find((x) => x.partner) ?? partnerships[0];

  const timeline = buildTimeline(p, partnerships, ix);

  return (
    <section className="screen narrow">
      <a className="back" href={href.home()}>← Toute la famille</a>
      <div className="profile-grid">
        <div className="profile-side">
          <div className="profile-card">
            <div className="portrait">
              {portrait ? (
                <MediaImg media={portrait} full style={{ width: '100%', height: '100%', borderRadius: 0 }} onClick={() => openModal({ type: 'photoView', mediaId: portrait.id })} />
              ) : (
                <>
                  <Avatar person={p} size={96} fontSize={38} />
                  <span className="mono-label">{canEdit ? '' : 'portrait'}</span>
                </>
              )}
              {canEdit && (
                <button className="btn btn-soft corner" style={{ padding: '6px 10px', fontSize: 12 }}
                  onClick={() => openModal({ type: 'photo', personIds: [id], portraitFor: id })}>
                  {portrait ? 'Changer' : '＋ Portrait'}
                </button>
              )}
            </div>
            <div className="card-pad">
              <h1 style={{ fontSize: 29, lineHeight: 1.1 }}>{fullName(p)}</h1>
              {p.birthSurname && p.birthSurname !== p.surname && (
                <div className="serif muted" style={{ fontStyle: 'italic', fontSize: 15, marginTop: 2 }}>
                  {p.sex === 'M' ? 'né' : 'née'} {p.birthSurname}
                </div>
              )}
              <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {subtitle(p) && <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, color: 'var(--accent)' }}>{subtitle(p)}</span>}
                <BranchPill branchId={p.branchId} />
              </div>
              <div className="facts">
                <div><span className="k">Vie</span><span>{lifespan(p)}</span></div>
                {(p.birth.date || p.birth.place) && (
                  <div><span className="k">{bornLabel(p)}</span><span>{[longDate(p.birth.date), p.birth.place && `à ${p.birth.place}`].filter(Boolean).join(' ')}</span></div>
                )}
                {(p.death.date || p.death.place) && (
                  <div><span className="k">{diedLabel(p)}</span><span>{[longDate(p.death.date), p.death.place && `à ${p.death.place}`].filter(Boolean).join(' ')}</span></div>
                )}
                {p.occupation && <div><span className="k">Métier</span><span>{p.occupation}</span></div>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                {canEdit && <button className="btn btn-soft" style={{ flex: 1 }} onClick={() => openModal({ type: 'person', personId: id })}>Modifier</button>}
                <a className="btn btn-soft" style={{ flex: 1, textDecoration: 'none' }} href={href.tree(id)}>Voir dans l'arbre</a>
              </div>
            </div>
          </div>

          <div className="rel-box">
            <div className="rel-head">Liens familiaux</div>
            {parents.length > 0 && (
              <div className="rel-group">
                <div className="rel-label">Parents</div>
                <div className="chips">{parents.map((x) => <PersonChip key={x.id} person={x} />)}</div>
              </div>
            )}
            {siblings.length > 0 && (
              <div className="rel-group">
                <div className="rel-label">Frères et sœurs</div>
                <div className="chips">{siblings.map((x) => <PersonChip key={x.id} person={x} />)}</div>
              </div>
            )}
            {partnerships.some((x) => x.partner) && (
              <div className="rel-group">
                <div className="rel-label">Unions</div>
                {partnerships.filter((x) => x.partner).map(({ union, partner }) => (
                  <div key={union.id} className="partner-row">
                    <a href={href.person(partner!.id)}>
                      <Avatar person={partner} size={28} fontSize={12} />
                      <span style={{ minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                        <span className="nm">{fullName(partner)}</span>
                        <span className="yr">{span(union.start, union.end)}</span>
                      </span>
                    </a>
                    <span className="status" style={{ color: statusColor(union.status) }}>{STATUS_LABEL[union.status]}</span>
                    {canEdit && <button className="mini-btn" title="Modifier l'union" onClick={() => openModal({ type: 'union', unionId: union.id })}>✎</button>}
                  </div>
                ))}
              </div>
            )}
            {partnerships.map(({ union, partner }) => {
              const kids = childrenOfUnion(ix, union);
              if (!kids.length) return null;
              return (
                <div className="rel-group" key={'c' + union.id}>
                  <div className="rel-label">
                    Enfants{partnerships.length > 1 ? (partner ? ` avec ${firstName(partner)}` : ' (autre parent inconnu)') : ''}
                  </div>
                  <div className="chips">{kids.map((x) => <PersonChip key={x.id} person={x} />)}</div>
                </div>
              );
            })}
            {!parents.length && !siblings.length && !partnerships.length && (
              <p className="faint small">Aucun lien pour l'instant.</p>
            )}
            {canEdit && (
              <div className="rel-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', borderTop: '1px solid var(--line-3)', paddingTop: 12 }}>
                <button className="link-btn" onClick={() => openModal({ type: 'person', relation: { kind: 'child', of: id, unionId: firstUnion?.union.id ?? 'single' } })}>＋ Enfant</button>
                <button className="link-btn" onClick={() => openModal({ type: 'person', relation: { kind: 'partner', of: id, status: 'married' } })}>＋ Conjoint</button>
                {parents.length < 2 && <button className="link-btn" onClick={() => openModal({ type: 'person', relation: { kind: 'parent', of: id } })}>＋ Parent</button>}
                <button className="link-btn" onClick={() => openModal({ type: 'person', relation: { kind: 'sibling', of: id } })}>＋ Frère / sœur</button>
                <button className="link-btn" style={{ color: 'var(--muted)' }} onClick={() => openModal({ type: 'link', personId: id })}>Relier une personne existante…</button>
              </div>
            )}
          </div>
        </div>

        <div>
          {p.bio && <p className="bio">{p.bio}</p>}

          <SectionTitle title="Les grandes étapes">
            {canEdit && <button className="link-btn" onClick={() => openModal({ type: 'event', personId: id })}>＋ Événement</button>}
          </SectionTitle>
          {timeline.length ? (
            <div className="timeline">
              {timeline.map((e) => (
                <div className="tl-item" key={e.key}>
                  <div className="tl-dot" />
                  <div className="tl-year">{e.date ? longDate(e.date) : 'Date inconnue'}</div>
                  <div className="tl-title">
                    {e.title}
                    {canEdit && e.eventId && (
                      <button className="mini-btn edit-inline" onClick={() => openModal({ type: 'event', personId: id, eventId: e.eventId })}>✎</button>
                    )}
                  </div>
                  {e.detail && <div className="tl-detail">{e.detail}</div>}
                </div>
              ))}
            </div>
          ) : (
            <p className="faint">Aucune date connue pour l'instant.</p>
          )}

          <SectionTitle title="Histoires et souvenirs">
            {canEdit && <button className="link-btn" onClick={() => openModal({ type: 'story', personIds: [id] })}>＋ Ajouter</button>}
          </SectionTitle>
          {stories.length ? (
            stories.map((s) => {
              const pic = s.mediaIds.map((m) => ix.media.get(m)).find(Boolean);
              return (
                <div className="story" key={s.id}>
                  {pic && <MediaImg media={pic} style={{ width: 96, height: 96, flexShrink: 0, cursor: 'zoom-in' }} onClick={() => openModal({ type: 'photoView', mediaId: pic.id })} />}
                  <div style={{ minWidth: 0 }}>
                    <h3>
                      {s.title}
                      {canEdit && <button className="mini-btn edit-inline" onClick={() => openModal({ type: 'story', storyId: s.id })}>✎</button>}
                    </h3>
                    <p>{s.text}</p>
                    <div className="by">
                      {[s.author && `Raconté par ${s.author}`, s.date && longDate(s.date)].filter(Boolean).join(' · ')}
                      {s.personIds.filter((x) => x !== id).map((x) => ix.person.get(x)).filter(Boolean).map((x) => (
                        <span key={x!.id} style={{ marginLeft: 8 }}><PersonChip person={x!} small /></span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          ) : canEdit ? (
            <button className="dashed" style={{ width: '100%', padding: 24, fontSize: 14 }} onClick={() => openModal({ type: 'story', personIds: [id] })}>
              Pas encore d'histoire — soyez le premier à raconter un souvenir {de(firstName(p))}.
            </button>
          ) : (
            <p className="faint">Pas encore d'histoire.</p>
          )}

          <SectionTitle title="Photos" />
          <div className="photo-grid">
            {photos.map((m) => (
              <MediaImg key={m.id} media={m} caption={m.caption} style={{ cursor: 'zoom-in' }}
                onClick={() => openModal({ type: 'photoView', mediaId: m.id, list: photos.map((x) => x.id) })} />
            ))}
            {canEdit && (
              <button className="dashed" style={{ borderRadius: 10 }} onClick={() => openModal({ type: 'photo', personIds: [id] })}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>＋</span><span style={{ fontSize: 11 }}>Ajouter</span>
              </button>
            )}
          </div>
          {!photos.length && !canEdit && <p className="faint">Pas encore de photo.</p>}

          {places.length > 0 && (
            <>
              <SectionTitle title="Lieux" />
              {places.map((pl) => (
                <a key={pl.id} className="place-row" href={href.place(pl.id)}>
                  <span className="square" style={{ background: placeTypeColor(pl.type) }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="nm">{pl.name}</span>
                    <span className="sub">{[pl.type, pl.location, pl.era].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="arrow">→</span>
                </a>
              ))}
            </>
          )}

          {p.notes && (
            <>
              <SectionTitle title="Notes de recherche" />
              <p className="muted" style={{ whiteSpace: 'pre-line', fontSize: 14 }}>{p.notes}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function buildTimeline(p: Person, partnerships: ReturnType<typeof partnershipsOf>, ix: ReturnType<typeof getIndex>): TLItem[] {
  const items: TLItem[] = [];
  if (p.birth.date || p.birth.place) {
    items.push({ key: 'birth', date: p.birth.date, title: 'Naissance', detail: p.birth.place ? `à ${p.birth.place}` : undefined });
  }
  for (const { union, partner } of partnerships) {
    if (partner && union.start) {
      const what = union.status === 'partner' ? 'Vie commune avec' : 'Mariage avec';
      items.push({ key: 'u' + union.id, date: union.start, title: `${what} ${fullName(partner)}`, detail: union.place });
    }
    if (partner && union.end && (union.status === 'divorced' || union.status === 'separated')) {
      items.push({ key: 'ue' + union.id, date: union.end, title: union.status === 'divorced' ? `Divorce d'avec ${firstName(partner)}` : `Séparation d'avec ${firstName(partner)}` });
    }
    for (const c of childrenOfUnion(ix, union)) {
      if (c.birth.date) items.push({ key: 'c' + c.id, date: c.birth.date, title: `Naissance ${de(firstName(c))}`, detail: c.birth.place ? `à ${c.birth.place}` : undefined });
    }
  }
  for (const e of p.events) items.push({ key: e.id, date: e.date, title: e.title, detail: [e.detail, e.place && `(${e.place})`].filter(Boolean).join(' '), eventId: e.id });
  if (isDeceased(p)) items.push({ key: 'death', date: p.death.date, title: 'Décès', detail: p.death.place ? `à ${p.death.place}` : undefined });

  // Tri chronologique ; sans date : la naissance en premier, le décès en dernier, le reste juste avant.
  const rank = (it: TLItem) => sortKeyOf(it.date) ?? (it.key === 'birth' ? -Infinity : it.key === 'death' ? Infinity : Number.MAX_SAFE_INTEGER);
  return items
    .map((it, i) => ({ it, i, k: rank(it) }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map(({ it }) => it);
}
