// The Leaving Song's rest and scatter, as motion (T805's minimal look, T830's: art-direction §7
// *Laid to rest* and *Scattered*, §1 principle 6; design/maps.md § 5.5): pure, testable without
// Phaser; SongView draws it with T841's sprites.
// - **Laid to rest** (a Hollow unit broken inside the song, or Dawn's `restAll`): its body as it
//   was drawn (EnemyView.snapshot) flips to `stardust.sung` gold over FLIP_STEPS steps
//   (`flipStep`): the warm multiply first (its pale outline and hide go gold, its dark stays dark),
//   then two warm screens brighter each step, then all gold. The gold body then fades down the
//   stepped-alpha ladder over BODY_FADE_MS while `restMoteCount` `fx.rest_mote` motes (6–10 by
//   the body's width) rise from across it: each sets out a little after the last, rises about
//   REST_RISE_PX_PER_MS (slowly: ~24 px a second), sways a pixel, and fades in steps over its last
//   part (`restMoteAt`). This render tint is the ordinary unit's flip (T830: no baked `rest`
//   variant, so every Hollow sprite, every frame and facing, grown or not, flips for no atlas
//   cost); the Unsung and Thrum's echo author their own (unsungLook.ts, echoLook.ts). A unit laid
//   to rest never unravels violet (SongView holds the death until the song says which).
// - **Scattered** (broken outside the song, Phase 2, once): it never unravels either; SCATTER_MOTES
//   `fx.scatter_mote` motes (`drift`) leave where it fell, each a step behind the next, and drift
//   back to where the sim laid it, 2 tiles back along its road (DRIFT_MS), then hover there,
//   circling slowly. Over the last PULL_TICKS before it re-forms (the unit's own `scatterTicks`,
//   sim time) they `pull` in on it, closing; at `Reformed` one violet `reform` burst rings out
//   where it stands (REFORM_MS) and the body is back (EnemyView).
// - **Reduced motion:** the flip still steps (colour, not motion); the motes don't rise, drift or
//   circle: they show at their end points (over the body, round the scattered spot) and only fade.
import type { ColorName } from '../../content/palettes/master.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';

// ── Laid to rest ─────────────────────────────────────────────────────────────────────────────

/** The flip's steps (4 frames at 8 fps, art-direction §7). */
export const FLIP_STEPS = 4;
export const FLIP_STEP_MS = 125;
export const FLIP_MS = FLIP_STEPS * FLIP_STEP_MS;
/** The gold body's fade after the flip. */
export const BODY_FADE_MS = 420;
/** Each rest mote's life once it sets out, its start lag after the last, and its rise. */
export const REST_MOTE_MS = 1700;
export const REST_MOTE_LAG_MS = 70;
export const REST_RISE_PX_PER_MS = 0.024;
/** The most motes one rest raises (the Unsung's). */
export const MAX_REST_MOTES = 10;
/** A whole rest is over by then (the last mote's lag and life after the flip). */
export const REST_MS = FLIP_MS + (MAX_REST_MOTES - 1) * REST_MOTE_LAG_MS + REST_MOTE_MS;

export type TintMode = 'multiply' | 'screen' | 'fill';

/** One step of the flip: how the body is tinted. */
export interface FlipLook {
  readonly mode: TintMode;
  readonly color: ColorName;
}

/** The flip's looks, step by step (see the header). */
export const FLIP_LOOKS: readonly FlipLook[] = [
  { mode: 'multiply', color: 'gold.4' },
  { mode: 'screen', color: 'gold.2' },
  { mode: 'screen', color: 'gold.3' },
  { mode: 'fill', color: 'gold.4' },
];

/** The flip's step at `ms` after the rest (0–FLIP_STEPS − 1; the last holds while the body fades). */
export function flipStep(ms: number): number {
  if (!(ms > 0)) return 0;
  return Math.min(FLIP_STEPS - 1, Math.floor(ms / FLIP_STEP_MS));
}

/** The gold body's alpha at `ms` after the rest: whole through the flip, then down the ladder. */
export function restBodyAlpha(ms: number): number {
  if (ms < FLIP_MS) return 1;
  const t = (ms - FLIP_MS) / BODY_FADE_MS;
  if (t >= 1) return 0;
  return STEPPED_ALPHA[1 + Math.min(2, Math.floor(t * 3))]!;
}

/** How many motes a body `widthPx` across rises into: 6 for a Mote, up to 10. */
export function restMoteCount(widthPx: number): number {
  const n = 6 + Math.floor(Math.max(0, widthPx - 12) / 10);
  return Math.min(MAX_REST_MOTES, n);
}

export interface RestMoteAt {
  /** Screen px from the body's anchor. */
  dx: number;
  dy: number;
  alpha: number;
}

/**
 * Rest mote `i` of `n` at `ms` after the rest, for a body `w`×`h` px drawn up from its anchor:
 * hidden through the flip and its lag, then rising from its spot across the body, swaying, and
 * fading over the last 40% of its life; gone after it.
 */
export function restMoteAt(
  ms: number,
  i: number,
  n: number,
  w: number,
  h: number,
  still: boolean,
  out: RestMoteAt,
): RestMoteAt {
  const local = ms - FLIP_MS - i * REST_MOTE_LAG_MS;
  // Its spot: spread evenly across the body's middle, alternate ones higher.
  const share = n <= 1 ? 0.5 : i / (n - 1);
  const sx = Math.round((share - 0.5) * w * 0.7);
  const sy = -Math.round(h * (i % 2 === 0 ? 0.35 : 0.6));
  if (local < 0 || local >= REST_MOTE_MS) {
    out.dx = sx;
    out.dy = sy;
    out.alpha = 0;
    return out;
  }
  const t = local / REST_MOTE_MS;
  out.dx = still ? sx : sx + Math.round(Math.sin(local / 260 + i * 1.7));
  out.dy = still ? sy : sy - Math.round(local * REST_RISE_PX_PER_MS);
  out.alpha = t < 0.6 ? 1 : STEPPED_ALPHA[1 + Math.min(2, Math.floor(((t - 0.6) / 0.4) * 3))]!;
  return out;
}

// ── Scattered ────────────────────────────────────────────────────────────────────────────────

export const SCATTER_MOTES = 5;
/** The drift back along the road, each mote this far behind the last. */
export const DRIFT_MS = 1200;
export const DRIFT_LAG_MS = 90;
/** They pull in over the last this many sim ticks before it re-forms (0.6 s). */
export const PULL_TICKS = 36;
/** The re-form burst (3 frames at 12 fps). */
export const REFORM_MS = 250;
/** A scatter never outlives this unseen (the sim re-forms it at 4 s; Dawn may lay it first). */
export const SCATTER_MAX_MS = 8000;
const HOVER_PX = 6;

export interface ScatterMoteAt {
  /** A share of the way from where it fell (0) to where it lies (1). */
  share: number;
  /** Screen px round that point. */
  dx: number;
  dy: number;
  alpha: number;
  /** Pulling in (the re-form is close): the `pull` look. */
  pull: boolean;
}

/**
 * Scatter mote `i` at `ms` after the fall, the unit `ticksLeft` sim ticks from re-forming (−1:
 * unknown): drifting back (each a step behind the last), then circling slowly over where it lies,
 * then closing in over the last PULL_TICKS.
 */
export function scatterMoteAt(
  ms: number,
  i: number,
  ticksLeft: number,
  still: boolean,
  out: ScatterMoteAt,
): ScatterMoteAt {
  const local = ms - i * DRIFT_LAG_MS;
  out.share = still ? 1 : Math.max(0, Math.min(1, local / DRIFT_MS));
  out.pull = ticksLeft >= 0 && ticksLeft <= PULL_TICKS;
  let radius = HOVER_PX;
  if (out.pull) radius = HOVER_PX * Math.max(0, ticksLeft / PULL_TICKS);
  const angle = (i / SCATTER_MOTES) * Math.PI * 2 + (still ? 0 : ms / 1100);
  out.dx = Math.round(Math.cos(angle) * radius);
  out.dy = Math.round(Math.sin(angle) * radius * 0.5) - 6;
  // Whole while they drift; down a rung once they hover (scattered, not gone); whole as they pull.
  out.alpha = local < 0 ? 0 : out.pull || out.share < 1 ? 1 : STEPPED_ALPHA[1];
  return out;
}
