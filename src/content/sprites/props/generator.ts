// The shelter generator (`prop.generator`; A3M4's core, act3.md § A3M4: "core: the shelter
// generator; Liability Enforcers come to repossess it"): the machine that keeps the Shelters' lights
// on, standing in the hall where the colonists (or the warren) sleep. A squat Everglow power unit,
// not a beacon: a ferrocrete plinth, a steel housing lit from the left, a caged window on its front
// where the teal heart (the core's own, so it reads as the thing you defend) turns, two exhaust
// stacks, a hazard band round its foot, a fat cable run off its shaded side into the floor, and an
// orange REPOSSESSION tag (Accounting's) wired to its top rail. Frames `idle_0`/`idle_1` (anim
// `idle`, 2 fps) and the `e0`/`e1` glow, as `prop.core`'s, so CoreView's leak flash and low-integrity
// heart can draw over it unchanged (T730b swaps it in on A3M4). Everglow-owned, with ferrocrete
// (`grime`) in its own legend.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, isoBox, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 30;
const H = 38;
const CX = 15;
/** The footprint centre (the anchor), as the core's. */
const FOOT_Y = 31;

function generatorGrid(pulse: boolean): string[] {
  const g: CharGrid = grid(W, H);
  // The contact shadow, then the ferrocrete plinth.
  isoBox(g, CX, FOOT_Y + 1, 14, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, CX, FOOT_Y, 13, 3, { top: 'M', rim: 'N', left: 'L', right: 'J' });
  // The housing: a steel box, white paint worn to steel, lit from the left.
  isoBox(g, CX, FOOT_Y - 3, 10, 14, { top: '3', rim: '4', left: '2', right: '1' });
  // The hazard band round the housing's foot.
  for (let x = CX - 10; x < CX + 10; x++) {
    const y = FOOT_Y - 3 + Math.round(-Math.abs(x + 0.5 - CX) / 2) + 4;
    plot(g, x, y, Math.floor((x + 64) / 2) % 2 === 0 ? 'c' : 'k');
  }
  // The teal band under the top rail.
  for (let x = CX - 10; x < CX + 10; x++) {
    const y = FOOT_Y - 3 + Math.round(-Math.abs(x + 0.5 - CX) / 2) - 9;
    plot(g, x, y, x < CX ? '8' : '7');
  }
  // The caged window on the lit face, where the heart turns: a dark well, the heart, the bars.
  disc(g, CX - 5, FOOT_Y - 12, 4.2, (d) => (d > 3.3 ? '0' : 'K'));
  disc(g, CX - 5, FOOT_Y - 12, pulse ? 3.1 : 2.7, (d) => (d < 1.1 ? '*' : d < 2.1 ? '+' : '8'));
  for (const dy of [-2, 0, 2]) plot(g, CX - 9, FOOT_Y - 12 + dy, '1');
  line(g, CX - 9, FOOT_Y - 12, CX - 2, FOOT_Y - 12, '1');
  plot(g, CX - 5, FOOT_Y - 12, pulse ? 'w' : '*');
  // A gauge on the shaded face, its needle in the green, and a vent grille under it.
  stamp(g, CX + 3, FOOT_Y - 15, ['.22.', '2wk2', '2kG2', '.22.']);
  for (let k = 0; k < 3; k++) line(g, CX + 3, FOOT_Y - 9 + k * 2, CX + 7, FOOT_Y - 7 + k * 2, '0');
  // Two exhaust stacks on the top, breathing a little teal heat.
  for (const [sx, top] of [
    [CX - 4, FOOT_Y - 26],
    [CX + 2, FOOT_Y - 24],
  ] as const) {
    for (let y = top; y <= FOOT_Y - 18; y++) {
      plot(g, sx, y, '3');
      plot(g, sx + 1, y, '1');
    }
    plot(g, sx, top - 1, '0');
    plot(g, sx + 1, top - 1, '0');
    if (pulse) plot(g, sx, top - 2, '7');
  }
  // Accounting's REPOSSESSION tag wired to the top rail: an orange card on a string.
  line(g, CX + 7, FOOT_Y - 20, CX + 9, FOOT_Y - 17, '1');
  stamp(g, CX + 8, FOOT_Y - 17, ['ccc', 'cWc', 'ccc']);
  // The cable run off the shaded side, down into the floor.
  line(g, CX + 10, FOOT_Y - 6, CX + 13, FOOT_Y - 4, 'k');
  line(g, CX + 10, FOOT_Y - 5, CX + 13, FOOT_Y - 3, '0');
  line(g, CX + 13, FOOT_Y - 3, CX + 13, FOOT_Y + 1, 'k');
  return rows(g);
}

export const propGenerator = defineSprite({
  id: 'prop.generator',
  size: { w: W, h: H },
  anchor: { x: CX, y: FOOT_Y },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 2 },
  // Ferrocrete (lit top, rim, faces), the window's well, the gauge's green, the tag's white.
  legend: {
    N: 'grime.4',
    M: 'grime.3',
    L: 'grime.2',
    J: 'grime.1',
    K: 'ink.0',
    G: 'green.3',
    W: 'white.1',
  },
  frames: { idle_0: generatorGrid(false), idle_1: generatorGrid(true) },
  anims: { idle: { frames: ['idle_0', 'idle_1'], fps: 2 } },
});
