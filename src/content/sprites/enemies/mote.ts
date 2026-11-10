// Mote (`mote`, design/enemies.md § 5.4): the first Hollow unit (A2M1), small, quick, and in
// clusters. Story/races.md: the Hollow has no bodies, only shapes of what its pieces were, drawn
// wrong. A Mote is the shape of a Skitterkin it can't quite remember (art-direction §4 *The
// Hollow*): a round drained body with a bite out of its flank, the tuft come back as a stalk that
// wilts the wrong way, a pale ring where a face should be (low, and on the wrong side), too many
// acid pinprick eyes, a cold violet speck of unsung stardust at its heart (§1 principle 6), and
// legs that pop to new places between frames while the body refuses to bounce in step with them.
// Every frame is missing 1–3 pixels (`dropPixels`), so the missing pixels flicker as it walks.
// - `walk_<facing>` (3 frames, 7 fps): the wrong walk.
// - `heavy_<facing>` (the `heavy` tell, art-direction §8, after it hushes someone): swollen and
//   darker, its pale outline doubled to 2 px, the victim's small Skitterkin silhouette pale inside
//   it, and pale speed lines trailing (it is 15% faster). Render draws it for the rest of its life
//   (render/views/enemyPose.ts `heavy`).
// - `tell_<facing>` (the hush tell, one held frame): it stops and reaches, two thin limbs it never
//   had stretching forward, its ring-face opened wide.
// No death frames: the Hollow unravels into violet motes (render's `unravel`).
// Its body's edge is a 1 px `ink.0` contour inside the pale outline (U12), so the pale ring always
// sits on the darkest dark: a cluster of Motes stays a count of separate shapes, and one crossing a
// grey Everglow base or the grey mining scars doesn't melt into it.
import { defineSprite } from '../defineSprite.ts';
import { at, grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { dropPixels, hollowBody, ringRound } from './hollow.ts';

/** Authored canvas: room behind the body (left, facing SE) for Heavy's speed lines. */
const W = 15;
const H = 14;
/** The ground point: under the body, which sits right of center. */
const AX = 9;
const AY = 13;

type Look = 'walk' | 'heavy' | 'tell';
type Facing = 'se' | 'ne';

/** The wrong legs: each walk frame puts them somewhere new (x offsets from the body's left). */
const LEGS: readonly (readonly string[])[] = [
  ['..0...0..0', '..0...0...'],
  ['.0...0...0', '.....0...0'],
  ['...0..0.0.', '...0......'],
];

/** The victim's silhouette inside a Heavy Mote: a little round Skitterkin with its tuft. */
// prettier-ignore
const VICTIM = [
  '..w..',
  '.www.',
  'wwwww',
  '.w.w.',
] as const;

/** Speed lines trailing a Heavy Mote, alternating between two patterns. */
// prettier-ignore
const SPEED = [
  ['33.', '...', '.33', '...'],
  ['.33', '...', '33.', '...'],
  ['3.3', '...', '.33', '...'],
] as const;

/** The body's edge (every body pixel touching the outside, 4-adjacent) inked `ink.0` (`K`). */
function contour(g: CharGrid): void {
  const edge: [number, number][] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (at(g, x, y) === '.') continue;
      const out =
        at(g, x - 1, y) === '.' ||
        at(g, x + 1, y) === '.' ||
        at(g, x, y - 1) === '.' ||
        at(g, x, y + 1) === '.';
      if (out) edge.push([x, y]);
    }
  }
  for (const [x, y] of edge) plot(g, x, y, 'K');
}

function mote(facing: Facing, step: 0 | 1 | 2, look: Look): string[] {
  const g: CharGrid = grid(W, H);
  const heavy = look === 'heavy';
  const tell = look === 'tell';
  // The body: it doesn't bounce with its legs (a dip on the frame the legs stretch, none after).
  const sink = step === 1 ? 0 : step === 2 ? 1 : 0;
  const cx = heavy ? 9 : 9.5;
  const cy = (heavy ? 7.5 : 8) + sink + (tell ? -1 : 0);
  const rx = heavy ? 5.2 : tell ? 5 : 4.6;
  const ry = heavy ? 4.6 : tell ? 3.4 : 3.8;
  hollowBody(g, cx, cy, rx, ry, facing === 'se' ? 0.8 : -0.6, heavy);
  contour(g);
  const top = Math.round(cy - ry);
  const left = Math.round(cx - rx);
  // The legs (Heavy plants three, the reach one).
  const legs = tell ? ['..0.....0.'] : heavy ? (LEGS[step]?.slice(0, 1) ?? []) : (LEGS[step] ?? []);
  stamp(g, left, H - legs.length, legs);
  // The stalk the tuft came back as: it wilts backward and down, and flips side between frames.
  const sx = Math.round(cx) - 1;
  if (step === 2 && !heavy) {
    line(g, sx, top, sx + 2, top - 2, '2');
    plot(g, sx + 3, top - 2, '3');
  } else {
    line(g, sx, top, sx - 2, top - 2, '2');
    plot(g, sx - 3, top - 1, '3');
  }
  // The cold violet speck of unsung stardust at its heart (twinkling).
  plot(g, Math.round(cx) - 2, Math.round(cy) - 1, step === 1 ? 'U' : 'V');
  if (facing === 'se') {
    // A ring where a face should be: low, and on the wrong side of the turn. Opened in the reach.
    const fx = Math.round(cx);
    const fy = Math.round(cy);
    stamp(g, fx, fy, tell ? ['.ww.', 'wkkw', 'wkkw', '.ww.'] : ['.w.', 'wkw', '.w.']);
    // Too many eyes: acid pinpricks scattered over the crown, never a pair.
    plot(g, Math.round(cx), top + 1, '*');
    plot(g, Math.round(cx) + 2, top + 2, '+');
    if (step !== 1) plot(g, Math.round(cx) - 2, top + 2, '+');
  } else {
    // From behind it looks at you anyway: acid eyes on its back.
    plot(g, Math.round(cx) + 1, Math.round(cy) - 1, '*');
    plot(g, Math.round(cx) - 2, Math.round(cy) + 1, '+');
    if (step !== 1) plot(g, Math.round(cx) + 2, Math.round(cy) + 2, '+');
  }
  if (tell) {
    // Two thin limbs it never had, reaching out ahead of it.
    const ex = facing === 'se' ? W - 1 : W - 1;
    const ey = facing === 'se' ? Math.round(cy) + 2 : Math.round(cy) - 2;
    line(g, Math.round(cx + rx) - 1, Math.round(cy), ex, ey, '2');
    line(g, Math.round(cx + rx) - 1, Math.round(cy) + 2, ex, ey + 2, '1');
    plot(g, ex, ey, 'w');
    plot(g, ex, ey + 2, 'w');
  }
  if (heavy) {
    // The victim, pale inside it; then the doubled outline, and the speed lines behind.
    stamp(g, Math.round(cx) - 3, Math.round(cy) - 2, VICTIM);
    ringRound(g);
    stamp(g, 0, Math.round(cy) - 2, SPEED[step] ?? []);
  }
  return dropPixels(rows(g), (facing === 'se' ? 10 : 20) + step + (heavy ? 5 : tell ? 9 : 0));
}

/** Unsung stardust (art-direction §2 `stardust.unsung`): the cold violet the Hollow scatters into. */
export const MOTE_LEGEND = { V: 'violet.3', U: 'violet.4' } as const;

const frames = {
  walk_se_0: mote('se', 0, 'walk'),
  walk_se_1: mote('se', 1, 'walk'),
  walk_se_2: mote('se', 2, 'walk'),
  walk_ne_0: mote('ne', 0, 'walk'),
  walk_ne_1: mote('ne', 1, 'walk'),
  walk_ne_2: mote('ne', 2, 'walk'),
  heavy_se_0: mote('se', 0, 'heavy'),
  heavy_se_1: mote('se', 1, 'heavy'),
  heavy_se_2: mote('se', 2, 'heavy'),
  heavy_ne_0: mote('ne', 0, 'heavy'),
  heavy_ne_1: mote('ne', 1, 'heavy'),
  heavy_ne_2: mote('ne', 2, 'heavy'),
  tell_se_0: mote('se', 0, 'tell'),
  tell_ne_0: mote('ne', 0, 'tell'),
};

export const enemyMote = defineSprite({
  id: 'enemy.mote',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'hollow',
  outline: 'auto',
  // Unsung stardust's violet, and the body's `ink.0` contour.
  legend: { ...MOTE_LEGEND, K: 'ink.0' },
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
