// The Glass Witch's wave-preview icon (art-direction §5: the enemy's own look, front-facing): her
// head and shoulders woven at 16×16 like the other Aelari icons (icons/act2_enemies.ts), the
// pointed lattice veil with real gaps, the long lit face with two knots of light for eyes, the
// ruby brow knot, dark emerald shoulders, and the cut ruby collar thread hanging loose. The
// outline is on the outside only, so the veil's gaps show the HUD panel through them.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, type CharGrid } from '../helpers.ts';
import { outlineOutside, rim, weave, type Mask } from '../enemies/lattice.ts';
import { ICON } from './iconGen.ts';

const FULL = ICON + 2;

function witchIcon(): string[] {
  const g: CharGrid = grid(FULL, FULL);
  const cx = 8;
  // The shoulders: dark emerald robes, lit left, across the bottom.
  for (let y = 11; y <= 14; y++) {
    const hw = 3 + (y - 11) * 1.2;
    for (let x = 0; x < FULL; x++) {
      const d = x + 0.5 - cx;
      if (Math.abs(d) <= hw) plot(g, x, y, d < -hw + 1.2 ? '7' : d < 1 ? '6' : '5');
    }
  }
  const veil: Mask = (x, y) => {
    const t = (y + 0.5 - 1) / 11;
    return t >= 0 && t <= 1 && Math.abs(x + 0.5 - cx) <= 5.6 * Math.pow(t, 0.6);
  };
  weave(g, veil, { mode: 'diag', spacing: 3, phase: 0, lx: cx, ly: 7 }, 5);
  rim(g, veil, cx - 2, 5);
  // The face, lit from inside.
  for (let y = 4; y <= 10; y++) {
    for (let x = 6; x <= 9; x++) {
      if ((y === 4 || y === 10) && (x === 6 || x === 9)) continue;
      plot(g, x, y, x === 9 ? '2' : y > 7 && x === 6 ? '4' : '3');
    }
  }
  plot(g, 6, 6, 'w');
  plot(g, 9, 6, 'w');
  plot(g, 7, 8, '1');
  plot(g, 8, 8, '1');
  // The ruby brow knot, and the collar thread, cut, its end hanging frayed.
  plot(g, 7, 3, 'd');
  plot(g, 8, 3, 'c');
  for (let x = 5; x <= 10; x++) plot(g, x, 11, x < 8 ? 'd' : 'c');
  plot(g, 11, 12, 'c');
  plot(g, 11, 13, 'b');
  plot(g, 12, 14, 'b');
  // The knot of light at her chest.
  plot(g, 8, 13, '+');
  outlineOutside(g);
  return rows(g);
}

export const iconEnemyGlassWitch = defineSprite({
  id: 'icon.enemy.glass_witch',
  size: { w: FULL, h: FULL },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'none',
  frames: { icon: witchIcon() },
});
