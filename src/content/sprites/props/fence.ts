// The colony's perimeter fence (apron decor, art-direction §3): Everglow steel posts strung
// with two wires and an orange hazard tag, one segment per apron tile along the map's edge.
// `x` runs along the grid's x axis (down-right on screen), `y` along its y axis (down-left).
import { defineSprite } from '../defineSprite.ts';
import { grid, line, mirrorRows, plot, rows } from '../helpers.ts';

const W = 18;
const H = 16;
const AX = 9;
const AY = 11;

/** A segment along the x axis: ground from (AX − 8, AY − 4) to (AX + 8, AY + 4). */
function fenceX(): string[] {
  const g = grid(W, H);
  const x0 = AX - 8;
  const y0 = AY - 4;
  // Two wires, sagging a pixel at mid-span.
  line(g, x0, y0 - 5, AX, AY - 4, '1');
  line(g, AX, AY - 4, AX + 8, AY - 1, '1');
  line(g, x0, y0 - 2, AX, AY - 1, '1');
  line(g, AX, AY - 1, AX + 8, AY + 2, '1');
  // The post at the segment's start (the next segment's post closes this one).
  for (let y = y0 - 6; y <= y0; y++) {
    plot(g, x0, y, '3');
    plot(g, x0 + 1, y, '1');
  }
  plot(g, x0, y0 - 7, '4');
  plot(g, x0 + 1, y0 - 7, '2');
  plot(g, x0, y0 + 1, '_');
  plot(g, x0 + 1, y0 + 1, '_');
  // A hazard tag on the upper wire.
  plot(g, AX - 1, AY - 4, 'c');
  plot(g, AX, AY - 3, 'd');
  return rows(g);
}

const X = fenceX();

export const propFence = defineSprite({
  id: 'prop.fence',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  frames: { x: X, y: mirrorRows(X) },
});
