import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { fold, fullName, initials, lifespan, tintOf } from '../data/people';
import type { Media, Person } from '../data/schema';
import { getIndex } from '../data/selectors';
import { useApp, useArchive } from '../data/store';
import { href } from './router';

// ───────── Images ─────────

/** URL affichable d'un fichier de l'archive, ou null s'il est absent. */
export function useMediaUrl(path: string | undefined): string | null {
  const adapter = useApp((s) => s.adapter);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (path && adapter) {
      adapter.mediaUrl(path).then(
        (u) => alive && setUrl(u),
        () => alive && setUrl(null),
      );
    }
    return () => {
      alive = false;
    };
  }, [path, adapter]);
  return url;
}

/** Photo avec repli sur le motif rayé de la maquette si le fichier manque. */
export function MediaImg({ media, full = false, caption, className = '', style, onClick }: {
  media: Media | undefined;
  full?: boolean;
  caption?: string;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const url = useMediaUrl(media ? (full ? media.file : media.thumb ?? media.file) : undefined);
  return (
    <div className={`photo-ph ${className}`} style={style} onClick={onClick} role={onClick ? 'button' : undefined}>
      {url && <img src={url} alt={media?.caption ?? ''} loading="lazy" draggable={false} />}
      {caption && <span className="cap">{caption}</span>}
    </div>
  );
}

export function placeholderRatio(m: Media): number {
  if (m.width && m.height) return m.height / m.width;
  let h = 0;
  for (const c of m.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return [0.75, 1, 1.25, 0.9, 1.35][h % 5];
}

// ───────── Personnes ─────────

export function Avatar({ person, size = 36, fontSize }: { person: Person | undefined; size?: number; fontSize?: number }) {
  const archive = useArchive();
  const portrait = person?.portraitId ? getIndex(archive).media.get(person.portraitId) : undefined;
  const url = useMediaUrl(portrait ? portrait.thumb ?? portrait.file : undefined);
  return (
    <span
      className="avatar"
      style={{
        width: size, height: size, fontSize: fontSize ?? Math.round(size * 0.38),
        backgroundColor: person ? tintOf(person.id) : '#8a8270',
      }}
      aria-hidden
    >
      {url ? <img src={url} alt="" draggable={false} /> : initials(person)}
    </span>
  );
}

export function PersonChip({ person, small = false, label }: { person: Person; small?: boolean; label?: string }) {
  return (
    <a className={`chip${small ? ' small' : ''}`} href={href.person(person.id)} title={`${fullName(person)} · ${lifespan(person)}`}>
      <Avatar person={person} size={small ? 18 : 24} />
      {label ?? (small ? person.given.split(' ')[0] || fullName(person) : fullName(person))}
    </a>
  );
}

export function BranchPill({ branchId }: { branchId?: string }) {
  const archive = useArchive();
  const b = archive.branches.find((x) => x.id === branchId);
  if (!b) return null;
  return (
    <span className="pill-label">
      <span className="dot" style={{ background: b.color }} />
      {b.label}
    </span>
  );
}

export function useBranchColor(branchId?: string): string | undefined {
  const archive = useArchive();
  return archive.branches.find((x) => x.id === branchId)?.color;
}

// ───────── Mise en page ─────────

export function SectionTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      <div className="rule" />
      {children}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, footer, wide = false }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal aria-label={title}>
        <div className="modal-head">
          <div style={{ flex: 1 }}>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, style }: { label: string; hint?: string; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <label className="field" style={style}>
      <span>{label}</span>
      {hint && <span className="hint">{hint}</span>}
      {children}
    </label>
  );
}

// ───────── Sélecteurs ─────────

export function BranchPicker({ value, onChange }: { value?: string; onChange: (id?: string) => void }) {
  const archive = useArchive();
  if (!archive.branches.length) return null;
  return (
    <div>
      <span className="field-label">Branche de la famille</span>
      <span className="hint">Colore la personne dans l'arbre. Les branches se gèrent dans les réglages.</span>
      <div className="seg">
        {[...archive.branches, { id: '', label: 'Aucune', color: '#cfc4ac' }].map((b) => {
          const on = (value ?? '') === b.id;
          return (
            <button type="button" key={b.id} className={on ? 'on' : ''} onClick={() => onChange(b.id || undefined)}
              style={on ? { background: b.color, borderColor: b.color, color: '#fff' } : undefined}>
              <span className="dot" style={{ background: b.color, marginRight: 6, boxShadow: on ? '0 0 0 2px #fff' : undefined }} />
              {b.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function sortedPersons(persons: Person[]): Person[] {
  return [...persons].sort((a, b) => fold(`${a.surname} ${a.given}`).localeCompare(fold(`${b.surname} ${b.given}`)));
}

/** Liste déroulante de personnes, triée par nom. */
export function PersonSelect({ value, onChange, exclude = [], placeholder = 'Choisir une personne…' }: {
  value: string;
  onChange: (id: string) => void;
  exclude?: string[];
  placeholder?: string;
}) {
  const archive = useArchive();
  const options = useMemo(() => sortedPersons(archive.persons.filter((p) => !exclude.includes(p.id))), [archive.persons, exclude]);
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((p) => (
        <option key={p.id} value={p.id}>
          {p.surname ? `${p.surname.toUpperCase()} ${p.given}` : p.given} — {lifespan(p)}
        </option>
      ))}
    </select>
  );
}

/** Sélection multiple de personnes (étiquettes cliquables + filtre). */
export function PeoplePicker({ value, onChange, label = 'Personnes sur la photo' }: {
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}) {
  const archive = useArchive();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const all = sortedPersons(archive.persons);
    const f = fold(q.trim());
    return f ? all.filter((p) => value.includes(p.id) || fold(fullName(p)).includes(f)) : all;
  }, [archive.persons, q, value]);
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div>
      <span className="field-label">{label}</span>
      {archive.persons.length > 12 && <input className="input" placeholder="Filtrer…" value={q} onChange={(e) => setQ(e.target.value)} />}
      <div className="pick-list">
        {list.map((p) => (
          <button type="button" key={p.id} className={`pick${value.includes(p.id) ? ' on' : ''}`} onClick={() => toggle(p.id)}>
            <Avatar person={p} size={20} />
            {fullName(p)}
          </button>
        ))}
        {!list.length && <span className="hint">Personne ne correspond.</span>}
      </div>
    </div>
  );
}

export function PlacesPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const archive = useArchive();
  if (!archive.places.length) return null;
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div>
      <span className="field-label">Lieux</span>
      <div className="pick-list">
        {archive.places.map((pl) => (
          <button type="button" key={pl.id} className={`pick${value.includes(pl.id) ? ' on' : ''}`} style={{ paddingLeft: 11 }} onClick={() => toggle(pl.id)}>
            {pl.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export const PLACE_TYPES = ['Maison', 'Commerce', 'Église', 'Ferme', 'Lieu de réunion', 'École', 'Sépulture', 'Ville', 'Autre'];

const TYPE_COLORS: Record<string, string> = {
  Maison: '#5b6e63', Commerce: '#8a6f4b', 'Église': '#6a6f86', Ferme: '#6e7a5a', 'Lieu de réunion': '#866a78',
  'École': '#5a6b86', 'Sépulture': '#7d6a6a', Ville: '#6a7d7a',
};

export function placeTypeColor(t: string): string {
  return TYPE_COLORS[t] ?? '#8a8270';
}
