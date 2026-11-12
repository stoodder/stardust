// Events: the sim's output (architecture.md § Events). Systems push them into `state.events`
// during a tick; the host drains them after each frame. Systems never read events: inside the
// sim, systems communicate through state. Each event names the task that built it; an event's
// owning task may add payload fields.
import type {
  AllyKind,
  AttackKind,
  BossEnding,
  EnemyFaction,
  GridPos,
  IdSpace,
  LiveIds,
  MedalKind,
  MeterLabel,
  ObjectiveKind,
  RouteId,
  SpriteId,
  TileChar,
} from '../content/types.ts';
import type { Command, RejectReason, SpecChoice } from './commands.ts';

/**
 * Who dealt a hit (the damage pipeline's `source`, sim/combat/damage.ts): a tower by uid, a
 * commander ability by slot, or an ally (Bricks, militia; T207a) by uid. EnemyDied names the
 * killer with it.
 */
export type DamageSource =
  | { readonly kind: 'tower'; readonly uid: number }
  | { readonly kind: 'ability'; readonly slot: 1 | 2 }
  | { readonly kind: 'ally'; readonly uid: number };

/** The three medals every campaign map has (design/progression.md § 3; content/types.ts). */
export type { MedalKind };

export type SimEvent<K extends IdSpace = LiveIds> =
  | {
      readonly type: 'EnemySpawned';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly route: RouteId;
      readonly wave: number;
    }
  | {
      readonly type: 'EnemyDied';
      readonly uid: number;
      readonly enemy: K['enemy'];
      /** The credits the kill paid (already credited): the bounty, 0 for younglings, 1 if fleeing. */
      readonly bounty: number;
      readonly killer: DamageSource;
      /** Where it died, in tiles. */
      readonly x: number;
      readonly y: number;
    }
  | {
      /**
       * A carrier's sack burst as it died (the Brood Hauler, `carrier` in its content; sim/
       * carrier.ts), right after its EnemyDied: `young` tiny shapes scurry back along `route`
       * from route distance `dist` toward its spawn. Render-only: they're non-hostile,
       * untargetable, and leak nothing, so the sim keeps no entity for them.
       */
      readonly type: 'SackBurst';
      readonly uid: number;
      readonly enemy: K['enemy'];
      /** Where it burst, in tiles. */
      readonly x: number;
      readonly y: number;
      readonly route: RouteId;
      /** The carrier's distance along `route` when it died, in tiles. */
      readonly dist: number;
      readonly young: number;
    }
  | {
      readonly type: 'EnemyLeaked';
      readonly uid: number;
      readonly enemy: K['enemy'];
      /**
       * The core integrity this leak actually cost: the enemy's `leak`, 0 for a fleeing unit, and
       * never more than the integrity that was left.
       */
      readonly leak: number;
    }
  | {
      /**
       * A tower attacked: once per shot or pulse. `uid` is the projectile's (lobbed shells); 0
       * for attacks with no projectile entity (hitscan lands the same tick, a pulse hits around
       * the tower). From (x, y) at (targetX, targetY): the target's position, a shell's aim
       * point, or the tower itself for a pulse. Tiles.
       */
      readonly type: 'ProjectileFired';
      readonly uid: number;
      readonly towerUid: number;
      readonly kind: AttackKind;
      /** The primary target; 0 for a pulse. */
      readonly targetUid: number;
      readonly x: number;
      readonly y: number;
      readonly targetX: number;
      readonly targetY: number;
      /** The projectile's sprite (the firing tier's, fixed at fire time); null with none. */
      readonly sprite: SpriteId | null;
      /** A lobbed shell's flight time in ticks (it lands that many ticks later); else 0. */
      readonly flightTicks: number;
      /**
       * The area the attack covers, from the firing tier (tiles): a lobbed shell's splash radius,
       * a pulse's range; 0 for single-target attacks. Lets the renderer size its rings without
       * looking the tower up (it may be sold by the time a shell lands).
       */
      readonly radiusTiles: number;
    }
  | {
      /**
       * An attack landed: a hitscan shot (same tick as ProjectileFired), a shell's impact, or a
       * pulse. `uid` as in ProjectileFired. (x, y) is the impact point in tiles; `hits` counts
       * the enemies it damaged (0: a shell that landed on nothing).
       */
      readonly type: 'ProjectileHit';
      readonly uid: number;
      readonly towerUid: number;
      readonly x: number;
      readonly y: number;
      readonly hits: number;
      /**
       * The HP it took, summed over its victims (applyDamage's return: shield-absorbed damage and
       * overkill don't count). The emitter fills it in once the damage has landed, so the event
       * still precedes the EnemyDied events its hit causes. The harness's per-tower damage tally.
       */
      readonly damage: number;
      /**
       * Armor blunted it: some victim's armor, after pierce and Corroded, still subtracted from the
       * hit (combat/damage.ts `armorReduces`). Audio's "plink" (enemies.md § 3, Armored's tell).
       */
      readonly reduced: boolean;
    }
  | {
      /**
       * A tower's shot hit a neutral unit (Gerald, core-loop.md § 2.7): no damage, a plink, and
       * QUILL's bark; `stats.neutralHits` counts it (T304a). Position in tiles.
       */
      readonly type: 'NeutralHit';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly towerUid: number;
      readonly x: number;
      readonly y: number;
    }
  | {
      /**
       * A neutral unit reached the end of its route (Gerald delivered the mail) and left the map:
       * never a leak, so no integrity, tag, or Perfect Core cost (T304a). Render releases its view
       * here. Position in tiles.
       */
      readonly type: 'NeutralExited';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly x: number;
      readonly y: number;
    }
  | {
      /**
       * A boss entered phase `phase` (1-based; design/enemies.md § 6): the phase marker on its bar,
       * the telegraph, and the `bossPhase` script trigger and bark. Phase 1 fires as it spawns;
       * each later one comes with `Enemy.invulnerableTicks` of invulnerability (T304c).
       */
      readonly type: 'BossPhase';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly phase: number;
    }
  | {
      /**
       * A boss fight ended without a death (enemies.md § 6.1): `driveOff` (Chitterbloom at 0%),
       * `retreat`, `pivot`, or `layToRest`. Never a leak, never a kill. Emitted as the ending starts:
       * the boss (and, for `driveOff`, its wave's other units) is then `Enemy.leaving` and is off
       * the map within BOSS_LEAVE_MAX_SEC, with no further event (T304c).
       */
      readonly type: 'BossEnded';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly how: BossEnding;
    }
  | {
      /**
       * The salvage drone cleared a wreckage tile (design/maps.md § 3): it is now `to`, and
       * `salvage` credits were paid (T304b).
       */
      readonly type: 'WreckageCleared';
      readonly tile: GridPos;
      readonly to: TileChar;
      readonly salvage: number;
    }
  | {
      readonly type: 'TowerBuilt';
      readonly uid: number;
      readonly tower: K['tower'];
      readonly tile: GridPos;
      readonly cost: number;
    }
  | {
      readonly type: 'TowerUpgraded';
      readonly uid: number;
      readonly tier: number;
      readonly cost: number;
    }
  | { readonly type: 'TowerSold'; readonly uid: number; readonly refund: number }
  | {
      /** Tier 3 → tier 4 (T202b). */
      readonly type: 'TowerSpecialized';
      readonly uid: number;
      readonly spec: SpecChoice;
      readonly cost: number;
    }
  | {
      /** A holdFire command took effect (T206a). `target` as in the command. */
      readonly type: 'HoldFireChanged';
      readonly target: number | 'all';
      readonly on: boolean;
    }
  | {
      /** A spareRunners command took effect (T206a). `target` as in the command. */
      readonly type: 'SpareRunnersChanged';
      readonly target: number | 'all';
      readonly on: boolean;
    }
  /**
   * Story-facing: `stats.ticksSinceFiredAtSkitterkin` reached NOT_FIRING_TICKS in wave `wave`
   * (sim/fireControl.ts; the "not firing" bark, core-loop.md § 6.3). At most once a wave (T330).
   */
  | { readonly type: 'NotFiringAtSkitterkin'; readonly wave: number }
  | {
      /**
       * A synergy link became active between towers `a` and `b` (design/towers.md § 6; T202a).
       * `link` is a link id (content/links/).
       */
      readonly type: 'LinkFormed';
      readonly link: string;
      readonly a: number;
      readonly b: number;
    }
  | {
      /** An active link ended: a partner was sold or jammed (T202a). */
      readonly type: 'LinkBroken';
      readonly link: string;
      readonly a: number;
      readonly b: number;
    }
  | {
      /** An ally unit appeared (design/maps.md § 5.4; T207a). Position in tiles. */
      readonly type: 'AllySpawned';
      readonly uid: number;
      readonly kind: AllyKind;
      readonly x: number;
      readonly y: number;
    }
  | {
      /**
       * An ally attacked (Bricks's rivet cannon; T207a): from (x, y) at its target's position.
       * Its damage lands through the damage pipeline like a hitscan tower's.
       */
      readonly type: 'AllyAttacked';
      readonly uid: number;
      readonly targetUid: number;
      readonly x: number;
      readonly y: number;
      readonly targetX: number;
      readonly targetY: number;
    }
  /** An ally left the map (walked off, or its script removed it; T207a). */
  | { readonly type: 'AllyRemoved'; readonly uid: number }
  | {
      /**
       * A medal's status changed (T202c): `forfeited` the moment it can no longer be earned this
       * run (Perfect Core's first counted leak, an event condition broken), `earned` at victory.
       */
      readonly type: 'MedalProgress';
      readonly medal: MedalKind;
      readonly status: 'earned' | 'forfeited';
    }
  | {
      /**
       * An optional objective settled (T304f; sim/objectives.ts): `done` the moment its condition
       * holds for good or at victory, `failed` the moment it can't hold (Clean Audit's first late
       * sell) or on a loss. `id` is the objective's map id.
       */
      readonly type: 'ObjectiveProgress';
      readonly id: string;
      readonly status: 'done' | 'failed';
    }
  | { readonly type: 'TowerClassUnlocked'; readonly tower: K['tower'] }
  | {
      /** Wave `wave` began spawning. `early`: called during its countdown, paying `bonus`. */
      readonly type: 'WaveStarted';
      readonly wave: number;
      readonly early: boolean;
      /** The early-call bonus credited (core-loop.md § 2.4); 0 when not called early. */
      readonly bonus: number;
    }
  | {
      /**
       * Wave `wave` resolved: every enemy in it died or leaked (core-loop.md § 2.1). Waves can
       * overlap, so they can resolve out of order. `bonus` is the clear bonus credited.
       */
      readonly type: 'WaveCleared';
      readonly wave: number;
      readonly bonus: number;
    }
  | {
      /** A wave-phase trigger is reached: wave `wave`'s build-phase countdown began (W1: setup). */
      readonly type: 'CountdownStarted';
      readonly wave: number;
      /** The countdown's length in ticks; 0 for wave 1 (the setup phase has no countdown). */
      readonly ticks: number;
    }
  /** A map-script cue (story binds it to a scene or bark). */
  | { readonly type: 'ScriptCue'; readonly cueId: string }
  | {
      readonly type: 'AbilityUsed';
      readonly slot: 1 | 2;
      /**
       * The strike zone's uid (render draws its reticle until the zone resolves); 0 when the
       * ability makes no zone.
       */
      readonly uid: number;
      readonly ability: K['ability'];
      readonly target: GridPos | null;
    }
  // ── Act II (T400a seams; each names the task that emits it) ─────────────────────────────────
  | {
      /**
       * A Hollow unit began the hush tell on a hushable unit (enemies.md § 5.4; T402): it stops
       * for HUSH_TELL_SEC. `victim` is the hushable unit's uid (an enemy, or later an ally).
       */
      readonly type: 'HushStarted';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly victim: number;
      readonly x: number;
      readonly y: number;
    }
  | {
      /**
       * The hush landed (T402): `victim` is removed (no leak, no bounty, not processed), and the
       * Hollow unit heals to full and turns Heavy (TurnedHeavy follows). The `skitterkin_hushed`
       * bark's trigger. `victimEnemy` is the victim's enemy id (null for an ally).
       */
      readonly type: 'Hushed';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly victim: number;
      readonly victimEnemy: K['enemy'] | null;
      /**
       * The hushed ally's kind (a refugee, a singer, a bearer; T305c), for the `ally_hushed` bark
       * (T513); absent when the victim is an enemy.
       */
      readonly victimAlly?: AllyKind;
      readonly x: number;
      readonly y: number;
    }
  | { readonly type: 'TurnedHeavy'; readonly uid: number; readonly enemy: K['enemy'] }
  | {
      /** A Skittish unit bolted (T402): an ally within SKITTISH_RADIUS_TILES died or was hushed. */
      readonly type: 'SkittishBolt';
      readonly uid: number;
    }
  | {
      /**
       * A shield pulse's tell began (`tell`), it fired (`fired`: `restored` units got shield back
       * within `radiusTiles` of (x, y)), or Stasis cancelled its tell (`interrupted`; restored 0).
       * The ring and chime for render and audio (enemyAbilities/pulse.ts).
       */
      readonly type: 'ShieldPulse';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly phase: 'tell' | 'fired' | 'interrupted';
      readonly x: number;
      readonly y: number;
      readonly radiusTiles: number;
      readonly restored: number;
    }
  | {
      /**
       * A hit landed on a shield (the damage pipeline, combat/damage.ts): the ripple at the unit's
       * (x, y); `broken` when it took the shield to 0 (the shatter).
       */
      readonly type: 'ShieldHit';
      readonly uid: number;
      readonly x: number;
      readonly y: number;
      readonly broken: boolean;
    }
  | {
      /** A blink's tell began (T404): it blinks to (toX, toY) after the tell unless interrupted. */
      readonly type: 'BlinkTell';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly x: number;
      readonly y: number;
      readonly toX: number;
      readonly toY: number;
    }
  | {
      /** A unit blinked from (x, y) to (toX, toY): the afterimage (T404). */
      readonly type: 'Blinked';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly x: number;
      readonly y: number;
      readonly toX: number;
      readonly toY: number;
    }
  | { readonly type: 'BlinkInterrupted'; readonly uid: number }
  | {
      /**
       * A pulse tower's burst went off (Flash Freeze; T407a), or a Stasis Bloom's field pulsed
       * (sim/systems/fields.ts; T608): its effects reached every enemy the pulse reaches within
       * `radiusTiles` of the tower at (x, y), and `frozen` of them entered Stasis (a boss's
       * converted chill, an immune unit, or one already frozen doesn't count). The frost ring for
       * render and audio.
       */
      readonly type: 'PulseBurst';
      readonly towerUid: number;
      readonly x: number;
      readonly y: number;
      readonly radiusTiles: number;
      readonly frozen: number;
    }
  | {
      /**
       * Gravity Well (the Stasis Bloom's spec A; sim/systems/fields.ts, T608): its pulse pulled
       * unit `uid` back along its route from (fromX, fromY) to (x, y), `tiles` along the route
       * (less near the route's start). For render's streak and audio.
       */
      readonly type: 'PulledBack';
      readonly uid: number;
      readonly towerUid: number;
      readonly fromX: number;
      readonly fromY: number;
      readonly x: number;
      readonly y: number;
      readonly tiles: number;
    }
  | {
      /**
       * A tower paid income (sim/towerEconomy.ts; T408): the Salvage Crane's per-wave income or
       * Haggler's Stall's interest as wave `wave` resolved (at the tower), or a kill's credits (a
       * Crane's kill bonus or a link's, Reel It In; at the dying unit, wave = its wave). Already
       * credited. Position in tiles: where render floats the `+credits`.
       */
      readonly type: 'TowerIncome';
      readonly towerUid: number;
      readonly kind: 'wave' | 'kill' | 'interest';
      readonly credits: number;
      readonly wave: number;
      readonly x: number;
      readonly y: number;
    }
  /** A cloaked unit became Revealed (T406), or slipped back into its cloak (`Cloaked`). */
  | { readonly type: 'Revealed'; readonly uid: number }
  | { readonly type: 'Cloaked'; readonly uid: number }
  | {
      /**
       * A leak along an asset route hit the Protect map's asset (T305a): `lost` meter it cost (a
       * boss drains it all). Position in tiles.
       */
      readonly type: 'AssetHit';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly lost: number;
      readonly x: number;
      readonly y: number;
    }
  /** The asset meter reached 0: the map is lost (MapLost follows; T305a). */
  | { readonly type: 'AssetLost' }
  | {
      /**
       * A retry checkpoint (architecture.md § Checkpoints; T305b): wave `wave`'s countdown began
       * (every CHECKPOINT_EVERY_WAVES-th wave from CHECKPOINTS_FROM_ACT; `checkpointAt` in
       * systems/waves.ts; later the finale's `checkpoint` action). The host records
       * `{ wave, tick, commandCount }`.
       */
      readonly type: 'CheckpointReached';
      readonly wave: number;
      /**
       * The tick a retry resumes at: the state after the tick that emitted this (`state.tick`
       * once it ends). Replaying the logged commands with `tick` below it reproduces that state.
       */
      readonly tick: number;
      /**
       * A script checkpoint's label (the finale's `checkpoint: 'halls'`, "Retry from the Halls";
       * T806); absent on a wave checkpoint.
       */
      readonly label?: string;
    }
  | {
      /** A clickable world object turned on or off (`setClickable`; T409). */
      readonly type: 'ClickableChanged';
      readonly marker: string;
      readonly on: boolean;
    }
  | {
      /** The player interacted with a clickable object, or its fallback fired (`byFallback`; T409). */
      readonly type: 'Interacted';
      readonly marker: string;
      readonly byFallback: boolean;
    }
  // ── Act II, part two (T500a seams; each names the task that emits it) ─────────────────────────
  | {
      /**
       * Phasing (T503; enemies.md § 2.6): the flicker tell began (`tell`), the unit is Phased
       * (`in`: nothing targets or hits it), it is back (`out`), or Stasis or Unnerved cancelled the
       * tell (`interrupted`). Position in tiles.
       */
      readonly type: 'PhaseShift';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly phase: 'tell' | 'in' | 'out' | 'interrupted';
      readonly x: number;
      readonly y: number;
    }
  | {
      /**
       * A shield-broken boss's shield came back to full (T506: `reformTicks` ran out with a shard
       * still alive; enemies.md § 6, the Penitent). Position in tiles.
       */
      readonly type: 'ShieldReformed';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly x: number;
      readonly y: number;
    }
  | {
      /**
       * A hostile unit began standing down (`standDown`, the pivot; T506): it stops and fades out
       * over STAND_DOWN_FADE_SEC, then is removed with no further event (no leak, no bounty).
       */
      readonly type: 'StoodDown';
      readonly uid: number;
      readonly enemy: K['enemy'];
      readonly faction: EnemyFaction;
      readonly x: number;
      readonly y: number;
    }
  | {
      /** `setObjective` ran (T305c): the map is now `objective`, its meter labeled `meterLabel`. */
      readonly type: 'ObjectiveChanged';
      readonly objective: ObjectiveKind;
      readonly meterLabel: MeterLabel;
    }
  | {
      /** A refugee reached the safe exit (T305c): `stats.evacuated` + 1 (Pebble: `pebble`, not counted). */
      readonly type: 'RefugeeEvacuated';
      readonly uid: number;
      readonly pebble: boolean;
    }
  | {
      /**
       * A refugee was lost (T305c): hushed on the road (`hushed`, after its Hushed event) or at the
       * safe exit by an enemy that got there (`exit`: one already sheltered). `stats.refugeesLost`
       * + 1. `uid` is the hushed refugee's (0 for `exit`: a sheltered one has no entity);
       * `enemyUid` is the unit that hushed it or reached the exit.
       */
      readonly type: 'RefugeeLost';
      readonly uid: number;
      readonly cause: 'hushed' | 'exit';
      readonly enemyUid: number;
    }
  | {
      /**
       * A tower's beam went on or off (T504): on when it locks a target, off when it has none. The
       * beam's own damage is ProjectileHit per beam tick; render reads `beamActive` and `beamRamp`.
       */
      readonly type: 'BeamChanged';
      readonly towerUid: number;
      readonly on: boolean;
    }
  | {
      /**
       * Echo Spike's echo (T507): `hits` enemies within `radiusTiles` of (x, y) took the echo of a
       * hit on the target there. Tiles.
       */
      readonly type: 'EchoBurst';
      readonly towerUid: number;
      readonly x: number;
      readonly y: number;
      readonly radiusTiles: number;
      readonly hits: number;
    }
  | {
      /**
       * Stillness landed (T507; a `stasisArea` ability, after its AbilityUsed): `frozen` units
       * entered Stasis within `radiusTiles` of (x, y) (a boss's converted chill doesn't count).
       */
      readonly type: 'StasisArea';
      readonly slot: 1 | 2;
      readonly x: number;
      readonly y: number;
      readonly radiusTiles: number;
      readonly frozen: number;
    }
  | {
      /**
       * Sundown (T505): wave `wave` started and the darkness began easing toward `dark` (a lighting
       * key's), from `state.dark`. Audio's dark ambience, the HUD's dark-range readout.
       */
      readonly type: 'DarknessShift';
      readonly wave: number;
      readonly dark: number;
    }
  // ── M6 (declared by T600a; emitted by the tasks each names) ─────────────────────────────────
  | {
      /**
       * A Maw's tendril tell began (T602): for its 1 s it draws `targetUid` (an enemy, or a refugee
       * ally when `ally`) toward it; Stasis or Unnerved interrupt it. Render's tendrils.
       */
      readonly type: 'GatherTell';
      readonly uid: number;
      readonly targetUid: number;
      readonly ally: boolean;
    }
  | {
      /**
       * A Maw gathered a unit (T602; enemies.md § 5.4): `victim` is an enemy id, or `'refugee'`
       * for a refugee ally (`victimUid` the ally's uid; a loss, `stats.refugeesGathered`). It
       * gained `hp` (to HP and max HP) and has `absorbs` now. Never a kill, a leak, or a bounty.
       */
      readonly type: 'Gathered';
      readonly uid: number;
      readonly victimUid: number;
      readonly victim: K['enemy'] | 'refugee';
      readonly hp: number;
      readonly absorbs: number;
    }
  | {
      /**
       * A rift lane opens a wave from now (T602; maps.md § 4: telegraphed a wave ahead): emitted as
       * wave `wave − 1` starts (on the run's first tick, the setup phase, for a lane open from W1).
       */
      readonly type: 'RiftOpening';
      readonly route: RouteId;
      readonly wave: number;
    }
  /** A rift lane opened as its wave started (T602): Hollow groups may walk it from now on. */
  | { readonly type: 'RiftOpened'; readonly route: RouteId; readonly wave: number }
  | {
      /**
       * A swarmling or Champion latched onto an enemy (T604), or let go (`on: false`) to run home.
       * Render's latch; audio's chitter.
       */
      readonly type: 'SwarmLatch';
      readonly uid: number;
      readonly enemyUid: number;
      readonly on: boolean;
    }
  /** A swarmling or Champion reached its Den (T604): the head-count chirp (towers.md § 8). */
  | { readonly type: 'SwarmHome'; readonly uid: number; readonly towerUid: number }
  | {
      /** Underfoot's trap sprang on an enemy (T604): Pinned and hit, once per enemy per trap. */
      readonly type: 'TrapSprung';
      readonly zoneUid: number;
      readonly enemyUid: number;
      readonly x: number;
      readonly y: number;
    }
  | {
      /**
       * A blocker took (`on`) or released an enemy (T605; Bricks at the Gap). His health is
       * `Ally.health`, on the timeline.
       */
      readonly type: 'Blocked';
      readonly allyUid: number;
      readonly enemyUid: number;
      readonly on: boolean;
    }
  | {
      /**
       * A scripted ally's health changed (T605: Bricks's timeline at the Gap; maps.md § 5.4), as a
       * fraction of full: the HUD's bar, `cue_vitals`.
       */
      readonly type: 'AllyHealthChanged';
      readonly uid: number;
      readonly health: number;
    }
  | {
      /**
       * A forced single input began (T605; core-loop.md § 2.11: A3M3's SEAL): waves, movement, and
       * firing freeze until a `scriptInput` command with `id` arrives (the sim keeps ticking).
       */
      readonly type: 'ForcedInputRequested';
      readonly id: string;
    }
  /** The forced input `id` was pressed (`scriptInput`; T605): the `forcedInputResolved` trigger. */
  | { readonly type: 'ForcedInputResolved'; readonly id: string }
  | {
      /**
       * A tower of a revoked class powered down and folded away (T606; towers.md § 9): its
       * `refund` (100% of what was paid) is credited. The LICENSE REVOKED stamp shows 1 s.
       */
      readonly type: 'TowerRevoked';
      readonly uid: number;
      readonly tower: K['tower'];
      readonly refund: number;
    }
  | {
      /**
       * A tower class was revoked for the rest of the map (T606; `revokeTowerClass`), with the
       * total `refund` over its towers (0 with none placed). `state.revoked.towers` records it.
       */
      readonly type: 'ClassRevoked';
      readonly tower: K['tower'];
      readonly refund: number;
    }
  | {
      /**
       * A commander ability was revoked (T606; `revokeAbility`: A3M2's Orbital Strike): `slot` goes
       * dark ("UPLINK REVOKED"), or null when it wasn't equipped. `state.revoked.abilities`.
       */
      readonly type: 'AbilityRevoked';
      readonly ability: K['ability'];
      readonly slot: 1 | 2 | null;
    }
  | {
      /** A script modifier turned on or off (T606; `setModifier`: QUILL's lockout, A3M2). */
      readonly type: 'ModifierChanged';
      readonly modifier: 'quillLockout' | 'previewHidden';
      readonly on: boolean;
    }
  // ── M7 (declared by T700a; emitted by the tasks each names) ─────────────────────────────────
  | {
      /**
       * A jammer's tell began (enemies.md § 4): the Auditor's `ring` (T707), every tower in its
       * reach now, or the Silencer's `tendril` (T702), the one tower it picked. Render's ring and
       * tendril; audio's `jam_ring` / `jam_tendril`.
       */
      readonly type: 'JamTell';
      readonly uid: number;
      readonly kind: 'ring' | 'tendril';
      readonly towers: readonly number[];
    }
  | {
      /**
       * A tower was Jammed for `ticks` (its `jamMul` applied; T702) by `source`: a jammer's uid,
       * or a boss's for Hostile Takeover (T707).
       */
      readonly type: 'TowerJammed';
      readonly uid: number;
      readonly ticks: number;
      readonly source: number;
    }
  /** A tower's jam ended, or System Reboot cleared it (T702); its immunity starts. */
  | { readonly type: 'TowerUnjammed'; readonly uid: number }
  /** A jammer's tell was interrupted by Stasis or Unnerved (T702): its period restarts. */
  | { readonly type: 'JamInterrupted'; readonly uid: number }
  /** System Reboot ran (T702): `towers` were unjammed (empty: none were), all now immune. */
  | { readonly type: 'Rebooted'; readonly towers: readonly number[] }
  /** Hostile Takeover's laser began (T707): `towers` are its targets, jammed as it ends. */
  | { readonly type: 'TakeoverTell'; readonly uid: number; readonly towers: readonly number[] }
  /** Shareholder Value jettisoned its plating (T707): armor 0, Haste; its plates land next. */
  | { readonly type: 'Jettisoned'; readonly uid: number }
  /** A script opened a marker's tile (`openTile`; T707): it is now `to` (a jettison plate: 'x'). */
  | { readonly type: 'TileOpened'; readonly marker: string; readonly to: TileChar }
  /** A boss split (T708): `parts` are the new units' uids; one boss bar sums them. */
  | { readonly type: 'BossSplit'; readonly uid: number; readonly parts: readonly number[] }
  /** A split boss's survivors merged into `uid` (T708), enraged. */
  | { readonly type: 'BossMerged'; readonly uid: number }
  /**
   * A split with no merge (T808, the Unsung): its last part fell and the boss rose again as `uid`,
   * in its next phase (BossPhase came just before), where that part fell.
   */
  | { readonly type: 'BossRisen'; readonly uid: number }
  /**
   * A boss came up from a dig toward the choir (T808) at `at`: among the singers, hushing `hushed`
   * (a singer's uid; 0: none in reach), or `dugOut` short of them by a burrow answer's hit.
   */
  | {
      readonly type: 'BossSurfaced';
      readonly uid: number;
      readonly at: readonly [x: number, y: number];
      readonly dugOut: boolean;
      readonly hushed: number;
    }
  /** A boss phase's adds walked in at its route's spawn (T808, the Song's Silencers). */
  | { readonly type: 'BossAdds'; readonly uid: number; readonly enemy: string; readonly count: number }
  /** A Sproing Pad's leaper bonked an enemy (T704): render's arc, audio's boing. */
  | { readonly type: 'LeaperBonk'; readonly tower: number; readonly target: number }
  /** A leaper's bonk Pinned a flyer for `ticks` (T704): grounded, so ground towers hit it. */
  | { readonly type: 'FlyerGrounded'; readonly uid: number; readonly ticks: number }
  /** Big Glorp's puddle landed (T705) at `at` (tile coordinates of its centre). */
  | {
      readonly type: 'PuddleSpawned';
      readonly zoneUid: number;
      readonly at: readonly [x: number, y: number];
    }
  /** A bearer reached home (T706): no meter change; `stats.bearersHome` counts it. */
  | { readonly type: 'BearerHome'; readonly uid: number; readonly group: string }
  /** A script group walked in (`spawnWave`; T706). */
  | { readonly type: 'ScriptGroupSpawned'; readonly id: string }
  // ── The finale (declared by T800a; emitted by the tasks each names) ───────────────────────────
  /** The map's script phase changed (`setPhase`; T806): the finale's 2 (the Unsung), 3 (Dawn). */
  | { readonly type: 'PhaseChanged'; readonly phase: number }
  /** The choir halted (a Hollow unit close ahead of its leader) or walked on (T804). */
  | { readonly type: 'ChoirHalted'; readonly on: boolean }
  /** A singer was hushed (T804): it stops singing and trails behind; Voices falls by one. */
  | { readonly type: 'SingerHushed'; readonly uid: number }
  /** A Hollow unit was laid to rest inside the song (T805) at `at`, for `points` rest points. */
  | {
      readonly type: 'LaidToRest';
      readonly uid: number;
      readonly at: readonly [x: number, y: number];
      readonly points: number;
    }
  /** A Hollow unit fell outside the song and scattered (T805; Phase 2), from `at`. */
  | {
      readonly type: 'Scattered';
      readonly uid: number;
      readonly at: readonly [x: number, y: number];
    }
  /** A scattered unit re-formed (T805). */
  | { readonly type: 'Reformed'; readonly uid: number }
  /** A secondary timer filled (T806): the Deep Bore's breakthrough. */
  | { readonly type: 'TimerFull'; readonly id: string }
  /** A `setLighting` changed the light (T806): render eases to `key` (Dawn). */
  | { readonly type: 'LightingSet'; readonly key: string }
  /** A revoked class came back (`restoreTowerClass`; T807): "Not Everglow." */
  | { readonly type: 'ClassRestored'; readonly tower: K['tower'] }
  /** An ability was locked or unlocked for the phase (`lockAbility`; T807: Directive 0). */
  | { readonly type: 'AbilityLocked'; readonly ability: string; readonly on: boolean }
  /** Thrum's echo reached the song and was laid to rest in gold (`spawnEcho`; T807). */
  | { readonly type: 'EchoArrived'; readonly id: string }
  /** Dawn broke (T805/T806: p reached 1; every Hollow unit laid to rest, singers recover). */
  | { readonly type: 'DawnBroke' }
  | { readonly type: 'MapWon' }
  | { readonly type: 'MapLost' }
  | { readonly type: 'CommandRejected'; readonly cmd: Command<K>; readonly reason: RejectReason };
export type SimEventType = SimEvent['type'];
