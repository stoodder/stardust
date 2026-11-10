// The Sunderglass Penitent (`sunderglass_penitent`, design/enemies.md § 6; A2M5's boss): a woven
// giant that kneels, Ves'thara inside it (story/races.md § Aelari). Woven, never plated
// (art-direction §4), but grave where the Glass Witch is graceful: broad and hunched where she is
// tall and pointed, sapphire lattice where she wears emerald robes. Two great shoulders of open
// weave (real holes: the ground shows through) rise higher than its head, which hangs low and
// hooded between them, its two dim knots of light cast down; long woven arms end in fists bound at
// the wrists with ruby thread (its penance), and it marches on two short pillar legs. In front of it
// (facing us) it carries its **shield wall**: a tall pointed pane of sunderglass, dark sapphire
// glass woven square in a lit emerald frame, a ruby knot at its heart, which its head bows over.
// From behind: the hunched back, a ridge of ruby knots down its spine, its heart's glow through
// the weave. Every boss state has its own shape, each in SE and NE (mirrored to SW/NW):
// - `walk`: the march, a heavy stomp (4 frames, 3 fps): a foot lifts, the body drops a pixel as it
//   lands, the weave hums.
// - `tell`: the recharge pulse's tell: the wall heaved up before it, the pane lit from inside with
//   gathering light, the heart's knot blazing white, motes of light rising over its shoulders (2
//   frames, 4 fps).
// - `broken`: the shield broken (phase 2): the pane shattered out of its frame, a jagged shard of
//   the frame left in each fist trailing loose threads, its chest open and its heart exposed,
//   blazing; its head bowed a pixel lower (4 frames, 3 fps, the march). Render shows it while the
//   shield is down (the shield-broken phase; the re-formed shield walks).
// - `kneel`: the Ward (A2M5's pivot): down on its knees, head bowed to the ground, arms spread
//   low and wide over the road (sheltering), its shield wall laid down flat before it, its strands
//   dimmed one ramp step and humming faintly, its eyes shut (2 frames, 2 fps). WardView draws
//   `kneel_se_0`.
// - `flee`: the stand-down (`leaving` for its 1 s fade): sinking to its knees, then the kneel, so
//   the fading boss and the Ward that replaces it read as one figure (2 frames, once).
import { defineSprite } from '../defineSprite.ts';
import { at, grid, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import type { AnimDef } from '../types.ts';
import { hum, outlineOutside, rim, weave, type Mask } from './lattice.ts';

const W = 44;
const H = 46;
/** The centre line (pixel edges): columns 21 and 22 mirror each other. */
const CX = 22;
/** The feet's bottom row standing; the outline is the row under it, the ground point. */
const FEET = 43;

export type PenitentPose = 'walk' | 'tell' | 'broken' | 'kneel' | 'flee';
type Facing = 'se' | 'ne';

/** How far a pixel column sits from the centre line. */
const dxOf = (x: number): number => Math.abs(x + 0.5 - CX);

interface Frame {
  readonly pose: PenitentPose;
  readonly facing: Facing;
  readonly beat: number;
  /** Rows the upper body sits lower than standing (the stomp's landing, the kneel). */
  readonly drop: number;
  /** Extra rows the head hangs (bowed deeper). */
  readonly bow: number;
  /** 0 standing, 1 sinking (half down), 2 kneeling. */
  readonly kneel: 0 | 1 | 2;
}

function frameOf(pose: PenitentPose, facing: Facing, beat: number): Frame {
  // The march: down on frames 0 and 2 (both feet planted), up a pixel on 1 and 3 (a foot lifts).
  const stride = beat % 2 === 1 ? 0 : 1;
  switch (pose) {
    case 'walk':
      return { pose, facing, beat, drop: stride, bow: 0, kneel: 0 };
    case 'tell':
      return { pose, facing, beat, drop: 0, bow: 0, kneel: 0 };
    case 'broken':
      return { pose, facing, beat, drop: stride, bow: 1, kneel: 0 };
    case 'kneel':
      return { pose, facing, beat, drop: 9, bow: 2, kneel: 2 };
    case 'flee':
      return beat === 0
        ? { pose, facing, beat, drop: 5, bow: 1, kneel: 1 }
        : { pose, facing, beat, drop: 9, bow: 2, kneel: 2 };
  }
}

/** The torso: two great woven shoulders rising higher than the head, tapering to the hips. */
function torsoMask(f: Frame): Mask {
  return (x, y) => {
    const yy = y - f.drop;
    const d = dxOf(x);
    // The shoulders' tops: a hump either side, highest 9 px out from the centre.
    const top = d < 4 ? 15 : 11 + Math.pow((d - 9) / 5, 2) * 4;
    if (yy < top) return false;
    const bottom = f.kneel === 2 ? 34 : f.kneel === 1 ? 36 : 38;
    if (yy > bottom) return false;
    const hw = yy <= 26 ? 14 : 14 - ((yy - 26) * 5) / 12;
    return d <= hw;
  };
}

/** Where each arm runs (shoulder to fist), per pose: [x0, y0, x1, y1] for the left arm. */
function armLine(f: Frame): readonly [number, number, number, number] {
  const y0 = 16 + f.drop;
  if (f.kneel === 2) return [CX - 12, y0, CX - 19, 41];
  if (f.kneel === 1) return [CX - 12, y0, CX - 16, 39];
  if (f.pose === 'tell') return [CX - 12, y0, CX - 13, 24];
  if (f.pose === 'broken') return [CX - 12, y0, CX - 14, 30 + f.drop];
  return [CX - 12, y0, CX - 13, 30 + f.drop];
}

/** Distance from (px, py) to the segment (x0, y0)–(x1, y1). */
function segDist(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const vx = x1 - x0;
  const vy = y1 - y0;
  const t = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(px - x0 - t * vx, py - y0 - t * vy);
}

/** Both arms (the right mirrors the left): thick woven limbs, 4 px across. */
function armsMask(f: Frame): Mask {
  const [x0, y0, x1, y1] = armLine(f);
  return (x, y) => {
    const px = x + 0.5 < CX ? x + 0.5 : 2 * CX - (x + 0.5);
    return segDist(px, y + 0.5, x0, y0, x1, y1) <= 2.1;
  };
}

/** The legs: two short pillars that march (a foot lifts on beats 1 and 3), or the kneel's. */
function legsMask(f: Frame): Mask {
  if (f.kneel === 2) {
    // Knees on the road: a knee forward on the left, a shin laid flat on the right.
    return (x, y) =>
      Math.hypot((x + 0.5 - (CX - 7)) / 4, (y + 0.5 - 40.5) / 3) <= 1 ||
      Math.hypot((x + 0.5 - (CX + 7)) / 5, (y + 0.5 - 42) / 1.8) <= 1;
  }
  if (f.kneel === 1) {
    return (x, y) =>
      Math.hypot((x + 0.5 - (CX - 6)) / 3.5, (y + 0.5 - 39.5) / 4) <= 1 ||
      Math.hypot((x + 0.5 - (CX + 6)) / 3.5, (y + 0.5 - 40.5) / 3) <= 1;
  }
  const lift = (side: number): number =>
    (f.beat === 1 && side < 0) || (f.beat === 3 && side > 0) ? 1 : 0;
  return (x, y) => {
    for (const side of [-1, 1]) {
      const lx = CX + side * 5.5;
      const bottom = FEET - lift(side);
      if (y < 34 + f.drop || y > bottom) continue;
      // A broad foot on the last two rows.
      const hw = y >= bottom - 1 ? 3.5 : 2.5;
      if (Math.abs(x + 0.5 - lx) <= hw) return true;
    }
    return false;
  };
}

/** The shield wall's pane: a tall pointed arch, its top `top` rows down at the centre. */
function paneMask(top: number): Mask {
  return (x, y) => {
    const d = dxOf(x);
    if (d > 10.5) return false;
    return y >= top + Math.floor(d * 0.4) && y <= top + 20;
  };
}

/** Rows the shield wall's top sits at, per pose (null: no pane in front). */
function paneTop(f: Frame): number | null {
  if (f.pose === 'walk') return 20 + f.drop;
  if (f.pose === 'tell') return 13;
  return null;
}

/** Steps a frame's sapphire and emerald threads down one ramp step (the kneel's dimmed weave). */
const DIM: Readonly<Record<string, string>> = { '4': '3', '3': '2', '2': '1', '9': '8', '8': '7' };

/** The shield wall: an emerald frame round a dark pane woven square, a ruby knot at its heart. */
function drawPane(g: CharGrid, top: number, lit: boolean, beat: number): void {
  const pane = paneMask(top);
  const heartY = top + 10;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!pane(x, y)) continue;
      // How deep inside the pane: 0 on its edge, 1 the frame's inner row, 2+ the glass.
      let depth = 3;
      for (let r = 1; r <= 2; r++) {
        if (!pane(x - r, y) || !pane(x + r, y) || !pane(x, y - r) || !pane(x, y + r)) {
          depth = Math.min(depth, r - 1);
        }
      }
      const left = x + 0.5 < CX;
      if (depth === 0) {
        // The frame's outer row: lit emerald on the upper left, shaded on the lower right.
        const litEdge = left || !pane(x, y - 1);
        plot(g, x, y, litEdge ? '8' : '6');
        continue;
      }
      if (depth === 1) {
        plot(g, x, y, left ? '7' : '6');
        continue;
      }
      // The glass: woven square every 3 px, knots where warp meets weft; lit, it fills with light.
      const warp = (x - CX + 30) % 3 === 0;
      const weft = (y - top + 30) % 3 === 1;
      const d = Math.hypot(x + 0.5 - CX, y + 0.5 - heartY);
      if (lit) {
        const glow = d < 3 + beat * 2;
        plot(g, x, y, warp && weft ? '+' : warp || weft ? (glow ? '+' : '4') : glow ? '9' : '2');
      } else {
        plot(g, x, y, warp && weft ? '3' : warp || weft ? '2' : '1');
      }
    }
  }
  if (!lit) {
    // A glint of light across the glass, high on the left.
    for (let k = 0; k < 5; k++) {
      const x = CX - 7 + k;
      const y = top + 9 - k;
      if (pane(x, y) && at(g, x, y) !== '6' && at(g, x, y) !== '7' && at(g, x, y) !== '8') {
        plot(g, x, y, k === 2 ? 'w' : '4');
      }
    }
  }
  // The ruby knot at the pane's heart (blazing white in the tell).
  stamp(g, CX - 2, heartY - 1, lit ? ['.d*d.', 'd***d', '.d*d.'] : ['..d..', '.d+c.', '..c..']);
}

/** The hood: a cowl of dense weave sunk between the shoulders, its face a dark recess. */
function drawHead(g: CharGrid, f: Frame): void {
  const cy = 17.5 + f.drop + f.bow;
  const hood: Mask = (x, y) => Math.hypot((x + 0.5 - CX) / 4.6, (y + 0.5 - cy) / 4.6) <= 1;
  const front = f.facing === 'se';
  const recess: Mask = (x, y) =>
    front && Math.hypot((x + 0.5 - CX) / 2.7, (y + 0.5 - (cy + 1.2)) / 3) <= 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (hood(x, y)) plot(g, x, y, '.');
  weave(
    g,
    (x, y) => hood(x, y) && !recess(x, y),
    { mode: 'diag', spacing: 2, phase: 1, lx: CX - 2, ly: cy - 2 },
    5,
  );
  rim(g, hood, CX - 2, cy - 2);
  if (!front) return;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) if (recess(x, y)) plot(g, x, y, '0');
  }
  const ey = Math.round(cy + 1.5);
  if (f.kneel > 0) {
    // Eyes shut: two dim seams.
    plot(g, CX - 2, ey, '2');
    plot(g, CX + 1, ey, '2');
  } else {
    // Two knots of light cast down; white in the tell, as the light gathers.
    const eye = f.pose === 'tell' ? 'w' : '+';
    plot(g, CX - 2, ey, eye);
    plot(g, CX + 1, ey, eye);
  }
}

/** The fists, bound at the wrists in ruby thread (the right mirrors the left). */
function drawFists(g: CharGrid, f: Frame): void {
  const [, , x1, y1] = armLine(f);
  for (const side of [-1, 1]) {
    const fx = side < 0 ? Math.round(x1) - 1 : Math.round(2 * CX - x1) - 1;
    const fy = Math.round(y1);
    // The binding: two turns of ruby round the wrist, a knot hanging off it.
    plot(g, fx - 1, fy - 2, 'c');
    plot(g, fx, fy - 2, 'd');
    plot(g, fx + 1, fy - 2, 'd');
    plot(g, fx + 2, fy - 2, 'c');
    plot(g, fx, fy - 1, 'c');
    plot(g, fx + 1, fy - 1, 'c');
    // The fist: a knot of thread with a lit knuckle.
    if (f.kneel === 2) {
      // Palms down on the road, fingers spread as knots.
      stamp(g, fx - 1, fy, ['3443', '3..3']);
    } else {
      stamp(g, fx, fy, ['43', '32']);
    }
  }
}

/** The broken shield: a jagged shard of the frame in each fist, trailing loose threads. */
function drawShards(g: CharGrid, f: Frame): void {
  const top = 20 + f.drop;
  // prettier-ignore
  const leftShard = [
    '8.....',
    '87....',
    '871...',
    '8723..',
    '8712..',
    '871...',
    '8721..',
    '8723.1',
    '871...',
    '87....',
    '8712..',
    '871...',
    '87....',
    '6.....',
  ];
  // prettier-ignore
  const rightShard = [
    '...6',
    '..76',
    '.276',
    '2176',
    '..76',
    '.176',
    '..76',
    '...6',
  ];
  stamp(g, CX - 12, top + 3, leftShard);
  stamp(g, CX + 8, top + 6, rightShard);
  // Loose threads hanging from where the pane tore out of the frame, swaying with the march.
  const sway = f.beat === 1 || f.beat === 2 ? 1 : 0;
  for (const [x, y, len] of [
    [CX - 9, top + 10, 4],
    [CX - 8, top + 15, 3],
    [CX + 9, top + 14, 4],
  ] as const) {
    for (let k = 0; k < len; k++) {
      plot(g, x + (k === len - 1 ? sway : 0), y + k, k === len - 1 ? 'c' : '7');
    }
  }
}

/** The shield laid down flat on the road before it (the kneel): a thin slab, frame and glass. */
function drawLaidShield(g: CharGrid): void {
  for (let x = CX - 9; x < CX + 9; x++) {
    const edge = x === CX - 9 || x === CX + 8;
    plot(g, x, 42, edge ? '7' : '8');
    plot(g, x, 43, edge ? '6' : (x - CX + 30) % 3 === 0 ? '3' : '1');
    plot(g, x, 44, '6');
  }
  plot(g, CX - 1, 43, 'd');
  plot(g, CX, 43, 'c');
}

function penitent(pose: PenitentPose, facing: Facing, beat: number): string[] {
  const g: CharGrid = grid(W, H);
  const f = frameOf(pose, facing, beat);
  const front = facing === 'se';
  const top = paneTop(f);
  const torso = torsoMask(f);
  const arms = armsMask(f);
  const legs = legsMask(f);
  const body: Mask = (x, y) => torso(x, y) || arms(x, y) || legs(x, y);
  const heartY = 26 + f.drop;

  // From behind, the raised wall's top shows over its shoulders: drawn first, the body over it.
  if (!front && top !== null && pose === 'tell') drawPane(g, top, true, beat);
  weave(g, body, { mode: 'diag', spacing: 3, phase: 0, rise: f.drop, lx: CX, ly: heartY }, 9);
  rim(g, body, CX - 6, heartY - 6);
  // The hum: a few strands slide on the off beat (faintly, kneeling).
  hum(g, torso, beat, front ? 41 : 42);

  // The heart: behind the wall when it marches, open and blazing when the wall is broken, dim when
  // it kneels; from behind, only its glow through the weave.
  if (front) {
    if (pose === 'broken') {
      stamp(g, CX - 3, heartY - 2, ['..+..', '.+*+.', '+***+', '.+*+.', '..+..']);
      plot(g, CX - 1, heartY + 3, 'd');
      plot(g, CX, heartY + 3, 'c');
    } else if (f.kneel > 0) {
      stamp(g, CX - 2, heartY - 1, ['.+.', '+*+', '.+.']);
    }
  } else {
    plot(g, CX - 1, heartY, '+');
    plot(g, CX, heartY + 1, '+');
    // The spine: a ridge of ruby knots down its back.
    for (let k = 0; k < 5; k++) {
      const y = 15 + f.drop + k * 4;
      if (!torso(CX - 1, y)) continue;
      plot(g, CX - 1, y, k % 2 === 0 ? 'd' : 'c');
      plot(g, CX, y, 'c');
    }
  }

  drawHead(g, f);
  drawFists(g, f);
  if (f.kneel > 0) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = at(g, x, y);
        const dim = DIM[c];
        if (dim !== undefined) plot(g, x, y, dim);
      }
    }
  }
  if (f.kneel === 2 && front) drawLaidShield(g);
  if (front && top !== null) drawPane(g, top, pose === 'tell', beat);
  if (front && pose === 'broken') drawShards(g, f);

  if (pose === 'tell') {
    // Light gathering: motes rising over its shoulders toward the wall, more on the second beat.
    const motes: [number, number][] =
      beat === 0
        ? [
            [CX - 9, 8],
            [CX + 8, 8],
            [CX - 1, 10],
          ]
        : [
            [CX - 10, 6],
            [CX + 9, 6],
            [CX - 5, 8],
            [CX + 4, 8],
            [CX - 1, 7],
          ];
    for (const [x, y] of motes) {
      plot(g, x, y, '*');
      plot(g, x, y + 1, '+');
    }
  }
  outlineOutside(g);
  return rows(g);
}

const POSES: readonly [PenitentPose, number, number][] = [
  ['walk', 4, 3],
  ['tell', 2, 4],
  ['broken', 4, 3],
  ['kneel', 2, 2],
  ['flee', 2, 3],
];

const frames: Record<string, string[]> = {};
const anims: Record<string, AnimDef> = {};
for (const [pose, n, fps] of POSES) {
  for (const f of ['se', 'ne'] as const) {
    const names: string[] = [];
    for (let k = 0; k < n; k++) {
      const name = `${pose}_${f}_${k}`;
      frames[name] = penitent(pose, f, k);
      names.push(name);
    }
    anims[`${pose}_${f}`] = pose === 'flee' ? { frames: names, fps, loop: false } : { frames: names, fps };
    anims[`${pose}_${f === 'se' ? 'sw' : 'nw'}`] = { mirrorOf: `${pose}_${f}` };
  }
}

export const enemySunderglassPenitent = defineSprite({
  id: 'enemy.sunderglass_penitent',
  size: { w: W, h: H },
  // Between its feet, on the outline row under them.
  anchor: { x: CX, y: FEET + 1 },
  palette: 'aelari',
  // The outline is the weave's own (lattice.ts `outlineOutside`), so the gaps stay see-through.
  outline: 'none',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames,
  anims,
});
