// The Unsung on screen (T830; art-direction §6 *The Unsung*, design/enemies.md § *How the Unsung
// runs*): pure rules, unit-tested; EnemyView and UnsungView apply them. Render reads sim state only.
// - **One body per form, picked by boss phase** (`unsungBody`, sprites/enemies/unsung.ts
//   `UNSUNG_FORM_SPRITE`): phase 1 gathers in `enemy.unsung` and grows into `enemy.unsung_g1`–`_g5`
//   by `absorbs` (like the Maw's, `UNSUNG_STAGES`); phase 2 is the split's torn body
//   (`enemy.unsung_split`, through its 1.5 s telegraph until the parts stand), phase 3 the risen,
//   burrowing body (`enemy.unsung_burrow`: `dig`, `under`, `surface`, `phase`), phase 4 the Song
//   (`enemy.unsung_song`). EnemyView swaps its body as the phase moves (`formBody`), so every pose
//   (enemyPose.ts) plays in the form's own sprite. The split's pieces are their own def's body
//   (`enemy.unsung_part`).
// - **Laid to rest** (`UNSUNG_REST_SPRITE`): SongView plays `rest_<facing>` once (the gold flip from
//   the outline in), then the rested body's `walk_<facing>` breath as it rises UNSUNG_RISE_PX and
//   fades down the stepped-alpha ladder (`unsungRestAt`); held where it stood, fading only, under
//   reduced motion.
// - **The dig** (UnsungView): the ring where it will come up closes from wide to tight as it travels
//   (`digRingTiles`); through the surfacing tell the singers' ground churns: the ring blinks and
//   CHURN_CLODS `grime.3` clods hop on it (`clodAt`), still under reduced motion. As it comes up
//   among the singers a `violet.4` burst rings out (`surfaceBurstAt`, SURFACE_BURST_MS).
import { UNSUNG_FORM_SPRITE, UNSUNG_STAGES } from '../../content/sprites/enemies/unsung.ts';
import { TILE_H } from '../iso.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';
import type { Facing } from './spriteInfo.ts';

/** The Unsung's def body (its form-1 sprite): EnemyView swaps from it by phase. */
export const UNSUNG_BODY: string = UNSUNG_FORM_SPRITE[1];

/** Whether a unit drawn from def body `base` is the Unsung (its body follows its phase). */
export function isUnsungBody(base: string): boolean {
  return base === UNSUNG_BODY;
}

/** What the form reads of the unit. */
export interface UnsungFormFacts {
  readonly bossPhase: number;
  readonly absorbs: number;
}

/** The body the Unsung draws now: its phase's form; phase 1 by its absorbs (see the header). */
export function unsungBody(e: UnsungFormFacts): string {
  const p = e.bossPhase;
  if (p >= 4) return UNSUNG_FORM_SPRITE[4];
  if (p === 3) return UNSUNG_FORM_SPRITE[3];
  if (p === 2) return UNSUNG_FORM_SPRITE[2];
  const n = Math.min(UNSUNG_STAGES, Math.floor(e.absorbs));
  return n <= 0 ? UNSUNG_BODY : `${UNSUNG_BODY}_g${n}`;
}

/** The rested body's rise (px) over its fade. */
export const UNSUNG_RISE_PX = 18;
/** The flip (`rest_<facing>`: 4 frames at 8 fps) before it starts to rise. */
export const UNSUNG_FLIP_MS = 500;
/** How long the rested body rises and fades after the flip. */
export const UNSUNG_RISE_MS = 2600;

/** Where the rested Unsung is at `ms` after it was laid to rest: its lift (px) and alpha. */
export function unsungRestAt(
  ms: number,
  still: boolean,
  out: { lift: number; alpha: number },
): { lift: number; alpha: number } {
  const t = (ms - UNSUNG_FLIP_MS) / UNSUNG_RISE_MS;
  if (t <= 0) {
    out.lift = 0;
    out.alpha = 1;
    return out;
  }
  out.lift = still ? 0 : Math.round(UNSUNG_RISE_PX * Math.min(1, t));
  // Whole through the first half of its rise, then down the ladder.
  out.alpha = t >= 1 ? 0 : t < 0.5 ? 1 : STEPPED_ALPHA[Math.min(3, 1 + Math.floor((t - 0.5) * 6))]!;
  return out;
}

/** The facing an anim key ends in (`…walk_ne` → 'ne'), or 'se' when it names none. */
export function facingOfKey(key: string | null): Facing {
  if (key === null || key.length < 3) return 'se';
  const f = key.slice(-2);
  return f === 'sw' || f === 'ne' || f === 'nw' ? f : 'se';
}

/** The dig ring's size (tiles across): wide as it digs in, tight under the singers. */
export const DIG_RING_WIDE = 1.6;
export const DIG_RING_TIGHT = 0.6;

/** The ring at `progress` (0 dug in … 1 arrived) of its travel; tight through the surfacing tell. */
export function digRingTiles(progress: number, telling: boolean): number {
  if (telling) return DIG_RING_TIGHT;
  const k = progress < 0 ? 0 : progress > 1 ? 1 : progress;
  return DIG_RING_WIDE - (DIG_RING_WIDE - DIG_RING_TIGHT) * k;
}

/** Clods hopping on the churning ground through the surfacing tell. */
export const CHURN_CLODS = 6;
/** One clod's hop (ms) and height (px). */
const CLOD_HOP_MS = 260;
const CLOD_HOP_PX = 3;

/**
 * Clod `i` of CHURN_CLODS on a ring `w`×`h` px across at `ms` into the tell: evenly round the ring,
 * each hopping up and down out of step with the next; at rest on the ring under reduced motion.
 */
export function clodAt(
  i: number,
  ms: number,
  w: number,
  h: number,
  still: boolean,
  out: { dx: number; dy: number },
): { dx: number; dy: number } {
  const a = (i / CHURN_CLODS) * Math.PI * 2 + 0.4;
  out.dx = Math.round((Math.cos(a) * w) / 2);
  let dy = (Math.sin(a) * h) / 2;
  if (!still) {
    const ph = ((ms + i * 97) % CLOD_HOP_MS) / CLOD_HOP_MS;
    dy -= Math.sin(ph * Math.PI) * CLOD_HOP_PX;
  }
  out.dy = Math.round(dy);
  return out;
}

/** The surfacing burst: a `violet.4` ring from 0.4 to 1.4 tiles over SURFACE_BURST_MS. */
export const SURFACE_BURST_MS = 480;
const BURST_FROM = 0.4;
const BURST_TO = 1.4;

/** The burst at `ms`: its size (tiles across) and alpha (stepped), or alpha 0 once it's gone. */
export function surfaceBurstAt(
  ms: number,
  still: boolean,
  out: { tiles: number; alpha: number },
): { tiles: number; alpha: number } {
  const t = ms / SURFACE_BURST_MS;
  if (!(t >= 0) || t >= 1) {
    out.tiles = BURST_TO;
    out.alpha = 0;
    return out;
  }
  out.tiles = still ? BURST_TO : BURST_FROM + (BURST_TO - BURST_FROM) * t;
  out.alpha = STEPPED_ALPHA[Math.min(3, Math.floor(t * 4))]!;
  return out;
}

/** The Unsung's bodies drawn now (form sprites; the render-state hook), from the enemy views. */
export function unsungForms(views: Iterable<{ readonly bodyId: string | null }>): string[] {
  const out: string[] = [];
  for (const v of views) if (v.bodyId?.startsWith('enemy.unsung') === true) out.push(v.bodyId);
  return out;
}

// --- Held by the song (M8 review R1): the final boss must read as one at its climax -------------
// In Phase 2 the song holds the Unsung (and its split's parts) at its circle's edge, among the
// Halls mouth's towers, under the Bore beam and a cloud of numbers. Render-only, so the fight's
// balance never moves: while it is held (`heldBySong`), its body
// - wears a 1 px `gold.4` rim on the side that faces the song (`rimToward`: the song's light on it,
//   gold = remembered, art-direction §3),
// - stands in a soft `violet.3` ground pool (UNSUNG_POOL_TILES: violet = forgotten; additive, so it
//   reads in the night and in the song's gold),
// - sorts over the towers on the tiles round it (UNSUNG_HOLD_LIFT_PX),
// - and the hit sparks and floating numbers that start on or round it draw dimmed
//   (UNSUNG_DIM_ALPHA within UNSUNG_DIM_MARGIN_PX of its frame), so its silhouette stays whole.

/** The script phase the song sings in (sim/song.ts `SONG_PHASE`; battleEvents.ts reads it too). */
export const SONG_SCRIPT_PHASE = 2;
/** Sort lift while held (px of foot y): one tile row and a pixel, over the tower in front of it. */
export const UNSUNG_HOLD_LIFT_PX = TILE_H + 1;
/** The ground pool's radius (tiles) and strength (additive alpha scale). */
export const UNSUNG_POOL_TILES = 1.5;
export const UNSUNG_POOL_STRENGTH = 1.4;
/** The rim's colour: the song's light on the side it holds. */
export const UNSUNG_RIM_COLOR = 'gold.4';
/** Effects that start this near its drawn frame (px) dim to UNSUNG_DIM_ALPHA (a ladder step). */
export const UNSUNG_DIM_MARGIN_PX = 10;
export const UNSUNG_DIM_ALPHA: number = STEPPED_ALPHA[2];

/** What the hold reads of a unit (sim `Enemy`). */
export interface HeldFacts {
  readonly alive: boolean;
  readonly burrowed: boolean;
  readonly leaving: boolean;
  readonly x: number;
  readonly y: number;
}

/** A song circle (sim `SongCircle`). */
export interface HoldCircle {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/**
 * The song circle holding a song-bound unit (the Unsung or a split part, `laidToRestBySong`) in
 * script phase `phase`, or null: it stands inside one, above ground, while the song sings. The
 * nearest centre wins when circles overlap.
 */
export function heldBySong(
  e: HeldFacts,
  phase: number,
  circles: readonly HoldCircle[],
): HoldCircle | null {
  if (phase !== SONG_SCRIPT_PHASE || !e.alive || e.burrowed || e.leaving) return null;
  let best: HoldCircle | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const c of circles) {
    const dx = e.x - c.x;
    const dy = e.y - c.y;
    const d = dx * dx + dy * dy;
    if (d <= c.r * c.r && d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}

/**
 * The rim's 1 px offset (screen px, each −1, 0 or 1) from a body at screen (bx, by) toward the
 * song's centre at screen (cx, cy): the copy drawn under the body shows one pixel on that side.
 * Eight ways; straight on when the centre sits under the body.
 */
export function rimToward(
  bx: number,
  by: number,
  cx: number,
  cy: number,
  out: { dx: number; dy: number },
): { dx: number; dy: number } {
  const vx = cx - bx;
  const vy = cy - by;
  if (vx === 0 && vy === 0) {
    out.dx = 0;
    out.dy = -1;
    return out;
  }
  // 22.5° either side of an axis is that axis alone.
  const tan = Math.tan(Math.PI / 8);
  out.dx = Math.abs(vx) > Math.abs(vy) * tan ? Math.sign(vx) : 0;
  out.dy = Math.abs(vy) > Math.abs(vx) * tan ? Math.sign(vy) : 0;
  return out;
}

// --- Thrown back (D156; M8 R1 relay) -------------------------------------------------------------
// Up among the singers, the song drives the Unsung back at once to where it dug in (sim
// `digFromDist`; BossSurfaced's `at` is where it came up). The sim moves it in one tick; render
// carries its body back over THROW_MS (`thrownAt`: the share of the way still to go, easing out),
// a `violet.3` streak trailing from where it came up to the body (stepping out), so nothing pops.
// Under reduced motion it cuts there: no carry, no streak.

/** How long the throw back takes on screen (ms). */
export const THROW_MS = 400;
/** A move shorter than this (tiles) is no throw (a dug-out surfacing stays where it came up). */
export const THROW_MIN_TILES = 0.25;

/**
 * The throw at `ms` after it began: `left`, the share of the way from where it came up still to
 * go (1 at the start, 0 once landed; eased out, so it leaves fast and settles), and the streak's
 * `alpha` (stepped; 0 once landed). Both 0 under reduced motion.
 */
export function thrownAt(
  ms: number,
  still: boolean,
  out: { left: number; alpha: number },
): { left: number; alpha: number } {
  const t = ms / THROW_MS;
  if (still || !(t >= 0) || t >= 1) {
    out.left = 0;
    out.alpha = 0;
    return out;
  }
  out.left = (1 - t) ** 2;
  out.alpha = STEPPED_ALPHA[Math.min(3, Math.floor(t * 4))]!;
  return out;
}
