// Scuttle Den (`burrow`, design/towers.md § Scuttle Den): a warren mound where refugee families
// shelter, given by the warrens after A2M6 ("they are not purchased; they are given"). **A home**
// (towers.md §8): a dome of warm earth capped in green moss, a round dark doorway at its front with
// a teal woven curtain tied back beside it (the alliance's teal), a gold glowworm lantern hung by
// the door, and a little round window glowing on its flank. It doesn't aim: its swarmlings do the
// fighting (`ally.swarmling`; SwarmView), so its head's idle `peek` is the family at home: two
// eyes shine in the dark doorway, blink, and a resident pokes its head out, then waves a paw
// (towers.md §8: residents peek out and wave). Tiers read on the base (towers/warrenBase.ts): T2
// raises a little hillock at each side corner, each with its own door; T3 stands a reed post with a
// lantern on the left one. The specs: **Big Family** (`spec_a`, 7 swarmlings) builds the mound out:
// a wider dome with an upper room (a round window with eyes in it) and a second, small door where
// the youngest peeks, over two-storey hillocks with lit windows; **Brave Hearts** (`spec_b`, the
// Champions who leap onto flyers) flies a red pennant from a stick on the dome's crown, and the one
// who peeks out wears the Champions' red headband, over a base with a red pennant at each corner.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W } from './base.ts';
import {
  WARREN_LEGEND,
  dome,
  doorway,
  pennant,
  reedLantern,
  warrenBase,
  warrenSpecBase,
} from './warrenBase.ts';

const W = 26;
const H = 23;
/** The head's anchor (sits on the base's mount, the footing's top face). */
const CX = 13;
const CY = 21;
const SEED = 41;

type Kit = 't1' | 'bigFamily' | 'braveHearts';

/** A hillock at a side corner with a tiny door on its front. */
function hillock(g: CharGrid, x: number, y: number, rx: number, ry: number): void {
  dome(g, x, y, rx, ry, 0.5);
  doorway(g, Math.round(x - 1), Math.round(y + ry * 0.85), 2, 2);
}

/** T2: a hillock at each side corner. */
function hillocks(g: CharGrid, cx: number, cy: number): void {
  hillock(g, cx - 10, cy - 2, 3.8, 3.4);
  hillock(g, cx + 10, cy - 1, 3.8, 3.4);
}

/** T3: a reed post with a lantern on the left hillock. */
function lanternReed(g: CharGrid, cx: number, cy: number): void {
  reedLantern(g, cx - 12, cy - 5, cy - 21);
}

/** Big Family's base: two-storey hillocks, a lit window in each upper room. */
function bigFamilyKit(g: CharGrid, cx: number, cy: number): void {
  for (const [x, y] of [
    [cx - 10, cy - 2],
    [cx + 10, cy - 1],
  ] as const) {
    hillock(g, x, y, 4.2, 3.6);
    dome(g, x - 0.5, y - 4.5, 2.6, 2.4, 0.4);
    plot(g, Math.round(x - 1), Math.round(y - 4), '+');
    plot(g, Math.round(x - 2), Math.round(y - 4), '*');
  }
  // A third, smallest room tucked in at the front left.
  hillock(g, cx - 5, cy + 3, 2.6, 2.2);
}

/** Brave Hearts' base: the hillocks, and a red pennant on a stick at each corner. */
function braveHeartsKit(g: CharGrid, cx: number, cy: number): void {
  hillocks(g, cx, cy);
  pennant(g, cx - 13, cy - 3, cy - 18, 'R', 'Q', 1);
  pennant(g, cx + 13, cy - 2, cy - 15, 'R', 'Q', -1);
}

export const towerBurrow = defineSprite({
  id: 'tower.burrow',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: WARREN_LEGEND,
  frames: {
    t1: warrenBase(1, { t2: hillocks, t3: lanternReed }, SEED),
    t2: warrenBase(2, { t2: hillocks, t3: lanternReed }, SEED),
    t3: warrenBase(3, { t2: hillocks, t3: lanternReed }, SEED),
    spec_a: warrenSpecBase(bigFamilyKit, SEED),
    spec_b: warrenSpecBase(braveHeartsKit, SEED),
  },
});

/** The main door's left column and its sill. */
const DOOR_X = 10;
const DOOR_SILL = 19;
const DOOR_W = 6;

/**
 * A resident in a doorway (`x` its left column): `0` eyes shining in the dark, `1` a blink, `2` its
 * head out, `3` its head out and a paw up waving. `band` ties the Champions' red headband round its
 * brow.
 */
function resident(g: CharGrid, x: number, sill: number, beat: number, band: boolean): void {
  if (beat === 0 || beat === 1) {
    const [a, b] = beat === 0 ? ['w', 'k'] : ['2', '2'];
    for (const ex of [x + 1, x + 4]) {
      plot(g, ex, sill - 3, a);
      plot(g, ex + 1, sill - 3, b);
    }
    if (band && beat === 0) for (let k = 1; k <= 5; k++) plot(g, x + k, sill - 4, 'Q');
    return;
  }
  // prettier-ignore
  stamp(g, x, sill - 5, [
    band ? 'QRRRRQ' : '..dc..',
    '.3443.',
    '3wk3wk',
    '3kk3kk',
    '334433',
    '.9999.',
  ]);
  if (beat === 3) {
    // A paw up beside the door, waving.
    plot(g, x + 6, sill - 4, '3');
    plot(g, x + 6, sill - 5, '4');
    plot(g, x + 7, sill - 6, band ? 'R' : '4');
    plot(g, x + 6, sill - 6, '4');
  }
}

/** The Peeker's two-leaf seedling, sprouting from the moss on the crown (Pebble's friends). */
function seedling(g: CharGrid, x: number, y: number, beat: number): void {
  plot(g, x, y, 'H');
  plot(g, x, y - 1, 'H');
  const sway = beat === 3 ? 1 : 0;
  plot(g, x - 1 + sway, y - 2, 'G');
  plot(g, x - 2 + sway, y - 2, 'G');
  plot(g, x - 2 + sway, y - 3, 'H');
  plot(g, x + 1 + sway, y - 2, 'G');
  plot(g, x + 2 + sway, y - 3, 'G');
  plot(g, x + 1 + sway, y - 3, 'H');
}

function denHead(kit: Kit, beat: number): string[] {
  const g = grid(W, H);
  const wide = kit === 'bigFamily';
  dome(g, CX, CY - 7, wide ? 10.5 : 9.5, 7.5);
  if (wide) {
    // The upper room, and its round window with a little one looking out.
    dome(g, CX - 5, CY - 14, 4.5, 3.6, 0.45);
    stamp(g, CX - 7, CY - 15, ['kkk', 'kkk']);
    plot(g, CX - 7, CY - 15, beat === 1 ? 'k' : 'w');
    plot(g, CX - 5, CY - 15, beat === 1 ? 'k' : 'w');
  } else if (kit === 't1') {
    seedling(g, CX - 2, CY - 14, beat);
  }
  doorway(g, DOOR_X, DOOR_SILL, DOOR_W, 7);
  // The teal woven curtain tied back to the door's left.
  for (let y = DOOR_SILL - 5; y <= DOOR_SILL; y++) plot(g, DOOR_X - 1, y, y % 2 === 0 ? 'd' : 'c');
  plot(g, DOOR_X - 2, DOOR_SILL - 2, 'e');
  // The glowworm lantern hung by the door.
  const lx = DOOR_X + DOOR_W + 1;
  plot(g, lx, DOOR_SILL - 9, '6');
  plot(g, lx, DOOR_SILL - 8, '8');
  plot(g, lx, DOOR_SILL - 7, '*');
  plot(g, lx, DOOR_SILL - 6, '+');
  plot(g, lx + 1, DOOR_SILL - 7, '7');
  resident(g, DOOR_X, DOOR_SILL, beat, kit === 'braveHearts');
  if (wide) {
    // The second, small door on the left, where the youngest peeks (a beat behind the others).
    doorway(g, CX - 9, DOOR_SILL - 1, 3, 3);
    const late = (beat + 2) % 4;
    if (late === 0 || late === 3) plot(g, CX - 8, DOOR_SILL - 2, 'w');
    if (late === 2) plot(g, CX - 8, DOOR_SILL - 1, '3');
  }
  if (kit === 'braveHearts') {
    // A red pennant on a stick in the crown, snapping one way then the other.
    const top = CY - 21;
    for (let y = top; y <= CY - 14; y++) plot(g, CX + 1, y, y === top ? '9' : 'K');
    const flap = beat % 2 === 0;
    for (let k = 1; k <= 5; k++) {
      plot(g, CX + 1 + k, top + 1 + (flap && k > 3 ? 1 : 0), k < 4 ? 'R' : 'Q');
      if (k < 4) plot(g, CX + 1 + k, top + 2 + (flap && k > 2 ? 1 : 0), k < 2 ? 'R' : 'Q');
    }
  }
  return rows(g);
}

const BEATS = [0, 1, 2, 3] as const;
/** The beat order: eyes, a blink, eyes held, then out to wave twice and back in. */
const PEEK = [0, 1, 0, 0, 2, 3, 2, 3] as const;

export const towerBurrowHead = defineSprite({
  id: 'tower.burrow_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: WARREN_LEGEND,
  frames: Object.fromEntries([
    ...BEATS.map((k) => [`peek_${k}`, denHead('t1', k)]),
    ...BEATS.map((k) => [`peek_spec_a_${k}`, denHead('bigFamily', k)]),
    ...BEATS.map((k) => [`peek_spec_b_${k}`, denHead('braveHearts', k)]),
  ]),
  anims: {
    // The first anim is the tier 1–3 idle (render's `headStyle`).
    peek: { frames: PEEK.map((k) => `peek_${k}`), fps: 3 },
    peek_spec_a: { frames: PEEK.map((k) => `peek_spec_a_${k}`), fps: 3 },
    peek_spec_b: { frames: PEEK.map((k) => `peek_spec_b_${k}`), fps: 3 },
  },
});
