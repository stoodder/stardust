// CompiledContent: what compileContent() (compile.ts) produces and the sim reads. Time is in
// whole ticks (TICK_HZ, src/shared/time.ts); distance stays in tiles, the sim's only distance
// unit, with squared values precomputed for range checks. Every optional field is resolved to a
// value or null (monomorphic shapes), ids that hot loops follow are resolved to references, and
// the whole tree is deep-frozen.
import type {
  Act,
  AllyKind,
  AltBuildExpectation,
  Body,
  BossEnding,
  ChallengeMedalDef,
  CompanionId,
  ConditionDef,
  CounterId,
  DamageType,
  EnemyFaction,
  FlagValue,
  GridPos,
  HoldFireWhileTarget,
  IdSpace,
  Layer,
  LiveIds,
  MarkerId,
  MedalKind,
  MeterLabel,
  ObjectiveKind,
  PolicyId,
  ProfileDef,
  RouteId,
  RunEndFlagRuns,
  ScriptFlagId,
  ScriptAction,
  ScriptTrigger,
  SpriteId,
  TargetPriority,
  TellId,
  ThreatIntelId,
  TileChar,
  TileKey,
  TowerFaction,
  TowerStat,
  Trait,
  UpgradeId,
  WavePhase,
  WaveTag,
} from './types.ts';
import type { BooleanFlagId } from './dialogue/flags.ts';

export interface CompiledContent<K extends IdSpace = LiveIds> {
  readonly towers: Readonly<Record<K['tower'], CompiledTowerDef<K['tower']>>>;
  readonly enemies: Readonly<Record<K['enemy'], CompiledEnemyDef<K['enemy']>>>;
  readonly abilities: Readonly<Record<K['ability'], CompiledAbilityDef<K['ability']>>>;
  readonly maps: Readonly<Record<K['map'], CompiledMapDef<K>>>;
  /** Synergy links in registry order: `links[i].bit === 1 << i` (Tower.linkMask). */
  readonly links: readonly CompiledLinkDef<K>[];
  readonly campaign: readonly K['map'][];
}

// ── Towers ───────────────────────────────────────────────────────────────────────────────────

export interface CompiledTowerDef<Id extends string = string> {
  readonly id: Id;
  readonly name: string;
  readonly faction: TowerFaction;
  readonly role: string;
  /** Tiers 1–3, each fully resolved (patches applied). Index 0 is tier 1. */
  readonly tiers: readonly [CompiledTier, CompiledTier, CompiledTier];
  /** Tier 4, each resolved on top of tier 3; null until the tower's specs are authored. */
  readonly specs: { readonly a: CompiledTier; readonly b: CompiledTier } | null;
  /** The ids of the links this tower is a partner in (`links/`), in registry order. */
  readonly links: readonly string[];
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
  /** Detection (TierDef.detect), or null for a tier that reveals nothing. */
  readonly detect: CompiledDetect | null;
  /** The Crane's economy (TierDef.economy), or null. */
  readonly economy: CompiledTowerEconomy | null;
}

/** DetectDef with the linger in ticks and the radius squared (0 / 0 for absent fields). */
export interface CompiledDetect {
  readonly radiusTiles: number;
  readonly radiusSq: number;
  readonly lingerTicks: number;
  readonly revealedDamagePct: number;
}

/** TowerEconomyDef resolved: absent fields are 0 (salvageSpeedMul 1). */
export interface CompiledTowerEconomy {
  readonly perWave: number;
  readonly perKill: number;
  readonly radiusTiles: number;
  readonly radiusSq: number;
  readonly salvageSpeedMul: number;
  readonly salvagePct: number;
  readonly interestPct: number;
  readonly interestCap: number;
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
  /** AttackDef.targetFilter (Magnet Crane), or null: any target. */
  readonly targetFilter: { readonly bodies: readonly Body[]; readonly armored: boolean } | null;
}
export type CompiledAttack = CompiledAttackCommon &
  (
    | { readonly kind: 'hitscan' }
    | {
        readonly kind: 'projectile';
        readonly projectile: SpriteId;
        readonly speedTilesPerTick: number;
        /** The burst on arrival (0: the target only). */
        readonly splashTiles: number;
        readonly splashSq: number;
        /** Steers to its target (Seeker Swarm; T407b). */
        readonly homing: boolean;
        /** Shots per volley (1 unless authored). */
        readonly volley: number;
      }
    | {
        readonly kind: 'lobbed';
        readonly projectile: SpriteId;
        readonly flightTicks: number;
        readonly splashTiles: number;
        readonly splashSq: number;
        readonly lead: boolean;
        /** Cluster Thumper's bomblets, or null. */
        readonly bomblets: CompiledBomblets | null;
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
    | {
        readonly kind: 'pulse';
        /** PulseBurstDef in ticks (Flash Freeze), or null. */
        readonly burst: {
          readonly everyTicks: number;
          readonly effects: readonly CompiledEffect[];
        } | null;
      }
    | {
        readonly kind: 'charge';
        readonly chargeTicks: number;
        readonly splashTiles: number;
        readonly splashSq: number;
        readonly splashPct: number;
      }
    | { readonly kind: 'line'; readonly lengthTiles: number }
  );

/** BombletsDef in ticks, with the squared radii precomputed. */
export interface CompiledBomblets {
  readonly count: number;
  readonly damage: number;
  readonly splashTiles: number;
  readonly splashSq: number;
  readonly scatterTiles: number;
  readonly scatterSq: number;
  readonly flightTicks: number;
  readonly projectile: SpriteId;
}

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

// ── Synergy links ────────────────────────────────────────────────────────────────────────────

export interface CompiledLinkDef<K extends IdSpace = LiveIds> {
  /** A LinkId for live content. */
  readonly id: string;
  readonly name: string;
  /** Its position in the registry, and its bit in `Tower.linkMask` (`1 << index`). */
  readonly index: number;
  readonly bit: number;
  readonly partners: readonly [CompiledLinkPartner<K>, CompiledLinkPartner<K>];
}
/** One partner's bonuses, summed per stat (towers.md § 4). Percentages are fractions. */
export interface CompiledLinkPartner<K extends IdSpace = LiveIds> {
  readonly tower: K['tower'];
  readonly flatDamage: number;
  readonly flatRate: number;
  readonly flatRange: number;
  readonly pctDamage: number;
  readonly pctRate: number;
  readonly pctRange: number;
  /** A conditional damage bonus (`vsStatus`): the statuses' mask (rules.ts STATUS_BITS; 0: none). */
  readonly vsStatusMask: number;
  readonly vsStatusPct: number;
  /** Jumps added to the partner's chain attack (Conductive; 0: none). */
  readonly chainJumps: number;
  /** Soaked its hits apply while linked, in ticks (Conductive's Sprinkler; 0: none). */
  readonly soakedTicks: number;
  /** Added to the partner's detection radius (Overwatch, Skywatch; 0: none). */
  readonly detectRadiusTiles: number;
  /** Credits per kill the partner makes (Reel It In; 0: none). */
  readonly killCredits: number;
}

// ── Enemies and abilities ────────────────────────────────────────────────────────────────────

export interface CompiledEnemyDef<Id extends string = string> {
  readonly id: Id;
  readonly name: string;
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
  /** How many young a carrier's burst sack releases (`EnemyDef.carrier`); 0 for non-carriers. */
  readonly carrierYoung: number;
  /** Enemy abilities (EnemyDef; sim/enemyAbilities/), in ticks; null when it has none. */
  readonly burrow: CompiledBurrow | null;
  readonly split: CompiledSplit | null;
  readonly huddle: CompiledHuddle | null;
  readonly boss: CompiledBoss | null;
  /** EnemyDef.pulse and EnemyDef.blink in ticks (T403, T404), or null. */
  readonly pulse: CompiledPulse | null;
  readonly blink: CompiledBlink | null;
  /**
   * Hushes under the hush rule (enemies.md § 5.4): derived, true for a non-boss Hollow unit that
   * doesn't gather (a Maw's one hush is a gather). Run by enemyAbilities/hush.ts (T402).
   */
  readonly hushes: boolean;
  /** Cloaked (the `cloaked` trait): untouchable unless Revealed (systems/detection.ts; T406). */
  readonly cloaked: boolean;
  /** A neutral unit (Gerald): targeted, never hurt, never leaks or pays (EnemyDef.neutral). */
  readonly neutral: boolean;
  readonly sprites: { readonly body: SpriteId; readonly icon: SpriteId };
}

export interface CompiledBurrow {
  readonly everyTicks: number;
  readonly durationTicks: number;
  readonly speedMul: number;
  readonly tellTicks: number;
}
/** `enemy` is an EnemyId the validator checked. */
export interface CompiledSplit {
  readonly enemy: string;
  readonly count: number;
}
export interface CompiledHuddle {
  readonly radiusTiles: number;
  readonly radiusSq: number;
  readonly regenPerTick: number;
}
export interface CompiledPulse {
  readonly everyTicks: number;
  readonly tellTicks: number;
  readonly radiusTiles: number;
  readonly radiusSq: number;
  readonly shield: number;
}
export interface CompiledBlink {
  readonly everyTicks: number;
  readonly tellTicks: number;
  readonly tiles: number;
}
export interface CompiledBoss {
  readonly phases: readonly CompiledBossPhase[];
  readonly ending: BossEnding;
  readonly endAtPct: number;
}
/** BossPhaseDef in ticks; absent parts are null. */
export interface CompiledBossPhase {
  readonly fromPct: number;
  readonly spawn: {
    readonly enemy: string;
    readonly count: number;
    readonly everyTicks: number;
  } | null;
  readonly burrow: {
    readonly times: number;
    readonly durationTicks: number;
    readonly surfaceSpawn: { readonly enemy: string; readonly count: number } | null;
  } | null;
  readonly hastePct: number;
  readonly huddle: CompiledHuddle | null;
  readonly pulse: CompiledPulse | null;
  readonly blink: CompiledBlink | null;
}

export interface CompiledAbilityDef<Id extends string = string> {
  readonly id: Id;
  readonly name: string;
  /** A cooldown in ticks; 0 for one counted in waves. */
  readonly cooldownTicks: number;
  /** A cooldown in waves (Clearance Sale, T304d); 0 for one counted in ticks. */
  readonly cooldownWaves: number;
  readonly effect: CompiledAbilityEffect;
  /** The companion whose slot-2 ability this is, or null (Technician only). */
  readonly companion: CompanionId | null;
  readonly sprites: { readonly icon: SpriteId };
}
export type CompiledAbilityEffect =
  | {
      readonly kind: 'strike';
      readonly type: DamageType;
      readonly damage: number;
      readonly radiusTiles: number;
      readonly radiusSq: number;
      readonly delayTicks: number;
    }
  | {
      readonly kind: 'segment';
      readonly type: DamageType;
      readonly damagePerSec: number;
      readonly slowPct: number;
      readonly durationTicks: number;
      /** Path tiles covered on each side of the clicked one: (lengthTiles − 1) / 2. */
      readonly reachTiles: number;
    }
  | {
      readonly kind: 'slowAll';
      readonly slowPct: number;
      readonly bossSlowPct: number;
      readonly durationTicks: number;
    }
  | { readonly kind: 'discount'; readonly pct: number; readonly charges: number }
  | {
      readonly kind: 'reveal';
      readonly radiusTiles: number;
      readonly radiusSq: number;
      readonly durationTicks: number;
    };

/** A compiled ally post (AllyPostDef): the marker resolved to its tile, the attack in ticks. */
export interface CompiledAllyPost {
  readonly kind: AllyKind;
  readonly post: MarkerId;
  readonly tile: GridPos;
  readonly attack: {
    readonly type: DamageType;
    readonly damage: number;
    readonly periodTicks: number;
    readonly rangeTiles: number;
    readonly rangeSq: number;
    readonly hitsGround: boolean;
    readonly hitsAir: boolean;
  };
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
  /** When that countdown begins (WaveDef.countdownAfter); null: as the wave before finishes spawning. */
  readonly countdownAfter: 'bossEnded' | null;
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
  | { readonly kind: 'holdFireWhile'; readonly tag: HoldFireWhileTarget }
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
  readonly altExpectations: Readonly<Record<string, AltBuildExpectation>>;
  readonly guards: Readonly<
    Record<
      string,
      { readonly policy: PolicyId; readonly expect: 'lose' | { readonly maxMarginPct: number } }
    >
  >;
  readonly marginBand: { readonly minPct: number; readonly maxPct: number } | null;
  readonly rebaseline: boolean;
  readonly flagVariants: Readonly<Partial<Record<ScriptFlagId, readonly FlagValue[]>>>;
  /** BuildsDef.runEndFlags (default none). */
  readonly runEndFlags: Readonly<Partial<Record<BooleanFlagId, RunEndFlagRuns>>>;
  /** Medals the par build must earn on every seed (default none). */
  readonly parMedals: readonly MedalKind[];
  /** R&D picks that must change a par result (BuildsDef.rndPickChanges; default none). */
  readonly rndPickChanges: readonly UpgradeId[];
  /** The map's no-counter lose-by override (BuildsDef.noCounterLoseByWave), or null. */
  readonly noCounterLoseByWave: number | null;
}

/** AssetDef with its marker resolved to a tile. */
export interface CompiledAsset {
  readonly name: string;
  readonly integrity: number;
  readonly marker: MarkerId;
  readonly tile: GridPos;
  readonly routes: readonly RouteId[];
}

/** An ObjectiveDef with its `onComplete` actions compiled (none: empty). */
export interface CompiledObjective<K extends IdSpace = LiveIds> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly condition: ConditionDef<K>;
  readonly intel: number;
  readonly onComplete: readonly CompiledScriptAction<K>[];
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
  /** Render-only terrace levels, row-major like `tiles`, or null on a flat map (MapDef.terraces). */
  readonly terraces: readonly number[] | null;
  readonly underWreckage: Readonly<Partial<Record<TileKey, TileChar>>>;
  readonly salvage: Readonly<Partial<Record<TileKey, number>>>;
  /** Paths, air lanes, and rift lanes by id (ids are unique across all three). */
  readonly routes: Readonly<Record<RouteId, CompiledRoute>>;
  /** `routes`' values in the map's route order, cached so hot paths don't allocate a list. */
  readonly routeList: readonly CompiledRoute[];
  readonly markers: Readonly<Record<MarkerId, GridPos>>;
  readonly startCredits: number;
  readonly coreIntegrity: number;
  readonly stardust: number;
  readonly briefing: string | null;
  /** Loadout towers that start locked: the keys of `towerUnlockWave`, in unlock order. */
  readonly lockedTowersAtStart: readonly K['tower'][];
  readonly threatIntel: readonly ThreatIntelId[];
  readonly requiredCounters: readonly CounterId[];
  readonly waves: readonly CompiledWave<K>[];
  /** Compiled `towerUnlockWave` events first, then the authored events, in order. */
  readonly events: readonly CompiledScriptedEvent<K>[];
  /** The Challenge medal, or null on a map without one (sim/medals.ts). */
  readonly medals: { readonly challenge: ChallengeMedalDef<K> } | null;
  readonly objectives: readonly CompiledObjective<K>[];
  readonly companion:
    | { readonly id: CompanionId; readonly state: 'present' | 'absent' }
    | { readonly pick: readonly CompanionId[] }
    | null;
  readonly lockedAbilities: readonly {
    readonly ability: K['ability'];
    readonly when: ConditionDef<K>;
  }[];
  /** Ally posts, spawned on the first tick (systems/allies.ts). */
  readonly allies: readonly CompiledAllyPost[];
  readonly revisitOf: string | null;
  /** MapDef.revisitAt, or null (T410a). */
  readonly revisitAt: GridPos | null;
  /** The Protect map's asset, its marker resolved (T305a), or null. */
  readonly asset: CompiledAsset | null;
  /** Clickable world objects by marker (MapDef.clickables; T409); empty for none. */
  readonly clickables: Readonly<Record<MarkerId, { readonly name: string }>>;
  readonly builds: CompiledBuilds<K>;
}
