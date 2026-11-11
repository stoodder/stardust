// An Everglow emergency lamp (`prop.emergency_lamp`; Act III's apron dressing, art-direction §3
// *Act III*: "alarm-red Everglow emergency lighting"): a steel post on a weighted foot, a hazard
// band at hand height, and on top a caged lamp burning alarm red, its light spilling down the
// post's lit side. The colony's lights are on emergency power now; these are what's left. `v0`.
// Everglow-owned, so it keeps its colours.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, type CharGrid } from '../helpers.ts';

const W = 10;
const H = 26;
const AX = 5;
const AY = 23;

function lamp(): string[] {
  const g: CharGrid = grid(W, H);
  // The foot and its shadow.
  for (let x = AX - 3; x <= AX + 2; x++) {
    plot(g, x, AY + 1, '_');
    plot(g, x, AY, x < AX ? '2' : '1');
  }
  for (let x = AX - 2; x <= AX + 1; x++) plot(g, x, AY - 1, x < AX ? '3' : '2');
  // The post, lit red down its left side near the top.
  for (let y = 5; y < AY - 1; y++) {
    plot(g, AX - 1, y, y < 9 ? 'R' : '3');
    plot(g, AX, y, '1');
  }
  // The hazard band.
  for (let y = 14; y < 18; y++) {
    plot(g, AX - 1, y, y % 2 === 0 ? 'c' : 'k');
    plot(g, AX, y, y % 2 === 0 ? 'b' : 'k');
  }
  // The caged lamp: a steel cap, the red glass in a cage, a lit heart.
  for (let x = AX - 3; x <= AX + 2; x++) plot(g, x, 0, '2');
  for (let y = 1; y <= 4; y++) {
    for (let x = AX - 2; x <= AX + 1; x++) {
      const cage = x === AX - 2 || x === AX + 1 ? y % 2 === 0 : false;
      plot(g, x, y, cage ? '1' : y === 2 && x === AX - 1 ? 'S' : 'R');
    }
  }
  for (let x = AX - 3; x <= AX + 2; x++) plot(g, x, 5, '1');
  return rows(g);
}

export const propEmergencyLamp = defineSprite({
  id: 'prop.emergency_lamp',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  outline: 'auto',
  legend: { R: 'red.3', S: 'red.4' },
  frames: { v0: lamp() },
});
