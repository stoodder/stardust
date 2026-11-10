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
// spec's own kit.
import { grid, isoBox, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_W } from './base.ts';

/** The dais floats this many rows over its shadow. */
const LIFT = 2;
const HEIGHT = 3;

/** The floating dais with `knots` tier knots. */
function dais(knots: number): CharGrid {
  const g: CharGrid = grid(BASE_W, BASE_H);
  const { x: cx, y: cy } = BASE_ANCHOR;
  isoBox(g, cx, cy + 1, 12, 0, { top: '_', rim: '_', left: '_', right: '_' });
  // The glass slab, woven on the diagonal: lit threads over a lighter pane on the top face.
  isoBox(g, cx, cy - LIFT, 11, HEIGHT, { top: '3', rim: '9', left: '3', right: '2' });
  for (let y = 0; y < BASE_H; y++) {
    for (let x = 0; x < BASE_W; x++) {
      const c = g[y]?.[x];
      const thread = (x + y) % 4 === 0 || (x - y + 40) % 4 === 0;
      if (c === '3' && thread) plot(g, x, y, y < cy - LIFT - HEIGHT + 3 ? '4' : '4');
      else if (c === '2' && thread) plot(g, x, y, '3');
    }
  }
  // The emerald ring the head floats over, round a dark socket.
  isoBox(g, cx, cy - LIFT - HEIGHT, 6, 0, { top: '8', rim: '9', left: '8', right: '7' });
  isoBox(g, cx, cy - LIFT - HEIGHT, 4, 0, { top: '1', rim: '1', left: '1', right: '1' });
  // The chord-knot on the left face: a ruby knot in a little emerald weave.
  // prettier-ignore
  stamp(g, cx - 8, cy - LIFT, [
    '9.9',
    '.d.',
    '9.9',
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

/** A sapphire crystal shard standing on a side corner: lit left facet, shaded right, a lit tip. */
export function shard(g: CharGrid, x: number, foot: number, tall: number): void {
  for (let k = 0; k < tall; k++) {
    const y = foot - k;
    const hw = k >= tall - 2 ? (k === tall - 1 ? 0 : 1) : 2;
    for (let dx = -hw; dx < Math.max(hw, 1); dx++) {
      plot(g, x + dx, y, dx < 0 ? (dx === -hw ? '4' : '3') : dx === 0 ? '2' : '1');
    }
  }
  plot(g, x - 1, foot - tall + 1, '9');
  plot(g, x, foot - tall + 1, '*');
}

/** A crystal floating free: a lit diamond with a white heart. */
export function floatingCrystal(g: CharGrid, cx: number, cy: number, r: number): void {
  for (let y = cy - r; y <= cy + r; y++) {
    const hw = r - Math.abs(y - cy);
    for (let x = cx - hw; x <= cx + hw - 1; x++) {
      plot(g, x, y, x < cx - hw / 2 ? '4' : x < cx ? '3' : '2');
    }
    if (hw === 0) plot(g, cx - 1, y, '9');
  }
  plot(g, cx - 1, cy, '*');
  plot(g, cx, cy, '+');
}

/** One base frame per tier (1–3). */
export function aelariBase(tier: 1 | 2 | 3): string[] {
  const g = dais(tier);
  const { x: cx, y: cy } = BASE_ANCHOR;
  if (tier >= 2) {
    shard(g, cx - 11, cy - 1, 9);
    shard(g, cx + 12, cy - 1, 7);
  }
  if (tier === 3) {
    // The crystal floating over the left shard, its light caught in the right one.
    floatingCrystal(g, cx - 11, cy - 16, 4);
    plot(g, cx + 11, cy - 6, '+');
  }
  return rows(g);
}

/**
 * A tier-4 spec base: the dais with three ruby knots, a white status knot at the front corner, and
 * the spec's own kit (drawn by `kit` around the dais's anchor) instead of the shards and crystal.
 */
export function aelariSpecBase(kit: (g: CharGrid, cx: number, cy: number) => void): string[] {
  const g = dais(3);
  const { x: cx, y: cy } = BASE_ANCHOR;
  kit(g, cx, cy);
  plot(g, cx - 1, cy + 3 - LIFT, '*');
  plot(g, cx, cy + 3 - LIFT, '+');
  return rows(g);
}
