// A faction's armor modifier (design/core-loop.md § 6.11; D146; T703): C4 Purge's
// `{ kind: 'enemyStat', stat: 'armor', faction: 'everglow', flat: -2 }`, which app/battleSetup.ts
// adds from A3M5 on (T710). Every unit of that faction spawns with its armor + Σ flat, never below
// 0, and with `openPanel` set when the sum lowers it (render's open maintenance panel,
// HealAuraView's panel marker; art T740a). Bosses included: "Shareholder Value" is Everglow
// Security too (its jettison's armor 0 is its own phase's, T707). It rides the run's scaled defs
// (systems/waves.ts `waveModifiers`), so every way a unit spawns (the wave spawner, a brood or a
// boss's young, a hangar, a script group) carries it with no code of its own; the pipeline reads
// `def.armor` as for any unit (combat/damage.ts), so Corroded and armor pierce stack on it as
// usual. Nothing changes for a faction no modifier names, so A1M1–A3M4's numbers hold.
import type { CompiledEnemyDef } from '../content/compiled.ts';
import type { EnemyFaction, IdSpace } from '../content/types.ts';
import type { Modifier } from './config.ts';

/** Σ flat armor per faction from a run's modifiers; null when none names one. */
export function factionArmorFlat(
  modifiers: readonly Modifier<IdSpace>[],
): ReadonlyMap<EnemyFaction, number> | null {
  let out: Map<EnemyFaction, number> | null = null;
  for (const m of modifiers) {
    if (m.kind !== 'enemyStat' || m.stat !== 'armor') continue;
    if (!Number.isFinite(m.flat)) {
      throw new RangeError(`enemyStat 'armor' (${m.source}): flat must be finite (got ${m.flat})`);
    }
    out ??= new Map();
    out.set(m.faction, (out.get(m.faction) ?? 0) + m.flat);
  }
  return out;
}

/**
 * `def` with its armor + `flat`, never below 0, and `openPanel` set when `flat` lowers it (the
 * same def when `flat` is 0).
 */
export function withFactionArmor(def: CompiledEnemyDef, flat: number): CompiledEnemyDef {
  if (flat === 0) return def;
  const armor = def.armor + flat;
  return Object.freeze({
    ...def,
    armor: armor > 0 ? armor : 0,
    openPanel: def.openPanel || flat < 0,
  });
}
