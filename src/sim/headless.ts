// Headless runs (architecture.md § Sim public API): runHeadless() plays one map to the end with no
// frame cap, and the scripted-build executor issues a build's steps as a player would
// (conventions.md § Balance sims, step semantics). Both use only the public sim API, so the
// balance harness (src/balance/), tests, and the game's autoplay hook drive the same code.
//
// Executor rules:
// - Steps run strictly in order. A step is eligible once the build phase before its wave has
//   begun (`schedule.countdownWave ≥ wave`; wave 1's is the setup). It's issued the moment it's
//   affordable and its tower is unlocked (D021), and later steps wait behind it. A step whose
//   wave has already started is still issued when it can be (the run records it as late).
// - Each command is applied at once with applyPending(), which is identical to applying it at
//   the start of the next tick (D013), so the next step sees its effect.
// - Ability steps wait for their moment: 'asap' (as soon as eligible), 'waveStart' (once their
//   wave has started), or `afterTicks` into their wave; then for the slot's cooldown.
// - Wave 1 starts once the setup's affordable steps are in. `callEarly` calls each later wave
//   the moment its countdown starts, after that phase's affordable steps.
import type { CompiledBuild, CompiledBuildStep } from '../content/compiled.ts';
import type { GridPos, IdSpace, LiveIds } from '../content/types.ts';
import type { Command, RejectReason } from './commands.ts';
import type { SimConfig } from './config.ts';
import type { SimEvent } from './events.ts';
import { tileIndex } from './grid.ts';
import { createRunTracker, type RunSummary } from './headlessTracker.ts';
import { assertNever } from '../shared/types.ts';
import { createSim, type Sim } from './sim.ts';

export type { RunSummary, TowerSummary, WaveSummary } from './headlessTracker.ts';

/** Step kinds the M1 sim has commands for. The rest are refused, not ignored (D013). */
const SUPPORTED_STEPS: ReadonlySet<CompiledBuildStep['kind']> = new Set([
  'build',
  'upgrade',
  'sell',
  'targeting',
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
  /** The build phase (countdownWave) already called early, so each is called once. */
  let calledPhase = 0;

  /** Applies `cmd` now; returns the sim's rejection reason, or null. */
  const apply = (cmd: Command<K>): RejectReason | null => {
    const before = state.events.length;
    sim.enqueue(cmd);
    sim.applyPending();
    for (let i = before; i < state.events.length; i++) {
      const e = state.events[i]!; // i < length
      if (e.type === 'CommandRejected' && e.cmd.type === cmd.type) return e.reason;
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
        const def = sim.config.content.towers[s.tower];
        if (def !== undefined && state.credits < def.tiers[0].cost) return 'wait';
        return finish(apply({ type: 'build', tile: s.tile, tower: s.tower }), lateForPhase);
      }
      case 'upgrade': {
        const t = towerAt(s.tile);
        if (t === null) return finish('noSuchTower', lateForPhase);
        const tier = t.def?.tiers[t.tier];
        if (tier !== undefined && state.credits < tier.cost) return 'wait';
        return finish(apply({ type: 'upgrade', towerUid: t.uid }), lateForPhase);
      }
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
        if ((state.abilityCooldownTicks[s.slot - 1] ?? 0) > 0) return 'wait';
        const cmd: Command<K> =
          s.target === null
            ? { type: 'ability', slot: s.slot }
            : { type: 'ability', slot: s.slot, target: s.target };
        return finish(apply(cmd), s.when !== 'asap' && state.tick > due);
      }
      case 'callWave': {
        // A call for a wave that already started has nothing left to do.
        if (lateForPhase) return finish(null, true);
        if (state.schedule.phase !== 'countdown' && state.schedule.phase !== 'setup') return 'wait';
        waveCalls.push(state.tick);
        return finish(apply({ type: 'callWave' }), false);
      }
      case 'specialize':
      case 'holdFire':
      case 'spareRunners':
      case 'clear':
      case 'interact':
      case 'scriptInput':
      case 'holdFireWhile':
        // assertRunnableBuild refused these up front.
        throw new RangeError(`unsupported step kind '${s.kind}'`);
      default:
        return assertNever(s);
    }
  };

  return {
    steps,
    waveCalls,
    beforeTick() {
      if (state.outcome !== 'playing') return;
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
  };
}
