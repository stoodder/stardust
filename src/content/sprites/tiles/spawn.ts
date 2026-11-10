// Spawn tile, Skitterkin look: a burrow mouth in clay at the head of the path, with grass tufts
// (design/maps.md § Tile types: the portal look is per faction). `hatch` (A2M4, T540c): a spawn
// inside the map, a vat drain hatch set in the road: a round steel collar, its grated lid flung
// open on its hinge at the back, and in the dark throat a cold violet glow (the vats' slurry,
// unsung), so the Hollow's surge visibly comes up out of the plant (render: an interior spawn).
import { defineSprite } from '../defineSprite.ts';
import { disc, plot, rows, stamp } from '../helpers.ts';
import { ENV_VARIANTS, pathGrid } from './tileGen.ts';

// prettier-ignore
const BURROW = [
  '.....cddddc.....',
  '...ccdeeeedcc...',
  '..cdbbbbbbbbdc..',
  '.cdb.kkkkkk.bdc.',
  '.cbkkkkkkkkkkbc.',
  '.cbkkkkkkkkkkbc.',
  '..cbkkkkkkkkbc..',
  '...cbbkkkkbbc...',
  '....aaccccaa....',
];

function spawnGrid(): string[] {
  const g = pathGrid(9);
  stamp(g, 8, 2, BURROW);
  // The burrow's dark mouth: `.` in the stamp above is skipped, so fill the gaps explicitly.
  for (const [x, y] of [
    [12, 5],
    [19, 5],
  ] as const)
    plot(g, x, y, 'b');
  // Grass tufts on the mound.
  for (const [x, y] of [
    [9, 3],
    [22, 3],
    [10, 10],
    [21, 10],
    [14, 1],
  ] as const) {
    plot(g, x, y, '3');
    plot(g, x, y + 1, '1');
  }
  return rows(g);
}

/** The drain hatch: a steel collar in the road, the lid open at the back, violet in the throat. */
function hatchGrid(): string[] {
  const g = pathGrid(9);
  const cx = 16;
  const cy = 8.5;
  // The collar: an iso ring, lit along its back rim, round a dark throat.
  disc(g, cx, cy, 8, (_d, x, y) => {
    const dx = (x + 0.5 - cx) / 8;
    const dy = (y + 0.5 - cy) / 4;
    const r = Math.hypot(dx, dy);
    if (r > 1) return g[y]?.[x] ?? '.';
    if (r > 0.72) return dy < -0.2 ? 'M' : dx > 0.3 ? 'K' : 'L';
    // The throat: violet light deep down at its heart, dark round the walls.
    if (r < 0.3) return 'V';
    if (r < 0.5) return 'U';
    return r < 0.62 ? 'J' : 'N';
  });
  // Rungs going down, catching the glow.
  for (const [x, y] of [
    [13, 9],
    [13, 11],
  ] as const) {
    plot(g, x, y, 'L');
    plot(g, x + 1, y, 'L');
  }
  // The grated lid, flung open on its hinge at the back, standing up behind the collar.
  // prettier-ignore
  stamp(g, cx - 6, 0, [
    '..LMMMMML..',
    '.LMKMKMKML.',
    'LMKMKMKMKML',
    '.LKKKKKKKL.',
  ]);
  return rows(g);
}

export const tileSpawn = defineSprite({
  id: 'tile.spawn',
  size: { w: 32, h: 16 },
  anchor: { x: 16, y: 0 },
  palette: 'act1',
  variants: ENV_VARIANTS,
  legend: {
    J: 'ink.1',
    K: 'steel.0',
    L: 'steel.1',
    M: 'steel.2',
    N: 'ink.0',
    U: 'violet.2',
    V: 'violet.3',
  },
  frames: { v0: spawnGrid(), hatch: hatchGrid() },
});
