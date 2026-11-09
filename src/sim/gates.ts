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
// and on-hit statuses; T400a: detection, economy, homing, charge, line, and target filters, and the
// three Act II towers registered ahead of their tasks), and the map (T300a: flyers, neutral
// units, enemy abilities, bosses, and optional objectives; T400a: the hush rule, Skittish, shield
// pulses, blinks, cloaks, Protect, revisits, and clickable objects). Wreckage needs no gate: the
// `clear` command and the salvage drone run since T304b (systems/wreckage.ts).
//
// `run.checkpoints` refuses nothing (no config asks for a checkpoint): it records that the waves
// system doesn't emit CheckpointReached until T305b, so a host offers no "Retry from wave N".
// `towerRefusal` and `abilityRefusal` answer the same question for one raw tower or ability, so
// meta can keep a save that runs ahead of the sim out of play.
import type { CompiledEnemyDef, CompiledMapDef } from '../content/compiled.ts';
import type { AbilityEffect, AttackKind, IdSpace, StatusId } from '../content/types.ts';
import type { EconomyStat, Modifier, SimConfig } from './config.ts';

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
  /** An attack with a `targetFilter` (Magnet Crane; T408). */
  | 'attack.targetFilter'
  | 'status.pinned'
  | 'status.stasis'
  | 'status.unnerved'
  /** A tier with `detect` (the Lookout Shack; T406). */
  | 'tower.detection'
  /** A tier with `economy` (the Salvage Crane; T408). */
  | 'tower.economy'
  /**
   * An Act II tower registered ahead of its task (T400a): its numbers are a stub until the task
   * confirms them, so it stays out of play, the loadout pools, and the shop's shelves. The task
   * that lifts the row also drops the tower from content's TOWERS_AHEAD_OF_TASK.
   */
  | StubTowerFeature
  /**
   * A commander ability effect in slot 1 or 2 that the abilities system doesn't run yet. Time
   * Dilation (`slowAll`) and Clearance Sale (`discount`, with its wave-count cooldown) run since
   * T304d.
   */
  | 'ability.slowAll'
  | 'ability.discount'
  /** Scanner Sweep (T406). */
  | 'ability.reveal'
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
  /** Optional objectives (Objective Intel). */
  | 'map.objectives'
  /** Protect the asset: a `protect` map's asset meter (T305a). */
  | 'map.protect'
  /** A revisit (`revisitOf`), composed from the original by reference (T410a). */
  | 'map.revisit'
  /** Clickable world objects (`clickables`, `setClickable`, `interact`; T409). */
  | 'map.clickable'
  /** Retry checkpoints: refuses nothing (see the header); lifted when T305b emits them. */
  | 'run.checkpoints'
  | 'modifier.towerStat'
  | 'modifier.towerCost'
  | 'modifier.enemyStat'
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

/**
 * The Act II towers registered ahead of their tasks (T400a; content/towers/index.ts
 * TOWERS_AHEAD_OF_TASK lists the ones still waiting), each with its own row.
 */
export type StubTowerFeature = 'tower.lookout' | 'tower.harpoon' | 'tower.crane';

/** A tower's own gate row, if it was registered ahead of its task. */
function stubFeature(id: string): StubTowerFeature | null {
  return id === 'lookout' || id === 'harpoon' || id === 'crane' ? `tower.${id}` : null;
}

/**
 * The task a stub tower waits for (its `tower.<id>` row), or null for any other tower or once the
 * row is lifted. Meta keeps a refused stub's license and spec unlock off the shelves.
 */
export function stubTowerGate(id: string, gates: Gates = FEATURE_GATES): GateOwner | null {
  const f = stubFeature(id);
  return f === null ? null : gates[f];
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
  // (T407b), Pin, line, and target filters with the Harpoon and Crane (T408), detection with the
  // Lookout (T406). Beams (Prism) and Unnerved (Mindspike) are M5's; spawners (Scuttle Den) M6's.
  'attack.projectile': null,
  'attack.beam': 'M5',
  'attack.chain': null,
  'attack.spawner': 'M6',
  'attack.homing': 'T407b',
  'attack.charge': 'T407b',
  'attack.line': 'T408',
  'attack.targetFilter': 'T408',
  'status.pinned': 'T408',
  'status.stasis': null,
  'status.unnerved': 'M5',
  'tower.detection': null,
  'tower.economy': 'T408',
  'tower.lookout': null,
  'tower.harpoon': 'T408',
  'tower.crane': 'T408',
  'modifier.towerStat': null,
  'modifier.towerCost': null,
  'modifier.enemyStat': null,
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
  'enemy.flying': null,
  'enemy.neutral': null,
  'enemy.burrow': null,
  'enemy.split': null,
  'enemy.huddle': null,
  'enemy.boss': null,
  'enemy.boss.pivot': 'M5',
  'enemy.boss.layToRest': 'M7',
  'enemy.hush': null,
  'enemy.skittish': null,
  'enemy.pulse': null,
  'enemy.blink': null,
  'enemy.cloak': null,
  'map.objectives': null,
  'map.protect': null,
  'map.revisit': null,
  'map.clickable': null,
  'run.checkpoints': 'T305b',
});

type GatedKind = 'projectile' | 'beam' | 'chain' | 'spawner' | 'charge' | 'line';
type GatedStatus = 'pinned' | 'stasis' | 'unnerved';
type GatedEffect = 'slowAll' | 'discount' | 'reveal';

function isGatedKind(kind: AttackKind): kind is GatedKind {
  return (
    kind === 'projectile' ||
    kind === 'beam' ||
    kind === 'chain' ||
    kind === 'spawner' ||
    kind === 'charge' ||
    kind === 'line'
  );
}

function isGatedStatus(status: StatusId): status is GatedStatus {
  return status === 'pinned' || status === 'stasis' || status === 'unnerved';
}

function isGatedEffect(kind: AbilityEffect['kind']): kind is GatedEffect {
  return kind === 'slowAll' || kind === 'discount' || kind === 'reveal';
}

/** The gate a modifier needs open. */
export function modifierFeature(m: Modifier<IdSpace>): Feature {
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
    readonly burst?: { readonly effects?: readonly { readonly status?: StatusId }[] } | null;
    readonly homing?: boolean;
    readonly volley?: number;
    readonly targetFilter?: object | null;
  } | null;
  readonly effects?: readonly { readonly status?: StatusId }[];
  readonly detect?: object | null;
  readonly economy?: object | null;
}

/** The attack kinds, statuses, and tier abilities `tiers` use that have gates. */
function useTiers(tiers: readonly GateTier[], id: string, use: Use): void {
  const stub = stubFeature(id);
  if (stub !== null) use(stub, `the '${id}' tower`);
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
    for (const e of [...(tier.effects ?? []), ...(a?.burst?.effects ?? [])]) {
      const status = e.status;
      if (status !== undefined && isGatedStatus(status)) {
        use(`status.${status}`, `the ${status} status (${id})`);
      }
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
  for (const id of cfg.loadout) {
    const def = cfg.content.towers[id];
    if (def === undefined) continue; // validateConfig reports it
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
  return refusals(used, gates);
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
): string | null {
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
