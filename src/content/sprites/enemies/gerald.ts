// Gerald the mail drone (`gerald`; design/core-loop.md § 2.7, act1.md § A1M3): a neutral Everglow
// unit, the same drone as his speaker icon (portraits/gerald.ts). A rotor on a mast, a round white
// Everglow capsule with a teal visor and a chime lamp on his crown, and an orange mail satchel
// slung at his side with a letter (blue stamp) peeking out, bumping as he flies. A soft teal
// thruster puff under him. Clean Everglow white and teal, so he never reads as a pest; render
// lifts him 12 px over a ground shadow like any flyer.
import { defineSprite } from '../defineSprite.ts';
import { disc, line, plot, rows, stamp, grid, type CharGrid } from '../helpers.ts';

const W = 20;
const H = 17;
const CX = 10;

function gerald(facing: 'se' | 'ne', blade: 0 | 1): string[] {
  const g: CharGrid = grid(W, H);
  const bob = blade; // the satchel swings one pixel with the rotor beat
  // The rotor: a long blade, then a short blurred one with the hub showing.
  if (blade === 0) line(g, 2, 0, 17, 0, '3');
  else {
    line(g, 6, 0, 13, 0, '2');
    plot(g, 4, 0, '1');
    plot(g, 15, 0, '1');
  }
  plot(g, 9, 1, '1');
  plot(g, 10, 1, '0');
  plot(g, 9, 2, '2');
  plot(g, 10, 2, '1');
  // The capsule: white paint lit from the upper left.
  const cy = 8.5;
  disc(g, CX, cy, 5.6, (d, x, y) => {
    if (d > 4.7) return x + y < 15 ? '3' : '1';
    return x + y < 13 ? '4' : x + y < 17 ? '3' : '2';
  });
  // The chime lamp on his crown.
  plot(g, 9, 3, '7');
  plot(g, 10, 3, '8');
  if (facing === 'se') {
    // The visor: a teal band across his front, glinting.
    stamp(g, 9, 6, ['888899', '777888']);
    plot(g, 12, 6, 'w');
    // An Everglow chevron under the visor.
    stamp(g, 11, 9, ['8.8', '.8.']);
  } else {
    // From behind: a hatch with a vent, and the back of the visor band.
    stamp(g, 7, 7, ['1111', '1221', '1111']);
    plot(g, 13, 6, '7');
    plot(g, 14, 6, '7');
  }
  // The satchel strap across the capsule, then the satchel on his near side, a letter in it.
  line(g, facing === 'se' ? 14 : 13, 4, 6, 11, 'c');
  // prettier-ignore
  stamp(g, 1, 10 + bob, [
    '..WWU..',
    '.eWWUe.',
    'eeeeeed',
    'ddddddc',
    'dddddcc',
    '.ccccc.',
  ]);
  // The thruster puff.
  plot(g, CX - 1, 14, '+');
  plot(g, CX, 14, '+');
  plot(g, CX - 1, 15, blade === 0 ? '*' : '+');
  plot(g, CX, 15, blade === 0 ? '+' : '*');
  return rows(g);
}

export const enemyGerald = defineSprite({
  id: 'enemy.gerald',
  size: { w: W, h: H },
  anchor: { x: CX, y: H - 1 },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { W: 'white.0', U: 'blue.3' },
  frames: {
    walk_se_0: gerald('se', 0),
    walk_se_1: gerald('se', 1),
    walk_ne_0: gerald('ne', 0),
    walk_ne_1: gerald('ne', 1),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 12 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 12 },
    walk_nw: { mirrorOf: 'walk_ne' },
  },
});
