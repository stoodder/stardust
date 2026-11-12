// A3M3's tunnel mouths (`prop.tunnel_mouth`; act3.md § A3M3, the map's `convoy_mouth` and
// `warren_mouth` markers; art-direction §6): where the refugees' roads come in at the map's edges,
// one landmark beside each, so the two roads read as two ways in, not as holes in the map.
// - `convoy`: the convoy road's mouth, an old Everglow mine-road portal: a squat ferrocrete frame
//   set into a heap of the cut's dark rock, its lintel hazard-striped and chipped, a caged work lamp
//   still burning warm over the dark opening (the colonists' trucks came through it).
// - `warren`: the warren tunnel's mouth, a Skitterkin burrow: a mound of warm turned earth capped in
//   moss, a round doorway ringed in pebbles, the dark inside, and a glowworm lantern on a reed by it
//   (the warrens' gold, as their homes' and towers').
// Both lights are the palette's emissives, so they glow in the Long Night.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, hash01, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 32;
const H = 32;
const CX = 16;
const FOOT_Y = 24;

function convoy(): string[] {
  const g: CharGrid = grid(W, H);
  // The heap of the cut's rock the portal is set into, lit left, pocked.
  disc(g, CX + 0.5, FOOT_Y - 1, 12, (d, x, y) => {
    if (y > FOOT_Y + 3 - Math.abs(x + 0.5 - CX) / 2) return '.';
    if (y < FOOT_Y - 15 + hash01(x >> 1, 2, 3) * 4) return '.';
    if (d > 11.3 && hash01(x, y, 3) < 0.5) return '.';
    const lit = x < CX - 6;
    return hash01(x, y, 4) < 0.12 ? 'B' : lit ? 'D' : 'C';
  });
  // The ferrocrete posts (lit left, shaded right) and the dark opening between them.
  for (let y = FOOT_Y - 11; y <= FOOT_Y + 1; y++) {
    for (let x = CX - 7; x <= CX + 6; x++) {
      const post = x <= CX - 5 || x >= CX + 4;
      plot(g, x, y, post ? (x === CX - 7 ? 'H' : x <= CX - 5 ? 'G' : 'F') : y < FOOT_Y - 9 ? 'A' : 'Z');
    }
  }
  // The lintel, hazard-striped, chipped at its right end.
  for (let x = CX - 8; x <= CX + 7; x++) {
    plot(g, x, FOOT_Y - 13, 'H');
    plot(g, x, FOOT_Y - 12, (x >> 1) % 2 === 0 ? 'O' : 'K');
  }
  plot(g, CX + 7, FOOT_Y - 13, '.');
  plot(g, CX + 7, FOOT_Y - 12, 'G');
  // The caged work lamp over the opening, still burning warm.
  stamp(g, CX - 2, FOOT_Y - 17, ['.KK.', 'K*+K', '.KK.', '..M.']);
  // Wheel ruts out of it.
  for (let y = FOOT_Y + 2; y <= FOOT_Y + 3; y++) {
    plot(g, CX - 3, y, '_');
    plot(g, CX + 2, y, '_');
  }
  return rows(g);
}

function warren(): string[] {
  const g: CharGrid = grid(W, H);
  // The mound of turned earth, mossed over its crown.
  disc(g, CX + 0.5, FOOT_Y - 2, 11, (d, x, y) => {
    if (y > FOOT_Y + 3 - Math.abs(x + 0.5 - CX) / 2) return '.';
    const top = y < FOOT_Y - 8 + hash01(x, 1, 7) * 3;
    if (top) return x < CX ? 'R' : 'Q';
    return x < CX - 3 ? 'U' : d > 9 ? 'S' : 'T';
  });
  // The round doorway, ringed in pebbles, dark inside.
  disc(g, CX + 0.5, FOOT_Y - 2, 5, (d) => (d > 4.2 ? 'M' : d > 3.2 ? 'A' : 'Z'));
  for (let x = CX - 5; x <= CX + 5; x++) if ((g[FOOT_Y + 3]?.[x] ?? '.') !== '.') plot(g, x, FOOT_Y + 3, '_');
  for (let y = FOOT_Y + 1; y < FOOT_Y + 4; y++) for (let x = CX - 4; x <= CX + 4; x++) plot(g, x, y, '.');
  // A glowworm lantern on a reed beside it.
  for (let y = FOOT_Y - 13; y <= FOOT_Y + 1; y++) plot(g, CX + 9, y, 'L');
  stamp(g, CX + 8, FOOT_Y - 16, ['.+.', '+*+', '.+.']);
  plot(g, CX + 10, FOOT_Y - 13, 'L');
  return rows(g);
}

export const propTunnelMouth = defineSprite({
  id: 'prop.tunnel_mouth',
  size: { w: W, h: H },
  anchor: { x: CX, y: FOOT_Y },
  // The warrens' gold emissives for both lights; everything else custom legend, so the mouths hold
  // their colours in the Long Night (groundTiles' OWN_PALETTE).
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: {
    A: 'ink.1',
    B: 'ink.2',
    C: 'ink.3',
    D: 'ink.4',
    F: 'grime.1',
    G: 'grime.2',
    H: 'grime.3',
    K: 'ink.0',
    L: 'brass.1',
    M: 'steel.1',
    O: 'orange.2',
    Q: 'green.1',
    R: 'green.2',
    S: 'skin.b.1',
    T: 'skin.b.2',
    U: 'skin.b.3',
    Z: 'ink.0',
  },
  frames: { convoy: convoy(), warren: warren() },
});
