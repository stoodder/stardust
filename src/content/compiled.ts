// CompiledContent: what compileContent() (compile.ts) produces and the sim reads. Time is in
// whole ticks (TICK_HZ, src/shared/time.ts); distance stays in tiles, the sim's only distance
// unit, with squared values precomputed for range checks. Every optional field is resolved to a
// value or null (monomorphic shapes), ids that hot loops follow are resolved to references, and
// the whole tree is deep-frozen.
import type {
  Act,
  AllyKind,
  Body,
  CompanionId,
  ConditionDef,
  CounterId,
  DamageType,
  EnemyFaction,
  FlagValue,
  GridPos,
  IdSpace,
  Layer,
  LinkId,
  LiveIds,
  MarkerId,
  MeterLabel,
  ObjectiveKind,
  PolicyId,
  ProfileDef,
  RouteId,
  ScriptFlagId,
  ScriptAction,
  ScriptTrigger,
  SpriteId,
  TargetPriority,
  TellId,
  TileChar,
  TileKey,
  TowerFaction,
  TowerStat,
  Trait,
  WavePhase,
  WaveTag,
} from './types.ts';

export interface CompiledContent<K extends IdSpace = LiveIds> {
  readonly towers: Readonly<Record<K['tower'], CompiledTowerDef<K['tower']>>>;
  readonly enemies: Readonly<Record<K['enemy'], CompiledEnemyDef<K['enemy']>>>;
  readonly abilities: Readonly<Record<K['ability'], CompiledAbilityDef<K['ability']>>>;
  readonly maps: Readonly<Record<K['map'], CompiledMapDef<K>>>;
  readonly campaign: readonly K['map'][];
}

// ── Towers ───────────────────────────────────────────────────────────────────────────────────

export interface CompiledTowerDef<Id extends string = string> {
  readonly id: Id;
  readonly faction: TowerFaction;
  readonly role: string;
  /** Tiers 1–3, each fully resolved (patches applied). Index 0 is tier 1. */
  readonly tiers: readonly [CompiledTier, CompiledTier, CompiledTier];
  /** Tier 4, each resolved on top of tier 3; null until the tower's specs are authored. */
  readonly specs: { readonly a: CompiledTier; readonly b: CompiledTier } | null;
  readonly links: readonly LinkId[];
  readonly sprites: {
    readonly base: SpriteId;
    readonly head: SpriteId | null;
    readonly icon: SpriteId;
  };
  readonly lightRadiusTiles: number | null;
}

export interface CompiledTier {
  readonly tier: 1 | 2 | 3 | 4;
  /** The spec's name on tier 4, else null. */
  readonly name: string | null;
  /** Credits to build (tier 1) or to reach this tier from the one before. */
  readonly cost: number;
  readonly targets: { readonly ground: boolean; readonly air: boolean };
  readonly defaultPriority: TargetPriority | null;
  readonly attack: CompiledAttack | null;
  readonly effects: readonly CompiledEffect[];
  readonly auras: readonly CompiledAura[];
}

interface CompiledAttackCommon {
  readonly type: DamageType;
  readonly damage: number;
  /** Ticks between shots (or pulses, or beam starts): `ratePerSec` as a whole-tick period. */
  readonly cooldownTicks: number;
  readonly rangeTiles: number;
  readonly rangeSq: number;
  /** 0 when the tower has no minimum range. Exclusive. */
  readonly minRangeTiles: number;
  readonly minRangeSq: number;
  readonly armorPierce: number;
  readonly ignoresArmor: boolean;
  readonly spinUpTicks: number;
}
export type CompiledAttack = CompiledAttackCommon &
  (
    | { readonly kind: 'hitscan' }
    | {
        readonly kind: 'projectile';
        readonly projectile: SpriteId;
        readonly speedTilesPerTick: number;
      }
    | {
        readonly kind: 'lobbed';
        readonly projectile: SpriteId;
        readonly flightTicks: number;
        readonly splashTiles: number;
        readonly splashSq: number;
        readonly lead: boolean;
      }
    | {
        readonly kind: 'beam';
        readonly beamTickTicks: number;
        /** The rounded beam tick in seconds (beamTickTicks / TICK_HZ): the armor proration factor. */
        readonly beamTickSec: number;
      }
    | {
        readonly kind: 'chain';
        readonly jumps: number;
        readonly jumpRangeTiles: number;
        readonly jumpRangeSq: number;
        readonly falloffPct: number;
      }
    | { readonly kind: 'spawner'; readonly ally: AllyKind; readonly maxAlive: number }
    | { readonly kind: 'pulse' }
  );

export type CompiledEffect =
  | { readonly status: 'chilled'; readonly pct: number; readonly durationTicks: number }
  | { readonly status: 'soaked'; readonly durationTicks: number }
  | { readonly status: 'corroded'; readonly stacks: number; readonly maxStacks: number }
  | { readonly status: 'marked'; readonly pct: number; readonly durationTicks: number }
  | { readonly status: 'pinned'; readonly durationTicks: number }
  | { readonly status: 'stasis'; readonly durationTicks: number }
  | { readonly status: 'unnerved'; readonly durationTicks: number };

export interface CompiledAura {
  readonly kind: string;
  readonly radiusTiles: number;
  readonly radiusSq: number;
  readonly stat: TowerStat;
  readonly pct: number;
}

// ── Enemies and abilities ────────────────────────────────────────────────────────────────────

export interface CompiledEnemyDef<Id extends string = string> {
  readonly id: Id;
  readonly faction: EnemyFaction;
  readonly body: Body;
  readonly layer: Layer;
  readonly hp: number;
  readonly armor: number;
  readonly shield: {
    readonly hp: number;
    readonly regenPerTick: number;
    readonly regenDelayTicks: number;
  } | null;
  readonly speedTilesPerTick: number;
  readonly leak: number;
  readonly bounty: number;
  readonly spawnIntervalTicks: number;
  readonly traits: readonly Trait[];
  readonly tells: readonly TellId[];
  readonly restValue: number;
  readonly sprites: { readonly body: SpriteId; readonly icon: SpriteId };
}

export interface CompiledAbilityDef<Id extends string = string> {
  readonly id: Id;
  readonly name: string;
  readonly cooldownTicks: number;
  readonly effect: {
    readonly kind: 'strike';
    readonly type: DamageType;
    readonly damage: number;
    readonly radiusTiles: number;
    readonly radiusSq: number;
    readonly delayTicks: number;
  };
  readonly sprites: { readonly icon: SpriteId };
}

// ── Maps ─────────────────────────────────────────────────────────────────────────────────────

/**
 * A route as a polyline through tile centers (tile (c, r) → point (c + 0.5, r + 0.5)), in tiles.
 * `cumLenTiles[i]` is the route distance from point 0 to point i, so an enemy's `dist` locates it
 * on segment i where cumLenTiles[i] ≤ dist < cumLenTiles[i + 1].
 */
export interface CompiledRoute {
  readonly id: RouteId;
  readonly kind: 'path' | 'air' | 'rift';
  readonly layer: Layer;
  /** Rift lanes only; null for paths and air lanes. */
  readonly opensAtWave: number | null;
  /** The authored tiles (air lanes: points). */
  readonly tiles: readonly GridPos[];
  readonly xs: readonly number[];
  readonly ys: readonly number[];
  readonly cumLenTiles: readonly number[];
  readonly lengthTiles: number;
}

export interface CompiledWave<K extends IdSpace = LiveIds> {
  /** 1-based. */
  readonly number: number;
  /** The countdown before this wave (ignored for wave 1, which the player starts). */
  readonly countdownTicks: number;
  readonly teach: boolean;
  readonly groups: readonly CompiledWaveGroup<K>[];
  /** Ticks from the wave's start to its last spawn: spawning has finished after this. */
  readonly lastSpawnTicks: number;
}
export interface CompiledWaveGroup<K extends IdSpace = LiveIds> {
  readonly enemy: CompiledEnemyDef<K['enemy']>;
  readonly count: number;
  readonly intervalTicks: number;
  readonly delayTicks: number;
  readonly route: CompiledRoute;
  readonly tags: readonly WaveTag[];
  readonly teach: boolean;
}

/** ScriptTrigger with `afterSec` converted to ticks. */
export type CompiledScriptTrigger<K extends IdSpace = LiveIds> =
  | Exclude<ScriptTrigger<K>, { readonly wave: number }>
  | { readonly wave: number; readonly phase: WavePhase | { readonly afterTicks: number } };
/** ScriptAction with setClickable's fallback trigger compiled. */
export type CompiledScriptAction<K extends IdSpace = LiveIds> =
  | Exclude<ScriptAction<K>, { readonly setClickable: unknown }>
  | {
      readonly setClickable: {
        readonly marker: MarkerId;
        readonly on: boolean;
        readonly fallback: CompiledScriptTrigger<K> | null;
      };
    };
export interface CompiledScriptedEvent<K extends IdSpace = LiveIds> {
  readonly id: string;
  readonly on: CompiledScriptTrigger<K>;
  readonly when: ConditionDef<K> | null;
  readonly actions: readonly CompiledScriptAction<K>[];
  readonly once: boolean;
}

export type CompiledBuildStep<K extends IdSpace = LiveIds> = { readonly wave: number } & (
  | { readonly kind: 'build'; readonly tower: K['tower']; readonly tile: GridPos }
  | { readonly kind: 'upgrade'; readonly tile: GridPos }
  | { readonly kind: 'specialize'; readonly tile: GridPos; readonly spec: 'a' | 'b' }
  | { readonly kind: 'sell'; readonly tile: GridPos }
  | { readonly kind: 'targeting'; readonly tile: GridPos; readonly mode: TargetPriority }
  | { readonly kind: 'holdFire'; readonly target: GridPos | 'all'; readonly on: boolean }
  | { readonly kind: 'spareRunners'; readonly target: GridPos | 'all'; readonly on: boolean }
  | {
      readonly kind: 'ability';
      readonly slot: 1 | 2;
      readonly target: GridPos | null;
      /** 'asap': as soon as the step is eligible and the ability is ready. */
      readonly when: 'asap' | 'waveStart' | { readonly afterTicks: number };
    }
  | { readonly kind: 'clear'; readonly tile: GridPos }
  | { readonly kind: 'callWave' }
  | { readonly kind: 'interact'; readonly marker: MarkerId }
  | { readonly kind: 'scriptInput'; readonly id: string }
  | { readonly kind: 'holdFireWhile'; readonly tag: WaveTag }
);
export type BuildStepKind = CompiledBuildStep['kind'];

export interface CompiledBuild<K extends IdSpace = LiveIds> {
  readonly loadout: readonly K['tower'][];
  readonly companion: CompanionId | null;
  /** The build's own, else the reference profile's. */
  readonly technicianAbility: K['ability'] | null;
  readonly callEarly: boolean;
  readonly steps: readonly CompiledBuildStep<K>[];
}

export interface CompiledBuilds<K extends IdSpace = LiveIds> {
  readonly referenceProfile: ProfileDef<K>;
  readonly parBuild: CompiledBuild<K>;
  readonly noCounterBuilds: Readonly<Partial<Record<CounterId, CompiledBuild<K>>>>;
  readonly altBuilds: Readonly<Record<string, CompiledBuild<K>>>;
  readonly guards: Readonly<
    Record<
      string,
      { readonly policy: PolicyId; readonly expect: 'lose' | { readonly maxMarginPct: number } }
    >
  >;
  readonly marginBand: { readonly minPct: number; readonly maxPct: number } | null;
  readonly rebaseline: boolean;
  readonly flagVariants: Readonly<Partial<Record<ScriptFlagId, readonly FlagValue[]>>>;
}

export interface CompiledMapDef<K extends IdSpace = LiveIds> {
  readonly id: K['map'];
  readonly act: Act;
  readonly env: string;
  readonly objective: ObjectiveKind;
  readonly meterLabel: MeterLabel | null;
  readonly maxLost: number | null;
  readonly minVoices: number | null;
  readonly evacuatedFloor: number | null;
  readonly cols: number;
  readonly rows: number;
  /** Row-major: the tile at (col, row) is `tiles[row * cols + col]`. */
  readonly tiles: readonly TileChar[];
  readonly underWreckage: Readonly<Partial<Record<TileKey, TileChar>>>;
  readonly salvage: Readonly<Partial<Record<TileKey, number>>>;
  /** Paths, air lanes, and rift lanes by id (ids are unique across all three). */
  readonly routes: Readonly<Record<RouteId, CompiledRoute>>;
  readonly markers: Readonly<Record<MarkerId, GridPos>>;
  readonly startCredits: number;
  readonly coreIntegrity: number;
  readonly stardust: number;
  readonly briefing: string | null;
  /** Loadout towers that start locked: the keys of `towerUnlockWave`, in unlock order. */
  readonly lockedTowersAtStart: readonly K['tower'][];
  readonly threatIntel: readonly Trait[];
  readonly requiredCounters: readonly CounterId[];
  readonly waves: readonly CompiledWave<K>[];
  /** Compiled `towerUnlockWave` events first, then the authored events, in order. */
  readonly events: readonly CompiledScriptedEvent<K>[];
  readonly medals: {
    readonly challenge: { readonly id: string; readonly condition: ConditionDef<K> };
  } | null;
  readonly objectives: readonly {
    readonly id: string;
    readonly condition: ConditionDef<K>;
    readonly intel: number;
    readonly onComplete: readonly CompiledScriptAction<K>[];
  }[];
  readonly companion:
    | { readonly id: CompanionId; readonly state: 'present' | 'absent' }
    | { readonly pick: readonly CompanionId[] }
    | null;
  readonly lockedAbilities: readonly {
    readonly ability: K['ability'];
    readonly when: ConditionDef<K>;
  }[];
  readonly revisitOf: string | null;
  readonly builds: CompiledBuilds<K>;
}
