// The revocation's story variants (design/maps.md § 6.4 #10; towers.md § 9; T606): on a map whose
// script revokes a tower class (A3M2's Clean Exit), par runs once per class the cue could take
// from its loadout ("revoke:<tower>": the cue forced onto that class, `SimConfig.revokeClass`),
// whatever `mostInvested` would pick. Each must win at the forgiving floor or better: losing any
// class the build carries is survivable (the refund rebuilds), never a wall. The run proves the
// forced class is the one revoked. Profile-level, the counter guarantee is static
// (content/validateBuilds.ts [revocation]). And on a map whose script gives the class back (the
// finale's "Who's there?"), par and its alts must survive a human's late rebuild (D156).
import type { CompiledBuild, CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace, TowerFaction } from '../content/types.ts';
import {
  describeRun,
  fmtPct,
  LATE_REBUILD_PREFIX,
  margins,
  perRun,
  splitMeta,
  wonCount,
  type CheckSpec,
} from './checks.ts';
import { FORGIVING_FLOOR_PCT, LATE_REBUILD_SEC, parBand } from './rules.ts';

/** The run label of par with the cue forced onto `tower`: 'revoke:rivet'. */
export const revokeVariantLabel = (tower: string): string => `revoke:${tower}`;

/** The class a 'revoke:<tower>' label forces, or null for any other label. */
export function revokeClassOf(label: string): string | null {
  const build = splitMeta(label).build;
  return build.startsWith('revoke:') ? build.slice('revoke:'.length) : null;
}

/**
 * The factions the map's `revokeTowerClass` actions select from (null: every class), or an empty
 * list on a map that revokes no class. Only events carry them (an objective can't; T606).
 */
export function revokeFactions<K extends IdSpace>(
  map: Pick<CompiledMapDef<K>, 'events'>,
): (TowerFaction | null)[] {
  const out: (TowerFaction | null)[] = [];
  for (const ev of map.events) {
    for (const a of ev.actions) {
      if ('revokeTowerClass' in a) out.push(a.revokeTowerClass.faction ?? null);
    }
  }
  return out;
}

/** The classes of `build`'s loadout the map's cue could take, in slot order. */
export function revocableClasses<K extends IdSpace>(
  map: Pick<CompiledMapDef<K>, 'events'>,
  build: Pick<CompiledBuild<K>, 'loadout'>,
  content: Pick<CompiledContent<K>, 'towers'>,
): K['tower'][] {
  const factions = revokeFactions(map);
  if (factions.length === 0) return [];
  return build.loadout.filter((t) => {
    const f = content.towers[t].faction;
    return factions.some((x) => x === null || x === f);
  });
}

/** #14 (story variants): par with the cue forced onto each class it could take. */
export function revokeVariantChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  content: Pick<CompiledContent<K>, 'towers'>,
  few: readonly number[],
): CheckSpec[] {
  return revocableClasses(map, map.builds.parBuild, content).map((tower) =>
    perRun(
      '14',
      `par with the cue taking ${tower} wins at ≥ ${FORGIVING_FLOOR_PCT}%`,
      revokeVariantLabel(tower),
      few,
      (rec) => {
        const r = rec.result;
        if (r?.outcome !== 'won') return describeRun(rec);
        // A restored class ("Who's there?", the finale) left `revoked` but was taken (T821).
        const took = r.revoked.towers[0] ?? r.restored[0];
        if (took !== tower) return `the cue took ${took ?? 'nothing'}, not ${tower}`;
        return rec.marginPct >= FORGIVING_FLOOR_PCT
          ? null
          : `margin ${fmtPct(rec.marginPct)} is under the floor ${FORGIVING_FLOOR_PCT}`;
      },
      (recs) => `${wonCount(recs)}, margins ${margins(recs)}`,
    ),
  );
}

/**
 * The late-rebuild variant (D156): on a map whose script restores a class it revoked (the
 * finale's "Who's there?"), par and every alt the map expects to win run under the revoking cue's
 * flag with the restored class rebuilt LATE_REBUILD_SEC late (`rebuildLate:<label>`), a human's
 * pace. Each must still win at its own floor: par at its band's, an alt at the forgiving floor.
 */
export function lateRebuildChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  few: readonly number[],
): CheckSpec[] {
  const restores = map.events.some((ev) => ev.actions.some((a) => 'restoreTowerClass' in a));
  if (!restores || revokeFactions(map).length === 0) return [];
  const b = map.builds;
  const alts = Object.keys(b.altBuilds).filter(
    (name) => !Object.hasOwn(b.altExpectations, name) || !b.altExpectations[name]!.outcome,
  );
  const band = parBand(map.act, b.marginBand);
  const subjects: [string, number][] = [
    ['par', band?.lo ?? FORGIVING_FLOOR_PCT],
    ...alts.map((name): [string, number] => [`alt:${name}`, FORGIVING_FLOOR_PCT]),
  ];
  return subjects.map(([label, floor]) =>
    perRun(
      'lateRebuild',
      `${label} rebuilding the restored class ${LATE_REBUILD_SEC} s late wins at ≥ ${floor}%`,
      `${LATE_REBUILD_PREFIX}${label}`,
      few,
      (rec) => {
        const r = rec.result;
        if (r?.outcome !== 'won') return describeRun(rec);
        if (r.restored.length === 0) return 'the script restored no class';
        return rec.marginPct >= floor
          ? null
          : `margin ${fmtPct(rec.marginPct)} is under the floor ${floor}`;
      },
      (recs) => `${wonCount(recs)}, margins ${margins(recs)}`,
      [],
      label,
    ),
  );
}
