// The Scuttle Den's swarmlings (`ally.swarmling`, design/towers.md §8; T604): the young Skitterkin
// who dash out of the Den, latch onto a unit, nibble at it, and always come home. The same round,
// big-eyed Skitterkin body the player shot at in Act I (art-direction §4: allies reuse the look in
// the `skitterkin.ally` palette, the moss tuft gone teal for the alliance), only small and very
// determined: a brow set low over each big eye, the tuft swept back, the body stretched long as it
// dashes. Smaller than a youngling's toddle, faster.
// - `walk_<facing>` (2 frames, 12 fps): the dash, stretched long and low, legs a blur.
// - `latch_<facing>` (2 frames, 10 fps): latched on, squashed flat over its hold with all four legs
//   splayed out gripping, jaws in, wiggling as it nibbles (SwarmView plays it on a latched one).
// The Champion (allies/champion.ts, Brave Hearts) is this body a size up, in a red headband.
import { defineSprite } from '../defineSprite.ts';
import { finish, skitterBody } from '../enemies/skitter.ts';

export type SwarmLook = 'dash' | 'latch';

/** A swarm body's canvas and shape: the swarmling's, or the Champion's a size up. */
export interface SwarmShape {
  readonly w: number;
  readonly h: number;
  /** Body radii while dashing. */
  readonly rx: number;
  readonly ry: number;
}

export const SWARMLING: SwarmShape = { w: 10, h: 9, rx: 4.2, ry: 3 };

/**
 * One swarm frame: the body, its legs, its tuft, and its face (SE) or back (NE). The body's
 * centre and top are returned so the Champion can tie its headband on.
 */
export function swarmFrame(
  s: SwarmShape,
  facing: 'se' | 'ne',
  step: 0 | 1,
  look: SwarmLook,
): { readonly rows: string[]; readonly cx: number; readonly top: number } {
  const latch = look === 'latch';
  const rx = latch ? s.rx + 0.6 : s.rx + (step === 1 ? 0.3 : 0);
  const ry = latch ? s.ry - 0.6 + (step === 1 ? 0.3 : 0) : s.ry - (step === 1 ? 0.2 : 0);
  const cx = s.w / 2;
  const cy = s.h - 2.2 - ry + (latch ? 1 : 0);
  const g = skitterBody({ w: s.w, h: s.h, cx, cy, rx, ry, facing, belly: 0.3 });
  const top = Math.round(cy - ry);
  const x0 = Math.round(cx - rx);
  const x1 = Math.round(cx + rx) - 1;
  const fy = Math.round(cy) - 1;
  // The legs: a dash's blur under it, or splayed out to both sides gripping its hold.
  const legRow = s.h - 1;
  const dash = step === 0 ? ['1.1..1.1', '.0...0..'] : ['.1.1.1..', '0.0..0.0'];
  const n = x1 - x0 + 3; // the splay spans the body and a pixel past each side
  const ends = (a: string, b: string): string => a + '.'.repeat(n - a.length - b.length) + b;
  const splay =
    step === 0 ? [ends('0', '0'), ends('.1', '1.')] : [ends('.0', '0.'), ends('1', '1')];
  const legs: [number, number, readonly string[]] = latch
    ? [x0 - 1, Math.round(cy), splay]
    : [x0, legRow - 1, dash];
  // The tuft, swept back by the dash (behind it: left facing SE, right facing NE).
  const back = facing === 'se' ? x0 + 1 : x1 - 2;
  const tuft: readonly string[] = facing === 'se' ? ['dc.', '.cb'] : ['.cd', 'bc.'];
  const stamps: [number, number, readonly string[]][] = [legs, [back, top - 1, tuft]];
  if (facing === 'se') {
    // Two big eyes under a low, determined brow (the brow a dark pixel over each eye's inner edge);
    // latched, the eyes squeeze shut and the jaws close in.
    const ex = Math.round(cx);
    stamps.push(
      latch
        ? [ex - 1, fy + 1, step === 0 ? ['k..k', '.kk.'] : ['k..k', '.kw.']]
        : [ex - 1, fy - 1, ['.k.k', 'wkwk', 'kkkk']],
    );
  } else {
    // From behind: the back's shimmer spots.
    stamps.push([Math.round(cx) - 1, fy, ['+.+', '.*.']]);
  }
  return { rows: finish(g, stamps), cx, top };
}

export const allySwarmling = defineSprite({
  id: 'ally.swarmling',
  size: { w: SWARMLING.w, h: SWARMLING.h },
  anchor: { x: SWARMLING.w / 2, y: SWARMLING.h - 1 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    walk_se_0: swarmFrame(SWARMLING, 'se', 0, 'dash').rows,
    walk_se_1: swarmFrame(SWARMLING, 'se', 1, 'dash').rows,
    walk_ne_0: swarmFrame(SWARMLING, 'ne', 0, 'dash').rows,
    walk_ne_1: swarmFrame(SWARMLING, 'ne', 1, 'dash').rows,
    latch_se_0: swarmFrame(SWARMLING, 'se', 0, 'latch').rows,
    latch_se_1: swarmFrame(SWARMLING, 'se', 1, 'latch').rows,
    latch_ne_0: swarmFrame(SWARMLING, 'ne', 0, 'latch').rows,
    latch_ne_1: swarmFrame(SWARMLING, 'ne', 1, 'latch').rows,
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 12 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 12 },
    walk_nw: { mirrorOf: 'walk_ne' },
    latch_se: { frames: ['latch_se_0', 'latch_se_1'], fps: 10 },
    latch_sw: { mirrorOf: 'latch_se' },
    latch_ne: { frames: ['latch_ne_0', 'latch_ne_1'], fps: 10 },
    latch_nw: { mirrorOf: 'latch_ne' },
  },
});
