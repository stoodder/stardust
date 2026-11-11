// M5's wave-preview icons (T540a; art-direction §5: the enemy's own look, front-facing, 16×16).
// The Aelari constructs are re-woven at icon size with the lattice builders (enemies/lattice.ts),
// drawn at 16×16 with their outline on the outside only, so their gaps stay see-through on the
// HUD's panels; each keeps its body's tell at a glance: the Veilwalker's emerald hood, the
// Blinkstrider's stilts and prow, the Cantor's lyre, the Glimmer-shard's torn kite and ruby thread.
// The Hollow units are 14×14 with the `auto` pale outline: the Shard fitted from its own walk
// frame (like the Mote's icon), the Fracture and the Rift Moth redrawn small (their bodies outgrow
// the box): the cracked body with its violet seam, the ragged moth with eyes on its wings.
import { defineSprite } from '../defineSprite.ts';
import { grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { enemyFractureShard } from '../enemies/fracture_shard.ts';
import { hollowBody } from '../enemies/hollow.ts';
import { outlineOutside, rim, weave, type Mask } from '../enemies/lattice.ts';
import { MOTE_BODY_LEGEND, MOTE_LEGEND } from '../enemies/mote.ts';
import { ICON } from './iconGen.ts';

/** The Aelari icons' full size (the outline is drawn inside it). */
const FULL = ICON + 2;

/** The veiled head and shoulders: the pointed emerald hood, a shadowed face, the ruby clasp. */
function veil(): string[] {
  const g: CharGrid = grid(FULL, FULL);
  const cx = 8;
  const mask: Mask = (x, y) => {
    const yy = y + 0.5;
    let l = 0;
    let r = 0;
    if (yy < 1 || yy > 15) return false;
    if (yy < 6) {
      const hw = 0.6 + 2.8 * Math.sqrt((yy - 1) / 5);
      l = cx - hw;
      r = cx + hw;
    } else if (yy < 9) {
      const hw = 3.4 + ((yy - 6) / 3) * 1.8;
      l = cx - hw;
      r = cx + hw;
    } else {
      const t = (yy - 9) / 6;
      l = cx - 5.2 - 1.4 * t;
      r = cx + 5.2 - 0.2 * t;
    }
    return x + 0.5 >= l && x + 0.5 <= r;
  };
  weave(g, mask, { mode: 'diag', spacing: 3, phase: 1, lx: cx, ly: 9, ramp: 's' }, 6);
  rim(g, mask, cx, 8, 's');
  stamp(g, 6, 3, ['.kk.', 'kkkk', 'kkkk', '.kk.']);
  plot(g, 6, 4, '*');
  plot(g, 8, 4, '*');
  plot(g, 7, 1, 'd');
  stamp(g, 6, 8, ['cdc']);
  stamp(g, 6, 11, ['.+.', '+*+', '.+.']);
  outlineOutside(g);
  return rows(g);
}

export const iconEnemyVeilwalker = defineSprite({
  id: 'icon.enemy.veilwalker',
  size: { w: FULL, h: FULL },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'none',
  frames: { icon: veil() },
});

/** The strider: a woven body with its prow ahead and a ruby crest, high on two thread legs. */
function strider(): string[] {
  const g: CharGrid = grid(FULL, FULL);
  const cx = 6.5;
  const cy = 5;
  const body: Mask = (x, y) => {
    const px = x + 0.5;
    const py = y + 0.5;
    if (Math.hypot((px - cx) / 4.2, (py - cy) / 2.8) <= 1) return true;
    const t = (px - (cx + 2.5)) / (14.5 - (cx + 2.5));
    return t >= 0 && t <= 1 && Math.abs(py - cy - 0.3 * t) <= 2 * (1 - t);
  };
  weave(g, body, { mode: 'diag', spacing: 3, lx: cx, ly: cy }, 4);
  rim(g, body, cx, cy - 1);
  stamp(g, 5, 1, ['.d', 'dc']);
  stamp(g, 5, 4, ['.+.', '+*+', '.+.']);
  plot(g, 11, 4, '*');
  // Two tail threads streaming behind.
  line(g, 2, 4, 1, 3, '3');
  line(g, 2, 6, 1, 7, '2');
  outlineOutside(g);
  // The legs, bare threads with a dark edge: bent back at ruby knees.
  const leg = (
    hip: [number, number],
    knee: [number, number],
    foot: [number, number],
    near: boolean,
  ): void => {
    const t = grid(FULL, FULL);
    line(t, hip[0], hip[1], knee[0], knee[1], 'L');
    line(t, knee[0], knee[1], foot[0], foot[1], 'L');
    for (let y = 0; y < FULL; y++) {
      for (let x = 0; x < FULL; x++) {
        if (t[y]?.[x] !== 'L') continue;
        if (!near && g[y]?.[x] !== '.' && g[y]?.[x] !== 'x') continue;
        plot(g, x, y, near ? '4' : '2');
        if (g[y]?.[x + 1] === '.' && t[y]?.[x + 1] !== 'L') plot(g, x + 1, y, 'x');
      }
    }
    plot(g, knee[0], knee[1], near ? 'd' : 'b');
  };
  leg([5, 8], [3, 11], [2, 14], false);
  leg([7, 8], [5, 11], [9, 14], true);
  return rows(g);
}

export const iconEnemyBlinkstrider = defineSprite({
  id: 'icon.enemy.blinkstrider',
  size: { w: FULL, h: FULL },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'none',
  frames: { icon: strider() },
});

/** The lyre's soundbox: a bowl, flat on top, round below. */
function lyreBox(x: number, y: number): boolean {
  if (y < 10 || y > 14) return false;
  const t = (y + 0.5 - 10) / 5;
  return Math.abs(x + 0.5 - 8) <= 5.6 * Math.sqrt(Math.max(0, 1 - t * t));
}

/** The lyre: two horns curling out, a ruby-knotted yoke, emerald strings, the singing bowl. */
function lyre(): string[] {
  const g: CharGrid = grid(FULL, FULL);
  weave(g, lyreBox, { mode: 'diag', spacing: 3, phase: 1, lx: 8, ly: 11 }, 4);
  rim(g, lyreBox, 8, 11);
  // The horns (the right mirrors the left about the middle).
  const horn: readonly [number, number][] = [
    [4, 10],
    [3, 9],
    [3, 8],
    [3, 7],
    [3, 6],
    [3, 5],
    [2, 4],
    [2, 3],
    [1, 2],
  ];
  for (const [x, y] of horn) {
    plot(g, x, y, '4');
    plot(g, x + 1, y, '3');
    plot(g, 15 - x, y, '2');
    plot(g, 14 - x, y, '3');
  }
  plot(g, 1, 1, 'c');
  plot(g, 14, 1, 'c');
  for (let x = 3; x <= 12; x++) plot(g, x, 3, '3');
  plot(g, 3, 3, 'd');
  plot(g, 12, 3, 'd');
  for (const sx of [6, 9]) for (let y = 4; y < 10; y++) plot(g, sx, y, y < 7 ? '9' : '8');
  stamp(g, 6, 10, ['.+*.', '+..+', '.*+.']);
  outlineOutside(g);
  return rows(g);
}

export const iconEnemyCantor = defineSprite({
  id: 'icon.enemy.cantor',
  size: { w: FULL, h: FULL },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'none',
  frames: { icon: lyre() },
});

/** Whether (px, py) lies inside the polygon `pts` (even-odd). */
function inPoly(px: number, py: number, pts: readonly (readonly [number, number])[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i];
    const b = pts[j];
    if (a === undefined || b === undefined) continue;
    if (a[1] > py !== b[1] > py && px < ((b[0] - a[0]) * (py - a[1])) / (b[1] - a[1]) + a[0]) {
      inside = !inside;
    }
  }
  return inside;
}

/** The torn kite of weave, tipped, with its ruby thread hanging and a loose end at the tear. */
function shard(): string[] {
  const g: CharGrid = grid(FULL, FULL);
  const pts: readonly (readonly [number, number])[] = [
    [7, 1],
    [12, 6],
    [10.5, 8],
    [12, 10],
    [6, 14],
    [2.5, 6],
  ];
  const mask: Mask = (x, y) => inPoly(x + 0.5, y + 0.5, pts);
  weave(g, mask, { mode: 'diag', spacing: 3, lx: 6, ly: 6 }, 5);
  rim(g, mask, 6, 6);
  stamp(g, 6, 6, ['.+.', '+*+', '.+.']);
  outlineOutside(g);
  line(g, 12, 10, 14, 12, '2');
  line(g, 9, 12, 9, 14, 'c');
  plot(g, 9, 15, 'd');
  return rows(g);
}

export const iconEnemyGlimmerShard = defineSprite({
  id: 'icon.enemy.glimmer_shard',
  size: { w: FULL, h: FULL },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'none',
  frames: { icon: shard() },
});

/** `frame` (a Hollow walk frame) centred on its opaque middle in the 14×14 icon box. */
function fitted(frame: readonly string[]): string[] {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  frame.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if (r[x] === '.') continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  });
  const left = Math.round((x0 + x1 + 1) / 2 - ICON / 2);
  const g: CharGrid = grid(ICON, ICON);
  stamp(g, -left, ICON - 1 - y1, frame);
  return rows(g);
}

function walkFrame(): readonly string[] {
  const src = enemyFractureShard.frames['walk_se_0'];
  if (src === undefined || !Array.isArray(src)) throw new Error('no fracture_shard walk_se_0');
  return src;
}

export const iconEnemyFractureShard = defineSprite({
  id: 'icon.enemy.fracture_shard',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'hollow',
  outline: 'auto',
  legend: MOTE_BODY_LEGEND,
  frames: { icon: fitted(walkFrame()) },
});

/** The cracked body: two drained halves out of step across a violet seam, eyes, a ring face. */
function cracked(): string[] {
  const left: CharGrid = grid(ICON, ICON);
  const right: CharGrid = grid(ICON, ICON);
  hollowBody(left, 7, 7.5, 6.4, 5.4, 0);
  hollowBody(right, 7, 6.5, 6.4, 5.4, 0.7);
  const g: CharGrid = grid(ICON, ICON);
  const zig = [0, 1, 1, 0, -1, -1];
  for (let y = 0; y < ICON; y++) {
    const c = 6 + (zig[y % zig.length] ?? 0);
    for (let x = 0; x < ICON; x++) {
      const l = left[y]?.[x] ?? '.';
      const r = right[y]?.[x] ?? '.';
      if (x < c && l !== '.') plot(g, x, y, l);
      else if (x > c && r !== '.') plot(g, x, y, r);
      else if (x === c && (l !== '.' || r !== '.')) plot(g, x, y, y % 3 === 0 ? 'U' : 'V');
    }
  }
  stamp(g, 9, 7, ['.w.', 'wkw', '.w.']);
  plot(g, 8, 3, '*');
  plot(g, 11, 4, '+');
  plot(g, 3, 9, '+');
  return rows(g);
}

export const iconEnemyFracture = defineSprite({
  id: 'icon.enemy.fracture',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'hollow',
  outline: 'auto',
  legend: MOTE_LEGEND,
  frames: { icon: cracked() },
});

/** The moth, small: ragged drained wings out of step, eyes on them, a dark body, kinked feelers. */
function moth(): string[] {
  const g: CharGrid = grid(ICON, ICON);
  // Forewings (left raised, right level: out of step) and hindwings, then the veins.
  // prettier-ignore
  const wings = [
    '2.........3...',
    '33.......33...',
    '233.....3333..',
    '1233...233332.',
    '12223.32222221',
    '.1222.2222221.',
    '..112.21111...',
    '..111.1111....',
    '...11.111.....',
  ];
  stamp(g, 0, 2, wings);
  line(g, 6, 6, 1, 3, '0');
  line(g, 8, 6, 12, 6, '0');
  stamp(g, 2, 5, ['0*0']);
  stamp(g, 9, 4, ['0*0']);
  plot(g, 11, 7, '+');
  // The body, the violet speck, the head crowded with eyes, the feelers kinked wrong.
  for (let y = 4; y <= 12; y++) plot(g, 6, y, y % 2 === 0 ? '0' : '1');
  plot(g, 6, 8, 'V');
  stamp(g, 5, 2, ['.1.', '1*1']);
  line(g, 5, 2, 4, 0, '2');
  line(g, 7, 2, 8, 1, '2');
  plot(g, 9, 0, '3');
  return rows(g);
}

export const iconEnemyRiftmoth = defineSprite({
  id: 'icon.enemy.riftmoth',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'hollow',
  outline: 'auto',
  legend: MOTE_LEGEND,
  frames: { icon: moth() },
});
