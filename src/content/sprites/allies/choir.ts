// The finale's choir (design/maps.md § 5.5; story/campaign/finale.md; art-direction §6 *Choir
// singers*): the Skitterkin walking their dead home to the Deep Halls, singing the colony jingle as
// a funeral hymn. All three are in `skitterkin.ally` (their default palette, so render draws them in
// `default`), and every singing pose carries a little gold **note** bobbing over the head: the choir mostly walks up the screen, away from the camera, where
// no open mouth shows, and the note is what says "singing" from behind.
// - **`ally.singer`**: a colonist Skitterkin, round and big-eyed like the refugees, no bundle now;
//   `walk_<facing>` (2 frames, 6 fps) singing as it walks, its mouth open and its tuft bouncing;
//   `sing_<facing>` (2 frames, 4 fps) standing, head tipped up, mouth wide (the choir halted, or at
//   the Halls); `hushed_<facing>` (2 frames, 4 fps) after a hush: drained to steel grey (custom
//   legend), eyes shut, mouth closed, head bowed, no note, shuffling at the back. A hushed singer
//   who wakes at Dawn sings again (`sing`).
// - **`ally.pebble_lead`**: Pebble leading them, in Bricks's bottle cap with the Peeker's seedling
//   through it (as `ally.pebble`), a little bigger in the canvas for her note; `walk_<facing>`
//   (2 frames, 8 fps) her toddle, singing, seedling up; `sing_<facing>` (2 frames, 4 fps) standing
//   and conducting, one front foot raised and lowered on the beat; `halt_<facing>` (2 frames, 4 fps)
//   the choir halted for a Hollow unit ahead: she stops short, squat, seedling drooping, eyes wide,
//   a front foot out to hold the column, no note (maps.md § 5.5: halts must read).
// - **`ally.thrum`**: Old Thrum, recognisably the Elder (`enemy.elder`): broad and low, the old shell
//   of three steel plates with its moss kept green (custom legend, as her portrait and A1M5), the
//   oldest shimmer in the cast glowing pink-gold in the seams between the plates, a thin white tuft,
//   white brows and whiskers, and her mouth open on the hymn; `walk_<facing>` (2 frames, 4 fps) her
//   sway, `sing_<facing>` (2 frames, 3 fps) standing, head lifted.
import { defineSprite } from '../defineSprite.ts';
import { finish, skitterBody } from '../enemies/skitter.ts';
import { at, plot, recolor, type CharGrid } from '../helpers.ts';
import type { AnimDef } from '../types.ts';

type Facing = 'se' | 'ne';
type Stamp = readonly [number, number, readonly string[]];

/**
 * A note: its stem and its head in gold (custom legend, not the emissives: a glow round so small a
 * shape reads as a plate behind it, not light).
 */
const NOTE = ['.Z', '.Y', 'YY'] as const;
const NOTE_LEGEND = { Y: 'gold.3', Z: 'gold.4' } as const;

/** The four facings of `look` over 2 frames at `fps` (SE and NE authored, SW and NW mirrored). */
function anims2(look: string, fps: number): Record<string, AnimDef> {
  return {
    [`${look}_se`]: { frames: [`${look}_se_0`, `${look}_se_1`], fps },
    [`${look}_sw`]: { mirrorOf: `${look}_se` },
    [`${look}_ne`]: { frames: [`${look}_ne_0`, `${look}_ne_1`], fps },
    [`${look}_nw`]: { mirrorOf: `${look}_ne` },
  };
}

/** `make`'s frames for `look`, both authored facings, steps 0 and 1. */
function frames2(
  look: string,
  make: (facing: Facing, step: 0 | 1) => string[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const f of ['se', 'ne'] as const) {
    for (const s of [0, 1] as const) out[`${look}_${f}_${s}`] = make(f, s);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// The singers.

const SW = 14;
const SH = 16;

type SingerLook = 'walk' | 'sing' | 'hushed';

/** A hushed singer drained to steel: the body's ramps, its tuft, and its shimmer all grey. */
const HUSH: Readonly<Record<string, string>> = {
  '0': 'G',
  '1': 'G',
  '2': 'H',
  '3': 'I',
  '4': 'J',
  '7': 'H',
  '8': 'I',
  '9': 'J',
  a: 'G',
  b: 'H',
  c: 'I',
  d: 'I',
  e: 'J',
  '+': 'I',
  '*': 'J',
};
const HUSH_LEGEND = { G: 'steel.0', H: 'steel.1', I: 'steel.2', J: 'steel.3' } as const;

function singer(facing: Facing, step: 0 | 1, look: SingerLook): string[] {
  const hushed = look === 'hushed';
  const sing = look === 'sing';
  // The hop (walk), the lift of the head (sing), the bow (hushed).
  const up = look === 'walk' ? step : sing ? 1 : 0;
  const down = hushed ? 1 : 0;
  const g = skitterBody({
    w: SW,
    h: SH,
    cx: 7,
    cy: 10.5 - up * 0.5 + down * 0.5,
    rx: 5.2,
    ry: sing ? 4.7 : look === 'walk' && step === 1 ? 4.1 : 4.4,
    facing,
    belly: 0.4,
  });
  const legs: Stamp =
    look === 'walk'
      ? [2, SH - 2, step === 0 ? ['.1.1..1.1.', '.0.0..0.0.'] : ['..1.11.1..', '.0..00..0.']]
      : [2, SH - 2, ['.1.1..1.1.', '.0.0..0.0.']];
  const top = 6 - up + down;
  const note: Stamp[] = hushed ? [] : [[11, step === 0 ? 1 : 0, NOTE]];
  let out: string[];
  if (facing === 'se') {
    // Eyes and mouth: open on the song (wider standing), shut and closed when hushed.
    const eyes: Stamp[] = hushed
      ? [
          [7, top + 2, ['kk']],
          [10, top + 2, ['kk']],
        ]
      : [
          [7, top + 1, ['wk', 'kk']],
          [10, top + 1, ['wk', 'kk']],
        ];
    const mouth: Stamp = hushed
      ? [9, top + 4, ['k']]
      : sing || step === 0
        ? [8, top + 3, ['.k.', 'kPk', '.k.']]
        : [9, top + 4, ['k', 'k']];
    out = finish(g, [
      legs,
      [6, top - 3 + (hushed ? 1 : 0), hushed ? ['bb', '.b'] : ['.c', 'cb']],
      ...eyes,
      mouth,
      ...note,
    ]);
  } else {
    out = finish(g, [
      legs,
      [7, top - 3 + (hushed ? 1 : 0), hushed ? ['bb', 'b.'] : ['c.', 'bc']],
      [8, top + 3, ['+', '*']],
      ...note,
    ]);
  }
  return hushed ? recolor(out, HUSH) : out;
}

export const allySinger = defineSprite({
  id: 'ally.singer',
  size: { w: SW, h: SH },
  anchor: { x: 7, y: SH - 1 },
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: { ...HUSH_LEGEND, ...NOTE_LEGEND, P: 'pink.2' },
  frames: {
    ...frames2('walk', (f, s) => singer(f, s, 'walk')),
    ...frames2('sing', (f, s) => singer(f, s, 'sing')),
    ...frames2('hushed', (f, s) => singer(f, s, 'hushed')),
  },
  anims: { ...anims2('walk', 6), ...anims2('sing', 4), ...anims2('hushed', 4) },
});

// ---------------------------------------------------------------------------------------------
// Pebble leading.

const PW = 14;
const PH = 17;

/** The seedling, up (as `ally.pebble`'s) and drooping (the halt). */
const SPROUT = ['NM.MN', '.MLM.', '..L..'] as const;
const SPROUT_DROOP = ['.....', 'N.L.N', '.MLM.'] as const;

/** Bricks's bottle cap: the white top ringed in teal, the stem through its hole, crimped below. */
// prettier-ignore
const CAP = [
  '.QCLCQ.',
  'QCCCCCQ',
  '.SRSRS.',
] as const;

type PebbleLook = 'walk' | 'sing' | 'halt';

function pebbleLead(facing: Facing, step: 0 | 1, look: PebbleLook): string[] {
  const halt = look === 'halt';
  const up = look === 'walk' ? step : look === 'sing' ? 1 : 0;
  const g = skitterBody({
    w: PW,
    h: PH,
    cx: 6.5,
    cy: 12 - up * 0.5 + (halt ? 0.5 : 0),
    rx: halt ? 4.9 : look === 'walk' && step === 1 ? 4.2 : 4.6,
    ry: halt ? 3.2 : look === 'walk' && step === 1 ? 3.9 : 3.5,
    facing,
    belly: 0.35,
  });
  const legs: Stamp = [
    2,
    PH - 2,
    look === 'walk' && step === 1 ? ['..1...1..', '.0.0.0.0.'] : ['.1.1.1.1.', '.0.0.0.0.'],
  ];
  const top = 7 - up + (halt ? 1 : 0);
  const head: Stamp[] = [
    [4, top - 3, halt ? SPROUT_DROOP : SPROUT],
    [3, top, CAP],
  ];
  const note: Stamp[] = halt ? [] : [[11, step === 0 ? 2 : 1, NOTE]];
  // The raised front foot: conducting on the beat (sing), held out to stop them (halt).
  const foot: Stamp[] =
    look === 'sing' && step === 0
      ? [[11, top + 3, ['1', '0']]]
      : halt
        ? [[11, top + 5, ['10']]]
        : [];
  if (facing === 'se') {
    const eyes: Stamp[] = halt
      ? [
          [6, top + 3, ['wk', 'kk', 'kk']],
          [9, top + 3, ['wk', 'kk', 'kk']],
        ]
      : [
          [6, top + 4, ['wk', 'kk']],
          [9, top + 4, ['wk', 'kk']],
        ];
    const mouth: Stamp = halt ? [8, top + 7, ['k']] : [8, top + 6, ['kk', 'PP']];
    return finish(g, [legs, ...head, ...eyes, mouth, [3, top + 5, ['P', '+']], ...foot, ...note]);
  }
  return finish(g, [legs, [4, top + 5, ['P*P', '.+.']], ...head, ...foot, ...note]);
}

export const allyPebbleLead = defineSprite({
  id: 'ally.pebble_lead',
  size: { w: PW, h: PH },
  anchor: { x: 6, y: PH - 1 },
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: {
    ...NOTE_LEGEND,
    P: 'pink.3',
    C: 'white.1',
    Q: 'teal.3',
    S: 'steel.4',
    R: 'steel.2',
    L: 'green.2',
    M: 'green.3',
    N: 'green.4',
  },
  frames: {
    ...frames2('walk', (f, s) => pebbleLead(f, s, 'walk')),
    ...frames2('sing', (f, s) => pebbleLead(f, s, 'sing')),
    ...frames2('halt', (f, s) => pebbleLead(f, s, 'halt')),
  },
  anims: { ...anims2('walk', 8), ...anims2('sing', 4), ...anims2('halt', 4) },
});

// ---------------------------------------------------------------------------------------------
// Old Thrum.

const TW = 26;
const TH = 23;
/** Her body's top: the Elder's, lowered to leave room for her note. */
const DROP = 4;

/**
 * The old shell (the Elder's three steel plates over her back), its plates' edges the seams where
 * her shimmer glows pink-gold (`P`, and the gold emissives on alternate pixels).
 */
function shell(g: CharGrid, cx: number, cy: number, facing: Facing, step: 0 | 1): void {
  const sx = facing === 'se' ? cx - 3.5 : cx;
  const plates = [sx - 5, sx, sx + 5];
  for (let y = 0; y < TH; y++) {
    for (let x = 0; x < TW; x++) {
      const ch = at(g, x, y);
      if (ch === '.' || '789'.includes(ch)) continue;
      const dx = x + 0.5 - sx;
      const dy = y + 0.5 - (cy - 1.5);
      if (Math.hypot(dx / 8.5, dy / 5.5) > 1 || dy > 1.5) continue;
      const d = plates.map((p) => Math.abs(x + 0.5 - p));
      const k = d.indexOf(Math.min(...d));
      const seam = Math.abs(x + 0.5 - (plates[k] ?? 0)) > 2.2;
      if (seam && dy < 0.5)
        plot(g, x, y, (x + y + step) % 3 === 0 ? 'P' : (x + y) % 2 === 1 ? '+' : '*');
      else plot(g, x, y, seam ? 'T' : dy < 0 ? 'S' : 'T');
    }
  }
}

function thrum(facing: Facing, step: 0 | 1, look: 'walk' | 'sing'): string[] {
  const sing = look === 'sing';
  const sway = look === 'walk' ? (step === 1 ? 0.5 : -0.5) : 0;
  const cx = 13 + sway;
  const cy = 10.5 + DROP - (sing ? 0.5 : 0);
  const g = skitterBody({
    w: TW,
    h: TH,
    cx,
    cy,
    rx: 11,
    ry: sing ? 7.8 : 7.5,
    facing,
    belly: 0.35,
  });
  shell(g, cx, cy, facing, step);
  const ox = Math.round(sway);
  const oy = DROP - (sing ? 1 : 0);
  // Moss on the shell, kept green.
  const mx = facing === 'se' ? -3 : 0;
  const moss: Stamp[] = [
    [5 + ox + mx, 5 + oy, ['.MN', 'LMM']],
    [14 + ox + mx, 4 + oy, ['NM.', 'MLL']],
  ];
  const legs: Stamp = [
    3,
    TH - 2,
    look === 'walk' && step === 1
      ? ['..11...11...11...11..', '..00...00...00...00..']
      : ['.11...11.....11...11.', '.00...00.....00...00.'],
  ];
  const note: Stamp = [20, sing ? step : 1 - step, NOTE];
  if (facing === 'se') {
    return finish(g, [
      legs,
      ...moss,
      [11 + ox, 1 + oy, ['.W.W', 'WVWV']],
      // White brows; her eyes closed on the hymn (the lid a dark line), whiskers, mouth open.
      [15 + ox, 7 + oy, ['WWW.WWW']],
      [15 + ox, 8 + oy, ['.kk..kk']],
      [16 + ox, 11 + oy, ['W.k.W']],
      [17 + ox, 12 + oy, sing ? ['kPk', '.k.'] : ['kk', '..']],
      note,
    ]);
  }
  const lift: Readonly<Record<string, string>> = { '1': '2', '2': '3', T: 'S' };
  for (const row of g) row.forEach((ch, x) => (row[x] = lift[ch] ?? ch));
  return finish(g, [legs, ...moss, [11 + ox, 1 + oy, ['.W.W', 'WVWV']], note]);
}

export const allyThrum = defineSprite({
  id: 'ally.thrum',
  size: { w: TW, h: TH },
  anchor: { x: 13, y: TH - 1 },
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  // The shell's steel, her white tuft, brows and whiskers, the moss kept green, the seams' pink.
  legend: {
    S: 'steel.4',
    T: 'steel.3',
    W: 'white.0',
    V: 'steel.4',
    L: 'green.2',
    M: 'green.3',
    N: 'green.4',
    P: 'pink.3',
    ...NOTE_LEGEND,
  },
  frames: {
    ...frames2('walk', (f, s) => thrum(f, s, 'walk')),
    ...frames2('sing', (f, s) => thrum(f, s, 'sing')),
  },
  anims: { ...anims2('walk', 4), ...anims2('sing', 3) },
});

/** The choir's sprites in gallery order. */
export const CHOIR_ALLIES = [allySinger, allyPebbleLead, allyThrum] as const;
