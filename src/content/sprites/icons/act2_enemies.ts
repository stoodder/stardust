// Act II's wave-preview icons (art-direction §5: the enemy's own look, front-facing, 16×16): the
// Mote from its own walk frame, and the three Aelari constructs re-woven at icon size with the
// lattice builders (enemies/lattice.ts), so their gaps stay see-through on the HUD's panels too.
// The Aelari icons are drawn at 16×16 with their outline on the outside only (no `auto` pass).
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { enemyMote, MOTE_BODY_LEGEND } from '../enemies/mote.ts';
import { outlineOutside, rim, weave, type Mask } from '../enemies/lattice.ts';
import { ICON } from './iconGen.ts';

/** The Aelari icons' full size (the outline is drawn inside it). */
const FULL = ICON + 2;

/** The Mote's SE walk frame, centred in the 14×14 icon box. */
function moteIcon(): string[] {
  const src = enemyMote.frames['walk_se_0'];
  if (src === undefined || !Array.isArray(src)) throw new Error('enemy.mote has no walk_se_0 grid');
  const frame: readonly string[] = src;
  let x0 = Infinity;
  let x1 = -Infinity;
  for (const r of frame) {
    for (let x = 0; x < r.length; x++) {
      if (r[x] === '.') continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
    }
  }
  const left = Math.round((x0 + x1 + 1) / 2 - ICON / 2);
  const g: CharGrid = grid(ICON, ICON);
  stamp(g, -left, ICON - frame.length, frame);
  return rows(g);
}

export const iconEnemyMote = defineSprite({
  id: 'icon.enemy.mote',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'hollow',
  outline: 'auto',
  // The walk frame's own legend (unsung violet, the body's ink contour).
  legend: MOTE_BODY_LEGEND,
  frames: { icon: moteIcon() },
});

function spindle(): string[] {
  const g: CharGrid = grid(FULL, FULL);
  const cx = 8;
  const mask: Mask = (x, y) => {
    const t = (y + 0.5 - 1) / 13.5;
    if (t < 0 || t > 1) return false;
    const hw = t < 0.35 ? 4.8 * Math.sqrt(t / 0.35) : 4.8 * (1 - Math.pow((t - 0.35) / 0.65, 1.4));
    return Math.abs(x + 0.5 - cx) <= hw + 0.25;
  };
  weave(g, mask, { mode: 'diag', spacing: 4, phase: 2, lx: cx, ly: 8 }, 6);
  rim(g, mask, cx, 7);
  plot(g, 7, 1, 'd');
  plot(g, 7, 2, 'c');
  stamp(g, 6, 7, ['.+.', '+*+', '.+.']);
  stamp(g, 9, 5, ['*']);
  outlineOutside(g);
  return rows(g);
}

export const iconEnemyGlimmer = defineSprite({
  id: 'icon.enemy.glimmer',
  size: { w: FULL, h: FULL },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'none',
  frames: { icon: spindle() },
});

function bell(): string[] {
  const g: CharGrid = grid(FULL, FULL);
  const cx = 8;
  const mask: Mask = (x, y) => {
    const yy = y + 0.5;
    let hw = -1;
    if (yy >= 1 && yy < 6) hw = 6.4 * Math.pow((yy - 1) / 5, 0.75);
    else if (yy >= 6 && yy < 9) hw = 6.4 - ((yy - 6) / 3) * 1.6;
    else if (yy >= 9 && yy <= 14) hw = 4.8 + ((yy - 9) / 5) * 2.2;
    return hw >= 0 && Math.abs(x + 0.5 - cx) <= hw;
  };
  weave(g, mask, { mode: 'grid', spacing: 3, phase: 2, lx: cx, ly: 8 }, 7);
  rim(g, mask, cx, 7);
  plot(g, 8, 1, 'd');
  stamp(g, 2, 6, ['d', 'c']);
  stamp(g, 13, 6, ['d', 'c']);
  stamp(g, 6, 8, ['.+.', '+*+', '.+.']);
  stamp(g, 8, 4, ['+*w']);
  outlineOutside(g);
  return rows(g);
}

export const iconEnemyWeftWarden = defineSprite({
  id: 'icon.enemy.weft_warden',
  size: { w: FULL, h: FULL },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'none',
  frames: { icon: bell() },
});

function glider(): string[] {
  const g: CharGrid = grid(FULL, FULL);
  const cx = 8;
  const cy = 7;
  // Swept wings: one triangle each side, root at the body, tip out and up.
  const wing = (side: -1 | 1): Mask => {
    return (x, y) => {
      const u = (x + 0.5 - cx) * side; // distance out along the wing
      if (u < 1 || u > 7.2) return false;
      const t = (u - 1) / 6.2;
      const top = cy - 2.5 - t * 3;
      const bottom = cy + 2.5 - t * 4.4;
      return y + 0.5 >= top && y + 0.5 <= bottom;
    };
  };
  for (const side of [-1, 1] as const) {
    const m = wing(side);
    weave(g, m, { mode: 'diag', spacing: 3, lx: cx, ly: cy, ramp: 's' }, 7);
    rim(g, m, cx, cy - 2);
  }
  const body: Mask = (x, y) => {
    const t = (y + 0.5 - 3) / 8;
    if (t < 0 || t > 1) return false;
    const hw = t < 0.4 ? 2 * Math.sqrt(t / 0.4) : 2 * (1 - (t - 0.4) / 0.6);
    return Math.abs(x + 0.5 - cx) <= hw + 0.2;
  };
  for (let y = 0; y < FULL; y++) for (let x = 0; x < FULL; x++) if (body(x, y)) plot(g, x, y, '3');
  rim(g, body, cx, cy - 1);
  plot(g, 7, 3, 'd');
  plot(g, 7, 7, '*');
  plot(g, 8, 5, 'w');
  stamp(g, 6, 11, ['3..3', 'd..d']);
  outlineOutside(g);
  return rows(g);
}

export const iconEnemyLightwing = defineSprite({
  id: 'icon.enemy.lightwing',
  size: { w: FULL, h: FULL },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'none',
  frames: { icon: glider() },
});
