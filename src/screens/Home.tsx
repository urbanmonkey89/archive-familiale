import { useMemo, useState } from 'react';
import { fold, fullName, lifespan, subtitle } from '../data/people';
import { earliestYear, generationCount, recentChanges, suggestions, timeAgo } from '../data/selectors';
import { useArchive, useCanEdit } from '../data/store';
import { Avatar, SectionTitle } from '../ui/components';
import { openModal } from '../ui/modals';
import { go, href } from '../ui/router';

const PAGE = 60;

export function Home() {
  const archive = useArchive();
  const canEdit = useCanEdit();
  const [branch, setBranch] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const members = useMemo(() => {
    const list = branch ? archive.persons.filter((p) => (branch === '-' ? !p.branchId : p.branchId === branch)) : archive.persons;
    return [...list].sort((a, b) => fold(`${a.surname} ${a.given}`).localeCompare(fold(`${b.surname} ${b.given}`)));
  }, [archive.persons, branch]);

  const gens = generationCount(archive);
  const since = earliestYear(archive);
  const prompts = canEdit ? suggestions(archive) : [];
  const changes = recentChanges(archive);
  const colorOf = (id?: string) => archive.branches.find((b) => b.id === id)?.color;

  const stats = [
    `${archive.persons.length} personne${archive.persons.length > 1 ? 's' : ''}`,
    gens > 1 ? `${gens} générations` : null,
    since ? `depuis ${since}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <section className="screen wide">
      <div className="page-head" style={{ marginBottom: 34 }}>
        <div>
          <div className="eyebrow">La famille</div>
          <h1 className="page-title xl">{archive.meta.title}</h1>
          <p className="lede">{archive.meta.subtitle || stats}</p>
          {archive.meta.subtitle && <p className="faint small" style={{ marginTop: 4 }}>{stats}</p>}
        </div>
      </div>

      <div className="home-grid">
        <div>
          <SectionTitle title="Membres de la famille" />
          {archive.branches.length > 0 && (
            <div className="filters">
              <button className={`filter${branch === null ? ' on' : ''}`} onClick={() => setBranch(null)}>Tous</button>
              {archive.branches.map((b) => (
                <button key={b.id} className={`filter${branch === b.id ? ' on' : ''}`} onClick={() => setBranch(b.id)}>
                  <span className="dot" style={{ background: b.color }} />{b.label}
                </button>
              ))}
            </div>
          )}
          <div className="members">
            {members.slice(0, limit).map((p) => (
              <a key={p.id} href={href.person(p.id)} className="member lift" style={{ borderLeftColor: colorOf(p.branchId) ?? 'var(--line)' }}>
                <div className="member-top">
                  <Avatar person={p} size={54} fontSize={20} />
                  <div style={{ minWidth: 0 }}>
                    <div className="member-name" title={fullName(p)}>{fullName(p)}</div>
                    <div className="member-role">{subtitle(p)}</div>
                  </div>
                </div>
                <div className="member-dates">{lifespan(p)}</div>
              </a>
            ))}
            {canEdit && (
              <button className="dashed" style={{ minHeight: 118 }} onClick={() => openModal({ type: 'person', relation: { kind: 'none' } })}>
                <span className="big">＋</span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>Ajouter une personne</span>
              </button>
            )}
          </div>
          {members.length > limit && (
            <button className="btn btn-soft" style={{ marginTop: 18 }} onClick={() => setLimit((l) => l + PAGE * 4)}>
              Afficher plus ({members.length - limit} restantes)
            </button>
          )}
          {!archive.persons.length && (
            <p className="muted" style={{ marginTop: 18 }}>
              L'archive est vide. Commencez par vous-même ou par l'ancêtre le plus ancien que vous connaissez, puis ajoutez ses enfants, parents et conjoints depuis sa fiche.
            </p>
          )}
        </div>

        <aside className="side">
          {prompts.length > 0 && (
            <div className="prompts">
              <h3><span style={{ color: 'var(--accent)' }}>✦</span> À compléter</h3>
              <p>Quelques détails qui enrichiraient l'archive.</p>
              {prompts.map((g) => (
                <button
                  key={g.text}
                  className="prompt"
                  onClick={() => {
                    if (g.action === 'edit') openModal({ type: 'person', personId: g.personId });
                    else if (g.action === 'photo') openModal({ type: 'photo', personIds: [g.personId], portraitFor: g.personId });
                    else if (g.action === 'story') openModal({ type: 'story', personIds: [g.personId] });
                    else go(href.person(g.personId));
                  }}
                >
                  <span>{g.text}</span><span className="arrow">→</span>
                </button>
              ))}
            </div>
          )}
          {changes.length > 0 && (
            <div className="card card-pad">
              <h3 style={{ fontSize: 18, marginBottom: 16 }}>Dernières modifications</h3>
              <div className="activity">
                {changes.map((c) => {
                  const p = c.personId ? archive.persons.find((x) => x.id === c.personId) : undefined;
                  const target = c.kind === 'place' ? href.place(c.id) : c.personId ? href.person(c.personId) : href.photos();
                  return (
                    <a key={c.kind + c.id} className="activity-item" href={target}>
                      <Avatar person={p} size={34} fontSize={13} />
                      <div style={{ minWidth: 0 }}>
                        <div className="t">{c.label}</div>
                        <div className="w">{timeAgo(c.at)}</div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
