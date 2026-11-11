// The M6 seams (T600a): the new state, stats, and entity fields start blank; refugee groups gated
// on a story flag (A3M3's `door_choice`) walk only under it and leave the run's total, and losses
// are booked to the group (`groupLost`: The Matriarch's Young); the `scriptInput` command runs
// since T605 (sim/holdout.test.ts); FEATURE_GATES, SCRIPT_GATES, and HARNESS_GATES name the task
// that lifts each M6 row (D141), and M7/M8's rows their milestone (HARNESS_GATES:
// balance/refusals.m5.test.ts); the three Act III towers are
// refused whole until their tasks (STUB_TOWER_TASKS); the new content compiles. The dev maps:
// render/__fixtures__/devM6.test.ts.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { STUB_TOWER_TASKS, TOWERS } from '../content/towers/index.ts';
import type { ConditionDef, IdSpace, MapDef } from '../content/types.ts';
import { SIM_FIXTURE, fixtureConfig, type FixtureIds } from './__fixtures__/sim.ts';
import { evaluateCondition } from './conditions.ts';
import { ALLY_BLANK, ENEMY_BLANK, TOWER_BLANK, ZONE_BLANK } from './entities.ts';
import { escortTotal, loseRefugee, refugeesRemaining, spawnRefugees } from './escort.ts';
import { FEATURE_GATES, abilityRefusal, towerRefusal } from './gates.ts';
import type { SimEvent } from './events.ts';
import { createSim } from './sim.ts';
import { createState } from './state.ts';
import { SCRIPT_GATES } from './systems/triggers.ts';
import { createScratch } from './tick.ts';

const LIVE = compileContent(RAW_CONTENT);

/** fx_map as an Escort whose two groups are gated on `door_choice` (fx_map's core at (5, 4)). */
const DOORS: Partial<MapDef<FixtureIds, 'fx_map'>> = {
  objective: 'escort',
  markers: { rock: [0, 2], gate: [5, 4] },
  safeExit: 'gate',
  refugees: {
    always: { route: 'a', count: 2 },
    convoy: { route: 'a', count: 4, when: { flag: 'door_choice', eq: 'convoy' } },
    warren: { route: 'a', count: 5, when: { flag: 'door_choice', eq: 'warren' } },
  },
  flagVariants: { door_choice: ['convoy', 'warren'] },
};
const C = compileContent({
  ...SIM_FIXTURE,
  maps: { fx_map: { ...SIM_FIXTURE.maps.fx_map, ...DOORS } },
});
const MAP = C.maps.fx_map;

/** No refugee of `group` lost (The Matriarch's Young's shape). */
function none(group: string): ConditionDef<IdSpace> {
  return { groupLost: group, lte: 0 };
}

describe('M6 state and entity fields', () => {
  it('start blank', () => {
    const state = createState(MAP, 1);
    expect(state).toMatchObject({
      refugeeTotal: 11, // createSim gates it by the run's flags
      revoked: { towers: [], abilities: [], uids: [] },
      scriptModifiers: { quillLockout: false, previewHidden: false },
      pendingInput: null,
      forcedResolved: [],
      trapSprung: [],
    });
    expect(state.stats).toMatchObject({
      lostByGroup: [0, 0, 0],
      refugeesGathered: 0,
      revocations: 0,
    });
    expect(ENEMY_BLANK).toMatchObject({
      gatherTicks: 0,
      gatherUid: 0,
      absorbs: 0,
      hollowAbsorbs: 0,
      gatheredSkitterkin: false,
      bonusMaxHp: 0,
      auraHastePct: 0,
      swarmChillPct: 0,
      latchCount: 0,
      blockerUid: 0,
      lulled: false,
      pullImmuneTicks: 0,
    });
    expect(TOWER_BLANK).toMatchObject({ jamMul: 1, swarmAlive: 0 });
    expect(ALLY_BLANK).toMatchObject({
      swarmState: 'home',
      swarmTicks: 0,
      blockCapacity: 0,
      blocking: 0,
    });
    expect(ZONE_BLANK.pinTicks).toBe(0);
  });
});

describe('refugee groups gated on a story flag (door_choice) and losses by group', () => {
  it('compile each group’s exit and gate', () => {
    expect(MAP.escort?.groups.map((g) => [g.id, g.exit, g.exitTile, g.when])).toEqual([
      ['always', 'gate', [5, 4], null],
      ['convoy', 'gate', [5, 4], { flag: 'door_choice', eq: 'convoy' }],
      ['warren', 'gate', [5, 4], { flag: 'door_choice', eq: 'warren' }],
    ]);
    expect(MAP.escort?.total).toBe(11); // every group
    expect(escortTotal(MAP, { door_choice: 'warren' })).toBe(7);
    expect(escortTotal(MAP, {})).toBe(2); // an unset flag never matches
  });

  it('walk only under their flag: createSim keeps the other side home and out of the total', () => {
    const sim = createSim(fixtureConfig({ content: C, scriptFlags: { door_choice: 'convoy' } }));
    const state = sim.state;
    expect(state.refugeeTotal).toBe(6);
    expect(state.refugeesReleased).toEqual([false, false, true]);
    expect(refugeesRemaining(state, MAP)).toBe(6);
  });

  it('spawnAllies does nothing for a group kept home', () => {
    const state = createState(MAP, 1);
    state.refugeesReleased[2] = true; // as createSim marks a gated-out group
    spawnRefugees(state, MAP, 'warren');
    expect(state.stats.refugeesSpawned).toBe(0);
    spawnRefugees(state, MAP, 'convoy');
    expect(state.stats.refugeesSpawned).toBe(4);
  });

  it('book a road loss to its group, an exit loss to none; groupLost reads it', () => {
    const state = createState(MAP, 1);
    const ctx = {
      content: C,
      map: MAP,
      config: fixtureConfig({ content: C }),
      scratch: createScratch(),
    };
    loseRefugee(state, 7, 'hushed', 1, 1);
    loseRefugee(state, 0, 'exit', 2);
    expect(state.stats.lostByGroup).toEqual([0, 1, 0]);
    expect(state.stats.refugeesLost).toBe(2);
    expect(evaluateCondition(none('always'), state, ctx)).toBe(true);
    expect(evaluateCondition(none('convoy'), state, ctx)).toBe(false);
    expect(evaluateCondition({ groupLost: 'convoy', gte: 1 }, state, ctx)).toBe(true);
  });
});

describe('the scriptInput command (T605)', () => {
  it('runs since T605: with no forced input pending it is rejected `forcedInput`', () => {
    const sim = createSim(fixtureConfig());
    sim.enqueue({ type: 'scriptInput', id: 'seal' });
    sim.step();
    const out: SimEvent<FixtureIds>[] = [];
    sim.drainEvents(out);
    expect(out).toContainEqual({
      type: 'CommandRejected',
      cmd: { type: 'scriptInput', id: 'seal' },
      reason: 'forcedInput',
    });
  });
});

describe('FEATURE_GATES, SCRIPT_GATES, and HARNESS_GATES (T600a rows; D141)', () => {
  it('name the task that lifts each M6 mechanic, and M7/M8 for the later ones', () => {
    expect(FEATURE_GATES).toMatchObject({
      'enemy.gather': null, // T602
      'map.rift': null, // T602
      'enemy.hasteAura': null, // T603
      'attack.spawner': null, // T604
      'ability.pathTrap': null, // T604
      'map.holdout': null, // T605
      'ally.blocker': null, // T605
      'status.lulled': null, // T607
      'tower.field': null, // T608
      'enemy.boss.layToRest': 'M8',
    });
    // T605's forcedInputResolved, forceInput, and endMap run (sim/holdout.test.ts), and T606's
    // revokeTowerClass, revokeAbility, and setModifier (sim/revoke.test.ts).
    // Retargeted by D146 (T700a: sim/m7seams.test.ts); T706 runs objectiveCompleted, spawnWave,
    // and the `cleared` atom; T707 runs openTile.
    expect(SCRIPT_GATES).toEqual({
      restProgressPct: 'M8',
      setLighting: 'M8',
      checkpoint: 'M8',
      restoreTowerClass: 'M8',
      startTimer: 'M8',
      setTimerRate: 'M8',
      setPhase: 'M8',
    });
  });

  it('run the Act III towers (none of M6’s waits for its task now)', () => {
    // The Scuttle Den and Underfoot run since T604 (sim/swarmlings.test.ts), the Hum Choir since
    // T607 (sim/systems/auras.test.ts, sim/lull.test.ts), the Stasis Bloom since T608
    // (sim/bloom.test.ts). M7's stubs wait (sim/m7seams.test.ts).
    for (const id of ['burrow', 'choir', 'bloom']) expect(STUB_TOWER_TASKS).not.toHaveProperty(id);
    expect(towerRefusal(TOWERS.burrow)).toBeNull();
    expect(towerRefusal(TOWERS.choir)).toBeNull();
    expect(towerRefusal(TOWERS.bloom)).toBeNull();
    // A closed row still refuses what a tower's tiers use (the field's, as before T608).
    expect(towerRefusal(TOWERS.bloom, { ...FEATURE_GATES, 'tower.field': 'T608' }, {})).toBe(
      'a field (bloom) is not simulated until T608',
    );
    expect(abilityRefusal(LIVE.abilities.underfoot)).toBeNull();
  });
});

describe('the M6 content (stubs under their final ids)', () => {
  it('compiles the roster rows (enemies.md § 5.3–5.4)', () => {
    expect(LIVE.enemies.maw).toMatchObject({
      hp: 400,
      armor: 2,
      leak: 2,
      bounty: 20,
      hushes: false, // a Maw's one hush is a gather
      gather: {
        everyTicks: 240,
        tellTicks: 60,
        radiusSq: 1,
        maxAbsorbs: 5,
        growPct: 0.1,
        leakPerAbsorb: 1,
        bountyPerHollowAbsorb: 3,
      },
    });
    expect(LIVE.enemies.undertow.burrow).toMatchObject({ everyTicks: 420, durationTicks: 180 });
    expect(LIVE.enemies.compliance).toMatchObject({ hp: 120, armor: 4, leak: 1, bounty: 6 });
    expect(LIVE.enemies.expediter.hasteAura).toEqual({ radiusTiles: 2, radiusSq: 4, pct: 0.3 });
  });

  it('compiles the towers and Underfoot (towers.md § 7; core-loop.md § 3.2)', () => {
    const den = LIVE.towers.burrow;
    expect(den.tiers.map((t) => t.attack)).toMatchObject([
      {
        kind: 'spawner',
        ally: 'swarmling',
        maxAlive: 3,
        damage: 5,
        latchTicks: 240,
        restTicks: 180,
        chillPct: 0.1,
      },
      { maxAlive: 4 },
      { damage: 8, latchTicks: 300 },
    ]);
    expect(den.specs?.b).toMatchObject({
      targets: { ground: true, air: true },
      attack: { ally: 'champion', maxAlive: 3, damage: 20, chillPct: 0.15 },
    });
    const choir = LIVE.towers.choir;
    expect(choir.tiers.map((t) => [t.jamMul, t.auras[0]?.pct, t.auras[0]?.radiusTiles])).toEqual([
      [0.5, 0.1, 1.5],
      [0.5, 0.15, 2],
      [0.25, 0.2, 2],
    ]);
    expect(choir.specs?.a.lull).toEqual({ radiusTiles: 2.5, radiusSq: 6.25 });
    expect(choir.specs?.b.jamMul).toBe(0);
    expect(LIVE.towers.bloom.tiers.map((t) => t.field)).toMatchObject([
      { radiusTiles: 2, chillPct: 0.3, pulseEveryTicks: 600, stasisTicks: 90 },
      { pulseEveryTicks: 480 },
      { radiusTiles: 2.5, stasisTicks: 120 },
    ]);
    expect(LIVE.towers.bloom.specs?.a.field).toMatchObject({
      pullBackTiles: 1.5,
      pullBackCooldownTicks: 1200,
    });
    expect(LIVE.abilities.underfoot).toMatchObject({
      companion: 'bramble',
      cooldownTicks: 3000,
      effect: { kind: 'pathTrap', type: 'kinetic', damage: 30, pinTicks: 60, durationTicks: 360 },
    });
  });
});
