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
import type { CHALLENGE_MAPS } from './maps/challenge.ts';
import type { ENDLESS_MAPS } from './maps/end_m01/index.ts'; // T861
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
export type MapId = Extract<keyof typeof MAPS | LazyMapKey, string>;
/**
 * The maps a lazy act chunk registers (content/registry.ts `registerActMaps`; architecture.md § 5,
 * *Lazy chunks*): absent from `RAW_CONTENT.maps` until their chunk loads. The keys of every lazy
 * registry (`keyof` their intersection: an empty one adds no `never`), each imported as a type
 * only so nothing of theirs reaches the initial JS.
 */
type LazyMapKey = keyof (typeof CHALLENGE_MAPS & typeof ENDLESS_MAPS);

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

/** A trait the soft-trait cap passes over on one map, and why (MapDef `softExempt`). */
export interface SoftExemptDef {
  readonly trait: Trait;
  /** Why the map may carry this trait past the cap (never empty). */
  readonly reason: string;
}
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
/**
 * Friendly units (design/maps.md § 5.4). A Scuttle Den sends `swarmling`s, or `champion`s with
 * Brave Hearts (towers.md § 7; T600a); `leaper`s are the Sproing Pad's (M7).
 */
export type AllyKind =
  | 'swarmling'
  | 'champion'
  | 'leaper'
  | 'refugee'
  | 'bearer'
  | 'singer'
  /** Old Thrum beside Pebble in the finale's choir when spared (T804): a singer never hushed. */
  | 'thrum'
  /** Thrum's echo in the finale (M8; T800a seam, T807 runs it): untargetable, laid to rest in gold. */
  | 'echo'
  | 'bricks'
  | 'militia'
  | 'ward';
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
  /** A light source at Sundown while its beam is active, in tiles (Prism Spire: 2.0; T505). */
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
  /**
   * Marks every enemy within `radiusTiles` at `pct` (Seer's Lantern [All-Seeing], design/towers.md
   * § 7: radius 3.5, +15%), a Mark like any other (highest only). Run by T508.
   */
  readonly markArea?: MarkAreaDef;
  /**
   * The Hum Choir's jam rule (towers.md § 7; T600a seam, T607): Jammed durations on the towers
   * its aura covers are multiplied by this (T1 0.5, T3 0.25, Rally Chorus 0: immune). Inert data
   * until M7's jammers (D141).
   */
  readonly jamMul?: number;
  /**
   * Lullaby (the Hum Choir's spec A; T607): enemies within `radiusTiles` are Lulled (enemies.md
   * § 2.4: ability cooldowns run ×1.5 longer, ×1.25 on a boss) while they stay inside.
   */
  readonly lull?: { readonly radiusTiles: number };
  /** A control field (the Stasis Bloom, towers.md § 7; T608): chill inside, Stasis pulses. */
  readonly field?: FieldDef;
  /**
   * A puddle each hit leaves where it lands (the Gloop Spitter [Big Glorp], towers.md § 7; T700a
   * seam, T705 runs it): a zone of `radiusTiles` for `durationSec`, Chilling every ground enemy
   * inside `chillPct` and dealing `damagePerSec` of `type` as a DoT that bypasses armor.
   */
  readonly puddle?: PuddleDef;
}

/** Big Glorp's puddle (TierDef.puddle; T705): 3 s, Chilled 25%, 10/s Kinetic acid. */
export interface PuddleDef {
  readonly durationSec: number;
  readonly radiusTiles: number;
  readonly chillPct: number;
  readonly damagePerSec: number;
  readonly type: DamageType;
}

/**
 * The Stasis Bloom's field (TierDef.field; T608): every enemy the tier's layers reach within
 * `radiusTiles` is Chilled `chillPct` while inside, and every `pulseEverySec` each takes Stasis
 * for `stasisSec` (the Stasis rule: it interrupts abilities). Gravity Well (spec A) also pulls
 * each pulsed enemy back `pullBackTiles` along its route, at most once every `pullBackCooldownSec`
 * per enemy (bosses immune). T1: radius 2.0, 30%, every 10 s, 1.5 s.
 */
export interface FieldDef {
  readonly radiusTiles: number;
  readonly chillPct: number;
  readonly pulseEverySec: number;
  readonly stasisSec: number;
  readonly pullBackTiles?: number;
  readonly pullBackCooldownSec?: number;
}

/** An area Mark (TierDef.markArea): every enemy the tower's layers reach within the radius. */
export interface MarkAreaDef {
  readonly radiusTiles: number;
  readonly pct: number;
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
    | {
        // Rivet: damage lands the tick it fires
        readonly kind: 'hitscan';
        /**
         * Each hit echoes `pct` of its damage to every other enemy within `radiusTiles` of the
         * target (Mindspike [Echo Spike], design/towers.md § 7: 50% within 1.2; T507).
         */
        readonly echo?: EchoDef;
      }
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
    | {
        // Not DoT: armor applies per tick (enemies.md § 2.3). Prism Spire, the Lantern's
        // light-beam (T504, T508). `damage` is per second. A beam is sticky: it keeps its target
        // until the target dies or leaves range (towers.md § 5).
        readonly kind: 'beam';
        readonly tickSec: number;
        /**
         * The ramp on one target (Prism Spire: +50% per second up to ×4; Sunlance +100% to ×10):
         * the damage multiplier grows by `rampPctPerSec` each second on the same target, capped
         * at `rampCap`, and resets on retarget. Absent: no ramp (the Lantern's beam).
         */
        readonly rampPctPerSec?: number;
        readonly rampCap?: number;
        /** Beams at once, each on its own target (Refractor 3, Lantern T3's two Marks; default 1). */
        readonly beams?: number;
      }
    | {
        readonly kind: 'chain';
        /** Jumps after the first hit: `jumps + 1` targets in all ("chains to 3" is 2). */
        readonly jumps: number;
        readonly jumpRangeTiles: number;
        /** Fraction lost per jump: 0.2 = −20%. */
        readonly falloffPct: number;
      }
    | {
        // Scuttle Den (towers.md § 7; T604): up to `maxAlive` units of `ally` live at the tower.
        // Each dashes out to a ground enemy within `rangeTiles` (a burrowed one too; `champion`s
        // leap onto flyers when the tier targets air), latches on for `latchSec` dealing `damage`
        // per second of `type` as a DoT (DOT_TICK_SEC ticks; armor bypassed), Chilling it
        // `chillPct` (swarmling chills stack to SWARMLING_CHILL_CAP, then count as one source),
        // then runs home and rests `restSec`. `ratePerSec` restates the DoT tick (1 / DOT_TICK_SEC).
        readonly kind: 'spawner';
        readonly ally: 'swarmling' | 'champion';
        readonly maxAlive: number;
        readonly latchSec: number;
        readonly restSec: number;
        readonly chillPct: number;
        /**
         * The DoT's multiplier while the latched target is burrowed (default 1): the swarmlings
         * ride a digger underground, in their element (towers.md § 7: the Den's ×2).
         */
        readonly burrowedDotMul?: number;
      }
    | {
        // Sproing Pad (towers.md § 7; T700a seam, T704 runs it): `leapers` leapers (allies from the
        // swarmling pool, AllyKind 'leaper') live at the pad. Each boings to one target within
        // `rangeTiles`, always a flyer when one is in range (Lookie Here: a Marked one first),
        // bonks it for `damage` of `type` (a `splashTiles` burst where it lands: Big Bonk), and
        // Pins a bonked flyer `pinSec` (Pinned grounds it, so ground towers hit it; a boss takes
        // Chilled 50% instead, the Pin rule), then boings home. `ratePerSec` is each leaper's
        // leaps per second. They can't be harmed and always come home.
        readonly kind: 'leaper';
        readonly leapers: number;
        readonly pinSec: number;
        readonly splashTiles?: number;
      }
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

/** An echo (hitscan `echo`): Echo Spike's 50% of each hit to enemies within 1.2 tiles of the target. */
export interface EchoDef {
  readonly pct: number;
  readonly radiusTiles: number;
}

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
  | {
      readonly status: 'corroded';
      readonly stacks: number;
      readonly maxStacks: number;
      /**
       * While these stacks hold, every shield the unit regains comes back this much slower: its
       * own regeneration, an aura's and a pulse's (Gloop [Corrosive Kiss]: 0.5; T562). Optional.
       */
      readonly shieldRegenSlowPct?: number;
    }
  | {
      readonly status: 'marked';
      readonly pct: number;
      readonly durationSec: number;
      /**
       * While this Mark holds, the unit can't cloak, blink, phase, or burrow (Seer's Lantern
       * [Truthlight], design/towers.md § 7; `Enemy.noEvadeTicks`, T508).
       */
      readonly noEvade?: true;
    }
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
  /** The partner's beam ramps this much faster, a fraction (Lightsong: Prism +30%; T508). */
  readonly rampPct?: number;
  /** Added to the partner's Marks, a fraction (Lightsong: Lantern Mark +5%; T508). */
  readonly markPct?: number;
  /**
   * A Scuttle Den partner's swarmlings (T604): `swarmlings` more of them (Finders Keepers: +1),
   * their dash `swarmSpeedPct` faster, a fraction, and their latch `latchSec` longer (Splash
   * Zone: +30%, +1 s).
   */
  readonly swarmlings?: number;
  readonly swarmSpeedPct?: number;
  readonly latchSec?: number;
  /**
   * A Hum Choir partner (T607): `auraRadiusTiles` added to its auras' radius (Harmony: +0.5), and
   * `auraPct` added to its damage auras' pct, a fraction (Bounce Chorus: +5% damage). A hitscan
   * partner: `extraTargets` whole extra targets per shot (Harmony: the Mindspike hits 1 more).
   */
  readonly auraRadiusTiles?: number;
  readonly auraPct?: number;
  readonly extraTargets?: number;
  /**
   * A Stasis Bloom partner (T608): `fieldRadiusTiles` added to its field's radius (Pinned Down:
   * +0.3), and its pulse `pulseSoonerSec` sooner (Stillmind: the cooldown −1 s).
   */
  readonly fieldRadiusTiles?: number;
  readonly pulseSoonerSec?: number;
  /**
   * M7's link extras (T700a seams; their towers' tasks run them): `corrodedStacks` Corroded stacks
   * each hit of the partner applies, at any tier, under the Corroded rule's cap (Acid Rain's
   * Thumper, Sticky Flak's Skyhook: 1; T705); a Sproing Pad partner's `pinSec` added to its Pin
   * (Bounce Chorus: +0.5 s) and `preferMarked`, its leapers pick a Marked flyer first (Lookie
   * Here; T704).
   */
  readonly corrodedStacks?: number;
  readonly pinSec?: number;
  readonly preferMarked?: true;
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
  /**
   * A conditional damage bonus against an enemy whose shield is up (shield HP > 0 when the hit
   * lands): `pct` only (Resonance: +20% vs shields; T504). Not combined with `vsStatus`.
   */
  readonly vsShielded?: true;
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
   * Phasing (the `phasing` trait and tell; the Rift Moth): every `everySec` it is Phased (enemies.md
   * § 2.6: nothing targets or hits it) for `durationSec`, after a `tellSec` flicker. Stasis and
   * Unnerved interrupt the tell (D137). Run by enemyAbilities/phase.ts (T503).
   */
  readonly phase?: PhaseDef;
  /**
   * A shield-recharge aura (the `shield_aura` trait; the Aegis Cantor): continuously restores
   * `shieldPerSec` to every other shielded unit of its faction within `radiusTiles` (not itself, not
   * a boss; two auras don't stack), never past each one's max (D137: continuous, not a pulse). Run
   * by enemyAbilities/shieldAura.ts (T502; enemies.md § 3's rule).
   */
  readonly shieldAura?: ShieldAuraDef;
  /**
   * Gathering (the `gathering` trait, `consumer` tell; the Maw, enemies.md § 5.4): every
   * `everySec`, after a `tellSec` tendril tell, it draws in the nearest eligible unit within
   * `radiusTiles` (a non-boss Hollow unit, or at most one Skitterkin enemy or refugee: that gather
   * is its one hush), adding that unit's current HP to its own HP and max HP. Run by
   * enemyAbilities/gather.ts (T602).
   */
  readonly gather?: GatherDef;
  /**
   * A haste aura (the `haste_aura` trait and tell; the Expediter): every other unit of its faction
   * within `radiusTiles` has Haste `pct` (highest only, under HASTE_CAP; enemies.md § 2.4),
   * continuously. Run by enemyAbilities/hasteAura.ts (T603).
   */
  readonly hasteAura?: HasteAuraDef;
  /**
   * Jamming (the `jammer` trait, `disabler` tell; enemies.md § 4; T700a seam): every `periodSec`,
   * after a `tellSec` tell (≥ JAM_MIN_TELL_SEC), it jams towers within `radiusTiles` for
   * `durationSec` (≤ JAM_MAX_SEC, × each tower's `jamMul`). `ring` (the Auditor, T707): every
   * non-immune tower in reach at the tell's end. `tendril` (the Silencer, T702): one tower picked
   * at the tell's start (`prefer: 'choir'`: a Hum Choir in reach first, else the highest tier, ties
   * lowest uid, skipping immune towers), jammed if still in reach at its end. Stasis and Unnerved
   * interrupt the tell (the period restarts); Lulled stretches the period ×1.5.
   */
  readonly jam?: JamDef;
  /**
   * A healer aura (the `healer_aura` trait, `healer` tell; the Maintenance Associate, enemies.md
   * § 5.3; T700a seam, T703 runs it): every other unit of its faction with that `body` within
   * `radiusTiles` regains `hpPerSec`, continuously, never past its max (not itself, not a boss; two
   * auras don't stack).
   */
  readonly healAura?: HealAuraDef;
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

/**
 * Phasing (EnemyDef.phase; the Rift Moth: 1.5 s Phased every 5 s, after a 0.5 s flicker). The cycle
 * is `everySec` long: it ends with the tell, then `durationSec` Phased.
 */
export interface PhaseDef {
  readonly everySec: number;
  readonly durationSec: number;
  readonly tellSec: number;
}

/** A shield-recharge aura (EnemyDef.shieldAura; the Aegis Cantor: 15 shield/s within 2 tiles). */
export interface ShieldAuraDef {
  readonly radiusTiles: number;
  readonly shieldPerSec: number;
}

/**
 * Gathering (EnemyDef.gather; the Maw: every 4 s, 1 s tell, 1 tile, max 5 absorbs, +10% size,
 * leak +1 per absorb, bounty +3 per Hollow absorb only; enemies.md § 5.4).
 */
export interface GatherDef {
  readonly everySec: number;
  readonly tellSec: number;
  readonly radiusTiles: number;
  readonly maxAbsorbs: number;
  /** Size growth per absorb, a fraction (render only: 0.1 = +10%). */
  readonly growPct: number;
  /** Leak added per absorb (any unit). */
  readonly leakPerAbsorb: number;
  /** Bounty added per Hollow absorb (a gathered Skitterkin adds none). */
  readonly bountyPerHollowAbsorb: number;
}

/** A haste aura (EnemyDef.hasteAura; the Expediter: +30% within 2 tiles). */
export interface HasteAuraDef {
  readonly radiusTiles: number;
  readonly pct: number;
}

/** How a jammer jams (JamDef.kind): the Auditor's ring or the Silencer's tendril. */
export type JamKind = 'ring' | 'tendril';

/**
 * Jamming (EnemyDef.jam; enemies.md § 4): the Silencer `tendril` every 12 s, 2 s tell, 2.5 tiles,
 * 4 s, Choir first; the Auditor `ring` every 10 s, 2 s tell, 2 tiles, 3 s.
 */
export interface JamDef {
  readonly kind: JamKind;
  readonly periodSec: number;
  readonly tellSec: number;
  readonly radiusTiles: number;
  readonly durationSec: number;
  /** A `tendril`'s pick: a Hum Choir in reach first (the Silencer). */
  readonly prefer?: 'choir';
}

/** A healer aura (EnemyDef.healAura; the Maintenance Associate: 12 HP/s to Mechanical within 1.5). */
export interface HealAuraDef {
  readonly radiusTiles: number;
  readonly hpPerSec: number;
  readonly body: Body;
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
  /**
   * What a `pivot` ending leaves behind (the Sunderglass Penitent, enemies.md § 6.1): a stationary
   * ward ally at its position. Required with `pivot`, and only there (T506).
   */
  readonly ward?: WardDef;
}

/**
 * The Ward (maps.md § 5.4): a kneeling boss turned stationary ally. Hollow units inside its
 * radius are Chilled `chillPct` (the Penitent: 2.5 tiles, 40%), as long as they stay inside.
 */
export interface WardDef {
  readonly radiusTiles: number;
  readonly chillPct: number;
}

/**
 * A shield-broken phase's shards (the Penitent's 3 cloaked Glimmer-shards; T506): as the phase
 * begins it releases `count` of `enemy` (an EnemyId) spread evenly along its route from
 * `spreadTiles` behind it to `spreadTiles` ahead (D138: ±0.6, so they read as pieces shed onto the
 * road, not hidden in its sprite). Its shield re-forms to full `reformSec` after it broke unless
 * every shard is dead by then (D137: 4 s).
 */
export interface ShardsDef {
  readonly enemy: string;
  readonly count: number;
  readonly spreadTiles: number;
  readonly reformSec: number;
}

/** One boss phase. Every field but `fromPct` is optional; a phase runs whichever it lists. */
export interface BossPhaseDef {
  /**
   * The HP share (1 = full) at which this phase begins, or `'shieldBroken'`: the moment its shield
   * first breaks (the Penitent's phase 2; T506), whatever its HP. A shield-broken phase is never
   * the first, and the boss has a shield.
   */
  readonly fromPct: number | 'shieldBroken';
  /** Shards released as a shield-broken phase begins, and the shield's re-form (T506). */
  readonly shards?: ShardsDef;
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
  // M7's phase kinds (T700a seams; each run by the task named).
  /**
   * Gathers while in this phase (the Gathering Maw's phase 1: 2 tiles every 5 s, 1 s tell; T708),
   * by the gathering rule (EnemyDef.gather), at this phase's radius and period.
   */
  readonly gather?: GatherDef;
  /**
   * A hangar (Shareholder Value's phase 1; T707): launches `count` of `enemy` (an EnemyId) every
   * `everySec` from its position.
   */
  readonly hangar?: HangarDef;
  /**
   * Hostile Takeover (Shareholder Value's phase 2; T707): every phase entry and then on its own
   * timer, a `tellSec` targeting laser on the `min(2, floor(0.25 × towers placed))` highest-tier
   * non-immune towers (picked as it starts), then a jam of `durationSec` on each (the jam rules).
   */
  readonly takeover?: TakeoverDef;
  /**
   * The jettison (Shareholder Value's phase 3; T707): as the phase begins its armor drops to 0,
   * it gains Haste `hastePct`, and its plates land on the map's `plates` markers (decor; an
   * `openTile` to wreckage each, never a par pad).
   */
  readonly jettison?: JettisonDef;
  /**
   * A split (the Gathering Maw's phase 2; T708): as the phase begins it splits into `count` of
   * `part` (an EnemyId), each with `hpPct` of its max HP (boss rules; one boss bar sums them).
   * `mergeAfterSec` after the split (or as the last but one part dies) the survivors merge into
   * one with their summed HP and Haste `mergeHastePct` (the merge). All parts dead before the
   * merge: the boss is beaten.
   */
  readonly split?: BossSplitDef;
  // The finale's phase kinds (T800a seams; the Unsung, enemies.md § 6; T808 runs them).
  /**
   * The boss's HP can't fall below this share of its max HP while in this phase (the Unsung's last
   * phase, the Song: 0.01). It ends by its `layToRest` ending, scripted to the song's countdown.
   */
  readonly floorPct?: number;
  /**
   * Where this phase's `burrow` surfaces (the Unsung's phase 3: `'choir'`, among the singers;
   * D154 Fork 2). Needs a `burrow` in the same phase, longer than its 1.5 s surfacing tell;
   * without it a burrow surfaces where it dug. Run by enemyAbilities/unsung.ts (T808).
   */
  readonly burrowTo?: 'choir';
  /**
   * Adds while in this phase (the Unsung's Song: Silencer adds): `count` (default 1) of `enemy`
   * (an EnemyId) every `everySec`, born in its wave at the start of its route (the Halls) after a
   * 1.5 s call (T808; enemyAbilities/unsung.ts).
   */
  readonly adds?: BossAddsDef;
  /**
   * Phases while in this boss phase (the Unsung's phase 3; T808): the Phased cycle (EnemyDef.phase's
   * rule) at these numbers, held while it is dug in or telling a dig, and a dig waits while it is
   * Phased or telling a phase. A boss's tell is at least BOSS_MIN_TELL_SEC.
   */
  readonly phase?: PhaseDef;
}

/** A boss phase's adds (BossPhaseDef.adds; the finale's Unsung). */
export interface BossAddsDef {
  readonly enemy: string;
  readonly count?: number;
  readonly everySec: number;
}

/** A boss hangar (BossPhaseDef.hangar): `count` of `enemy` every `everySec`. */
export interface HangarDef {
  readonly enemy: string;
  readonly count: number;
  readonly everySec: number;
}

/**
 * Hostile Takeover (BossPhaseDef.takeover): D146's 3 s laser, then a 4 s jam; the first laser as
 * the phase begins, then one every `everySec` (laser start to laser start; T707).
 */
export interface TakeoverDef {
  readonly tellSec: number;
  readonly durationSec: number;
  readonly everySec: number;
}

/** The jettison (BossPhaseDef.jettison): D146's armor 0, Haste 40%, four `crash_*` plates. */
export interface JettisonDef {
  readonly hastePct: number;
  readonly plates: readonly MarkerId[];
}

/**
 * A boss split and its merge (BossPhaseDef.split): D146's 3 parts at 20%, merge at 12 s, Haste 30%.
 * The merge is optional (T808): with neither `mergeAfterSec` nor `mergeHastePct`, the parts never
 * merge, and once the last of them falls the boss rises again in its next phase (the Unsung).
 */
export interface BossSplitDef {
  readonly part: string;
  readonly count: number;
  readonly hpPct: number;
  readonly mergeAfterSec?: number;
  readonly mergeHastePct?: number;
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
  /**
   * The script modifier (`setModifier`) that locks this companion ability out while it's on, in its
   * companion's slot 2 (QUILL's Time Dilation: `quillLockout`, A3M2; sim/revoke.ts `slotRevoked`).
   */
  readonly lockedOutBy?: 'quillLockout';
  readonly sprites: { readonly icon: SpriteId };
}
/**
 * A cooldown in sim seconds, or in waves (Clearance Sale's "once per 4 waves": ready again when
 * that many more waves have started; T304d). Exactly one.
 */
export type AbilityCooldown =
  | { readonly cooldownSec: number; readonly cooldownWaves?: never }
  | { readonly cooldownWaves: number; readonly cooldownSec?: never };
/** Commander ability effects; each runs in sim/systems/abilities.ts or its own file. */
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
    }
  | {
      /**
       * Stillness (Ves'thara's, design/core-loop.md § 3.2; T507): a targeted circle; every enemy
       * inside it takes Stasis for `durationSec` (a boss Chilled 50% instead, the Stasis rule),
       * which interrupts its abilities. Radius 2.5, 3 s.
       */
      readonly kind: 'stasisArea';
      readonly radiusTiles: number;
      readonly durationSec: number;
    }
  | {
      /**
       * Underfoot (Bramble's, design/core-loop.md § 3.2; T604): a targeted path tile, live for
       * `durationSec`. Each ground enemy that crosses it, burrowed ones included, is Pinned
       * `pinSec` and takes `damage` of `type`, once per enemy per trap (6 s; 1 s; 30 Kinetic).
       */
      readonly kind: 'pathTrap';
      readonly type: DamageType;
      readonly damage: number;
      readonly pinSec: number;
      readonly durationSec: number;
    }
  | {
      /**
       * System Reboot (core-loop.md § 3.2; T700a seam, T702 runs it): no target; clears Jammed on
       * every tower and makes each immune to jamming for `immuneSec` (6 s, REBOOT_IMMUNITY_SEC).
       */
      readonly kind: 'reboot';
      readonly immuneSec: number;
    };

/**
 * A scripted ally at a fixed post beside the path (design/maps.md § 5.4: Bricks in person,
 * colonist militia). It is never hurt (vulnerability `never`) unless it blocks (`block`: Bricks
 * at the Gap, A3M3), never targets `quiet_wave`, `youngling`, or `fleeing` units, and fires at the
 * nearest enemy in range. Its numbers are map data.
 */
export interface AllyPostDef {
  readonly kind: 'bricks' | 'militia';
  /** The decor marker its post stands on (`markers`). */
  readonly post: MarkerId;
  /**
   * The post is manned only when this story flag has this value (A3M6's militia under `convoy`;
   * T700a seam, T706 runs it): otherwise it never spawns.
   */
  readonly when?: FlagGateDef;
  /** A hitscan attack, like a Rivet's. */
  readonly attack: {
    readonly type: DamageType;
    readonly damage: number;
    readonly ratePerSec: number;
    readonly rangeTiles: number;
    readonly targets: { readonly ground: boolean; readonly air: boolean };
  };
  /**
   * A blocker (Bricks at the Gap, maps.md § 5.4; T605): its post stands on a path tile's edge and
   * holds up to `capacity` non-boss ground units at a time (others pass; D141: 2); they stop and
   * wear him down instead of passing. His health is `health`, never the damage they deal.
   */
  readonly block?: BlockDef;
}

/**
 * A blocker's numbers (AllyPostDef.block; T605). `health` is the scripted timeline (D141: it
 * follows the timeline only, so nothing reads as the player's fault): the health, a fraction of
 * full, as each keyed wave starts (1-based, ascending), stepping per wave between keys like the
 * lighting schedule; full before the first key. Never below BLOCKER_HEALTH_FLOOR (5%).
 */
export interface BlockDef {
  readonly capacity: number;
  readonly health: readonly { readonly wave: number; readonly pct: number }[];
}

/**
 * A story-flag gate on map data (fixed for the run): the thing exists only when `flag` (a script
 * flag) has the value `eq` (A3M3's `door_choice` refugee groups; M7's militia posts, dressing, and
 * decor). An unset flag never matches.
 */
export interface FlagGateDef {
  readonly flag: ScriptFlagId;
  readonly eq: FlagValue;
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
  /** An Escort's defeat: losing this many refugees loses the map (D138). At most one of the two. */
  readonly maxLost?: number;
  /**
   * An Escort's defeat as a share of the run's refugees (`state.refugeeTotal`, which a gated group
   * changes): lost ≥ ⌈maxLostPct × total⌉ loses the map (sim/escort.ts `escortMaxLost`; D143 R7).
   * In (0, 1]; never with `maxLost`.
   */
  readonly maxLostPct?: number;
  /**
   * A Choir's defeat (T804): fewer than this many singers still singing loses the map. At most
   * one of the two; a choir map gives one.
   */
  readonly minVoices?: number;
  /**
   * A Choir's defeat as a share of the run's choir (which story flags change; D154: 0.4): fewer
   * than ⌈minVoicesPct × choir⌉ singing loses the map. In (0, 1]; never with `minVoices`.
   */
  readonly minVoicesPct?: number;
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
  /**
   * Flag-gated decor (maps.md § 7, *State-dependent dressing*; T700a seam, render's T730b): the
   * prop on each listed marker shows only when its gate holds (A3M4's HE HELD THE DOOR under
   * `convoy`). Render-only; scripts still read the marker.
   */
  readonly markerWhen?: Readonly<Record<MarkerId, FlagGateDef>>;
  readonly startCredits: number;
  /** Default 20. */
  readonly coreIntegrity?: number;
  /** First-clear Stardust reward (A1M1 pays 0). */
  readonly stardust: number;
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
   * Traits the 15% soft-trait cap passes over on this map (design/maps.md § 6.2): for a map that
   * introduces a unit and scripts its doom, never to dodge a counter its play depends on. Each
   * names its reason; a trait in a required counter's category is refused (validateThreats.ts).
   */
  readonly softExempt?: readonly SoftExemptDef[];
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
  /**
   * A revisit (A2M3 of A1M2; design/maps.md § 7): the MapId whose layout this map reuses by
   * reference (validate() checks it: a MapDef can't name its own registry's ids). The original's
   * tiles, terraces, routes, markers, and wreckage are placed at `revisitAt`, unchanged, when the
   * content compiles (content/compileRevisit.ts), so an edit to the original flows into its
   * revisit. This map's own `tiles` hold the added band, with '*' (`REVISIT_TILE`) on every tile
   * of the original's footprint (and in its `terraces`, if given); its own routes, markers, and
   * wreckage are added to the original's. The rest (waves, scripts, medals, builds) is its own.
   */
  readonly revisitOf?: string;
  /** Where the original's tile (0, 0) sits on this map's grid: the original centred. */
  readonly revisitAt?: GridPos;
  /**
   * A revisit's take on the original's wreckage (default `'keep'`: composed like the rest).
   * `'gone'`: the original's `underWreckage` and `salvage` are left out and each of its wreckage
   * tiles composes as bare decor ('.'), so its pads stay the original's and the carts are gone
   * (A3M2 of A1M4: "A1M4's wreckage carts are gone", story/campaign/act3.md § A3M2).
   */
  readonly revisitWreckage?: 'keep' | 'gone';
  /**
   * The lighting schedule (art-direction.md § 7, the lighting overlay's tint path): keyframes the
   * light reaches as each named wave starts, crossfading the sky and the shade from the map's
   * `env` (the light before wave 1) through each key in turn. The tint is cosmetic (A2M3's
   * gold-to-dusk, D101); a key's `dark` (Sundown) is sim state (D137; T505).
   */
  readonly lighting?: readonly LightingKeyDef[];
  /** Render-only dressing layers laid over the ground (A2M3's grey soil; design/maps.md § 7). */
  readonly dressing?: readonly DressingLayerDef[];
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
  /**
   * Light sources under darkness (maps.md § 5.1, Sundown; T505): lamps on decor markers, each
   * with its radius. Towers inside any light keep their full range at any darkness.
   */
  readonly lights?: readonly LightDef[];
  /**
   * Escort (maps.md § 5.2; T305c): the decor or core tile refugees walk to (A2M5: the Preserve gate,
   * the core before the pivot). Required with `refugees`, and only with them.
   */
  readonly safeExit?: MarkerId;
  /**
   * Refugee groups by id, for the `spawnAllies` action (escort maps; T305c). Each walks its ground
   * path to `safeExit`. A map with refugees is an Escort map from the start or by `setObjective`.
   */
  readonly refugees?: Readonly<Record<string, RefugeeGroupDef>>;
  /** Map scripts (story-runtime.md § Map scripts). */
  readonly events?: readonly ScriptedEvent<K>[];
  /**
   * Scripted allies on the map from the start (design/maps.md § 5.4): posts (Bricks, militia).
   * Refugees are `refugees` (spawned by script); a blocker's health timeline is its `block`.
   */
  readonly allies?: readonly AllyPostDef[];
  /**
   * Wave groups a script spawns by id (`spawnWave`; A3M5's W10 surge when Cut the Feed isn't
   * done; T700a seam, T706 runs it): each walks as it would in a wave, from the moment the action
   * runs, counted in the wave then running.
   */
  readonly scriptGroups?: Readonly<Record<string, WaveGroup<K>>>;
  // The finale (T800a seams; design/maps.md § 5.5; each run by the task named).
  /**
   * The choir (a `choir` map's walkers, and only there; T804): Pebble leading the singers up its
   * road, halting while the Hollow is close ahead. Its Voices meter is the singers still singing.
   */
  readonly choir?: ChoirDef;
  /** The Leaving Song's rules (a `choir` map's Phase 2; T805): the radius, rest, and scatter. */
  readonly song?: SongDef;
  /**
   * Secondary timers by id (maps.md § 5.1, *Secondary timer*: the Deep Bore, `deep_bore`; T806):
   * a HUD bar that fills on sim time once a `startTimer` action starts it, at the rate a
   * `setTimerRate` sets, and fires `{ timerFull: id }` when full. It never ends the map.
   */
  readonly timers?: Readonly<Record<string, TimerDef>>;
  /**
   * How the map is won (T821). Default: every wave resolved (design/core-loop.md § 2.1).
   * `'script'`: only by an `endMap: 'won'` action, never by the waves resolving, so a scripted
   * ending can hold the field after its last enemy is gone (the finale's Dawn: won 8 s after
   * `setPhase 3`). Such a map needs an `endMap: 'won'` event.
   */
  readonly winBy?: 'script';
  /**
   * A challenge map's fixed rules (design/maps.md § 8; T862): every run on the map carries them,
   * applied by createSim (sim/rules.ts `challengeConfig`). Required on an `act: 'challenge'` map,
   * and only there (validateChallenge.ts).
   */
  readonly challenge?: ChallengeDef;
}

/** A challenge map's tagline and rules (MapLayoutDef.challenge; design/maps.md § 8; T862). */
export interface ChallengeDef {
  /** The map's name on the post-game node and in its canon section ("Skitterkin Only"). */
  readonly name: string;
  /** The one line the post-game node and the briefing show ("Only the warrens' towers deploy."). */
  readonly tagline: string;
  /** The rules, in the order the briefing names them. Each kind at most once. */
  readonly rules: readonly ChallengeRuleDef[];
}

/**
 * One challenge rule (sim/rules.ts turns each into the run's rule or modifier, sourced
 * `challenge:<map id>`):
 * - `towerFaction`: only that faction's towers deploy (the loadout keeps those, the rest stay home).
 * - `allCloaked`: every hostile unit the map spawns is cloaked (a cloak, enemies.md § 2.5).
 * - `noAbilities`: Radio Silence (design/progression.md § 6): every ability slot dark.
 * - `glassCore`: Glass Core (progression.md § 6): core integrity 5, Reinforced Core's ranks add.
 */
export type ChallengeRuleDef =
  | { readonly kind: 'towerFaction'; readonly faction: TowerFaction }
  | { readonly kind: 'allCloaked' }
  | { readonly kind: 'noAbilities' }
  | { readonly kind: 'glassCore' };

/**
 * The finale's choir (MapDef.choir; design/maps.md § 5.5; T800a seam, T804 runs it). Its leader
 * (Pebble) walks `route` from its core end back toward its spawn (the finale's walk runs against
 * the Hollow's road, south to north) at `pace`, the singers filing behind her, halting while any
 * Hollow unit is within `haltTiles` ahead of her, and stops beside `stopAt` (the Halls mouth). A
 * hushed singer stops singing and trails at the back; the map is lost when fewer than the map's
 * `minVoices` still sing.
 */
export interface ChoirDef {
  /** The leader, who is never hushed and never counted (D154: Pebble). */
  readonly leader: 'pebble';
  /** The road: a ground path the choir walks from its core end toward its spawn. */
  readonly route: RouteId;
  /** Where the choir stops and sings: a marker beside the route (the Halls mouth). */
  readonly stopAt: MarkerId;
  /** The base choir (D154: 10), Pebble not counted. */
  readonly singers: number;
  /** The leader's pace in tiles per second (D154: ~0.35). */
  readonly pace: number;
  /** The choir halts while a Hollow unit is within this many route tiles ahead of the leader (1.5). */
  readonly haltTiles: number;
  /**
   * The walk keeps time with the waves (T820): with it, the leader walks no further than
   * wave ÷ `walkWaves` of the way to her stop (a leg a wave, walked as the wave starts), so Story's
   * longer countdowns, early calls, and veteran Rush Hour never put her ahead of or behind the
   * waves (fin_m01: 18, Phase 1's waves). Without it she walks on sim time alone.
   */
  readonly walkWaves?: number;
  /**
   * The choir's defeat as a hush allowance (T821; fin_m01: 14): the map is lost once more than
   * this many singers are hushed, whatever the choir's size by flag (the floor is the run's choir
   * − `maxHushed`, at least 1), so every flag cell has the same room in singers. Instead of the
   * map's `minVoices`/`minVoicesPct`; the harness then reads the margin as Voices % of the base
   * choir (`singers`), so the same hushes read the same margin in every cell.
   */
  readonly maxHushed?: number;
  /** Singers added (or, negative, kept home) by story flag: warren +4, convoy −2 (D154). */
  readonly groups?: readonly { readonly when: FlagGateDef; readonly singers: number }[];
  /**
   * Old Thrum beside the leader when `when` holds (`spared_quiet_wave`): counts as a singer, can't
   * be hushed, and adds `radiusBonus` tiles to the song (+0.5).
   */
  readonly thrum?: { readonly when: FlagGateDef; readonly radiusBonus: number };
  /**
   * The Returned when `when` holds (`stardust_choice = returned`): `count` bearers walking with
   * the choir, each with its own song aura of `auraRadius` tiles. Not Voices.
   */
  readonly returned?: {
    readonly when: FlagGateDef;
    readonly count: number;
    readonly auraRadius: number;
  };
}

/**
 * The Leaving Song (MapDef.song; design/maps.md § 5.5; T800a seam, T805 runs it). Its circle is
 * centred on the choir's leader: `baseRadius` × (`silentPct` + (1 − `silentPct`) × singing ÷
 * choir), plus Thrum's bonus. In Phase 2 a Hollow unit destroyed inside it is laid to rest (its
 * `restValue` in rest points); outside it scatters and re-forms once. The countdown's progress is
 * `p = restPoints ÷ restTarget`, capped at 1.
 */
export interface SongDef {
  /** The radius in tiles with the whole choir singing (2.5). */
  readonly baseRadius: number;
  /** The share of `baseRadius` left with no singer singing (default 0.6; D154). */
  readonly silentPct?: number;
  /** Rest points that end Phase 2 (`p` = 1). */
  readonly restTarget: number;
  /** The song's trickle: rest points per second through Phase 2, so it can't stall. */
  readonly restPerSec: number;
  /** Rest points per point of damage the boss takes inside the song (its last phase feeds it). */
  readonly restPerBossHp?: number;
  /**
   * Rest-point multipliers by story flag (C4: rewrite ×1.5, keep ×1.25, purge ×1.0); the first
   * whose flag has that value applies, else ×1.
   */
  readonly multipliers: readonly {
    readonly flag: ScriptFlagId;
    readonly value: FlagValue;
    readonly mul: number;
  }[];
  /**
   * Scatter (Phase 2 only, D154): a Hollow unit destroyed outside the song drifts back along its
   * route and re-forms `reformSec` later at `hpPct` of its max HP, once, paying no bounty again.
   */
  readonly scatter: { readonly reformSec: number; readonly hpPct: number };
}

/** A secondary timer (MapDef.timers; T800a seam, T806 runs it): the Deep Bore. */
export interface TimerDef {
  /** Seconds of sim time to fill at 100% rate. */
  readonly fillSec: number;
  /**
   * A boss that spawns once the timer has stopped gains this share of its max HP per tenth the
   * timer filled (the Bore: 0.05, "+5% Unsung HP per 10%"). Default 0.
   */
  readonly bossHpPerTenth?: number;
}

/** One key of a map's lighting schedule (MapLayoutDef.lighting). */
export interface LightingKeyDef {
  /** The light is `env`'s as this wave starts (1-based), crossfading from the key before. */
  readonly wave: number;
  readonly env: EnvPaletteId;
  /**
   * Sundown's darkness at this key, 0–1 (default 0; maps.md § 5.1): sim state, eased in ticks
   * from the key before (D137: lit on screen = lit in the sim). At darkness d, a tower outside
   * every light has its range × (1 − DARK_RANGE_PENALTY × d) (T505).
   */
  readonly dark?: number;
  /**
   * A sky-only key (T806; the finale's eastern sky warming per Phase 1 wave, D154's T701 ruling):
   * it moves the sky backdrop alone, while the world's grade holds at the last key before it that
   * isn't sky-only, and Sundown's darkness skips it (so it carries no `dark`). The world's light
   * waits for a script's `setLighting` (Dawn; content/lightingSets.ts).
   */
  readonly skyOnly?: boolean;
}

/** A lamp (MapLayoutDef.lights): a light source on a decor marker. */
export interface LightDef {
  readonly marker: MarkerId;
  /** Its light's radius in tiles (default LAMP_RADIUS_TILES, 1.5; T505). */
  readonly radiusTiles?: number;
}

/**
 * A refugee group (maps.md § 5.2; T305c): `count` refugees (default REFUGEE_GROUP_SIZE, 6) walking
 * `route`, a ground path that ends on the safe exit, spaced and paced by rule (rules.ts:
 * 0.6 tiles apart, 0.7 tiles/s). `withPebble`: Pebble rides with this group (never a loss, never
 * hushed, not counted in the meter).
 */
export interface RefugeeGroupDef {
  readonly route: RouteId;
  readonly count?: number;
  readonly withPebble?: true;
  /**
   * The group's own exit, a decor marker its route ends beside (A3M3's two blast doors), instead
   * of the map's `safeExit` (T600a).
   */
  readonly exit?: MarkerId;
  /**
   * The group walks only when this story flag has this value (A3M3: `door_choice` picks the side).
   * A group that doesn't walk is never released (`spawnAllies` does nothing) and never counts
   * toward the meter's total (`state.refugeeTotal`; sim/escort.ts).
   */
  readonly when?: FlagGateDef;
  /**
   * `'bearer'` (A3M5's Brood Hauler bearers; T700a seam, T706 runs it): a group carrying the vats'
   * dead home on a Protect map whose asset has `bearers` (AssetDef). A hushed bearer costs the
   * asset 1; one that reaches its exit is home (`stats.bearersHome`), no meter change. Default
   * `'refugee'`.
   */
  readonly kind?: 'refugee' | 'bearer';
}

/**
 * A render-only dressing layer over the map's grass (decor tiles: never a pad, path, or block):
 * `greySoil` streaks the grass grey (the mining scars spreading over a revisited map), `mineScar`
 * cuts it to bare grey earth (a strip mine). Its `area`: the revisit's original footprint or its
 * added band (both need `revisitOf`), the whole map, or the tiles from one corner to the other
 * (inclusive). Where layers overlap, the later one shows.
 */
export interface DressingLayerDef {
  readonly kind: 'greySoil' | 'mineScar';
  readonly area: 'original' | 'band' | 'all' | { readonly from: GridPos; readonly to: GridPos };
  /** Shown only when this story flag has this value (maps.md § 7; T700a seam, T730b draws it). */
  readonly when?: FlagGateDef;
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
  /**
   * The asset is the bearers too (A3M5; T700a seam, T706 runs it): the map's `kind: 'bearer'`
   * refugee groups walk with it, and each one hushed costs the meter 1.
   */
  readonly bearers?: true;
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
  /**
   * Never called early (core-loop.md § 2.4): callWave refuses it (`noCall`), so the HUD hides Call
   * and its bonus while it's next. For a wave whose build phase is a scripted fight (A2M5's W6,
   * the Penitent's window). A wave with a `quiet_wave` group is never called either, flag or not
   * (the Quiet Wave, D097). Not on wave 1 (the player starts it).
   */
  readonly noCall?: true;
  /**
   * The script phase this wave belongs to (the finale's Phase 2 add waves; T821): its countdown
   * waits (`held`, never called) until `state.phase` is at least this, and once the phase has
   * passed it the wave never starts, nor does any later one (the schedule ends; one still spawning
   * stops). Default: none (the wave runs whatever the phase).
   */
  readonly inPhase?: number;
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
  /** The Field Protocols equipped (as many as the profile's slots). */
  readonly protocols: readonly ProtocolId[];
  /**
   * Field Protocols owned but not equipped on this map (none if absent). Nothing reads them in a
   * run; the [purchasable] bill prices them with the equipped ones (validatePurchasable.ts).
   */
  readonly unequippedProtocols?: readonly ProtocolId[];
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

/**
 * One flag-variant cell's reference profile (BuildsDef.referenceProfileByFlag; T700a): a run
 * whose story flags match every entry of `when` (door_choice × quill_choice on A3M5–A3M6) is owned
 * by `profile` instead of the map's `referenceProfile`, and plays `parBuild` instead of the map's
 * par build where it gives one (A3M4's warren: Gloop for Rivet).
 */
export interface FlagProfileDef<K extends IdSpace = LiveIds> {
  readonly when: { readonly [F in ScriptFlagId]?: FlagValueOf<F> };
  readonly profile: ProfileDef<K>;
  readonly parBuild?: ScriptedBuild<K>;
}

export interface BuildsDef<K extends IdSpace = LiveIds> {
  readonly referenceProfile: ProfileDef<K>;
  /**
   * Flag-variant cells with their own reference profile (and par build), first match wins; a run
   * no cell matches uses `referenceProfile` and `parBuild` (balance/profile.ts
   * `referenceProfileFor`). Default none.
   */
  readonly referenceProfileByFlag?: readonly FlagProfileDef<K>[];
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
  /**
   * Required counters the harness doesn't hold to #5's loss or #6's full-catalog loss (balance/
   * counterChecks.ts; design/maps.md § 6.1, § 6.4). Each entry is a `CounterExemption`: see it for
   * what the exemption means and what it must name. Live: A3M5's `jam` (its exam is the bearers'
   * hub under the hunt: no-jam loses most of the bearers, not the map; D149) and A3M6's
   * `detection` (canon's two Operative waves, one teach and one test; D146 addendum, T722). Default
   * none.
   */
  readonly counterExemptions?: readonly CounterExemption[];
  /**
   * Harness checks pending a named task (T820: the finale's alts, its warren cell, and #18 wait for
   * T821's whole-map pass): the checks about each listed subject (`alt:<name>`, or a #14 cell
   * `flag:<flag>=<value>`) and each listed check id still run and report, but pass as
   * "pending <task>". Only on a map whose
   * dialogue isn't COMPLETE yet (tools/pendingChecks.test.ts), so it can't ship. Default none.
   */
  readonly pendingChecks?: PendingChecks;
}

/**
 * Harness checks pending a task (BuildsDef.pendingChecks): its id, why, the subjects whose checks
 * wait, and checks that wait by id whatever their subject (`'18'`: the finale's song timing, a
 * refusal until T821 lifts it).
 */
export interface PendingChecks {
  readonly task: string;
  readonly reason: string;
  readonly subjects: readonly string[];
  readonly checks?: readonly string[];
}

/**
 * A required counter the harness exempts from #5 (its no-counter build loses by the lose-by wave)
 * and #6 (the full-catalog profile can't replace it) on one map (BuildsDef.counterExemptions).
 * The counter **stays required**: it is still in `requiredCounters`, its no-counter build still
 * runs and still carries no answer (#5's premise), and the map's exam still asks for it. Only the
 * *loss* is waived, for a map whose exam of that counter costs a measured margin rather than the
 * map (A3M5's jam: the bearers, not the core). Not a way to dodge a counter: [builds-range]
 * refuses a counter the map doesn't require, one listed twice, an empty `reason`, or a `pinnedBy`
 * that isn't a balance unit test's path.
 */
export interface CounterExemption {
  readonly counter: 'jam' | 'detection';
  /** Why the loss is waived here: where the map's exam of the counter is, and what it costs. */
  readonly reason: string;
  /**
   * Required on every entry (D150): the balance unit test that pins what the counter's absence
   * costs on this map in the harness's place, as a repo path (`src/balance/a3m5Jam.test.ts`).
   * [builds-range] checks its shape (it runs in the browser); tools/counterExemptions.test.ts
   * checks that the file exists and asserts the cost for this map and counter through
   * `expectCounterCost` (balance/__fixtures__/counterCost.ts): par's margin over the no-counter
   * build's, at least COUNTER_COST_MIN_POINTS (T775).
   */
  readonly pinnedBy: string;
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
  | 'bossBlinks'
  /**
   * Leaks by Heavy units: Hollow units that hushed someone on the way (Hiccup Contained: no Heavy
   * Mote gets through; counted in movement, T460).
   */
  | 'heavyLeaks'
  /**
   * The wave during which a boss's `pivot` ran (0 until it does; Kneel: `gte: 1, lte: 5`, the
   * pivot forced before W6 starts). Set once, by T506.
   */
  | 'pivotWave'
  /** Escort (T305c): refugees who reached the safe exit, and refugees lost (hushed, or at the exit). */
  | 'evacuated'
  | 'refugeesLost'
  /**
   * Refugees a Maw gathered (Nothing Gathered: `lte: 0`; counted by T602's gather, also a loss).
   */
  | 'refugeesGathered'
  /** Revocations that took effect this run: each tower class and each ability counts one (T606). */
  | 'revocations'
  /**
   * M7 (T700a seams): the most towers Jammed at once this run (Keep the Lights On: `lte: 1`;
   * T702), the longest single Hostile Takeover jam in ticks (Declined: `lte: 60`, 1 s; T707), and
   * bearers who reached home (A3M5's Results line; T706).
   */
  | 'jammedPeak'
  | 'takeoverJamTicks'
  | 'bearersHome'
  /**
   * The finale (T800a seams; each counted by the task named): Hollow units laid to rest and
   * scattered in Phase 2 (Laid to Rest: rested ≥ 60% of both; T805, T874), and the Deep Bore's
   * highest fill in whole percent (T806).
   */
  | 'restedKills'
  | 'scatteredKills'
  | 'boreProgress';

/**
 * Medal, objective, and script `when` conditions: one grammar, evaluated by the sim over run state
 * (sim/conditions.ts; story-runtime.md § Conditions). State atoms (`towers`, `linkActive`,
 * `tagRatio`) are judged when the condition is evaluated (a medal's at the moment of victory);
 * run atoms (`stat`, `passedMarker`) accumulate over the whole run; `flag` is fixed for the run.
 */
export type ConditionDef<K extends IdSpace = LiveIds> =
  | { readonly stat: RunStat; readonly gte?: number; readonly lte?: number }
  /** The map's script phase (`setPhase`; the finale's 1–3) is at least this (T800a; a run atom). */
  | { readonly phaseAtLeast: number }
  /**
   * Laid to Rest (the finale's medal; T805): at least this share, in (0, 1], of Phase 2's Hollow
   * kills were inside the song (`restedKills` ÷ (`restedKills` + `scatteredKills`)), with at
   * least one kill. A state atom: judged when evaluated.
   */
  | { readonly restedPct: number }
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
      readonly passedMarker: {
        readonly marker: MarkerId;
        readonly enemy?: K['enemy'];
        /**
         * Only a unit never Revealed before it went past counts (Nothing Unseen: "every Veilwalker
         * is revealed before it passes Intake B" is `not` this; `Enemy.everRevealed`).
         */
        readonly unrevealed?: true;
      };
    }
  | { readonly flag: ScriptFlagId; readonly eq: FlagValue }
  | {
      /**
       * Leaks this run by units of that faction (or enemy), medal-exempt units never counted
       * (`stats.leaksByFaction`, `stats.leaksByEnemy`). A run atom, like `stat`.
       */
      readonly leaks: {
        readonly faction?: EnemyFaction;
        readonly enemy?: K['enemy'];
        /**
         * Only units that spawned in waves `from`–`to` (inclusive; Before the Dark: no leaks in the
         * last three waves). Not combined with `faction` or `enemy` (`stats.leaksByWave`).
         */
        readonly waves?: readonly [from: number, to: number];
      };
      readonly gte?: number;
      readonly lte?: number;
    }
  /** The salvage drone has cleared the wreckage tile under that marker this run (a run atom). */
  | { readonly wreckageCleared: MarkerId }
  /** That optional objective of the map is done (settled `done`; failed or open is false). */
  | { readonly objectiveDone: string }
  /**
   * The drone cleared the wreckage under every one of `cleared` before wave `byWave` started
   * (Cut the Feed: the three `feed_*` markers before W10; T700a seam, T706 runs it). A run atom:
   * settled true once all are cleared in time, false once that wave starts without them.
   */
  | { readonly cleared: readonly MarkerId[]; readonly byWave: number }
  /**
   * Refugees of that group (a `refugees` key) lost this run, hushed, gathered, or taken at the
   * exit (The Matriarch's Young: Bramble's column loses no one, `lte: 0`). A run atom.
   */
  | { readonly groupLost: string; readonly gte?: number; readonly lte?: number }
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
  | { readonly tick: number }
  // The finale (T800a seams; each run by the task named in SCRIPT_GATES).
  /**
   * The choir's leader has reached that marker (the Halls mouth; T806 with T804's choir), and, with
   * `afterWave`, that wave has also cleared: the later of the two (Phase 2's start, D154; T820).
   */
  | { readonly choirAt: MarkerId; readonly afterWave?: number }
  /** That timer (MapDef.timers) has filled (the Deep Bore's breakthrough; T806). */
  | { readonly timerFull: string }
  /** The map's script phase is `phase` or later, `afterSec` (default 0) after it began (T806). */
  | { readonly phase: number; readonly afterSec?: number }
  /** The echo `spawnEcho` sent under this id has reached the song (`EchoArrived`; T821). */
  | { readonly echoArrived: string };

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
  // Every live hostile unit of that faction stops, fades out over 1 s, and is removed: no leak, no
  // bounty, and its wave resolves without it (enemies.md § 6.1, `pivot`; T506).
  | { readonly standDown: EnemyFaction }
  | { readonly spawnAllies: string } // a refugee group (MapDef.refugees; T305c)
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
  /** A retry checkpoint at a script moment, under a label the app names ('halls'; T806). */
  | { readonly checkpoint: string }
  // The finale (T800a seams; each run by the task named in SCRIPT_GATES).
  /**
   * Locks (or unlocks) a commander ability for the rest of the map's phase: Directive 0's dark
   * Time Dilation (D154, T501). Never saved; never a revocation (T807).
   */
  | { readonly lockAbility: K['ability']; readonly on: boolean }
  /** Thrum's echo walks into the song under this id (`EchoArrived`; T807). */
  | { readonly spawnEcho: string }
  /** Every live Hollow unit is laid to rest (Dawn; T805). */
  | { readonly restAll: true }
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
