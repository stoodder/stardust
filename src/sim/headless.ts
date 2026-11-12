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
//   such unit the waves started so far send has spawned and none is left alive (conventions.md
//   § Balance sims), again for each later wave that sends some: one wave for the Quiet Wave,
//   every runner group for `fleeing` (T412). `holdFireWhile: 'neutral'` (Gerald's macro, T313)
//   holds while a neutral unit is on the field and releases once none is (each pass: he leaves
//   with NeutralExited), every time one appears. It's what a player does by hand, so the run
//   stays a plain command log. `release()` lets go of a held macro and disarms them all (the app's
//   autoplay, when it's switched to another build mid-run; T335).
// - `specialize` addresses a tower by tile and, on an unlocked tier-3 tower, waits until its spec's
//   listed cost is in the bank (otherwise it's issued, and the sim's rejection is the step error).
//   `clear` sends the salvage drone (`clear` command): it completes once queued, and a later
//   `build` on that wreckage tile waits until the drone has cleared it.
// - `interact` (T409) arms a click on a clickable world object and holds nothing behind it: the
//   `interact` command is issued before the first tick its marker is clickable (so a click on a
//   marker the script has already turned on goes at once), and that's the step's issued tick. If
//   the marker is interacted with before the click (its fallback fired), the step records
//   `notClickable` at that tick; if the map ends first, the step was never issued.
// - `scriptInput` (T605: A3M3's SEAL) arms a press of a forced input, like `interact`, and holds
//   nothing behind it: the `scriptInput` command is issued on the first tick that input is pending
//   (`state.pendingInput`), and that's the step's issued tick; if the map ends first, it was never
//   issued. While any forced input is pending the executor issues nothing else (the sim would
//   reject it `forcedInput`, as it does a player's): steps, macros, and wave calls wait, except
//   that a later `scriptInput` step for the pending input is armed ahead of its turn (the freeze
//   would otherwise stall the steps before it for good).
// - After a scripted revocation (T606; sim/revoke.ts), a step for the revoked class is skipped
//   (`skipped`, issued at the tick it was reached, no error) and the build goes on: a build of
//   the class, a step on a tile whose last build was a tower of it that is gone now, and a cast
//   from a revoked slot (or one dark under a phase lock: the finale's Directive 0, T807).
import type { CompiledBuild, CompiledBuildStep } from '../content/compiled.ts';
import { MAX_TIER_BEFORE_SPEC } from '../content/rules.ts';
import type { GridPos, IdSpace, LiveIds, MedalKind, WaveTag } from '../content/types.ts';
import type { Command, RejectReason } from './commands.ts';
import type { SimConfig } from './config.ts';
import {
  nextWaveNoCall,
  purchasePriceInto,
  type PurchaseKind,
  type PurchasePrice,
} from './economy.ts';
import type { SimEvent } from './events.ts';
import { tileIndex } from './grid.ts';
import { createRunTracker, type RunSummary } from './headlessTracker.ts';
import { assertNever } from '../shared/types.ts';
import { createSim, type Sim } from './sim.ts';
import { abilityReady } from './systems/abilities.ts';
import { slotRevoked } from './revoke.ts';
import { clearCommand, wreckageStatus } from './systems/wreckage.ts';
import type { MedalStatus, ObjectiveStatus } from './state.ts';

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
  'interact',
  'scriptInput',
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
  /** Skipped: a step for a class or ability slot the map's script revoked (T606). */
  skipped: boolean;
}

/** One command the executor re-issued to rebuild a restored class (T821; see the header). */
export interface RebuildRecord {
  readonly kind: 'build' | 'upgrade' | 'specialize';
  readonly tile: GridPos;
  readonly tick: number;
  readonly error: RejectReason | null;
}

export interface BuildExecutor {
  /** Issues every step that is due now. Call it before each `sim.step()`. */
  beforeTick(): void;
  readonly steps: readonly StepRecord[];
  /** Ticks at which the executor called a wave (wave 1's start and early calls). */
  readonly waveCalls: readonly number[];
  /** The rebuilds after a restored class (see the header), in order (T821). */
  readonly rebuilt: readonly RebuildRecord[];
  /**
   * Stops the `holdFireWhile` macros: a macro holding fire now issues `holdFire 'all'` off, and
   * none toggles again. Call it when the build stops being played (the app's autoplay, switched
   * to another build mid-run, T335), so a hold the macro started doesn't outlive it.
   */
  release(): void;
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
    skipped: false,
  }));
  const waveCalls: number[] = [];
  const state = sim.state;
  let next = 0;
  /**
   * Armed holdFireWhile macros: the tag, how many such units the waves send through each wave
   * (`through[i]`: waves 1..i+1, so a hold lasts until the current wave's have all spawned),
   * whether it holds now, and its record.
   */
  const watchers: { tag: WaveTag; through: number[]; holding: boolean; rec: StepRecord }[] = [];
  /** Armed holdFireWhile: 'neutral' macros (Gerald's): holding now, and the step's record. */
  const neutralWatchers: { holding: boolean; rec: StepRecord }[] = [];
  /** Armed `interact` steps: the marker to click, and the step's record (T409). */
  const clicks: { marker: string; rec: StepRecord }[] = [];
  /** Armed `scriptInput` steps: the forced input to press, and the step's record (T605). */
  const presses: { id: string; rec: StepRecord }[] = [];
  /** The `scriptInput` steps armed so far, by index (one may be armed ahead of its turn). */
  const armed = new Set<number>();
  /** Arms `scriptInput` step `rec` (once). */
  const arm = (id: string, rec: StepRecord): void => {
    if (armed.has(rec.index)) return;
    armed.add(rec.index);
    presses.push({ id, rec });
  };
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

  /** The tower each tile's last build step placed (by tile index), for revocation skips (T606). */
  const builtAt = new Map<number, string>();
  /**
   * T821: what was issued and accepted on each tile, in order (build, upgrades, spec), so a class
   * the script restores can be rebuilt as it stood; the rebuilds waiting (the head first), done
   * (`rebuilt`), and the revoked classes seen last tick.
   */
  type Rebuild = {
    readonly kind: RebuildRecord['kind'];
    readonly tile: GridPos;
    readonly tower: string;
    readonly spec?: 'a' | 'b';
  };
  /** Accepted build, upgrade, and spec commands, with the uid of the tower each made or changed. */
  const history: { readonly uid: number; readonly step: Rebuild }[] = [];
  const toRebuild: Rebuild[] = [];
  const rebuilt: RebuildRecord[] = [];
  let seenFolded = 0;
  let seenRevocations = 0;
  let seenRevoked = 0;
  const remember = (step: Rebuild, error: RejectReason | null): void => {
    const t = error === null ? towerAt(step.tile) : null;
    if (t !== null) history.push({ uid: t.uid, step });
  };
  /**
   * Queues the rebuild of the towers a revocation folded once their class is buildable again (a
   * restore, the same tick or later): every accepted command on them, in order.
   */
  const watchRestores = (): void => {
    const r = state.revoked;
    const n = state.stats.revocations;
    if (r.uids.length === seenFolded && n === seenRevocations && r.towers.length === seenRevoked) {
      return; // nothing folded or restored since the last check
    }
    seenFolded = r.uids.length;
    seenRevocations = n;
    seenRevoked = r.towers.length;
    const keep: typeof history = [];
    for (const h of history) {
      if (r.uids.includes(h.uid) && !r.towers.includes(h.step.tower)) toRebuild.push(h.step);
      else keep.push(h);
    }
    history.length = 0;
    history.push(...keep);
  };
  /** Re-issues the waiting rebuilds in order, each once affordable; 'wait' holds later steps. */
  const rebuild = (): 'wait' | 'done' => {
    while (toRebuild.length > 0) {
      const r = toRebuild[0]!;
      let cmd: Command<K> | null = null;
      if (r.kind === 'build') {
        const def = sim.config.content.towers[r.tower as K['tower']];
        if (def !== undefined && state.credits < price(r.tower, def.tiers[0].cost, 'build')) {
          return 'wait';
        }
        cmd = { type: 'build', tile: r.tile, tower: r.tower as K['tower'] };
      } else {
        const t = towerAt(r.tile);
        const def = t?.def ?? null;
        if (t !== null && def !== null) {
          const cost =
            r.kind === 'upgrade' ? def.tiers[t.tier]?.cost : def.specs?.[r.spec ?? 'a']?.cost;
          const kind: PurchaseKind = r.kind === 'upgrade' ? 'upgrade' : 'spec';
          if (cost !== undefined && state.credits < price(def.id, cost, kind)) return 'wait';
          cmd =
            r.kind === 'upgrade'
              ? { type: 'upgrade', towerUid: t.uid }
              : { type: 'specialize', towerUid: t.uid, spec: r.spec ?? 'a' };
        }
      }
      toRebuild.shift();
      const error = cmd === null ? 'noSuchTower' : apply(cmd);
      rebuilt.push({ kind: r.kind, tile: r.tile, tick: state.tick, error });
      remember(r, error);
    }
    return 'done';
  };

  /** Whether step `s` is for a revoked class or ability slot (see the header). */
  const forRevoked = (s: CompiledBuildStep<K>): boolean => {
    const r = state.revoked;
    if (
      r.towers.length === 0 &&
      r.abilities.length === 0 &&
      state.abilitiesLocked.length === 0 && // T807: a phase lock (sim/revoke.ts)
      !state.scriptModifiers.quillLockout
    ) {
      return false;
    }
    if (s.kind === 'build') return r.towers.includes(s.tower);
    if (s.kind === 'ability') return slotRevoked(state, sim.config, s.slot);
    const tile =
      s.kind === 'upgrade' || s.kind === 'specialize' || s.kind === 'sell' || s.kind === 'targeting'
        ? s.tile
        : (s.kind === 'holdFire' || s.kind === 'spareRunners') && s.target !== 'all'
          ? s.target
          : null;
    if (tile === null || towerAt(tile) !== null) return false;
    const was = builtAt.get(tileIndex(sim.map, tile[0], tile[1]));
    return was !== undefined && r.towers.includes(was);
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
    if (forRevoked(s)) {
      rec.skipped = true;
      return finish(null, false);
    }
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
        builtAt.set(tileIndex(sim.map, s.tile[0], s.tile[1]), s.tower);
        const err = apply({ type: 'build', tile: s.tile, tower: s.tower });
        remember({ kind: 'build', tile: s.tile, tower: s.tower }, err);
        return finish(err, lateForPhase);
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
        const err = apply({ type: 'upgrade', towerUid: t.uid });
        if (t.def !== null) remember({ kind: 'upgrade', tile: s.tile, tower: t.def.id }, err);
        return finish(err, lateForPhase);
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
        const err = apply({ type: 'specialize', towerUid: t.uid, spec: s.spec });
        if (def !== null) {
          remember({ kind: 'specialize', tile: s.tile, tower: def.id, spec: s.spec }, err);
        }
        return finish(err, lateForPhase);
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
        const through: number[] = [];
        let sent = 0;
        for (const w of sim.map.waves) {
          for (const g of w.groups) if (g.tags.includes(tag)) sent += g.count;
          through.push(sent);
        }
        watchers.push({ tag, through, holding: false, rec });
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
        // Armed: clicked by `click` once its marker is clickable; later steps don't wait for it.
        clicks.push({ marker: s.marker, rec });
        return 'done';
      case 'scriptInput':
        // Armed: pressed by `press` once its input is pending; later steps don't wait for it.
        arm(s.id, rec);
        return 'done';
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

  /** Issues each armed click whose marker is clickable now, or records the one its fallback beat. */
  const click = (): void => {
    for (let i = 0; i < clicks.length; i++) {
      const c = clicks[i]!; // i < length
      if (state.clickable.includes(c.marker)) {
        c.rec.issuedTick = state.tick;
        c.rec.error = apply({ type: 'interact', marker: c.marker });
      } else if (state.interacted.includes(c.marker)) {
        c.rec.issuedTick = state.tick;
        c.rec.error = 'notClickable';
      } else {
        continue;
      }
      clicks.splice(i, 1);
      i--;
    }
  };

  /** Presses each armed forced input that is pending now (T605). */
  const press = (): void => {
    for (let i = 0; i < presses.length; i++) {
      const p = presses[i]!; // i < length
      if (state.pendingInput !== p.id) continue;
      p.rec.issuedTick = state.tick;
      p.rec.error = apply({ type: 'scriptInput', id: p.id });
      presses.splice(i, 1);
      i--;
    }
  };

  /** Runs the armed holdFireWhile macros. */
  const watch = (): void => {
    for (const w of watchers) {
      if (w.holding) {
        // Held until the units the started waves send have all spawned and none is alive.
        const due = state.wave > 0 ? (w.through[state.wave - 1] ?? 0) : 0;
        if (state.stats.tagSpawned[w.tag] < due || tagAlive(w.tag)) continue;
        w.holding = false;
        toggle(w.rec, false);
      } else if (tagAlive(w.tag)) {
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

  let released = false;

  return {
    steps,
    waveCalls,
    rebuilt,
    release() {
      if (released) return;
      released = true;
      const held = [...watchers, ...neutralWatchers].find((w) => w.holding);
      watchers.length = 0;
      neutralWatchers.length = 0;
      clicks.length = 0;
      presses.length = 0;
      if (held !== undefined && state.outcome === 'playing') toggle(held.rec, false);
    },
    beforeTick() {
      if (state.outcome !== 'playing' || released) return;
      if (state.pendingInput !== null) {
        // A forced input freezes play (T605): only its press goes in. A step that presses it but
        // waits behind a step the freeze stalls (a build short of credits) is armed ahead.
        for (let j = next; j < build.steps.length; j++) {
          const s = build.steps[j]!; // j < length
          if (s.kind === 'scriptInput' && s.id === state.pendingInput) arm(s.id, steps[j]!);
        }
        press();
        return;
      }
      watch();
      watchRestores();
      while (rebuild() === 'done' && next < build.steps.length) {
        const s = build.steps[next]!; // next < length
        if (state.schedule.countdownWave < s.wave) break;
        if (tryStep(s, steps[next]!) === 'wait') break; // same index as build.steps
        next++;
      }
      if (clicks.length > 0) click();
      const phase = state.schedule.phase;
      if (phase === 'setup' || (build.callEarly && phase === 'countdown')) {
        if (calledPhase === state.schedule.countdownWave) return;
        if (phase === 'countdown' && nextWaveNoCall(state, sim.map)) return; // never called (D097)
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
  /** Each optional objective's final standing, in map order (`state.objectives`; T304f). */
  readonly objectives: readonly ObjectiveStatus[];
  /**
   * Hushes this run (`Hushed` events: a Hollow unit reached a fleeing runner, which turned it
   * Heavy; enemies.md § The hush rule). The free-choice checks report them (T412).
   */
  readonly hushes: number;
  /**
   * The forced inputs pressed this run, in order (`state.forcedResolved`; T605): a Holdout ends
   * through its SEAL (harness #17).
   */
  readonly forcedInputs: readonly string[];
  /** The classes and abilities the map's script revoked, in order (`state.revoked`; T606). */
  readonly revoked: { readonly towers: readonly string[]; readonly abilities: readonly string[] };
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
  let hushes = 0;
  const drain = (): void => {
    out.length = 0;
    sim.drainEvents(out);
    tracker.consume(out);
    for (let i = 0; i < out.length; i++) if (out[i]!.type === 'Hushed') hushes++; // i < length
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
    objectives: [...sim.state.objectives],
    hushes,
    forcedInputs: [...sim.state.forcedResolved],
    revoked: {
      towers: [...sim.state.revoked.towers],
      abilities: [...sim.state.revoked.abilities],
    },
  };
}
