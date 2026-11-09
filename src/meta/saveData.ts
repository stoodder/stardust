// The campaign save: SaveData v1, its envelope, the id sets a save is checked against, and the
// new-game state. Shape and rules: docs/tech/meta-runtime.md § Save system; what a save tracks:
// docs/design/progression.md § 11. Bump SAVE_VERSION only together with a new entry in
// migrations.ts and a new __fixtures__/save.v<n>.json (meta-runtime.md § Versioning and migrations).
import { ABILITIES } from '../content/abilities/index.ts';
import { FLAG_IDS } from '../content/dialogue/flags.ts';
import { MAPS } from '../content/maps/index.ts';
import { TOWERS } from '../content/towers/index.ts';
import { PROTOCOLS, UPGRADES } from '../content/upgrades/index.ts';
import type { DifficultyId } from '../sim/index.ts';
import type {
  AbilityId,
  FlagId,
  FlagValue,
  MapId,
  MedalId,
  ProtocolId,
  TowerId,
  UpgradeId,
} from '../content/types.ts';

/** The current schema version. Codes carry it as their `SD<v>-` prefix. */
export const SAVE_VERSION = 1;

/** Story flags a save can hold: every flag in `content/dialogue/flags.ts`. */
export type StoryFlagId = FlagId;

/** Ids with no registry yet (dialogue scenes, memos, codex entries, one-time grants). */
export type SceneId = string;
export type MemoId = string;
export type CodexId = string;
export type GrantId = string;
export type CodexVersion = 'original' | 'annotated' | 'corrected';
export const CODEX_VERSIONS: readonly CodexVersion[] = ['original', 'annotated', 'corrected'];

/** One campaign map's record. A map with no record has never been played to an end. */
export interface MapRecord {
  completed: boolean;
  /** Medals earned on this map, each once (progression.md § 3). Any medal implies `completed`. */
  medals: MedalId[];
  /** The best final meter reading (integrity, evacuated, …) on a win; 0 before the first win. */
  bestMeter: number;
}

/**
 * A loadout the player picked on the loadout screen (design/core-loop.md § 1): 1 to MAX_LOADOUT
 * distinct towers, in build-slot order, and the Technician's ability (slot 1; null only while the
 * save owns none). Field Protocols join with their picker (M3).
 */
export interface LoadoutPreset {
  towers: TowerId[];
  ability: AbilityId | null;
}

/** The player's campaign state. Mutable plain data: meta transactions return updated copies. */
export interface SaveData {
  /** Character creation arrives with T306; until then every save has no profile (D031). */
  profile: null;
  campaign: { maps: Partial<Record<MapId, MapRecord>> };
  currencies: { stardust: number; intel: number };
  unlocks: {
    towers: TowerId[];
    /** Towers whose tier-4 pair is unlocked (one purchase unlocks both specs). Subset of `towers`. */
    specs: TowerId[];
    /** Owned classes revoked (A3M2 until the jailbreak). Subset of `towers`. */
    revokedTowers: TowerId[];
    /** Owned classes drawn with the jailbroken palette. Subset of `towers`. */
    jailbroken: TowerId[];
    abilities: AbilityId[];
    /** Subset of `abilities`. */
    revokedAbilities: AbilityId[];
    /** Field Protocols owned (bought at Zibzab's shop, progression.md § 4.4). Equipping them is M3. */
    protocols: ProtocolId[];
  };
  /** Owned shop and R&D ranks (≥ 1), including the C2 Zibzab Tune-up. */
  upgrades: Partial<Record<UpgradeId, number>>;
  story: {
    flags: Partial<Record<StoryFlagId, FlagValue>>;
    seen: SceneId[];
    memosRead: MemoId[];
    memosDelivered: MemoId[];
    codex: Record<CodexId, CodexVersion[]>;
    /** The next name in Bricks's tag list. */
    bricksTagIndex: number;
    /** The A3M3 {name} turret's type. */
    memorialTower: TowerId | null;
    /** One-time grants already applied (q3_bonus, gifts, crate). */
    granted: GrantId[];
  };
  stats: { pestsProcessed: number; runs: number };
  /** Per-campaign settings (progression.md § 9): changeable any time between maps. */
  settings: { difficulty: DifficultyId };
  /**
   * Loadout presets (T201, meta/loadout.ts): the last loadout locked in on each map, and the last
   * one on any map (where the screen starts on a map with none).
   */
  loadouts: { last: LoadoutPreset | null; byMap: Partial<Record<MapId, LoadoutPreset>> };
}

/** Every difficulty a save can hold; the first is a new save's. */
export const DIFFICULTIES: readonly DifficultyId[] = ['standard', 'story'];

/** What a slot or an export code holds: the data plus its schema version and write time. */
export interface SaveEnvelope {
  v: number;
  /** Epoch milliseconds, from the caller's clock (meta never reads the clock itself). */
  savedAt: number;
  data: SaveData;
}

/** The ids a save may name. Unknown ids make a save invalid (saves are untrusted input). */
export interface KnownIds {
  readonly towers: readonly TowerId[];
  readonly abilities: readonly AbilityId[];
  readonly maps: readonly MapId[];
  /** Each upgrade id and its rank count: an owned rank is 1..ranks (`UpgradeDef.ranks.length`). */
  readonly upgradeRanks: Readonly<Partial<Record<UpgradeId, number>>>;
  readonly protocols: readonly ProtocolId[];
  readonly storyFlags: readonly StoryFlagId[];
}

/** The live registries' ids. */
export const LIVE_KNOWN_IDS: KnownIds = {
  towers: Object.values(TOWERS).map((t) => t.id),
  abilities: Object.values(ABILITIES).map((a) => a.id),
  maps: Object.values(MAPS).map((m) => m.id),
  upgradeRanks: Object.fromEntries(Object.values(UPGRADES).map((u) => [u.id, u.ranks.length])),
  protocols: Object.values(PROTOCOLS).map((p) => p.id),
  storyFlags: FLAG_IDS,
};

/** Towers issued before A1M1 (campaign.md § 4.1). */
export const STARTING_TOWERS: readonly TowerId[] = ['rivet', 'thumper'];
/**
 * Abilities a new save owns. Orbital Strike is Sterling's welcome-memo gift; until the memo exists
 * (T302) a new save grants it directly (D031).
 */
export const STARTING_ABILITIES: readonly AbilityId[] = ['orbital_strike'];

/** The state of a brand-new campaign. Returns a fresh object every call. */
export function createNewSave(): SaveData {
  return {
    profile: null,
    campaign: { maps: {} },
    currencies: { stardust: 0, intel: 0 },
    unlocks: {
      towers: [...STARTING_TOWERS],
      specs: [],
      revokedTowers: [],
      jailbroken: [],
      abilities: [...STARTING_ABILITIES],
      revokedAbilities: [],
      protocols: [],
    },
    upgrades: {},
    story: {
      flags: {},
      seen: [],
      memosRead: [],
      memosDelivered: [],
      codex: {},
      bricksTagIndex: 0,
      memorialTower: null,
      granted: [],
    },
    stats: { pestsProcessed: 0, runs: 0 },
    settings: { difficulty: 'standard' },
    loadouts: { last: null, byMap: {} },
  };
}
