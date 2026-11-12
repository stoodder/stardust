// Run rules (design/progression.md § 6; T860): what a run may not do, set in its SimConfig beside
// the modifiers. Veteran replays use them (Radio Silence, Short-Handed, No Protocols), and
// challenge maps can too (T862). Each rule is pure and deterministic. Two of them are invariants
// that createSim checks on the config (validateConfig refuses a breach), and one is a runtime
// refusal:
// - `noAbilities` (Radio Silence): every ability slot is dark. Slot 1 must be empty (the
//   Technician brings nothing). Slot 2, the companion's, stays filled because the companion
//   still walks with the player, but `slotRevoked` reads it dark, so a cast is refused `revoked`
//   and the HUD greys it. The companion is still there, just off the radio.
// - `maxTowerTypes` (Short-Handed: 3): the loadout holds at most `max` tower types.
// - `noProtocols` (No Protocols): no modifier from a Field Protocol (`source: 'protocol:<id>'`,
//   meta/modifiers.ts) is in the config.
// A config without `rules` (every run before T860, and the balance harness) runs exactly as
// before.
import type { IdSpace } from '../content/types.ts';
import type { ModifierSource, SimConfig } from './config.ts';

/** One run rule, with where it came from (`'veteran:radio_silence'`, `'challenge:ch_m03'`). */
export type SimRule =
  | { readonly kind: 'noAbilities'; readonly source: ModifierSource }
  | { readonly kind: 'maxTowerTypes'; readonly max: number; readonly source: ModifierSource }
  | { readonly kind: 'noProtocols'; readonly source: ModifierSource };
export type SimRuleKind = SimRule['kind'];

/** The source prefix of a Field Protocol's modifiers (meta/modifiers.ts). */
export const PROTOCOL_SOURCE_PREFIX = 'protocol:';

/** True when the config's rules include `kind`. */
export function hasRule(
  cfg: { readonly rules?: readonly SimRule[] | undefined },
  kind: SimRuleKind,
): boolean {
  return cfg.rules?.some((r) => r.kind === kind) ?? false;
}

/** True when the run is under Radio Silence (`noAbilities`): every ability slot is dark. */
export function radioSilent(cfg: { readonly rules?: readonly SimRule[] | undefined }): boolean {
  return hasRule(cfg, 'noAbilities');
}

/** The run's tower-type limit from its rules (the lowest `maxTowerTypes`), or null for none. */
export function towerTypeLimit(cfg: {
  readonly rules?: readonly SimRule[] | undefined;
}): number | null {
  let max: number | null = null;
  for (const r of cfg.rules ?? []) {
    if (r.kind === 'maxTowerTypes') max = max === null ? r.max : Math.min(max, r.max);
  }
  return max;
}

/** What `cfg` breaks of its own rules (validateConfig adds them to its errors). */
export function ruleConfigErrors(cfg: SimConfig<IdSpace>): string[] {
  const out: string[] = [];
  for (const r of cfg.rules ?? []) {
    if (r.kind === 'maxTowerTypes' && (!Number.isInteger(r.max) || r.max < 1)) {
      out.push(`rules: maxTowerTypes (${r.source}) must be a positive integer (got ${r.max})`);
    }
  }
  const limit = towerTypeLimit(cfg);
  if (limit !== null && cfg.loadout.length > limit) {
    out.push(`rules: the loadout has ${cfg.loadout.length} towers; this run allows ${limit}`);
  }
  if (radioSilent(cfg) && cfg.abilities.slot1 !== null) {
    out.push(`rules: noAbilities needs slot 1 empty (got '${cfg.abilities.slot1}')`);
  }
  if (hasRule(cfg, 'noProtocols')) {
    for (const m of cfg.modifiers) {
      if (m.source.startsWith(PROTOCOL_SOURCE_PREFIX)) {
        out.push(`rules: noProtocols, but modifier ${m.kind} comes from '${m.source}'`);
      }
    }
  }
  return out;
}
