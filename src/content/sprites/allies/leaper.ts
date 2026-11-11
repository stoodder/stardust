// The Sproing Pad's leapers (`ally.leaper`, design/towers.md § Sproing Pad; T704's sim): young
// Skitterkin who boing off the mushroom pad to bonk flyers out of the sky and always come home.
// The same round, big-eyed Skitterkin body the player shot at in Act I (art-direction §4: allies in
// the `skitterkin.ally` palette, the moss tuft gone teal), wearing a **mushroom-cap helmet** off the
// pad (blue with white spots, apart from its coral body, so a leaper never reads as a swarmling),
// on long springy legs coiled under it. A size between the swarmling and the youngling.
// - `walk_<facing>` (2 frames, 8 fps; LeaperView holds frame 0 through a leap): `0` tucked into a
//   ball for the boing, legs coiled tight, eyes squeezed with glee; `1` stretched out, legs a long
//   spring, the tuft and the cap's strap flying.
// - `land_<facing>` (1 frame): the squash as it lands home, cap jammed down, legs splayed.
import { defineSprite } from '../defineSprite.ts';
import { finish, skitterBody } from '../enemies/skitter.ts';
import { line, plot, type CharGrid } from '../helpers.ts';

const W = 12;
const H = 15;
const CX = 6;

type Look = 'tuck' | 'stretch' | 'land';

/** The mushroom cap over the body's crown: blue, white spots, a dark rim. */
// prettier-ignore
const CAP = [
  '..RRRR..',
  '.RWRRWR.',
  'RRRRRRRR',
  'QQQQQQQQ',
] as const;

/** A coiled spring leg from (x, top) down `n` rows: a zigzag of steel-dark and lit pixels. */
function spring(g: CharGrid, x: number, top: number, n: number): void {
  for (let k = 0; k < n; k++) plot(g, x + (k % 2 === 0 ? 0 : 1), top + k, k % 2 === 0 ? '1' : '2');
  plot(g, x, top + n, '0');
  plot(g, x + 1, top + n, '0');
}

function leaper(facing: 'se' | 'ne', look: Look): string[] {
  const tuck = look === 'tuck';
  const land = look === 'land';
  const rx = land ? 4.6 : tuck ? 3.8 : 3.4;
  const ry = land ? 3 : tuck ? 3.6 : 3.8;
  const cy = land ? H - 4 : tuck ? H - 6 : H - 9;
  const g = skitterBody({ w: W, h: H, cx: CX, cy, rx, ry, facing, belly: 0.3 });
  const top = Math.round(cy - ry);
  const fy = Math.round(cy) - 1;
  // The legs: a tight coil under it (tucked), a long spring (stretched), splayed (landed).
  const bottom = Math.round(cy + ry) - 1;
  if (tuck) {
    spring(g, CX - 3, bottom, 3);
    spring(g, CX + 1, bottom, 3);
  } else if (land) {
    line(g, CX - 4, H - 2, CX - 6, H - 1, '1');
    line(g, CX + 3, H - 2, CX + 5, H - 1, '1');
  } else {
    spring(g, CX - 3, bottom, H - 2 - bottom);
    spring(g, CX + 1, bottom, H - 2 - bottom);
  }
  const stamps: [number, number, readonly string[]][] = [[CX - 4, top - 2 + (land ? 1 : 0), CAP]];
  // The tuft poking out behind the cap, flying up when it stretches.
  const back = facing === 'se' ? CX - 4 : CX + 2;
  stamps.push([back, top - (tuck || land ? 1 : 3), facing === 'se' ? ['c.', 'dc'] : ['.c', 'cd']]);
  if (facing === 'se') {
    // Big eyes: squeezed with glee in the tuck and the landing, wide open in the stretch.
    stamps.push(
      tuck || land
        ? [CX - 1, fy + 1, ['k..k', '.k..']]
        : [CX - 1, fy, ['wk.wk', 'kk.kk']],
    );
  } else {
    stamps.push([CX - 1, fy + 1, ['+.+', '.*.']]);
  }
  return finish(g, stamps);
}

export const allyLeaper = defineSprite({
  id: 'ally.leaper',
  size: { w: W, h: H },
  anchor: { x: CX, y: H - 1 },
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { R: 'blue.3', Q: 'blue.1', W: 'white.1' },
  frames: {
    walk_se_0: leaper('se', 'tuck'),
    walk_se_1: leaper('se', 'stretch'),
    walk_ne_0: leaper('ne', 'tuck'),
    walk_ne_1: leaper('ne', 'stretch'),
    land_se_0: leaper('se', 'land'),
    land_ne_0: leaper('ne', 'land'),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 8 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 8 },
    walk_nw: { mirrorOf: 'walk_ne' },
    land_se: { frames: ['land_se_0'], fps: 2 },
    land_sw: { mirrorOf: 'land_se' },
    land_ne: { frames: ['land_ne_0'], fps: 2 },
    land_nw: { mirrorOf: 'land_ne' },
  },
});
