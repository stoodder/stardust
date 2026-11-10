// A reclamation vat (`prop.vat`; A2M4 decor, act2.md § A2M4, markers `vat_west`/`_middle`/`_east`):
// one of Reclamation Facility 2's big open vats, where the Tidybots' loads become stardust. A
// riveted steel tank on a low plinth, an Everglow teal band under its rim, and inside it the slurry,
// glowing cold violet (unsung: art-direction §1 principle 6, the vats are named there), slowly
// churning; a sight glass down its front shows the violet to the brim, an outlet pipe with an
// orange valve wheel runs off its shaded side, and a hazard band rings its foot. The body sits in
// the environment's band (steel.1–steel.3, a step under the units); only the slurry is bright, and
// it is the colour the act's story is about. Frames `v0`–`v2` (anim `churn`, 3 fps: the swirl turns
// and a bubble rises and pops); `v0` is the Second Harvest codex entry's picture.
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 34;
const H = 42;
const CX = 17;
/** The footprint center (the anchor). */
const FOOT_Y = 35;
/** The tank's radius across, and its ellipse's half-height (a 2:1 iso circle). */
const RX = 13;
const RY = 6.5;
/** The bottom and top ellipses' centers. */
const YB = FOOT_Y - 2;
const YT = YB - 18;

/** The ellipse's half-height at column offset `dx` (in px from the center). */
function half(dx: number, rx: number, ry: number): number {
  const t = 1 - (dx * dx) / (rx * rx);
  return t <= 0 ? 0 : ry * Math.sqrt(t);
}

/** The tank's body: lit left, shaded right, ringed by riveted hoops that follow its curve. */
function body(g: CharGrid): void {
  for (let x = CX - RX; x < CX + RX; x++) {
    const dx = x + 0.5 - CX;
    const h = half(dx, RX, RY);
    const s = dx / RX;
    for (let y = Math.floor(YT); y <= Math.round(YB + h); y++) {
      let ch = s < -0.6 ? 'D' : s < 0.1 ? 'C' : s < 0.75 ? 'B' : 'A';
      // Hoops: the bands follow the near curve of the tank (one row lower toward the middle).
      const k = y - Math.round(h);
      if (k === YT + 7 || k === YT + 14) ch = s < -0.2 ? 'B' : 'A';
      if ((k === YT + 6 || k === YT + 13) && x % 4 === 1) ch = 'D'; // rivet heads
      // The teal band under the rim, and the hazard band round the foot.
      if (k === YT + 2 || k === YT + 3) ch = s < 0 ? '7' : '6';
      if (k >= YB - 1 && k <= YB) ch = (x + (y - YB)) % 4 < 2 ? 'O' : 'K';
      plot(g, x, y, ch);
    }
  }
}

/** The open top: a lit rim round the slurry, which swirls (phase `k`) and glows cold violet. */
function slurry(g: CharGrid, k: number): void {
  for (let x = CX - RX; x < CX + RX; x++) {
    const dx = x + 0.5 - CX;
    const h = half(dx, RX, RY);
    const yTop = Math.round(YT - h);
    const yBot = Math.round(YT + h);
    for (let y = yTop; y <= yBot; y++) {
      const rim = y === yTop || y === yBot || x === CX - RX || x === CX + RX - 1;
      if (rim) {
        // The rim: lit along the back, a dark lip at the front where the wall drops away.
        plot(g, x, y, y === yBot ? 'B' : dx < 4 ? 'E' : 'D');
        continue;
      }
      // The slurry: brightest at its churning heart, deep violet at the walls, with ripples that
      // turn a third of the way round each frame.
      const a = Math.atan2((y + 0.5 - YT) * 2, dx);
      const r = Math.hypot(dx, (y + 0.5 - YT) * 2) / RX;
      const ripple = Math.sin(a * 3 + r * 7 - (k * 2 * Math.PI) / 3) * 0.22;
      const v = r + ripple;
      plot(g, x, y, v < 0.32 ? 'Y' : v < 0.72 ? 'V' : 'U');
    }
  }
  // A bubble rising and popping, a different spot each frame.
  const bubbles: readonly (readonly string[])[] = [['.w.', 'w.w', '.w.'], ['ww'], ['w.w']];
  const at: readonly (readonly [number, number])[] = [
    [CX - 7, YT - 2],
    [CX + 4, YT - 1],
    [CX - 2, YT + 2],
  ];
  const [bx, by] = at[k] ?? [CX, YT];
  stamp(g, bx, by, bubbles[k] ?? []);
}

/** The sight glass down the front, the outlet pipe and its valve wheel on the shaded side. */
function fittings(g: CharGrid): void {
  const sx = CX - 9;
  for (let y = YT + 6; y <= YB; y++) {
    plot(g, sx, y, 'A');
    plot(g, sx + 1, y, y < YT + 8 ? 'Y' : 'V');
    plot(g, sx + 2, y, 'A');
  }
  // A ladder up the lit side to the rim.
  for (let y = YT - 3; y <= YB + 3; y++) {
    plot(g, CX - 13, y, 'D');
    plot(g, CX - 11, y, 'B');
    if (y % 2 === 0) plot(g, CX - 12, y, 'E');
  }
  // The outlet pipe: out of the shaded side, down into the plant floor.
  const px = CX + RX - 1;
  line(g, px, YB - 6, px + 3, YB - 6, 'B');
  line(g, px, YB - 5, px + 3, YB - 5, 'A');
  for (let y = YB - 6; y <= FOOT_Y + 1; y++) {
    plot(g, px + 3, y, 'B');
    plot(g, px + 4, y, 'A');
  }
  // The valve wheel, a scuffed orange.
  stamp(g, px + 1, YB - 9, ['.c.', 'cKc', '.c.']);
}

function vatGrid(k: number): string[] {
  const g = grid(W, H);
  isoBox(g, CX, FOOT_Y + 1, 15, 0, { top: '_', rim: '_', left: '_', right: '_' });
  // The low plinth it stands on.
  isoBox(g, CX, FOOT_Y, 14, 2, { top: 'B', rim: 'C', left: 'B', right: 'A' });
  body(g);
  slurry(g, k);
  fittings(g);
  return rows(g);
}

export const propVat = defineSprite({
  id: 'prop.vat',
  size: { w: W, h: H },
  anchor: { x: CX, y: FOOT_Y },
  palette: 'everglow',
  outline: 'auto',
  legend: {
    A: 'steel.0',
    B: 'steel.1',
    C: 'steel.2',
    D: 'steel.3',
    E: 'steel.4',
    U: 'violet.2',
    V: 'violet.3',
    Y: 'violet.4',
    O: 'orange.2',
    K: 'ink.1',
  },
  frames: { v0: vatGrid(0), v1: vatGrid(1), v2: vatGrid(2) },
  anims: { churn: { frames: ['v0', 'v1', 'v2'], fps: 3 } },
});
