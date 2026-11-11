// Revocation and QUILL's lockout (sim/revoke.ts; T606; towers.md § 9, core-loop.md § 2.2 and
// § 2.11), on the dev revoke range (render/__fixtures__/devM6.ts `dev_revoke`: Everglow Security,
// and the Clean Exit 5 s into W2's spawn window): the class selection and its ties, the 100%
// refund of what was paid, the folded towers' tiles freed at once, the ability slot gone dark,
// the lockout's hidden preview and QUILL's slot, the input edges (D141), the forced class of the
// harness's story variants, the executor's skips, and a replay paying the refund once.
import { describe, expect, it } from 'vitest';
import type { CompiledBuild, CompiledMapDef } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import type { GridPos, IdSpace } from '../content/types.ts';
import { DEV_CONTENT } from '../render/__fixtures__/devBattle.ts';
import type { Command } from './commands.ts';
import type { SimConfig } from './config.ts';
import type { SimEvent } from './events.ts';
import { createBuildExecutor, runHeadless } from './headless.ts';
import { previewHidden, selectRevokedClass, slotRevoked } from './revoke.ts';
import { createSim, type Sim } from './sim.ts';
import { unsupportedScript } from './systems/triggers.ts';

const content = compileContent(DEV_CONTENT);
const maps: Readonly<Record<string, (typeof content.maps)[keyof typeof content.maps]>> =
  content.maps;
const MAP = maps.dev_revoke!;

function config(over: Partial<SimConfig<IdSpace>> = {}): SimConfig<IdSpace> {
  return {
    content,
    mapId: 'dev_revoke',
    seed: 1,
    loadout: ['rivet', 'sprinkler', 'zapcoil', 'prism'],
    companion: null,
    modifiers: [],
    difficulty: 'standard',
    abilities: { slot1: 'dev_strike', slot2: null, slot2State: 'none' },
    specsUnlocked: [],
    scriptFlags: {},
    ...over,
  };
}

type Ev = SimEvent<IdSpace>;

/** A sim with `builds` placed in setup and (by uid order) `upgrades` applied, credits topped up. */
function setup(
  builds: readonly [string, GridPos][],
  upgrades: readonly number[] = [],
  over: Partial<SimConfig<IdSpace>> = {},
): { sim: Sim<IdSpace>; uids: number[] } {
  const sim = createSim(config(over));
  sim.state.credits = 10_000;
  for (const [tower, tile] of builds) sim.enqueue({ type: 'build', tower, tile });
  sim.applyPending();
  const uids: number[] = [];
  for (let i = 0; i < sim.state.towers.used; i++) {
    const t = sim.state.towers.items[i]!;
    if (t.alive) uids.push(t.uid);
  }
  for (const i of upgrades) sim.enqueue({ type: 'upgrade', towerUid: uids[i]! });
  sim.applyPending();
  sim.state.credits = 0;
  return { sim, uids };
}

/** Steps until the Clean Exit has run (or 60 s of sim time), collecting every event. */
function toCue(sim: Sim<IdSpace>): Ev[] {
  const out: Ev[] = [];
  sim.enqueue({ type: 'callWave' });
  for (let t = 0; t < 60 * 60 && sim.state.scriptFired[0] !== true; t++) {
    // Call W2 the moment its countdown starts.
    if (sim.state.schedule.phase === 'countdown') sim.enqueue({ type: 'callWave' });
    sim.step();
    sim.drainEvents(out);
  }
  expect(sim.state.scriptFired[0]).toBe(true);
  return out;
}

const of = <T extends Ev['type']>(out: readonly Ev[], type: T) =>
  out.filter((e): e is Extract<Ev, { type: T }> => e.type === type);

const invested = (sim: Sim<IdSpace>, uid: number): number => {
  for (let i = 0; i < sim.state.towers.used; i++) {
    const t = sim.state.towers.items[i]!;
    if (t.alive && t.uid === uid) return t.invested;
  }
  return -1;
};

describe('revokeTowerClass: mostInvested (towers.md § 9)', () => {
  it('takes the class with the most credits invested, whatever the slot order', () => {
    // One Sprinkler at T3 out-invests two T1 Rivets.
    const { sim, uids } = setup(
      [
        ['rivet', [1, 2]],
        ['rivet', [3, 2]],
        ['sprinkler', [5, 2]],
      ],
      [2, 2],
    );
    expect(invested(sim, uids[2]!)).toBeGreaterThan(invested(sim, uids[0]!) * 2);
    const out = toCue(sim);
    expect(sim.state.revoked.towers).toEqual(['sprinkler']);
    expect(of(out, 'ClassRevoked')).toEqual([
      { type: 'ClassRevoked', tower: 'sprinkler', refund: expect.any(Number) },
    ]);
  });

  it('breaks a tie on credits by the most towers placed, then by the earliest loadout slot', () => {
    // Tie them by hand on `invested`.
    const { sim, uids } = setup([
      ['rivet', [1, 2]],
      ['sprinkler', [3, 2]],
      ['sprinkler', [5, 2]],
    ]);
    const t = sim.state.towers.items;
    const set = (uid: number, n: number): void => {
      t.find((x) => x.alive && x.uid === uid)!.invested = n;
    };
    set(uids[0]!, 200);
    set(uids[1]!, 100);
    set(uids[2]!, 100);
    expect(selectRevokedClass(sim.state, { content, config: sim.config }, 'everglow')).toBe(
      'sprinkler',
    );
    // Same credits, same count: the earlier slot (Rivet, slot 1).
    set(uids[2]!, 0);
    sim.state.towers.items.find((x) => x.alive && x.uid === uids[2])!.alive = false;
    sim.state.towers.live--;
    set(uids[1]!, 200);
    expect(selectRevokedClass(sim.state, { content, config: sim.config }, 'everglow')).toBe(
      'rivet',
    );
  });

  it("with no Everglow tower placed, the loadout's first Everglow class goes; no faction is any", () => {
    const { sim } = setup([['zapcoil', [1, 2]]]);
    const ctx = { content, config: sim.config };
    expect(selectRevokedClass(sim.state, ctx, 'everglow')).toBe('rivet');
    // The Zapcoil is the only class with credits in it (the finale's Directive 0: every class).
    expect(selectRevokedClass(sim.state, ctx, null)).toBe('zapcoil');
    // A loadout with no class of the faction: nothing.
    const plain = createSim(config({ loadout: ['zapcoil', 'prism'] }));
    expect(selectRevokedClass(plain.state, { content, config: plain.config }, 'everglow')).toBe(
      null,
    );
  });

  it('folds every tower of it away at once, refunding 100% of what was paid; tiles free', () => {
    const { sim, uids } = setup(
      [
        ['rivet', [1, 2]],
        ['rivet', [3, 2]],
        ['zapcoil', [5, 2]],
      ],
      [0],
    );
    const paid = [invested(sim, uids[0]!), invested(sim, uids[1]!)];
    const ledger = (): number =>
      sim.state.stats.creditsEarned - sim.state.stats.creditsSpent + sim.state.stats.creditsRefunded;
    const before = { credits: sim.state.credits, ledger: ledger() };
    const out = toCue(sim);
    const revoked = of(out, 'TowerRevoked');
    expect(revoked).toEqual([
      { type: 'TowerRevoked', uid: uids[0], tower: 'rivet', refund: paid[0] },
      { type: 'TowerRevoked', uid: uids[1], tower: 'rivet', refund: paid[1] },
    ]);
    expect(of(out, 'ClassRevoked')).toEqual([
      { type: 'ClassRevoked', tower: 'rivet', refund: paid[0]! + paid[1]! },
    ]);
    // Refunds are booked as refunds, so the credit ledger still balances.
    expect(sim.state.credits - before.credits).toBe(ledger() - before.ledger);
    expect(sim.state.stats.creditsRefunded).toBeGreaterThanOrEqual(paid[0]! + paid[1]!);
    expect(sim.state.revoked).toEqual({
      towers: ['rivet'],
      abilities: ['dev_strike'],
      uids: [uids[0], uids[1]],
    });
    // Class + ability.
    expect(sim.state.stats.revocations).toBe(2);
    expect(sim.state.towers.live).toBe(1); // the Zapcoil stands
    // The tiles are free on the cue's tick: a Prism goes up at once.
    sim.state.credits = 10_000;
    const log: Ev[] = [];
    sim.enqueue({ type: 'build', tower: 'prism', tile: [1, 2] });
    sim.applyPending();
    sim.drainEvents(log);
    expect(of(log, 'TowerBuilt')).toHaveLength(1);
  });

  it('a second revocation never takes the same class again', () => {
    const { sim } = setup([['rivet', [1, 2]]]);
    toCue(sim);
    expect(selectRevokedClass(sim.state, { content, config: sim.config }, 'everglow')).toBe(
      'sprinkler',
    );
  });

  it("the harness's story variant forces the class (SimConfig.revokeClass)", () => {
    const { sim } = setup(
      [
        ['rivet', [1, 2]],
        ['rivet', [3, 2]],
        ['sprinkler', [5, 2]],
      ],
      [],
      { revokeClass: 'sprinkler' },
    );
    toCue(sim);
    expect(sim.state.revoked.towers).toEqual(['sprinkler']);
    expect(sim.state.towers.live).toBe(2);
    expect(() => createSim(config({ revokeClass: 'nope' }))).toThrow(
      "revokeClass: unknown tower 'nope'",
    );
  });

  it('binds inside W2’s spawn window, with W2 called early', () => {
    const { sim } = setup([]);
    toCue(sim);
    const s = sim.state.schedule;
    expect(sim.state.wave).toBe(2);
    // Still spawning: the column isn't all out when the cue runs.
    expect(s.phase).toBe('spawning');
    // The cue ran on the tick 5 s after W2's start (state.tick is one past it now).
    expect(sim.state.tick - 1 - (s.startTick[1] ?? 0)).toBe(5 * 60);
  });
});

describe('revokeAbility and setModifier', () => {
  it('slot 1 goes dark: AbilityRevoked names it, and a cast is refused `revoked`', () => {
    const { sim } = setup([]);
    const out = toCue(sim);
    expect(of(out, 'AbilityRevoked')).toEqual([
      { type: 'AbilityRevoked', ability: 'dev_strike', slot: 1 },
    ]);
    expect(slotRevoked(sim.state, sim.config, 1)).toBe(true);
    expect(slotRevoked(sim.state, sim.config, 2)).toBe(false); // empty
    sim.enqueue({ type: 'ability', slot: 1, target: [10, 3] });
    sim.step();
    const after: Ev[] = [];
    sim.drainEvents(after);
    expect(of(after, 'CommandRejected').map((e) => e.reason)).toEqual(['revoked']);
  });

  it('an ability that is not equipped is revoked with no slot', () => {
    const { sim } = setup([], [], {
      abilities: { slot1: null, slot2: null, slot2State: 'none' },
    });
    const out = toCue(sim);
    expect(of(out, 'AbilityRevoked')).toEqual([
      { type: 'AbilityRevoked', ability: 'dev_strike', slot: null },
    ]);
  });

  it("QUILL's lockout hides the preview and darkens her companion slot", () => {
    const { sim } = setup([], [], {
      companion: 'quill',
      abilities: { slot1: 'dev_strike', slot2: 'time_dilation', slot2State: 'present' },
    });
    expect(previewHidden(sim.state)).toBe(false);
    const out = toCue(sim);
    expect(of(out, 'ModifierChanged')).toEqual([
      { type: 'ModifierChanged', modifier: 'quillLockout', on: true },
    ]);
    expect(previewHidden(sim.state)).toBe(true);
    expect(slotRevoked(sim.state, sim.config, 2)).toBe(true);
    // Bricks's slot isn't QUILL's.
    expect(
      slotRevoked(
        sim.state,
        { ...sim.config, companion: 'bricks', abilities: sim.config.abilities },
        2,
      ),
    ).toBe(false);
    // previewHidden alone hides it too.
    sim.state.scriptModifiers.quillLockout = false;
    sim.state.scriptModifiers.previewHidden = true;
    expect(previewHidden(sim.state)).toBe(true);
  });

  it('an objective may not revoke (it has no run context); events may', () => {
    const one: CompiledMapDef<IdSpace> = {
      ...MAP,
      objectives: [
        {
          id: 'x',
          name: 'x',
          description: 'x',
          condition: { stat: 'lateSells', lte: 0 },
          intel: 0,
          onComplete: [{ revokeAbility: 'dev_strike' }, { setModifier: 'previewHidden', on: true }],
        },
      ],
    };
    expect(unsupportedScript(one)).toEqual([
      "objective 'x': action revokeAbility runs from map events only",
    ]);
    expect(unsupportedScript(MAP)).toEqual([]);
  });
});

describe('the input edges (D141)', () => {
  it('build, upgrade, spec, sell, targeting, and fire control on the revoked class are `revoked`', () => {
    const { sim, uids } = setup([['rivet', [1, 2]]]);
    toCue(sim);
    sim.state.credits = 10_000;
    const uid = uids[0]!;
    const cmds: Command<IdSpace>[] = [
      { type: 'build', tower: 'rivet', tile: [3, 2] },
      { type: 'upgrade', towerUid: uid },
      { type: 'specialize', towerUid: uid, spec: 'a' },
      { type: 'sell', towerUid: uid },
      { type: 'targeting', towerUid: uid, mode: 'strong' },
      { type: 'holdFire', target: uid, on: true },
      { type: 'spareRunners', target: uid, on: true },
    ];
    for (const c of cmds) sim.enqueue(c);
    // Not the class: these still apply.
    sim.enqueue({ type: 'holdFire', target: 'all', on: true });
    sim.enqueue({ type: 'build', tower: 'sprinkler', tile: [3, 2] });
    sim.applyPending();
    const out: Ev[] = [];
    sim.drainEvents(out);
    expect(of(out, 'CommandRejected').map((e) => e.reason)).toEqual(cmds.map(() => 'revoked'));
    expect(of(out, 'TowerBuilt').map((e) => e.tower)).toEqual(['sprinkler']);
  });

  it('a checkpoint replay re-runs the cue from the log: one refund, the same state', () => {
    const { sim } = setup(
      [
        ['rivet', [1, 2]],
        ['zapcoil', [3, 2]],
      ],
      [0],
    );
    toCue(sim);
    for (let t = 0; t < 120; t++) sim.step();
    // Replay: the same config, the logged commands before their ticks.
    const again = createSim(config());
    let next = 0;
    const log = sim.state.commandLog;
    // setup() wrote credits by hand; mirror it at the same points.
    again.state.credits = 10_000;
    while (next < log.length && log[next]!.tick === 0 && log[next]!.cmd.type === 'build') {
      again.enqueue(log[next++]!.cmd);
    }
    again.applyPending();
    while (next < log.length && log[next]!.tick === 0 && log[next]!.cmd.type === 'upgrade') {
      again.enqueue(log[next++]!.cmd);
    }
    again.applyPending();
    again.state.credits = 0;
    while (again.state.tick < sim.state.tick) {
      while (next < log.length && log[next]!.tick === again.state.tick) {
        again.enqueue(log[next++]!.cmd);
      }
      again.step();
    }
    expect(again.state.revoked).toEqual(sim.state.revoked);
    expect(again.state.credits).toBe(sim.state.credits);
    expect(again.state.stats.creditsRefunded).toBe(sim.state.stats.creditsRefunded);
    expect(again.hash()).toBe(sim.hash());
  });
});

describe('the build executor after a revocation (conventions.md § Balance sims)', () => {
  it('skips the steps for the revoked class and slot, and the build goes on', () => {
    const build: CompiledBuild<IdSpace> = {
      loadout: ['rivet', 'sprinkler', 'zapcoil', 'prism'],
      callEarly: false,
      companion: null,
      technicianAbility: 'dev_strike',
      steps: [
        { wave: 1, kind: 'build', tower: 'rivet', tile: [12, 4] },
        { wave: 1, kind: 'build', tower: 'rivet', tile: [7, 2] },
        // After the cue (5 s into W2): a strike, the Rivet's upgrade, a Rivet, then a Prism.
        { wave: 2, kind: 'ability', slot: 1, target: [10, 3], when: { afterTicks: 8 * 60 } },
        { wave: 2, kind: 'upgrade', tile: [12, 4] },
        { wave: 2, kind: 'build', tower: 'rivet', tile: [12, 2] },
        { wave: 2, kind: 'build', tower: 'prism', tile: [12, 4] },
      ],
    };
    const sim = createSim(config());
    const exec = createBuildExecutor(sim, build);
    while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 60) {
      exec.beforeTick();
      sim.step();
      if (exec.steps[5]!.issuedTick >= 0) break;
    }
    expect(exec.steps.map((s) => [s.error, s.skipped])).toEqual([
      [null, false],
      [null, false],
      [null, true],
      [null, true],
      [null, true],
      [null, false],
    ]);
    expect(sim.state.revoked.towers).toEqual(['rivet']);
  });

  it('runHeadless reports what the run revoked', () => {
    const r = runHeadless(config(), MAP.builds.parBuild);
    expect(r.revoked).toEqual({ towers: ['rivet'], abilities: ['dev_strike'] });
    expect(r.stats.revocations).toBe(2);
    expect(r.violations).toEqual([]);
  });
});
