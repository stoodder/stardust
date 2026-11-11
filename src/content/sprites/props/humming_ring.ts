// The humming ring (`prop.humming_ring`; A3M4 decor under `door_choice = warren`, act3.md § A3M4,
// marker `humming_ring`, gated by `markerWhen`): the warren took shelter with you, and by the hall
// door a ring of Skitterkin sit and hum, as they sang for Bricks at the Gap. Seven of them in an iso
// ring round a gift stone glowing sung gold: three grown ones and four little ones, the near side
// seen from behind, the far side facing us with their eyes closed and their mouths round, a gold
// note rising over the ring. Frames `hum_0`–`hum_2` (anim `hum`, 2 fps): they sway in turn and the
// notes climb. In the Skitterkin palette, so it keeps its colours in every act; its emissives (the
// stone, the notes, the shimmer on the little ones' backs) bake a gold glow.
import { defineSprite } from '../defineSprite.ts';
import { youngling } from '../enemies/youngling.ts';
import { grid, mirrorRows, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { skitterBody } from '../enemies/skitter.ts';

const W = 54;
const H = 32;
/** The ring's centre on the ground (the anchor). */
const AX = 27;
const AY = 19;

/** A grown Skitterkin, humming: eyes shut, mouth round (facing us), or its back (facing away). */
function grown(front: boolean): string[] {
  const g = skitterBody({
    w: 13,
    h: 11,
    cx: 6.5,
    cy: 6,
    rx: 6,
    ry: 4.6,
    facing: front ? 'se' : 'ne',
    belly: 0.3,
  });
  if (front) {
    stamp(g, 3, 4, ['kk..kk']);
    stamp(g, 5, 6, ['.k.', 'k.k', '.k.']);
    stamp(g, 1, 6, ['P']);
  } else {
    // Its back: the moss tuft and the faint shimmer.
    stamp(g, 5, 1, ['cdc', '.c.']);
    stamp(g, 4, 4, ['+.*']);
  }
  return g.map((r) => r.join(''));
}

/** A little one, humming along: the youngling with its eyes shut, or its back. */
function little(front: boolean): string[] {
  const src = youngling(front ? 'se' : 'ne', 0);
  if (!front) return [...src];
  const g = src.map((r) => r.split(''));
  // Shut the big eyes into lines, and round the mouth between them.
  for (const x of [5, 6, 8, 9]) {
    for (let y = 3; y <= 5; y++) if ((g[y]?.[x] ?? '.') === 'k' || g[y]?.[x] === 'w') plot(g, x, y, '3');
    plot(g, x, 4, 'k');
  }
  plot(g, 7, 6, 'k');
  return g.map((r) => r.join(''));
}

/** Who sits where (top-left of each sprite), back row first, and whether they face us. */
const SEATS: readonly (readonly [number, number, 'grown' | 'little', boolean, boolean])[] = [
  // x, y, kind, faces us, mirrored
  [7, 3, 'grown', true, false],
  [22, 0, 'little', true, false],
  [34, 3, 'grown', true, true],
  [1, 12, 'little', false, false],
  [42, 12, 'little', false, true],
  [11, 17, 'grown', false, false],
  [32, 19, 'little', false, true],
];

function ring(k: 0 | 1 | 2): string[] {
  const g: CharGrid = grid(W, H);
  // Their shadow on the floor: the ring's ellipse, dithered.
  for (let y = AY - 8; y <= AY + 8; y++) {
    for (let x = AX - 24; x <= AX + 24; x++) {
      const d = Math.hypot((x + 0.5 - AX) / 24, (y + 0.5 - AY - 1) / 8);
      if (d <= 1 && (x + y) % 2 === 0) plot(g, x, y, '_');
    }
  }
  // The gift stone in the middle, glowing sung gold with a pink heart.
  stamp(g, AX - 2, AY - 4, ['.**.', '*++*', '+PP+', '.++.']);
  // The ring, back row first; the one whose turn it is sways up a pixel.
  SEATS.forEach(([x, y, kind, front, flip], i) => {
    const src = kind === 'grown' ? grown(front) : little(front);
    const sway = i % 3 === k ? 1 : 0; // seven seats: each frame two or three sway
    stamp(g, x, y - sway, flip ? mirrorRows(src) : src);
  });
  // A note rising over the ring, higher each frame, and a smaller one starting under it.
  stamp(g, AX + 6 - k, 7 - k * 3, ['.*', '.+', '++']);
  if (k > 0) stamp(g, AX - 6, 11 - k * 2, ['+', '*']);
  return rows(g);
}

export const propHummingRing = defineSprite({
  id: 'prop.humming_ring',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'skitterkin',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { P: 'pink.3' },
  frames: { hum_0: ring(0), hum_1: ring(1), hum_2: ring(2) },
  anims: { hum: { frames: ['hum_0', 'hum_1', 'hum_2'], fps: 2 } },
});
