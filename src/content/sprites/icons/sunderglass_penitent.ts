// The Sunderglass Penitent's wave-preview icon (art-direction §5: the enemy's own look,
// front-facing): its hooded head bowed between great woven shoulders, woven at 16×16 like the other
// Aelari icons (the Glass Witch's), the hood's face a dark recess with two dim knots of light cast
// down, and across the bottom the top of its shield wall, dark sapphire glass in an emerald frame
// with a ruby knot at its heart. Broad and low where the Witch's icon is a tall pointed veil, so the
// two bosses never read alike. The outline is on the outside only, so the weave's gaps show through.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, type CharGrid } from '../helpers.ts';
import { outlineOutside, rim, weave, type Mask } from '../enemies/lattice.ts';
import { ICON } from './iconGen.ts';

const FULL = ICON + 2;

function penitentIcon(): string[] {
  const g: CharGrid = grid(FULL, FULL);
  const cx = 8;
  // The shoulders: a broad woven mass sloping out from the hood.
  const body: Mask = (x, y) => {
    const d = Math.abs(x + 0.5 - cx);
    return y >= 4 + Math.max(0, d - 3) * 0.45 && y <= 14 && d <= 7;
  };
  weave(g, body, { mode: 'diag', spacing: 3, phase: 0, lx: cx, ly: 9 }, 5);
  rim(g, body, cx - 3, 6);
  // The hood, bowed: dense weave round a dark recess with two dim eyes cast down.
  const hood: Mask = (x, y) => Math.hypot((x + 0.5 - cx) / 3.6, (y + 0.5 - 4.5) / 3.8) <= 1;
  for (let y = 0; y < FULL; y++) for (let x = 0; x < FULL; x++) if (hood(x, y)) plot(g, x, y, '3');
  rim(g, hood, cx - 2, 3);
  for (const [x, y] of [
    [7, 4],
    [8, 4],
    [6, 5],
    [7, 5],
    [8, 5],
    [9, 5],
    [7, 6],
    [8, 6],
  ] as const) {
    plot(g, x, y, '0');
  }
  plot(g, 6, 6, '+');
  plot(g, 9, 6, '+');
  plot(g, 7, 1, 'd');
  plot(g, 8, 1, 'c');
  // The shield wall's top: an emerald frame round dark glass, a ruby knot at its heart.
  for (let x = 3; x <= 12; x++) {
    plot(g, x, 9, x < 8 ? '8' : '7');
    for (let y = 10; y <= 14; y++)
      plot(g, x, y, x === 3 ? '8' : x === 12 ? '6' : (x + y) % 4 === 0 ? '3' : '1');
  }
  plot(g, 5, 11, '4');
  plot(g, 6, 10, 'w');
  plot(g, 7, 12, 'd');
  plot(g, 8, 12, 'c');
  plot(g, 8, 11, '+');
  outlineOutside(g);
  return rows(g);
}

export const iconEnemySunderglassPenitent = defineSprite({
  id: 'icon.enemy.sunderglass_penitent',
  size: { w: FULL, h: FULL },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'none',
  frames: { icon: penitentIcon() },
});
