// Expediter (`expediter`, design/enemies.md § 5.3): Everglow Security's pacer (Act III), whose
// haste aura hurries every unit of its faction within 2 tiles (+30% speed). Everglow's shape
// language (art-direction §4): a tall white courier unit balanced on one big wheel, leaning into
// its hurry, a stopwatch dial on its chest (a white face, an orange hand), a teal visor, and on its
// back a **metronome**: a steel mast with an orange pendulum swinging side to side as it rolls, so
// the thing that sets everyone's pace reads at a glance (the `haste_aura` tell, art-direction §8;
// render adds its orange ring and speed lines). Armored: a steel plate over the wheel. Tall and
// thin where the Compliance Drone is squat and boxy, and on a wheel, not legs or a rotor.
// - `walk_<facing>` (4 frames, 8 fps): the wheel's spokes turn, the pendulum swings left, up,
//   right, up.
// No death frames: Everglow Security shuts down (render's `shutdown`).
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 14;
const H = 20;
const AX = 7;
const AY = 19;

/** The pendulum's swing by step: its bob's x offset from the mast (px). */
const SWING = [-3, 0, 3, 0] as const;

function expediter(facing: 'se' | 'ne', step: 0 | 1 | 2 | 3): string[] {
  const g: CharGrid = grid(W, H);
  const se = facing === 'se';
  // The metronome on its back, behind the body: a steel mast, the pendulum swinging off it,
  // its orange arm and bright bob over the shoulder.
  const mx = se ? 3 : 10;
  line(g, mx, 1, mx, 9, '2');
  plot(g, mx, 0, '*');
  const bx = mx + (SWING[step] ?? 0);
  line(g, mx, 8, bx, 3, 'd');
  plot(g, bx, 2, 'e');
  plot(g, bx, 3, 'e');
  // The wheel: a dark tyre, a lit steel rim, spokes turning (two looks), a white hub.
  disc(g, 7, 15.5, 3.8, (d) => (d > 2.9 ? '0' : d > 2.1 ? '3' : '2'));
  const spokes =
    step % 2 === 0
      ? [
          [7, 14],
          [7, 17],
          [6, 15],
          [8, 15],
        ]
      : [
          [6, 14],
          [8, 14],
          [6, 17],
          [8, 17],
        ];
  for (const [x, y] of spokes) plot(g, x ?? 0, y ?? 0, '1');
  plot(g, 7, 15, 'w');
  plot(g, 7, 16, '3');
  // The armor plate over the wheel (Armored): a steel mudguard with orange safety ends.
  line(g, 4, 11, 10, 11, '2');
  plot(g, 3, 12, 'c');
  plot(g, 11, 12, 'c');
  // The body: a tall white capsule, its head a pixel ahead of its waist (leaning into its hurry).
  const lean = (y: number): number => (y < 6 ? (se ? 1 : -1) : 0);
  for (let y = 1; y <= 10; y++) {
    for (let x = 4; x <= 10; x++) {
      const rounded = (y === 1 || y === 10) && (x === 4 || x === 10);
      if (rounded) continue;
      const ch = x <= 6 ? '4' : x <= 8 ? '3' : '2';
      plot(g, x + lean(y), y, y === 10 ? '2' : ch);
    }
  }
  if (se) {
    // The teal visor across its head, a glint riding it.
    line(g, 6 + lean(2), 2, 10 + lean(2), 2, '7');
    line(g, 6 + lean(3), 3, 10 + lean(3), 3, '6');
    plot(g, 9 + lean(2) - (step % 2), 2, '*');
    // The stopwatch on its chest: an ink rim, a white face, an orange hand ticking round.
    stamp(g, 5, 5, ['.xxx.', 'xwwwx', 'xwwwx', 'xwwwx', '.xxx.']);
    const hand = (
      [
        [7, 6],
        [8, 7],
        [7, 8],
        [6, 7],
      ] as const
    )[step];
    plot(g, hand[0], hand[1], 'd');
    plot(g, 7, 7, 'c');
    stamp(g, 9, 4, ['c', 'c']); // the winder
  } else {
    // From behind: the visor's back band, a vent, the chevron.
    line(g, 4 + lean(2), 2, 7 + lean(2), 2, '6');
    stamp(g, 5, 5, ['1111', '2222', '1111']);
    stamp(g, 6, 8, ['8.8', '.8.']);
  }
  return rows(g);
}

export const enemyExpediter = defineSprite({
  id: 'enemy.expediter',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    walk_se_0: expediter('se', 0),
    walk_se_1: expediter('se', 1),
    walk_se_2: expediter('se', 2),
    walk_se_3: expediter('se', 3),
    walk_ne_0: expediter('ne', 0),
    walk_ne_1: expediter('ne', 1),
    walk_ne_2: expediter('ne', 2),
    walk_ne_3: expediter('ne', 3),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2', 'walk_se_3'], fps: 8 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2', 'walk_ne_3'], fps: 8 },
    walk_nw: { mirrorOf: 'walk_ne' },
  },
});
