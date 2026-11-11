// Feature gates: what createSim refuses until its task lands (architecture.md § Sim public API).
// D013's rule is "refuse, don't ignore": a config the sim can't simulate yet throws, so a run (or
// the balance harness) never silently plays a different game than its config describes.
//
// One row per feature, valued with the task that lifts it. That task sets its own row to `null`
// when its behavior is live (and never touches another row), so the sim tasks can land in any
// order without sharing more than one line of this file.
//
// Features come from three places: the config (a companion, slot 2, specs, difficulty, each
// modifier kind, and each ability effect in a slot), the loadout's reachable tiers (attack kinds
// and on-hit statuses; T400a: detection, economy, homing, charge, line, and target filters; T500a:
// echoes, area Marks, and Truthlight's `noEvade`), and the map (T300a: flyers, neutral units, enemy
// abilities, bosses, and optional objectives; T400a: the hush rule, Skittish, shield pulses, blinks,
// cloaks, Protect, revisits, and clickable objects; T500a: phasing, shield auras, a boss's
// shield-broken phase, Escort, and Sundown's darkness; T600a: gathering, haste auras, rift lanes,
// the Holdout, and blockers; T700a: jamming (the tendril, the ring), healer auras, the M7 boss
// phases, bearers, and flag-gated ally posts). The loadout adds T600a's Lullaby and the Bloom's
// field, and slot 2 Underfoot's trap (`pathTrap`); T700a the Sproing Pad's leapers, Big Glorp's
// puddle, System Reboot (`reboot`), and C4 Purge's faction armor modifier. Wreckage needs no gate: the `clear`
// command and the salvage drone run since T304b (systems/wreckage.ts).
//
// A tower registered ahead of its task (content/towers/index.ts STUB_TOWER_TASKS, which names
// the task) is refused whole, whatever its tiers use: its numbers are a stub until the task
// confirms them. That list is its one home; the task lifts it by deleting the tower's entry there.
//
// `run.checkpoints` refuses nothing (no config asks for a checkpoint); the waves system emits
// CheckpointReached since T305b, so its row is null.
// `towerRefusal` and `abilityRefusal` answer the same question for one raw tower or ability, so
// meta can keep a save that runs ahead of the sim out of play.
import type { CompiledEnemyDef, CompiledMapDef } from '../content/compiled.ts';
import { STUB_TOWER_TASKS } from '../content/towers/index.ts';
import type { AbilityEffect, AttackKind, IdSpace, StatusId } from '../content/types.ts';
import type { EconomyStat, Modifier, SimConfig } from './config.ts';
import { hasDarkness } from './darkness.ts';

/** A task id from tasks.md (`T304a`), or a later milestone (`M5`) for features with no task yet. */
export type GateOwner = `T${number}${string}` | `M${number}`;

export type Feature =
  /** A companion (`SimConfig.companion`) and its ally post: the allies system. */
  | 'companion'
  /** Commander ability slot 2 (`abilities.slot2` / `slot2State`). */
  | 'abilitySlot2'
  /** A non-empty `specsUnlocked` (the `specialize` command). */
  | 'specs'
  /** `difficulty: 'story'` (its effects arrive as modifiers; this proves they're applied). */
  | 'storyDifficulty'
  /**
   * An attack kind or on-hit status the towers system doesn't run yet (D020), on any tier a
   * loadout tower can reach: tiers 1–3, plus its specs when they're in `specsUnlocked`.
   */
  | 'attack.projectile'
  | 'attack.beam'
  | 'attack.chain'
  | 'attack.spawner'
  /** A homing or multi-shot (`volley` > 1) projectile (Seeker Swarm; T407b). */
  | 'attack.homing'
  | 'attack.charge'
  | 'attack.line'
  /** The Sproing Pad's leapers (T704). */
  | 'attack.leaper'
  /** An attack with a `targetFilter` (Magnet Crane; T408). */
  | 'attack.targetFilter'
  | 'status.pinned'
  | 'status.stasis'
  | 'status.unnerved'
  /** A tier with `detect` (the Lookout Shack; T406). */
  | 'tower.detection'
  /** A tier with `economy` (the Salvage Crane; T408). */
  | 'tower.economy'
  /** A hitscan `echo` (Mindspike [Echo Spike]; T507). */
  | 'attack.echo'
  /** A tier with `markArea` (Seer's Lantern [All-Seeing]; T508). */
  | 'tower.markArea'
  /** A `noEvade` Mark (Seer's Lantern [Truthlight]; T508). */
  | 'status.noEvade'
  /**
   * A commander ability effect in slot 1 or 2 that the abilities system doesn't run yet. Time
   * Dilation (`slowAll`) and Clearance Sale (`discount`, with its wave-count cooldown) run since
   * T304d.
   */
  | 'ability.slowAll'
  | 'ability.discount'
  /** Scanner Sweep (T406). */
  | 'ability.reveal'
  /** Stillness (T507). */
  | 'ability.stasisArea'
  /** Underfoot's trap (T604). */
  | 'ability.pathTrap'
  /** A tier with `lull` (the Hum Choir [Lullaby]: Lulled; T607). */
  | 'status.lulled'
  /** A tier with `field` (the Stasis Bloom; T608). */
  | 'tower.field'
  /** A tier with `puddle` (the Gloop Spitter's Big Glorp; T705). */
  | 'tower.puddle'
  /** System Reboot (`reboot`; T702). */
  | 'ability.reboot'
  /** A wave group of flyers: an air-layer enemy or an air lane (air targeting; T304a). */
  | 'enemy.flying'
  /** A neutral unit in the waves (Gerald: targeted, never hurt, never leaks). */
  | 'enemy.neutral'
  /** An enemy ability in the waves (sim/enemyAbilities/). */
  | 'enemy.burrow'
  | 'enemy.split'
  | 'enemy.huddle'
  /** A boss in the waves: its phases, its ending, and the boss-leak rule. */
  | 'enemy.boss'
  /** A boss whose ending isn't `driveOff` or `retreat` (Act II–III's `pivot`, the finale's). */
  | 'enemy.boss.pivot'
  | 'enemy.boss.layToRest'
  /**
   * The hush rule (a non-boss Hollow unit in the waves; T402), and Skittish (a `fleeing` group on
   * a map that also sends hushing units: the mixed waves Skittish is defined for, so Act I
   * fixtures' fleeing runners keep their M2 rules until T402).
   */
  | 'enemy.hush'
  | 'enemy.skittish'
  /** A shield pulse, on a unit or a boss phase (T403). */
  | 'enemy.pulse'
  /** A blink, on a unit or a boss phase (T404). */
  | 'enemy.blink'
  /** A cloaked unit (T406). */
  | 'enemy.cloak'
  /** Phasing (the Rift Moth; T503). */
  | 'enemy.phase'
  /** A shield-recharge aura (the Aegis Cantor; T502). */
  | 'enemy.shieldAura'
  /** Gathering (the Maw; T602). */
  | 'enemy.gather'
  /** A haste aura (the Expediter; T603). */
  | 'enemy.hasteAura'
  /** Jamming (enemies.md § 4): the Jammed state and a `tendril` jammer (the Silencer; T702). */
  | 'enemy.jam'
  /** A `ring` jammer (the Auditor; T707). */
  | 'enemy.jam.ring'
  /** A healer aura (the Maintenance Associate; T703). */
  | 'enemy.healAura'
  /** M7's boss phase kinds: Shareholder Value's hangar, Hostile Takeover, and jettison (T707). */
  | 'enemy.boss.hangar'
  | 'enemy.boss.takeover'
  | 'enemy.boss.jettison'
  /** The Gathering Maw's phase gather (T708) and its split and merge (T708). */
  | 'enemy.boss.gather'
  | 'enemy.boss.split'
  /** Bearer groups (`kind: 'bearer'`, A3M5's asset that walks; T706). */
  | 'map.bearers'
  /** An ally post gated on a story flag (`AllyPostDef.when`: A3M6's militia; T706). */
  | 'ally.flagGated'
  /** Rift lanes: Hollow routes that open at a wave, telegraphed a wave ahead (T602). */
  | 'map.rift'
  /** The Holdout (A3M3; no defeat, an Evacuated score, ended by script; T605). */
  | 'map.holdout'
  /** A blocker ally (`AllyPostDef.block`: Bricks at the Gap, his health on a timeline; T605). */
  | 'ally.blocker'
  /** A boss phase that begins when its shield breaks, and its shards (the Penitent; T506). */
  | 'enemy.boss.shieldBroken'
  /** Escort: refugees, the safe exit, the Evacuated meter (`escort` maps and pivots; T305c). */
  | 'map.escort'
  /** Sundown: a lighting key with `dark` > 0, or lamps (T505). */
  | 'map.darkness'
  /** Optional objectives (Objective Intel). */
  | 'map.objectives'
  /** Protect the asset: a `protect` map's asset meter (T305a). */
  | 'map.protect'
  /** A revisit (`revisitOf`), composed from the original by reference (T410a). */
  | 'map.revisit'
  /** Clickable world objects (`clickables`, `setClickable`, `interact`; T409). */
  | 'map.clickable'
  /** Retry checkpoints: refuses nothing (see the header); emitted since T305b. */
  | 'run.checkpoints'
  | 'modifier.towerStat'
  | 'modifier.towerCost'
  | 'modifier.enemyStat'
  /** A faction's armor (C4 Purge's −2 on Everglow, min 0; T703). */
  | 'modifier.enemyStat.faction'
  | 'modifier.economy.startCredits'
  | 'modifier.economy.coreIntegrity'
  | 'modifier.economy.bounty'
  | 'modifier.economy.earlyCallBonus'
  | 'modifier.economy.salvage'
  | 'modifier.economy.clearSpeed'
  | 'modifier.sellRefund'
  | 'modifier.abilityStat'
  | 'modifier.countdown'
  | 'modifier.linkBonus'
  | 'modifier.tileBonus'
  /** A support tower's tune-up (the Lookout's; T406). */
  | 'modifier.supportStat'
  | 'modifier.leakAbsorb'
  | 'modifier.firstBuildFree'
  | 'modifier.freeCast';

/** Towers registered ahead of their task, and the task each waits for. */
export type StubTowers = Readonly<Record<string, GateOwner>>;

/**
 * The task a tower registered ahead of its task waits for (content's STUB_TOWER_TASKS), or
 * null for any other tower. Meta keeps a refused stub's license and spec unlock off the shelves.
 */
export function stubTowerGate(id: string, stubs: StubTowers = STUB_TOWER_TASKS): GateOwner | null {
  return Object.hasOwn(stubs, id) ? (stubs[id] ?? null) : null;
}

/**
 * Refused features and the task that lifts each; `null` once it's simulated. Map-script refusals
 * (triggers, actions, `when` conditions) are separate: `unsupportedScript` in systems/triggers.ts.
 */
export const FEATURE_GATES: Readonly<Record<Feature, GateOwner | null>> = Object.freeze({
  companion: null,
  abilitySlot2: null,
  specs: null,
  storyDifficulty: null,
  // Skyhook's flak (a projectile with a burst; T304a) and Zapcoil's chain (T304b) are M3's. M4
  // (D101): Stasis with Flash Freeze (T407a, live), homing and charge with the Skyhook and Zapcoil specs
  // (T407b, live), Pin, line, target filters, and tower economy with the Harpoon and Crane (T408,
  // live), detection with the Lookout (T406, live). M5 (D137): beams with the Prism (T504, live), Unnerved
  // and echoes with the Mindspike and Stillness's Stasis area (T507, live), area Marks and Truthlight
  // with the Lantern (T508, live). M6 (D141): spawners with the Scuttle Den (T604, live), Lulled with the
  // Hum Choir's Lullaby (T607, live), the Stasis Bloom's field (T608, live).
  'attack.projectile': null,
  'attack.beam': null,
  'attack.chain': null,
  'attack.spawner': null,
  'attack.homing': null,
  'attack.charge': null,
  'attack.line': null,
  'attack.targetFilter': null,
  'status.pinned': null,
  'status.stasis': null,
  'status.unnerved': null,
  'tower.detection': null,
  'tower.economy': null,
  'attack.echo': null,
  'tower.markArea': null,
  'status.noEvade': null,
  'status.lulled': null,
  'tower.field': null,
  'modifier.towerStat': null,
  'modifier.towerCost': null,
  'modifier.enemyStat': null,
  'modifier.enemyStat.faction': null, // T703
  'modifier.economy.startCredits': null,
  'modifier.economy.coreIntegrity': null,
  'modifier.economy.bounty': null,
  'modifier.economy.earlyCallBonus': null,
  'modifier.economy.salvage': null,
  'modifier.economy.clearSpeed': null,
  'modifier.sellRefund': null,
  'modifier.abilityStat': null,
  'modifier.countdown': null,
  'modifier.linkBonus': null,
  'modifier.tileBonus': null,
  'modifier.supportStat': null,
  'modifier.leakAbsorb': null,
  'modifier.firstBuildFree': null,
  'modifier.freeCast': null,
  'ability.slowAll': null,
  'ability.discount': null,
  'ability.reveal': null,
  'ability.stasisArea': null,
  'ability.pathTrap': null,
  'enemy.flying': null,
  'enemy.neutral': null,
  'enemy.burrow': null,
  'enemy.split': null,
  'enemy.huddle': null,
  'enemy.boss': null,
  'enemy.boss.pivot': null,
  'enemy.boss.shieldBroken': null,
  // The finale's ending (D141: M8).
  'enemy.boss.layToRest': 'M8',
  'enemy.hush': null,
  'enemy.skittish': null,
  'enemy.pulse': null,
  'enemy.blink': null,
  'enemy.cloak': null,
  'enemy.phase': null,
  'enemy.shieldAura': null,
  // M6 (D141): the Hollow's Maw and rift lanes (T602), Everglow Security's haste aura (T603), the
  // Holdout and Bricks's block (T605).
  'enemy.gather': null,
  'enemy.hasteAura': null,
  // M7 (D146; T700a rows): jamming and System Reboot (T702), Everglow's healer and C4 Purge's armor
  // (T703), the Sproing Pad (T704), the Gloop Spitter's puddle (T705), bearers and flag-gated
  // posts (T706), the Auditor and Shareholder Value (T707), the Gathering Maw (T708).
  'attack.leaper': 'T704',
  'tower.puddle': null, // T705 lifted: sim/puddles.ts
  'ability.reboot': 'T702',
  'enemy.jam': 'T702',
  'enemy.jam.ring': 'T707',
  'enemy.healAura': null, // T703
  'enemy.boss.hangar': 'T707',
  'enemy.boss.takeover': 'T707',
  'enemy.boss.jettison': 'T707',
  'enemy.boss.gather': 'T708',
  'enemy.boss.split': 'T708',
  'map.bearers': 'T706',
  'ally.flagGated': 'T706',
  'map.rift': null,
  'map.holdout': null,
  'ally.blocker': null,
  'map.objectives': null,
  'map.protect': null,
  'map.revisit': null,
  'map.clickable': null,
  'map.escort': null,
  'map.darkness': null,
  'run.checkpoints': null,
});

type GatedKind = 'projectile' | 'beam' | 'chain' | 'spawner' | 'charge' | 'line' | 'leaper';
type GatedStatus = 'pinned' | 'stasis' | 'unnerved';
type GatedEffect = 'slowAll' | 'discount' | 'reveal' | 'stasisArea' | 'pathTrap' | 'reboot';

function isGatedKind(kind: AttackKind): kind is GatedKind {
  return (
    kind === 'projectile' ||
    kind === 'beam' ||
    kind === 'chain' ||
    kind === 'spawner' ||
    kind === 'charge' ||
    kind === 'line' ||
    kind === 'leaper'
  );
}

function isGatedStatus(status: StatusId): status is GatedStatus {
  return status === 'pinned' || status === 'stasis' || status === 'unnerved';
}

function isGatedEffect(kind: AbilityEffect['kind']): kind is GatedEffect {
  return (
    kind === 'slowAll' ||
    kind === 'discount' ||
    kind === 'reveal' ||
    kind === 'stasisArea' ||
    kind === 'pathTrap' ||
    kind === 'reboot'
  );
}

/** The gate a modifier needs open. */
export function modifierFeature(m: Modifier<IdSpace>): Feature {
  if (m.kind === 'enemyStat' && m.stat === 'armor') return 'modifier.enemyStat.faction';
  return m.kind === 'economy' ? economyFeature(m.stat) : `modifier.${m.kind}`;
}

function economyFeature(stat: EconomyStat): Feature {
  return `modifier.economy.${stat}`;
}

type Gates = Readonly<Record<Feature, GateOwner | null>>;
type Use = (f: Feature, what: string) => void;

/**
 * A tier as gates read it: a compiled tier, or an authored tier or patch (whose attack, if any,
 * may leave out its kind: a patch keeps the tier before's).
 */
interface GateTier {
  readonly attack?: {
    readonly kind?: AttackKind;
    /** A pulse's burst (Flash Freeze): its statuses are gated like the tier's own. */
    readonly burst?: {
      readonly effects?: readonly { readonly status?: StatusId; readonly noEvade?: boolean }[];
    } | null;
    readonly homing?: boolean;
    readonly volley?: number;
    readonly targetFilter?: object | null;
    readonly echo?: object | null;
  } | null;
  readonly effects?: readonly { readonly status?: StatusId; readonly noEvade?: boolean }[];
  readonly detect?: object | null;
  readonly economy?: object | null;
  readonly markArea?: object | null;
  readonly lull?: object | null;
  readonly field?: object | null;
  readonly puddle?: object | null;
}

/** The attack kinds, statuses, and tier abilities `tiers` use that have gates. */
function useTiers(tiers: readonly GateTier[], id: string, use: Use): void {
  for (const tier of tiers) {
    const a = tier.attack;
    const kind = a?.kind;
    if (kind !== undefined && isGatedKind(kind))
      use(`attack.${kind}`, `a '${kind}' attack (${id})`);
    if (a?.homing === true || (a?.volley ?? 1) > 1) {
      use('attack.homing', `a homing or volley projectile (${id})`);
    }
    if (a?.targetFilter !== undefined && a.targetFilter !== null) {
      use('attack.targetFilter', `a target filter (${id})`);
    }
    if (tier.detect !== undefined && tier.detect !== null)
      use('tower.detection', `detection (${id})`);
    if (tier.economy !== undefined && tier.economy !== null) {
      use('tower.economy', `tower economy (${id})`);
    }
    if (a?.echo !== undefined && a.echo !== null) use('attack.echo', `an echo (${id})`);
    if (tier.markArea !== undefined && tier.markArea !== null) {
      use('tower.markArea', `an area Mark (${id})`);
    }
    if (tier.lull !== undefined && tier.lull !== null) use('status.lulled', `Lullaby (${id})`);
    if (tier.field !== undefined && tier.field !== null) use('tower.field', `a field (${id})`);
    if (tier.puddle !== undefined && tier.puddle !== null) use('tower.puddle', `a puddle (${id})`);
    for (const e of [...(tier.effects ?? []), ...(a?.burst?.effects ?? [])]) {
      const status = e.status;
      if (status !== undefined && isGatedStatus(status)) {
        use(`status.${status}`, `the ${status} status (${id})`);
      }
      if (e.noEvade === true) use('status.noEvade', `a Truthlight Mark (${id})`);
    }
  }
}

/** The features an enemy in a map's waves needs. */
function useEnemy(def: CompiledEnemyDef, flyingRoute: boolean, use: Use): void {
  const id = def.id;
  if (def.layer === 'air' || flyingRoute) use('enemy.flying', `flyers (${id})`);
  if (def.neutral) use('enemy.neutral', `a neutral unit (${id})`);
  if (def.burrow !== null) use('enemy.burrow', `burrowing (${id})`);
  if (def.split !== null) use('enemy.split', `splitting (${id})`);
  if (def.huddle !== null) use('enemy.huddle', `a huddle (${id})`);
  if (def.boss !== null) {
    use('enemy.boss', `a boss (${id})`);
    const how = def.boss.ending;
    if (how === 'pivot' || how === 'layToRest') {
      use(`enemy.boss.${how}`, `a boss ending '${how}' (${id})`);
    }
  }
  if (def.hushes) use('enemy.hush', `the hush rule (${id})`);
  const phases = def.boss?.phases ?? [];
  if (def.pulse !== null || phases.some((p) => p.pulse !== null)) {
    use('enemy.pulse', `a shield pulse (${id})`);
  }
  if (def.blink !== null || phases.some((p) => p.blink !== null)) {
    use('enemy.blink', `a blink (${id})`);
  }
  if (def.cloaked) use('enemy.cloak', `a cloak (${id})`);
  if (def.phase !== null) use('enemy.phase', `phasing (${id})`);
  if (def.shieldAura !== null) use('enemy.shieldAura', `a shield aura (${id})`);
  if (def.gather !== null) use('enemy.gather', `gathering (${id})`);
  if (def.hasteAura !== null) use('enemy.hasteAura', `a haste aura (${id})`);
  if (phases.some((p) => p.onShieldBroken || p.shards !== null)) {
    use('enemy.boss.shieldBroken', `a shield-broken phase (${id})`);
  }
  // M7 (T700a).
  if (def.jam !== null) {
    use(
      def.jam.kind === 'ring' ? 'enemy.jam.ring' : 'enemy.jam',
      `a '${def.jam.kind}' jam (${id})`,
    );
  }
  if (def.healAura !== null) use('enemy.healAura', `a healer aura (${id})`);
  if (phases.some((p) => p.hangar !== null)) use('enemy.boss.hangar', `a hangar (${id})`);
  if (phases.some((p) => p.takeover !== null)) {
    use('enemy.jam', `Hostile Takeover's jam (${id})`);
    use('enemy.boss.takeover', `Hostile Takeover (${id})`);
  }
  if (phases.some((p) => p.jettison !== null)) use('enemy.boss.jettison', `a jettison (${id})`);
  if (phases.some((p) => p.gather !== null)) use('enemy.boss.gather', `a boss's gather (${id})`);
  if (phases.some((p) => p.split !== null)) use('enemy.boss.split', `a boss split (${id})`);
}

/** The features a map needs from its waves and layout (T300a; T400a). */
function useMap(map: CompiledMapDef<IdSpace>, use: Use): void {
  let hushes = false;
  let fleeing = false;
  for (const wave of map.waves) {
    for (const g of wave.groups) {
      useEnemy(g.enemy, g.route.kind === 'air', use);
      if (g.enemy.hushes) hushes = true;
      if (g.tags.includes('fleeing')) fleeing = true;
    }
  }
  if (hushes && fleeing) use('enemy.skittish', 'Skittish fleeing groups beside the Hollow');
  if (map.objectives.length > 0) {
    use('map.objectives', `optional objectives (${map.objectives.map((o) => o.id).join(', ')})`);
  }
  if (map.objective === 'protect' || map.asset !== null) use('map.protect', 'a Protect asset');
  if (map.revisitOf !== null) use('map.revisit', `a revisit of '${map.revisitOf}'`);
  const clickables = Object.keys(map.clickables);
  if (clickables.length > 0) use('map.clickable', `clickable objects (${clickables.join(', ')})`);
  if (map.objective === 'escort' || map.escort !== null) use('map.escort', 'an Escort (refugees)');
  if (hasDarkness(map)) use('map.darkness', "Sundown's darkness");
  const rifts = map.routeList.filter((r) => r.kind === 'rift').map((r) => r.id);
  if (rifts.length > 0) use('map.rift', `rift lanes (${rifts.join(', ')})`);
  if (map.objective === 'holdout') use('map.holdout', 'a Holdout');
  for (const a of map.allies) {
    if (a.block !== null) use('ally.blocker', `a blocker ('${a.kind}' at '${a.post}')`);
    if (a.when !== null) use('ally.flagGated', `a flag-gated post ('${a.kind}' at '${a.post}')`);
  }
  const bearers = (map.escort?.groups ?? []).filter((g) => g.kind === 'bearer').map((g) => g.id);
  if (bearers.length > 0) use('map.bearers', `bearers (${bearers.join(', ')})`);
  // A script group walks in only by `spawnWave` (SCRIPT_GATES), but its units are the map's too.
  for (const g of Object.values(map.scriptGroups)) {
    useEnemy(g.enemy, g.route.kind === 'air', use);
  }
}

/** What `cfg` uses that a closed gate refuses: one message per feature, in the order first used. */
export function gateRefusals(cfg: SimConfig<IdSpace>, gates: Gates = FEATURE_GATES): string[] {
  const used = new Map<Feature, string>();
  const use: Use = (f, what) => {
    if (!used.has(f)) used.set(f, what);
  };
  if (cfg.companion !== null) use('companion', `companion '${cfg.companion}'`);
  const { slot1, slot2, slot2State } = cfg.abilities;
  if (slot2 !== null || slot2State !== 'none') use('abilitySlot2', 'ability slot 2');
  if (cfg.specsUnlocked.length > 0) use('specs', 'tier-4 specializations');
  if (cfg.difficulty === 'story') use('storyDifficulty', 'Story difficulty');
  const stubs: string[] = [];
  for (const id of cfg.loadout) {
    const def = cfg.content.towers[id];
    if (def === undefined) continue; // validateConfig reports it
    const stub = stubTowerGate(id);
    if (stub !== null) stubs.push(`the '${id}' tower is not simulated until ${stub}`);
    useTiers(def.tiers, id, use);
    if (def.specs !== null && cfg.specsUnlocked.includes(id)) {
      useTiers([def.specs.a, def.specs.b], id, use);
    }
  }
  for (const id of [slot1, slot2]) {
    const kind = id === null ? undefined : cfg.content.abilities[id]?.effect.kind;
    if (kind !== undefined && isGatedEffect(kind))
      use(`ability.${kind}`, `the '${kind}' ability (${id})`);
  }
  for (const m of cfg.modifiers) {
    const f = modifierFeature(m);
    use(f, `a '${f.slice('modifier.'.length)}' modifier (${m.source})`);
  }
  const map = cfg.content.maps[cfg.mapId];
  if (map !== undefined) useMap(map, use); // validateConfig reports an unknown map
  return [...stubs, ...refusals(used, gates)];
}

function refusals(used: ReadonlyMap<Feature, string>, gates: Gates): string[] {
  const out: string[] = [];
  for (const [f, what] of used) {
    const owner = gates[f];
    if (owner !== null) out.push(`${what} is not simulated until ${owner}`);
  }
  return out;
}

/**
 * Why the sim would refuse `tower` in a loadout on its tiers 1–3 (its specs aren't counted: they
 * need their own unlock), or null if it plays. Takes an authored TowerDef or a compiled one, so
 * meta's pools can keep a save that runs ahead of the sim (the all_unlocked dev save, a tower
 * issued before its task lands) out of the loadout.
 */
export function towerRefusal(
  tower: { readonly id: string; readonly tiers: readonly GateTier[] },
  gates: Gates = FEATURE_GATES,
  stubs: StubTowers = STUB_TOWER_TASKS,
): string | null {
  const stub = stubTowerGate(tower.id, stubs);
  if (stub !== null) return `the '${tower.id}' tower is not simulated until ${stub}`;
  const used = new Map<Feature, string>();
  useTiers(tower.tiers, tower.id, (f, what) => {
    if (!used.has(f)) used.set(f, what);
  });
  return refusals(used, gates)[0] ?? null;
}

/** Why the sim would refuse `ability` in a slot, or null if it plays (as towerRefusal). */
export function abilityRefusal(
  ability: { readonly id: string; readonly effect: { readonly kind: AbilityEffect['kind'] } },
  gates: Gates = FEATURE_GATES,
): string | null {
  const kind = ability.effect.kind;
  if (!isGatedEffect(kind)) return null;
  const owner = gates[`ability.${kind}`];
  return owner === null
    ? null
    : `the '${kind}' ability (${ability.id}) is not simulated until ${owner}`;
}
