// Big Glorp's acid puddle (`fx.puddle`, design/towers.md § Gloop Spitter: spec A), drawn for a
// puddle of radius 1.0 (the spec's; 64×32 px, a 2:1 ellipse two tiles across), for PuddleView to
// switch to from its generated pool (T730a; `render/views/puddleLook.ts`). Like the generated one:
// a pool on the ground, never a range ring or the Bloom's frost disc. Its fill is a **dither**
// (`green.3` on every other pixel, the ground showing through, as a pool's 45% fill), its edge a
// ragged solid `green.4` rim a pixel or two thick, its far rim shaded `green.2`, and acid bubbles
// (`white.1` glints over `green.4`). Not the `acid` ramp: its yellow-green is the Hollow's.
// - `pool_0`, `pool_1` (anim `pool`, 3 fps): the bubbles rise and pop.
// - `dry_0`, `dry_1`, `dry_2` (anim `dry`, once): the drying over its last half second: the fill
//   thinning to a sparser dither, then only the rim's broken ring, then a few last drops.
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, plot, rows, type CharGrid } from '../helpers.ts';

const W = 64;
const H = 32;
const CX = 32;
const CY = 16;

type Look = 'pool0' | 'pool1' | 'dry0' | 'dry1' | 'dry2';

function puddle(look: Look): string[] {
  const g: CharGrid = grid(W, H);
  const dry = look.startsWith('dry') ? Number(look.slice(3)) + 1 : 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - CX) / 31.5;
      const dy = (y + 0.5 - CY) / 15.5;
      // A ragged edge: the radius wobbles round the pool.
      const wob = 0.025 * Math.sin(Math.atan2(dy, dx) * 7) + 0.04 * hash01(x >> 2, y >> 1, 11);
      const d = Math.hypot(dx, dy) + wob;
      if (d > 1) continue;
      if (d > 0.9) {
        // The rim, broken up as it dries.
        if (dry >= 2 && hash01(x, y, 5) < 0.25 * dry) continue;
        if (dry < 3) plot(g, x, y, dy < -0.3 ? 'H' : 'A');
        continue;
      }
      // The dithered fill, sparser as it dries, gone at the last step.
      if (dry >= 2) continue;
      const on = (x + y) % 2 === 0 && (dry === 0 || y % 2 === 0);
      if (on) plot(g, x, y, dy < -0.45 ? 'H' : 'G');
    }
  }
  // Bubbles: a white glint on a green.4 bead, rising and popping between the pool's frames.
  const bubbles: readonly (readonly [number, number])[] =
    look === 'pool1'
      ? [
          [20, 13],
          [38, 18],
          [44, 11],
        ]
      : [
          [22, 16],
          [36, 12],
          [46, 17],
        ];
  if (dry <= 1) {
    for (const [x, y] of bubbles) {
      plot(g, x, y, 'w');
      plot(g, x + 1, y, 'A');
      plot(g, x, y + 1, 'A');
      plot(g, x + 1, y + 1, 'A');
    }
  }
  if (dry === 3) {
    // The last drops.
    for (const [x, y] of [
      [18, 15],
      [31, 19],
      [43, 13],
      [27, 10],
    ] as const) {
      plot(g, x, y, 'A');
      plot(g, x + 1, y, 'G');
    }
  }
  return rows(g);
}

export const fxPuddle = defineSprite({
  id: 'fx.puddle',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'everglow',
  legend: { G: 'green.3', A: 'green.4', H: 'green.2' },
  frames: {
    pool_0: puddle('pool0'),
    pool_1: puddle('pool1'),
    dry_0: puddle('dry0'),
    dry_1: puddle('dry1'),
    dry_2: puddle('dry2'),
  },
  anims: {
    pool: { frames: ['pool_0', 'pool_1'], fps: 3 },
    // Half a second: PuddleView's drying window (puddleLook.ts DRY_TICKS).
    dry: { frames: ['dry_0', 'dry_1', 'dry_2'], fps: 6, loop: false },
  },
});
