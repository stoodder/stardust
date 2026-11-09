// SimConfig: everything a run needs that isn't content (architecture.md § Sim public API).
// The sim knows nothing about meta progression: upgrades, protocols, and difficulty arrive as
// Modifiers. createSim() validates the config and throws on a malformed one (a programming error,
// not a player action, so it's an exception rather than an event).
import type { CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import type {
  CompanionId,
  FlagValue,
  IdSpace,
  LiveIds,
  ScriptFlagId,
  TowerStat,
} from '../content/types.ts';
import { unsupportedScript } from './systems/triggers.ts';

/** Where a modifier came from, for the UI's breakdown: `'shop:<id>'`, `'difficulty:story'`, … */
export type ModifierSource = string;
export type EnemyStat = 'hp' | 'shield';
export type EconomyStat = 'startCredits' | 'coreIntegrity';

/**
 * A stat change from outside the map (design/towers.md §4 stacking). `pct` is a fraction:
 * +10% → 0.10. Applied from T204; M1 runs pass none.
 */
export type Modifier<K extends IdSpace = LiveIds> =
  | {
      readonly kind: 'towerStat';
      readonly tower: K['tower'] | '*';
      readonly stat: TowerStat;
      readonly flat?: number;
      readonly pct?: number;
      readonly source: ModifierSource;
    }
  | {
      readonly kind: 'enemyStat';
      readonly stat: EnemyStat;
      readonly pct: number;
      readonly source: ModifierSource;
    }
  | {
      readonly kind: 'economy';
      readonly stat: EconomyStat;
      readonly flat?: number;
      readonly pct?: number;
      readonly source: ModifierSource;
    };

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
}

/** The hard rule: at most 4 tower types per map. */
export const MAX_LOADOUT = 4;

/**
 * Checks a config against its content and returns the map. Throws a RangeError listing every
 * problem. Rejects what M1 can't simulate yet rather than silently ignoring it.
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
  const { slot1, slot2, slot2State } = cfg.abilities;
  if (slot1 !== null && !Object.hasOwn(cfg.content.abilities, slot1)) {
    errors.push(`abilities.slot1: unknown ability '${slot1}'`);
  }
  // Not simulated in M1: refuse rather than ignore, so a run can't silently differ from its config.
  if (cfg.companion !== null || slot2 !== null || slot2State !== 'none') {
    errors.push('companions and slot 2 are not supported until T207');
  }
  if (cfg.modifiers.length > 0) errors.push('modifiers are not applied until T204');
  if (cfg.difficulty !== 'standard') errors.push('only Standard difficulty is supported in M1');
  if (map !== undefined) {
    // The validator's [wave] rule refuses it too; a run with no waves would win on tick 0.
    if (map.waves.length === 0) errors.push(`map '${cfg.mapId}' has no waves`);
    errors.push(...unsupportedScript(map));
  }
  if (errors.length > 0) throw new RangeError(`invalid SimConfig:\n- ${errors.join('\n- ')}`);
  // map is defined: a missing map pushed an error, and errors throw above.
  return map!;
}
