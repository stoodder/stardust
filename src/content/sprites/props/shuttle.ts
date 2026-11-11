// Director Sterling's shuttle (`prop.shuttle`; A3M2 decor, act3.md § A3M2, marker `shuttle_pad`):
// an Everglow executive shuttle parked on its pad in the dark band north-east of the plaza, lights
// on, waiting to take her away; it lifts during W12 (`a3_m02_cue_shuttle`) and its lights cross
// the sky. Clean white and teal like all Everglow kit, with gold trim (the executive model), so it
// is the one bright, cared-for thing on the map.
// - The **pad** (`pad`): a steel landing slab with a hazard-striped rim, landing marks, and a teal
//   lamp at each corner.
// - `parked_0`/`parked_1` (anim `parked`, 2 fps): the pad with the shuttle standing on it on three
//   legs, its cabin lit warm, the nav lights trading (alarm red on the left wingtip, teal on the
//   right, a white strobe on the tail) under 3 Hz.
// - `ship_0`/`ship_1` (anim `lift`, 6 fps): the shuttle alone, legs tucked, two lift jets firing
//   down (white heart, gold, orange), drawn at the same anchor as `parked` so render can swap the
//   pad to `pad` and lift the ship from where it stood (T630b).
import { defineSprite } from '../defineSprite.ts';
import { grid, isoBox, line, plot, rows, type CharGrid } from '../helpers.ts';

const W = 48;
const H = 46;
/** The anchor: the pad's center on the ground. */
const AX = 24;
const AY = 36;
/** How far the hull's belly sits over the pad (its legs' height). */
const LEGS = 5;

function pad(g: CharGrid): void {
  isoBox(g, AX, AY + 1, 19, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, AX, AY, 18, 2, { top: '2', rim: '3', left: '1', right: '0' });
  // The hazard rim on the two front faces: orange and ink stripes.
  for (let x = AX - 18; x < AX + 18; x++) {
    const y = AY + 1 + Math.floor(-Math.abs(x + 0.5 - AX) / 2) + 9;
    if (g[y - 1]?.[x] === '1' || g[y - 1]?.[x] === '0')
      plot(g, x, y - 1, Math.floor((x + 64) / 2) % 2 === 0 ? 'c' : 'k');
  }
  // Landing marks on the top face: a teal ring broken at four points, and a cross.
  for (let i = 0; i < 40; i++) {
    const t = (i / 40) * Math.PI * 2;
    if (i % 10 === 0) continue;
    plot(g, Math.round(AX + Math.cos(t) * 10), Math.round(AY - 2 + Math.sin(t) * 5), '7');
  }
  line(g, AX - 4, AY - 4, AX + 4, AY, '3');
  line(g, AX - 4, AY, AX + 4, AY - 4, '3');
  // Corner lamps.
  for (const [x, y] of [
    [AX - 17, AY - 2],
    [AX + 16, AY - 2],
    [AX - 1, AY - 11],
    [AX - 1, AY + 7],
  ] as const) {
    plot(g, x, y, '+');
    plot(g, x + 1, y, '*');
  }
}

/** The hull's belly row at the ship's center (the legs stand under it). */
const BELLY = AY - 2 - LEGS;

/** The shuttle: a sleek white wedge nosed to the left, a teal canopy, gold trim, a tail fin. */
function ship(g: CharGrid, beat: 0 | 1, flying: boolean): void {
  const cx = AX;
  const by = BELLY;
  if (!flying) {
    // Three legs to the pad, each with a foot.
    for (const lx of [cx - 9, cx + 1, cx + 10]) {
      for (let y = by; y < by + LEGS + (lx === cx + 1 ? 3 : 0); y++) plot(g, lx, y, '1');
      plot(g, lx - 1, by + LEGS + (lx === cx + 1 ? 3 : 0), '0');
      plot(g, lx, by + LEGS + (lx === cx + 1 ? 3 : 0), '0');
    }
  } else {
    // The lift jets: two plumes down from the belly, flickering.
    for (const jx of [cx - 7, cx + 7]) {
      const len = 7 + beat * 2;
      for (let k = 0; k < len; k++) {
        const half = k < 2 ? 1 : k < len - 2 ? 2 : 1;
        for (let dx = -half; dx < half; dx++) {
          const edge = dx === -half || dx === half - 1;
          plot(g, jx + dx, by + 1 + k, k < 2 ? 'Y' : edge || k > len - 3 ? 'F' : 'Y');
        }
        if (k < 3) plot(g, jx - 1 + (k % 2), by + 1 + k, 'w');
      }
    }
  }
  // The hull: a long lozenge, rounded at the tail, pointed at the nose (left).
  for (let x = cx - 18; x <= cx + 17; x++) {
    const t = (x - (cx - 18)) / 35; // 0 at the nose, 1 at the tail
    const half = t < 0.3 ? 1 + t * 16 : 5.8 - Math.max(0, t - 0.85) * 18;
    const mid = by - 6 + Math.round((x - cx) / 6);
    for (let y = Math.round(mid - half); y <= Math.round(mid + half); y++) {
      const up = y < mid - half * 0.3;
      const low = y > mid + half * 0.4;
      plot(g, x, y, low ? (x > cx ? '1' : '2') : up && x < cx + 6 ? 'w' : up ? '4' : '3');
    }
    // The gold pinstripe along the hull's waist.
    plot(g, x, mid + Math.round(half * 0.25), 'G');
    // The teal belly band.
    if (x > cx - 12) plot(g, x, Math.round(mid + half), '7');
  }
  // The canopy: a teal glass slope behind the nose, a glint, the cabin lit warm behind it.
  for (let x = cx - 12; x <= cx - 4; x++) {
    const mid = by - 6 + Math.round((x - cx) / 6);
    for (let y = mid - 5; y <= mid - 3; y++)
      plot(g, x, y, x < cx - 9 ? '9' : y === mid - 5 ? '9' : '8');
  }
  plot(g, cx - 10, by - 12, 'w');
  for (const wx of [cx - 1, cx + 3, cx + 7]) {
    const y = by - 6 + Math.round((wx - cx) / 6) - 2;
    plot(g, wx, y, 'H');
    plot(g, wx + 1, y, 'Y');
  }
  // The tail fin, swept back, its tip gold; the Everglow chevron on it.
  for (let k = 0; k < 7; k++) {
    const y = by - 10 - k;
    for (let x = cx + 11 + Math.floor(k / 2); x <= cx + 15 + Math.floor(k / 3); x++)
      plot(g, x, y, k === 6 ? 'G' : x === cx + 11 + Math.floor(k / 2) ? 'w' : '3');
  }
  plot(g, cx + 13, by - 12, 'c');
  plot(g, cx + 14, by - 13, 'c');
  // Stub wings: one toward the viewer, one behind; nav lights at their tips.
  for (let k = 0; k < 6; k++) {
    plot(g, cx - 2 + k, by - 1 + Math.floor(k / 2), k === 5 ? '1' : '2');
    plot(g, cx - 1 + k, by - 1 + Math.floor(k / 2), '3');
  }
  line(g, cx + 2, by - 12, cx + 6, by - 14, '2');
  const redOn = beat === 0;
  plot(g, cx + 4, by + 2, redOn ? 'R' : 'Q');
  plot(g, cx + 7, by - 15, redOn ? '6' : '+');
  // The tail strobe: white on the second beat.
  plot(g, cx + 17, by - 8, redOn ? '3' : 'w');
}

function frame(kind: 'pad' | 'parked' | 'ship', beat: 0 | 1 = 0): string[] {
  const g = grid(W, H);
  if (kind !== 'ship') pad(g);
  if (kind !== 'pad') ship(g, beat, kind === 'ship');
  return rows(g);
}

export const propShuttle = defineSprite({
  id: 'prop.shuttle',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  // Gold trim, the cabin's warm light, the jets' gold and orange, the nav light's alarm red.
  legend: { G: 'gold.3', H: 'gold.4', Y: 'gold.4', F: 'orange.3', R: 'red.3', Q: 'red.1' },
  frames: {
    pad: frame('pad'),
    parked_0: frame('parked', 0),
    parked_1: frame('parked', 1),
    ship_0: frame('ship', 0),
    ship_1: frame('ship', 1),
  },
  anims: {
    parked: { frames: ['parked_0', 'parked_1'], fps: 2 },
    lift: { frames: ['ship_0', 'ship_1'], fps: 6 },
  },
});
