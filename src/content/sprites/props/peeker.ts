// The Peeker (`prop.peeker`; design/core-loop.md § 6.9, art-direction §6): a youngling hiding
// behind a rock near a warren mouth on every Act I map. It is the same youngling as
// `enemy.youngling` (the docs' "uses the same sprite"), drawn behind a clay boulder like
// `prop.rock`'s, so the rock tints with the act (its env palette variants) while the little one
// keeps its own Skitterkin colors (custom legend entries).
//
// Frames: `hidden` (only the tip of its sprout shows over the rock, a hint for the curious),
// `peek_0` (its head and big eyes up over the rock's shoulder), `peek_1` (the same with a blink),
// and `duck` (squashed down fast, the sprout quivering). Anims: `peek` (it looks about, blinking,
// 4 fps), and `duck` (a poke: duck, then hidden; plays once). The view and the click are T309.
// Each map's own cover comes as further frames, `<cover>_<frame>` (`peekerFrame`): the `planter`
// by A1M4's fountain. A1M3's fallen mailbox is a decor prop of its own (`prop.mailbox`) in front
// of the rock, and A1M5's warren-track rock is the default.
import { defineSprite } from '../defineSprite.ts';
import { fromRows, grid, plot, recolor, rows, stamp, type CharGrid } from '../helpers.ts';
import { youngling } from '../enemies/youngling.ts';
import { ENV_VARIANTS } from '../tiles/tileGen.ts';

const W = 20;
const H = 16;

/** The youngling's Skitterkin slots as custom legend chars, so the env palette doesn't recolor it. */
const CRITTER: Readonly<Record<string, string>> = {
  '0': 'K',
  '1': 'K',
  '2': 'L',
  '3': 'M',
  '4': 'N',
  '7': 'G',
  '8': 'G',
  '9': 'H',
  b: 'V',
  c: 'V',
  d: 'V',
  k: 'Q',
  w: 'W',
  '+': 'H',
  '*': 'H',
  P: 'P',
};

// prettier-ignore
const ROCK = [
  '......ddc...........',
  '....cddeddc.........',
  '...cdddddccb........',
  '..ccddddccbbb.dd....',
  '.bccccccbbba.ddec...',
  'bbccccccbbbacdddcb..',
  'abbbbbbbbaabcccccb..',
  '.aabbbbbaaaabbbbba..',
  '___aaaaaa___aaaa___.',
  '.________..______...',
];

// A1M4's planter by the fountain (act1.md § A1M4: "The Peeker's rock is a planter"): a clay
// trough of shrubs and pink blooms, in the same footprint as the rock.
// prettier-ignore
const PLANTER = [
  '..3.4....3.....4....',
  '.343+3..343..3+43...',
  '2334433234432334332.',
  'eddddddddddddddddddc',
  'dcccccccccccccccccbb',
  'cbcbcccbcccbcccbccba',
  'cccccccccccccccccbba',
  'bbbbbbbbbbbbbbbbbaa.',
  '_aaaaaaaaaaaaaaaaa__',
  '.__________________.',
];

/** Each map's cover for the Peeker: the default rock, or a map's own (act1.md per map). */
const COVERS = { rock: ROCK, planter: PLANTER } as const;
export type PeekerCover = keyof typeof COVERS;

/**
 * The frame or anim name for `name` (`hidden`, `peek_0`, `peek`, `duck`, …) behind `cover`: the
 * rock's are unprefixed, another cover's are `<cover>_<name>`.
 */
export function peekerFrame(cover: PeekerCover, name: string): string {
  return cover === 'rock' ? name : `${cover}_${name}`;
}

type Pose = 'hidden' | 'peek' | 'blink' | 'duck';

function peeker(pose: Pose, cover: PeekerCover = 'rock'): string[] {
  const g: CharGrid = grid(W, H);
  const critter = recolor(youngling('se', 0), CRITTER);
  if (pose === 'hidden') {
    // Only the tip of the sprout shows over the rock.
    stamp(g, 6, 6, critter.slice(0, 2));
  } else if (pose === 'duck') {
    // Squashed: the top half of the body only, pressed flat, sprout up in alarm.
    stamp(g, 6, 5, critter.slice(1, 5));
    stamp(g, 10, 3, ['V', 'V']);
  } else {
    stamp(g, 6, 1, critter);
    if (pose === 'blink') stamp(g, 11, 4, ['MM.MM', 'QQ.QQ', 'MM.MM']);
  }
  // A hand-placed outline around the little one, so it reads apart from the rock in front of it
  // (both are warm), then the rock over its lower half.
  const body = g.map((r) => [...r]);
  body.forEach((r, y) =>
    r.forEach((ch, x) => {
      if (ch !== '.') return;
      const near = [body[y - 1]?.[x], body[y + 1]?.[x], r[x - 1], r[x + 1]];
      if (near.some((n) => n !== undefined && n !== '.')) plot(g, x, y, 'x');
    }),
  );
  const front = COVERS[cover];
  fromRows(front).forEach((r, y) =>
    r.forEach((ch, x) => ch !== '.' && stamp(g, x, H - front.length + y, [ch])),
  );
  // The shrubs would bury the sprout's tip: it pokes up through them, the hint for the curious.
  if (pose === 'hidden' && cover !== 'rock') stamp(g, 6, 5, critter.slice(0, 2));
  return rows(g);
}

export const propPeeker = defineSprite({
  id: 'prop.peeker',
  size: { w: W, h: H },
  anchor: { x: 10, y: H - 2 },
  palette: 'act1',
  variants: ENV_VARIANTS,
  outline: 'auto',
  // The youngling: coral body, butter belly, moss sprout, ink eyes, a white glint, the shimmer.
  legend: {
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
  },
  frames: {
    hidden: peeker('hidden'),
    peek_0: peeker('peek'),
    peek_1: peeker('blink'),
    duck: peeker('duck'),
    planter_hidden: peeker('hidden', 'planter'),
    planter_peek_0: peeker('peek', 'planter'),
    planter_peek_1: peeker('blink', 'planter'),
    planter_duck: peeker('duck', 'planter'),
  },
  anims: {
    peek: { frames: ['peek_0', 'peek_0', 'peek_0', 'peek_1'], fps: 4 },
    duck: { frames: ['duck', 'hidden'], fps: 8, loop: false },
    planter_peek: {
      frames: ['planter_peek_0', 'planter_peek_0', 'planter_peek_0', 'planter_peek_1'],
      fps: 4,
    },
    planter_duck: { frames: ['planter_duck', 'planter_hidden'], fps: 8, loop: false },
  },
});
