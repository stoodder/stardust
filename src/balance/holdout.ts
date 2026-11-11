// The Holdout in the harness (conventions.md § Balance sims, #17; design/maps.md § 6.4; T605). A
// Holdout has no defeat: every run that presses its forced input ends won (sim/objectives.ts
// `endMap`). The harness judges it against its `evacuatedFloor` instead, so every other check
// reads it as it reads any map:
// - **The margin** is Evacuated % (checks.ts `marginOf`), on every run.
// - **Winning** (`judgeHoldout`): a run counts as won only if it ended through a forced input (the
//   SEAL, pressed by its `scriptInput` step) with Evacuated ≥ the floor; one below the floor, or
//   one the sim ended any other way, counts as lost, at the last wave it started. So doing nothing
//   (#4), the no-counter builds (#5, #6, by any wave), and an under-built alt lose below the floor,
//   and the alts (#8), Story (#9), and the flag variants (#14) must reach it.
// - **The band** (`holdoutBand`) is [floor, 100]: #7, #14, and #15 judge against it.
// - **#17** replaces #1–#2: par, on every seed, ends through its forced input with Evacuated ≥ the
//   floor, and never through integrity 0.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import type { HeadlessResult } from '../sim/index.ts';
import { describeRun, fmtPct, margins, marginOf, perRun, type CheckSpec } from './checks.ts';

type HoldoutMap = Pick<CompiledMapDef<IdSpace>, 'objective' | 'evacuatedFloor'>;

/** The Holdout's floor as a percentage (its `evacuatedFloor` × 100; 0 without one). */
export function holdoutFloorPct(map: HoldoutMap): number {
  return 100 * (map.evacuatedFloor ?? 0);
}

/** A Holdout's band: [its floor, 100] (#7, #14, #15 judge against it). */
export function holdoutBand(map: HoldoutMap): { readonly lo: number; readonly hi: number } {
  return { lo: holdoutFloorPct(map), hi: 100 };
}

/** Whether a run ended through a forced input and won (the Holdout's only end). */
function endedOnInput(r: Pick<HeadlessResult, 'outcome' | 'forcedInputs'>): boolean {
  return r.outcome === 'won' && r.forcedInputs.length > 0;
}

/**
 * A run on a Holdout as the harness judges it (see the header): won only through a forced input at
 * or above the floor, else lost at the last wave it started. Other maps' runs pass through.
 */
export function judgeHoldout(map: HoldoutMap, r: HeadlessResult): HeadlessResult {
  if (map.objective !== 'holdout' || r.outcome === 'timeout') return r;
  if (endedOnInput(r) && marginOf(r) >= holdoutFloorPct(map)) return r;
  const started = r.waves.filter((w) => w.startTick >= 0).length;
  return { ...r, outcome: 'lost', lostAtWave: r.lostAtWave ?? started };
}

/** #17: par ends through its forced input with Evacuated ≥ the floor, on every seed. */
export function holdoutParCheck(map: HoldoutMap, every: readonly number[]): CheckSpec {
  const floor = holdoutFloorPct(map);
  return perRun(
    '17',
    `par ends on its forced input with Evacuated ≥ ${fmtPct(floor)}%`,
    'par',
    every,
    (rec) => {
      const r = rec.result!; // perRun judges runs with a result
      if (r.forcedInputs.length === 0) return `${describeRun(rec)}: no forced input was pressed`;
      if (r.integrity <= 0) return `${describeRun(rec)}: it ended through integrity 0`;
      return rec.marginPct >= floor
        ? null
        : `Evacuated ${fmtPct(rec.marginPct)}% is below the floor ${fmtPct(floor)}%`;
    },
    (recs) => `Evacuated ${margins(recs)} (floor ${fmtPct(floor)}), ${recs.length} seeds`,
  );
}
