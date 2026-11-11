// Sproing Pad (`sproing`, design/towers.md § Sproing Pad): "a springy mushroom pad with a fearless
// leaper who boings into the sky", a gift of the warrens. On the warren footing
// (towers/warrenBase.ts, one glowworm lantern per tier) in the `skitterkin.ally` palette, the head
// is **the mushroom pad**: a fat pale stalk under a wide blue cap with white spots (the blue of the
// leaper's own helmet, `ally.leaper`, so pad and leaper read as one), and on it the leaper, sat in
// a tuck in its mushroom-cap helmet. It doesn't aim: its leapers do the bonking (LeaperView draws
// them in the air), so the head idles:
// - `idle` (4 frames, 4 fps): the cap breathes (squash and stretch a pixel), the leaper bobs with
//   it and blinks;
// - `fire` (3 frames, ~0.4 s, once; render's idle-head shot, towerLook.ts `idleFire`): **the
//   bounce**: the cap pressed flat under the crouching leaper, then sprung up empty with a puff of
//   spores as it leaves, then wobbling;
// - `empty` (2 frames): the pad with its leaper out, the cap still wobbling, for while it's away.
// Each spec has its own three (`<anim>_spec_a`, `<anim>_spec_b`): **Sky Bouncers** (two leapers)
// shares a wider cap between two of them; **Big Bonk** sits one big leaper in a battered steel pot
// helmet on a thick, cracked cap.
// The base: T2 sprouts a little blue mushroom at each side corner; T3 a tall one on the left, its
// cap a pad of its own; Sky Bouncers' base has a tall mushroom at both corners; Big Bonk's two
// flattened boulders, cracked where something heavy landed.
import { defineSprite } from '../defineSprite.ts';
import { skitterBody } from '../enemies/skitter.ts';
import { grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W } from './base.ts';
import { WARREN_LEGEND, warrenBase, warrenSpecBase } from './warrenBase.ts';

/**
 * The warren's colours plus the mushroom's: the cap (`R` blue.3 lit, `Q` blue.1 under, `D` blue.2
 * shade, `B` blue.4 the lit crown from WARREN_LEGEND), its spots (`X` white.1), and the stalk
 * (`W` white.0, `V`/`S` steel shade from WARREN_LEGEND).
 */
const LEGEND = {
  ...WARREN_LEGEND,
  R: 'blue.3',
  Q: 'blue.1',
  D: 'blue.2',
  X: 'white.1',
} as const;

const SEED = 73;

/**
 * A mushroom with its cap centred at (x, capY), half-width `rx`, on a stalk down to row `foot`:
 * a pale stalk lit left, a blue dome cap lit from the upper left with white spots, its gills a dark
 * band under the rim.
 */
function mushroom(g: CharGrid, x: number, capY: number, rx: number, foot: number): void {
  for (let y = Math.round(capY); y <= foot; y++) {
    const w = Math.max(1, Math.round(rx * 0.3));
    for (let dx = -w; dx < w; dx++) plot(g, Math.round(x) + dx, y, dx < 0 ? 'W' : 'V');
  }
  const ry = rx * 0.6;
  for (let y = Math.floor(capY - ry); y <= Math.ceil(capY); y++) {
    for (let px = Math.floor(x - rx); px <= Math.ceil(x + rx); px++) {
      const dx = (px + 0.5 - x) / rx;
      const dy = (y + 0.5 - capY) / ry;
      if (dx * dx + dy * dy > 1 || dy > 0.25) continue;
      const lit = -0.6 * dx - 0.8 * dy;
      plot(g, px, y, dy > 0 ? 'Q' : lit > 0.75 ? 'B' : lit > 0.1 ? 'R' : 'D');
    }
  }
  if (rx >= 2.5) {
    plot(g, Math.round(x - rx * 0.4), Math.round(capY - ry * 0.5), 'X');
    plot(g, Math.round(x + rx * 0.35), Math.round(capY - ry * 0.3), 'X');
  }
}

/** T2: a little blue mushroom at each side corner. */
function sprouts(g: CharGrid, cx: number, cy: number): void {
  mushroom(g, cx - 10, cy - 2, 3.2, cy + 1);
  mushroom(g, cx + 10, cy - 1, 3.2, cy + 2);
}

/** T3: a tall mushroom on the left corner, its cap a pad of its own. */
function tallLeft(g: CharGrid, cx: number, cy: number): void {
  mushroom(g, cx - 12, cy - 13, 5, cy - 1);
}

/** Sky Bouncers' base: a tall mushroom at each corner, the right one shorter. */
function skyBouncersKit(g: CharGrid, cx: number, cy: number): void {
  mushroom(g, cx - 11, cy - 13, 5, cy);
  mushroom(g, cx + 11, cy - 9, 5, cy + 1);
}

/** A flattened boulder at (x, foot), cracked in a star where something heavy landed on it. */
function crackedBoulder(g: CharGrid, x: number, foot: number): void {
  const cy = foot - 2.5;
  for (let y = Math.floor(cy - 3); y <= foot; y++) {
    for (let px = Math.floor(x - 5); px <= Math.ceil(x + 5); px++) {
      const dx = (px + 0.5 - x) / 5;
      const dy = (y + 0.5 - cy) / 3;
      if (dx * dx + dy * dy > 1) continue;
      const lit = -0.6 * dx - 0.8 * dy;
      plot(g, px, y, lit > 0.5 ? 'V' : lit > -0.2 ? 'S' : 'T');
    }
  }
  const tx = Math.round(x);
  const ty = Math.round(cy - 1);
  for (const [ox, oy] of [
    [-3, -1],
    [3, -1],
    [-2, 2],
    [2, 2],
  ] as const) {
    line(g, tx, ty, tx + ox, ty + oy, 'k');
  }
}

/** Big Bonk's base: two flattened, cracked boulders at the corners. */
function bigBonkKit(g: CharGrid, cx: number, cy: number): void {
  crackedBoulder(g, cx - 10, cy + 2);
  crackedBoulder(g, cx + 10, cy + 3);
}

const KITS = { t2: sprouts, t3: tallLeft } as const;

export const towerSproing = defineSprite({
  id: 'tower.sproing',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: LEGEND,
  frames: {
    t1: warrenBase(1, KITS, SEED),
    t2: warrenBase(2, KITS, SEED),
    t3: warrenBase(3, KITS, SEED),
    spec_a: warrenSpecBase(skyBouncersKit, SEED),
    spec_b: warrenSpecBase(bigBonkKit, SEED),
  },
});

// ---- The head: the pad and its leaper ---------------------------------------------------------

const W = 26;
const H = 26;
const CX = 13;
const CY = 24;

type Kind = 't1' | 'sky' | 'bonk';
/** What the pad is doing: at rest (`squash` 0–1, `blink`), pressed, sprung, or empty. */
type Beat = 'rest0' | 'rest1' | 'blink' | 'press' | 'spring' | 'wobble' | 'empty0' | 'empty1';

/** The leaper's helmet (ally.leaper's CAP): blue, white spots, a dark rim. */
// prettier-ignore
const HELMET = [
  '..RRRR..',
  '.RXRRXR.',
  'RRRRRRRR',
  'QQQQQQQQ',
] as const;

/** Big Bonk's battered steel pot of a helmet, dented, a white glint on its crown. */
// prettier-ignore
const POT = [
  '..VVVVV...',
  '.VXVVVSV..',
  'VVVVSVVSS.',
  'SSSSSSSSSS',
] as const;

/** A leaper sat tucked on the pad, its feet on row `seat`: body, helmet, eyes (or a blink). */
function leaper(g: CharGrid, x: number, seat: number, blink: boolean, big: boolean): void {
  const rx = big ? 5.2 : 4.3;
  const ry = big ? 4.4 : 3.7;
  const cy = seat - ry + 0.5;
  const body = skitterBody({ w: W, h: H, cx: x, cy, rx, ry, facing: 'se', belly: 0.3 });
  for (let y = 0; y < H; y++) {
    for (let px = 0; px < W; px++) {
      const c = body[y]?.[px];
      if (c !== undefined && c !== '.') plot(g, px, y, c);
    }
  }
  const top = Math.round(cy - ry);
  const helmet = big ? POT : HELMET;
  stamp(g, Math.round(x) - (big ? 5 : 4), top - 2, helmet);
  // The tuft poking out behind the helmet.
  stamp(g, Math.round(x) - (big ? 6 : 5), top - 1, ['c.', 'dc']);
  const fy = Math.round(cy);
  if (blink) {
    line(g, Math.round(x) - 1, fy, Math.round(x), fy, 'k');
    line(g, Math.round(x) + 2, fy, Math.round(x) + 3, fy, 'k');
  } else {
    stamp(g, Math.round(x) - 1, fy - 1, ['wk.wk', 'kk.kk']);
  }
  // Little paws gripping the cap's rim.
  plot(g, Math.round(x) - 2, seat, '3');
  plot(g, Math.round(x) + 2, seat, '3');
}

/** The pad: a fat stalk on the footing under a wide spotted cap; `squash` px pressed (− springs). */
function pad(g: CharGrid, kind: Kind, squash: number): number {
  const rx = kind === 'sky' ? 11 : 10;
  const capY = CY - 7 + squash;
  // The stalk: pale, lit left, wider at its foot; a ring of skirt under the cap.
  for (let y = Math.round(capY); y <= CY; y++) {
    const w = y > CY - 3 ? 4 : 3;
    for (let dx = -w; dx < w; dx++) {
      plot(g, CX + dx, y, dx < -1 ? 'W' : dx < 1 ? 'X' : dx < w - 1 ? 'V' : 'S');
    }
  }
  line(g, CX - 4, Math.round(capY) + 2, CX + 3, Math.round(capY) + 2, 'V');
  // The cap: a wide low dome, flatter when pressed, taller when sprung.
  const ry = Math.max(2.5, 4.5 - squash * 0.8);
  for (let y = Math.floor(capY - ry); y <= Math.ceil(capY) + 1; y++) {
    for (let x = Math.floor(CX - rx); x <= Math.ceil(CX + rx); x++) {
      const dx = (x + 0.5 - CX) / rx;
      const dy = (y + 0.5 - capY) / ry;
      if (dx * dx + dy * dy > 1 && !(dy > 0 && dy < 0.35 && Math.abs(dx) < 0.98)) continue;
      const lit = -0.5 * dx - 0.85 * dy;
      // Gills: a dark band under the rim.
      const ch = dy > 0.05 ? 'Q' : lit > 0.75 ? 'B' : lit > 0.15 ? 'R' : 'D';
      plot(g, x, y, ch);
    }
  }
  // White spots on the cap.
  const top = Math.round(capY - ry);
  for (const [ox, oy] of [
    [-6, 3],
    [-2, 1],
    [4, 2],
    [7, 4],
  ] as const) {
    plot(g, CX + ox, top + oy, 'X');
    if (ox === -2) plot(g, CX + ox + 1, top + oy, 'X');
  }
  if (kind === 'bonk') {
    // A crack across the cap where it took the big one.
    line(g, CX + 2, top + 1, CX + 5, top + 4, 'Q');
    plot(g, CX + 6, top + 4, 'Q');
  }
  return top;
}

function sproingHead(kind: Kind, beat: Beat): string[] {
  const g = grid(W, H);
  const squash =
    beat === 'press' ? 2 : beat === 'spring' ? -2 : beat === 'rest1' || beat === 'empty1' ? 1 : 0;
  const wob = beat === 'wobble' ? -1 : 0;
  const top = pad(g, kind, squash + wob);
  const seat = top + 1;
  if (beat === 'spring') {
    // The leaper's gone: a puff of spores where it left, its feet the last thing in frame.
    for (const [ox, oy] of [
      [-4, -2],
      [3, -3],
      [-1, -4],
      [5, -1],
      [-6, 0],
    ] as const) {
      plot(g, CX + ox, top + oy, 'X');
    }
    plot(g, CX - 1, 0, '1');
    plot(g, CX + 1, 0, '1');
    return rows(g);
  }
  if (beat === 'wobble' || beat === 'empty0' || beat === 'empty1') return rows(g);
  const blink = beat === 'blink';
  // Pressed, the leaper crouches lower into the cap.
  const sit = beat === 'press' ? seat + 1 : seat;
  if (kind === 'sky') {
    leaper(g, CX - 4.5, sit, blink, false);
    leaper(g, CX + 5, sit + 1, beat === 'rest1', false);
  } else {
    leaper(g, CX + 0.5, sit, blink, kind === 'bonk');
  }
  return rows(g);
}

/** The idle's beats: breathe, blink, breathe. */
const IDLE: readonly Beat[] = ['rest0', 'rest1', 'blink', 'rest1'];
const BOUNCE: readonly Beat[] = ['press', 'spring', 'wobble'];
const EMPTY: readonly Beat[] = ['empty0', 'empty1'];

const KINDS: readonly (readonly [string, Kind])[] = [
  ['', 't1'],
  ['_spec_a', 'sky'],
  ['_spec_b', 'bonk'],
];

const headFrames: Record<string, string[]> = {};
const headAnims: Record<string, { frames: string[]; fps: number; loop?: false }> = {};
for (const [suffix, kind] of KINDS) {
  const beats = new Set<Beat>([...IDLE, ...BOUNCE, ...EMPTY]);
  for (const b of beats) headFrames[`${b}${suffix}`] = sproingHead(kind, b);
  headAnims[`idle${suffix}`] = { frames: IDLE.map((b) => `${b}${suffix}`), fps: 4 };
}
// The shots and the empty pad after the idles: the first anim is the tier 1–3 idle (headStyle).
for (const [suffix] of KINDS) {
  headAnims[`fire${suffix}`] = { frames: BOUNCE.map((b) => `${b}${suffix}`), fps: 8, loop: false };
  headAnims[`empty${suffix}`] = { frames: EMPTY.map((b) => `${b}${suffix}`), fps: 4 };
}

export const towerSproingHead = defineSprite({
  id: 'tower.sproing_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: LEGEND,
  frames: headFrames,
  anims: headAnims,
});

