// A Tidybot (`prop.tidybot`; design/enemies.md § 8, core-loop.md § 6.7, art-direction §6): one of
// Everglow's cheerful cleanup drones, which hover in after each wave in Acts I–II and vacuum up
// the remains with a chime. Render-only (T410b places them). A squat round puck of Everglow white
// with a teal band and a smiling Evie-sun sticker, a ducted fan at each side, a flexible hose
// slung under it to an orange vacuum nozzle, and a little brass bell of a chime lamp on its crown.
// Squat and wide where Gerald is a tall capsule on a rotor mast, and round where the salvage drone
// is boxy, so the three never read alike.
//
// Like the salvage drone, its anchor is the ground point under it: the body hovers inside the
// frame (no render lift), so the nozzle reaches the ground. Render puts `fx.shadow` (`small`) at
// the anchor. Frames and anims:
// - `fly_0`, `fly_1`, anim `fly` (10 fps): flying, fans blurring, the hose tucked up.
// - `vac_0`–`vac_2`, anim `vacuum` (8 fps): hovering low, the nozzle down on the ground, suction
//   lines drawing a few bright flecks up into it.
// - `chime_0`, `chime_1`, anim `chime` (6 fps, once): the chime lamp flashes and rings (a note
//   puff over the bell), ending on `chime_1`.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 22;
const H = 28;
/** The anchor: the ground point under the drone. */
const AX = 11;
const AY = H - 1;

type Pose = 'fly' | 'vac' | 'chime';

/** Rings a layer's opaque pixels with hand-placed ink, then lays the layer over `g`. */
function outlined(g: CharGrid, layer: CharGrid): void {
  const solid = (x: number, y: number): boolean => (layer[y]?.[x] ?? '.') !== '.';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))
        plot(g, x, y, 'x');
    }
  }
  layer.forEach((r, y) => r.forEach((ch, x) => ch !== '.' && plot(g, x, y, ch)));
}

/** The drone (no outline): its fans in phase `k`, hovering `y0` px from the top. */
function craft(pose: Pose, k: number, y0: number): CharGrid {
  const d = grid(W, H);
  // The puck: a squat white ellipse, lit upper left, the shaded underside a step down.
  disc(d, AX, y0 + 7, 7.5, (_dist, x, y) => {
    const dx = (x + 0.5 - AX) / 7.5;
    const dy = (y + 0.5 - (y0 + 7)) / 4.2;
    if (dx * dx + dy * dy > 1) return '.';
    if (dy > 0.45) return '2';
    if (dy > 0.15) return 'b';
    return dx + dy < -0.55 ? 'w' : dx > 0.45 ? '3' : '4';
  });
  // The teal band round its waist, and the Evie sun sticker on the front.
  for (let x = AX - 7; x <= AX + 6; x++) plot(d, x, y0 + 8, x > AX + 2 ? '7' : '8');
  stamp(d, AX - 2, y0 + 4, ['.GG.', 'GkkG', '.GG.']);
  // Ducted fans at each side: a ring with a blade or a blur.
  for (const fx of [AX - 9, AX + 7]) {
    stamp(d, fx, y0 + 4, ['.11.', '1..1', '.11.']);
    stamp(d, fx + 1, y0 + 5, k % 2 === 0 ? ['33'] : ['3.']);
  }
  // The chime lamp: a little brass bell on the crown, its lamp lit when it chimes.
  const lit = pose === 'chime';
  stamp(d, AX - 1, y0, ['.B.', 'BAB', lit ? '*+*' : '+A+']);
  // The hose: slung under the puck to the orange nozzle; down to the ground while it vacuums.
  if (pose === 'vac') {
    const bottom = AY - 2;
    for (let y = y0 + 11; y < bottom; y++) plot(d, AX + ((y + k) % 4 < 2 ? 0 : 1), y, '1');
    stamp(d, AX - 1, bottom, ['dcd', 'c.c']);
  } else {
    // Tucked up in a loop, the nozzle hooked on the puck's belly.
    stamp(d, AX - 3, y0 + 11, ['.11.', '1..1', '.1.c', '..dc']);
  }
  return d;
}

/** Suction: dashed lines converging on the nozzle, a few bright flecks drawn up in phase `k`. */
function suction(g: CharGrid, k: number): void {
  const nx = AX;
  const ny = AY - 2;
  for (const [sx, sy] of [
    [AX - 6, AY],
    [AX + 6, AY],
    [AX - 4, AY - 4],
    [AX + 5, AY - 4],
  ] as const) {
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      if ((i + k) % 3 === 0) continue;
      const x = Math.round(sx + ((nx - sx) * i) / steps);
      const y = Math.round(sy + ((ny - sy) * i) / steps);
      plot(g, x, y, 'w');
    }
  }
  // The remains going up: confetti-bright flecks (pink and gold), nearer the nozzle each frame.
  const flecks = [
    ['P....', '...Q.', '.....'],
    ['.....', '.P...', '...Q.'],
    ['..P..', '.....', '.Q...'],
  ];
  stamp(g, AX - 3, AY - 6 + k, flecks[k % 3] ?? []);
}

function frame(pose: Pose, k: number): string[] {
  const g = grid(W, H);
  const y0 = pose === 'vac' ? 6 + (k === 1 ? 1 : 0) : 4 + (k === 1 ? 1 : 0);
  if (pose === 'vac') suction(g, k);
  outlined(g, craft(pose, k, y0));
  if (pose === 'chime') {
    // The chime: a ring of light round the bell, and a note puff on the second frame.
    stamp(g, AX - 3, y0 - 3, k === 0 ? ['w.....w', '.w...w.'] : ['..w.w..', 'w.....w']);
    if (k === 1) stamp(g, AX + 4, y0 - 4, ['.ww', '.w.', 'ww.']);
  }
  // Its own small ground shadow sits at the anchor (render adds `fx.shadow` there too).
  return rows(g);
}

export const propTidybot = defineSprite({
  id: 'prop.tidybot',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  // Outlined by hand round the craft only, so the suction lines and the chime ring stay soft.
  outline: 'none',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { G: 'gold.3', A: 'brass.2', B: 'brass.3', P: 'pink.3', Q: 'gold.4' },
  frames: {
    fly_0: frame('fly', 0),
    fly_1: frame('fly', 1),
    vac_0: frame('vac', 0),
    vac_1: frame('vac', 1),
    vac_2: frame('vac', 2),
    chime_0: frame('chime', 0),
    chime_1: frame('chime', 1),
  },
  anims: {
    fly: { frames: ['fly_0', 'fly_1'], fps: 10 },
    vacuum: { frames: ['vac_0', 'vac_1', 'vac_2'], fps: 8 },
    chime: { frames: ['chime_0', 'chime_1'], fps: 6, loop: false },
  },
});
