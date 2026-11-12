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
