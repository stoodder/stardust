// The salvage drone (`prop.salvage_drone`, design/maps.md § 3, the clearing rules; core-loop.md):
// Everglow's little wreck-clearer, sent when the player clicks a wreckage tile. A boxy white
// quadcopter with orange hazard bands (salvage is safety-orange work), a teal chime lamp, two rotor
// outriggers, and a grab claw underneath. Clean Everglow white and orange, and boxy where Gerald is
// round, so the two drones never read alike.
//
// Its anchor is the ground point under it: the body hovers 14 px up inside the frame (no render
// lift), so the work beam reaches the ground. Render puts `fx.shadow` (`small`) at the anchor.
// Frames and anims:
// - `fly_0`, `fly_1`, anim `fly` (12 fps): flying, rotors blurring (long blade / short blur).
// - `work_0`–`work_2`, anim `work` (8 fps): hovering over the wreck, claw open, a teal tractor beam
//   down to the debris with sparks flying (the tile's clearing time).
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 22;
const H = 30;
/** The anchor: the ground point under the drone. */
const AX = 11;
const AY = H - 1;

function outlined(g: CharGrid, layer: CharGrid): void {
  const solid = (x: number, y: number): boolean => (layer[y]?.[x] ?? '.') !== '.';
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))
        plot(g, x, y, 'x');
    }
  }
  layer.forEach((r, y) => r.forEach((ch, x) => ch !== '.' && plot(g, x, y, ch)));
}

/** The drone itself (no outline), with its rotors in phase `k` and its claw open or shut. */
function craft(k: number, claw: 'shut' | 'open', bob: number): CharGrid {
  const d = grid(W, H);
  const y0 = 3 + bob;
  // Outrigger arms to the two rotor hubs.
  line(d, 4, y0 + 2, 8, y0 + 5, '1');
  line(d, 17, y0 + 2, 13, y0 + 5, '1');
  // Rotors: a long blade, or a short blur.
  for (const hx of [4, 17]) {
    if (k % 2 === 0) stamp(d, hx - 3, y0, ['3333333']);
    else stamp(d, hx - 2, y0, ['3.3.3']);
    stamp(d, hx, y0 + 1, ['2']);
  }
  // The body: a white box with orange hazard bands down its sides.
  isoBox(d, 11, y0 + 9, 6, 4, { top: '4', rim: '4', left: '3', right: '2' });
  for (let x = 5; x <= 16; x++) {
    for (let y = y0 + 6; y < y0 + 13; y++) {
      const ch = d[y]?.[x];
      if ((ch === '3' || ch === '2') && (x + y) % 4 < 2) plot(d, x, y, ch === '3' ? 'c' : 'b');
    }
  }
  // The teal chime lamp on top and the front sensor eye.
  stamp(d, 10, y0 + 3, ['+*']);
  stamp(d, 13, y0 + 9, ['e']);
  // The grab claw.
  const cy = y0 + 13;
  plot(d, 11, cy, '1');
  stamp(d, 9, cy + 1, claw === 'open' ? ['1...1', '.0.0.'] : ['.1.1.', '..0..']);
  return d;
}

/** A teal tractor beam from the claw down to the ground, sparks where it meets the debris. */
function beam(g: CharGrid, k: number): void {
  const top = 3 + 13 + 3;
  for (let y = top; y <= AY; y++) {
    const half = Math.floor((y - top) / 4) + 1;
    for (let x = AX - half; x <= AX + half; x++) {
      const edge = Math.abs(x - AX) === half;
      if (edge) {
        if ((y + k) % 2 === 0) plot(g, x, y, '+');
      } else if ((x + y + k) % 3 !== 0) plot(g, x, y, x === AX ? '*' : '+');
    }
  }
  // Sparks thrown off the debris.
  const sparks = [
    ['w.....w', '.......', '..w....'],
    ['...w...', 'w.....w', '.......'],
    ['.w...w.', '.......', 'w......'],
  ];
  stamp(g, AX - 3, AY - 6, sparks[k % 3] ?? []);
}

function fly(k: 0 | 1): string[] {
  const g = grid(W, H);
  outlined(g, craft(k, 'shut', 0));
  return rows(g);
}

function work(k: 0 | 1 | 2): string[] {
  const g = grid(W, H);
  beam(g, k);
  outlined(g, craft(k, 'open', k === 1 ? 1 : 0));
  return rows(g);
}

export const propSalvageDrone = defineSprite({
  id: 'prop.salvage_drone',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  // Outlined by hand round the craft only, so the beam stays soft.
  outline: 'none',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    fly_0: fly(0),
    fly_1: fly(1),
    work_0: work(0),
    work_1: work(1),
    work_2: work(2),
  },
  anims: {
    fly: { frames: ['fly_0', 'fly_1'], fps: 12 },
    work: { frames: ['work_0', 'work_1', 'work_2'], fps: 8 },
  },
});
