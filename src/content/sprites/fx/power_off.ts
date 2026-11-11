// The power-off line (`fx.power_off`; art-direction §7 *Impacts, hits, and deaths*): Everglow
// Security's shutdown, an old monitor switching off at the body. A `white.1` line in the `auto`
// `ink.0` rim, one frame per half-width as it collapses in whole pixels: `w6` (13 px) down to `w1`
// (3 px), then `dot`, which winks out (EverglowView steps its alpha). Anchored at the line's
// centre, so every frame collapses on the same point.
import { defineSprite } from '../defineSprite.ts';

const W = 13;
const C = 6;

/** A line `half` px either side of the centre (0: the dot). */
function bar(half: number): string[] {
  let r = '';
  for (let x = 0; x < W; x++) r += Math.abs(x - C) <= half ? 'w' : '.';
  return [r];
}

export const POWER_OFF_HALF_W = 6;

export const fxPowerOff = defineSprite({
  id: 'fx.power_off',
  size: { w: W, h: 1 },
  anchor: { x: C, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  frames: {
    w6: bar(6),
    w5: bar(5),
    w4: bar(4),
    w3: bar(3),
    w2: bar(2),
    w1: bar(1),
    dot: bar(0),
  },
});
