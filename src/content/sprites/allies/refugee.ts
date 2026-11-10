// The refugees on an Escort (`ally.refugee`, design/maps.md § 5.2; A2M5 *The Long Walk*): the
// Skitterkin walking home, in the `skitterkin.ally` palette (its moss turned teal, the alliance's
// nod, art-direction §4) as maps.md says. The same round, big-eyed Skitterkin body the player shot
// at in Act I (story/bible.md: the pests were refugees all along), now carrying what it could:
// - `walk_<facing>` (2 frames, 6 fps): a bundle of belongings on its back, a burlap sack tied off
//   with its tuft-coloured cord (teal in the allies' palette), the body bobbing under the weight.
// - `carry_<facing>`: a parent with a little one riding on its back, one huge eye peeking over
//   (the young carry no seedling: that's Pebble's, D097).
// They walk slower than any runner and never bolt: no hop, no sweat, a steady, tired bob. Render
// (RefugeeView) draws `walk`; T530a may mix in `carry` for variety. Pebble walks among them in her
// own sprite (allies/pebble.ts).
import { defineSprite } from '../defineSprite.ts';
import { BIG_EYE, finish, skitterBody } from '../enemies/skitter.ts';

const W = 16;
const H = 14;
/** The ground point (under the body, which sits right of centre: the load rides behind it). */
const AX = 9;
const AY = 13;

type Look = 'bundle' | 'carry';

/** Burlap and its tie, and the rider's colours (custom legend, so they hold in both palettes). */
const LEGEND = {
  G: 'brass.4',
  H: 'brass.3',
  J: 'grime.4',
} as const;

/** The bundle on its back: a burlap sack, lit at the top left, tied off with a cord knot. */
// prettier-ignore
const BUNDLE = [
  '..cc..',
  '.GcGH.',
  'GGGGHJ',
  'GGGHHJ',
  'GGHHJJ',
  '.HHJJ.',
] as const;

function refugee(facing: 'se' | 'ne', step: 0 | 1, look: Look): string[] {
  const down = step === 1 ? 1 : 0; // the bob: it sinks under its load on the second step
  const g = skitterBody({
    w: W,
    h: H,
    cx: 9,
    cy: 8 + down * 0.5,
    rx: 5.6,
    ry: step === 1 ? 4.1 : 4.4,
    facing,
    belly: 0.4,
  });
  const legs = step === 0 ? ['..1.1...1.1.', '..0.0...0.0.'] : ['...1.1.1.1..', '..0..0..0..0'];
  const back = facing === 'se' ? 2 : 8;
  const load: [number, number, readonly string[]][] =
    look === 'bundle'
      ? [[back, 1 + down, BUNDLE]]
      : [
          // The little one: a small round body on its back, one big eye over the parent's crown.
          [back, 3 + down, ['.444.', '44433', '43332', '.332.']],
          [back + 1, 2 + down, facing === 'se' ? ['.c'] : ['c.']],
          ...(facing === 'se'
            ? ([[back + 3, 3 + down, ['wk', 'kk']]] as [number, number, readonly string[]][])
            : []),
        ];
  if (facing === 'se') {
    return finish(g, [
      [1, H - 2, legs],
      ...load,
      // Its tuft, and its eyes: big, tired, and looking ahead.
      [9, 3 + down, ['.c', 'cb']],
      [10, 6 + down, BIG_EYE],
      [13, 6 + down, BIG_EYE],
      [12, 10 + down, ['k']],
    ]);
  }
  return finish(g, [
    [1, H - 2, legs],
    [10, 3 + down, ['c.', 'bc']],
    // The shimmer along the back, under the load.
    [11, 7 + down, ['+', '*']],
    ...load,
  ]);
}

/** One look's frames, in both authored facings. */
function looks(look: Look, prefix: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const f of ['se', 'ne'] as const) {
    for (const s of [0, 1] as const) out[`${prefix}_${f}_${s}`] = refugee(f, s, look);
  }
  return out;
}

export const allyRefugee = defineSprite({
  id: 'ally.refugee',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: LEGEND,
  frames: { ...looks('bundle', 'walk'), ...looks('carry', 'carry') },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 6 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 6 },
    walk_nw: { mirrorOf: 'walk_ne' },
    carry_se: { frames: ['carry_se_0', 'carry_se_1'], fps: 6 },
    carry_sw: { mirrorOf: 'carry_se' },
    carry_ne: { frames: ['carry_ne_0', 'carry_ne_1'], fps: 6 },
    carry_nw: { mirrorOf: 'carry_ne' },
  },
});
