// The campaign save: SaveData v1, its envelope, the id sets a save is checked against, and the
// new-game state. Shape and rules: docs/tech/meta-runtime.md § Save system; what a save tracks:
// docs/design/progression.md § 11. Bump SAVE_VERSION only together with a new entry in
// migrations.ts and a new __fixtures__/save.v<n>.json (meta-runtime.md § Versioning and migrations).
import { ABILITIES } from '../content/abilities/index.ts';
import { MAPS } from '../content/maps/index.ts';
import { TOWERS } from '../content/towers/index.ts';
import type { DifficultyId } from '../sim/index.ts';
import type {
  AbilityId,
  FlagValue,
  MapId,
  MedalId,
  ScriptFlagId,
  TowerId,
  UpgradeId,
} from '../content/types.ts';

/** The current schema version. Codes carry it as their `SD<v>-` prefix. */
export const SAVE_VERSION = 1;

/** Story flags a save can hold. T206b replaces this with `content/dialogue/flags.ts`'s ids. */
export type StoryFlagId = ScriptFlagId;
/** Every story flag id (a record, so a missing id is a compile error). */
const STORY_FLAGS: Readonly<Record<StoryFlagId, StoryFlagId>> = {
  door_choice: 'door_choice',
  spared_quiet_wave: 'spared_quiet_wave',
  stardust_choice: 'stardust_choice',
  quill_choice: 'quill_choice',
};

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
  };
  /** Owned shop and R&D ranks (≥ 1), including the C2 Zibzab Tune-up. */
  // oxlint-disable-next-line typescript/no-generated-empty-object-type -- UpgradeId is never until T204a
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
  readonly upgrades: readonly UpgradeId[];
  readonly storyFlags: readonly StoryFlagId[];
}

/** The live registries' ids. Upgrades are empty until the catalog lands (T204a). */
export const LIVE_KNOWN_IDS: KnownIds = {
  towers: Object.values(TOWERS).map((t) => t.id),
  abilities: Object.values(ABILITIES).map((a) => a.id),
  maps: Object.values(MAPS).map((m) => m.id),
  upgrades: [],
  storyFlags: Object.values(STORY_FLAGS),
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
  };
}
