// Harness #18, the song's timing (conventions.md § Balance sims; design/maps.md § 5.5; T821): on a
// map with a song (the finale), Phase 2 (script phase 2 to Dawn's phase 3) runs about
// SONG_TARGET_SEC at 1× under the anchor answer of the rest multipliers (`quill_choice = keep`,
// ×1.25), and every other answer within ±SONG_TOLERANCE of the anchor's, so the countdown is a
// ceremony of fixed length whatever the player killed, and each C4 answer stays felt. Par runs once
// per answer (the #14 runs `flag:quill_choice=<v>`), on the few seeds; the median judges.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { TICK_HZ } from '../shared/time.ts';
import type { HeadlessResult } from '../sim/index.ts';
import { median, seedRuns, type CheckSpec } from './checks.ts';

/** Phase 2's target length at 1× under the anchor answer, in seconds (maps.md § 5.5: ~3 min). */
export const SONG_TARGET_SEC = 180;
/** How far the anchor may sit from the target, and each answer from the anchor (±30%). */
export const SONG_TOLERANCE = 0.3;
/** The anchor answer: Keep's ×1.25 (maps.md § 5.5). */
export const SONG_ANCHOR = 'keep';

/** A run's Phase 2 length in seconds (phase 2 to phase 3), or null if it never reached Dawn. */
export function songSeconds(r: Pick<HeadlessResult, 'phaseStartTick'> | null): number | null {
  if (r === null) return null;
  const a = r.phaseStartTick[2] ?? -1;
  const b = r.phaseStartTick[3] ?? -1;
  return a >= 0 && b > a ? (b - a) / TICK_HZ : null;
}

/** The answers the map's song multiplies by (their flag and values, as #14 runs them). */
function songAnswers<K extends IdSpace>(
  map: CompiledMapDef<K>,
): { readonly flag: string; readonly values: readonly string[] } | null {
  const first = map.song?.multipliers[0];
  if (first === undefined) return null;
  const values = (map.builds.flagVariants[first.flag] ?? []).map(String);
  return values.length === 0 ? null : { flag: first.flag, values };
}

/** #18: Phase 2's length per rest-multiplier answer (see the header). */
export function songTimingChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  few: readonly number[],
): CheckSpec[] {
  const answers = songAnswers(map);
  if (answers === null) return [];
  const anchor = answers.values.includes(SONG_ANCHOR) ? SONG_ANCHOR : answers.values[0]!;
  const label = (v: string): string => `flag:${answers.flag}=${v}`;
  const needs = answers.values.flatMap((v) => seedRuns(label(v), few));
  const lo = Math.round(SONG_TARGET_SEC * (1 - SONG_TOLERANCE));
  const hi = Math.round(SONG_TARGET_SEC * (1 + SONG_TOLERANCE));
  return [
    {
      id: '18',
      title: `Phase 2 lasts ~${SONG_TARGET_SEC} s under ${anchor} (${lo}–${hi} s), every answer within ±${100 * SONG_TOLERANCE}% of it`,
      subject: '*',
      needs,
      evaluate(get) {
        const failures: string[] = [];
        const med = new Map<string, number>();
        for (const v of answers.values) {
          const s: number[] = [];
          for (const seed of few) {
            const x = songSeconds(get({ build: label(v), seed }).result);
            if (x !== null) s.push(x);
          }
          if (s.length < few.length) failures.push(`${v}: a run never reached Dawn`);
          else med.set(v, median(s));
        }
        const a = med.get(anchor);
        if (a !== undefined && (a < lo || a > hi)) {
          failures.push(`${anchor} ${a.toFixed(0)} s is outside ${lo}–${hi} s`);
        }
        for (const [v, m] of med) {
          if (a === undefined || v === anchor) continue;
          const ratio = m / a;
          if (Math.abs(ratio - 1) > SONG_TOLERANCE + 1e-9) {
            failures.push(`${v} ${m.toFixed(0)} s is ${ratio.toFixed(2)}× ${anchor}'s`);
          }
        }
        const summary = [...med]
          .map(([v, m]) => {
            const rel = v === anchor || a === undefined ? '' : ` (${(m / a).toFixed(2)}×)`;
            return `${v} ${m.toFixed(0)} s${rel}`;
          })
          .join(', ');
        return { ok: failures.length === 0, summary, failures };
      },
    },
  ];
}
