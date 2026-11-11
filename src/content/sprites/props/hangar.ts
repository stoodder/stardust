// "Shareholder Value"'s hangar (`prop.hangar`; A3M5 decor, act3.md § A3M5, marker `hangar`): the
// boss's berth in the band east of Second Harvest, where it waits until Accounting sends it out. A
// big Everglow hangar block: white panels worn to steel, a teal band under the roof line, a roll-up
// door in a hazard-striped frame on its south-west face (toward the plant), and on its south-east
// face a corporate screen showing a stock chart rising in Evie's pink and gold, with a red REC lamp
// (Sterling is watching, as on the boss's own bridge). A launch lamp over the door.
// - `shut_0`/`shut_1` (anim `idle`, 2 fps): the door down, the launch lamp dark, the REC lamp
//   blinking and the chart's last bar ticking.
// - `open`: the door rolled up on a dark bay, the launch lamp burning red, a Compliance Drone's teal
//   visor glinting inside (the boss's hangar tell, read large; T730b opens it when it launches).
// Everglow-owned.
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, plot, rows, type CharGrid } from '../helpers.ts';

const W = 46;
const H = 50;
/** The footprint centre (the anchor) and the block's half-width and height. */
const CX = 23;
const AY = 38;
const HW = 20;
const TALL = 22;

/** The left (south-west) face's foot row at column x. */
function leftFoot(x: number): number {
  return AY + Math.floor((x + 0.5 - (CX - HW)) / 2);
}
/** The right (south-east) face's foot row at column x. */
function rightFoot(x: number): number {
  return AY + HW / 2 - Math.floor((x + 0.5 - CX) / 2);
}

type Look = 'shut_0' | 'shut_1' | 'open';

function hangar(look: Look): string[] {
  const g: CharGrid = grid(W, H);
  isoBox(g, CX, AY + 1, HW + 1, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, CX, AY, HW, TALL, { top: '3', rim: '4', left: '2', right: '1' });
  // The roof's corrugation, running along the grid's x axis.
  g.forEach((r, y) =>
    r.forEach((ch, x) => {
      if (ch === '3' && (x - 2 * y + 256) % 8 < 2) plot(g, x, y, '2');
    }),
  );
  // Panel seams down both faces, and the teal band under the roof line.
  for (let x = CX - HW; x < CX + HW; x++) {
    const left = x < CX;
    const foot = left ? leftFoot(x) : rightFoot(x);
    if ((x - (CX - HW)) % 8 === 0) {
      for (let y = foot - TALL + 3; y < foot; y++) plot(g, x, y, left ? '1' : '0');
    }
    plot(g, x, foot - TALL + 2, left ? '8' : '7');
    plot(g, x, foot - TALL + 3, left ? '7' : '6');
  }
  // The roll-up door on the south-west face, in a hazard-striped frame.
  const d0 = CX - HW + 4;
  const d1 = CX - 4;
  const doorH = 13;
  for (let x = d0 - 1; x <= d1 + 1; x++) {
    const foot = leftFoot(x);
    for (let y = foot - doorH - 1; y <= foot; y++) {
      const frame = x === d0 - 1 || x === d1 + 1 || y === foot - doorH - 1;
      if (frame) {
        plot(g, x, y, Math.floor((x + y + 64) / 2) % 2 === 0 ? 'c' : 'k');
        continue;
      }
      if (look === 'open') {
        plot(g, x, y, y > foot - 3 ? 'J' : 'K');
      } else {
        // The shutter's slats.
        plot(g, x, y, (foot - y) % 2 === 0 ? '1' : '2');
      }
    }
  }
  if (look === 'open') {
    // A Compliance Drone's teal visor glinting in the dark bay.
    const vx = Math.round((d0 + d1) / 2);
    const vy = leftFoot(vx) - 7;
    plot(g, vx, vy, '+');
    plot(g, vx + 1, vy, '*');
    plot(g, vx + 2, vy, '+');
    // The rolled shutter bunched under the frame's head.
    for (let x = d0; x <= d1; x++) plot(g, x, leftFoot(x) - doorH, '1');
  }
  // The launch lamp over the door: dark until it opens.
  const lx = Math.round((d0 + d1) / 2);
  const ly = leftFoot(lx) - doorH - 4;
  plot(g, lx, ly, look === 'open' ? 'R' : 'Q');
  plot(g, lx + 1, ly, look === 'open' ? 'S' : 'Q');
  // The corporate screen on the south-east face: a dark panel, the chart rising pink and gold.
  const s0 = CX + 4;
  const s1 = CX + HW - 4;
  for (let x = s0; x <= s1; x++) {
    const foot = rightFoot(x);
    for (let y = foot - 18; y <= foot - 8; y++) {
      plot(g, x, y, x === s0 || x === s1 || y === foot - 18 || y === foot - 8 ? '0' : 'K');
    }
  }
  const bars = s1 - s0 - 3;
  const tick = look === 'shut_1' ? 1 : 0;
  for (let i = 0; i < bars; i += 2) {
    const x = s0 + 2 + i;
    const foot = rightFoot(x) - 9;
    const tall = 1 + Math.floor((i * 6) / bars) + (i + 2 >= bars ? tick : 0);
    for (let y = foot - tall + 1; y <= foot; y++) plot(g, x, y, i % 4 === 0 ? 'P' : 'Y');
  }
  // The REC lamp in the screen's corner.
  const rx = s1 - 2;
  plot(g, rx, rightFoot(rx) - 16, look === 'shut_1' ? 'Q' : 'R');
  return rows(g);
}

export const propHangar = defineSprite({
  id: 'prop.hangar',
  size: { w: W, h: H },
  anchor: { x: CX, y: AY },
  palette: 'everglow.worn',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: {
    K: 'ink.1',
    J: 'ink.2',
    P: 'pink.3',
    Y: 'gold.3',
    Q: 'red.0',
    R: 'red.3',
    S: 'red.4',
  },
  frames: { shut_0: hangar('shut_0'), shut_1: hangar('shut_1'), open: hangar('open') },
  anims: { idle: { frames: ['shut_0', 'shut_1'], fps: 2 } },
});
