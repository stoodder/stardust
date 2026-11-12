// Thrum's echo (`fx.echo`; story/campaign/finale.md, Phase 2 under `spared_quiet_wave = false`;
// sim/echo.ts): one Elder-shaped Hollow echo that drifts out of the Unsung into the song, doesn't
// fight, isn't a target, and turns warm gold where it stands and rises. Old Thrum as the Hollow
// keeps her (enemies/elder.ts's shape, drawn the Hollow's way, art-direction §4): broad and low, the
// old shell of three plates over her back gone drained grey, her thin tuft two pale wisps, a pale
// ring low on her face where her face should be, one speck of unsung violet at her heart, legs
// hanging (she drifts, she doesn't walk), the `ink.0` contour inside a hand-placed pale outline. No
// acid eyes: she isn't hungry. Built in the Hollow's legend and re-pointed by restFlip.ts, so the
// one sprite holds the grey, the flip, and the gold.
// - `walk_<facing>` (2 frames, 4 fps): drifting in, grey, bobbing a pixel.
// - `warm_<facing>` (4 frames, 8 fps, once): on `EchoArrived`, gold from the outline in.
// - `rise_<facing>` (2 frames, 3 fps): all gold, her heart white, her seams breathing; render lifts
//   it as it rises and fades over the sim's ECHO_RISE_SEC.
import { defineSprite } from '../defineSprite.ts';
import { at, grid, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { inkContour, hollowBody } from '../enemies/hollow.ts';
import { greyed, REST_LEGEND, ringed, warmed } from '../enemies/restFlip.ts';
import type { AnimDef } from '../types.ts';

const W = 24;
const H = 18;
/** The flip's depths from the outline in, one per frame (the last turns all of it). */
const WARM_DEPTHS = [0, 1, 3, Infinity] as const;

type Facing = 'se' | 'ne';

/** Her body in the Hollow's legend (`0`–`3`, `w`, `k`, `K`, `V`), before the greying and ring. */
function echoBody(facing: Facing, step: 0 | 1): string[] {
  const lift = step; // the drift's bob
  const g: CharGrid = grid(W, H);
  const cx = 12;
  const cy = 10.5 - lift;
  hollowBody(g, cx, cy, 10.5, 6.5, 0);
  // The shell: three plates over her back, lit a step up, their seams dark.
  const sx = facing === 'se' ? cx - 3 : cx;
  const plates = [sx - 5, sx, sx + 5];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (at(g, x, y) === '.') continue;
      const dx = x + 0.5 - sx;
      const dy = y + 0.5 - (cy - 1.5);
      if (Math.hypot(dx / 8.5, dy / 5) > 1 || dy > 1) continue;
      const d = Math.min(...plates.map((p) => Math.abs(x + 0.5 - p)));
      plot(g, x, y, d > 2.2 ? '0' : dy < -2 ? '3' : '2');
    }
  }
  inkContour(g);
  // Her tuft: two pale wisps, drifting.
  const tx = facing === 'se' ? 9 : 11;
  stamp(g, tx, 1 - lift + 1, step === 0 ? ['.w.w', 'w.w.'] : ['w.w.', '.w.w']);
  // Her heart: one speck of unsung violet.
  plot(g, facing === 'se' ? 9 : 12, Math.round(cy) + 2, 'V');
  if (facing === 'se') {
    // A pale ring low on her face, and the ghost of her brows.
    stamp(g, 16, Math.round(cy), ['.w.', 'wkw', '.w.']);
    stamp(g, 15, Math.round(cy) - 2, ['ww.ww']);
  }
  // Legs hanging: she drifts.
  for (const [i, lx] of [5, 9, 14, 18].entries()) {
    let y = H - 2 - lift;
    while (y > 0 && at(g, lx, y - 1) === '.') y--;
    const len = 1 + ((i + step) % 2);
    for (let k = 0; k < len; k++) if (at(g, lx, y + k) === '.') plot(g, lx, y + k, '1');
  }
  return rows(g);
}

function frames(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const fc of ['se', 'ne'] as const) {
    const grey0 = ringed(greyed(echoBody(fc, 0)));
    out[`walk_${fc}_0`] = grey0;
    out[`walk_${fc}_1`] = ringed(greyed(echoBody(fc, 1)));
    WARM_DEPTHS.forEach((d, i) => (out[`warm_${fc}_${i}`] = warmed(grey0, d)));
    const gold = warmed(grey0, Infinity);
    out[`rise_${fc}_0`] = gold;
    // The breath: her shell's seams (the contour's pink) light a step.
    out[`rise_${fc}_1`] = gold.map((r) =>
      r.replace(/G/g, (c, x: number) => (x % 3 === 0 ? 'L' : c)),
    );
  }
  return out;
}

function anims(look: string, n: number, fps: number, loop = true): Record<string, AnimDef> {
  const names = (fc: string): string[] => Array.from({ length: n }, (_, i) => `${look}_${fc}_${i}`);
  const once = loop ? {} : { loop: false };
  return {
    [`${look}_se`]: { frames: names('se'), fps, ...once },
    [`${look}_sw`]: { mirrorOf: `${look}_se` },
    [`${look}_ne`]: { frames: names('ne'), fps, ...once },
    [`${look}_nw`]: { mirrorOf: `${look}_ne` },
  };
}

export const fxEcho = defineSprite({
  id: 'fx.echo',
  // Ringed by hand (the flip turns the outline first): the authored body plus the ring.
  size: { w: W + 2, h: H + 2 },
  anchor: { x: 13, y: H + 1 },
  // `skitterkin`'s emissives are gold, so her sung gold glows; every pixel is custom or e0/e1.
  palette: 'skitterkin',
  outline: 'none',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: REST_LEGEND,
  frames: frames(),
  anims: {
    ...anims('walk', 2, 4),
    ...anims('warm', WARM_DEPTHS.length, 8, false),
    ...anims('rise', 2, 3),
  },
});
