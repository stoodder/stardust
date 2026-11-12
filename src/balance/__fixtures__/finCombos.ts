// FIN across every story-flag cell (D156; balance/finM01Combos*.test.ts): the harness's #14 runs
// par under one flag at a time, but the finale reads four (C1's Thrum, C2's Returned, C3's door,
// C4's answer: 2 × 2 × 2 × 3 = 24 cells), and its balance is chaotic enough that one more unit can
// move a run by several singers. So par and every alt run in all 24 on Standard, and on Story in
// the hardest cells; and every alt again with ×1.5 and ×2 damage on the Unsung (D157:
// balance/bossDamage.ts `withBossDamage`). These files are the test step's slow lane: the whole
// gate runs them, a task's fast gate doesn't (conventions.md § The test loop).
import type { CompiledContent } from '../../content/compiled.ts';
import { runHeadless, type HeadlessResult } from '../../sim/index.ts';
import { flagCombinationLabel, flagsFor, marginOf, notGradual } from '../checks.ts';
import { FORGIVING_FLOOR_PCT } from '../rules.ts';
import { buildFor } from '../harness.ts';
import { referenceRunProfile, runConfig } from '../profile.ts';

/** One FIN story cell: each flag the map's scripts read, set. */
export interface FinCell {
  readonly door_choice: 'convoy' | 'warren';
  readonly quill_choice: 'keep' | 'purge' | 'rewrite';
  readonly spared_quiet_wave: boolean;
  readonly stardust_choice: 'returned' | 'sold';
}

/** All 24 cells, the door first. */
export const FIN_CELLS: readonly FinCell[] = (['convoy', 'warren'] as const).flatMap((door) =>
  (['keep', 'purge', 'rewrite'] as const).flatMap((quill) =>
    [true, false].flatMap((spared) =>
      (['returned', 'sold'] as const).map((dust): FinCell => ({
        door_choice: door,
        quill_choice: quill,
        spared_quiet_wave: spared,
        stardust_choice: dust,
      })),
    ),
  ),
);

/**
 * The hardest cells, where each build's margin is lowest (measured over all 24, D156): Purge's
 * longest Phase 2 with Thrum cleared, under either door, and the warren's denser column under
 * Keep's Directive 0. Story is judged in these.
 */
export const FIN_HARDEST_CELLS: readonly FinCell[] = FIN_CELLS.filter(
  (c) =>
    !c.spared_quiet_wave &&
    c.stardust_choice === 'sold' &&
    (c.quill_choice === 'purge' || (c.quill_choice === 'keep' && c.door_choice === 'warren')),
);

/** A cell's harness label: 'flags:door_choice=warren,quill_choice=purge,…'. */
export const cellLabel = (c: FinCell): string => flagCombinationLabel({ ...c });

/** A cell in short: 'warren/purge/cleared/sold'. */
export const cellName = (c: FinCell): string =>
  `${c.door_choice}/${c.quill_choice}/${c.spared_quiet_wave ? 'spared' : 'cleared'}/${c.stardust_choice}`;

export interface FinCellRun {
  readonly cell: FinCell;
  readonly result: HeadlessResult;
  readonly margin: number;
}

/** `build` (a harness label: 'par', 'alt:cluster') in `cell` on `difficulty`, seed 1. */
export function runFinCell(
  content: CompiledContent,
  build: string,
  cell: FinCell,
  difficulty: 'standard' | 'story' = 'standard',
): FinCellRun {
  const map = content.maps.fin_m01;
  const flags = flagsFor(cellLabel(cell), map);
  if (flags === null) throw new RangeError(`fin_m01 lists no cell ${cellName(cell)}`);
  const b = buildFor(build, map, content);
  if (b === null) throw new RangeError(`fin_m01 has no build '${build}'`);
  const profile = referenceRunProfile(map, content, difficulty, undefined, flags);
  const result = runHeadless(runConfig(content, map, b, profile, 1, flags), b);
  return { cell, result, margin: marginOf(result) };
}

/** The most singers one wave hushed in a run (the choir's per-wave loss; D156). */
export const maxWaveHushes = (r: HeadlessResult): number =>
  Math.max(0, ...r.waves.map((w) => w.singersHushed));

/** The first wave that hushed a singer, or 0 for none. */
export const firstHushWave = (r: HeadlessResult): number =>
  r.waves.find((w) => w.singersHushed > 0)?.wave ?? 0;

/**
 * An alt in every cell (D156): it wins at the forgiving floor or better, its losses gradual (D028:
 * no wave hushes more than half the allowance). Its failures, one line a cell; `content` may be a
 * boss-damage variant (`withBossDamage`, D157).
 */
export function altCellFailures(
  content: CompiledContent,
  build: string,
  cells: readonly FinCell[] = FIN_CELLS,
): string[] {
  const bad: string[] = [];
  for (const cell of cells) {
    const { result: r, margin } = runFinCell(content, build, cell);
    const name = cellName(cell);
    if (r.outcome !== 'won') bad.push(`${name}: ${r.outcome} at W${r.lostAtWave}`);
    else if (margin < FORGIVING_FLOOR_PCT) bad.push(`${name}: margin ${margin}`);
    const wall = notGradual(r);
    if (wall !== null) bad.push(`${name}: ${wall}`);
  }
  return bad;
}
