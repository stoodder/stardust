// The finale's Phase 2 countdown model (T809; design/maps.md § 5.5, story/campaign/finale.md § FIN):
// "the counter returns at your lifetime total" as Phase 2 begins, then falls as N × (1 − p), where
// N is the lifetime Pests Processed at that moment and p = rest points ÷ rest target, reaching 0 at
// Dawn. Results reads N as REMEMBERED: {n}. Pure but for the tracker, which records the attempt's
// kills as Phase 2 starts (a resumed run's replay included, so a resume shows the same N); the HUD's
// counter (T832) draws `countdownModel`. The display rounding is story/counter.ts `countdownDisplay`.
import type { IdSpace } from '../content/types.ts';
import { countdownDisplay } from '../story/counter.ts';
import type { Host } from './host.ts';

/** The script phase the countdown runs in (the finale's Phase 2, the Unsung). */
export const COUNTDOWN_PHASE = 2;

/** The countdown as the HUD draws it. */
export interface CountdownModel {
  /** N: the lifetime Pests Processed the countdown started from (REMEMBERED: {n}). */
  readonly start: number;
  /** p, the rest progress, clamped to [0, 1]. */
  readonly progress: number;
  /** The number on screen: round(N × (1 − p)). */
  readonly shown: number;
}

/**
 * N for an attempt: the save's lifetime count as the battle began (`lifetime`, which already holds
 * what earlier attempts filed) plus this attempt's Skitterkin kills when Phase 2 began
 * (`killsAtStart`, the sim's count then) not yet filed (`killsBefore`: a checkpoint retry's
 * replayed kills were filed by the attempt that reached it; app/checkpoints.ts `attemptKills`).
 */
export function countdownStart(lifetime: number, killsAtStart: number, killsBefore: number): number {
  return Math.max(0, lifetime) + Math.max(0, killsAtStart - killsBefore);
}

/** The countdown from N (`start`) at `restPoints` of `restTarget` (`countdownDisplay`). */
export function countdownModel(
  start: number,
  restPoints: number,
  restTarget: number,
): CountdownModel {
  const progress = restTarget > 0 ? Math.min(1, Math.max(0, restPoints / restTarget)) : 1;
  return { start, progress, shown: countdownDisplay(start, restPoints, restTarget) };
}

/** Follows one battle's countdown: when Phase 2 began, and with what kills. */
export interface CountdownTracker {
  /** The sim's Skitterkin kills as Phase 2 began, or null before it (or on a map with none). */
  readonly killsAtStart: number | null;
  /** N for this attempt given the save's lifetime count at the battle's start, or null before Phase 2. */
  start(lifetime: number): number | null;
  /** The model now, or null outside Phase 2 and after (Dawn shows 0 as the map ends). */
  model(lifetime: number): CountdownModel | null;
  off(): void;
}

/**
 * Tracks `host`'s countdown. Bind it before a resumed run's replay (the router's `listen`), so the
 * replayed PhaseChanged records the kills as the attempt that reached the checkpoint had them.
 */
export function trackCountdown(host: Host<IdSpace>): CountdownTracker {
  let killsAtStart: number | null =
    host.sim.state.phase >= COUNTDOWN_PHASE ? host.sim.state.stats.skitterkinKilled : null;
  const off = host.bus.on('PhaseChanged', (e) => {
    if (e.phase >= COUNTDOWN_PHASE && killsAtStart === null) {
      killsAtStart = host.sim.state.stats.skitterkinKilled;
    }
  });
  const start = (lifetime: number): number | null =>
    killsAtStart === null ? null : countdownStart(lifetime, killsAtStart, host.killsBefore);
  return {
    get killsAtStart() {
      return killsAtStart;
    },
    start,
    model(lifetime) {
      const n = start(lifetime);
      const s = host.sim.state;
      return n === null || s.phase !== COUNTDOWN_PHASE
        ? null
        : countdownModel(n, s.restPoints, s.restTarget);
    },
    off,
  };
}
