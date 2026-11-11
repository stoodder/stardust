// Shard (`fracture_shard`, design/enemies.md § 5.4, the Fracture's row): half of a Fracture, broken
// off, and it keeps walking (killed, it breaks again, into two Motes). The Hollow's grammar (art-
// direction §4): a half-moon of drained body, its broken face a raw, flat edge glowing cold violet
// (the Fracture's crack, unsung stardust), carried at the back; half a pale ring for a face on the
// round side; two acid eyes (never a pair: one big, one a pinprick); legs on its round side only, so
// it hobbles, lurching toward its missing half every other step; a pale (inverted) outline; 1–3
// pixels missing from every frame. Smaller than a Fracture, bigger than a Mote, and the only Hollow
// shape with a straight edge, so a pair of them reads as one Fracture's two halves.
// - `walk_<facing>` (3 frames, 7 fps); `heavy_<facing>` (§8 `heavy`); `tell_<facing>` (the reach).
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { dropPixels, heavyDress, hollowBody, inkContour, reach } from './hollow.ts';
import { MOTE_BODY_LEGEND } from './mote.ts';

const W = 15;
const H = 13;
const AX = 9;
const AY = 12;

type Look = 'walk' | 'heavy' | 'tell';
type Facing = 'se' | 'ne';

/** The hobble: its tilt toward the broken edge (px it sinks there) and its legs, per step. */
const STEPS: readonly { sink: number; legs: readonly string[] }[] = [
  { sink: 0, legs: ['....0.0..0', '....0..0.0'] },
  { sink: 1, legs: ['.....0.0.0', '.....0.0..'] },
  { sink: 0, legs: ['...0..0.0.', '...0....0.'] },
];

function shard(facing: Facing, step: 0 | 1 | 2, look: Look): string[] {
  const heavy = look === 'heavy';
  const tell = look === 'tell';
  const { sink, legs } = STEPS[step] ?? { sink: 0, legs: [] };
  const cx = 8.5;
  const cy = 6.5 + (tell ? -1 : 0);
  const rx = heavy ? 6.2 : 5;
  const ry = heavy ? 5.2 : tell ? 3.8 : 4.2;
  const body: CharGrid = grid(W, H);
  hollowBody(body, cx, cy, rx, ry, 0, heavy);
  // Lit only along its round crown: the raw half is darker than a whole body, so it sits deep
  // under Act II's ground like every Hollow shape (art-direction §3).
  for (let y = H - 1; y > 0; y--) {
    const row = body[y];
    for (let x = 0; x < W; x++) if (row?.[x] === '3' && body[y - 1]?.[x] !== '.') row[x] = '2';
  }
  const g: CharGrid = grid(W, H);
  // Half a body: everything behind the broken edge is gone; the edge glows. It leans toward the
  // missing half, the edge sinking a pixel on the hobble's low step.
  const edge = Math.round(cx) - 2;
  for (let y = 0; y < H; y++) {
    for (let x = edge; x < W; x++) {
      const c = body[y]?.[x] ?? '.';
      if (c === '.') continue;
      const yy = y + (x <= edge + 1 ? sink : 0);
      // The broken edge: violet glowing through the cracks in it, dimmer once it's fed (Heavy).
      const lit = heavy ? y % 4 === step : (y + step) % 2 === 0;
      // One bright glint along it, moving as it hobbles.
      const glint = !heavy && y === 4 + step;
      plot(g, x, yy, x === edge ? (glint ? 'U' : lit ? 'V' : '0') : c);
    }
  }
  // Its edge inked `ink.0` inside the pale outline, as the Mote's (T569): the crack stays lit.
  inkContour(g);
  stamp(g, edge - 2, H - legs.length, heavy ? legs.slice(0, 1) : legs);
  const fy = Math.round(cy);
  const top = Math.round(cy - ry);
  if (facing === 'se') {
    // Half a ring where a face should be, on the round side (swallowed dark once it's fed); one
    // big acid eye, one pinprick.
    const face = tell
      ? ['ww.', 'kkw', 'kkw', 'ww.']
      : heavy
        ? ['k.', 'kk', 'k.']
        : ['w.', 'kw', 'w.'];
    stamp(g, Math.round(cx) + 2, fy, face);
    stamp(g, Math.round(cx), top + 1, ['*', '+']);
    if (step !== 1) plot(g, Math.round(cx) + 3, top + 2, '+');
  } else {
    plot(g, Math.round(cx) + 1, fy - 1, '*');
    if (step !== 2) plot(g, Math.round(cx) - 1, fy + 1, '+');
  }
  if (tell) reach(g, Math.round(cx + rx) - 1, fy, W - 1, facing === 'se' ? fy + 1 : fy - 2);
  if (heavy) heavyDress(g, Math.round(cx) - 2, fy - 2, edge - 4, fy - 2, step);
  return dropPixels(rows(g), (facing === 'se' ? 50 : 60) + step + (heavy ? 5 : tell ? 9 : 0));
}

const frames = {
  walk_se_0: shard('se', 0, 'walk'),
  walk_se_1: shard('se', 1, 'walk'),
  walk_se_2: shard('se', 2, 'walk'),
  walk_ne_0: shard('ne', 0, 'walk'),
  walk_ne_1: shard('ne', 1, 'walk'),
  walk_ne_2: shard('ne', 2, 'walk'),
  heavy_se_0: shard('se', 0, 'heavy'),
  heavy_se_1: shard('se', 1, 'heavy'),
  heavy_se_2: shard('se', 2, 'heavy'),
  heavy_ne_0: shard('ne', 0, 'heavy'),
  heavy_ne_1: shard('ne', 1, 'heavy'),
  heavy_ne_2: shard('ne', 2, 'heavy'),
  tell_se_0: shard('se', 0, 'tell'),
  tell_ne_0: shard('ne', 0, 'tell'),
};

export const enemyFractureShard = defineSprite({
  id: 'enemy.fracture_shard',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'hollow',
  outline: 'auto',
  legend: MOTE_BODY_LEGEND,
  frames,
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2'], fps: 7 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2'], fps: 7 },
    walk_nw: { mirrorOf: 'walk_ne' },
    heavy_se: { frames: ['heavy_se_0', 'heavy_se_1', 'heavy_se_2'], fps: 8 },
    heavy_sw: { mirrorOf: 'heavy_se' },
    heavy_ne: { frames: ['heavy_ne_0', 'heavy_ne_1', 'heavy_ne_2'], fps: 8 },
    heavy_nw: { mirrorOf: 'heavy_ne' },
    tell_se: { frames: ['tell_se_0'], fps: 1 },
    tell_sw: { mirrorOf: 'tell_se' },
    tell_ne: { frames: ['tell_ne_0'], fps: 1 },
    tell_nw: { mirrorOf: 'tell_ne' },
  },
});
