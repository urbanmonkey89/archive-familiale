/**
 * Placement automatique de l'arbre, centré sur une personne (« vue sablier ») :
 *  - au-dessus : ses ancêtres directs, couple par couple ;
 *  - sur sa ligne : ses frères et sœurs, ses conjoints (y compris ex) ;
 *  - en dessous : ses descendants, avec leurs conjoints.
 *
 * Principe : chaque sous-arbre occupe une bande horizontale qui lui est propre,
 * calculée récursivement (largeur = max(largeur de la ligne, somme des enfants)).
 * Deux sous-arbres ne se chevauchent donc jamais sur une même ligne.
 */
import { byBirth, childrenOfUnion, parentsOf, type Index } from '../data/selectors';
import type { Union } from '../data/schema';

export const CARD_W = 150;
export const CARD_H = 60;
export const LINK_W = 64;
export const H_GAP = 26;
export const ROW_STEP = 140;
const PAD = 40;

export interface TNode {
  key: string;
  personId: string;
  x: number;
  y: number;
  focus?: boolean;
  /** Il existe des ancêtres / descendants non affichés. */
  moreUp?: boolean;
  moreDown?: boolean;
}

/** Lien d'union entre deux cartes (cœur + statut). */
export interface TLink {
  key: string;
  unionId: string;
  x: number;
  y: number;
  width: number;
}

export interface TEdge {
  key: string;
  points: [number, number][];
  /** Personne « du bas » : sert à colorer le trait selon sa branche. */
  personId: string;
}

export interface TreeLayout {
  nodes: TNode[];
  links: TLink[];
  edges: TEdge[];
  width: number;
  height: number;
  focusX: number;
  focusY: number;
}

export interface LayoutOptions {
  /** Générations d'ancêtres affichées. */
  up: number;
  /** Générations de descendants affichées. */
  down: number;
}

interface Unit {
  union: Union;
  partnerId?: string;
  kids: DescBox[];
}

interface DescBox {
  personId: string;
  left: Unit[];
  middle: Unit[];
  right: Unit[];
  rowW: number;
  kidsW: number;
  width: number;
  moreDown: boolean;
}

interface AncBox {
  personId: string;
  parents: AncBox[];
  unionId?: string;
  width: number;
  moreUp: boolean;
}

export function layoutTree(ix: Index, focusId: string, opts: LayoutOptions): TreeLayout {
  const nodes: TNode[] = [];
  const links: TLink[] = [];
  const edges: TEdge[] = [];
  let seq = 0;
  const k = (id: string) => `${id}@${seq++}`;

  const hasParents = (id: string) => parentsOf(ix, id).length > 0;
  const hasKids = (id: string, except?: string) => (ix.unionsOf.get(id) ?? []).some((u) => u.id !== except && u.children.length > 0);

  // ─── Descendants ───
  function buildDesc(id: string, depth: number, path: Set<string>): DescBox {
    const unions = ix.unionsOf.get(id) ?? [];
    const nextPath = new Set(path).add(id);
    const units: Unit[] = unions.map((union) => {
      const other = union.partners.find((p) => p !== id);
      const partnerId = other && ix.person.has(other) ? other : undefined;
      const kids = depth < opts.down
        ? childrenOfUnion(ix, union).filter((c) => !nextPath.has(c.id)).map((c) => buildDesc(c.id, depth + 1, nextPath))
        : [];
      return { union, partnerId, kids };
    });
    const partnered = units.filter((u) => u.partnerId);
    const nLeft = Math.floor(partnered.length / 2);
    const left = partnered.slice(0, nLeft);
    const right = partnered.slice(nLeft);
    const middle = units.filter((u) => !u.partnerId && u.union.children.length > 0);
    const rowW = CARD_W + partnered.length * (LINK_W + CARD_W);
    const groups = [...left, ...middle, ...right].filter((u) => u.kids.length);
    const kidsW = groups.reduce((s, u) => s + u.kids.reduce((t, c) => t + c.width, 0) + H_GAP * (u.kids.length - 1), 0) + H_GAP * Math.max(0, groups.length - 1);
    return {
      personId: id, left, middle, right, rowW, kidsW,
      width: Math.max(rowW, kidsW),
      moreDown: depth >= opts.down && units.some((u) => u.union.children.length > 0),
    };
  }

  /** Place une boîte de descendants dans la bande [left, left + width]. Renvoie la position de la carte principale. */
  function placeDesc(box: DescBox, left: number, y: number, isFocus: boolean): { x: number; rowLeft: number; rowRight: number } {
    let x = left + (box.width - box.rowW) / 2;
    const rowLeft = x;
    const anchors = new Map<Unit, number>();
    const linkY = y;

    for (const u of box.left) {
      nodes.push({ key: k(u.partnerId!), personId: u.partnerId!, x, y, moreUp: hasParents(u.partnerId!), moreDown: hasKids(u.partnerId!, u.union.id) });
      links.push({ key: 'l' + u.union.id + seq++, unionId: u.union.id, x: x + CARD_W, y: linkY, width: LINK_W });
      anchors.set(u, x + CARD_W + LINK_W / 2);
      x += CARD_W + LINK_W;
    }
    const meX = x;
    nodes.push({ key: k(box.personId), personId: box.personId, x: meX, y, focus: isFocus, moreDown: box.moreDown });
    for (const u of box.middle) anchors.set(u, meX + CARD_W / 2);
    x += CARD_W;
    for (const u of box.right) {
      links.push({ key: 'l' + u.union.id + seq++, unionId: u.union.id, x, y: linkY, width: LINK_W });
      anchors.set(u, x + LINK_W / 2);
      nodes.push({ key: k(u.partnerId!), personId: u.partnerId!, x: x + LINK_W, y, moreUp: hasParents(u.partnerId!), moreDown: hasKids(u.partnerId!, u.union.id) });
      x += LINK_W + CARD_W;
    }
    const rowRight = x;

    // Enfants, groupe par groupe, dans l'ordre des unions de gauche à droite.
    let cl = left + (box.width - box.kidsW) / 2;
    const childY = y + ROW_STEP;
    const barY = y + CARD_H + (ROW_STEP - CARD_H) / 2;
    for (const u of [...box.left, ...box.middle, ...box.right]) {
      if (!u.kids.length) continue;
      const ax = anchors.get(u)!;
      for (const kid of u.kids) {
        const pos = placeDesc(kid, cl, childY, false);
        const kx = pos.x + CARD_W / 2;
        edges.push({ key: 'e' + seq++, personId: kid.personId, points: [[ax, y + CARD_H - 4], [ax, barY], [kx, barY], [kx, childY]] });
        cl += kid.width + H_GAP;
      }
    }
    return { x: meX, rowLeft, rowRight };
  }

  // ─── Ancêtres ───
  function buildAnc(id: string, gen: number, path: Set<string>): AncBox {
    const nextPath = new Set(path).add(id);
    const ps = parentsOf(ix, id).filter((p) => !nextPath.has(p.id));
    if (gen >= opts.up || !ps.length) {
      return { personId: id, parents: [], width: CARD_W, moreUp: ps.length > 0 };
    }
    const parents = ps.slice(0, 2).map((p) => buildAnc(p.id, gen + 1, nextPath));
    const w = parents.length === 2 ? parents[0].width + LINK_W + parents[1].width : parents[0].width;
    return { personId: id, parents, unionId: ix.parentUnionOf.get(id)?.id, width: Math.max(CARD_W, w), moreUp: false };
  }

  /** Place les parents de `box`, dont la carte est centrée en `cx` sur la ligne `y`. */
  function placeAnc(box: AncBox, cx: number, y: number, targets: { x: number; personId: string }[]) {
    if (!box.parents.length) return;
    const py = y - ROW_STEP;
    const barY = py + CARD_H + (ROW_STEP - CARD_H) / 2;
    let anchorX: number;
    let anchorY: number;
    if (box.parents.length === 2) {
      const [a, b] = box.parents;
      const total = a.width + LINK_W + b.width;
      const left = cx - total / 2;
      const ca = left + a.width / 2;
      const cb = left + a.width + LINK_W + b.width / 2;
      nodes.push({ key: k(a.personId), personId: a.personId, x: ca - CARD_W / 2, y: py, moreUp: a.moreUp });
      nodes.push({ key: k(b.personId), personId: b.personId, x: cb - CARD_W / 2, y: py, moreUp: b.moreUp });
      const lx = ca + CARD_W / 2;
      links.push({ key: 'l' + box.unionId + seq++, unionId: box.unionId!, x: lx, y: py, width: cb - CARD_W / 2 - lx });
      anchorX = (lx + cb - CARD_W / 2) / 2;
      anchorY = py + CARD_H - 4;
      placeAnc(a, ca, py, [{ x: ca, personId: a.personId }]);
      placeAnc(b, cb, py, [{ x: cb, personId: b.personId }]);
    } else {
      const [a] = box.parents;
      nodes.push({ key: k(a.personId), personId: a.personId, x: cx - CARD_W / 2, y: py, moreUp: a.moreUp });
      anchorX = cx;
      anchorY = py + CARD_H;
      placeAnc(a, cx, py, [{ x: cx, personId: a.personId }]);
    }
    for (const t of targets) {
      edges.push({ key: 'e' + seq++, personId: t.personId, points: [[anchorX, anchorY], [anchorX, barY], [t.x, barY], [t.x, y]] });
    }
  }

  if (!ix.person.has(focusId)) return { nodes, links, edges, width: 0, height: 0, focusX: 0, focusY: 0 };

  // 1. Descendants et conjoints de la personne centrale (ligne 0 et en dessous).
  const desc = buildDesc(focusId, 0, new Set());
  const me = placeDesc(desc, 0, 0, true);
  const meCenter = me.x + CARD_W / 2;

  // 2. Frères et sœurs, de part et d'autre de la ligne de la personne.
  const sibs = (() => {
    const u = ix.parentUnionOf.get(focusId);
    return u ? childrenOfUnion(ix, u).filter((c) => c.id !== focusId).sort(byBirth) : [];
  })();
  const focus = ix.person.get(focusId)!;
  const older = sibs.filter((s) => byBirth(s, focus) < 0);
  const younger = sibs.filter((s) => !older.includes(s));
  const targets = [{ x: meCenter, personId: focusId }];
  let sx = me.rowLeft - H_GAP * 1.5 - CARD_W;
  for (const s of [...older].reverse()) {
    nodes.push({ key: k(s.id), personId: s.id, x: sx, y: 0, moreDown: hasKids(s.id), moreUp: false });
    targets.push({ x: sx + CARD_W / 2, personId: s.id });
    sx -= CARD_W + H_GAP;
  }
  sx = me.rowRight + H_GAP * 1.5;
  for (const s of younger) {
    nodes.push({ key: k(s.id), personId: s.id, x: sx, y: 0, moreDown: hasKids(s.id), moreUp: false });
    targets.push({ x: sx + CARD_W / 2, personId: s.id });
    sx += CARD_W + H_GAP;
  }

  // 3. Ancêtres, centrés au-dessus de la personne.
  const anc = buildAnc(focusId, 0, new Set());
  const focusNode = nodes.find((n) => n.focus)!;
  focusNode.moreUp = anc.moreUp;
  if (anc.parents.length) placeAnc(anc, meCenter, 0, targets);
  else if (targets.length > 1) {
    // Frères et sœurs sans parents connus : simple trait qui les relie.
    const barY = -(ROW_STEP - CARD_H) / 2;
    for (const t of targets) edges.push({ key: 'e' + seq++, personId: t.personId, points: [[meCenter, barY], [t.x, barY], [t.x, 0]] });
  }

  // 4. Recadrage : tout en coordonnées positives avec une marge.
  const xs = [...nodes.map((n) => n.x), ...links.map((l) => l.x)];
  const ys = nodes.map((n) => n.y);
  for (const e of edges) for (const [x, y] of e.points) { xs.push(x); ys.push(y); }
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  const maxX = Math.max(...nodes.map((n) => n.x + CARD_W), ...links.map((l) => l.x + l.width)) + PAD;
  const maxY = Math.max(...nodes.map((n) => n.y + CARD_H)) + PAD;
  for (const n of nodes) { n.x -= minX; n.y -= minY; }
  for (const l of links) { l.x -= minX; l.y -= minY; }
  for (const e of edges) e.points = e.points.map(([x, y]) => [x - minX, y - minY]);

  return {
    nodes, links, edges,
    width: maxX - minX,
    height: maxY - minY,
    focusX: focusNode.x + CARD_W / 2,
    focusY: focusNode.y + CARD_H / 2,
  };
}
