// Matriarch Chitterbloom (`chitterbloom`, design/enemies.md § 6; story: act1.md § A1M5), Act I's
// boss: the Terraces warren's matriarch, whom Everglow codenames for her crown and whom Pebble
// will later call Bramble. Drawn as the biggest Skitterkin on the map (a boss's larger silhouette,
// the `boss` tell, art-direction §8): a vast round coral fluffball in curls of fur with a butter
// belly, a mossy wreath of pink blossoms for a crown (their gold hearts glow), heavy grumpy brows
// over big eyes, blushing cheeks, and a youngling riding in the fluff on her back. Act I sells her
// as "Big! Grumpy! Lays pests!"; the little one clinging on is the seed of the sympathy to come.
//
// Frames and anims (SE and NE authored; SW and NW mirrored, tech-spec § Format rules). Render
// picks them from the sim's boss state (T312b):
// - `walk_<facing>`: a slow, heavy waddle (4 frames).
// - `tell_<facing>` (`bossTelling`, `bossNextAbility` a sneeze): the 1.5 s "ah… ah…", drawing
//   breath, stretched tall, eyes squeezing, a tickle of fluff at her nose.
// - `sneeze_<facing>` (once, as the sneeze lands): ACHOO, squashed flat, a burst of fluff out in
//   front; then a dazed blink.
// - `dig_<facing>` (`bossTelling`, a dig next): the 1.5 s dig-in, nose down, dirt flung up.
// - `under_<facing>` (`burrowed`): a travelling mound with her crown poking out.
// - `surface_<facing>` (once, as she comes up): the mound bursts and she pops out shaking off dirt.
// - `panic_<facing>` (phase 3: Haste and the huddle): a frantic scurry, eyes wide, sweat flying,
//   speed lines (the `haste_aura` tell's `orange.3`), her flank spots lit.
// - `puff_<facing>` (`invulnerableTicks` > 0): puffed up into a bristling ball, eyes shut. Render
//   alternates it with its `default+selected` frame (a white outline) for the shimmer.
// - `flee_<facing>` (`leaving`, the `driveOff`): running for the edge, wailing, the youngling
//   hanging on.
import { defineSprite } from '../defineSprite.ts';
import { at, grid, hash01, mirrorRows, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 56;
const H = 44;
/** The anchor's x: between her feet (the body's center at rest). */
const AX = 24;

type Facing = 'se' | 'ne';
type Eyes = 'open' | 'squint' | 'shut' | 'wide' | 'dazed' | 'teary';
type Mouth = 'frown' | 'o' | 'achoo' | 'wail' | 'grit';
type Legs = 0 | 1 | 2 | 3 | 'run0' | 'run1' | 'none';
type Stamp = readonly [number, number, readonly string[]];

interface Pose {
  readonly facing: Facing;
  /** Body center offset (px; +y is down). */
  readonly dx?: number;
  readonly dy?: number;
  /** Radius changes: + is wider or taller. */
  readonly drx?: number;
  readonly dry?: number;
  readonly eyes?: Eyes;
  readonly mouth?: Mouth;
  readonly legs?: Legs;
  /** Canvas rows from this y down are hidden (she is in the ground). */
  readonly ground?: number;
  /** Bristling fur all round (the invulnerable puff), in one of two patterns. */
  readonly bristle?: 0 | 1;
  /** The youngling on her back (hidden while she digs). */
  readonly baby?: boolean;
  /** Flank spots: resting, or lit (the phase-3 huddle), trading bright and dim. */
  readonly spots?: 'rest' | 'lit0' | 'lit1';
}

const BASE = { cx: AX, cy: 27.5, rx: 19, ry: 14.5 } as const;

// prettier-ignore
const LEGS: Readonly<Record<Exclude<Legs, 'none'>, readonly string[]>> = {
  0: ['.111..111...111..111..111..', '.000..000...000..000..000..'],
  1: ['..111..111..111..111..111..', '..000..000..000..000..000..'],
  2: ['..111..111...111..111..111.', '..000..000...000..000..000.'],
  3: ['111..111...111...111..111..', '000..000...000...000..000..'],
  run0: ['111...111.........111..111.', '00......00.......00.....00.'],
  run1: ['....111...111..111...111...', '.....00....00..00.....00...'],
};

/** A blossom: pink petals round a glowing gold heart. */
const BLOSSOM = ['.QP.', 'QP+P', 'P+PP', '.PP.'] as const;
const BIG_BLOSSOM = ['..QP..', '.QPPP.', 'QPP*PP', 'PP*+PP', '.PPPP.', '..PP..'] as const;
/** The wreath the blossoms sit in: moss and leaves arched over her head. */
const WREATH = ['..dd.........dd..', '.cbccbcdcdcbccbc.', 'cb.............bc'] as const;

/**
 * The youngling on her back: a round head with too-big eyes and a sprout, its lower edge outlined
 * by hand so it reads apart from her fur.
 */
// prettier-ignore
const BABY_SE = ['....dc...', '...xbx...', '.xx434xx.', 'x4434443x', 'x43wk3wkx', 'x33kk3kkx', 'x3+33333x', '.x33333x.', '..xxxxx..'] as const;
// prettier-ignore
const BABY_NE = ['...cd....', '...xbx...', '.xx434xx.', 'x4434443x', 'xwk3wk33x', 'xkk3kk33x', 'x33333+3x', '.x33333x.', '..xxxxx..'] as const;

/** The big fluffy body: shaded from the upper left, in curls of fur, with a butter belly. */
function fluff(g: CharGrid, cx: number, cy: number, rx: number, ry: number, facing: Facing): void {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = Math.hypot(dx, dy);
      // A soft, uneven rim: fur, not a geometric ellipse.
      if (d > 1 + (hash01(x, y, 7) - 0.5) * 0.08) continue;
      const lit = -0.6 * dx - 0.8 * dy;
      let ch = '3';
      // Seen from behind (NE) the sun is over her shoulder: her broad back takes a bigger lit cap.
      const cap = facing === 'se' ? 0.5 : 0.1;
      if (lit > cap && d < (facing === 'se' ? 0.75 : 0.86) && d > 0.3) ch = '4';
      else if (lit < -0.45 && d > 0.55) ch = d > 0.88 ? '1' : '2';
      // The butter belly, low and toward her front.
      const bx = facing === 'se' ? dx - 0.25 : dx;
      if (facing === 'se' && dy > 0.35 && Math.hypot(bx / 0.62, (dy - 0.8) / 0.5) < 1) {
        ch = d > 0.9 ? '7' : lit > -0.35 ? '9' : '8';
      }
      plot(g, x, y, ch);
    }
  }
  // Curls of fur across the coat: a dark stroke under a lit one, staggered.
  for (let gy = 0; gy < 6; gy++) {
    for (let gx = 0; gx < 7; gx++) {
      const x = Math.round(cx - rx + 4 + gx * 6 + (gy % 2) * 3);
      const y = Math.round(cy - ry + 4 + gy * 5);
      if (hash01(gx, gy, 3) < 0.55) continue;
      const here = at(g, x, y);
      if (here !== '3' && here !== '4') continue;
      if (at(g, x + 1, y) === '.' || at(g, x - 1, y + 1) === '.') continue;
      plot(g, x - 1, y, here === '4' ? '3' : '2');
      plot(g, x, y + 1, here === '4' ? '3' : '2');
      plot(g, x + 1, y + 1, here === '4' ? '3' : '2');
      plot(g, x + 2, y, here === '4' ? '3' : '2');
    }
  }
}

function body(p: Pose): CharGrid {
  const cx = BASE.cx + (p.dx ?? 0);
  const cy = BASE.cy + (p.dy ?? 0);
  const rx = BASE.rx + (p.drx ?? 0);
  const ry = BASE.ry + (p.dry ?? 0);
  const g = grid(W, H);
  fluff(g, cx, cy, rx, ry, p.facing);
  if (p.facing === 'ne') {
    // Seen from behind she is lit across her whole broad back (the sun over her shoulder), so the
    // back view stays in the actors' value band without the butter belly: shadows come up a step.
    const lift: Readonly<Record<string, string>> = { '1': '2', '2': '3' };
    for (const row of g) row.forEach((ch, x) => (row[x] = lift[ch] ?? ch));
  }
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  const top = Math.round(cy - ry);
  // Tufts of fur standing up off her crown and shoulders.
  for (let x = x0 - 13; x <= x0 + 13; x += 3) {
    for (let y = 0; y < H; y++) {
      if (at(g, x, y) === '.') continue;
      if (hash01(x, 1, 5) < 0.6) plot(g, x, y - 1, hash01(x, 2, 5) < 0.5 ? '3' : '4');
      break;
    }
  }
  if (p.bristle !== undefined) bristle(g, cx, cy, rx, ry, p.bristle);
  feet(g, x0, Math.round(cy + ry), p.legs ?? 0);
  spots(g, x0, y0, p);
  const baby = p.baby ?? true;
  if (p.facing === 'se') {
    face(g, x0 + 5, y0 - 3, p);
    if (baby) stamp(g, x0 - 17, top - 5, BABY_SE);
    crown(g, x0 + 2, top);
  } else {
    // From behind: a seam of shimmer down her back, and the youngling peeking over her shoulder.
    stamp(g, x0 - 3, y0 + 2, ['+...+', '.....', '..+..']);
    crown(g, x0 - 2, top);
    if (baby) stamp(g, x0 + 8, top - 5, BABY_NE);
  }
  if (p.ground !== undefined) {
    for (let y = p.ground; y < H; y++) for (let x = 0; x < W; x++) plot(g, x, y, '.');
  }
  return g;
}

/** Spikes of fur standing straight out all round: the invulnerable puff. */
function bristle(g: CharGrid, cx: number, cy: number, rx: number, ry: number, phase: 0 | 1): void {
  const n = 30;
  for (let k = 0; k < n; k++) {
    const a = ((k + phase * 0.5) / n) * Math.PI * 2;
    if (Math.sin(a) > 0.7) continue; // not under her feet
    const x0 = cx + Math.cos(a) * (rx - 0.5);
    const y0 = cy + Math.sin(a) * (ry - 0.5);
    for (let t = 1; t <= 3; t++) {
      plot(
        g,
        Math.floor(x0 + Math.cos(a) * t),
        Math.floor(y0 + Math.sin(a) * t * 0.8),
        t === 3 ? '4' : '3',
      );
    }
  }
}

function feet(g: CharGrid, cx: number, bottom: number, legs: Legs): void {
  if (legs === 'none') return;
  const src = LEGS[legs];
  const w = src[0]?.length ?? 0;
  stamp(g, cx - Math.floor(w / 2), Math.min(H - 2, bottom - 1), src);
}

/** The front view's face, centered on (fx, fy): big eyes under heavy brows, blush, a mouth. */
function face(g: CharGrid, fx: number, fy: number, p: Pose): void {
  const eyes = p.eyes ?? 'open';
  for (const [x, side] of [
    [fx - 5, 'l'],
    [fx + 2, 'r'],
  ] as const) {
    const l = side === 'l';
    switch (eyes) {
      case 'open':
        // Heavy brows sloping down toward the middle: grumpy. Big eyes with a lash at the corner.
        stamp(g, x - 1, fy - 3, l ? ['00...', '.000.'] : ['...00', '.000.']);
        stamp(g, x, fy - 1, ['wkk', 'kkk', 'kkk', '.k.']);
        plot(g, l ? x - 1 : x + 3, fy - 1, 'k');
        break;
      case 'wide':
        stamp(g, x - 1, fy - 4, ['.000.']);
        stamp(g, x, fy - 2, ['.w.', 'www', 'wkw', 'www', '.w.']);
        break;
      case 'squint':
        stamp(g, x - 1, fy - 2, l ? ['00...', '..000'] : ['...00', '000..']);
        stamp(g, x, fy + 1, ['kkk']);
        break;
      case 'shut':
        stamp(g, x, fy - 1, l ? ['k..', '.kk', 'k..'] : ['..k', 'kk.', '..k']);
        break;
      case 'dazed':
        stamp(g, x, fy - 1, ['kkk', 'kwk', 'kkk']);
        break;
      case 'teary':
        stamp(g, x - 1, fy - 2, ['.000.']);
        stamp(g, x, fy, ['kkk', '...']);
        stamp(g, l ? x : x + 2, fy + 1, ['B', 'B', '.', 'B']);
        break;
    }
  }
  // Blush.
  stamp(g, fx - 8, fy + 3, ['PP']);
  stamp(g, fx + 6, fy + 3, ['PP']);
  const mx = fx - 1;
  const my = fy + 5;
  switch (p.mouth ?? 'frown') {
    case 'frown':
      stamp(g, mx - 1, my, ['.kk.', 'k..k']);
      break;
    case 'o':
      stamp(g, mx, my, ['kk', 'kk']);
      break;
    case 'achoo':
      stamp(g, mx - 1, my - 1, ['.kk.', 'kRRk', 'kRRk', '.kk.']);
      break;
    case 'wail':
      stamp(g, mx - 1, my, ['kkkk', 'kRRk', '.kk.']);
      break;
    case 'grit':
      stamp(g, mx - 1, my, ['kkkk']);
      break;
  }
}

/** The crown: a mossy wreath across the top of her head, set with blossoms. */
function crown(g: CharGrid, x: number, top: number): void {
  stamp(g, x - 8, top - 1, WREATH);
  stamp(g, x - 8, top - 4, BLOSSOM);
  stamp(g, x + 5, top - 4, BLOSSOM);
  stamp(g, x - 3, top - 6, BIG_BLOSSOM);
}

/** Gold spots along her flank (the phase-3 huddle lights them, trading bright and dim). */
function spots(g: CharGrid, x0: number, y0: number, p: Pose): void {
  const s = p.spots ?? 'rest';
  const a = s === 'lit0' ? '*' : '+';
  const b = s === 'lit1' ? '*' : '+';
  const x = x0 - (p.facing === 'se' ? 13 : 12);
  stamp(g, x, y0, [a, '.', b]);
  stamp(g, x + 3, y0 + 4, [b + '.' + a]);
  if (s !== 'rest') stamp(g, x + 1, y0 - 4, [a]);
}

function frame(p: Pose, extra: readonly Stamp[] = []): string[] {
  const g = body(p);
  for (const [x, y, src] of extra) stamp(g, x, y, src);
  return rows(g);
}

/** Mirrors stamp rows left to right (for the NE view's effects). */
const flip = mirrorRows;

// ── Frames ─────────────────────────────────────────────────────────────────────────────────────

/** The waddle: down on one side, up, down on the other, up. */
function walk(facing: Facing, step: 0 | 1 | 2 | 3): string[] {
  const down = step === 0 || step === 2;
  return frame({
    facing,
    dx: step === 0 ? -1 : step === 2 ? 1 : 0,
    dy: down ? 1 : 0,
    drx: down ? 0.5 : -0.5,
    dry: down ? -0.5 : 0.5,
    legs: step,
  });
}

/** The sneeze tell: drawing breath, stretched tall, quivering, a tickle at her nose. */
function tell(facing: Facing, k: 0 | 1): string[] {
  const se = facing === 'se';
  return frame(
    {
      facing,
      dx: k === 1 ? 1 : 0,
      dy: -1 - k,
      drx: -1 - k,
      dry: 1 + k,
      eyes: 'squint',
      mouth: 'o',
      legs: 1,
    },
    se ? [[31 + k, 25 - k, ['.F', 'F.', '.F']]] : [[29, 3 + k, ['F.F', '.F.']]],
  );
}

/** Fluff blown out in front of her (SE: down and to the right; NE: up and away). */
// prettier-ignore
const SPRAY_SE = [
  '......F...F...',
  '..F.wF..w...F.',
  'FwwFwwFF.w.F..',
  'wwFwwFw.F..w.F',
  'FwwFwwFF.w.F..',
  '..F.wF..w...F.',
  '......F...F...',
] as const;
// prettier-ignore
const SPRAY_NE = [
  '.F..w...F..',
  '...wF.F..w.',
  'F.wFwFw.F..',
  '..FwwwF....',
  '.wFwwF.....',
] as const;

function sneeze(facing: Facing, k: 0 | 1): string[] {
  const se = facing === 'se';
  if (k === 0) {
    return frame(
      { facing, dy: 2, drx: 2, dry: -2, eyes: 'shut', mouth: 'achoo', legs: 3 },
      se ? [[37, 21, SPRAY_SE]] : [[27, 0, SPRAY_NE]],
    );
  }
  return frame(
    { facing, dy: 1, drx: 0.5, dry: -0.5, eyes: 'dazed', mouth: 'grit', legs: 0 },
    se ? [[44, 22, ['.F.', 'F.w', '.w.']]] : [[33, 3, ['.F.', 'F.w']]],
  );
}

/** Dirt clods flung up behind her as she digs, in two alternating patterns. */
// prettier-ignore
const CLODS = [
  ['..N.....O.', 'O...N.....', '...O...N..', '.N....O...', 'O..N....N.'],
  ['O....N....', '...O....O.', '.N....N...', '...O.N...O', '.O.....N..'],
] as const;
/** A heap of turned earth piling up in front of her. */
// prettier-ignore
const HEAP = [
  '.......NO.O.......',
  '....NNNOONNO......',
  '..NNNOONNONNNO....',
  '.MNNMNNNMNNNNMN...',
  'MMNMMMNMMMMNMMMMM.',
  'MMMMMMMMMMMMMMMMMM',
] as const;

function dig(facing: Facing, k: 0 | 1): string[] {
  const se = facing === 'se';
  // Nose down into the heap in front of her (SE: right; NE: right, ahead of her), rump up behind,
  // the clods flying up off her back.
  return frame(
    {
      facing,
      dx: se ? 1 : 0,
      dy: 3 + k,
      drx: 0.5,
      dry: -1 - k * 0.5,
      eyes: 'squint',
      mouth: 'grit',
      legs: k === 0 ? 3 : 0,
    },
    [
      [1, 12 + k, CLODS[k]],
      [se ? 27 : 24, H - 6, HEAP],
    ],
  );
}

/** The mound she travels under, her crown poking out, the earth rippling as she goes. */
function under(facing: Facing, k: 0 | 1): string[] {
  const g = grid(W, H);
  const cx = AX + 0.5;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x + 0.5 - cx) / 16;
      const dy = (y + 0.5 - (H - 1)) / 8;
      if (dx * dx + dy * dy > 1 || y >= H - 1) continue;
      const lit = -0.6 * dx - 0.8 * dy;
      const ripple = (x + 2 * y + k * 3) % 6 === 0;
      plot(g, x, y, lit > 0.6 ? 'O' : ripple ? 'M' : lit > -0.1 ? 'N' : 'M');
    }
  }
  // The crown pokes out on top, with a tuft of her fur.
  const top = H - 8 - k;
  // Facing NE the crown sits a little back, as it does on her head, with a clod on the tuft.
  const crownX = facing === 'se' ? AX : AX - 2;
  stamp(g, crownX - 3, top + 1, ['.34.43.', '3443443']);
  crown(g, crownX, top + 1);
  if (facing === 'ne') stamp(g, crownX + 4, top + 2, ['N']);
  // Clods kicked up as she goes.
  stamp(g, k === 0 ? 3 : 6, H - 6 - k, ['O.', '.N']);
  stamp(g, k === 0 ? 41 : 38, H - 5 + k, ['.O', 'N.']);
  return rows(g);
}

/** Surfacing: the mound bursts with her head out; then she is up, shaking the dirt off. */
function surface(facing: Facing, k: 0 | 1): string[] {
  if (k === 0) {
    return frame({ facing, dy: 7, eyes: 'wide', mouth: 'o', legs: 'none', ground: H - 6 }, [
      [
        3,
        H - 7,
        [
          '....N..O..........O...N.....O...N...O..',
          '..MNNONNMNOONN.NNNOONNMNNONNOONNNMNNON.',
          '.MNNMNNNMNNNNMNNMNNNMNNNNMNNMNNNMNNNNMN',
          'MMNMMMNMMMMNMMMMNMMMNMMMMNMMNMMMNMMMMNM',
          '.MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM.',
        ],
      ],
      [1, 3, ['O....N.......O', '...O....N.....', '.N.....O...N..']],
      [36, 5, ['N...O...', '..O...N.', 'O.....O.']],
    ]);
  }
  return frame({ facing, dy: 0, drx: 1, dry: -0.5, eyes: 'squint', mouth: 'grit', legs: 2 }, [
    [2, 14, ['N', '.', 'O']],
    [43, 14, ['O', '.', 'N']],
    [5, 30, ['.O', 'N.']],
    [40, 31, ['N.', '.O']],
  ]);
}

/** Phase 3: a frantic scurry, eyes wide, sweat flying, speed lines behind (`haste_aura`). */
function panic(facing: Facing, k: 0 | 1): string[] {
  const se = facing === 'se';
  const lines = ['LLL..', '.....', 'LLLL.', '.....', '.LL..'];
  return frame(
    {
      facing,
      dx: se ? 1 : -1,
      dy: k === 0 ? 0 : -1,
      drx: 0.5,
      dry: -0.5,
      eyes: 'wide',
      mouth: 'wail',
      legs: k === 0 ? 'run0' : 'run1',
      spots: k === 0 ? 'lit0' : 'lit1',
    },
    [
      // Sweat drops flung back off her head.
      [se ? 7 : 40, 8 + k, se ? ['B..', '.B.', '...', 'B..'] : ['..B', '.B.', '...', '..B']],
      // Speed lines trailing behind (SE: on her left; NE: on her right).
      [se ? 0 : 46, 24 + k, se ? lines : flip(lines)],
    ],
  );
}

/** Invulnerable: puffed up into a bristling ball, eyes shut tight. */
function puff(facing: Facing, k: 0 | 1): string[] {
  return frame({
    facing,
    dy: -1,
    drx: 1,
    dry: 1,
    eyes: 'shut',
    mouth: 'grit',
    legs: 1,
    bristle: k,
  });
}

/** Driven off: running for the map edge, wailing, the youngling hanging on. */
function flee(facing: Facing, k: 0 | 1): string[] {
  const se = facing === 'se';
  const dust = ['.NO', 'ONN', '.O.'];
  return frame(
    {
      facing,
      dx: se ? 2 : -2,
      dy: k === 0 ? 0 : -1,
      drx: 1,
      dry: -1,
      eyes: 'teary',
      mouth: 'wail',
      legs: k === 0 ? 'run0' : 'run1',
    },
    // Dust kicked up behind her heels.
    [[se ? 1 : 47, H - 5 + k, se ? dust : flip(dust)]],
  );
}

// ── Sprite ─────────────────────────────────────────────────────────────────────────────────────

function framesFor<T extends number>(
  name: string,
  steps: readonly T[],
  make: (f: Facing, k: T) => string[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const f of ['se', 'ne'] as const)
    for (const k of steps) out[`${name}_${f}_${k}`] = make(f, k);
  return out;
}

export const enemyChitterbloom = defineSprite({
  id: 'enemy.chitterbloom',
  size: { w: W, h: H },
  anchor: { x: AX, y: H - 1 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  // Blossom petals and blush (pink), the dirt she digs (grime), tears and sweat (blue), the haste
  // speed lines (orange), the inside of her mouth (coral), and the fluff she sneezes (cream).
  legend: {
    P: 'pink.3',
    Q: 'pink.4',
    M: 'grime.2',
    N: 'grime.3',
    O: 'grime.4',
    B: 'blue.4',
    L: 'orange.3',
    R: 'coral.1',
    F: 'gold.4',
  },
  frames: {
    ...framesFor('walk', [0, 1, 2, 3], walk),
    ...framesFor('tell', [0, 1], tell),
    ...framesFor('sneeze', [0, 1], sneeze),
    ...framesFor('dig', [0, 1], dig),
    ...framesFor('under', [0, 1], under),
    ...framesFor('surface', [0, 1], surface),
    ...framesFor('panic', [0, 1], panic),
    ...framesFor('puff', [0, 1], puff),
    ...framesFor('flee', [0, 1], flee),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2', 'walk_se_3'], fps: 6 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2', 'walk_ne_3'], fps: 6 },
    walk_nw: { mirrorOf: 'walk_ne' },
    tell_se: { frames: ['tell_se_0', 'tell_se_1'], fps: 4 },
    tell_sw: { mirrorOf: 'tell_se' },
    tell_ne: { frames: ['tell_ne_0', 'tell_ne_1'], fps: 4 },
    tell_nw: { mirrorOf: 'tell_ne' },
    sneeze_se: { frames: ['sneeze_se_0', 'sneeze_se_1'], fps: 3, loop: false },
    sneeze_sw: { mirrorOf: 'sneeze_se' },
    sneeze_ne: { frames: ['sneeze_ne_0', 'sneeze_ne_1'], fps: 3, loop: false },
    sneeze_nw: { mirrorOf: 'sneeze_ne' },
    dig_se: { frames: ['dig_se_0', 'dig_se_1'], fps: 6 },
    dig_sw: { mirrorOf: 'dig_se' },
    dig_ne: { frames: ['dig_ne_0', 'dig_ne_1'], fps: 6 },
    dig_nw: { mirrorOf: 'dig_ne' },
    under_se: { frames: ['under_se_0', 'under_se_1'], fps: 6 },
    under_sw: { mirrorOf: 'under_se' },
    under_ne: { frames: ['under_ne_0', 'under_ne_1'], fps: 6 },
    under_nw: { mirrorOf: 'under_ne' },
    surface_se: { frames: ['surface_se_0', 'surface_se_1'], fps: 4, loop: false },
    surface_sw: { mirrorOf: 'surface_se' },
    surface_ne: { frames: ['surface_ne_0', 'surface_ne_1'], fps: 4, loop: false },
    surface_nw: { mirrorOf: 'surface_ne' },
    panic_se: { frames: ['panic_se_0', 'panic_se_1'], fps: 10 },
    panic_sw: { mirrorOf: 'panic_se' },
    panic_ne: { frames: ['panic_ne_0', 'panic_ne_1'], fps: 10 },
    panic_nw: { mirrorOf: 'panic_ne' },
    puff_se: { frames: ['puff_se_0', 'puff_se_1'], fps: 4 },
    puff_sw: { mirrorOf: 'puff_se' },
    puff_ne: { frames: ['puff_ne_0', 'puff_ne_1'], fps: 4 },
    puff_nw: { mirrorOf: 'puff_ne' },
    flee_se: { frames: ['flee_se_0', 'flee_se_1'], fps: 10 },
    flee_sw: { mirrorOf: 'flee_se' },
    flee_ne: { frames: ['flee_ne_0', 'flee_ne_1'], fps: 10 },
    flee_nw: { mirrorOf: 'flee_ne' },
  },
});
