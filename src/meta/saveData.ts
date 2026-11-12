// The campaign save: SaveData v2, its envelope, the id sets a save is checked against, and the
// new-game state. Shape and rules: docs/tech/meta-runtime.md § Save system; what a save tracks:
// docs/design/progression.md § 11. Bump SAVE_VERSION only together with a new entry in
// migrations.ts and a new __fixtures__/save.v<n>.json (meta-runtime.md § Versioning and migrations).
import { ABILITIES } from '../content/abilities/index.ts';
import type { CodexId, CodexVersion } from '../content/codex/types.ts';
import { FLAG_IDS, FLAGS } from '../content/dialogue/flags.ts';
import type { PlayerProfile } from '../content/dialogue/profile.ts';
import type { SceneId } from '../content/dialogue/types.ts';
import { ENEMIES } from '../content/enemies/index.ts';
import { MAPS } from '../content/maps/index.ts';
import { POST_GAME_MAPS } from '../content/postGame.ts'; // T803d
import type { MemoId } from '../content/memos/types.ts';
import { TOWERS } from '../content/towers/index.ts';
import { PROTOCOLS, UPGRADES } from '../content/upgrades/index.ts';
import type { CommandLogEntry, DifficultyId } from '../sim/index.ts';
import { deliverMemos } from './story.ts';
import type { VeteranModifierId } from './veteran.ts';
import type {
  AbilityId,
  CompanionId,
  EnemyId,
  FlagId,
  FlagValue,
  MapId,
  MedalId,
  ProtocolId,
  TowerId,
  UpgradeId,
} from '../content/types.ts';

/** The current schema version. Codes carry it as their `SD<v>-` prefix. */
export const SAVE_VERSION = 3;

/** Story flags a save can hold: every flag in `content/dialogue/flags.ts`. */
export type StoryFlagId = FlagId;

export type { CodexId, CodexVersion, MemoId, PlayerProfile, SceneId };
export { CODEX_VERSIONS } from '../content/codex/types.ts';
/** One-time grants (q3_bonus, gifts, the crate): free-form ids until their transactions land. */
export type GrantId = string;

/**
 * A one-time hint a save has already shown (D061): `upgrade`, the upgrade teach (D028), and
 * `new:<tower>`, a newly issued tower's first battle (its NEW pip and QUILL's announcement), and
 * `xenotech`, the first visit to Ves'thara's Xenotech tab (its NEW tag until then; T566).
 */
export type HintId = 'upgrade' | 'xenotech' | `new:${TowerId}`;

/** One campaign map's record. A map with no record has never been played to an end. */
export interface MapRecord {
  completed: boolean;
  /** Medals earned on this map, each once (progression.md § 3). Any medal implies `completed`. */
  medals: MedalId[];
  /** The best final meter reading (integrity, evacuated, …) on a win; 0 before the first win. */
  bestMeter: number;
  /**
   * Optional objectives completed on a win, each once (Objective Intel, progression.md § 3; T304f).
   * Absent until the first one: saves from before objectives need no migration.
   */
  objectives?: string[];
}

/**
 * A loadout the player picked on the loadout screen (design/core-loop.md § 1): 1 to MAX_LOADOUT
 * distinct towers, in build-slot order, and the Technician's ability (slot 1; null only while the
 * save owns none). Field Protocols are equipped save-wide (`loadouts.protocols`), not per preset.
 */
export interface LoadoutPreset {
  towers: TowerId[];
  ability: AbilityId | null;
  /**
   * Who walks with you on a pick-list map (the finale's companion pick; meta/loadout.ts
   * `pickedCompanion`). Absent: the list's first (Ves'thara), and on every other map.
   */
  companion?: CompanionId;
}

/** The player's campaign state. Mutable plain data: meta transactions return updated copies. */
export interface SaveData {
  /**
   * The player's name, form of address (and the pronoun set it picks), and callsign, from
   * character creation (T306). Null until the intake: every save written before v2, and a new save
   * until the form is filled in. v3 added `address` (D163). The intake
   * also sets the `arrival_reason` flag (that flag is its one home).
   */
  profile: PlayerProfile | null;
  campaign: {
    maps: Partial<Record<MapId, MapRecord>>;
    /** Enemy types the player has met (first spawned in a run): the NEW badge and `new_enemy`. */
    seenEnemies: EnemyId[];
  };
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
    /**
     * Companion abilities inherited as Technician abilities, in the order inherited (A3M4's mail:
     * Suppressing Fire; C4 Keep: Time Dilation; meta/storyTransactions.ts `inheritAbility`). Each is
     * also in `abilities`, which is what the loadout reads; this records where it came from (the
     * finale's Keep script takes Time Dilation back). Optional, absent until the first, so it needs
     * no SaveData bump (like a map record's `objectives`). Subset of `abilities`.
     */
    inheritedAbilities?: AbilityId[];
    /** Field Protocols owned (bought at Zibzab's shop, progression.md § 4.4). */
    protocols: ProtocolId[];
  };
  /** Owned shop and R&D ranks (≥ 1), including the C2 Zibzab Tune-up. */
  upgrades: Partial<Record<UpgradeId, number>>;
  story: {
    /** Each set flag holds one of its declared values (content/dialogue/flags.ts). */
    flags: Partial<Record<StoryFlagId, FlagValue>>;
    /**
     * Scenes played (skippable on replay), barks that play once per campaign (`BarkId`s), and codex
     * versions read (`codex_<entry>__<version>`, story/codex.ts `codexSeenId`).
     */
    seen: SceneId[];
    /** Memos read: a subset of `memosDelivered` (unread = delivered − read, the Inbox badge). */
    memosRead: MemoId[];
    /** Memos delivered, in delivery order (each memo's gift is granted on delivery). */
    memosDelivered: MemoId[];
    /** Unlocked codex versions per entry, each in unlock order. */
    codex: Record<CodexId, CodexVersion[]>;
    /** The next name in Bricks's tag list (campaign.md § 6.3). */
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
   * one on any map (where the screen starts on a map with none); and the Field Protocols equipped,
   * save-wide (progression.md § 5: swapped freely between maps; T308's picker).
   */
  loadouts: {
    last: LoadoutPreset | null;
    byMap: Partial<Record<MapId, LoadoutPreset>>;
    /** Equipped protocols in slot order: owned, distinct, no more than the save's slots. */
    protocols: ProtocolId[];
    /** The tower each equipped `choice: 'tower'` protocol (Specialist) picked: an owned tower. */
    protocolPicks: Partial<Record<ProtocolId, TowerId>>;
  };
  /** One-time hints already shown (meta/hints.ts). */
  seenHints: HintId[];
  /**
   * The finale's run in progress at its latest checkpoint (D154: the finale only, so a 20–25
   * minute run survives a closed tab; every other map's checkpoints stay in memory). Absent with
   * no run pending. Optional, like the post-game fields below, so it needs no SaveData bump.
   */
  pendingRun?: PendingRun;
  /**
   * Veteran records per map won (progression.md § 6; T860): the modifiers last picked and the
   * best total bonus a replay victory carried. Absent until the first veteran replay.
   */
  veteran?: Partial<Record<MapId, VeteranRecord>>;
  /** Endless mode's score table (maps.md § 8; T861): one best record per seed, at most 10. */
  endless?: EndlessScore[];
}

/**
 * A run persisted at a checkpoint (D154; app/checkpoints.ts): what rebuilds it is the map, the
 * seed, the loadout and companion locked in, and the save (its config, rebuilt by
 * app/battleSetup.ts); the replay is its command log up to the checkpoint. `configHash` fingerprints
 * the config it ran on, so a resume whose save now builds another (a purchase since) starts over
 * rather than replaying into a different run (T809 defines the hash and writes the field).
 */
export interface PendingRun {
  map: MapId;
  /** The run's seed: a 32-bit unsigned integer. */
  seed: number;
  loadout: LoadoutPreset;
  /** The companion picked for the run (the finale's pick list), or null on a map without one. */
  companion: CompanionId | null;
  checkpoint: PendingCheckpoint;
  /** The run's logged commands before the checkpoint (`checkpoint.commandCount` of them). */
  log: CommandLogEntry[];
  /** Skitterkin of this run already filed in the save's Pests Processed (app/checkpoints.ts). */
  killsBefore: number;
  /** 8 lowercase hex digits: the config's fingerprint (app/resume.ts `configHash`). */
  configHash: string;
  /**
   * The checkpoint a lost run's retry resumed from before this one was taken (the run forfeits
   * Perfect and the Challenge, core-loop.md § 2.12); absent for a run from wave 1, which a reload
   * continues as the same run.
   */
  retriedFrom?: PendingCheckpoint;
}

/** A persisted checkpoint (app/checkpoints.ts `Checkpoint`, with the sim's label). */
export interface PendingCheckpoint {
  /** `'halls'` at Phase 2's start ("Retry from the Halls"); absent on a wave checkpoint. */
  label?: string;
  wave: number;
  tick: number;
  commandCount: number;
}

/** One map's veteran record (meta/veteran.ts). */
export interface VeteranRecord {
  /** The modifiers last picked on the replay briefing, in table order, each once. */
  mods: VeteranModifierId[];
  /** The best total Stardust bonus (percent) a victory here carried; 0 before one. */
  best: number;
}

/** One endless score: the waves held on a seed (maps.md § 8: a run can be shared by seed). */
export interface EndlessScore {
  seed: number;
  wave: number;
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
  readonly enemies: readonly EnemyId[];
  readonly abilities: readonly AbilityId[];
  readonly maps: readonly MapId[];
  /** Each upgrade id and its rank count: an owned rank is 1..ranks (`UpgradeDef.ranks.length`). */
  readonly upgradeRanks: Readonly<Partial<Record<UpgradeId, number>>>;
  readonly protocols: readonly ProtocolId[];
  /** Protocols that take a tower pick (`choice: 'tower'`, Specialist). */
  readonly protocolsWithPick: readonly ProtocolId[];
  readonly storyFlags: readonly StoryFlagId[];
  /** Each flag's declared values (T218: a saved value must be one of them). */
  readonly flagValues: Readonly<Partial<Record<StoryFlagId, readonly FlagValue[]>>>;
}

/**
 * A post-game map's id (content/postGame.ts; T803d): a MapId whose content registers with the
 * finale's lazy chunk, so a save may name it before that chunk loads.
 */
function isPostGameMapId(id: string): id is MapId {
  return POST_GAME_MAPS.some((m) => m.id === id);
}

/** The live registries' ids. */
export const LIVE_KNOWN_IDS: KnownIds = {
  towers: Object.values(TOWERS).map((t) => t.id),
  enemies: Object.values(ENEMIES).map((e) => e.id),
  abilities: Object.values(ABILITIES).map((a) => a.id),
  // The post-game maps too (Endless, the challenges; T803d): their loadout presets are kept per map,
  // though their content registers later, with the finale's chunk.
  maps: [
    ...Object.values(MAPS).map((m) => m.id),
    ...POST_GAME_MAPS.map((m) => m.id).filter(isPostGameMapId),
  ],
  upgradeRanks: Object.fromEntries(Object.values(UPGRADES).map((u) => [u.id, u.ranks.length])),
  protocols: Object.values(PROTOCOLS).map((p) => p.id),
  protocolsWithPick: Object.values(PROTOCOLS)
    .filter((p) => p.choice === 'tower')
    .map((p) => p.id),
  storyFlags: FLAG_IDS,
  flagValues: Object.fromEntries(FLAG_IDS.map((f) => [f, FLAGS[f].values])),
};

/** Towers issued before A1M1 (campaign.md § 4.1). */
export const STARTING_TOWERS: readonly TowerId[] = ['rivet', 'thumper'];
/**
 * Abilities a new save owns before its memos arrive: none. Orbital Strike is the gift of Sterling's
 * welcome memo (`memo_a1_00`), which `createNewSave` delivers (T303 retired D031's direct grant).
 */
export const STARTING_ABILITIES: readonly AbilityId[] = [];

/**
 * The state of a brand-new campaign, with the memos due before A1M1 delivered (the welcome memo
 * and its gift, the Orbital Strike uplink; meta/story.ts). Its codex fills in at the first run end
 * or base visit. Returns a fresh object every call.
 */
export function createNewSave(): SaveData {
  return deliverMemos(blankSave()).save;
}

/** A campaign before anything is delivered: the issued towers and empty records. */
function blankSave(): SaveData {
  return {
    profile: null,
    campaign: { maps: {}, seenEnemies: [] },
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
    loadouts: { last: null, byMap: {}, protocols: [], protocolPicks: {} },
    seenHints: [],
  };
}
