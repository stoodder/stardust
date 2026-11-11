// Asset Recovery Gunship (`gunship`, design/enemies.md § 5.3): Everglow Security's flyer (Act III),
// armored. Everglow's shape language (art-direction §4) airborne: a wide white twin-rotor pod with a
// teal canopy at its nose, steel armor plates bolted along its belly, stub wings carrying an orange
// rocket pod each, a tail boom with a fin, an orange nav lamp, and, slung under it on a cable, the
// **recovery claw** it came for your colony's assets with (three steel prongs). Its two rotors are
// long blurred blades on masts over each end. Wide and flat where Gerald is a round capsule on one
// mast and the Puffwing a fluff ball: no other flyer has two rotors or a claw. Render lifts it 12 px
// over its shadow (tech-spec § Sprite anchoring), so the frame is the craft alone.
// - `walk_<facing>` (4 frames, 12 fps; a flyer's "walk" is its rotors): the blades turn (long,
//   blurred, long the other way, blurred), the claw sways on its cable, the nav lamp blinks.
// No death frames: Everglow Security shuts down (render's `shutdown`).
import { defineSprite } from '../defineSprite.ts';
import { grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 26;
const H = 17;
const CX = 13;

/** One rotor over (x, y): a long blade or its blur, by step. */
function rotor(g: CharGrid, x: number, y: number, step: number, wide: number): void {
  plot(g, x, y + 1, '1'); // the mast
  plot(g, x, y, '2'); // the hub
  if (step % 2 === 0) {
    // A long blade, level on step 0 and tipped a pixel on step 2.
    const tilt = step === 0 ? 0 : 1;
    line(g, x - wide, y - tilt, x - 1, y, '3');
    line(g, x + 1, y, x + wide, y + tilt, '4');
  } else {
    // The blur: a faint dotted disc edge, both sides.
    for (let k = 1; k <= wide; k += 2) {
      plot(g, x - k, y, '2');
      plot(g, x + k, y, '2');
    }
    plot(g, x - wide, y, 'w');
  }
}

function gunship(facing: 'se' | 'ne', step: 0 | 1 | 2 | 3): string[] {
  const g: CharGrid = grid(W, H);
  const se = facing === 'se';
  // The tail boom and fin (behind: left facing SE, right from behind).
  const tail = se ? 1 : W - 6;
  line(g, se ? 2 : 19, 7, se ? 7 : 24, 7, '2');
  line(g, se ? 2 : 19, 8, se ? 7 : 24, 8, '1');
  stamp(g, tail, 3, se ? ['1....', '21...', '321..', '3221.'] : ['....1', '...12', '..123', '.1223']);
  // The pod: white paint lit from the upper left, steel belly plates.
  for (let y = 5; y <= 11; y++) {
    for (let x = 6; x <= 20; x++) {
      const dx = (x + 0.5 - 13.5) / 7.6;
      const dy = (y + 0.5 - 8.5) / 3.8;
      if (dx * dx + dy * dy > 1) continue;
      let ch = dx + dy < -0.6 ? '4' : dx < 0.45 ? '3' : '2';
      if (y >= 10) ch = (x + y) % 3 === 0 ? '0' : '1'; // the belly armor, bolted
      plot(g, x, y, ch);
    }
  }
  // A hazard band round its waist.
  for (let x = 8; x <= 19; x++) plot(g, x, 9, (x + step) % 4 < 2 ? 'c' : 'x');
  if (se) {
    // The teal canopy at the nose, a glint riding it; the logo chevron on its flank.
    stamp(g, 16, 5, ['.677', '67778', '.6667']);
    plot(g, 18, 6, 'w');
    stamp(g, 9, 6, ['8.8', '.8.']);
  } else {
    // From behind: the rear hatch and two teal thruster vents.
    stamp(g, 9, 6, ['1111', '1001', '1111']);
    plot(g, 15, 7, '+');
    plot(g, 17, 7, step % 2 === 0 ? '*' : '+');
  }
  // Stub wings with an orange rocket pod each (near and far).
  stamp(g, 4, 9, ['112', 'bcd']);
  stamp(g, 19, 9, ['211', 'dcb']);
  plot(g, se ? 21 : 4, 10, 'e');
  // The rotors on their masts, out of step by a frame.
  rotor(g, 9, 2, step, 6);
  rotor(g, 18, 2, (step + 1) % 4, 6);
  // The nav lamp, blinking orange.
  plot(g, se ? 20 : 6, 6, step < 2 ? 'e' : 'c');
  // The recovery claw on its cable, swaying a pixel.
  const sway = step === 1 ? -1 : step === 3 ? 1 : 0;
  line(g, CX, 12, CX + sway, 14, '1');
  stamp(g, CX - 2 + sway, 14, ['.333.', '3.2.3', '3...3']);
  return rows(g);
}

export const enemyGunship = defineSprite({
  id: 'enemy.gunship',
  size: { w: W, h: H },
  anchor: { x: CX, y: H - 1 },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    walk_se_0: gunship('se', 0),
    walk_se_1: gunship('se', 1),
    walk_se_2: gunship('se', 2),
    walk_se_3: gunship('se', 3),
    walk_ne_0: gunship('ne', 0),
    walk_ne_1: gunship('ne', 1),
    walk_ne_2: gunship('ne', 2),
    walk_ne_3: gunship('ne', 3),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2', 'walk_se_3'], fps: 12 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2', 'walk_ne_3'], fps: 12 },
    walk_nw: { mirrorOf: 'walk_ne' },
  },
});
