// The M5 seams (T500a): the new state fields, entity fields, and stats start blank; the new stats
// are counted where they're cheap (`leaksByWave` in movement, `everRevealed` in detection) and read
// by the condition atoms (`leaks.waves`, `passedMarker.unrevealed`); FEATURE_GATES, SCRIPT_GATES,
// and HARNESS_GATES name the task that lifts each M5 row (D137); the three Aelari towers are
// refused whole until their tasks (content's STUB_TOWER_TASKS). The harness's rows and the M5 dev
// maps: balance/refusals.m5.test.ts, render/__fixtures__/devM5.test.ts.
import { describe, expect, it } from 'vitest';
import type { CompiledEnemyDef, CompiledMapDef } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { STUB_TOWER_TASKS, TOWERS } from '../content/towers/index.ts';
import type { ConditionDef, IdSpace, RawContent } from '../content/types.ts';
import { MAP, RUNNER, WALKER, enemyDef, setup, spawn } from './__fixtures__/combat.ts';
import { FIXTURE_CONTENT, SIM_FIXTURE, fixtureConfig } from './__fixtures__/sim.ts';
import { evaluateCondition, markerKey, markerPassedTick, trackConditions } from './conditions.ts';
import type { SimConfig } from './config.ts';
import { ALLY_BLANK, ENEMY_BLANK, TOWER_BLANK } from './entities.ts';
import {
  FEATURE_GATES,
  abilityRefusal,
  gateRefusals,
  stubTowerGate,
  towerRefusal,
} from './gates.ts';
import { createState, defaultMeterLabel } from './state.ts';
import { detection } from './systems/detection.ts';
import { movement } from './systems/movement.ts';
import { SCRIPT_GATES } from './systems/triggers.ts';

const LIVE = compileContent(RAW_CONTENT);

/** Fixture content with fx_map patched, and every wave group walked by `enemy` if given. */
function withMap(
  patch: Partial<CompiledMapDef<IdSpace>>,
  enemy: string | null = null,
): SimConfig<IdSpace> {
  const enemies: Readonly<Record<string, CompiledEnemyDef>> = LIVE.enemies;
  const def = enemy === null ? undefined : enemies[enemy];
  const waves =
    def === undefined
      ? MAP.waves
      : MAP.waves.map((w) =>
          Object.assign({}, w, {
            groups: w.groups.map((g) => Object.assign({}, g, { enemy: def })),
          }),
        );
  const fx = Object.assign({}, MAP, { waves }, patch);
  return fixtureConfig({ content: { ...FIXTURE_CONTENT, maps: { fx_map: fx } } });
}

describe('M5 state and entity fields', () => {
  it('start blank: the objective and meter are the map’s, no darkness, zero escort stats', () => {
    const state = createState(MAP, 1);
    expect([state.objective, state.meterLabel, state.dark]).toEqual(['defend', 'integrity', 0]);
    expect(state.stats).toMatchObject({
      leaksByWave: MAP.waves.map(() => 0),
      pivotWave: 0,
      refugeesSpawned: 0,
      evacuated: 0,
      refugeesLost: 0,
    });
    expect(
      (['escort', 'holdout', 'choir', 'protect'] as const).map((o) => defaultMeterLabel(o)),
    ).toEqual(['evacuated', 'evacuated', 'voices', 'integrity']);
    expect(ENEMY_BLANK).toMatchObject({
      phased: false,
      phaseTicks: 0,
      unnervedTicks: 0,
      noEvadeTicks: 0,
      everRevealed: false,
      ownerUid: 0,
      reformTicks: 0,
      standDownTicks: 0,
    });
    expect(TOWER_BLANK).toMatchObject({
      beamActive: false,
      beamRamp: 1,
      beam2Uid: 0,
      beam3Uid: 0,
      vsShieldPct: 0,
      linkRampPct: 0,
      linkMarkPct: 0,
      lit: true,
    });
    expect(ALLY_BLANK).toMatchObject({ group: -1, pebble: false, hushUid: 0, enemyId: null });
  });
});

describe('leaks by wave (Before the Dark)', () => {
  it('movement counts a non-exempt leak under the unit’s wave', () => {
    const { state, ctx } = setup();
    const end = MAP.routes.a!.lengthTiles;
    spawn(state, WALKER, { dist: end - 0.001 }).wave = 2;
    spawn(state, RUNNER, { dist: end - 0.001, tags: ['fleeing'] }).wave = 2; // exempt
    spawn(state, WALKER, { dist: end - 0.001 }).wave = 1;
    movement(state);
    expect(state.stats.leaksByWave.slice(0, 2)).toEqual([1, 1]);
    const last: ConditionDef<IdSpace> = { leaks: { waves: [2, 2] }, lte: 0 };
    const all: ConditionDef<IdSpace> = { leaks: { waves: [1, 2] }, gte: 2 };
    expect(evaluateCondition(last, state, ctx)).toBe(false);
    expect(evaluateCondition(all, state, ctx)).toBe(true);
  });
});

describe('passedMarker.unrevealed (Nothing Unseen)', () => {
  /** fx_map with a `post` marker beside the road's corner at (2, 2), route distance 4. */
  const RAW: RawContent<IdSpace> = {
    ...SIM_FIXTURE,
    maps: {
      fx_map: {
        ...SIM_FIXTURE.maps.fx_map,
        markers: { rock: [0, 2], post: [1, 2] },
        events: [
          {
            id: 'unseen',
            on: { tick: 0 },
            when: { passedMarker: { marker: 'post', unrevealed: true } },
            actions: [{ grantCredits: 1 }],
          },
        ],
      },
    },
  };
  const map = compileContent(RAW).maps.fx_map!;
  const veil = enemyDef('fx_veil', { cloaked: true, faction: 'aelari' });

  it('counts only a cloaked unit never Revealed, under its own key', () => {
    const state = createState(map, 1);
    const key = markerKey(undefined, true);
    expect(key).toBe('*:unrevealed');
    spawn(state, WALKER, { route: map.routes.a!, dist: 5 }); // not cloaked: never counts
    const seen = spawn(state, veil, { route: map.routes.a!, dist: 5 });
    seen.everRevealed = true;
    trackConditions(state, map);
    expect(markerPassedTick(state, 'post', key)).toBe(-1);
    spawn(state, veil, { route: map.routes.a!, dist: 5 });
    state.tick = 3;
    trackConditions(state, map);
    expect(markerPassedTick(state, 'post', key)).toBe(3);
  });

  it('detection marks a unit everRevealed the first tick it is Revealed', () => {
    const { state, ctx } = setup();
    const e = spawn(state, veil);
    detection(state, ctx);
    expect(e.everRevealed).toBe(false);
    e.revealedTicks = 2; // as a detector sets it
    detection(state, ctx);
    expect(e.everRevealed).toBe(true);
  });
});

describe('FEATURE_GATES, SCRIPT_GATES, and HARNESS_GATES (T500a rows; D137)', () => {
  it('name the task that lifts each M5 mechanic', () => {
    expect(FEATURE_GATES).toMatchObject({
      // Beams run since T504 (attacks/beam.test.ts).
      'attack.beam': null,
      // Escort runs since T305c (escort.test.ts).
      'map.escort': null,
      // The Penitent's shield-broken phase and the pivot run since T506 (penitent.test.ts).
      'enemy.boss.pivot': null,
      'enemy.boss.shieldBroken': null,
      // Sundown runs since T505 (darkness.test.ts).
      'map.darkness': null,
      'status.unnerved': 'T507',
      'attack.echo': 'T507',
      'ability.stasisArea': 'T507',
      'tower.markArea': 'T508',
      'status.noEvade': 'T508',
    });
    expect(SCRIPT_GATES).not.toHaveProperty('standDown'); // T506
    expect(SCRIPT_GATES).not.toHaveProperty('bossEnd.pivot');
    expect(SCRIPT_GATES).toMatchObject({
      // No M5 map uses these (D137).
      objectiveCompleted: 'M6',
      checkpoint: 'M7',
    });
  });

  it('refuse the M5 enemies by mechanic, naming the enemy', () => {
    // The Penitent runs since T506 (penitent.test.ts).
    expect(gateRefusals(withMap({}, 'sunderglass_penitent'))).toEqual([]);
    // Their mechanics ran before M5: the Veilwalker's cloak, the Blinkstrider's blink, the split;
    // phasing runs since T503 (phase.test.ts).
    // The Cantor's aura runs since T502 (shieldAura.test.ts).
    for (const id of [
      'veilwalker',
      'blinkstrider',
      'cantor',
      'fracture',
      'glimmer_shard',
      'riftmoth',
    ]) {
      expect(gateRefusals(withMap({}, id)), id).toEqual([]);
    }
  });

  it('refuse neither Escort nor Sundown on the map (T305c, T505)', () => {
    // Escort runs since T305c (escort.test.ts), Sundown's darkness since T505 (darkness.test.ts).
    expect(gateRefusals(withMap({ objective: 'escort' }))).toEqual([]);
    const lighting = [{ wave: 1, env: 'act2.dusk' as const, dark: 0.4 }];
    expect(gateRefusals(withMap({ lighting }))).toEqual([]);
    expect(gateRefusals(withMap({ lighting: [{ ...lighting[0]!, dark: 0 }] }))).toEqual([]);
  });

  it('refuse Stillness in a slot until T507', () => {
    expect(abilityRefusal(RAW_CONTENT.abilities.stillness)).toBe(
      "the 'stasisArea' ability (stillness) is not simulated until T507",
    );
  });
});

describe('the stub towers (STUB_TOWER_TASKS; T501k generalised)', () => {
  it('are refused whole, naming their task, whatever their tiers use', () => {
    expect(stubTowerGate('mindspike')).toBe('T507');
    expect(stubTowerGate('prism')).toBeNull(); // lifted by T504
    expect(stubTowerGate('rivet')).toBeNull();
    expect(stubTowerGate('lantern', {})).toBeNull();
    const towers: Readonly<Record<string, (typeof TOWERS)[keyof typeof TOWERS]>> = TOWERS;
    for (const [id, task] of Object.entries(STUB_TOWER_TASKS)) {
      expect(towerRefusal(towers[id]!), id).toBe(
        `the '${id}' tower is not simulated until ${task}`,
      );
    }
    // Lifted (no entry), a tower is refused only by what its tiers use: the Prism by nothing
    // since T504.
    expect(towerRefusal(TOWERS.prism)).toBeNull();
    const cfg: SimConfig<IdSpace> = {
      ...fixtureConfig(),
      content: LIVE,
      mapId: 'a1_m01',
      loadout: ['rivet', 'mindspike'],
    };
    expect(gateRefusals(cfg)).toContain("the 'mindspike' tower is not simulated until T507");
  });
});
