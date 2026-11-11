// Auditor (`auditor`, design/enemies.md § 5.3 and § 4): Everglow Security's jammer (A3M5 on), on
// Compliance Officer Prim's chassis (story/characters.md: "Auditor units carry its chassis";
// art-direction §5's `prim` portrait): a boxy white head-box with one wide dark visor whose two
// orange LED eyes are the Auditor colour (§8, never QUILL's teal), a tall steel mast topped with a
// white jammer beacon (D151: a `white.1` cross in the outline's 1 px of ink, so it reads against
// Act III's violet crystals) round a violet heart that pulses a step each stride, over a violet
// collar (the jam's violet, the Silencer's tendril's: with the mast, what sets it apart from the
// Compliance Drone at 1×, D150), an orange audit lamp on its crown, a hazard-striped collar, and
// her clipboard held out on a thin arm. A walker of a kind: the box rides a little tracked base, its tread lugs rolling. Squat on
// treads where the Compliance Drone struts on legs and the Expediter balances on a wheel.
// - `walk_<facing>` (4 frames, 8 fps): the treads roll (the lugs step along), the box nods.
// - `tell_<facing>` (2 frames, 4 fps; its ring tell, enemyPose `tell`): it stops and audits: the
//   mast telescopes up and the beacon opens into a white emitter ring round its violet core that
//   flares wider on the second frame, throwing violet sparks (never orange: the Compliance Drone's
//   antenna is), the LED eyes go wide and bright, the clipboard comes up (render's JamRingView
//   grows the ring itself).
// No death frames: Everglow Security shuts down (render's `shutdown`).
import { defineSprite } from '../defineSprite.ts';
import { grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 16;
/** Rows above the box for the mast and its beacon (and the tell's emitter over them). */
const Y = 5;
const H = 20 + Y;
const AX = 7;
const AY = H - 1;

type Look = 'walk' | 'tell';

function auditor(facing: 'se' | 'ne', step: 0 | 1 | 2 | 3, look: Look): string[] {
  const g: CharGrid = grid(W, H);
  const se = facing === 'se';
  const tell = look === 'tell';
  const nod = !tell && step % 2 === 1 ? 1 : 0;
  // The tracked base: a dark belt round two steel wheels, its lugs stepping back as it rolls.
  for (let x = 2; x <= 12; x++) {
    plot(g, x, Y + 16, '2');
    plot(g, x, Y + 19, '0');
    const lug = (x + (tell ? 0 : step)) % 3 === 0;
    plot(g, x, Y + 17, lug ? '0' : '1');
    plot(g, x, Y + 18, lug ? '0' : '1');
  }
  plot(g, 1, Y + 17, '1');
  plot(g, 1, Y + 18, '0');
  plot(g, 13, Y + 17, '1');
  plot(g, 13, Y + 18, '0');
  // Wheel hubs, lit, and the steel neck up to the box.
  plot(g, 4, Y + 17, '3');
  plot(g, 10, Y + 17, '3');
  line(g, 6, Y + 15, 8, Y + 15, '1');
  // The box: white paint lit from the upper left, rounded corners, a steel panel line.
  const top = Y + 5 + nod;
  for (let y = top; y < top + 9; y++) {
    for (let x = 2; x < 13; x++) {
      const corner = (y === top || y === top + 8) && (x === 2 || x === 12);
      if (corner) continue;
      const lit = x + (y - top) < 8 ? '4' : x < 10 ? '3' : '2';
      plot(g, x, y, lit);
    }
  }
  // The hazard-striped collar along its bottom edge.
  for (let x = 3; x < 12; x++) plot(g, x, top + 8, (x + 1) % 4 < 2 ? 'c' : 'x');
  // The mast (telescoped up in the tell, an emitter ring round its beacon) and the audit lamp.
  const ax = se ? 9 : 5;
  if (tell) {
    line(g, ax, top - 1, ax, 2, '3');
    plot(g, ax, 3, 'V');
    // The emitter: a white ring round the violet core, flaring wider on the second frame.
    if (step === 0) {
      stamp(g, ax - 1, 0, ['www', 'wUw', 'www']);
    } else {
      stamp(g, ax - 2, 0, ['.www.', 'wwUww', '.www.']);
      plot(g, ax - 3, 1, 'V');
      plot(g, ax + 3, 1, 'V');
    }
  } else {
    // A tall steel mast, lit on its near side, its violet collar, and the white beacon over it,
    // its violet heart pulsing a step each stride.
    line(g, ax, top - 1, ax, top - 5, '2');
    plot(g, ax, top - 2, '3');
    plot(g, ax, top - 5, 'V');
    stamp(g, ax - 1, top - 8, ['.w.', step % 2 === 0 ? 'wVw' : 'wUw', '.w.']);
  }
  plot(g, se ? 5 : 9, top - 1, tell || step === 0 ? 'e' : 'd');
  if (se) {
    // One wide dark visor across its front, two orange LED eyes (wide and bright in the tell).
    line(g, 4, top + 2, 12, top + 2, 'k');
    line(g, 4, top + 3, 12, top + 3, 'k');
    if (tell) {
      stamp(g, 6, top + 2, ['ee', 'dd']);
      stamp(g, 10, top + 2, ['ee', 'dd']);
    } else {
      plot(g, 7, top + 2, 'd');
      plot(g, 10, top + 2, 'd');
      plot(g, 7, top + 3, 'c');
      plot(g, 10, top + 3, 'c');
    }
    plot(g, 5, top + 2, 'w');
    // The speaker grille under the visor, and Everglow's teal chevron on its flank.
    line(g, 7, top + 5, 10, top + 5, '1');
    stamp(g, 3, top + 5, ['8.8', '.8.']);
    // The clipboard held out on a thin arm (raised in the tell): paper, lines, a steel clip.
    const cy = tell ? top + 1 : top + 5 + (step % 2);
    line(g, 12, top + 6, 13, cy + 2, '1');
    stamp(g, 13, cy, ['11.', '444', '424', '444', '424']);
  } else {
    // From behind: a vent grille and a status lamp; the clipboard on the near flank.
    stamp(g, 4, top + 2, ['000000', '111111', '000000']);
    plot(g, 10, top + 2, '+');
    stamp(g, 9, top + 5, ['8.8', '.8.']);
    const cy = tell ? top + 1 : top + 5 + (step % 2);
    line(g, 2, top + 6, 1, cy + 2, '1');
    stamp(g, 0, cy, ['.11', '444', '424', '444', '424']);
  }
  return rows(g);
}

export const enemyAuditor = defineSprite({
  id: 'enemy.auditor',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { V: 'violet.3', U: 'violet.4' },
  frames: {
    walk_se_0: auditor('se', 0, 'walk'),
    walk_se_1: auditor('se', 1, 'walk'),
    walk_se_2: auditor('se', 2, 'walk'),
    walk_se_3: auditor('se', 3, 'walk'),
    walk_ne_0: auditor('ne', 0, 'walk'),
    walk_ne_1: auditor('ne', 1, 'walk'),
    walk_ne_2: auditor('ne', 2, 'walk'),
    walk_ne_3: auditor('ne', 3, 'walk'),
    tell_se_0: auditor('se', 0, 'tell'),
    tell_se_1: auditor('se', 1, 'tell'),
    tell_ne_0: auditor('ne', 0, 'tell'),
    tell_ne_1: auditor('ne', 1, 'tell'),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2', 'walk_se_3'], fps: 8 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2', 'walk_ne_3'], fps: 8 },
    walk_nw: { mirrorOf: 'walk_ne' },
    tell_se: { frames: ['tell_se_0', 'tell_se_1'], fps: 4 },
    tell_sw: { mirrorOf: 'tell_se' },
    tell_ne: { frames: ['tell_ne_0', 'tell_ne_1'], fps: 4 },
    tell_nw: { mirrorOf: 'tell_ne' },
  },
});
