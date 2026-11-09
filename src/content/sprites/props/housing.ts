// The colonists' housing block (A1M2 decor, act1.md § A1M2): a two-storey Everglow prefab, the
// building QUILL's "(Per policy.)" placement leaves to fend for itself. White paint, a teal band
// between storeys, warm lit windows (people live here), a door with an orange step, and on the
// roof a water tank, an antenna, and a washing line with three bright shirts.
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, line, plot, rows, stamp } from '../helpers.ts';

const W = 30;
const H = 36;
const CX = 15;
const FOOT_Y = 29; // footprint center (the anchor)
const HW = 12; // the block's half-width
const WALL = 15; // wall height

/** The ground-line y under x on the block's front faces (left face rises to the left). */
function groundY(x: number): number {
  return FOOT_Y + HW / 2 - Math.abs(x + 0.5 - CX) / 2;
}

function housingGrid(): string[] {
  const g = grid(W, H);
  isoBox(g, CX, FOOT_Y + 1, HW + 2, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, CX, FOOT_Y, HW, WALL, { top: '3', rim: '4', left: '4', right: '2' });
  // The teal band between storeys, following each face's slope.
  for (let x = CX - HW; x < CX + HW; x++) {
    plot(g, x, Math.round(groundY(x)) - 8, x < CX ? '8' : '7');
  }
  // Windows: two per storey on each face, warm where someone is home.
  const windows: readonly (readonly [number, number, string])[] = [
    [CX - 10, 4, 'L'],
    [CX - 6, 4, 'K'],
    [CX - 10, 11, 'K'],
    [CX - 3, 11, 'L'],
    [CX + 3, 4, '0'],
    [CX + 7, 4, 'J'],
    [CX + 3, 11, 'J'],
    [CX + 7, 11, '0'],
  ];
  for (const [x, up, ch] of windows) {
    const y = Math.round(groundY(x)) - up - 2;
    const slope = x < CX ? 1 : -1; // pixels step with the face
    plot(g, x, y, ch);
    plot(g, x + 1, y + (slope > 0 ? 0 : 0), ch);
    plot(g, x, y + 1, ch);
    plot(g, x + 1, y + 1, ch);
    plot(g, x, y + 2, x < CX ? '3' : '1'); // the sill
    plot(g, x + 1, y + 2, x < CX ? '3' : '1');
  }
  // The door on the lit face, with an orange step.
  const dx = CX - 3;
  const dy = Math.round(groundY(dx));
  for (let y = dy - 5; y < dy; y++) {
    plot(g, dx, y, '1');
    plot(g, dx + 1, y, '0');
  }
  plot(g, dx - 1, dy, 'c');
  plot(g, dx, dy, 'd');
  plot(g, dx + 1, dy, 'c');
  // The roof: a water tank on the left, an antenna on the right, a washing line between them.
  const roofY = FOOT_Y - WALL;
  // prettier-ignore
  stamp(g, CX - 8, roofY - 6, [
    '.333.',
    '34442',
    '34442',
    '34422',
    '.122.',
  ]);
  for (let y = roofY - 9; y <= roofY + 1; y++) plot(g, CX + 7, y, y === roofY - 9 ? '+' : '1');
  line(g, CX - 4, roofY - 5, CX + 6, roofY - 7, '2');
  plot(g, CX - 1, roofY - 5, 'P');
  plot(g, CX - 1, roofY - 4, 'P');
  plot(g, CX + 1, roofY - 6, '8');
  plot(g, CX + 1, roofY - 5, '8');
  plot(g, CX + 3, roofY - 6, 'L');
  plot(g, CX + 3, roofY - 5, 'L');
  return rows(g);
}

export const propHousing = defineSprite({
  id: 'prop.housing',
  size: { w: W, h: H },
  anchor: { x: CX, y: FOOT_Y },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { J: 'orange.3', K: 'gold.4', L: 'orange.4', P: 'pink.3' },
  frames: { v0: housingGrid() },
});
