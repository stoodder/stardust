// The Deep Bore's drill head (`fx.bore_head`; design/maps.md § 5.5 *The Deep Bore*; art-direction
// §6 *Deep Bore*): the moving part of Everglow's last drill, hung in T842's `prop.bore_rig` the way
// a tower's head sits on its base (the rig places this sprite's anchor, the auger's tip, at its
// mount over the bore mouth). An Everglow motor housing (steel, lit on its left face, a hazard
// stripe of orange and ink across its front, a status lamp), a collared shaft, and the auger: a
// cone of steel flights narrowing to the bit, glowing cold violet (`stardust.unsung`: drill spoil is
// unsung, §1 principle 6) where it bites.
// - `idle`: stopped, its lamp dark, the bit dull (a Bore that isn't running: Phase 2 on).
// - `drill_0`–`drill_3` (`drill`, 10 fps): the flights spiral down a pixel a frame, the lamp
//   blinks orange, violet spoil spits from the bit.
// - `breach_0`–`breach_2` (`breach`, 8 fps, once): the breakthrough: the bit punches through, cold
//   violet light bursting up round it, wider each frame.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, plot, rows, type CharGrid } from '../helpers.ts';

const W = 15;
const H = 27;
const CX = 7;
/** The auger's rows: from the collar down to the bit (the anchor's row). */
const AUGER_TOP = 11;

type Look = 'idle' | 'drill' | 'breach';

/** The spoil spat from the bit on each drill frame (dx, dy from the tip). */
const SPECKS: readonly (readonly (readonly [number, number])[])[] = [
  [
    [-3, -1],
    [4, -3],
    [-5, -4],
  ],
  [
    [3, -1],
    [-4, -2],
    [5, -5],
  ],
  [
    [-2, -3],
    [4, -1],
    [-6, -2],
  ],
  [
    [2, -4],
    [-3, -1],
    [6, -3],
  ],
];

function head(look: Look, step: number): string[] {
  const g: CharGrid = grid(W, H);
  // The motor housing: a top face, a lit left face and a shaded right one.
  for (let y = 0; y < 8; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (y < 2) plot(g, x, y, x === 1 || x === W - 2 ? 'D' : 'E');
      else plot(g, x, y, x < CX ? 'C' : x === CX ? 'D' : 'B');
    }
  }
  // The hazard stripe across its front: orange and ink on the diagonal.
  for (let x = 1; x < W - 1; x++) plot(g, x, 5, (x + 5) % 4 < 2 ? 'O' : 'K');
  // The status lamp: dark when stopped, blinking orange while it drills, violet at the breach.
  const lamp = look === 'idle' ? 'A' : look === 'breach' ? 'U' : step % 2 === 0 ? 'Q' : 'O';
  plot(g, 3, 3, lamp);
  plot(g, 4, 3, look === 'idle' ? 'B' : 'D');
  // The collar and the shaft.
  for (let x = CX - 2; x <= CX + 2; x++) plot(g, x, 8, x < CX ? 'D' : 'B');
  for (let y = 9; y < AUGER_TOP; y++) {
    plot(g, CX - 1, y, 'C');
    plot(g, CX, y, 'D');
    plot(g, CX + 1, y, 'B');
  }
  // The auger: a cone narrowing to the bit, its flights spiralling down as it turns.
  const turn = look === 'drill' ? step : 0;
  const tip = H - 1;
  for (let y = AUGER_TOP; y <= tip; y++) {
    const hw = Math.round(5 - ((y - AUGER_TOP) * 5) / (tip - AUGER_TOP));
    for (let x = CX - hw; x <= CX + hw; x++) {
      const flight = (x - CX + 2 * (y - turn)) % 4;
      const lit = ((flight % 4) + 4) % 4 < 2;
      plot(g, x, y, lit ? (x < CX ? 'E' : 'D') : x < CX ? 'C' : 'A');
    }
  }
  // The bit, biting: unsung violet where it meets the rock.
  plot(g, CX, tip, look === 'idle' ? 'B' : 'U');
  plot(g, CX, tip - 1, look === 'idle' ? 'C' : 'V');
  if (look === 'drill') {
    // Spoil spitting from the bit, different every frame.
    const specks = SPECKS[step] ?? [];
    for (const [dx, dy] of specks) {
      const x = CX + dx;
      const y = tip + dy;
      if ((g[y]?.[x] ?? '.') === '.') plot(g, x, y, (dx + dy) % 2 === 0 ? 'U' : 'V');
    }
  }
  if (look === 'breach') {
    // Cold violet light bursting up round the bit, wider each frame, white at its heart.
    const r = 2.5 + step * 2;
    disc(g, CX + 0.5, tip + 0.5, r, (d, x, y) => {
      if ((x + y + step) % 3 === 0 && d > r - 1.5) return '.';
      return d < 1.5 ? 'W' : d < r * 0.6 ? 'U' : 'V';
    });
  }
  return rows(g);
}

export const fxBoreHead = defineSprite({
  id: 'fx.bore_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: H - 1 },
  palette: 'everglow',
  outline: 'auto',
  legend: {
    A: 'steel.0',
    B: 'steel.1',
    C: 'steel.2',
    D: 'steel.3',
    E: 'steel.4',
    O: 'orange.3',
    Q: 'orange.4',
    K: 'ink.1',
    V: 'violet.3',
    U: 'violet.4',
    W: 'white.1',
  },
  frames: {
    idle: head('idle', 0),
    drill_0: head('drill', 0),
    drill_1: head('drill', 1),
    drill_2: head('drill', 2),
    drill_3: head('drill', 3),
    breach_0: head('breach', 0),
    breach_1: head('breach', 1),
    breach_2: head('breach', 2),
  },
  anims: {
    idle: { frames: ['idle'], fps: 1 },
    drill: { frames: ['drill_0', 'drill_1', 'drill_2', 'drill_3'], fps: 10 },
    breach: { frames: ['breach_0', 'breach_1', 'breach_2'], fps: 8, loop: false },
  },
});
