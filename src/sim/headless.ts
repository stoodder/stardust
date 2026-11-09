// Headless runs (architecture.md § Sim public API): runHeadless() plays one map to the end with no
// frame cap, and the scripted-build executor issues a build's steps as a player would
// (conventions.md § Balance sims, step semantics). Both use only the public sim API, so the
// balance harness (src/balance/), tests, and the game's autoplay hook drive the same code.
//
// Executor rules:
// - Steps run strictly in order. A step is eligible once the build phase before its wave has
//   begun (`schedule.countdownWave ≥ wave`; wave 1's is the setup). It's issued the moment it's
//   affordable (at the price the sim will charge: economy.ts `purchasePriceInto`) and its tower is
//   unlocked (D021), and later steps wait behind it. A step whose
//   wave has already started is still issued when it can be (the run records it as late).
// - Each command is applied at once with applyPending(), which is identical to applying it at
//   the start of the next tick (D013), so the next step sees its effect.
// - Ability steps wait for their moment: 'asap' (as soon as eligible), 'waveStart' (once their
//   wave has started), or `afterTicks` into their wave; then for the slot's cooldown.
// - Wave 1 starts once the setup's affordable steps are in. `callEarly` calls each later wave
//   the moment its countdown starts, after that phase's affordable steps.
// - `holdFire` and `spareRunners` steps address a tower by tile (an error if none stands there)
//   or `'all'`. The `holdFireWhile: <tag>` macro arms a watcher when it's reached: from then on,
//   it issues plain `holdFire 'all'` on once a unit with that tag is alive, and off once every
//   such unit the map spawns has spawned and none is left alive (conventions.md § Balance sims).
//   `holdFireWhile: 'neutral'` (Gerald's macro, T313) holds while a neutral unit is on the field
//   and releases once none is (each pass: he leaves with NeutralExited), every time one appears.
//   It's what a player does by hand, so the run stays a plain command log.
// - `specialize` addresses a tower by tile and, on an unlocked tier-3 tower, waits until its spec's
//   listed cost is in the bank (otherwise it's issued, and the sim's rejection is the step error).
//   `clear` sends the salvage drone (`clear` command): it completes once queued, and a later
//   `build` on that wreckage tile waits until the drone has cleared it.
import type { CompiledBuild, CompiledBuildStep } from '../content/compiled.ts';
import { MAX_TIER_BEFORE_SPEC } from '../content/rules.ts';
import type { GridPos, IdSpace, LiveIds, MedalKind, WaveTag } from '../content/types.ts';
import type { Command, RejectReason } from './commands.ts';
import type { SimConfig } from './config.ts';
import { purchasePriceInto, type PurchaseKind, type PurchasePrice } from './economy.ts';
import type { SimEvent } from './events.ts';
import { tileIndex } from './grid.ts';
import { createRunTracker, type RunSummary } from './headlessTracker.ts';
import { assertNever } from '../shared/types.ts';
import { createSim, type Sim } from './sim.ts';
import { abilityReady } from './systems/abilities.ts';
import { clearCommand, wreckageStatus } from './systems/wreckage.ts';
import type { MedalStatus } from './state.ts';

export type { RunSummary, TowerSummary, WaveSummary } from './headlessTracker.ts';

/** Step kinds the sim has commands for. The rest are refused, not ignored (D013). */
const SUPPORTED_STEPS: ReadonlySet<CompiledBuildStep['kind']> = new Set([
  'build',
  'upgrade',
  'specialize',
  'clear',
  'sell',
  'targeting',
  'holdFire',
  'spareRunners',
  'holdFireWhile',
  'ability',
  'callWave',
]);

/** What happened to one step of the build. */
export interface StepRecord {
  readonly index: number;
  readonly kind: CompiledBuildStep['kind'];
  readonly wave: number;
  /** The tick its command applied at, or −1 if it never was (the map ended first). */
  issuedTick: number;
  /**
   * Issued after its intended moment: a build-phase step after its wave started, or an
   * ability step after its due tick.
   */
  late: boolean;
  /** The sim rejected its command, or the executor couldn't form one (no tower on the tile). */
  error: RejectReason | null;
}

export interface BuildExecutor {
  /** Issues every step that is due now. Call it before each `sim.step()`. */
  beforeTick(): void;
  readonly steps: readonly StepRecord[];
  /** Ticks at which the executor called a wave (wave 1's start and early calls). */
  readonly waveCalls: readonly number[];
}

/** Throws a RangeError if `build` has steps the M1 sim can't run. */
export function assertRunnableBuild<K extends IdSpace>(build: CompiledBuild<K>): void {
  const bad = build.steps.flatMap((s, i) =>
    SUPPORTED_STEPS.has(s.kind) ? [] : [`${i}:${s.kind}`],
  );
  if (bad.length > 0) {
    throw new RangeError(`build has steps the sim can't run yet: ${bad.join(', ')}`);
  }
}

/** Creates the scripted-build executor for `build` on `sim` (the sim's loadout must hold it). */
export function createBuildExecutor<K extends IdSpace = LiveIds>(
  sim: Sim<K>,
  build: CompiledBuild<K>,
): BuildExecutor {
  assertRunnableBuild(build);
  const steps: StepRecord[] = build.steps.map((s, index) => ({
    index,
    kind: s.kind,
    wave: s.wave,
    issuedTick: -1,
    late: false,
    error: null,
  }));
  const waveCalls: number[] = [];
  const state = sim.state;
  let next = 0;
  /** Armed holdFireWhile macros: the tag, how many such units the map spawns, and its record. */
  const watchers: { tag: WaveTag; total: number; holding: boolean; rec: StepRecord }[] = [];
  /** Armed holdFireWhile: 'neutral' macros (Gerald's): holding now, and the step's record. */
  const neutralWatchers: { holding: boolean; rec: StepRecord }[] = [];
  /** The build phase (countdownWave) already called early, so each is called once. */
  let calledPhase = 0;

  /**
   * Applies `cmd` now; returns the sim's rejection reason, or null. The rejection is matched to
   * this command by identity: the sim logs the (copied) command it applied and names that same
   * object in CommandRejected, so another command's rejection can never be mistaken for it.
   */
  const apply = (cmd: Command<K>): RejectReason | null => {
    const before = state.events.length;
    // Commands already queued (by anyone else) apply first, so ours logs after them.
    const logIndex = state.commandLog.length + state.pending.length;
    sim.enqueue(cmd);
    sim.applyPending();
    const applied = state.commandLog[logIndex]?.cmd;
    if (applied === undefined) return null; // applyPending always logs what it applies
    for (let i = before; i < state.events.length; i++) {
      const e = state.events[i]!; // i < length
      if (e.type === 'CommandRejected' && e.cmd === applied) return e.reason;
    }
    return null;
  };

  const towerAt = (tile: GridPos): (typeof state.towers.items)[number] | null => {
    const idx = tileIndex(sim.map, tile[0], tile[1]);
    const slot = idx < 0 ? -1 : (state.towerAtTile[idx] ?? -1);
    const t = slot < 0 ? undefined : state.towers.items[slot];
    return t !== undefined && t.alive ? t : null;
  };

  /**
   * The tick an ability step is due, or null while its wave hasn't started. A wave starts after
   * its tick's commands apply, so the earliest a command can follow it is the next tick.
   */
  const dueTick = (s: Extract<CompiledBuildStep<K>, { kind: 'ability' }>): number | null => {
    if (s.when === 'asap') return state.tick;
    const start = state.schedule.startTick[s.wave - 1] ?? -1;
    if (start < 0) return null;
    return start + Math.max(1, s.when === 'waveStart' ? 0 : s.when.afterTicks);
  };

  /**
   * What a purchase costs now (economy.ts `purchasePriceInto`: modifiers, Rapid Deploy's free first
   * build, a Clearance Sale), so a step waits for exactly what the sim will charge.
   */
  const quote: PurchasePrice = { cost: 0, discounted: false };
  const price = (tower: string, base: number, kind: PurchaseKind): number =>
    purchasePriceInto(state, sim.config.modifiers, tower, base, kind, quote).cost;

  /** Tries the head step: 'wait' keeps it (and everything behind it) for a later tick. */
  const tryStep = (s: CompiledBuildStep<K>, rec: StepRecord): 'wait' | 'done' => {
    const finish = (error: RejectReason | null, late: boolean): 'done' => {
      rec.issuedTick = state.tick;
      rec.error = error;
      rec.late = late;
      return 'done';
    };
    const lateForPhase = state.wave >= s.wave;
    switch (s.kind) {
      case 'build': {
        if (state.lockedTowers.includes(s.tower)) return 'wait';
        // Wreckage the drone is still clearing: wait for it (a never-queued tile is rejected).
        const wreck = wreckageStatus(sim.map, state.wreckage, s.tile[0], s.tile[1]);
        if (wreck === 'queued' || wreck === 'clearing') return 'wait';
        const def = sim.config.content.towers[s.tower];
        if (def !== undefined && state.credits < price(s.tower, def.tiers[0].cost, 'build')) {
          return 'wait';
        }
        return finish(apply({ type: 'build', tile: s.tile, tower: s.tower }), lateForPhase);
      }
      case 'upgrade': {
        const t = towerAt(s.tile);
        if (t === null) return finish('noSuchTower', lateForPhase);
        const tier = t.def?.tiers[t.tier];
        if (
          tier !== undefined &&
          t.def !== null &&
          state.credits < price(t.def.id, tier.cost, 'upgrade')
        ) {
          return 'wait';
        }
        return finish(apply({ type: 'upgrade', towerUid: t.uid }), lateForPhase);
      }
      case 'specialize': {
        const t = towerAt(s.tile);
        if (t === null) return finish('noSuchTower', lateForPhase);
        // Wait for the cost only when the spec is otherwise allowed; else the sim says why not.
        const def = t.def;
        const spec = def?.specs?.[s.spec];
        const allowed =
          def !== null &&
          sim.config.specsUnlocked.includes(def.id) &&
          t.spec === null &&
          t.tier === MAX_TIER_BEFORE_SPEC;
        if (allowed && spec !== undefined && state.credits < price(def.id, spec.cost, 'spec')) {
          return 'wait';
        }
        return finish(apply({ type: 'specialize', towerUid: t.uid, spec: s.spec }), lateForPhase);
      }
      case 'clear':
        return finish(apply(clearCommand(s.tile)), lateForPhase);
      case 'sell': {
        const t = towerAt(s.tile);
        if (t === null) return finish('noSuchTower', lateForPhase);
        return finish(apply({ type: 'sell', towerUid: t.uid }), lateForPhase);
      }
      case 'targeting': {
        const t = towerAt(s.tile);
        if (t === null) return finish('noSuchTower', lateForPhase);
        return finish(apply({ type: 'targeting', towerUid: t.uid, mode: s.mode }), lateForPhase);
      }
      case 'ability': {
        const due = dueTick(s);
        if (due === null || state.tick < due) return 'wait';
        if (!abilityReady(state, s.slot)) return 'wait'; // tick and wave-count cooldowns
        const cmd: Command<K> =
          s.target === null
            ? { type: 'ability', slot: s.slot }
            : { type: 'ability', slot: s.slot, target: s.target };
        return finish(apply(cmd), s.when !== 'asap' && state.tick > due);
      }
      case 'holdFire':
      case 'spareRunners': {
        let target: number | 'all' = 'all';
        if (s.target !== 'all') {
          const t = towerAt(s.target);
          if (t === null) return finish('noSuchTower', lateForPhase);
          target = t.uid;
        }
        return finish(apply({ type: s.kind, target, on: s.on }), lateForPhase);
      }
      case 'holdFireWhile': {
        if (s.tag === 'neutral') {
          neutralWatchers.push({ holding: false, rec });
          return finish(null, false);
        }
        const tag = s.tag;
        const total = sim.map.waves.reduce(
          (n, w) => n + w.groups.reduce((m, g) => m + (g.tags.includes(tag) ? g.count : 0), 0),
          0,
        );
        watchers.push({ tag, total, holding: false, rec });
        return finish(null, false);
      }
      case 'callWave': {
        // A call for a wave that already started has nothing left to do.
        if (lateForPhase) return finish(null, true);
        if (state.schedule.phase !== 'countdown' && state.schedule.phase !== 'setup') return 'wait';
        waveCalls.push(state.tick);
        return finish(apply({ type: 'callWave' }), false);
      }
      case 'interact':
      case 'scriptInput':
        // assertRunnableBuild refused these up front.
        throw new RangeError(`unsupported step kind '${s.kind}'`);
      default:
        return assertNever(s);
    }
  };

  /** Whether a live enemy carries `tag`. */
  const tagAlive = (tag: WaveTag): boolean => {
    const enemies = state.enemies;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used
      if (e.alive && e.tags.includes(tag)) return true;
    }
    return false;
  };

  /** Whether a neutral unit (Gerald) is on the field. */
  const neutralAlive = (): boolean => {
    const enemies = state.enemies;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used
      if (e.alive && e.def !== null && e.def.neutral) return true;
    }
    return false;
  };

  /** Issues a macro's toggle; the first rejection is recorded on the macro's step. */
  const toggle = (rec: StepRecord, on: boolean): void => {
    const error = apply({ type: 'holdFire', target: 'all', on });
    if (rec.error === null) rec.error = error;
  };

  /** Runs the armed holdFireWhile macros. */
  const watch = (): void => {
    for (const w of watchers) {
      if (w.holding) {
        if (state.stats.tagSpawned[w.tag] < w.total || tagAlive(w.tag)) continue;
        w.holding = false;
        w.total = -1; // done: never again
        toggle(w.rec, false);
      } else if (w.total > 0 && tagAlive(w.tag)) {
        w.holding = true;
        toggle(w.rec, true);
      }
    }
    if (neutralWatchers.length === 0) return;
    const alive = neutralAlive();
    for (const w of neutralWatchers) {
      if (w.holding === alive) continue;
      w.holding = alive;
      toggle(w.rec, alive);
    }
  };

  return {
    steps,
    waveCalls,
    beforeTick() {
      if (state.outcome !== 'playing') return;
      watch();
      while (next < build.steps.length) {
        const s = build.steps[next]!; // next < length
        if (state.schedule.countdownWave < s.wave) break;
        if (tryStep(s, steps[next]!) === 'wait') break; // same index as build.steps
        next++;
      }
      const phase = state.schedule.phase;
      if (phase === 'setup' || (build.callEarly && phase === 'countdown')) {
        if (calledPhase === state.schedule.countdownWave) return;
        calledPhase = state.schedule.countdownWave;
        waveCalls.push(state.tick);
        apply({ type: 'callWave' });
      }
    },
  };
}

export interface HeadlessOptions {
  /** Stop a run that hasn't ended after this many ticks (default: 30 minutes of sim time). */
  readonly maxTicks?: number;
  /** Check the run's invariants after every tick (conventions.md § Balance sims, #12). Default true. */
  readonly checkInvariants?: boolean;
}

export interface HeadlessResult extends RunSummary {
  /** 'timeout': still playing at `maxTicks`. */
  readonly outcome: 'won' | 'lost' | 'timeout';
  readonly ticks: number;
  /** The final `sim.hash()`. */
  readonly hash: string;
  readonly steps: readonly StepRecord[];
  readonly waveCalls: readonly number[];
  readonly commandCount: number;
  /** Each medal's final standing (`state.medals`; sim/medals.ts). */
  readonly medals: Readonly<Record<MedalKind, MedalStatus>>;
}

/** 30 minutes of sim time: longer than any map (the finale is about 25). */
export const DEFAULT_MAX_TICKS = 60 * 60 * 30;

/** Runs `build` on a fresh sim from `cfg` until the map is won or lost (or `maxTicks`). */
export function runHeadless<K extends IdSpace = LiveIds>(
  cfg: SimConfig<K>,
  build: CompiledBuild<K>,
  opts: HeadlessOptions = {},
): HeadlessResult {
  const maxTicks = opts.maxTicks ?? DEFAULT_MAX_TICKS;
  const sim = createSim(cfg);
  const exec = createBuildExecutor(sim, build);
  const tracker = createRunTracker(sim, opts.checkInvariants ?? true);
  const out: SimEvent<K>[] = [];
  const drain = (): void => {
    out.length = 0;
    sim.drainEvents(out);
    tracker.consume(out);
  };
  while (sim.state.outcome === 'playing' && sim.state.tick < maxTicks) {
    exec.beforeTick();
    drain();
    sim.step();
    drain();
    tracker.afterTick();
  }
  const outcome = sim.state.outcome;
  return {
    ...tracker.summary(),
    outcome: outcome === 'playing' ? 'timeout' : outcome,
    ticks: sim.state.tick,
    hash: sim.hash(),
    steps: exec.steps,
    waveCalls: exec.waveCalls,
    commandCount: sim.state.commandLog.length,
    medals: { ...sim.state.medals },
  };
}
