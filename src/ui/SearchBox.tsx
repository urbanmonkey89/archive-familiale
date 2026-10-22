import { useMemo, useRef, useState } from 'react';
import { fullName, lifespan, matchesQuery } from '../data/people';
import { useArchive } from '../data/store';
import { Avatar } from './components';
import { go, href } from './router';

export function SearchBox() {
  const archive = useArchive();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hl, setHl] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo(() => (q.trim() ? archive.persons.filter((p) => matchesQuery(p, q)).slice(0, 10) : []), [archive.persons, q]);

  const pick = (id: string) => {
    go(href.person(id));
    setQ('');
    setOpen(false);
    input.current?.blur();
  };

  return (
    <div className="search">
      <div className="search-box">
        <span style={{ color: '#8fa08f', fontSize: 13 }}>⌕</span>
        <input
          ref={input}
          placeholder="Rechercher…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setHl(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setHl((h) => Math.min(h + 1, results.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setHl((h) => Math.max(h - 1, 0)); }
            if (e.key === 'Enter' && results[hl]) pick(results[hl].id);
            if (e.key === 'Escape') { setQ(''); input.current?.blur(); }
          }}
          aria-label="Rechercher une personne"
        />
      </div>
      {open && q.trim() && (
        <div className="search-results">
          {results.map((p, i) => (
            <button key={p.id} className={i === hl ? 'hl' : ''} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p.id)}>
              <Avatar person={p} size={28} />
              <span>
                <span style={{ display: 'block', fontSize: 13.5 }}>{fullName(p)}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--faint)' }}>{lifespan(p)}</span>
              </span>
            </button>
          ))}
          {!results.length && <div className="search-empty">Aucune personne ne correspond.</div>}
        </div>
      )}
    </div>
  );
}
