// The Deep Bore's rig (`prop.bore_rig`; design/maps.md § 5.5 *The Deep Bore*, finale.md § FIN: "the
// east band holds the Deep Bore rig and its progress bar"; art-direction §6 *Deep Bore*): Everglow's
// last drill, DB-1, on the `bore_rig` marker beside the Bore road. Heavier and newer than the colony's
// pump rigs: a hazard-striped steel deck over the **bore mouth** (a dark shaft whose rim burns cold
// violet: drill spoil is unsung, art-direction §1 principle 6), four braced legs up to a crown
// block with an orange hazard beacon and a sheave, and a cable down to the drill head. The head is
// `fx.bore_head`, hung in the rig as a tower's head sits on its base: render draws it with its
// anchor (the auger's tip) at this sprite's `mount`, over the mouth (T831 plays its `idle`, `drill`
// and `breach`). Violet tailings heap at its left foot.
//
// **The bar** is the rig's own depth gauge, a steel post at its right front leg holding a glass tube
// that fills cold violet from the bottom as the Bore runs: frames `g0`–`g8` (eighths full; render
// picks `boreGaugeFrame(filled)`), and `full_0`/`full_1` (`full`, 2 fps) when it breaks through, the
// tube burning white and the beacon flashing.
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 40;
const H = 64;
const CX = 20;
const FOOT_Y = 56;
/** Where the drill head's anchor (the auger's tip) hangs: just over the bore mouth. */
export const BORE_MOUNT = { x: CX, y: FOOT_Y - 3 } as const;
/** The gauge's tube: its column, its bottom row, and its height in px (8 steps of 2). */
const GAUGE_X = 34;
const GAUGE_BOTTOM = FOOT_Y - 4;
const GAUGE_STEPS = 8;
const GAUGE_PX = 2;

/** The gauge frame for a fill of `filled` (0–1): `g0`–`g8`, by whole eighths (full: `g8`). */
export function boreGaugeFrame(filled: number): string {
  const k = Math.max(0, Math.min(GAUGE_STEPS, Math.floor(filled * GAUGE_STEPS + 1e-9)));
  return `g${k}`;
}

function rigGrid(fill: number, full: 0 | 1 | null): string[] {
  const g: CharGrid = grid(W, H);
  // The ground shadow and the deck: hazard-striped round its lip.
  isoBox(g, CX, FOOT_Y + 1, 17, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, CX, FOOT_Y, 15, 3, { top: '2', rim: '3', left: '1', right: '0' });
  for (let x = CX - 15; x < CX + 15; x++) {
    const y = FOOT_Y + Math.round(7.5 - Math.abs(x + 0.5 - CX) / 2) - 3;
    plot(g, x, y + 1, Math.floor((x + 40) / 2) % 2 === 0 ? 'O' : 'K');
  }
  // The bore mouth: a dark shaft in the deck, its rim burning cold violet.
  for (let y = FOOT_Y - 6; y <= FOOT_Y + 1; y++) {
    for (let x = CX - 8; x <= CX + 8; x++) {
      const d = Math.abs(x + 0.5 - CX) / 7 + Math.abs(y + 0.5 - (FOOT_Y - 2.5)) / 3.5;
      if (d <= 0.62) plot(g, x, y, 'Z');
      else if (d <= 0.82) plot(g, x, y, y < FOOT_Y - 3 ? 'V' : 'U');
      else if (d <= 1) plot(g, x, y, 'Y');
    }
  }
  // Four legs from the deck's corners, leaning in to the crown; X-braces on the back pair.
  const top = 6;
  const base = FOOT_Y - 3;
  const legs: readonly (readonly [number, number, string])[] = [
    [CX - 13, base, '3'], // left corner
    [CX + 12, base, '1'], // right corner
    [CX - 5, base - 5, '2'], // back left
    [CX + 4, base - 5, '1'], // back right
  ];
  for (const [x0, y0, ch] of legs) line(g, x0, y0, x0 < CX ? CX - 3 : CX + 2, top + 4, ch);
  for (let y = top + 8; y + 8 < base - 5; y += 8) {
    const at = (yy: number, side: -1 | 1): number => {
      const t = (base - 5 - yy) / (base - 5 - top - 4);
      return Math.round(side < 0 ? CX - 5 + 2 * t : CX + 4 - 2 * t);
    };
    line(g, at(y, -1), y, at(y + 8, 1), y + 8, '0');
    line(g, at(y, 1), y, at(y + 8, -1), y + 8, '0');
  }
  // The crown block, its sheave, and the hazard beacon (flashing at the breakthrough).
  stamp(g, CX - 4, top + 1, ['.444443.', '43333221', '2O.KO.K1', '.111100.']);
  plot(g, CX - 1, top + 2, 'w');
  const beacon = full === 0 ? ['.Q.', 'QWQ', '.Q.'] : ['.O.', 'OQO', '.O.'];
  stamp(g, CX - 2, top - 3, beacon);
  // The cable from the sheave down to where the head hangs.
  for (let y = top + 5; y < BORE_MOUNT.y - 27; y++) plot(g, CX, y, y % 2 === 0 ? '1' : '2');
  // A status lamp on the crown (teal while it runs: the palette's emissives, so it glows).
  plot(g, CX + 3, top + 2, '+');
  // The gauge: a steel post at the right front leg, a glass tube on it filling violet from below.
  const gTop = GAUGE_BOTTOM - GAUGE_STEPS * GAUGE_PX;
  for (let y = gTop - 2; y <= FOOT_Y + 1; y++) {
    plot(g, GAUGE_X + 2, y, '1');
    plot(g, GAUGE_X - 2, y, y >= gTop - 1 && y <= GAUGE_BOTTOM + 1 ? '3' : '.');
  }
  stamp(g, GAUGE_X - 2, gTop - 3, ['OOOO.', 'KKKK1']);
  stamp(g, GAUGE_X - 2, GAUGE_BOTTOM + 1, ['3221.']);
  const lit = Math.round(fill * GAUGE_STEPS) * GAUGE_PX;
  for (let k = 0; k < GAUGE_STEPS * GAUGE_PX; k++) {
    const y = GAUGE_BOTTOM - k;
    const on = k < lit;
    const c = full !== null ? (full === 0 ? 'W' : 'U') : on ? (k === lit - 1 ? 'U' : 'V') : 'Z';
    plot(g, GAUGE_X - 1, y, c);
    plot(g, GAUGE_X, y, c === 'Z' ? 'Z' : full !== null ? c : 'V');
    plot(g, GAUGE_X + 1, y, k % (GAUGE_PX * 2) === 0 ? '3' : c === 'Z' ? 'Z' : 'V');
  }
  // Violet tailings heaped at its left foot, drill spoil from the oldest dead.
  // prettier-ignore
  stamp(g, CX - 19, FOOT_Y - 4, [
    '...NN...',
    '..NVNM..',
    '.NMUMVM.',
    'NMMMVMM_',
  ]);
  return rows(g);
}

const GAUGE: Record<string, string[]> = {};
for (let k = 0; k <= GAUGE_STEPS; k++) GAUGE[`g${k}`] = rigGrid(k / GAUGE_STEPS, null);

export const propBoreRig = defineSprite({
  id: 'prop.bore_rig',
  size: { w: W, h: H },
  anchor: { x: CX, y: FOOT_Y },
  // Everglow-owned: its own colours in every act (groundTiles' OWN_PALETTE).
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  mount: BORE_MOUNT,
  legend: {
    K: 'ink.1',
    M: 'steel.1',
    N: 'steel.2',
    O: 'orange.3',
    Q: 'orange.4',
    U: 'violet.4',
    V: 'violet.3',
    W: 'white.1',
    Y: 'violet.1',
    Z: 'ink.0',
  },
  frames: {
    ...GAUGE,
    full_0: rigGrid(1, 0),
    full_1: rigGrid(1, 1),
  },
  anims: {
    full: { frames: ['full_0', 'full_1'], fps: 2 },
  },
});
