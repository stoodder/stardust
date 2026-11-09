// The Vrell tower base (design/towers.md § Vrell towers: "jury-rigged from scrap, mismatched paint,
// price tags still attached"; art-direction §4: asymmetry, bolted plates, mismatched parts). A
// brass plinth on the Everglow base's footprint and canvas (so heads mount and anchor the same),
// but patched: rust side panels with bolt heads, one patina plate bolted over the right face, a
// pipe elbow out of the back, and a white price tag dangling from the front corner on a string.
// Tiers tally as orange weld beads down the right face, and change the silhouette like Everglow
// tiers do (tech-spec § Format rules), in Vrell scrap: T2 bolts a mismatched pod to each side
// corner (a patina capacitor can on the left, a rusty crate on the right), and T3 adds a lightning
// rod with a welding-hot tip on the crate.
import { grid, isoBox, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_W } from './base.ts';

const HEIGHT = 5;

/** The patched plinth with `tier` weld tallies. */
function plinth(tier: number): CharGrid {
  const g: CharGrid = grid(BASE_W, BASE_H);
  const { x: cx, y: cy } = BASE_ANCHOR;
  isoBox(g, cx, cy + 1, 12, 0, { top: '_', rim: '_', left: '_', right: '_' });
  // Brass, lit left and shaded right, with a rusted panel patched onto the left face.
  isoBox(g, cx, cy, 11, HEIGHT, { top: '4', rim: '4', left: '3', right: '2' });
  for (let x = cx - 8; x < cx - 3; x++) {
    const y0 = cy + 1 + Math.floor((x - (cx - 11)) / 2);
    for (let y = y0 - 3; y <= y0; y++) plot(g, x, y, x === cx - 8 || y === y0 - 3 ? '6' : '7');
  }
  // A patina ring on top where the head turns, around a darker brass socket.
  isoBox(g, cx, cy - HEIGHT, 6, 0, { top: 'c', rim: 'c', left: 'c', right: 'c' });
  isoBox(g, cx, cy - HEIGHT, 4, 0, { top: '2', rim: '2', left: '2', right: '2' });
  // A patina plate bolted over part of the right face, crooked.
  for (let x = cx + 3; x < cx + 8; x++) {
    const y0 = cy + 4 - Math.floor((x - cx) / 2);
    for (let y = y0 - 3; y <= y0; y++) plot(g, x, y, x === cx + 3 || y === y0 - 3 ? 'e' : 'c');
  }
  // Bolt heads along the left face.
  for (const k of [2, 5, 8]) plot(g, cx - 11 + k, cy - 1 + Math.floor(k / 2), '4');
  // Weld tallies, one per tier, beading down the right face.
  for (let t = 0; t < tier; t++) plot(g, cx + 9 - t * 2, cy - 1 + t, '+');
  // A pipe elbow out of the back corner.
  line(g, cx + 8, cy - 9, cx + 8, cy - 6, '1');
  line(g, cx + 9, cy - 9, cx + 9, cy - 6, '2');
  plot(g, cx + 10, cy - 9, '2');
  // The price tag at the front corner: a string, a white tag, a scrawled price.
  plot(g, cx, cy + 1, '1');
  // prettier-ignore
  stamp(g, cx - 1, cy + 2, [
    'WWW',
    'WkW',
    'WWU',
  ]);
  return g;
}

/** One base frame per tier (1–3). */
export function vrellBase(tier: 1 | 2 | 3): string[] {
  const g = plinth(tier);
  const { x: cx, y: cy } = BASE_ANCHOR;
  if (tier >= 2) {
    // A patina capacitor can on the left corner, banded in brass with a dark cap.
    isoBox(g, cx - 10, cy + 1, 3, 9, { top: '2', rim: 'e', left: 'd', right: 'c' });
    for (const y of [3, 6]) {
      plot(g, cx - 12, cy + 1 - y, '3');
      plot(g, cx - 11, cy + 2 - y, '3');
      plot(g, cx - 10, cy + 2 - y, '2');
      plot(g, cx - 9, cy + 1 - y, '2');
    }
    // A rusty crate on the right corner, a lid nailed crooked.
    isoBox(g, cx + 10, cy + 1, 3.5, 6, { top: '3', rim: '4', left: '7', right: '6' });
    line(g, cx + 7, cy - 6, cx + 13, cy - 4, '2');
  }
  if (tier === 3) {
    // The lightning rod on the crate: a 2 px pole, a rust collar, and a welding-hot tip.
    const mx = Math.round(cx + 10);
    for (let y = cy - 18; y <= cy - 6; y++) {
      plot(g, mx - 1, y, '4');
      plot(g, mx, y, '2');
    }
    line(g, mx - 2, cy - 12, mx + 1, cy - 12, '6');
    plot(g, mx - 1, cy - 19, '+');
    plot(g, mx, cy - 19, '+');
    plot(g, mx - 1, cy - 20, '*');
    plot(g, mx, cy - 20, '+');
  }
  return rows(g);
}

/** The custom colors the Vrell base uses: the price tag's white and its scrawled blue price. */
export const VRELL_BASE_LEGEND = { W: 'white.0', U: 'blue.3' } as const;
