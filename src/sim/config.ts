// SimConfig: everything a run needs that isn't content (architecture.md § Sim public API).
// The sim knows nothing about meta progression: upgrades, protocols, and difficulty arrive as
// Modifiers. createSim() validates the config and throws on a malformed one (a programming error,
// not a player action, so it's an exception rather than an event).
import type { CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import type {
  CompanionId,
  EnemyFaction,
  FlagValue,
  IdSpace,
  LiveIds,
  ScriptFlagId,
  TowerStat,
} from '../content/types.ts';
import { MAX_LOADOUT } from '../content/rules.ts';
import { flagConditionHolds } from '../content/flagConditions.ts';
import { abilityConfigErrors } from './systems/abilities.ts';
import { unsupportedScript } from './systems/triggers.ts';
import { gateRefusals } from './gates.ts';
import { ruleConfigErrors, type SimRule } from './rules.ts'; // T860

/** Where a modifier came from, for the UI's breakdown: `'shop:<id>'`, `'difficulty:story'`, … */
export type ModifierSource = string;
/** Enemy stats a modifier can scale (Story difficulty, veteran modifiers). */
export type EnemyStat = 'hp' | 'shield' | 'speed';
/**
 * Map-economy numbers a modifier can change (design/progression.md §4.3, §5, §9):
 * - `startCredits`: Seed Money, Head Start, Story difficulty.
 * - `coreIntegrity`: Reinforced Core (flat), Story difficulty (`set: 30`).
 * - `bounty`: every kill bounty (Bounty Hunter, Bounty Board).
 * - `earlyCallBonus`: Early Bird.
 * - `salvage`: wreckage salvage (Salvage Rights; wreckage is M3+).
 * - `clearSpeed`: wreckage clearing speed (Salvage Expert; M3+).
 * - `assetIntegrity`: a Protect map's asset meter (Story difficulty ×1.5; never a catalog grant).
 */
export type EconomyStat =
  | 'startCredits'
  | 'coreIntegrity'
  | 'bounty'
  | 'earlyCallBonus'
  | 'salvage'
  | 'clearSpeed'
  | 'assetIntegrity';
/** Commander-ability stats a modifier can change: Ability Coolant, Rapport (cooldown), Mk II (radius). */
export type AbilityStat = 'cooldown' | 'radius';
/** Tiles whose built-in bonus a modifier can raise (High Ground Training). */
export type BonusTile = 'highGround' | 'powerNode';
/**
 * A support tower's stats a modifier can raise (design/progression.md § 4.2: a support tower's
 * tune-up ranks 1 and 3): `aura` adds to its auras' strength (as a power node's +20% does), and
 * `radius` scales its detection and aura radii (T406); `income` raises an economy tower's per-wave
 * income (the Salvage Crane's rank 1, T408; sim/towerEconomy.ts).
 */
export type SupportStat = 'aura' | 'radius' | 'income';

/**
 * A change from outside the map: permanent upgrades, Field Protocols, and difficulty arrive as a
 * list of these (architecture.md § Sim public API; meta/modifiers.ts builds them). Unless a kind
 * says otherwise, `pct` is a fraction (+10% → 0.10) and the stacking formula applies
 * (design/towers.md §4): `(base + Σ flat) × (1 + Σ pct)`, percentages added, never multiplied.
 * createSim refuses each kind until the task that applies it lands (FEATURE_GATES in gates.ts).
 */
export type Modifier<K extends IdSpace = LiveIds> =
  /** Tune-up damage and range (ranks 1 and 3), the Zibzab Tune-up (meta expands it per tower). */
  | {
      readonly kind: 'towerStat';
      readonly tower: K['tower'] | '*';
      readonly stat: TowerStat;
      readonly flat?: number;
      readonly pct?: number;
      readonly source: ModifierSource;
    }
  /**
   * Credit costs: tune-up rank 2 (−5% build and upgrade, `tiers: 'all'`, specializations
   * included) and Specialist (−25% tier 4 only, `tiers: 'spec'`). `pct` is negative for a
   * discount; the sim rounds the final cost.
   */
  | {
      readonly kind: 'towerCost';
      readonly tower: K['tower'] | '*';
      readonly tiers: 'all' | 'spec';
      readonly pct: number;
      readonly source: ModifierSource;
    }
  /** Story difficulty (−30% HP and shields), veteran Hardened Hides and Double Time. */
  | {
      readonly kind: 'enemyStat';
      readonly stat: EnemyStat;
      readonly pct: number;
      readonly source: ModifierSource;
    }
  /**
   * C4 Purge (core-loop.md § 6.11; T703, factionArmor.ts): every unit of `faction` spawns with
   * its armor + `flat` (−2: Everglow's open panels), never below 0, its def's `openPanel` set.
   * battleSetup adds it from A3M5 on (T710).
   */
  | {
      readonly kind: 'enemyStat';
      readonly stat: 'armor';
      readonly faction: EnemyFaction;
      readonly flat: number;
      readonly source: ModifierSource;
    }
  /**
   * `set` replaces the map's value before `flat` and `pct` apply (Story's integrity 30, veteran
   * Glass Core's 5); if several modifiers set it, the lowest wins.
   */
  | {
      readonly kind: 'economy';
      readonly stat: EconomyStat;
      readonly set?: number;
      readonly flat?: number;
      readonly pct?: number;
      readonly source: ModifierSource;
    }
  /**
   * Resale Value: adds `flat` to the sell refund fraction (SELL_REFUND_PCT 0.7 → 0.75 → 0.8).
   * The misclick-grace full refund is unchanged.
   */
  | { readonly kind: 'sellRefund'; readonly flat: number; readonly source: ModifierSource }
  /**
   * Commander abilities by id (`'*'`: every ability): Ability Coolant (`'*'`, cooldown −5%),
   * Orbital Strike Mk II (radius +0.5 flat), Companion Rapport (that companion's ability's
   * cooldown −15%; Bricks's carries over to inherited Suppressing Fire because it's keyed by
   * ability, not slot).
   */
  | {
      readonly kind: 'abilityStat';
      readonly ability: K['ability'] | '*';
      readonly stat: AbilityStat;
      readonly flat?: number;
      readonly pct?: number;
      readonly source: ModifierSource;
    }
  /**
   * A support tower's tune-up (T406; the Lookout Shack's ranks 1 and 3): +`pct` aura strength, or
   * its detection and aura radii × (1 + Σ pct); a tower with an attack ignores those. `income`:
   * the Salvage Crane's per-wave income × (1 + Σ pct) (T408).
   */
  | {
      readonly kind: 'supportStat';
      readonly tower: K['tower'] | '*';
      readonly stat: SupportStat;
      readonly pct: number;
      readonly source: ModifierSource;
    }
  /** Wave countdowns (Story +50%, veteran Rush Hour −50%). */
  | { readonly kind: 'countdown'; readonly pct: number; readonly source: ModifierSource }
  /** Linked Up: every synergy link's bonus × (1 + pct). */
  | { readonly kind: 'linkBonus'; readonly pct: number; readonly source: ModifierSource }
  /** High Ground Training: adds `flat` to the tile's bonus fraction (0.25 → 0.40). */
  | {
      readonly kind: 'tileBonus';
      readonly tile: BonusTile;
      readonly flat: number;
      readonly source: ModifierSource;
    }
  /** Emergency Bulkhead: the first `flat` integrity lost to leaks is absorbed, once per map. */
  | { readonly kind: 'leakAbsorb'; readonly flat: number; readonly source: ModifierSource }
  /** Rapid Deploy: the first tower built each map costs nothing (tier 1 only). */
  | { readonly kind: 'firstBuildFree'; readonly source: ModifierSource }
  /**
   * Ready Room: the first cast of each commander ability during wave `wave` doesn't start its
   * cooldown.
   */
  | { readonly kind: 'freeCast'; readonly wave: number; readonly source: ModifierSource };
export type ModifierKind = Modifier['kind'];

/** Difficulty settings (design/progression.md §9). Their effects arrive as modifiers. */
export type DifficultyId = 'story' | 'standard';

/** Story flags that map scripts read (story-runtime.md § Map scripts). */
export type ScriptFlags = Readonly<Partial<Record<ScriptFlagId, FlagValue>>>;

export interface SimConfig<K extends IdSpace = LiveIds> {
  readonly content: CompiledContent<K>;
  readonly mapId: K['map'];
  /** Any integer in [0, 2³²). */
  readonly seed: number;
  /** At most 4 distinct towers (hard rule); never a revoked class. */
  readonly loadout: readonly K['tower'][];
  /** Resolved from the map's `companion` (a pick list is resolved before the map). */
  readonly companion: CompanionId | null;
  readonly modifiers: readonly Modifier<K>[];
  readonly difficulty: DifficultyId;
  readonly abilities: {
    readonly slot1: K['ability'] | null;
    readonly slot2: K['ability'] | null;
    readonly slot2State: 'present' | 'absent' | 'none';
  };
  readonly scriptFlags: ScriptFlags;
  /**
   * Towers whose tier-4 pair the player has unlocked (one R&D purchase unlocks both specs;
   * meta-runtime.md § Meta). `specialize` is rejected `specLocked` for any other tower.
   */
  readonly specsUnlocked: readonly K['tower'][];
  /**
   * The balance harness's per-class story variant (T606; towers.md § 9): every `revokeTowerClass`
   * takes this class instead of selecting one (`mostInvested`). Never set in play.
   */
  readonly revokeClass?: K['tower'];
  /**
   * Run rules (sim/rules.ts; T860): Radio Silence, Short-Handed, No Protocols, from a veteran
   * replay or a challenge map. Absent: none.
   */
  readonly rules?: readonly SimRule[];
}

export { MAX_LOADOUT };

/**
 * Checks a config against its content and returns the map. Throws a RangeError listing every
 * problem. Refuses what the sim can't simulate yet (FEATURE_GATES) rather than ignoring it.
 */
export function validateConfig(cfg: SimConfig<IdSpace>): CompiledMapDef<IdSpace> {
  const errors: string[] = [];
  const map = Object.hasOwn(cfg.content.maps, cfg.mapId) ? cfg.content.maps[cfg.mapId] : undefined;
  if (map === undefined) errors.push(`unknown map '${cfg.mapId}'`);
  if (!Number.isInteger(cfg.seed) || cfg.seed < 0 || cfg.seed >= 2 ** 32) {
    errors.push(`seed must be an integer in [0, 2^32) (got ${cfg.seed})`);
  }
  if (cfg.loadout.length > MAX_LOADOUT) {
    errors.push(`loadout has ${cfg.loadout.length} towers; the limit is ${MAX_LOADOUT}`);
  }
  const seen = new Set<string>();
  for (const id of cfg.loadout) {
    if (!Object.hasOwn(cfg.content.towers, id)) errors.push(`loadout: unknown tower '${id}'`);
    if (seen.has(id)) errors.push(`loadout: '${id}' appears twice`);
    seen.add(id);
  }
  const { slot1, slot2 } = cfg.abilities;
  if (slot1 !== null && !Object.hasOwn(cfg.content.abilities, slot1)) {
    errors.push(`abilities.slot1: unknown ability '${slot1}'`);
  }
  if (slot2 !== null && !Object.hasOwn(cfg.content.abilities, slot2)) {
    errors.push(`abilities.slot2: unknown ability '${slot2}'`);
  }
  const specSeen = new Set<string>();
  for (const id of cfg.specsUnlocked) {
    if (!Object.hasOwn(cfg.content.towers, id)) errors.push(`specsUnlocked: unknown tower '${id}'`);
    if (specSeen.has(id)) errors.push(`specsUnlocked: '${id}' appears twice`);
    specSeen.add(id);
  }
  if (cfg.revokeClass !== undefined && !Object.hasOwn(cfg.content.towers, cfg.revokeClass)) {
    errors.push(`revokeClass: unknown tower '${cfg.revokeClass}'`);
  }
  // The companion's slot and ability modifiers (systems/abilities.ts).
  errors.push(...abilityConfigErrors(cfg));
  // The run's own rules (sim/rules.ts; T860): Short-Handed's limit, Radio Silence, No Protocols.
  errors.push(...ruleConfigErrors(cfg));
  // Refuse rather than ignore what the sim can't simulate yet (gates.ts), so a run can't
  // silently differ from its config.
  errors.push(...gateRefusals(cfg));
  if (map !== undefined) {
    // The validator's [wave] rule refuses it too; a run with no waves would win on tick 0.
    if (map.waves.length === 0) errors.push(`map '${cfg.mapId}' has no waves`);
    errors.push(...unsupportedScript(map));
    // Slot 1 can't hold an ability the map locks under the run's story flags (A3M5's System
    // Reboot under C4 Rewrite; D150), so no run (the harness's included) plays what a player can't.
    for (const l of map.lockedAbilities) {
      if (l.ability === slot1 && flagConditionHolds(l.when, cfg.scriptFlags)) {
        errors.push(
          `abilities.slot1: '${slot1}' is locked on '${cfg.mapId}' under these story flags`,
        );
      }
    }
  }
  if (errors.length > 0) throw new RangeError(`invalid SimConfig:\n- ${errors.join('\n- ')}`);
  // map is defined: a missing map pushed an error, and errors throw above.
  return map!;
}
