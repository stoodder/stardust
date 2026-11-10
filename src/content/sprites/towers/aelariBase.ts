// The Aelari tower base (design/towers.md § Aelari towers: "elegant floating crystal lattices", §8:
// "floating crystal facets, soft inner glow"; art-direction §4: woven, never plated, jewel-toned,
// near-symmetric). Ves'thara's attunements stand on a dais of woven lumenglass that **floats** two
// pixels over its shadow (no other faction's base leaves the ground), on the Everglow base's
// footprint, canvas, anchor, and mount, so heads mount the same. Its faces are sapphire glass
// woven on the diagonal (the top lit, the left face a step down, the right in shade), rimmed in a
// lit emerald thread; an emerald ring on top where the head floats, round a dark socket; the
// faction's chord-knot (a ruby knot in an emerald weave) on the left face; and one ruby knot per
// tier down the right face. Tiers change the silhouette like every faction's (tech-spec § Format
// rules): T2 stands a sapphire crystal shard on each side corner (4+ px wider), and T3 floats a
// lit crystal over the left shard (6+ px taller). A tier-4 spec (`aelariSpecBase`) keeps the three
// knots, lights a white status knot at the front corner, and swaps the shards and crystal for the
// spec's own kit. Each tower wears its own **trim** (`Trim`, U5) on the shared dais, so the three
// tell apart at a glance while staying one family (the same floating sapphire slab): the threads
// woven across its top face, its top rim thread, its chord-knot's weave, and the tier shards and
// crystal are drawn in the tower's signature colours (the Prism's ruby-pink, the Mindspike's
// psionic violet, the Lantern's gold, its shards sapphire tipped gold-white).
import { grid, isoBox, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_W } from './base.ts';

/**
 * A tower's signature on the shared dais: `rim` the top face's lit rim thread and the chord-knot's
 * weave; `weave` the threads crossing the top face; `ramp` the shards' and floating crystal's facets, lit to dark (four characters); `tip` the
 * light at a shard's tip and the crystal's heart.
 */
export interface Trim {
  readonly rim: string;
  /** The top face's crossing threads. */
  readonly weave: string;
  readonly ramp: readonly [string, string, string, string];
  readonly tip: string;
}

/** The plain Aelari trim: emerald rim, sapphire crystal, white light. */
export const SAPPHIRE: Trim = { rim: '9', weave: '4', ramp: ['4', '3', '2', '1'], tip: '*' };

/** The dais floats this many rows over its shadow. */
const LIFT = 2;
const HEIGHT = 3;

/** Whether (x, y) is on the top face of `isoBox(…, cx, cy, hw, height)`. */
function isoTop(
  cx: number,
  cy: number,
  hw: number,
  height: number,
): (x: number, y: number) => boolean {
  return (x, y) => Math.abs(x + 0.5 - cx) / hw + Math.abs(y + height + 0.5 - cy) / (hw / 2) <= 1;
}

/** The floating dais with `knots` tier knots. */
function dais(knots: number, trim: Trim): CharGrid {
  const g: CharGrid = grid(BASE_W, BASE_H);
  const { x: cx, y: cy } = BASE_ANCHOR;
  isoBox(g, cx, cy + 1, 12, 0, { top: '_', rim: '_', left: '_', right: '_' });
  // The glass slab, woven on the diagonal: lit threads over a lighter pane on the top face.
  isoBox(g, cx, cy - LIFT, 11, HEIGHT, { top: '3', rim: trim.rim, left: '3', right: '2' });
  // The top face's crossing threads are the trim's (the tower's colour woven into the glass); the
  // side faces keep sapphire threads.
  const top = isoTop(cx, cy - LIFT, 11, HEIGHT);
  for (let y = 0; y < BASE_H; y++) {
    for (let x = 0; x < BASE_W; x++) {
      const c = g[y]?.[x];
      const thread = (x + y) % 4 === 0 || (x - y + 40) % 4 === 0;
      if (c === '3' && thread) plot(g, x, y, top(x, y) ? trim.weave : '4');
      else if (c === '2' && thread) plot(g, x, y, '3');
    }
  }
  // The emerald ring the head floats over, round a dark socket.
  isoBox(g, cx, cy - LIFT - HEIGHT, 6, 0, { top: '8', rim: '9', left: '8', right: '7' });
  isoBox(g, cx, cy - LIFT - HEIGHT, 4, 0, { top: '1', rim: '1', left: '1', right: '1' });
  // The chord-knot on the left face: a ruby knot in a little emerald weave.
  // prettier-ignore
  stamp(g, cx - 8, cy - LIFT, [
    `${trim.rim}.${trim.rim}`,
    '.d.',
    `${trim.rim}.${trim.rim}`,
  ]);
  // Tier knots, ruby, stepping down the right face.
  for (let t = 0; t < knots; t++) {
    const x = cx + 4 + t * 3;
    const y = cy - LIFT + 3 - Math.floor((t * 3) / 2);
    plot(g, x, y, 'd');
    plot(g, x + 1, y, 'c');
  }
  return g;
}

/** A crystal shard standing on a side corner (in the trim's ramp): lit left, shaded right, a lit tip. */
export function shard(g: CharGrid, x: number, foot: number, tall: number, trim = SAPPHIRE): void {
  const [lit, mid, shade, dark] = trim.ramp;
  for (let k = 0; k < tall; k++) {
    const y = foot - k;
    const hw = k >= tall - 2 ? (k === tall - 1 ? 0 : 1) : 2;
    for (let dx = -hw; dx < Math.max(hw, 1); dx++) {
      plot(g, x + dx, y, dx < 0 ? (dx === -hw ? lit : mid) : dx === 0 ? shade : dark);
    }
  }
  plot(g, x - 1, foot - tall + 1, trim.rim);
  plot(g, x, foot - tall + 1, trim.tip);
}

/** A crystal floating free (in the trim's ramp): a lit diamond with a white heart. */
export function floatingCrystal(
  g: CharGrid,
  cx: number,
  cy: number,
  r: number,
  trim = SAPPHIRE,
): void {
  const [lit, mid, shade] = trim.ramp;
  for (let y = cy - r; y <= cy + r; y++) {
    const hw = r - Math.abs(y - cy);
    for (let x = cx - hw; x <= cx + hw - 1; x++) {
      plot(g, x, y, x < cx - hw / 2 ? lit : x < cx ? mid : shade);
    }
    if (hw === 0) plot(g, cx - 1, y, trim.rim);
  }
  plot(g, cx - 1, cy, trim.tip);
  plot(g, cx, cy, '+');
}

/** One base frame per tier (1–3), in the tower's trim. */
export function aelariBase(tier: 1 | 2 | 3, trim = SAPPHIRE): string[] {
  const g = dais(tier, trim);
  const { x: cx, y: cy } = BASE_ANCHOR;
  if (tier >= 2) {
    shard(g, cx - 11, cy - 1, 9, trim);
    shard(g, cx + 12, cy - 1, 7, trim);
  }
  if (tier === 3) {
    // The crystal floating over the left shard, its light caught in the right one.
    floatingCrystal(g, cx - 11, cy - 16, 4, trim);
    plot(g, cx + 11, cy - 6, '+');
  }
  return rows(g);
}

/**
 * A tier-4 spec base: the dais with three ruby knots, a white status knot at the front corner, and
 * the spec's own kit (drawn by `kit` around the dais's anchor) instead of the shards and crystal.
 */
export function aelariSpecBase(
  kit: (g: CharGrid, cx: number, cy: number) => void,
  trim = SAPPHIRE,
): string[] {
  const g = dais(3, trim);
  const { x: cx, y: cy } = BASE_ANCHOR;
  kit(g, cx, cy);
  plot(g, cx - 1, cy + 3 - LIFT, '*');
  plot(g, cx, cy + 3 - LIFT, '+');
  return rows(g);
}
