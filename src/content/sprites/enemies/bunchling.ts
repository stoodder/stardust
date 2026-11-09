// Bunchling (`bunchling`, design/enemies.md § 5.1): a packed Skitterkin that splits into three
// Nibblers when it dies. It is drawn as exactly that: three Nibbler-round lobes squeezed into one
// skin, each with its own tuft and its own pair of eyes, so the split is already promised by the
// silhouette. Where the lobes press together the skin stretches pink (`pink.3`, the `splitter`
// tell's body cue: "a packed sprite with bulges", art-direction §8). It waddles with the lobes
// jiggling out of step.
import { defineSprite } from '../defineSprite.ts';
import { DEATH_ANIM, deathFrames } from './death.ts';
import { at, fromRows, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { EYE, skitterBody } from './skitter.ts';

const W = 20;
const H = 16;

interface Lobe {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

/** Overlays one lobe's shaded body on `g`, returning which pixels it covered. */
function lobe(g: CharGrid, l: Lobe, facing: 'se' | 'ne', belly: number): Set<string> {
  const body = skitterBody({ w: W, h: H, ...l, facing, belly });
  const covered = new Set<string>();
  body.forEach((r, y) =>
    r.forEach((ch, x) => {
      if (ch === '.') return;
      plot(g, x, y, ch);
      covered.add(`${x},${y}`);
    }),
  );
  return covered;
}

function bunchling(facing: 'se' | 'ne', step: 0 | 1): string[] {
  const g: CharGrid = fromRows(Array.from({ length: H }, () => '.'.repeat(W)));
  // The lobes jiggle out of step: the left one bobs on step 1, the right on step 0.
  const left: Lobe = { cx: 6, cy: 6.5 - step, rx: 4.6, ry: 4.2 };
  const right: Lobe = { cx: 14, cy: 6 - (1 - step), rx: 4.4, ry: 4 };
  const front: Lobe = { cx: 10, cy: 10, rx: 6.2, ry: 4.8 };
  const back = [left, right];
  const backCover = back.map((l) => lobe(g, l, facing, 0));
  const frontCover = lobe(g, front, facing, 0.4);
  // Stretched skin: the front lobe's pixels that press against a back lobe (one above them is
  // back-lobe skin) go pink, and so does a bulge seam down the middle of the back pair.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!frontCover.has(`${x},${y}`)) continue;
      const above = `${x},${y - 1}`;
      if (!frontCover.has(above) && backCover.some((c) => c.has(above))) plot(g, x, y, 'P');
    }
  }
  for (let y = 2; y < 8; y++) {
    const x = 10;
    if (backCover[0]?.has(`${x - 1},${y}`) && backCover[1]?.has(`${x},${y}`)) {
      if (at(g, x, y) !== '.' && !frontCover.has(`${x},${y}`)) plot(g, x, y, y % 2 ? 'P' : 'Q');
    }
  }
  // Legs under the front lobe, stepping.
  const legs = step === 0 ? ['.1.1....1.1.', '.0.0....0.0.'] : ['1..1...1..1.', '0..0...0..0.'];
  stamp(g, 4, H - 2, legs);
  // Tufts on all three lobes.
  stamp(g, Math.round(left.cx) - 2, Math.round(left.cy - left.ry) - 1, ['.dc', 'cb.']);
  stamp(g, Math.round(right.cx) - 1, Math.round(right.cy - right.ry) - 1, ['dc.', '.bc']);
  if (facing === 'se') {
    // The front lobe's big face, and a smaller, squashed pair of eyes on each back lobe.
    stamp(g, 11, 8, EYE);
    stamp(g, 14, 8, EYE);
    plot(g, 13, 11, 'k');
    stamp(g, Math.round(left.cx), Math.round(left.cy) - 2, ['k.k']);
    stamp(g, Math.round(right.cx) + 1, Math.round(right.cy) - 2, ['k.k']);
    plot(g, 6, 10, '+');
  } else {
    // From behind: the shimmer on each lobe's back.
    stamp(g, 8, 9, ['+.+', '.*.']);
    plot(g, Math.round(left.cx) - 1, Math.round(left.cy), '+');
    plot(g, Math.round(right.cx), Math.round(right.cy), '+');
  }
  return rows(g);
}

export const enemyBunchling = defineSprite({
  id: 'enemy.bunchling',
  size: { w: W, h: H },
  anchor: { x: 10, y: H - 1 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { P: 'pink.3', Q: 'pink.2' },
  frames: {
    walk_se_0: bunchling('se', 0),
    walk_se_1: bunchling('se', 1),
    walk_ne_0: bunchling('ne', 0),
    walk_ne_1: bunchling('ne', 1),
    ...deathFrames(bunchling('se', 0), { x: 10, y: H - 1 }),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 6 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 6 },
    walk_nw: { mirrorOf: 'walk_ne' },
    death: DEATH_ANIM,
  },
});
