// Power node (`+`, design/maps.md §3): a buildable pad wired into the colony grid. Emissive
// conduits in the act's accent (`e0`/`e1`, art-direction §8 Tile readability) run in from the
// tile's corners across the plate to a socket at its heart; a slow pulse flows inward along them.
// In A1M2 it is the pump station's tap.
import { defineSprite } from '../defineSprite.ts';
import { diamond, inTileMask, plot, rows, type CharGrid } from '../helpers.ts';
import { PAD_LEGEND, padGrid } from './pad.ts';
import { ENV_VARIANTS } from './tileGen.ts';

/** Pulse frames: one bright bead every PERIOD conduit pixels, stepping inward each frame. */
const PERIOD = 4;

/** The four conduits, each a list of pixels from the tile's corner in to the socket. */
function conduits(): (readonly [number, number])[][] {
  const out: (readonly [number, number])[][] = [];
  // Along the diamond's axes: from each corner vertex toward the center (15.5, 7.5).
  const ends: readonly (readonly [number, number])[] = [
    [15.5, 0.5],
    [15.5, 14.5],
    [1.5, 7.5],
    [29.5, 7.5],
  ];
  for (const [ex, ey] of ends) {
    const run: (readonly [number, number])[] = [];
    const steps = 28;
    let last = '';
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(ex + (15.5 - ex) * t - 0.5);
      const y = Math.round(ey + (7.5 - ey) * t - 0.5);
      const key = `${x},${y}`;
      if (key === last || !inTileMask(x, y) || diamond(x, y) < 1.6) continue;
      last = key;
      run.push([x, y]);
    }
    out.push(run);
  }
  return out;
}

function nodeGrid(phase: number): string[] {
  const g: CharGrid = padGrid();
  for (const run of conduits()) {
    run.forEach(([x, y], i) => {
      // A dark groove under each conduit pixel off the plate, so it reads cut into the ground.
      if (diamond(x, y) > 5.75 && inTileMask(x, y + 1)) plot(g, x, y + 1, '0');
      plot(g, x, y, (i - phase + PERIOD * 8) % PERIOD === 0 ? '*' : '+');
    });
  }
  // The socket at the heart: a dark ring around a white-hot core.
  // prettier-ignore
  const socket = [
    '.KK.',
    'K*wK',
    'KwwK',
    '.KK.',
  ];
  socket.forEach((r, dy) => {
    for (let dx = 0; dx < r.length; dx++) {
      const ch = r.charAt(dx);
      if (ch !== '.') plot(g, 14 + dx, 5 + dy, ch);
    }
  });
  return rows(g);
}

export const tilePowerNode = defineSprite({
  id: 'tile.power_node',
  size: { w: 32, h: 16 },
  anchor: { x: 16, y: 0 },
  palette: 'act1',
  variants: ENV_VARIANTS,
  legend: PAD_LEGEND,
  frames: {
    v0: nodeGrid(0),
    pulse_1: nodeGrid(1),
    pulse_2: nodeGrid(2),
    pulse_3: nodeGrid(3),
  },
  anims: { pulse: { frames: ['v0', 'pulse_1', 'pulse_2', 'pulse_3'], fps: 4 } },
});
