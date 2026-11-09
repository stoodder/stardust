// Content definition types: the canonical home of Stardust's data shapes.
// Content is authored in seconds and tiles, with the unit in each field name; compile.ts turns it
// into tick-based CompiledContent (compiled.ts). Design rules for each field live in the design
// docs (towers.md, enemies.md, maps.md, core-loop.md); validate.ts checks what types can't, and
// rule values (caps, tables, limits) live in rules.ts.
//
// Id unions are derived from the explicit registries (`keyof typeof TOWERS`), so a typo'd id is a
// compile error. Types that refer to other kinds' ids take an id space `K` (default: the live
// registries), so test fixtures can use their own registries with the same type checking.
// Definitions never refer to their own kind's registry (a MapDef can't name a MapId), which is
// what keeps the type-level imports below free of cycles.
import type { ABILITIES } from './abilities/index.ts';
import type { BooleanFlagId, FLAGS, FlagValueOf } from './dialogue/flags.ts';
import type { ENEMIES } from './enemies/index.ts';
import type { LINKS } from './links/index.ts';
import type { MAPS } from './maps/index.ts';
import type { AuraKind } from './rules.ts';
import type { SpriteId as RegisteredSpriteId } from './sprites/index.ts';
import type { EnvPaletteId } from './sprites/types.ts';
import type { TOWERS } from './towers/index.ts';
import type { PROTOCOLS, UPGRADES } from './upgrades/index.ts';

export type { EnvPaletteId };

// ── Ids ──────────────────────────────────────────────────────────────────────────────────────

export type TowerId = Extract<keyof typeof TOWERS, string>;
export type EnemyId = Extract<keyof typeof ENEMIES, string>;
/** Commander abilities (Technician and companion), not enemy abilities. */
export type AbilityId = Extract<keyof typeof ABILITIES, string>;
export type MapId = Extract<keyof typeof MAPS, string>;

/** The ids one set of registries defines. Cross-kind references are typed through this. */
export interface IdSpace {
  readonly tower: string;
  readonly enemy: string;
  readonly ability: string;
  readonly map: string;
}
/** The live registries' id space. */
export interface LiveIds {
  readonly tower: TowerId;
  readonly enemy: EnemyId;
  readonly ability: AbilityId;
  readonly map: MapId;
}
/**
 * The id space of a set of entity registries (test fixtures use it). Map ids are passed
 * separately: maps are typed against the id space, so it can't be derived from them.
 */
export interface IdsOf<R extends EntityRegistries, MapIds extends string = string> {
  readonly tower: keyof R['towers'] & string;
  readonly enemy: keyof R['enemies'] & string;
  readonly ability: keyof R['abilities'] & string;
  readonly map: MapIds;
}
export interface EntityRegistries {
  readonly towers: object;
  readonly enemies: object;
  readonly abilities: object;
}

/** A sprite id content may name: a registered sprite (`sprites/index.ts`). */
export type SpriteId = RegisteredSpriteId;
/** Synergy links (design/towers.md § 6): the `links/` registry. */
export type LinkId = Extract<keyof typeof LINKS, string>;
/** Ranked shop and R&D upgrades (tune-ups, global upgrades, R&D Command): `upgrades/index.ts`. */
export type UpgradeId = Extract<keyof typeof UPGRADES, string>;
/** Field Protocols: `upgrades/index.ts`. */
export type ProtocolId = Extract<keyof typeof PROTOCOLS, string>;
/** Story flags: the `dialogue/flags.ts` registry (story-runtime.md § Flags). */
export type FlagId = Extract<keyof typeof FLAGS, string>;
/** Story flags that map scripts may read: `script: true` in the registry (story-runtime.md § Map scripts). */
export type ScriptFlagId = {
  [F in FlagId]: (typeof FLAGS)[F] extends { readonly script: true } ? F : never;
}[FlagId];
export type FlagValue = string | number | boolean;
export type CompanionId = 'bricks' | 'quill' | 'zibzab' | 'vesthara' | 'bramble';
/** Map-local names: markers, routes, timers, ally groups, wave groups. validate() checks them. */
export type MarkerId = string;
export type RouteId = string;
export type MedalId = string;

// ── Shared vocabulary ────────────────────────────────────────────────────────────────────────

/** A tile on the logical grid. Tile (c, r) covers [c, c+1) × [r, r+1); its center is (c+0.5, r+0.5). */
export type GridPos = readonly [col: number, row: number];
/** `"col,row"` */
export type TileKey = `${number},${number}`;
/** Tile legend (design/maps.md §3): path, pad, high ground, power node, wreckage, decor, spawn, core. */
export type TileChar = '#' | 'o' | '^' | '+' | 'x' | '.' | 'S' | 'C';
export type TargetPriority = 'first' | 'last' | 'strong' | 'close';
export type DamageType = 'kinetic' | 'explosive' | 'energy' | 'psionic';
export type TowerFaction = 'everglow' | 'vrell' | 'aelari' | 'skitterkin';
export type EnemyFaction = 'skitterkin' | 'aelari' | 'everglow' | 'hollow';
export type Body = 'organic' | 'crystalline' | 'mechanical' | 'void';
export type Layer = 'ground' | 'air';
/** Defense traits (design/enemies.md §3). */
export type Trait =
  | 'armored'
  | 'shielded'
  | 'cloaked'
  | 'fast'
  | 'flying'
  | 'burrowing'
  | 'splitting'
  | 'healer_aura'
  | 'shield_aura'
  | 'haste_aura'
  | 'blink'
  | 'phasing'
  | 'gathering'
  | 'jammer'
  | 'skittish'
  | 'huddle'
  /**
   * Comes in clusters (the Mote: 6–12 at a time; D101): counter category splash, tell `hollow`.
   * The trait says "splash answers this group", so the briefing shows it and the placement-aware
   * answers find a splash-category enemy on the map.
   */
  | 'clustered';
/**
 * A threat-intel entry (campaign.md § 4.8): every trait, plus `boss`, which is intel-only and not
 * a trait (D101; T330): a map lists it when a boss walks its waves. Its icon is the `boss` tell.
 */
export type ThreatIntelId = Trait | 'boss';
/** Counter categories (design/enemies.md §3.1). */
export type CounterId = 'armor' | 'shield' | 'detection' | 'air' | 'burrowed' | 'splash' | 'jam';
/** Art tell ids (art/art-direction.md §8). */
export type TellId =
  | 'armored'
  | 'shielded'
  | 'regen'
  | 'stealth'
  | 'flying'
  | 'burrower'
  | 'splitter'
  | 'healer'
  | 'shield_aura'
  | 'haste_aura'
  | 'fast'
  | 'blink'
  | 'phasing'
  | 'consumer'
  | 'disabler'
  | 'skittish'
  | 'huddle'
  | 'carrier'
  | 'boss'
  | 'heavy'
  | 'hollow';
/** Story wave tags. Allies and the spare-runners filter never pick the first three. */
export type WaveTag = 'quiet_wave' | 'youngling' | 'fleeing' | 'medal_exempt';
export type AllyKind =
  'swarmling' | 'leaper' | 'refugee' | 'bearer' | 'singer' | 'bricks' | 'militia' | 'ward';
export type TowerStat = 'damage' | 'rate' | 'range';

/** Every property optional, recursively. Arrays are replaced whole, never merged. */
export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [P in keyof T]?: DeepPartial<T[P]> }
    : T;

// ── Towers ───────────────────────────────────────────────────────────────────────────────────

export interface TowerDef<Id extends string = string> {
  readonly id: Id;
  /** The display name the HUD, loadout, and store show ("Rivet"; T119). */
  readonly name: string;
  readonly faction: TowerFaction;
  /** Display only. */
  readonly role: string;
  /** Tier 1 in full; tiers 2 and 3 patch the tier before them (compile resolves them). */
  readonly tiers: readonly [TierDef, TierPatch, TierPatch];
  /** Tier 4; both patch tier 3, and one R&D purchase unlocks both. Optional until T202. */
  readonly specs?: { readonly a: SpecDef; readonly b: SpecDef };
  // A tower's links live in `links/` (one home); compile lists them on CompiledTowerDef.links.
  readonly sprites: { readonly base: SpriteId; readonly head?: SpriteId; readonly icon: SpriteId };
  /** A light source under darkness (Prism Spire). */
  readonly lightRadiusTiles?: number;
}

export interface TierDef {
  /** Build cost (tier 1) or the upgrade's cost (later tiers), in credits. */
  readonly cost: number;
  readonly targets: { readonly ground: boolean; readonly air: boolean };
  /** null: the tower picks no target (support towers, and `pulse` attacks that hit everything in range). */
  readonly defaultPriority: TargetPriority | null;
  readonly attack?: AttackDef;
  /** Applied to every enemy an attack hits. */
  readonly effects?: readonly EffectDef[];
  /** Support auras on nearby towers. */
  readonly auras?: readonly AuraDef[];
  /**
   * Detection (design/enemies.md § 2.5; the Lookout Shack, Seer's Lantern): cloaked enemies within
   * the radius are Revealed. Run by sim/systems/detection.ts (T406).
   */
  readonly detect?: DetectDef;
  /** Economy effects (the Salvage Crane, design/towers.md § 7; T408). */
  readonly economy?: TowerEconomyDef;
}

/**
 * A detector's reach (design/towers.md § 7, Lookout Shack): enemies inside `radiusTiles` are
 * Revealed, and stay Revealed `lingerSec` after leaving it (Lookout T3: 2 s). Crow's Nest's
 * "revealed enemies take +10% damage" is `revealedDamagePct` (a Mark-type bonus that doesn't
 * stack with Mark).
 */
export interface DetectDef {
  readonly radiusTiles: number;
  readonly lingerSec?: number;
  readonly revealedDamagePct?: number;
}

/**
 * The Salvage Crane's economy (design/towers.md § 7; T408). Every field is optional; a tier
 * patches the one before.
 */
export interface TowerEconomyDef {
  /** Credits each time a wave resolves (T1 +10, T2 +18, T3 +28). */
  readonly perWave?: number;
  /** Credits per kill by any tower within `radiusTiles` (T1 +1, T3 +2). */
  readonly perKill?: number;
  readonly radiusTiles?: number;
  /** Wreckage within `radiusTiles` clears this much faster (2 = double speed). */
  readonly salvageSpeedMul?: number;
  /** Extra salvage from wreckage within `radiusTiles` (0.25 = +25%). */
  readonly salvagePct?: number;
  /** Haggler's Stall: interest on banked credits as each wave resolves, capped per wave. */
  readonly interestPct?: number;
  readonly interestCap?: number;
}
/**
 * A later tier: its own cost, plus changes to the tier before. Objects merge deeply; arrays and
 * values replace. An `attack` with a different `kind` replaces the attack and must be complete.
 */
export type TierPatch = { readonly cost: number } & DeepPartial<Omit<TierDef, 'cost'>>;
export type SpecDef = TierPatch & { readonly name: string };

interface AttackCommon {
  readonly type: DamageType;
  /** Per hit (per second for beams). */
  readonly damage: number;
  readonly ratePerSec: number;
  readonly rangeTiles: number;
  /** Exclusive: hits only at distance > min. */
  readonly minRangeTiles?: number;
  /** Ignores this much armor per hit (Rivet T3). */
  readonly armorPierce?: number;
  /** Ignores all armor (Railspike). */
  readonly ignoresArmor?: boolean;
  /** Time before the first shot after acquiring a target (Rivet Storm). */
  readonly spinUpSec?: number;
  /**
   * Picks only targets that match (Magnet Crane: Mechanical or armored ground enemies; T408): a
   * unit matches with one of `bodies` or, with `armored`, armor > 0. Absent: any target.
   */
  readonly targetFilter?: { readonly bodies?: readonly Body[]; readonly armored?: true };
}
export type AttackDef = AttackCommon &
  (
    | { readonly kind: 'hitscan' } // Rivet: damage lands the tick it fires
    | {
        // A shot that flies to its target at a fixed speed (Skyhook's flak, T304a)
        readonly kind: 'projectile';
        readonly projectile: SpriteId;
        readonly speedTilesPerSec: number;
        /** A burst on arrival: every enemy on the tier's layers within it (default 0: the target only). */
        readonly splashTiles?: number;
        /** It steers to its target each tick instead of flying straight (Seeker Swarm; T407b). */
        readonly homing?: boolean;
        /** Shots per volley, each at its own target where it can (Seeker Swarm: 4; default 1). */
        readonly volley?: number;
      }
    | {
        // Thumper: lands after a fixed flight time, aimed with lead targeting
        readonly kind: 'lobbed';
        readonly projectile: SpriteId;
        readonly flightSec: number;
        readonly splashTiles: number;
        readonly lead: boolean;
        /** Cluster Thumper: each shell also scatters bomblets where it lands. */
        readonly bomblets?: BombletsDef;
      }
    | { readonly kind: 'beam'; readonly tickSec: number } // not DoT: armor applies per tick
    | {
        readonly kind: 'chain';
        /** Jumps after the first hit: `jumps + 1` targets in all ("chains to 3" is 2). */
        readonly jumps: number;
        readonly jumpRangeTiles: number;
        /** Fraction lost per jump: 0.2 = −20%. */
        readonly falloffPct: number;
      }
    | { readonly kind: 'spawner'; readonly ally: AllyKind; readonly maxAlive: number }
    // Sprinkler: every period, hits every enemy within rangeTiles (no target, no priority)
    | {
        readonly kind: 'pulse';
        /** A second, slower pulse on the same radius (Flash Freeze's Stasis; T407a). */
        readonly burst?: PulseBurstDef;
      }
    | {
        // Capacitor Bank (T407b): charges `chargeSec` on a target, then discharges `damage` into
        // it plus `splashPct` of that to enemies within `splashTiles` of it.
        readonly kind: 'charge';
        readonly chargeSec: number;
        readonly splashTiles: number;
        readonly splashPct: number;
      }
    | {
        // Skewer (T408): the shot pierces every enemy in a `lengthTiles` line from the tower
        // through its target, `damage` each.
        readonly kind: 'line';
        readonly lengthTiles: number;
      }
  );
export type AttackKind = AttackDef['kind'];

/**
 * Bomblets a lobbed shell scatters on impact (Cluster Thumper, design/towers.md § 7): `count`
 * small shells, each flying `flightSec` from the impact point to a random point within
 * `scatterTiles` of it and landing as its own splash (`damage` of the shell's type, `splashTiles`),
 * on the layers and with the effects of the shell.
 */
export interface BombletsDef {
  readonly count: number;
  readonly damage: number;
  readonly splashTiles: number;
  readonly scatterTiles: number;
  readonly flightSec: number;
  readonly projectile: SpriteId;
}

/**
 * A pulse tower's burst (Flash Freeze, design/towers.md § 7: Stasis 1.0 s every 8 s): every
 * `everySec` it also applies `effects` to every enemy the pulse reaches, on its own timer. Like
 * the pulse, it waits until something is in range, so the first burst lands on the first enemy.
 * It deals no damage of its own.
 */
export interface PulseBurstDef {
  readonly everySec: number;
  readonly effects: readonly EffectDef[];
}

/** On-hit status effects (design/enemies.md §2.4). `pct` is a fraction: 25% → 0.25. */
export type EffectDef =
  | { readonly status: 'chilled'; readonly pct: number; readonly durationSec: number }
  | { readonly status: 'soaked'; readonly durationSec: number }
  | { readonly status: 'corroded'; readonly stacks: number; readonly maxStacks: number }
  | { readonly status: 'marked'; readonly pct: number; readonly durationSec: number }
  | { readonly status: 'pinned'; readonly durationSec: number }
  | { readonly status: 'stasis'; readonly durationSec: number }
  | { readonly status: 'unnerved'; readonly durationSec: number };
export type StatusId = EffectDef['status'];

/** A support aura. Same-kind auras don't stack; kinds and caps are rule data (rules.ts). */
export interface AuraDef {
  readonly kind: AuraKind;
  readonly radiusTiles: number;
  readonly stat: TowerStat;
  readonly pct: number;
}

// ── Synergy links (design/towers.md § 6) ─────────────────────────────────────────────────────

/**
 * A synergy link: two tower types that boost each other while they stand adjacent (edge or
 * corner). Each partner lists what it gets. Links are flat: they don't scale with tier.
 */
export interface LinkDef<K extends IdSpace = LiveIds, Id extends string = string> {
  readonly id: Id;
  /** Display name ("Crossfire"). */
  readonly name: string;
  /** Two different tower types, each with its bonuses while the link is active. */
  readonly partners: readonly [LinkPartnerDef<K>, LinkPartnerDef<K>];
}
export interface LinkPartnerDef<K extends IdSpace = LiveIds> {
  readonly tower: K['tower'];
  readonly bonuses: readonly LinkBonusDef[];
  /** Whole jumps added to the partner's chain attack (Conductive: Zapcoil +2; T304b). */
  readonly chainJumps?: number;
  /**
   * The partner's hits also apply Soaked for this long, at any tier (Conductive: the Sprinkler
   * Soaks from tier 1; T304b). Soaked is the only status a link grants so far.
   */
  readonly soakedSec?: number;
  /** Added to the partner's detection radius (Overwatch, Skywatch: Lookout +0.5; T406). */
  readonly detectRadiusTiles?: number;
  /** Credits per kill the partner makes (Reel It In: Harpoon kills +3; T408). */
  readonly killCredits?: number;
}
/**
 * A stat bonus under the stacking formula (towers.md § 4): `flat` adds to the stat, `pct` (a
 * fraction) adds to its percent total. With `vsStatus` it's a conditional damage bonus: `pct`
 * only, applied against an enemy with any of those statuses (Sitting Ducks: +20% vs Chilled).
 */
export interface LinkBonusDef {
  readonly stat: TowerStat;
  readonly flat?: number;
  readonly pct?: number;
  readonly vsStatus?: readonly StatusId[];
}

// ── Enemies ──────────────────────────────────────────────────────────────────────────────────

export interface EnemyDef<Id extends string = string> {
  readonly id: Id;
  /** The display name the wave preview and codex show ("Brood Hauler"; T119). */
  readonly name: string;
  readonly faction: EnemyFaction;
  readonly body: Body;
  readonly layer: Layer;
  readonly hp: number;
  readonly armor: number;
  readonly shield?: {
    readonly hp: number;
    readonly regenPerSec: number;
    readonly regenDelaySec: number;
  };
  readonly speedTilesPerSec: number;
  /** Core damage when it leaks. */
  readonly leak: number;
  /** Credits when killed. */
  readonly bounty: number;
  /** Default spawn interval inside a wave group; a group may override it. */
  readonly spawnIntervalSec: number;
  readonly traits: readonly Trait[];
  readonly tells: readonly TellId[];
  /** Finale rest value; default 1. */
  readonly restValue?: number;
  /**
   * A carrier (the Brood Hauler, design/enemies.md § 5.1): on death its sack bursts and `young`
   * tiny shapes scurry back along its route. They're non-hostile, untargetable, and cost no leak,
   * so they aren't sim entities: the sim emits `SackBurst` and the renderer draws them. Needs the
   * `carrier` tell.
   */
  readonly carrier?: { readonly young: number };
  // Enemy abilities (design/enemies.md § 3, § 5): each is an optional field, run by its module in
  // sim/enemyAbilities/ (T304c). Blink, phasing, gathering, and jamming arrive with Acts II–III.
  /** Burrowing (the `burrower` tell): digs in on a timer, untargetable. */
  readonly burrow?: BurrowDef;
  /** Splitting (the `splitter` tell): on death it releases `count` of `enemy` where it died. */
  readonly split?: SplitDef;
  /** Huddle (the `huddle` tell): allies within the radius move at its pace and regenerate. */
  readonly huddle?: HuddleDef;
  /** A boss (the `boss` tell; design/enemies.md § 6): its phases and how it ends. */
  readonly boss?: BossDef;
  /**
   * A shield pulse (enemies.md § 5.2: the Aegis Cantor's style; the Glass Witch's phase 1): every
   * `everySec`, after a `tellSec` tell, restores `shield` to itself and its faction's shielded
   * units within `radiusTiles` (enemyAbilities/pulse.ts; T403).
   */
  readonly pulse?: PulseDef;
  /** Blink (the `blink` tell): teleports forward along its route (enemyAbilities/blink.ts; T404). */
  readonly blink?: BlinkDef;
  /**
   * A neutral unit (Gerald, core-loop.md § 2.7): towers that aren't holding fire target it like an
   * enemy, but it takes no damage (hits plink off, `NeutralHit`), never leaks, pays nothing, and
   * never counts toward a wave's resolution or a medal (T304a).
   */
  readonly neutral?: true;
  readonly sprites: { readonly body: SpriteId; readonly icon: SpriteId };
}

/** Burrowing (Digger: every 6 s, 2 s underground at 1.5× speed, after a 0.8 s dirt-spray tell). */
export interface BurrowDef {
  readonly everySec: number;
  readonly durationSec: number;
  /** Speed multiplier while underground. */
  readonly speedMul: number;
  /** The dirt-spray tell before it digs in. */
  readonly tellSec: number;
}

/**
 * Splitting (Bunchling: 3 Nibblers). `enemy` is an EnemyId (validate() checks it: a definition
 * never names its own kind's registry). The children spawn at the parent's route distance.
 */
export interface SplitDef {
  readonly enemy: string;
  readonly count: number;
}

/** Huddle (Elder: radius 1.5, 4 HP/s): nearby allies match the leader's pace and regenerate. */
export interface HuddleDef {
  readonly radiusTiles: number;
  readonly regenPerSec: number;
}

/** A shield pulse (EnemyDef.pulse; D101: the Witch restores 120 within 2 tiles every 8 s, 1.5 s tell). */
export interface PulseDef {
  readonly everySec: number;
  readonly tellSec: number;
  readonly radiusTiles: number;
  /** Shield restored to each unit it reaches (never above that unit's shield max). */
  readonly shield: number;
}

/**
 * Blink (enemies.md § 3; the Blinkstrider: 2.5 tiles every 6 s, 0.8 s tell; the Witch: 2.5 tiles
 * every 7 s, 1.5 s tell). Stasis and Unnerved interrupt the tell (a converted Stasis on a boss
 * doesn't, D101).
 */
export interface BlinkDef {
  readonly everySec: number;
  readonly tellSec: number;
  readonly tiles: number;
}

/** How a boss fight ends without a death (design/enemies.md § 6.1). */
export type BossEnding = 'driveOff' | 'retreat' | 'pivot' | 'layToRest';

/**
 * A boss (design/enemies.md § 6): phases by HP share, each with its own behaviour, and an ending
 * at `endAtPct` (0 for `driveOff`: it is never killed). Every boss ability has a tell of at least
 * 1.5 s, and a phase change at most 2 s of invulnerability (rules.ts).
 */
export interface BossDef {
  /** In order; the first starts at 1 (full HP), each later one when HP falls to `fromPct`. */
  readonly phases: readonly BossPhaseDef[];
  readonly ending: BossEnding;
  /** The HP share at which the ending runs (0: at 0 HP, instead of dying). */
  readonly endAtPct: number;
}

/** One boss phase. Every field is optional; a phase runs whichever it lists. */
export interface BossPhaseDef {
  /** The HP share (1 = full) at which this phase begins. */
  readonly fromPct: number;
  /** Spawns `count` of `enemy` (an EnemyId) every `everySec` at its position (the sneeze). */
  readonly spawn?: { readonly enemy: string; readonly count: number; readonly everySec: number };
  /** Burrows `times` times for `durationSec` each, surfacing with `surfaceSpawn` if any. */
  readonly burrow?: {
    readonly times: number;
    readonly durationSec: number;
    readonly surfaceSpawn?: { readonly enemy: string; readonly count: number };
  };
  /** Haste on itself (a fraction, under HASTE_CAP). */
  readonly hastePct?: number;
  /** A constant huddle on nearby young (Chitterbloom's phase 3). */
  readonly huddle?: HuddleDef;
  /** A shield pulse while in this phase (the Glass Witch; T404 with T403's pulse module). */
  readonly pulse?: PulseDef;
  /** Blinks while in this phase (the Glass Witch's phase 2; T404). */
  readonly blink?: BlinkDef;
}

// ── Commander abilities ──────────────────────────────────────────────────────────────────────

export type AbilityDef<Id extends string = string> = AbilityCommon<Id> & AbilityCooldown;
interface AbilityCommon<Id extends string> {
  readonly id: Id;
  readonly name: string;
  readonly effect: AbilityEffect;
  /**
   * A companion's signature ability (slot 2, design/core-loop.md § 3.1): the companion it belongs
   * to. At most one ability per companion; absent for Technician-only abilities.
   */
  readonly companion?: CompanionId;
  readonly sprites: { readonly icon: SpriteId };
}
/**
 * A cooldown in sim seconds, or in waves (Clearance Sale's "once per 4 waves": ready again when
 * that many more waves have started; T304d). Exactly one.
 */
export type AbilityCooldown =
  | { readonly cooldownSec: number; readonly cooldownWaves?: never }
  | { readonly cooldownWaves: number; readonly cooldownSec?: never };
/** Other effect kinds (Stillness, Underfoot, …) arrive with their tasks. */
export type AbilityEffect =
  | {
      // Orbital Strike: a targeted area hit after a visible reticle
      readonly kind: 'strike';
      readonly type: DamageType;
      readonly damage: number;
      readonly radiusTiles: number;
      readonly delaySec: number;
    }
  | {
      /**
       * Suppressing Fire: a targeted stretch of ground path, `lengthTiles` long (odd), centered
       * on the clicked path tile along each route through it (D031: the tile ±1). For
       * `durationSec`, enemies on it are slowed (`slowPct`, as Chilled) and take `damagePerSec`
       * in beam ticks (enemies.md § 2.3: armor per second).
       */
      readonly kind: 'segment';
      readonly type: DamageType;
      readonly damagePerSec: number;
      readonly slowPct: number;
      readonly durationSec: number;
      readonly lengthTiles: number;
    }
  | {
      /**
       * Time Dilation: no target; every enemy on the map is slowed `slowPct` (bosses
       * `bossSlowPct`) for `durationSec` (T304d).
       */
      readonly kind: 'slowAll';
      readonly slowPct: number;
      readonly bossSlowPct: number;
      readonly durationSec: number;
    }
  | {
      /**
       * Clearance Sale: no target; the next `charges` builds or upgrades this map cost `pct` less.
       * Counted per purchase, never per second, so pausing can't exploit it (T304d).
       */
      readonly kind: 'discount';
      readonly pct: number;
      readonly charges: number;
    }
  | {
      /**
       * Scanner Sweep (T406): a targeted circle; cloaked enemies inside it are Revealed for
       * `durationSec` (design/core-loop.md § 3.2: 4 tiles, 10 s).
       */
      readonly kind: 'reveal';
      readonly radiusTiles: number;
      readonly durationSec: number;
    };

/**
 * A scripted ally at a fixed post beside the path (design/maps.md § 5.4: Bricks in person,
 * colonist militia). It is never hurt (vulnerability `never`; Bricks's A3M3 health timeline is
 * M3), never targets `quiet_wave`, `youngling`, or `fleeing` units, and fires at the nearest
 * enemy in range. Its numbers are map data.
 */
export interface AllyPostDef {
  readonly kind: 'bricks' | 'militia';
  /** The decor marker its post stands on (`markers`). */
  readonly post: MarkerId;
  /** A hitscan attack, like a Rivet's. */
  readonly attack: {
    readonly type: DamageType;
    readonly damage: number;
    readonly ratePerSec: number;
    readonly rangeTiles: number;
    readonly targets: { readonly ground: boolean; readonly air: boolean };
  };
}

// ── Maps ─────────────────────────────────────────────────────────────────────────────────────
// A map is four files (conventions.md § Add a map): map.ts (MapLayoutDef), waves.ts (WaveDef[]),
// builds.ts (BuildsDef), and index.ts composing them into one MapDef.

export type Act = 1 | 2 | 3 | 'finale' | 'challenge' | 'endless';
export type ObjectiveKind = 'defend' | 'escort' | 'holdout' | 'protect' | 'choir';
export type MeterLabel = 'integrity' | 'evacuated' | 'sheltered' | 'voices';

export interface MapLayoutDef<K extends IdSpace = LiveIds, Id extends string = string> {
  readonly id: Id;
  readonly act: Act;
  readonly env: EnvPaletteId;
  /** A script may pivot it (setObjective). */
  readonly objective: ObjectiveKind;
  readonly meterLabel?: MeterLabel;
  readonly maxLost?: number;
  readonly minVoices?: number;
  readonly evacuatedFloor?: number;
  readonly size: { readonly cols: number; readonly rows: number };
  /** One string per row, one TileChar per tile. Wrap in `// prettier-ignore`. */
  readonly tiles: readonly string[];
  /**
   * Render-only terrace levels: one string per row, one digit '0'–'3' per tile (higher digits are
   * higher terraces), shaped like `tiles`. The renderer draws a cliff face where a tile's back
   * neighbour is higher (art/tech-spec.md § Depth sorting); the sim never reads it, so gameplay
   * stays flat (design/maps.md § 3). Wrap in `// prettier-ignore`.
   */
  readonly terraces?: readonly string[];
  /** What each wreckage tile becomes when cleared, and what clearing it pays. */
  readonly underWreckage?: Readonly<Partial<Record<TileKey, TileChar>>>;
  readonly salvage?: Readonly<Partial<Record<TileKey, number>>>;
  /** Ground paths: ordered tiles, spawn to core (or a safe exit). */
  readonly paths: readonly { readonly id: RouteId; readonly tiles: readonly GridPos[] }[];
  /** Flyer polylines through the given tile centers; they may cross any tile. */
  readonly airLanes?: readonly { readonly id: RouteId; readonly points: readonly GridPos[] }[];
  readonly riftLanes?: readonly {
    readonly id: RouteId;
    readonly tiles: readonly GridPos[];
    readonly opensAtWave: number;
  }[];
  /** Named decor tiles for scripts: the Peeker rock, exits, crash sites. */
  readonly markers?: Readonly<Record<MarkerId, GridPos>>;
  readonly startCredits: number;
  /** Default 20. */
  readonly coreIntegrity?: number;
  /** First-clear Stardust reward (A1M1 pays 0). */
  readonly stardust: number;
  /** M1 only: the static briefing shown before story/ exists. */
  readonly briefing?: string;
  /** A loadout tower held back until that wave's countdown starts (compiles to an unlock event). */
  readonly towerUnlockWave?: Readonly<Partial<Record<K['tower'], number>>>;
  /**
   * Every trait in the waves, plus `boss` when a boss walks them; shown as briefing icons. A
   * `fleeing` Skitterkin group brings `skittish` (D101: Skittish is the fleeing modifier).
   */
  readonly threatIntel: readonly ThreatIntelId[];
  /** At most 3; each backed by a noCounterBuild that must lose. */
  readonly requiredCounters: readonly CounterId[];
  /**
   * The map's Challenge medal (Victory and Perfect Core are every map's; design/progression.md
   * § 3). Required on campaign maps (validateMedals.ts).
   */
  readonly medals?: { readonly challenge: ChallengeMedalDef<K> };
  /** Optional objectives (Objective Intel, design/progression.md § 3; T304f). */
  readonly objectives?: readonly ObjectiveDef<K>[];
  /**
   * Slot 2 (design/core-loop.md § 3.1): the companion and its state, a pick list (the finale; the
   * first is the default), or null (the slot is hidden). Each companion named needs an ability
   * with that `companion` in the content.
   */
  readonly companion:
    | { readonly id: CompanionId; readonly state: 'present' | 'absent' }
    | { readonly pick: readonly CompanionId[] }
    | null;
  /** Unequippable on this map when `when` holds (A3M5 under quill_choice = rewrite). */
  readonly lockedAbilities?: readonly {
    readonly ability: K['ability'];
    readonly when: ConditionDef<K>;
  }[];
  /** A MapId (validate() checks it): a MapDef can't name its own registry's ids. */
  readonly revisitOf?: string;
  /**
   * A revisit (A2M3 of A1M2; design/maps.md § 7): where the original's tile (0, 0) sits on this
   * map's grid. The original's layout is composed by reference at compile (T410a); this map's own
   * `tiles` hold the added band. createSim refuses `revisitOf` until T410a (`map.revisit`).
   */
  readonly revisitAt?: GridPos;
  /**
   * Protect the asset (design/maps.md § 5.2; A2M2's extraction rigs; D101): the second meter.
   * Required on a `protect` map and only there. createSim refuses it until T305a (`map.protect`).
   */
  readonly asset?: AssetDef;
  /**
   * Clickable world objects (A2M3's Peeker holding Pebble): markers a script can make clickable
   * (`setClickable`), each with the name the cursor's tooltip and the screen reader give it. The
   * `interact` command and `interacted` trigger name them. createSim refuses them until T409
   * (`map.clickable`).
   */
  readonly clickables?: Readonly<Record<MarkerId, { readonly name: string }>>;
  /** Map scripts (story-runtime.md § Map scripts). */
  readonly events?: readonly ScriptedEvent<K>[];
  /**
   * Scripted allies on the map from the start (design/maps.md § 5.4). M2: posts only (Bricks);
   * route allies, ally groups for `spawnAllies`, and health timelines are M3.
   */
  readonly allies?: readonly AllyPostDef[];
  // Not yet: song (finale), dressing and presentation (M3).
}

/**
 * The asset on a Protect map (D101): one meter of `integrity` (A2M2: 10, drawn as two rigs), on
 * the decor tile `marker`. A unit that leaks along one of `routes` (the branch to the asset) costs
 * the asset its leak value instead of the core; a boss reaching it drains it (defeat). The map is
 * lost when either meter reaches 0, and the par margin is min(core %, asset %) (T305a). An asset
 * route ends beside the asset, not on the core: a path's last tile is a path tile orthogonally
 * next to `marker`, an air lane's last point is `marker` itself (compileMap.ts).
 */
export interface AssetDef {
  /** The meter's label on the HUD and Results ("Rigs"): short, a plural noun or a name. */
  readonly name: string;
  readonly integrity: number;
  readonly marker: MarkerId;
  readonly routes: readonly RouteId[];
}

export interface WaveDef<K extends IdSpace = LiveIds> {
  /** The countdown before this wave; default by act (compile.ts). Wave 1 has none: the player starts it. */
  readonly countdownSec?: number;
  /**
   * When that countdown begins. Default: as the wave before finishes spawning. `'bossEnded'`: once
   * the wave before has finished spawning *and* every boss of the earlier waves has ended its
   * fight (BossEnded, or left the map any other way), so the wave walks in `countdownSec` after
   * the boss is driven off (A1M5's Quiet Wave; design/core-loop.md § 2.1). Needs a boss in an
   * earlier wave.
   */
  readonly countdownAfter?: 'bossEnded';
  /** The teach wave for a new trait: exempt from the soft-trait cap. */
  readonly teach?: boolean;
  readonly groups: readonly WaveGroup<K>[];
}
export interface WaveGroup<K extends IdSpace = LiveIds> {
  readonly enemy: K['enemy'];
  readonly count: number;
  /** Default: the enemy's `spawnIntervalSec`. */
  readonly intervalSec?: number;
  /** From the wave's start. Default 0. */
  readonly delaySec?: number;
  /** A path, air-lane, or rift-lane id. Its first tile is the spawn. */
  readonly route: RouteId;
  /** fleeing: leak 0, medal-exempt (design/enemies.md §5.4). */
  readonly tags?: readonly WaveTag[];
  /** A teach group inside a mixed wave: only its threat is exempt. */
  readonly teach?: boolean;
}

// ── Builds (the balance harness's inputs; conventions.md § Balance sims) ──────────────────────

/** What a Standard player owns on this map (design/progression.md §10). */
export interface ProfileDef<K extends IdSpace = LiveIds> {
  readonly towers: readonly K['tower'][];
  /** Towers whose tier-4 pair is unlocked. */
  readonly specs: readonly K['tower'][];
  /** Owned shop and R&D ranks. */
  readonly shop: Readonly<Partial<Record<UpgradeId, number>>>;
  readonly protocols: readonly ProtocolId[];
  readonly technicianAbility: K['ability'] | null;
}

/** One scripted step. Towers are addressed by tile. `wave: 1` is the pre-game build phase. */
export type BuildStep<K extends IdSpace = LiveIds> = { readonly wave: number } & (
  | { readonly build: K['tower']; readonly tile: GridPos }
  | { readonly upgrade: GridPos }
  | { readonly specialize: GridPos; readonly spec: 'a' | 'b' }
  | { readonly sell: GridPos }
  | { readonly targeting: GridPos; readonly mode: TargetPriority }
  | { readonly holdFire: GridPos | 'all'; readonly on: boolean }
  | { readonly spareRunners: GridPos | 'all'; readonly on: boolean }
  | {
      readonly ability: 1 | 2;
      readonly target?: GridPos;
      readonly when?: 'waveStart' | { readonly afterSec: number };
    }
  | { readonly clear: GridPos }
  | { readonly callWave: true }
  | { readonly interact: MarkerId }
  | { readonly scriptInput: string }
  // Macro: holdFire 'all' on when the first unit with the tag spawns, off when the last is gone;
  // 'neutral': on while a neutral unit (Gerald) is on the field, each pass (T313).
  | { readonly holdFireWhile: HoldFireWhileTarget }
);

/** What a `holdFireWhile` macro watches: a wave tag, or `'neutral'` units (Gerald; D072). */
export type HoldFireWhileTarget = WaveTag | 'neutral';

export interface ScriptedBuild<K extends IdSpace = LiveIds> {
  /** At most 4, all from the profile. */
  readonly loadout: readonly K['tower'][];
  /**
   * Pick-list maps only: who walks with this build (default: the list's first). A map with one
   * companion always uses it, so its builds leave this out.
   */
  readonly companion?: CompanionId;
  /** Default: the profile's. */
  readonly technicianAbility?: K['ability'];
  /** Call each wave the moment its countdown starts. */
  readonly callEarly?: boolean;
  readonly steps: readonly BuildStep<K>[];
}

export type PolicyId = 'none' | 'spamCheapest' | 'alwaysCallEarly' | 'spareFleeing';

/**
 * A run a run-end flag check names (BuildsDef.runEndFlags): par; the spareFleeing policy (par with
 * the Spare runners filter on every tower); par with a `holdFireWhile: <tag>` macro armed before
 * W1 (Hold Fire on all while that tag's units are on the field, wave by wave); or an alt build.
 */
export type FlagRunLabel = 'par' | 'spareFleeing' | `holdFireWhile:${WaveTag}` | `alt:${string}`;

/**
 * Which runs must set a run-end flag and which must not (BuildsDef.runEndFlags; T412). A run in
 * `setBy` must win, and the flag's run-end rule (content/dialogue/flags.ts FLAG_RULES) must hold
 * over its stats; for a run in `notSetBy` the rule must not hold.
 */
export interface RunEndFlagRuns {
  readonly setBy: readonly FlagRunLabel[];
  readonly notSetBy: readonly FlagRunLabel[];
}

/** What the harness expects of one alt build beyond the forgiving floor (conventions.md § Balance sims). */
export interface AltBuildExpectation {
  /** It wins at a lower margin than par on the same seed: par's choices earn their slots. */
  readonly belowPar?: true;
  /** It wins with at least this margin (%), stricter than the forgiving floor. */
  readonly minMarginPct?: number;
  /**
   * An under-built player's build rather than a sensible alternative (D028), so it's exempt from
   * the forgiving floor: 'lose' must lose, 'either' may win or lose. Like every alt build, it
   * must still lose gradually (the harness's `gradual` check). Not combined with the two above.
   */
  readonly outcome?: 'lose' | 'either';
}

export interface BuildsDef<K extends IdSpace = LiveIds> {
  readonly referenceProfile: ProfileDef<K>;
  readonly parBuild: ScriptedBuild<K>;
  /** Keys are exactly the map's requiredCounters. */
  readonly noCounterBuilds: Readonly<Partial<Record<CounterId, ScriptedBuild<K>>>>;
  /** At least 2 from A1M4. */
  readonly altBuilds?: Readonly<Record<string, ScriptedBuild<K>>>;
  /** Extra expectations for named alt builds; keys are altBuilds names. */
  readonly altExpectations?: Readonly<Record<string, AltBuildExpectation>>;
  readonly guards?: Readonly<
    Record<
      string,
      { readonly policy: PolicyId; readonly expect: 'lose' | { readonly maxMarginPct: number } }
    >
  >;
  /** Overrides the act's par band; say why in a comment. */
  readonly marginBand?: { readonly minPct: number; readonly maxPct: number };
  /** The first map after a boss restarts the monotonic-difficulty chain. */
  readonly rebaseline?: boolean;
  /**
   * The run-end flags this map sets (FLAG_RULES whose `onMapEnd` is this map: A1M5's
   * `spared_quiet_wave`, A2M3's `held_fire_second_look`), with the runs that must set each and
   * the runs that must not (the harness's `flags` check). Every such rule of a campaign map is
   * listed (validateBuilds).
   */
  readonly runEndFlags?: { readonly [F in BooleanFlagId]?: RunEndFlagRuns };
  /** Story-flag values the harness runs par under, one run each. Per-value build overrides arrive with A3M5. */
  readonly flagVariants?: { readonly [F in ScriptFlagId]?: readonly FlagValueOf<F>[] };
  /** Medals the par build must earn on every seed (the harness's `medals` check; default none). */
  readonly parMedals?: readonly MedalKind[];
  /**
   * R&D picks that must change a par result here (D060, T228): par with the pick bought must end
   * with a different outcome, margin, or medal than par without it on some seed (the harness's
   * `rnd` check). Each must be a pick the map allows (an R&D Command item for an ability par
   * equips, stocked by this map, not already in the reference profile).
   */
  readonly rndPickChanges?: readonly UpgradeId[];
  /**
   * Overrides the wave each no-counter build must lose by (default ⌊⅔ × waves⌋, "before the
   * final third"; design/maps.md § 6.1), up to waves − 1 (never the final wave). Say why in a
   * one-line comment.
   */
  readonly noCounterLoseByWave?: number;
  /**
   * The map that introduces a required-counter category may set `noCounterLoseByWave` as late as
   * its final wave (the validator checks it introduces one). Say why in a one-line comment.
   */
  readonly teachMap?: boolean;
}

export interface MapDef<K extends IdSpace = LiveIds, Id extends string = string>
  extends MapLayoutDef<K, Id>, BuildsDef<K> {
  readonly waves: readonly WaveDef<K>[];
}

// ── Conditions and map scripts (story-runtime.md § Map scripts) ───────────────────────────────

/**
 * Run stats a condition can read: run counters, so they only ever grow during a run. M3's three
 * (T300a) are counted by their tasks: `neutralHits` (hits on a neutral unit: Return to Sender,
 * T304a), `wreckageCleared` (Asset Recovery, T304b), and `lateSells` (sells after the tower's build
 * phase that aren't a misclick-grace refund: Clean Audit, T304f).
 */
export type RunStat =
  | 'integrityLost'
  | 'towersBuilt'
  | 'creditsSpent'
  | 'abilityUses'
  | 'neutralHits'
  | 'wreckageCleared'
  | 'lateSells'
  /** Blinks a boss completed this run (Glass Half Empty: retreat before 3; counted by T404). */
  | 'bossBlinks';

/**
 * Medal, objective, and script `when` conditions: one grammar, evaluated by the sim over run state
 * (sim/conditions.ts; story-runtime.md § Conditions). State atoms (`towers`, `linkActive`,
 * `tagRatio`) are judged when the condition is evaluated (a medal's at the moment of victory);
 * run atoms (`stat`, `passedMarker`) accumulate over the whole run; `flag` is fixed for the run.
 */
export type ConditionDef<K extends IdSpace = LiveIds> =
  | { readonly stat: RunStat; readonly gte?: number; readonly lte?: number }
  | {
      /** Live towers of that tower (or faction; both optional, all towers if neither). */
      readonly towers: { readonly tower?: K['tower']; readonly faction?: TowerFaction };
      readonly gte?: number;
      readonly lte?: number;
    }
  | { readonly linkActive: LinkId }
  | {
      readonly tagRatio: {
        readonly tag: WaveTag;
        readonly of: 'leaked' | 'killed';
        readonly gte: number;
      };
    }
  | {
      /**
       * True once a unit of `enemy` (any enemy if omitted) has gone past `marker` this run: its
       * route distance passed the route point closest to the marker. Medal-exempt units never
       * count (design/core-loop.md § 2.7).
       */
      readonly passedMarker: { readonly marker: MarkerId; readonly enemy?: K['enemy'] };
    }
  | { readonly flag: ScriptFlagId; readonly eq: FlagValue }
  | {
      /**
       * Leaks this run by units of that faction (or enemy), medal-exempt units never counted
       * (`stats.leaksByFaction`, `stats.leaksByEnemy`): Hiccup Contained is `{ leaks: { faction:
       * 'hollow' }, lte: 0 }` (a Heavy unit is Hollow). A run atom, like `stat`.
       */
      readonly leaks: { readonly faction?: EnemyFaction; readonly enemy?: K['enemy'] };
      readonly gte?: number;
      readonly lte?: number;
    }
  /** The salvage drone has cleared the wreckage tile under that marker this run (a run atom). */
  | { readonly wreckageCleared: MarkerId }
  /** That optional objective of the map is done (settled `done`; failed or open is false). */
  | { readonly objectiveDone: string }
  | { readonly all: readonly ConditionDef<K>[] }
  | { readonly any: readonly ConditionDef<K>[] }
  | { readonly not: ConditionDef<K> };

/** The three medals every campaign map has (design/progression.md § 3). */
export type MedalKind = 'victory' | 'perfectCore' | 'challenge';

/**
 * An optional objective (Objective Intel, design/progression.md § 3; maps.md § 5.3): a condition in
 * the medal grammar, the Intel it pays on a win, and script actions to run when it completes.
 */
export interface ObjectiveDef<K extends IdSpace = LiveIds> {
  /** Unique on the map (snake_case); the save and the `objectiveCompleted` trigger name it. */
  readonly id: string;
  /** As the briefing, the HUD's tracker, and Results show it ("Clean Audit"). */
  readonly name: string;
  /** One line saying what completes it ("Sell no turret after its build phase."). */
  readonly description: string;
  readonly condition: ConditionDef<K>;
  readonly intel: number;
  readonly onComplete?: readonly ScriptAction<K>[];
}

/** A map's Challenge medal: its save id, what the briefing shows, and its condition. */
export interface ChallengeMedalDef<K extends IdSpace = LiveIds> {
  /** The save id (snake_case; never `victory`, `perfect_core`, or `challenge`). */
  readonly id: MedalId;
  /** The medal's name, as the briefing and results show it ("Aim for the Sack!"). */
  readonly name: string;
  /** One line saying what earns it ("No Brood Hauler gets past the pump station."). */
  readonly description: string;
  readonly condition: ConditionDef<K>;
}

export interface ScriptedEvent<K extends IdSpace = LiveIds> {
  readonly id: string;
  readonly on: ScriptTrigger<K>;
  readonly when?: ConditionDef<K>;
  readonly actions: readonly ScriptAction<K>[];
  /** Default true: the event fires at most once per run. */
  readonly once?: boolean;
}

export type WavePhase = 'countdown' | 'start' | 'cleared';

export type ScriptTrigger<K extends IdSpace = LiveIds> =
  // 'countdown': that wave's build-phase countdown begins (W1's is the pre-game build phase)
  | { readonly wave: number; readonly phase: WavePhase | { readonly afterSec: number } }
  | { readonly bossHpPct: number; readonly boss?: K['enemy'] } // HP share (0.55), crossing down
  | { readonly bossPhase: number }
  | { readonly refugeesRemaining: number }
  | { readonly restProgressPct: number }
  | { readonly objectiveCompleted: string }
  | { readonly interacted: MarkerId } // by click or by fallback
  | { readonly wreckageCleared: MarkerId } // the drone cleared the wreckage under that marker
  | { readonly forcedInputResolved: string }
  | { readonly tick: number };

export type ScriptAction<K extends IdSpace = LiveIds> =
  | { readonly cue: string } // story binds it to a scene or bark
  | { readonly unlockTowerClass: K['tower'] } // what towerUnlockWave compiles to
  | {
      readonly revokeTowerClass: {
        readonly select: 'mostInvested';
        readonly faction?: TowerFaction;
      };
      readonly refundPct: 100;
    }
  | { readonly restoreTowerClass: 'lastRevoked' }
  | { readonly revokeAbility: K['ability'] }
  | { readonly setObjective: ObjectiveKind; readonly meterLabel?: MeterLabel }
  | { readonly bossEnd: 'driveOff' | 'retreat' | 'pivot' }
  | { readonly standDown: EnemyFaction } // remove that faction's hostiles, no leak
  | { readonly spawnAllies: string }
  | { readonly spawnWave: string }
  | {
      readonly setClickable: {
        readonly marker: MarkerId;
        readonly on: boolean;
        readonly fallback?: ScriptTrigger<K>;
      };
    }
  | { readonly forceInput: { readonly id: string } }
  | { readonly setModifier: 'quillLockout' | 'previewHidden'; readonly on: boolean }
  | { readonly startTimer: string }
  | { readonly setTimerRate: { readonly timer: string; readonly pct: number } }
  | { readonly setPhase: number }
  | { readonly setLighting: string }
  | { readonly checkpoint: true }
  | { readonly grantCredits: number }
  | { readonly openTile: MarkerId; readonly to: TileChar } // a predefined decor marker
  | { readonly endMap: 'won' | 'completed' };

// ── The whole content set ────────────────────────────────────────────────────────────────────

/** Every registry, as registry.ts exports it (`RAW_CONTENT`) and compileContent() takes it. */
export interface RawContent<K extends IdSpace = LiveIds> {
  readonly towers: Readonly<Record<K['tower'], TowerDef<K['tower']>>>;
  readonly enemies: Readonly<Record<K['enemy'], EnemyDef<K['enemy']>>>;
  readonly abilities: Readonly<Record<K['ability'], AbilityDef<K['ability']>>>;
  readonly maps: Readonly<Record<K['map'], MapDef<K, K['map']>>>;
  /** Synergy links by id; registry order is each link's bit in `Tower.linkMask`. Default none. */
  readonly links?: Readonly<Record<string, LinkDef<K>>>;
  /** Campaign map order (mirrors story/campaign.md). */
  readonly campaign: readonly K['map'][];
}
