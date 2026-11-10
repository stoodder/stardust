// Robustness shifts for the map balance tests (src/balance/<map>.test.ts; conventions.md § Gate
// time): the live content with some waves' groups patched and recompiled, and the harness's verdicts
// on it. A test may patch several waves at once (a *compound* shift), so one harness run checks
// them all: a build phase separates the waves, so a shift's effect stays mostly in its own wave
// (and when one doesn't, the compound run still has to pass).
import { compileContent } from '../../content/compile.ts';
import type { CompiledContent } from '../../content/compiled.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { LiveIds, RawContent, WaveDef, WaveGroup } from '../../content/types.ts';
import type { RunRecord } from '../checks.ts';
import { runMap } from '../harness.ts';

/** A change to one wave group (identity for the groups it doesn't touch). */
export type GroupPatch = (g: WaveGroup) => WaveGroup;
/** Each patched wave (1-based) and the patch for its groups. */
export type WavePatches = Readonly<Record<number, GroupPatch>>;
type MapId = LiveIds['map'];

/**
 * Each named compound shift (a function of the direction `s`, ±1) both ways, as `it.each` rows:
 * [name, direction, patches]. One harness run per row keeps each test inside the harness timeout.
 */
export function bothWays(
  shifts: Readonly<Record<string, (s: number) => WavePatches>>,
): [string, string, WavePatches][] {
  return Object.entries(shifts).flatMap(([name, shift]) =>
    [-1, 1].map((s): [string, string, WavePatches] => [
      name,
      s < 0 ? 'one way' : 'the other way',
      shift(s),
    ]),
  );
}

/** The live content with `mapId`'s waves patched. */
export function shiftedContent(mapId: MapId, patches: WavePatches): CompiledContent {
  const raw = RAW_CONTENT.maps[mapId]!;
  const waves = raw.waves.map((w: WaveDef, i): WaveDef => {
    const patch = patches[i + 1];
    return patch === undefined ? w : { ...w, groups: w.groups.map(patch) };
  });
  const next: RawContent = {
    ...RAW_CONTENT,
    maps: { ...RAW_CONTENT.maps, [mapId]: { ...raw, waves } },
  };
  return compileContent(next);
}

/** The groups `pick` selects start `d` s later (a group at the wave's start stays there). */
export const delay =
  (pick: (g: WaveGroup) => boolean, d: number): GroupPatch =>
  (g) =>
    pick(g) ? { ...g, delaySec: Math.max(0, (g.delaySec ?? 0) + d) } : g;

/** The groups `pick` selects (with an `intervalSec`) spawn `d` s further apart. */
export const spaced =
  (pick: (g: WaveGroup) => boolean, d: number): GroupPatch =>
  (g) =>
    pick(g) && g.intervalSec !== undefined ? { ...g, intervalSec: g.intervalSec + d } : g;

/** Applies each patch in turn. */
export const both =
  (...patches: readonly GroupPatch[]): GroupPatch =>
  (g) =>
    patches.reduce((x, p) => p(x), g);

/** Selects the groups of `enemy`. */
export const enemy =
  (id: string) =>
  (g: WaveGroup): boolean =>
    g.enemy === id;

/** The harness on `content` (seed 1): every failing check, and par's run. */
export function judgeShift(
  content: CompiledContent,
  mapId: MapId,
): { failed: string[]; par: RunRecord } {
  const report = runMap(content, mapId, { seeds: 1 });
  return {
    failed: report.checks.filter((k) => !k.ok).map((k) => `#${k.id} ${k.title}`),
    par: report.runs.find((r) => r.build === 'par' && !r.repeat)!,
  };
}
