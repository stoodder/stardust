// The Sunderglass Penitent (`sunderglass_penitent`, design/enemies.md § 6; A2M5's boss): a woven
// giant that kneels, Ves'thara inside it (story/races.md § Aelari). Woven, never plated
// (art-direction §4), but grave where the Glass Witch is graceful: broad and heavy where she is
// slender and pointed, sapphire lattice where she wears emerald robes, and the biggest Aelari on the
// road. A deep rounded hood bowed forward, its face a dark recess with two dim knots of light cast
// down; great woven shoulders sloping out like a cloak; long woven arms ending in fists bound at the
// wrists in ruby thread (its penance); two short pillar legs that march. Before it (facing us) it
// carries its **shield wall**, a tall pane of sunderglass: dark sapphire facets leaded together by
// emerald threads that radiate from a ruby knot at its heart, a break mended (the Concord's law:
// *mend; weave nothing new*); its hooded head bows over the pane's top. From behind: the hood's
// mound, the lattice of its back with a ridge of ruby knots down the spine, its heart's glow through
// the weave, the wall's edges showing past its hips. Its gaps are real holes; the outline is the
// weave's own (`outlineOutside`). Every boss state has its own shape, each in SE and NE (mirrored):
// - `walk`: the march, a heavy stomp (4 frames, 3 fps): a foot lifts, the body drops a pixel as it
//   lands, the weave hums.
// - `tell`: the recharge pulse's tell: the wall heaved up before it, its facets lit from the heart
//   out, the eyes gone white, motes of light rising over its shoulders (2 frames, 4 fps).
// - `broken`: the shield broken (phase 2): the facets shattered out of the leading, a jagged edge of
//   the wall left in each fist trailing loose threads, the chest open and its heart exposed and
//   blazing, its head bowed lower (4 frames, 3 fps, the march). Render shows it while the shield is
//   down; the re-formed shield marches in `walk`.
// - `kneel`: the Ward (A2M5's pivot): down on its knees with its head bowed low, its arms spread
//   wide and low over the road (sheltering), the wall laid down flat before it, its eyes shut, its
//   strands dimmed one ramp step and humming faintly (2 frames, 2 fps). WardView draws `kneel_se_0`.
// - `flee`: the stand-down (`leaving` for its 1 s fade): sinking, then the kneel, so the fading
//   boss and the Ward that takes its place read as one figure (2 frames, once).
import { defineSprite } from '../defineSprite.ts';
import { at, grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import type { AnimDef } from '../types.ts';
import { hum, outlineOutside, rim, weave, type Mask } from './lattice.ts';

const W = 44;
const H = 56;
/** The centre line (pixel edges): columns 21 and 22 mirror each other. */
const CX = 22;
/** The feet's bottom row standing; the outline is the row under it, the ground point. */
const FEET = 53;

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
  const land = beat % 2 === 0 ? 1 : 0;
  switch (pose) {
    case 'walk':
      return { pose, facing, beat, drop: land, bow: 0, kneel: 0 };
    case 'tell':
      return { pose, facing, beat, drop: 0, bow: 0, kneel: 0 };
    case 'broken':
      return { pose, facing, beat, drop: land, bow: 2, kneel: 0 };
    case 'kneel':
      return { pose, facing, beat, drop: 12, bow: 3, kneel: 2 };
    case 'flee':
      return beat === 0
        ? { pose, facing, beat, drop: 6, bow: 2, kneel: 1 }
        : { pose, facing, beat, drop: 12, bow: 3, kneel: 2 };
  }
}

/** The torso: great shoulders sloping out like a cloak from the hood, tapering to the hips. */
function torsoMask(f: Frame): Mask {
  return (x, y) => {
    const yy = y - f.drop;
    const d = dxOf(x);
    const top = 12 + Math.pow(Math.max(0, d - 5), 2) * 0.055;
    if (yy < top) return false;
    const bottom = f.kneel === 2 ? 42 : f.kneel === 1 ? 44 : 47;
    if (yy > bottom) return false;
    const hw = yy <= 22 ? 15 : 15 - ((yy - 22) * 5) / 25;
    return d <= hw;
  };
}

/** The left arm's line, shoulder to fist (the right mirrors it), per pose. */
function armLine(f: Frame): readonly [number, number, number, number] {
  const y0 = 17 + f.drop;
  if (f.kneel === 2) return [CX - 13, y0, CX - 19, 50];
  if (f.kneel === 1) return [CX - 13, y0, CX - 17, 47];
  if (f.pose === 'tell') return [CX - 13, y0, CX - 14, 31];
  if (f.pose === 'broken') return [CX - 13, y0, CX - 15, 37 + f.drop];
  return [CX - 13, y0, CX - 14, 36 + f.drop];
}

/** Distance from (px, py) to the segment (x0, y0)–(x1, y1). */
function segDist(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const vx = x1 - x0;
  const vy = y1 - y0;
  const t = Math.max(0, Math.min(1, ((px - x0) * vx + (py - y0) * vy) / (vx * vx + vy * vy || 1)));
  return Math.hypot(px - x0 - t * vx, py - y0 - t * vy);
}

/** Both arms (the right mirrors the left): thick woven limbs, 5 px across. */
function armsMask(f: Frame): Mask {
  const [x0, y0, x1, y1] = armLine(f);
  return (x, y) => {
    const px = x + 0.5 < CX ? x + 0.5 : 2 * CX - (x + 0.5);
    return segDist(px, y + 0.5, x0, y0, x1, y1) <= 2.4;
  };
}

/** The legs: two short pillars that march (a foot lifts on beats 1 and 3), or the kneel's. */
function legsMask(f: Frame): Mask {
  if (f.kneel === 2) {
    // Knees on the road: a knee forward on the left, a shin laid flat on the right.
    return (x, y) =>
      Math.hypot((x + 0.5 - (CX - 7)) / 4.5, (y + 0.5 - 50) / 3.5) <= 1 ||
      Math.hypot((x + 0.5 - (CX + 7)) / 5.5, (y + 0.5 - 51.5) / 2) <= 1;
  }
  if (f.kneel === 1) {
    return (x, y) =>
      Math.hypot((x + 0.5 - (CX - 6)) / 4, (y + 0.5 - 49) / 4.5) <= 1 ||
      Math.hypot((x + 0.5 - (CX + 6)) / 4, (y + 0.5 - 50) / 3.5) <= 1;
  }
  const lift = (side: number): number =>
    (f.beat === 1 && side < 0) || (f.beat === 3 && side > 0) ? 1 : 0;
  return (x, y) => {
    for (const side of [-1, 1]) {
      const lx = CX + side * 5.5;
      const bottom = FEET - lift(side);
      if (y < 43 + f.drop || y > bottom) continue;
      // A broad foot on the last two rows.
      const hw = y >= bottom - 1 ? 3.6 : 2.6;
      if (Math.abs(x + 0.5 - lx) <= hw) return true;
    }
    return false;
  };
}

/** The shield wall's pane, its top `top` rows down at the centre: a tall slab, its top peaked. */
function paneMask(top: number): Mask {
  return (x, y) => {
    const d = dxOf(x);
    if (d > 12) return false;
    return y >= top + Math.floor(d * 0.3) && y <= top + 31 - Math.floor(d * 0.15);
  };
}

/** The wall's top row at the centre, per pose (null: no pane before it). */
function paneTop(f: Frame): number | null {
  if (f.pose === 'walk') return 19 + f.drop;
  if (f.pose === 'tell') return 14;
  if (f.pose === 'broken') return 19 + f.drop;
  return null;
}

/** The leading, from the pane's heart (pane-local: x from the centre line, y from its top). */
const HEART = { x: 0, y: 11 } as const;
const LEADS: readonly (readonly [number, number])[] = [
  [0, -1],
  [-12, 3],
  [12, 6],
  [-12, 19],
  [12, 23],
  [-3, 32],
  [6, 32],
];

/** Steps a frame's sapphire and emerald threads down one ramp step (the kneel's dimmed weave). */
const DIM: Readonly<Record<string, string>> = { '4': '3', '3': '2', '2': '1', '9': '8', '8': '7' };

/**
 * The shield wall: an emerald frame round dark sapphire facets leaded by emerald threads that
 * radiate from a ruby knot. `lit` (the tell) fills the facets with light from the heart out;
 * `broken` (phase 2) leaves only the frame's sides and a few jagged facets at its edges.
 */
function drawPane(g: CharGrid, top: number, look: 'whole' | 'lit' | 'broken', beat: number): void {
  const pane = paneMask(top);
  const hx = CX - 0.5 + HEART.x;
  const hy = top + HEART.y;
  // The leading on a scratch grid: frame rows, then the radiating threads and the heart's ring.
  const lead: CharGrid = grid(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!pane(x, y)) continue;
      const edge = !pane(x - 1, y) || !pane(x + 1, y) || !pane(x, y - 1) || !pane(x, y + 1);
      const inner = !pane(x - 2, y) || !pane(x + 2, y) || !pane(x, y - 2);
      if (edge) plot(lead, x, y, x + 0.5 < CX || !pane(x, y - 1) ? '8' : '6');
      else if (inner) plot(lead, x, y, x + 0.5 < CX ? '7' : '6');
    }
  }
  for (const [lx, ly] of LEADS) {
    line(lead, Math.floor(hx), hy, Math.floor(hx + lx), top + ly, '7');
  }
  for (let a = 0; a < 16; a++) {
    const t = (a / 16) * Math.PI * 2;
    plot(lead, Math.floor(hx + 0.5 + Math.cos(t) * 3.2), Math.floor(hy + 0.5 + Math.sin(t) * 3.2), '8');
  }
  // Which facet each glass pixel is in (flood-filled between the leads), for its tone.
  const facet = new Map<number, number>();
  let n = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = y * W + x;
      if (!pane(x, y) || at(lead, x, y) !== '.' || facet.has(k)) continue;
      const stack = [k];
      facet.set(k, n);
      while (stack.length > 0) {
        const c = stack.pop() ?? 0;
        const cx = c % W;
        const cy = Math.floor(c / W);
        for (const [nx, ny] of [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ] as const) {
          const nk = ny * W + nx;
          if (pane(nx, ny) && at(lead, nx, ny) === '.' && !facet.has(nk)) {
            facet.set(nk, n);
            stack.push(nk);
          }
        }
      }
      n++;
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!pane(x, y)) continue;
      const d = Math.hypot(x + 0.5 - hx, y + 0.5 - hy);
      const l = at(lead, x, y);
      if (look === 'broken') {
        // Only the frame's sides survive, with jagged teeth of glass along them.
        const side = dxOf(x) >= 10 - Math.floor(((x * 7 + y * 3) % 5) / 2);
        if (!side || y < top + 3 + ((x * 5) % 4) || y > top + 27 - ((x * 3) % 5)) continue;
        plot(g, x, y, l !== '.' ? l : (x + y) % 3 === 0 ? '3' : '1');
        continue;
      }
      if (l !== '.') {
        plot(g, x, y, look === 'lit' && d < 6 + beat * 4 && l === '7' ? '9' : l);
        continue;
      }
      const id = facet.get(y * W + x) ?? 0;
      // Light catches each facet along its upper-left leading.
      const caught = at(lead, x - 1, y) !== '.' || at(lead, x, y - 1) !== '.';
      if (look === 'lit') {
        const glow = d < 4 + beat * 4;
        plot(g, x, y, glow ? (d < 3 ? '*' : '+') : caught ? '4' : id % 2 === 0 ? '2' : '3');
      } else {
        plot(g, x, y, caught ? (id % 3 === 0 ? '4' : '3') : id % 2 === 0 ? '1' : '2');
      }
    }
  }
  if (look === 'broken') return;
  if (look === 'whole') {
    // A glint across the glass, high on the left.
    for (let k = 0; k < 4; k++) {
      const x = CX - 8 + k;
      const y = top + 8 - k;
      if (pane(x, y) && at(lead, x, y) === '.') plot(g, x, y, k === 1 ? 'w' : '4');
    }
  }
  // The ruby knot at the heart (white-hot in the tell).
  const kx = Math.floor(hx) - 1;
  stamp(g, kx, hy - 1, look === 'lit' ? ['d*c', '***', 'c*b'] : ['.d.', 'd+c', '.c.']);
}

/** The hood: a deep cowl of dense weave, its face a dark recess with two dim eyes cast down. */
function drawHead(g: CharGrid, f: Frame): void {
  const cy = 13.5 + f.drop + f.bow;
  const hood: Mask = (x, y) =>
    Math.hypot((x + 0.5 - CX) / 6.2, (y + 0.5 - cy) / 6.4) <= 1 && y + 0.5 < cy + 5.5;
  const front = f.facing === 'se';
  const recess: Mask = (x, y) =>
    front && Math.hypot((x + 0.5 - CX) / 3.6, (y + 0.5 - (cy + 2.2)) / 4) <= 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (hood(x, y)) plot(g, x, y, '.');
  weave(
    g,
    (x, y) => hood(x, y) && !recess(x, y),
    { mode: 'diag', spacing: 2, phase: 1, lx: CX - 3, ly: cy - 3 },
    6,
  );
  rim(g, hood, CX - 3, cy - 3);
  // A ruby knot at the hood's brow (on its crown from behind).
  plot(g, CX - 1, Math.round(cy - 5), 'd');
  plot(g, CX, Math.round(cy - 5), 'c');
  if (!front) return;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) if (recess(x, y)) plot(g, x, y, y + 0.5 < cy ? '0' : '0');
  }
  // The recess's lit lower rim, under the brow's shadow.
  const ey = Math.round(cy + 3);
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
    // The binding: two turns of ruby round the wrist.
    stamp(g, fx - 1, fy - 3, ['cddc', '.cc.']);
    if (f.kneel === 2) {
      // Palms down on the road, fingers spread as knots.
      stamp(g, fx - 1, fy - 1, ['3443', '4..4']);
    } else {
      stamp(g, fx - 1, fy - 1, ['.43.', '4432', '.32.']);
    }
  }
}

/** Loose threads hanging from the broken wall's leading, swaying with the march. */
function drawLooseThreads(g: CharGrid, f: Frame, top: number): void {
  const sway = f.beat === 1 || f.beat === 2 ? 1 : 0;
  for (const [x, y, len] of [
    [CX - 8, top + 6, 5],
    [CX - 6, top + 20, 4],
    [CX + 8, top + 9, 4],
    [CX + 6, top + 22, 5],
  ] as const) {
    for (let k = 0; k < len; k++) {
      plot(g, x + (k >= len - 2 ? sway * Math.sign(x - CX) : 0), y + k, k === len - 1 ? 'c' : '7');
    }
  }
}

/** The wall laid down flat on the road before it (the kneel): a thin slab of frame and glass. */
function drawLaidShield(g: CharGrid): void {
  for (let x = CX - 11; x < CX + 11; x++) {
    const end = x === CX - 11 || x === CX + 10;
    plot(g, x, 51, end ? '7' : '8');
    plot(g, x, 52, end ? '6' : (x - CX + 30) % 4 === 0 ? '7' : (x + 1) % 3 === 0 ? '2' : '1');
    plot(g, x, 53, '6');
  }
  plot(g, CX - 1, 52, 'd');
  plot(g, CX, 52, 'c');
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
  const heartY = 28 + f.drop;

  // From behind, the wall shows past its hips and (raised) over its shoulders: drawn first, the
  // body over it.
  if (!front && top !== null && pose !== 'broken') drawPane(g, top, pose === 'tell' ? 'lit' : 'whole', beat);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (body(x, y)) plot(g, x, y, '.');
  weave(g, body, { mode: 'diag', spacing: 4, phase: 0, rise: f.drop, lx: CX, ly: heartY }, 8);
  // Warp ribs down the torso, following its taper (lit left, shaded right): the cloth's structure,
  // so the big body reads as woven, not as a mesh.
  for (let y = 0; y < H; y++) {
    for (const u of [-0.72, -0.36, 0, 0.36, 0.72]) {
      let hw = 0;
      while (torso(Math.floor(CX + hw), y) && hw < 20) hw++;
      if (hw < 3) continue;
      const x = Math.floor(CX + u * hw);
      if (torso(x, y)) plot(g, x, y, u <= 0 ? '3' : '2');
    }
  }
  rim(g, body, CX - 6, heartY - 8);
  hum(g, torso, beat, front ? 41 : 42);

  if (front) {
    if (pose === 'broken') {
      // The chest open: the heart exposed and blazing, its ruby knot under it.
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
    for (let k = 0; k < 6; k++) {
      const y = 18 + f.drop + k * 4;
      if (!torso(CX - 1, y)) continue;
      plot(g, CX - 1, y, k % 2 === 0 ? 'd' : 'c');
      plot(g, CX, y, 'c');
    }
  }

  drawHead(g, f);
  if (f.kneel > 0) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dim = DIM[at(g, x, y)];
        if (dim !== undefined) plot(g, x, y, dim);
      }
    }
  }
  if (f.kneel === 2 && front) drawLaidShield(g);
  if (front && top !== null) {
    drawPane(g, top, pose === 'tell' ? 'lit' : pose === 'broken' ? 'broken' : 'whole', beat);
  }
  drawFists(g, f);
  if (front && pose === 'broken' && top !== null) drawLooseThreads(g, f, top);

  if (pose === 'tell') {
    // Light gathering: motes rising over its shoulders, more and higher on the second beat.
    const motes: readonly (readonly [number, number])[] =
      beat === 0
        ? [
            [CX - 11, 9],
            [CX + 10, 9],
            [CX - 6, 6],
          ]
        : [
            [CX - 12, 6],
            [CX + 11, 6],
            [CX - 7, 3],
            [CX + 6, 3],
            [CX - 1, 1],
          ];
    for (const [x, y] of motes) {
      plot(g, x, y, '*');
      plot(g, x, y + 1, '+');
    }
  }
  outlineOutside(g);
  return rows(g);
}

const POSES: readonly (readonly [PenitentPose, number, number])[] = [
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
    anims[`${pose}_${f}`] =
      pose === 'flee' ? { frames: names, fps, loop: false } : { frames: names, fps };
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
