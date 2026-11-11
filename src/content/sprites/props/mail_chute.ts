// Gerald's old mail chute (`prop.mail_chute`; A3M4 decor, act3.md § A3M4, marker `mail_chute`):
// the route older than the perimeter, the one Gerald still flies (the `chute` air lane starts at
// its mouth in the west wall). A squat pneumatic chute coming up out of the floor: a steel tube with
// riveted collars, bent over into a bell mouth facing into the map, its hinged flap hanging open,
// and on its stand a little brass plate with a blue letter stamped on it, polished where a thumb
// rubs it. A dead teal lamp on its crown (nobody has called a delivery in years). `v0`.
// Everglow-owned.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 22;
const H = 28;
const AX = 10;
const AY = 23;

function chute(): string[] {
  const g: CharGrid = grid(W, H);
  isoBox(g, AX, AY + 1, 8, 0, { top: '_', rim: '_', left: '_', right: '_' });
  // The stand: a low steel plinth.
  isoBox(g, AX, AY, 7, 2, { top: '2', rim: '3', left: '1', right: '0' });
  // The tube: up from the stand, lit left, two riveted collars.
  for (let y = 8; y <= AY - 2; y++) {
    for (let x = AX - 3; x <= AX + 2; x++) {
      const col = x - (AX - 3);
      plot(g, x, y, col === 0 ? '3' : col < 3 ? '2' : col < 5 ? '1' : '0');
    }
  }
  for (const y of [12, 18]) {
    line(g, AX - 4, y, AX + 3, y, '3');
    plot(g, AX - 2, y, '4');
    plot(g, AX + 1, y, '1');
  }
  // The bend over into a bell mouth facing into the map (to the right), dark inside.
  disc(g, AX + 1, 7, 4.5, (d, x) => (x < AX - 3 ? '.' : d > 3.3 ? '2' : '1'));
  disc(g, AX + 5, 8, 4, (d) => (d > 2.9 ? '3' : d > 1.8 ? '1' : 'K'));
  // The flap, hanging open from the mouth's top lip.
  line(g, AX + 7, 4, AX + 10, 8, '3');
  line(g, AX + 8, 4, AX + 11, 8, '2');
  // The crown lamp, dead.
  stamp(g, AX - 1, 1, ['78', '66']);
  // The brass plate on the stand, a blue letter stamped on it, its corner rubbed bright.
  stamp(g, AX - 6, AY - 6, ['BBBB', 'BWUB', 'BUUD', 'BBBD']);
  return rows(g);
}

export const propMailChute = defineSprite({
  id: 'prop.mail_chute',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow.worn',
  outline: 'auto',
  legend: { K: 'ink.0', B: 'brass.2', D: 'brass.4', W: 'white.0', U: 'blue.3' },
  frames: { v0: chute() },
});
