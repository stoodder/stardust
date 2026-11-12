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
// - `towerFaction` (a challenge map's, T862: Skitterkin Only): every loadout tower is of `faction`.
// - `allCloaked` (a challenge map's, T862: Lights Out): every hostile unit spawns cloaked
//   (systems/waves.ts gives each def `cloaked`, so detection, the cloak's rules, and render's
//   shimmer read it as they read a Veilwalker's).
// A config without `rules` (every run before T860, and the balance harness on a campaign map) runs
// exactly as before.
//
// **Challenge maps** (design/maps.md § 8; T862) carry their rules as data (`MapDef.challenge`), and
// createSim applies them through `challengeConfig` before anything else reads the config, so every
// run on the map (the game's, the harness's, a test's) carries them, sourced
// `challenge:<map id>`. Glass Core and Radio Silence are the veteran modifiers' own grants under
// that source (meta/veteran.ts `veteranGrants`; pinned in balance/challenge.test.ts), so a
// challenge pays no veteran bonus.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace, TowerFaction } from '../content/types.ts';
import type { Modifier, ModifierSource, SimConfig } from './config.ts';

/** One run rule, with where it came from (`'veteran:radio_silence'`, `'challenge:ch_m03'`). */
export type SimRule =
  | { readonly kind: 'noAbilities'; readonly source: ModifierSource }
  | { readonly kind: 'maxTowerTypes'; readonly max: number; readonly source: ModifierSource }
  | { readonly kind: 'noProtocols'; readonly source: ModifierSource }
  | {
      readonly kind: 'towerFaction';
      readonly faction: TowerFaction;
      readonly source: ModifierSource;
    }
  | { readonly kind: 'allCloaked'; readonly source: ModifierSource };
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

/** The run's tower faction from its rules (`towerFaction`), or null for any. */
export function towerFactionRule(cfg: {
  readonly rules?: readonly SimRule[] | undefined;
}): TowerFaction | null {
  for (const r of cfg.rules ?? []) if (r.kind === 'towerFaction') return r.faction;
  return null;
}

/** True when every hostile unit of the run spawns cloaked (`allCloaked`). */
export function allCloaked(cfg: { readonly rules?: readonly SimRule[] | undefined }): boolean {
  return hasRule(cfg, 'allCloaked');
}

/** The source prefix of a challenge map's rules and modifiers (`'challenge:ch_m03'`). */
export const CHALLENGE_SOURCE_PREFIX = 'challenge:';

/** Glass Core's integrity on a challenge map (meta/veteran.ts GLASS_CORE_INTEGRITY's value). */
export const CHALLENGE_GLASS_CORE_INTEGRITY = 5;

/**
 * `cfg` under its map's challenge rules (`MapDef.challenge`; pure). A map without them, a config
 * that already carries them, or an unknown map (validateConfig reports it) gives `cfg` itself.
 * Each rule joins the config sourced `challenge:<map id>`, and the config is fitted to it as a
 * veteran replay's is (meta/veteran.ts `veteranConfig`): `towerFaction` keeps the loadout's towers
 * of that faction (and only their spec unlocks), `noAbilities` empties slot 1 (the companion's slot
 * stays, dark under the rule), and `glassCore` sets core integrity 5 (the lowest `set` wins, so
 * Story keeps it; Reinforced Core's ranks add).
 */
export function challengeConfig<K extends IdSpace>(cfg: SimConfig<K>): SimConfig<K> {
  const maps: Readonly<Record<string, CompiledMapDef<K>>> = cfg.content.maps;
  if (!Object.hasOwn(maps, cfg.mapId)) return cfg;
  const challenge = maps[cfg.mapId]?.challenge ?? null;
  if (challenge === null) return cfg;
  const source = `${CHALLENGE_SOURCE_PREFIX}${cfg.mapId}`;
  if ((cfg.rules ?? []).some((r) => r.source === source)) return cfg;
  if (cfg.modifiers.some((m) => m.source === source)) return cfg;
  const rules: SimRule[] = [...(cfg.rules ?? [])];
  const modifiers: Modifier<K>[] = [...cfg.modifiers];
  let { loadout, specsUnlocked, abilities } = cfg;
  for (const r of challenge.rules) {
    switch (r.kind) {
      case 'towerFaction': {
        rules.push({ kind: 'towerFaction', faction: r.faction, source });
        const towers: Readonly<Record<string, { readonly faction: TowerFaction } | undefined>> =
          cfg.content.towers;
        loadout = loadout.filter((t) => towers[t]?.faction === r.faction);
        break;
      }
      case 'allCloaked':
        rules.push({ kind: 'allCloaked', source });
        break;
      case 'noAbilities':
        rules.push({ kind: 'noAbilities', source });
        abilities = { ...abilities, slot1: null };
        break;
      case 'glassCore':
        modifiers.push({
          kind: 'economy',
          stat: 'coreIntegrity',
          set: CHALLENGE_GLASS_CORE_INTEGRITY,
          source,
        });
        break;
    }
  }
  specsUnlocked = specsUnlocked.filter((t) => loadout.includes(t));
  return { ...cfg, rules, modifiers, loadout, specsUnlocked, abilities };
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
  const faction = towerFactionRule(cfg);
  if (faction !== null) {
    for (const t of cfg.loadout) {
      const def = Object.hasOwn(cfg.content.towers, t) ? cfg.content.towers[t] : undefined;
      if (def !== undefined && def.faction !== faction) {
        out.push(`rules: towerFaction allows ${faction} towers only (got '${t}', ${def.faction})`);
      }
    }
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
