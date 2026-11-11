// Maintenance Associate (`associate`, design/enemies.md § 5.3): Everglow Security's healer (Act
// III), mending the faction's machines within 1.5 tiles. Everglow's shape language (art-direction
// §4) as a friendly utility cart: a low, wide white dome on three little wheels, an orange hazard
// band round its skirt, a green ✚ service lamp on its crown (the `healer` tell's plus, §8, in the
// heal ring's `green.3`), a teal visor slit, and two jointed arms busy at the front: a steel wrench
// and a welding torch whose teal spark flickers. Low and wide where the Compliance Drone is a box on
// legs, the Auditor a box on treads, and the Expediter tall on one wheel.
// - `walk_<facing>` (4 frames, 8 fps): the wheels turn, the wrench ratchets, the spark flickers.
// No death frames: Everglow Security shuts down (render's `shutdown`).
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 17;
const H = 14;
const AX = 8;
const AY = 13;

function associate(facing: 'se' | 'ne', step: 0 | 1 | 2 | 3): string[] {
  const g: CharGrid = grid(W, H);
  const se = facing === 'se';
  const bob = step % 2;
  // Three little wheels: dark tyres, a lit hub that turns (on the step).
  for (const wx of [3, 8, 13]) {
    disc(g, wx, 11.5, 1.9, (d) => (d > 1.2 ? '0' : '2'));
    plot(g, wx + (step % 2 === 0 ? -1 : 0), 11, '3');
  }
  // The dome: white paint lit from the upper left over a steel skirt.
  const top = 3 + (bob === 1 ? 1 : 0);
  for (let y = top; y <= 10; y++) {
    for (let x = 1; x < 16; x++) {
      const dx = (x + 0.5 - 8.5) / 7.5;
      const dy = (y + 0.5 - 10) / (10 - top + 0.5);
      if (dx * dx + dy * dy > 1 && y < 9) continue;
      const lit = dx + dy < -0.9 ? '4' : dx < 0.35 ? '3' : '2';
      plot(g, x, y, y >= 9 ? '1' : lit);
    }
  }
  // The hazard band round its skirt.
  for (let x = 2; x < 15; x++) plot(g, x, 8, (x + step) % 4 < 2 ? 'c' : 'x');
  // The ✚ service lamp on its crown, its arms lit `green.4` on the beat.
  const lamp = step === 0 || step === 2 ? 'H' : 'G';
  stamp(g, 7, top - 3, ['.G.', `G${lamp}G`, '.G.']);
  plot(g, 8, top, '1');
  if (se) {
    // A teal visor slit on its front, a glint riding it; the logo chevron on its flank.
    line(g, 9, top + 3, 13, top + 3, '7');
    plot(g, 10 + (step % 2), top + 3, 'w');
    stamp(g, 3, top + 3, ['8.8', '.8.']);
    // The arms at the front: the wrench (its jaw ratcheting) and the torch with its teal spark.
    line(g, 13, 7, 15, 5 + bob, '2');
    stamp(g, 15, 3 + bob, step % 2 === 0 ? ['33', '3.'] : ['3.', '33']);
    line(g, 12, 9, 15, 9, '1');
    plot(g, 16, 9, 'c');
    plot(g, 16, 10 - (step === 1 ? 1 : 0), step === 3 ? '+' : '*');
  } else {
    // From behind: a vent, a status lamp, the chevron; the arms busy out of sight beyond it.
    stamp(g, 5, top + 3, ['000', '111']);
    plot(g, 10, top + 3, '+');
    stamp(g, 11, top + 4, ['8.8', '.8.']);
    line(g, 2, 7, 0, 5 + bob, '2');
    plot(g, 0, 4 + bob, '3');
  }
  return rows(g);
}

export const enemyAssociate = defineSprite({
  id: 'enemy.associate',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { G: 'green.3', H: 'green.4' },
  frames: {
    walk_se_0: associate('se', 0),
    walk_se_1: associate('se', 1),
    walk_se_2: associate('se', 2),
    walk_se_3: associate('se', 3),
    walk_ne_0: associate('ne', 0),
    walk_ne_1: associate('ne', 1),
    walk_ne_2: associate('ne', 2),
    walk_ne_3: associate('ne', 3),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2', 'walk_se_3'], fps: 8 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2', 'walk_ne_3'], fps: 8 },
    walk_nw: { mirrorOf: 'walk_ne' },
  },
});
