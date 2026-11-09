// The M4 seams (T400a): the new command, events, state fields, stub systems, condition atoms, and
// the `wreckageCleared` trigger are declared; the stubs change nothing; FEATURE_GATES refuses each
// new mechanic, naming the task that lifts it; the M4 content is registered under its final ids
// and refused until its task; and the stub towers agree with content's TOWERS_AHEAD_OF_TASK.
import { describe, expect, it } from 'vitest';
import type { CompiledEnemyDef, CompiledMapDef, CompiledTier } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { TOWERS_AHEAD_OF_TASK } from '../content/towers/index.ts';
import type { ConditionDef, IdSpace } from '../content/types.ts';
import {
  GUN,
  MAP,
  RUNNER,
  WALKER,
  enemyDef,
  setup,
  spawn,
  tierWith,
} from './__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig, fixtureSim, type FixtureIds } from './__fixtures__/sim.ts';
import { copyCommand, type Command } from './commands.ts';
import { evaluateCondition, settledCondition } from './conditions.ts';
import type { SimConfig } from './config.ts';
import { blinkStep } from './enemyAbilities/blink.ts';
import { cloakedOut } from './enemyAbilities/cloak.ts';
import { ENEMY_BLANK, PROJECTILE_BLANK, TOWER_BLANK } from './entities.ts';
import type { SimEvent } from './events.ts';
import { FEATURE_GATES, gateRefusals, stubTowerGate, towerRefusal } from './gates.ts';
import { leakToAsset } from './objectives.ts';
import { createState, type ObjectiveStatus } from './state.ts';
import { detection } from './systems/detection.ts';
import { movement } from './systems/movement.ts';
import { SCRIPT_GATES, triggers, unsupportedScript } from './systems/triggers.ts';

const LIVE = compileContent(RAW_CONTENT);

type Map = CompiledMapDef<IdSpace>;

/** Fixture content with fx_map patched by `map` and every wave group's enemy set to `def`. */
function contentWith(def: CompiledEnemyDef | null, map: Partial<Map> = {}): SimConfig<IdSpace> {
  const waves =
    def === null
      ? MAP.waves
      : MAP.waves.map((w) =>
          Object.assign({}, w, {
            groups: w.groups.map((g) => Object.assign({}, g, { enemy: def })),
          }),
        );
  const fx = Object.assign({}, MAP, { waves }, map);
  return fixtureConfig({ content: { ...FIXTURE_CONTENT, maps: { fx_map: fx } } });
}

/** The fixture config with fx_gun's tier 1 replaced by `tier`. */
function gun(tier: CompiledTier): SimConfig<IdSpace> {
  const fxGun = { ...GUN, tiers: [tier, GUN.tiers[1], GUN.tiers[2]] as const };
  return fixtureConfig({
    content: { ...FIXTURE_CONTENT, towers: { ...FIXTURE_CONTENT.towers, fx_gun: fxGun } },
  });
}

describe('the interact command (T409)', () => {
  it('is declared, copied, logged, and rejected notImplemented until T409', () => {
    const cmd: Command<FixtureIds> = { type: 'interact', marker: 'rock' };
    const copy = copyCommand(cmd);
    expect(copy).toEqual(cmd);
    expect(copy).not.toBe(cmd);
    const sim = fixtureSim();
    sim.enqueue(cmd);
    sim.applyPending();
    const out: SimEvent<FixtureIds>[] = [];
    sim.drainEvents(out);
    expect(out).toEqual([{ type: 'CommandRejected', cmd, reason: 'notImplemented' }]);
    expect(sim.state.commandLog).toHaveLength(1);
  });
});

describe('M4 state fields', () => {
  it('start blank', () => {
    const state = createState(MAP, 1);
    expect(state.stats).toMatchObject({
      bossBlinks: 0,
      leaksByFaction: { skitterkin: 0, aelari: 0, everglow: 0, hollow: 0 },
      leaksByEnemy: {},
    });
    expect(state).toMatchObject({ asset: 0, maxAsset: 0, clickable: [], interacted: [] });
    expect(ENEMY_BLANK).toMatchObject({
      hushTicks: 0,
      hushUid: 0,
      heavy: false,
      skittishTicks: 0,
      pulseTicks: 0,
      blinkTicks: 0,
      revealedTicks: 0,
      stasisTicks: 0,
      stasisImmuneTicks: 0,
      pinnedTicks: 0,
      pinImmuneTicks: 0,
    });
    expect(TOWER_BLANK).toMatchObject({ bonusDetectTiles: 0, linkKillCredits: 0, chargeTicks: 0 });
    expect(PROJECTILE_BLANK.homing).toBe(false);
  });

  it("starts a Protect map's asset meter full", () => {
    const asset = { integrity: 10, marker: 'rock', tile: [0, 2] as const, routes: ['a'] };
    const state = createState({ ...MAP, objective: 'protect', asset }, 1);
    expect([state.asset, state.maxAsset]).toEqual([10, 10]);
  });

  it('are hashed', () => {
    const base = fixtureSim().hash();
    const pokes: [string, (s: object) => void][] = [
      ['asset', (s) => Reflect.set(s, 'asset', 3)],
      ['clickable', (s) => Reflect.set(s, 'clickable', ['rock'])],
      ['bossBlinks', (s) => Reflect.set(Reflect.get(s, 'stats'), 'bossBlinks', 1)],
      [
        'leaksByFaction',
        (s) => Reflect.set(Reflect.get(Reflect.get(s, 'stats'), 'leaksByFaction'), 'hollow', 1),
      ],
    ];
    for (const [name, poke] of pokes) {
      const sim = fixtureSim();
      poke(sim.state);
      expect(sim.hash(), name).not.toBe(base);
    }
  });
});

describe('stub systems change nothing', () => {
  it('detection, and the blink, cloak, and asset stubs', () => {
    const { state, ctx } = setup();
    const mote = spawn(state, LIVE.enemies.mote, { dist: 2 });
    const witch = spawn(state, LIVE.enemies.glass_witch, { dist: 1 });
    const before = JSON.stringify(state);
    detection(state, ctx);
    const phases = LIVE.enemies.glass_witch.boss!.phases;
    blinkStep(state, ctx, witch, phases[1]!.blink!);
    expect(cloakedOut(mote)).toBe(false);
    expect(leakToAsset(state, MAP, mote)).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('leaks by faction and enemy (Hiccup Contained)', () => {
  it('movement counts every leak but a medal-exempt one', () => {
    const { state } = setup();
    const end = MAP.routes.a!.lengthTiles;
    spawn(state, WALKER, { dist: end - 0.001 });
    spawn(state, RUNNER, { dist: end - 0.001, tags: ['fleeing'] });
    const hollow = enemyDef('fx_hollow', { faction: 'hollow', body: 'void' });
    spawn(state, hollow, { dist: end - 0.001 });
    movement(state);
    expect(state.stats.leaksByFaction).toEqual({
      skitterkin: 1,
      aelari: 0,
      everglow: 0,
      hollow: 1,
    });
    expect(state.stats.leaksByEnemy).toEqual({ fx_walker: 1, fx_hollow: 1 });
  });

  it('the `leaks` atom reads them: a run atom that settles false past lte', () => {
    const { state, ctx } = setup();
    const none: ConditionDef<IdSpace> = { leaks: { faction: 'hollow' }, lte: 0 };
    const byEnemy: ConditionDef<IdSpace> = { leaks: { enemy: 'fx_walker' }, gte: 2 };
    const any: ConditionDef<IdSpace> = { leaks: {}, gte: 2 };
    expect(evaluateCondition(none, state, ctx)).toBe(true);
    expect(settledCondition(none, state, ctx)).toBeNull();
    state.stats.leaksByFaction.hollow = 1;
    state.stats.leaksByFaction.skitterkin = 1;
    expect(evaluateCondition(none, state, ctx)).toBe(false);
    expect(settledCondition(none, state, ctx)).toBe(false);
    expect(evaluateCondition(any, state, ctx)).toBe(true);
    expect(evaluateCondition(byEnemy, state, ctx)).toBe(false);
    state.stats.leaksByEnemy.fx_walker = 2;
    expect(settledCondition(byEnemy, state, ctx)).toBe(true);
  });
});

describe('wreckage by marker and objectives as conditions', () => {
  // fx_map's (4, 3) is wreckage; give it a marker.
  const wreckMap = { ...MAP, markers: { ...MAP.markers, crew_log: [4, 3] as const } };

  it('`wreckageCleared` is true once the drone clears the tile under the marker', () => {
    const { state, ctx: base } = setup();
    const ctx = { ...base, map: wreckMap };
    const c: ConditionDef<IdSpace> = { wreckageCleared: 'crew_log' };
    expect(evaluateCondition(c, state, ctx)).toBe(false);
    expect(settledCondition(c, state, ctx)).toBeNull();
    state.wreckage.cleared.push(3 * MAP.cols + 4);
    expect(evaluateCondition(c, state, ctx)).toBe(true);
    expect(settledCondition(c, state, ctx)).toBe(true);
  });

  it('`objectiveDone` reads another objective, settling when it does', () => {
    const objective = {
      id: 'crew_logs',
      name: 'Crew Logs',
      description: 'x',
      condition: { wreckageCleared: 'crew_log' } as const,
      intel: 1,
      onComplete: [],
    };
    const { state, ctx: base } = setup();
    const ctx = { ...base, map: { ...wreckMap, objectives: [objective] } };
    const state2 = { ...state, objectives: ['open'] as ObjectiveStatus[] };
    const c: ConditionDef<IdSpace> = { objectiveDone: 'crew_logs' };
    expect(evaluateCondition(c, state2, ctx)).toBe(false);
    expect(settledCondition(c, state2, ctx)).toBeNull();
    state2.objectives[0] = 'done';
    expect([evaluateCondition(c, state2, ctx), settledCondition(c, state2, ctx)]).toEqual([
      true,
      true,
    ]);
    state2.objectives[0] = 'failed';
    expect(settledCondition(c, state2, ctx)).toBe(false);
  });

  it('the `wreckageCleared` trigger runs (A2M1 w06), and is no unsupported script part', () => {
    const { state, ctx: base } = setup();
    const events = [
      {
        id: 'log',
        on: { wreckageCleared: 'crew_log' },
        when: null,
        actions: [{ cue: 'fx_map_w06' }],
        once: true,
      },
    ];
    const map = { ...wreckMap, events };
    const ctx = { ...base, map };
    state.scriptFired = [false];
    expect(unsupportedScript(map)).toEqual([]);
    triggers(state, ctx);
    expect(state.events).toEqual([]);
    state.wreckage.cleared.push(3 * MAP.cols + 4);
    triggers(state, ctx);
    expect(state.events).toEqual([{ type: 'ScriptCue', cueId: 'fx_map_w06' }]);
  });

  it('unsupportedScript names the task for each Act II part (SCRIPT_GATES)', () => {
    expect(SCRIPT_GATES).toMatchObject({
      interacted: 'T409',
      setClickable: 'T409',
      setLighting: 'T410a',
      checkpoint: 'T305b',
      'bossEnd.pivot': 'T305c (M5)',
    });
    const events = [
      { id: 'a', on: { interacted: 'rock' }, when: null, actions: [], once: true },
      { id: 'b', on: { tick: 1 }, when: null, actions: [{ setLighting: 'dusk' }], once: true },
      { id: 'c', on: { tick: 1 }, when: null, actions: [{ checkpoint: true }], once: true },
    ] as const;
    expect(unsupportedScript({ ...MAP, events })).toEqual([
      "event 'a': trigger interacted is not simulated until T409",
      "event 'b': action setLighting is not simulated until T410a",
      "event 'c': action checkpoint is not simulated until T305b",
    ]);
  });
});

describe('FEATURE_GATES (T400a rows)', () => {
  it('names the lifting task for every M4 mechanic (D101)', () => {
    expect(FEATURE_GATES).toMatchObject({
      'enemy.blink': 'T404',
      'map.protect': 'T305a',
      'run.checkpoints': 'T305b',
      // Cloaks, detection, the Lookout, and Scanner Sweep run since T406 (systems/detection.test.ts).
      'enemy.cloak': null,
      'tower.detection': null,
      'tower.lookout': null,
      'ability.reveal': null,
      'status.stasis': 'T407a',
      'attack.homing': 'T407b',
      'attack.charge': 'T407b',
      'status.pinned': 'T408',
      'attack.line': 'T408',
      'attack.targetFilter': 'T408',
      'tower.economy': 'T408',
      'tower.harpoon': 'T408',
      'tower.crane': 'T408',
      'map.clickable': 'T409',
      'map.revisit': 'T410a',
      // Renumbered by D101 (M5 = Act II, part two; M6 = Act III; M7 = the finale).
      'attack.beam': 'M5',
      'status.unnerved': 'M5',
      'enemy.boss.pivot': 'M5',
      'attack.spawner': 'M6',
      'enemy.boss.layToRest': 'M7',
    });
  });

  it('refuses the Act II enemies by mechanic, naming the enemy', () => {
    const e = LIVE.enemies;
    // The hush rule and Skittish run since T402 (enemyAbilities/hush.test.ts): Motes, alone or
    // beside a fleeing group (fx_map's W2 runners flee), are refused nothing.
    const untagged = MAP.waves.map((w) =>
      Object.assign({}, w, {
        groups: w.groups.map((g) => Object.assign({}, g, { enemy: e.mote, tags: [] })),
      }),
    );
    expect(gateRefusals(contentWith(null, { waves: untagged }))).toEqual([]);
    const groups = MAP.waves.map((w, i) =>
      Object.assign({}, w, {
        groups: i === 0 ? w.groups.map((g) => Object.assign({}, g, { enemy: e.mote })) : w.groups,
      }),
    );
    expect(gateRefusals(contentWith(null, { waves: groups }))).toEqual([]);
    // Her pulse runs since T403 (enemyAbilities/pulse.test.ts).
    expect(gateRefusals(contentWith(e.glass_witch))).toEqual([
      'a blink (glass_witch) is not simulated until T404',
    ]);
    // Cloaks run since T406 (systems/detection.test.ts).
    const veil = enemyDef('fx_veil', { cloaked: true, traits: ['cloaked'] });
    expect(gateRefusals(contentWith(veil))).toEqual([]);
    // Shields run since M1: the Aelari line units play (T403 confirmed them in play).
    for (const id of ['glimmer', 'weft_warden', 'lightwing'] as const) {
      expect(gateRefusals(contentWith(e[id])), id).toEqual([]);
    }
  });

  it('refuses Protect, revisits, and clickable objects on the map', () => {
    const asset = { integrity: 10, marker: 'rock', tile: [0, 2] as const, routes: ['a'] };
    expect(gateRefusals(contentWith(null, { objective: 'protect', asset }))).toEqual([
      'a Protect asset is not simulated until T305a',
    ]);
    expect(gateRefusals(contentWith(null, { revisitOf: 'a1_m02', revisitAt: [2, 1] }))).toEqual([
      "a revisit of 'a1_m02' is not simulated until T410a",
    ]);
    expect(gateRefusals(contentWith(null, { clickables: { rock: { name: 'A rock' } } }))).toEqual([
      'clickable objects (rock) is not simulated until T409',
    ]);
  });

  it('refuses the stub towers and their new tier abilities (the Lookout and Scanner Sweep play)', () => {
    const towers = { ...FIXTURE_CONTENT.towers, ...LIVE.towers };
    const cfg = (loadout: string[], specsUnlocked: string[] = []): SimConfig<IdSpace> => ({
      ...fixtureConfig(),
      content: { ...FIXTURE_CONTENT, towers },
      loadout,
      specsUnlocked,
    });
    // The Lookout and detection play since T406, its specs too.
    expect(gateRefusals(cfg(['lookout'], ['lookout']))).toEqual([]);
    expect(gateRefusals(cfg(['harpoon']))).toEqual([
      "the 'harpoon' tower is not simulated until T408",
    ]);
    expect(gateRefusals(cfg(['harpoon'], ['harpoon']))).toEqual([
      "the 'harpoon' tower is not simulated until T408",
      "a 'line' attack (harpoon) is not simulated until T408",
      'the pinned status (harpoon) is not simulated until T408',
    ]);
    expect(gateRefusals(cfg(['crane'], ['crane']))).toEqual([
      "the 'crane' tower is not simulated until T408",
      'tower economy (crane) is not simulated until T408',
      'a target filter (crane) is not simulated until T408',
      'the pinned status (crane) is not simulated until T408',
    ]);
    expect(towerRefusal(RAW_CONTENT.towers.lookout)).toBeNull();
    expect(towerRefusal(RAW_CONTENT.towers.rivet)).toBeNull();
    // Homing and charge attacks (T407b) on a fixture tier.
    const homing = tierWith(GUN.tiers[0], {
      kind: 'projectile',
      projectile: 'projectile.skyhook_flak',
      speedTilesPerTick: 0.2,
      splashTiles: 0,
      splashSq: 0,
      homing: true,
      volley: 4,
    });
    const charge: CompiledTier = tierWith(GUN.tiers[0], {
      kind: 'charge',
      chargeTicks: 240,
      splashTiles: 1,
      splashSq: 1,
      splashPct: 0.5,
    });
    expect(gateRefusals(gun(homing))).toEqual([
      'a homing or volley projectile (fx_gun) is not simulated until T407b',
    ]);
    expect(gateRefusals(gun(charge))).toEqual([
      "a 'charge' attack (fx_gun) is not simulated until T407b",
    ]);
    // Scanner Sweep in slot 1 plays since T406.
    const sweep: SimConfig<IdSpace> = {
      ...fixtureConfig(),
      content: {
        ...FIXTURE_CONTENT,
        abilities: { ...FIXTURE_CONTENT.abilities, ...LIVE.abilities },
      },
      abilities: { slot1: 'scanner_sweep', slot2: null, slot2State: 'none' },
    };
    expect(gateRefusals(sweep)).toEqual([]);
  });

  it('keeps the stub towers and content TOWERS_AHEAD_OF_TASK in step', () => {
    // A task that lifts a `tower.<id>` row drops the tower from TOWERS_AHEAD_OF_TASK too (and so
    // brings it into [quiet-wave-reach] and the catalog's tune-up check).
    for (const id of Object.keys(RAW_CONTENT.towers)) {
      expect(stubTowerGate(id) !== null, id).toBe(TOWERS_AHEAD_OF_TASK.includes(id));
    }
  });

  it('leaves the live campaign maps playable', () => {
    for (const mapId of LIVE.campaign) {
      const map = LIVE.maps[mapId];
      const cfg: SimConfig<IdSpace> = {
        content: LIVE,
        mapId,
        seed: 1,
        loadout: map.builds.parBuild.loadout,
        companion: null,
        modifiers: [],
        difficulty: 'standard',
        abilities: { slot1: 'orbital_strike', slot2: null, slot2State: 'none' },
        scriptFlags: {},
        specsUnlocked: [],
      };
      expect(gateRefusals(cfg), mapId).toEqual([]);
    }
  });
});
