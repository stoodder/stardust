// Frostline Sprinkler (`sprinkler`): an AquaGuard irrigation head, creatively repurposed. A teal
// tank with a spinning three-arm nozzle that flicks frost. It pulses, so it has no facings. The
// tier-4 specs (design/towers.md § 7): **Flash Freeze** (`spec_a`) frosts the tank white and tips
// each arm with an ice crystal, on a base with a frosted cryo tank at each side corner; **Cloudburst**
// (`spec_b`, it hits air) raises the nozzle on a tall riser with longer arms flinging spray upward,
// on a base with a water drum and an upward spray pipe. Spec heads are their own idle anims
// (`spin_spec_a`/`_b`).
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, line, plot, rows, type CharGrid } from '../helpers.ts';
import {
  BASE_ANCHOR,
  BASE_H,
  BASE_MOUNT,
  BASE_W,
  everglowBase,
  everglowSpecBase,
  JAILBREAK_LEGEND,
  withJailbreak,
} from './base.ts';

const W = 24;
const H = 24;
const CX = 12;
const CY = 21;

type Kit = 't1' | 'freeze' | 'cloud';

/** Spin frame `k` of 3: the arms are 120° apart, so 3 × 40° steps loop seamlessly. */
function sprinklerHead(k: number, kit: Kit = 't1'): string[] {
  const g = grid(W, H);
  const freeze = kit === 'freeze';
  const cloud = kit === 'cloud';
  const ARM_RX = cloud ? 9.5 : 7;
  const ARM_RY = cloud ? 4.5 : 3.5;
  isoBox(g, CX, CY, 6, 2, { top: '3', rim: '4', left: '2', right: '1' });
  // The tank: a teal dome with a frosty highlight.
  disc(g, CX, CY - 5, 4.5, (d, x, y) =>
    freeze
      ? d > 3.7
        ? 'B'
        : x < CX + 1
          ? 'C'
          : '4'
      : d > 3.7
        ? '6'
        : x < CX - 1 && y < CY - 6
          ? 'B'
          : x < CX + 1
            ? '8'
            : '7',
  );
  plot(g, CX - 2, CY - 8, 'w');
  if (freeze) {
    // Frost creeping up the tank's flank.
    plot(g, CX + 2, CY - 2, 'C');
    plot(g, CX + 3, CY - 4, 'B');
  }
  // Riser pipe and hub (Cloudburst's stands tall, banded teal).
  const riser = cloud ? 8 : 4;
  line(g, CX, CY - 9, CX, CY - 8 - riser, '2');
  line(g, CX - 1, CY - 9, CX - 1, CY - 8 - riser, '3');
  if (cloud) {
    plot(g, CX - 1, CY - 12, '8');
    plot(g, CX, CY - 12, '7');
  }
  const hubY = CY - 9 - riser;
  for (let a = 0; a < 3; a++) {
    const t = ((k * 40 + a * 120) * Math.PI) / 180;
    const ex = Math.round(CX - 0.5 + Math.cos(t) * ARM_RX);
    const ey = Math.round(hubY + Math.sin(t) * ARM_RY);
    line(g, CX - 1, hubY, ex, ey, '1');
    plot(g, ex, ey, 'B');
    plot(g, ex, ey - 1, 'C');
    if (freeze) {
      // An ice crystal on each arm's tip.
      plot(g, ex - 1, ey - 1, 'B');
      plot(g, ex + 1, ey - 1, 'B');
      plot(g, ex, ey - 2, 'B');
    }
    if (cloud) {
      // Spray flung up off each tip, toward the flyers.
      plot(g, ex, ey - 3, 'B');
      plot(g, ex + (ex < CX ? -1 : 1), ey - 5, 'C');
    }
  }
  plot(g, CX - 1, hubY, '4');
  plot(g, CX, hubY, '3');
  return rows(g);
}

/** Flash Freeze's base: a frosted cryo tank at each side corner, ice crystals on its cap. */
function freezeKit(g: CharGrid, cx: number, cy: number): void {
  for (const side of [-1, 1]) {
    const x = cx + side * 10;
    isoBox(g, x, cy + 1, 3, 9, { top: 'C', rim: 'C', left: '4', right: '2' });
    // A blue frost band, and crystals standing on the cap.
    for (let px = Math.floor(x - 3); px < Math.ceil(x + 3); px++) {
      const yy = cy - 3 + (Math.abs(px + 0.5 - x) <= 1 ? 1 : 0);
      plot(g, px, yy, 'B');
    }
    plot(g, Math.round(x) - 1, cy - 11, 'B');
    plot(g, Math.round(x) - 1, cy - 12, 'C');
    plot(g, Math.round(x) + 1, cy - 10, 'B');
    plot(g, Math.round(x), cy - 10, 'C');
  }
}

/** Cloudburst's base: a teal water drum at the right corner, an upward spray pipe at the left. */
function cloudKit(g: CharGrid, cx: number, cy: number): void {
  isoBox(g, cx + 10, cy + 1, 3.5, 6, { top: '8', rim: '9', left: '7', right: '6' });
  line(g, cx + 8, cy - 5, cx + 4, cy - 6, '2');
  const x = cx - 10;
  isoBox(g, x, cy + 1, 2.5, 3, { top: '3', rim: '4', left: '2', right: '1' });
  for (let y = cy - 14; y <= cy - 2; y++) {
    plot(g, x - 1, y, '4');
    plot(g, x, y, '2');
  }
  // The nozzle cap and its fan of spray, thrown at the sky.
  line(g, x - 2, cy - 15, x + 1, cy - 15, '3');
  for (const [dx, dy] of [
    [-3, -18],
    [-1, -19],
    [1, -19],
    [3, -18],
    [-2, -17],
    [2, -17],
  ] as const)
    plot(g, x + dx - 1, cy + dy, dy < -18 ? 'C' : 'B');
}

export const towerSprinkler = defineSprite({
  id: 'tower.sprinkler',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'everglow',
  variants: ['everglow.worn', 'everglow.jailbroken'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { B: 'blue.4', C: 'white.1', ...JAILBREAK_LEGEND },
  frames: withJailbreak({
    t1: everglowBase(1, '8'),
    t2: everglowBase(2, '8'),
    t3: everglowBase(3, '8'),
    spec_a: everglowSpecBase('8', freezeKit),
    spec_b: everglowSpecBase('8', cloudKit),
  }),
});

export const towerSprinklerHead = defineSprite({
  id: 'tower.sprinkler_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'everglow',
  variants: ['everglow.worn', 'everglow.jailbroken'],
  outline: 'auto',
  // Frost: the one non-Everglow hue on it, fixed across palettes.
  legend: { B: 'blue.4', C: 'white.1' },
  frames: {
    spin_0: sprinklerHead(0),
    spin_1: sprinklerHead(1),
    spin_2: sprinklerHead(2),
    spin_spec_a_0: sprinklerHead(0, 'freeze'),
    spin_spec_a_1: sprinklerHead(1, 'freeze'),
    spin_spec_a_2: sprinklerHead(2, 'freeze'),
    spin_spec_b_0: sprinklerHead(0, 'cloud'),
    spin_spec_b_1: sprinklerHead(1, 'cloud'),
    spin_spec_b_2: sprinklerHead(2, 'cloud'),
  },
  anims: {
    spin: { frames: ['spin_0', 'spin_1', 'spin_2'], fps: 8 },
    spin_spec_a: { frames: ['spin_spec_a_0', 'spin_spec_a_1', 'spin_spec_a_2'], fps: 8 },
    spin_spec_b: { frames: ['spin_spec_b_0', 'spin_spec_b_1', 'spin_spec_b_2'], fps: 10 },
  },
});
