// Power node (`+`, design/maps.md §3): a buildable pad wired into the colony grid. Emissive
// conduits in the act's accent (`e0`/`e1`, art-direction §8 Tile readability) run in from the
// tile's corners across the plate to a socket at its heart; a slow pulse flows inward along them.
// In A1M2 it is the pump station's tap. Act II's maps draw the `conduit` frames (below).
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

/**
 * Act II's stardust conduit node (A2M1, A2M2: "the stardust conduit"): the same plate, crossed by
 * a heavy Everglow pipe along the grid's x axis, flanged, diving into the ground at the tile's
 * edges, its glass channel full of processed stardust flowing through: cold violet (unsung,
 * art-direction §1 principle 6), a bright bead stepping along it each frame, round a valve at the
 * heart.
 */
/** The conduit pipe's centre line across the tile, along the grid's x axis. */
function along(x: number): number {
  return 7.5 + (x - 15.5) / 2;
}

function conduitGrid(phase: number): string[] {
  const g: CharGrid = padGrid();
  for (let x = 0; x < 32; x++) {
    const yc = Math.round(along(x));
    const off = diamond(x, yc) > 5.75; // off the plate: the pipe sinks into a dark trench
    // A steel rim over a two-row glass channel, a shaded underside, a contact shadow below.
    const col: readonly string[] = ['D', 'G', 'G', 'M', 'K'];
    col.forEach((c, k) => {
      const y = yc - 2 + k;
      if (!inTileMask(x, y)) return;
      let ch = c;
      if (x % 8 === 3) ch = k === 0 ? 'w' : k < 3 ? 'L' : ch; // a flange
      if (off && k >= 3) ch = '0';
      plot(g, x, y, ch);
    });
  }
  // The stardust in the glass: cold violet, a bright bead stepping along the flow each frame.
  for (let x = 0; x < 32; x++) {
    if (x % 8 === 3) continue;
    const yc = Math.round(along(x));
    const bead = (x - phase * 2 + 64) % 8;
    for (const y of [yc - 1, yc]) {
      if (!inTileMask(x, y)) continue;
      const ch = bead === 0 ? 'W' : bead === 1 || bead === 7 ? 'V' : 'U';
      plot(g, x, y, y === yc - 1 && ch === 'U' ? 'V' : ch);
    }
  }
  // The junction valve at the heart: a steel collar round a white-hot core.
  // prettier-ignore
  const valve = [
    '.LL.',
    'L*wL',
    'LwwL',
    '.KK.',
  ];
  valve.forEach((r, dy) => {
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
  legend: {
    ...PAD_LEGEND,
    D: 'steel.4',
    G: 'violet.1',
    U: 'violet.3',
    V: 'violet.4',
    W: 'white.1',
  },
  frames: {
    v0: nodeGrid(0),
    pulse_1: nodeGrid(1),
    pulse_2: nodeGrid(2),
    pulse_3: nodeGrid(3),
    conduit_0: conduitGrid(0),
    conduit_1: conduitGrid(1),
    conduit_2: conduitGrid(2),
    conduit_3: conduitGrid(3),
  },
  anims: {
    pulse: { frames: ['v0', 'pulse_1', 'pulse_2', 'pulse_3'], fps: 4 },
    conduit: { frames: ['conduit_0', 'conduit_1', 'conduit_2', 'conduit_3'], fps: 4 },
  },
});
