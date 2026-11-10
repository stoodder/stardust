// Pebble walking with the refugees (`ally.pebble`; story/characters.md § Pebble, design/maps.md
// § 5.2): she rides with the refugee groups on escort maps (story-only, never a loss condition),
// walking in the middle of a group. The youngling the player lifted off the Peeker's rock (the same
// small round body, eyes too big for it, and the Peeker's green two-leaf seedling, so the player
// knows her), wearing Bricks's Everglow bottle cap from A2M4 on, as her portrait does (art-
// direction §5 `cap`): a crown cork seen a little from above, its white top ringed in teal and its
// crimped steel skirt sitting down in her fuzz, the seedling growing up through the hole punched in
// its middle. The cap's white is the brightest thing in a group, so she can be found at 1×. She
// toddles to keep up: a hop, a wobble, a hop (2 frames, 8 fps). The cap's colours are custom
// legend, so they hold in the `skitterkin.ally` palette render draws her in (RefugeeView).
import { defineSprite } from '../defineSprite.ts';
import { finish, skitterBody } from '../enemies/skitter.ts';

const W = 11;
const H = 13;

/**
 * The seedling: two leaves (`green.4` tips over `green.3`) on a `green.2` stem, lifted through the
 * cap. Custom legend, so it stays the Peeker's green in the allies' palette (whose accent is teal).
 */
const SPROUT = ['NM.MN', '.MLM.', '..L..'] as const;

/** Bricks's bottle cap: the white top ringed in teal, the stem through its hole, crimped below. */
// prettier-ignore
const CAP = [
  '.QCLCQ.',
  'QCCCCCQ',
  '.SRSRS.',
] as const;

function pebble(facing: 'se' | 'ne', step: 0 | 1): string[] {
  const up = step === 1 ? 1 : 0;
  const g = skitterBody({
    w: W,
    h: H,
    cx: 5.5,
    cy: 8 - up * 0.5,
    rx: step === 1 ? 4.2 : 4.6,
    ry: step === 1 ? 3.9 : 3.5,
    facing,
    belly: 0.35,
  });
  const legs = step === 0 ? ['.1.1.1.1.', '.0.0.0.0.'] : ['..1...1..', '.0.0.0.0.'];
  const top = 3 - up;
  const head: [number, number, readonly string[]][] = [
    [3, top - 3, SPROUT],
    [2, top, CAP],
  ];
  if (facing === 'se') {
    return finish(g, [
      [1, H - 2, legs],
      ...head,
      // Her eyes, the youngling's, too big for her, and the blush.
      [5, top + 4, ['wk', 'kk', 'kk']],
      [8, top + 4, ['wk', 'kk', 'kk']],
      [2, top + 4, ['P', '+']],
    ]);
  }
  return finish(g, [[1, H - 2, legs], [3, top + 4, ['P*P', '.+.']], ...head]);
}

export const allyPebble = defineSprite({
  id: 'ally.pebble',
  size: { w: W, h: H },
  anchor: { x: 5, y: H - 1 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: {
    P: 'pink.3',
    C: 'white.1',
    Q: 'teal.3',
    S: 'steel.4',
    R: 'steel.2',
    L: 'green.2',
    M: 'green.3',
    N: 'green.4',
  },
  frames: {
    walk_se_0: pebble('se', 0),
    walk_se_1: pebble('se', 1),
    walk_ne_0: pebble('ne', 0),
    walk_ne_1: pebble('ne', 1),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 8 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 8 },
    walk_nw: { mirrorOf: 'walk_ne' },
  },
});
