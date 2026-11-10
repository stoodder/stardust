// Brood Hauler (`hauler`): a big, slow Skitterkin waddling under a glittering sack, with broad
// pale steel shell plates (heavy armor, in the `armored` tell's `steel.4`). The sack on its back is the `carrier` tell (art-direction
// §8: a pack on the back). Act I sells it as stolen stardust; it is a cluster of young.
import { defineSprite } from '../defineSprite.ts';
import { DEATH_ANIM, deathFrames } from './death.ts';
import { at, fromRows, line, plot, rows, type CharGrid } from '../helpers.ts';
import { sack, SACK_LEGEND, type SackShape, YOUNG_HEADROOM, youngHeads } from './sack.ts';
import { EYE, finish, skitterBody } from './skitter.ts';

const W = 28;
const H = 25;

/**
 * Broad shell plates over the body's upper half: each plate a steel face (`T`) with a lit top
 * edge (`S`) and a dark seam (`1`) between plates. Bigger and flatter than Chonk's scutes.
 */
function plates(
  g: CharGrid,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  facing: 'se' | 'ne',
): void {
  const top = Math.ceil(cy - ry);
  for (let y = top; y < cy + 1; y++) {
    for (let x = 0; x < W; x++) {
      const ch = at(g, x, y);
      if (ch === '.' || ch === '7' || ch === '8' || ch === '9') continue;
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (Math.hypot(dx, dy) > 0.9) continue;
      if (facing === 'se' && dx > 0.42) continue; // keep the face clear
      // Three plates side by side, seams curving with the shell.
      const u = dx + dy * dy * 0.25;
      const seam = Math.abs(u + 0.33) < 0.05 || Math.abs(u - 0.33) < 0.05;
      if (seam) plot(g, x, y, '1');
      else if (y === top || at(g, x, y - 1) === '.' || at(g, x, y - 1) === '1') plot(g, x, y, 'S');
      else plot(g, x, y, dy < -0.45 ? 'S' : 'T');
    }
  }
}

/**
 * One Hauler frame. `young` (Act II's fleeing Hauler, enemy.brood_hauler_fleeing): its sack is
 * untied and the young show in its mouth.
 */
export function hauler(facing: 'se' | 'ne', step: 0 | 1, young = false): string[] {
  const sink = step === 1 ? 1 : 0; // the planted, heavy step squashes the body
  const cx = 14;
  const cy = 17 + sink * 0.5;
  const rx = 12.5 + sink * 0.5;
  const ry = 6.5 - sink * 0.5;
  const g = skitterBody({ w: W, h: H, cx, cy, rx, ry, facing, belly: 0.5 });
  plates(g, cx, cy, rx, ry, facing);
  // prettier-ignore
  const legs =
    step === 0
      ? ['.11...11....11...11..11.', '.00...00....00...00..00.']
      : ['11...11....11...11..11..', '00...00....00...00..00..'];
  if (facing === 'se') {
    // The sack rides on the back (upper left), bobbing a step behind the body.
    const bag: SackShape = {
      cx: 9.5,
      cy: 9 + (1 - sink),
      rx: 6,
      ry: 5.5,
      twinkle: step,
      ...(young ? { young: 'se' as const } : {}),
    };
    sack(g, bag);
    // The rope strap from the sack's neck across the shell to the chest.
    line(g, 13, 6 + (1 - sink), 20, 18 + sink, 'R');
    return withYoung(
      bag,
      step,
      finish(g, [
        [2, H - 2, legs],
        [19, 14 + sink, EYE],
        [23, 14 + sink, EYE],
        [21, 17 + sink, ['kk']],
        // A moss tuft peeking over the brow plate.
        [21, 11 + sink, ['.dc', 'cdb']],
        // The brow plate over the eyes.
        [18, 12 + sink, ['SSTT.TT']],
      ]),
    );
  }
  // Seen from behind, the sack is most of the silhouette.
  const bag: SackShape = {
    cx: 14,
    cy: 9.5 + (1 - sink),
    rx: 8,
    ry: 7,
    twinkle: step,
    ...(young ? { young: 'ne' as const } : {}),
  };
  sack(g, bag);
  line(g, 8, 14 + sink, 6, 20 + sink, 'R');
  line(g, 20, 14 + sink, 22, 20 + sink, 'R');
  return withYoung(
    bag,
    step,
    finish(g, [
      [2, H - 2, legs],
      [3, 17 + sink, ['+.', '.*']],
      [23, 17 + sink, ['.+', '*.']],
    ]),
  );
}

/** A fleeing Hauler's frame (D134): YOUNG_HEADROOM rows taller, its young over the sack's rim. */
function withYoung(bag: SackShape, step: 0 | 1, frame: string[]): string[] {
  if (bag.young === undefined) return frame;
  const w = frame[0]?.length ?? W;
  const g = fromRows([...Array<string>(YOUNG_HEADROOM).fill('.'.repeat(w)), ...frame]);
  youngHeads(g, bag, YOUNG_HEADROOM, step);
  return rows(g);
}

/** The fleeing Hauler's canvas and ground point: YOUNG_HEADROOM rows over the Hauler's. */
export const HAULER_YOUNG_SIZE = { w: W, h: H + YOUNG_HEADROOM } as const;
export const HAULER_YOUNG_ANCHOR = { x: 14, y: 24 + YOUNG_HEADROOM } as const;

export const enemyBroodHauler = defineSprite({
  id: 'enemy.brood_hauler',
  size: { w: W, h: H },
  anchor: { x: 14, y: 24 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { S: 'white.0', T: 'steel.4', ...SACK_LEGEND },
  frames: {
    walk_se_0: hauler('se', 0),
    walk_se_1: hauler('se', 1),
    walk_ne_0: hauler('ne', 0),
    walk_ne_1: hauler('ne', 1),
    ...deathFrames(hauler('se', 0), { x: 14, y: 24 }),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 5 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 5 },
    walk_nw: { mirrorOf: 'walk_ne' },
    death: DEATH_ANIM,
  },
});
