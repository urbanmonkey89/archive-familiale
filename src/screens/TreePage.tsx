import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { span } from '../data/dates';
import { firstName, fullName, lifespan } from '../data/people';
import { getIndex } from '../data/selectors';
import { useArchive, useCanEdit } from '../data/store';
import { CARD_H, layoutTree, type TLink, type TNode } from '../tree/layout';
import { Avatar } from '../ui/components';
import { openModal } from '../ui/modals';
import { go, href } from '../ui/router';
import { STATUS_LABEL, statusColor, statusDashed } from '../ui/unionStatus';

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 1.8;

function readPref(key: string, def: number): number {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && localStorage.getItem(key) !== null ? v : def;
  } catch {
    return def;
  }
}

export function TreePage({ focusId }: { focusId?: string }) {
  const archive = useArchive();
  const canEdit = useCanEdit();
  const ix = getIndex(archive);
  const focus = (focusId && ix.person.get(focusId)) || ix.person.get(archive.meta.homePersonId ?? '') || archive.persons[0];

  const [up, setUp] = useState(() => readPref('arbre-ancetres', 3));
  const [down, setDown] = useState(() => readPref('arbre-descendants', 3));
  const [zoom, setZoom] = useState(() => readPref('arbre-zoom', 1));
  useEffect(() => {
    try {
      localStorage.setItem('arbre-ancetres', String(up));
      localStorage.setItem('arbre-descendants', String(down));
      localStorage.setItem('arbre-zoom', String(zoom));
    } catch { /* préférences facultatives */ }
  }, [up, down, zoom]);

  const layout = useMemo(() => (focus ? layoutTree(ix, focus.id, { up, down }) : null), [ix, focus, up, down]);
  const scroller = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Centrer la vue sur la personne choisie.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !layout) return;
    el.scrollLeft = layout.focusX * zoom - el.clientWidth / 2;
    el.scrollTop = layout.focusY * zoom - el.clientHeight / 2.4;
  }, [layout]); // volontairement pas `zoom` : zoomer ne doit pas recentrer

  // Ctrl + molette : zoom autour du pointeur.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const z0 = zoomRef.current;
      const z1 = clamp(Math.round((z0 * (e.deltaY > 0 ? 0.9 : 1.1)) * 100) / 100);
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      const cx = (el.scrollLeft + px) / z0;
      const cy = (el.scrollTop + py) / z0;
      setZoom(z1);
      requestAnimationFrame(() => {
        el.scrollLeft = cx * z1 - px;
        el.scrollTop = cy * z1 - py;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Glisser pour se déplacer.
  const drag = useRef<{ x: number; y: number; sl: number; st: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  function zoomTo(z: number) {
    const el = scroller.current;
    const z0 = zoom;
    const z1 = clamp(z);
    setZoom(z1);
    if (el) {
      const cx = (el.scrollLeft + el.clientWidth / 2) / z0;
      const cy = (el.scrollTop + el.clientHeight / 2) / z0;
      requestAnimationFrame(() => {
        el.scrollLeft = cx * z1 - el.clientWidth / 2;
        el.scrollTop = cy * z1 - el.clientHeight / 2;
      });
    }
  }

  if (!focus || !layout) {
    return (
      <section className="screen wide">
        <h1 className="page-title">Arbre</h1>
        <p className="lede">L'arbre apparaîtra dès que la première personne aura été ajoutée.</p>
      </section>
    );
  }

  const branchColor = (pid: string) => archive.branches.find((b) => b.id === ix.person.get(pid)?.branchId)?.color;

  return (
    <section className="screen" style={{ maxWidth: 1400, padding: '28px 24px 48px' }}>
      <div className="tree-head">
        <div className="eyebrow">Arbre centré sur</div>
        <h1 className="page-title">{fullName(focus)}</h1>
        <div className="legend">
          <span><span className="ln" style={{ borderColor: 'var(--accent)' }} /><span style={{ color: 'var(--accent)', fontSize: 11 }}>♥</span> Mariés / en couple</span>
          <span><span className="ln" style={{ borderColor: 'var(--danger)', borderTopStyle: 'dashed' }} /><span style={{ color: 'var(--danger)', fontSize: 11 }}>♥</span> Divorcés / séparés</span>
          <span><span className="ln" style={{ borderColor: 'var(--widowed)', borderTopStyle: 'dashed' }} /><span style={{ color: 'var(--widowed)', fontSize: 11 }}>♥</span> Veuvage</span>
        </div>
        {archive.branches.length > 0 && (
          <div className="legend" style={{ marginTop: 10 }}>
            <span className="ttl">Branches</span>
            {archive.branches.map((b) => (
              <span key={b.id} style={{ fontWeight: 600, color: 'var(--text-2)' }}>
                <span className="square" style={{ width: 13, height: 13, borderRadius: 4, background: b.color }} />{b.label}
              </span>
            ))}
          </div>
        )}
        <p className="faint small" style={{ marginTop: 10 }}>
          Cliquez sur une personne pour centrer l'arbre sur elle, une seconde fois pour ouvrir sa fiche. Glissez pour vous déplacer, Ctrl + molette pour zoomer.
        </p>
      </div>

      <div className="tree-wrap">
        <div className="tree-tools left">
          <Stepper label="Ancêtres" value={up} set={setUp} />
          <Stepper label="Descendants" value={down} set={setDown} />
        </div>
        <div className="tree-tools">
          <button className="round" onClick={() => zoomTo(zoom - 0.15)} title="Dézoomer" disabled={zoom <= ZOOM_MIN}>−</button>
          <button className="pct" onClick={() => zoomTo(1)} title="Taille normale">{Math.round(zoom * 100)} %</button>
          <button className="round" onClick={() => zoomTo(zoom + 0.15)} title="Zoomer" disabled={zoom >= ZOOM_MAX}>＋</button>
        </div>
        <div
          ref={scroller}
          className={`tree-scroll${dragging ? ' dragging' : ''}`}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            const el = scroller.current!;
            drag.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop, moved: false };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const dx = e.clientX - d.x;
            const dy = e.clientY - d.y;
            if (!d.moved && Math.hypot(dx, dy) < 5) return;
            if (!d.moved) {
              d.moved = true;
              setDragging(true);
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }
            scroller.current!.scrollLeft = d.sl - dx;
            scroller.current!.scrollTop = d.st - dy;
          }}
          onPointerUp={() => {
            setTimeout(() => (drag.current = null), 0);
            setDragging(false);
          }}
          onClickCapture={(e) => {
            // Un glisser ne doit pas être pris pour un clic sur une carte.
            if (drag.current?.moved) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
        >
          {/* margin auto : un petit arbre est centré au lieu d'être collé à gauche */}
          <div className="tree-canvas" style={{ width: layout.width * zoom, height: layout.height * zoom, margin: '0 auto' }}>
            <div className="tree-inner" style={{ width: layout.width, height: layout.height, transform: `scale(${zoom})` }}>
              <svg className="tree-svg" width={layout.width} height={layout.height}>
                {layout.edges.map((e) => (
                  <polyline key={e.key} points={e.points.map((p) => p.join(',')).join(' ')} fill="none"
                    stroke={branchColor(e.personId) ?? '#cfc4ac'} strokeWidth={2} strokeLinejoin="round" />
                ))}
              </svg>
              {layout.links.map((l) => <UnionLink key={l.key} link={l} canEdit={canEdit} />)}
              {layout.nodes.map((n) => <TreeCard key={n.key} node={n} color={branchColor(n.personId)} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function clamp(z: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
}

function Stepper({ label, value, set }: { label: string; value: number; set: (n: number) => void }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {label}
      <button className="round" style={{ width: 24, height: 24, fontSize: 15 }} disabled={value <= 0} onClick={() => set(value - 1)} aria-label={`Moins de ${label.toLowerCase()}`}>−</button>
      <b style={{ minWidth: 14, textAlign: 'center' }}>{value}</b>
      <button className="round" style={{ width: 24, height: 24, fontSize: 15 }} disabled={value >= 8} onClick={() => set(value + 1)} aria-label={`Plus de ${label.toLowerCase()}`}>＋</button>
    </span>
  );
}

function TreeCard({ node, color }: { node: TNode; color?: string }) {
  const archive = useArchive();
  const p = getIndex(archive).person.get(node.personId);
  if (!p) return null;
  return (
    <button
      className={`tnode${node.focus ? ' focus' : ''}`}
      style={{
        left: node.x, top: node.y, borderLeftColor: color ?? 'var(--line)',
        background: color ? `color-mix(in srgb, ${color} 9%, var(--paper))` : undefined,
      }}
      title={`${fullName(p)} · ${lifespan(p)}${node.focus ? ' — ouvrir la fiche' : ' — centrer sur cette personne'}`}
      onClick={() => go(node.focus ? href.person(p.id) : href.tree(p.id))}
    >
      {node.moreUp && <span className="more up" title="Ancêtres non affichés">▲</span>}
      <Avatar person={p} size={36} fontSize={13} />
      <span style={{ textAlign: 'left', lineHeight: 1.2, minWidth: 0 }}>
        <span className="nm">{firstName(p)}</span>
        {p.surname && <span className="dt sn">{p.surname}</span>}
        <span className="dt">{lifespan(p)}</span>
      </span>
      {node.moreDown && <span className="more down" title="Descendants non affichés">▼</span>}
    </button>
  );
}

function UnionLink({ link, canEdit }: { link: TLink; canEdit: boolean }) {
  const archive = useArchive();
  const u = getIndex(archive).union.get(link.unionId);
  if (!u) return null;
  const c = statusColor(u.status);
  const line = `2px ${statusDashed(u.status) ? 'dashed' : 'solid'} ${c}`;
  const Heart = canEdit ? 'button' : 'span';
  return (
    <div className="tlink" style={{ left: link.x, top: link.y, width: link.width, height: CARD_H }}>
      <div className="yrs">{span(u.start, u.end)}</div>
      <div className="row">
        <div className="ln" style={{ borderTop: line }} />
        <Heart className="heart" style={{ color: c, borderColor: c }} title={canEdit ? "Modifier l'union" : STATUS_LABEL[u.status]}
          onClick={canEdit ? () => openModal({ type: 'union', unionId: u.id }) : undefined}>♥</Heart>
        <div className="ln" style={{ borderTop: line }} />
      </div>
      <div className="lbl" style={{ color: c }}>{STATUS_LABEL[u.status]}</div>
    </div>
  );
}
