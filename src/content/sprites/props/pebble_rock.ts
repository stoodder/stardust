// Pebble on the Peeker's rock (`prop.pebble_rock`; A3M6, act3.md § A3M6: "Pebble sits on top of
// the Peeker rock from W1: A1M1's (3,1), which is (7,3) on this grid"): the youngling who peeked at
// you from behind this rock on your first map, up on top of it now in plain sight, wearing Bricks's
// bottle cap (as `ally.pebble` does), her seedling up through its hole, legs over the front. The
// rock is the Peeker's own (`prop.peeker`'s), in the dark as Act III's rocks are (`prop.rock`'s
// `night`: its crystal steps pushed down to the ground's), so only Pebble is bright on it.
// - `perch_0` looking out over the road, `perch_1` a blink, `perch_2` a little bounce with her
//   sprout perked (anim `perch`, 4 fps: watching, blinking, now and then a bounce).
// The rock takes the `act3` env palette; Pebble's colours are custom legend (the Peeker's youngling
// slots and her cap's), so she keeps them.
import { defineSprite } from '../defineSprite.ts';
import { finish, skitterBody } from '../enemies/skitter.ts';
import { fromRows, grid, plot, recolor, rows, stamp, type CharGrid } from '../helpers.ts';
import { CRITTER, ROCK } from './peeker.ts';

const W = 20;
const H = 24;

/** The rock in the dark: each step two down (the night look `prop.rock` takes). */
const NIGHT_ROCK = recolor(ROCK, { e: 'c', d: 'b', c: 'a', b: '1', a: '0' });

/** Bricks's bottle cap, Pebble's (`ally.pebble`'s): white top ringed teal, crimped steel skirt. */
// prettier-ignore
const CAP = [
  '.TCYCT.',
  'TCCCCCT',
  '.SRSRS.',
];
/** Her seedling, up through the cap's hole; perked on a bounce. */
const SPROUT = ['VV.VV', '.VVV.', '..V..'];
const PERKED = ['V...V', '.VVV.', '..V..'];

type Pose = 'look' | 'blink' | 'bounce';

/** Pebble sitting up (the youngling's body, her cap and seedling), as custom legend chars. */
function pebble(pose: Pose): string[] {
  const g = skitterBody({ w: 11, h: 13, cx: 5.5, cy: 8, rx: 4.6, ry: 3.6, facing: 'se', belly: 0.35 });
  const body = finish(g, [
    // Her legs over the rock's front, dangling.
    [2, 11, ['1.1..1.1']],
    [3, 0, pose === 'bounce' ? PERKED : SPROUT],
    [2, 3, CAP],
    // The youngling's big eyes (shut for a blink), and the blush.
    [5, 7, pose === 'blink' ? ['..', 'kk'] : ['wk', 'kk']],
    [8, 7, pose === 'blink' ? ['..', 'kk'] : ['wk', 'kk']],
    [2, 8, ['P']],
  ]);
  return recolor(body, CRITTER);
}

function perch(pose: Pose): string[] {
  const g: CharGrid = grid(W, H);
  const rock = fromRows(NIGHT_ROCK);
  const top = H - NIGHT_ROCK.length;
  rock.forEach((r, y) => r.forEach((ch, x) => ch !== '.' && plot(g, x, top + y, ch)));
  // Pebble on the crown, a pixel higher on a bounce; a hand-placed outline round her so she reads
  // off the rock.
  const lift = pose === 'bounce' ? 1 : 0;
  const pb = pebble(pose);
  const px = 4;
  const py = top - pb.length + 2 - lift;
  const solid = (x: number, y: number): boolean => {
    const ch = x < px ? '.' : (pb[y - py]?.charAt(x - px) ?? '.');
    return ch !== '.' && ch !== '';
  };
  for (let y = py - 1; y <= py + pb.length; y++) {
    for (let x = px - 1; x <= px + 11; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) plot(g, x, y, 'x');
    }
  }
  stamp(g, px, py, pb);
  return rows(g);
}

export const propPebbleRock = defineSprite({
  id: 'prop.pebble_rock',
  size: { w: W, h: H },
  anchor: { x: 10, y: H - 2 },
  palette: 'act3',
  outline: 'auto',
  legend: {
    // The youngling (the Peeker's): coral body, butter belly, moss sprout, ink eyes, the shimmer.
    K: 'coral.1',
    L: 'coral.2',
    M: 'coral.3',
    N: 'coral.4',
    G: 'gold.3',
    H: 'gold.4',
    V: 'green.3',
    Q: 'ink.1',
    W: 'white.1',
    P: 'pink.3',
    // Bricks's cap.
    C: 'white.1',
    Y: 'green.2',
    T: 'teal.3',
    S: 'steel.4',
    R: 'steel.2',
  },
  frames: { perch_0: perch('look'), perch_1: perch('blink'), perch_2: perch('bounce') },
  anims: {
    perch: { frames: ['perch_0', 'perch_0', 'perch_0', 'perch_1', 'perch_0', 'perch_0', 'perch_2'], fps: 4 },
  },
});
