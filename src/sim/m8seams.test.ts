// The finale's seams (T800a; D154): the new state, stats, and entity fields start blank;
// FEATURE_GATES and SCRIPT_GATES (HARNESS_GATES: balance/refusals.m8.test.ts) name the task that lifts each finale row; the
// Unsung stub compiles and is refused whole, naming T808; the `phaseAtLeast` condition reads the
// script phase; the tick slots run and change nothing; and the validators reject each malformed
// boss phase kind. The dev maps, the map-level shapes, and their refusals:
// render/__fixtures__/devM8.test.ts.
import { describe, expect, it } from 'vitest';
import type { CompiledEnemyDef, CompiledMapDef } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { EnemyDef, IdSpace, RawContent } from '../content/types.ts';
import { validate } from '../content/validate.ts';
import { SIM_FIXTURE, fixtureConfig } from './__fixtures__/sim.ts';
import { evaluateCondition, settledCondition } from './conditions.ts';
import { ENEMY_BLANK } from './entities.ts';
import { FEATURE_GATES, gateRefusals } from './gates.ts';
import { hashState } from './hashState.ts';
import { phaseReached } from './phases.ts';
import { restProgress } from './song.ts';
import { createState } from './state.ts';
import { SCRIPT_GATES } from './systems/triggers.ts';
import { SYSTEMS, createScratch, runTick } from './tick.ts';

const LIVE = compileContent(RAW_CONTENT);
const FX = compileContent(SIM_FIXTURE);
const MAP = FX.maps.fx_map;

describe('the finale state and entity fields', () => {
  it('start blank', () => {
    const state = createState(MAP, 1);
    expect(state).toMatchObject({
      phase: 1,
      phaseTick: 0,
      timers: [],
      restPoints: 0,
      restTarget: 0,
      choir: { singers: 0, voices: 0, dist: 0, x: 0, y: 0, halted: false, arrived: false },
      lightingKey: null,
      abilitiesLocked: [],
    });
    expect(state.stats).toMatchObject({
      restedKills: 0,
      scatteredKills: 0,
      voicesMin: 0,
      boreProgress: 0,
    });
    expect(ENEMY_BLANK).toMatchObject({ scatterTicks: 0, scatteredOnce: false });
  });

  it("size the timers and the rest target from the map's data", () => {
    const map: CompiledMapDef<IdSpace> = {
      ...MAP,
      timers: [{ id: 'deep_bore', fillTicks: 600, bossHpPerTenth: 0.05 }],
      song: {
        baseRadius: 2.5,
        silentPct: 0.6,
        restTarget: 40,
        restPerTick: 0.01,
        restPerBossHp: 0,
        multipliers: [],
        scatter: { reformTicks: 240, hpPct: 0.5 },
      },
    };
    const state = createState(map, 1);
    expect(state.timers).toEqual([{ filled: 0, ratePct: 0, running: false, full: false }]);
    expect(state.restTarget).toBe(40);
    expect(restProgress(state)).toBe(0);
    state.restPoints = 50;
    expect(restProgress(state)).toBe(1); // capped
  });
});

describe('the tick slots (T804–T807 fill them)', () => {
  it('run in the pipeline and change nothing yet', () => {
    const names = SYSTEMS.map((s) => s.name);
    for (const n of ['timers', 'phases', 'choir', 'echo', 'song'] as const) {
      expect(names, n).toContain(n);
    }
    const slots = SYSTEMS.filter((s) =>
      ['timers', 'phases', 'choir', 'echo', 'song'].includes(s.name),
    );
    const state = createState(MAP, 1);
    const before = hashState(state);
    const ctx = { content: FX, map: MAP, config: fixtureConfig(), scratch: createScratch() };
    runTick(state, ctx, slots);
    state.tick = 0; // runTick advances the clock; nothing else may change
    expect(hashState(state)).toBe(before);
  });

  it("phaseReached reads the script phase's clock", () => {
    const state = createState(MAP, 1);
    expect(phaseReached(state, 1, 0)).toBe(true);
    expect(phaseReached(state, 2, 0)).toBe(false);
    state.phase = 2;
    state.phaseTick = 100;
    state.tick = 1299;
    expect(phaseReached(state, 2, 1200)).toBe(false);
    state.tick = 1300;
    expect(phaseReached(state, 2, 1200)).toBe(true);
    expect(phaseReached(state, 1, 99999)).toBe(true); // a later phase
  });
});

describe('the `phaseAtLeast` condition atom (T800a; live)', () => {
  it('reads the script phase, settling true once reached', () => {
    const state = createState(MAP, 1);
    const ctx = { content: FX, map: MAP, config: fixtureConfig(), scratch: createScratch() };
    const c = { phaseAtLeast: 3 } as const;
    expect(evaluateCondition(c, state, ctx)).toBe(false);
    expect(settledCondition(c, state, ctx)).toBeNull();
    state.phase = 3;
    expect(evaluateCondition(c, state, ctx)).toBe(true);
    expect(settledCondition(c, state, ctx)).toBe(true);
  });
});

describe('FEATURE_GATES and SCRIPT_GATES (T800a rows; D154)', () => {
  it('name the task that lifts each finale mechanic', () => {
    expect(FEATURE_GATES).toMatchObject({
      'map.choir': 'T804',
      'map.song': 'T805',
      'map.timers': 'T806',
      'enemy.boss.layToRest': 'T808',
      'enemy.boss.floor': 'T808',
      'enemy.boss.burrowTo': 'T808',
      'enemy.boss.adds': 'T808',
    });
    expect(SCRIPT_GATES).toEqual({
      restProgressPct: 'T805',
      choirAt: 'T806',
      timerFull: 'T806',
      phase: 'T806',
      setPhase: 'T806',
      startTimer: 'T806',
      setTimerRate: 'T806',
      setLighting: 'T806',
      checkpoint: 'T806',
      restoreTowerClass: 'T807',
      lockAbility: 'T807',
      spawnEcho: 'T807',
      restAll: 'T805',
    });
    // HARNESS_GATES' finale rows (#2 Voices: T804; #18 song timing: T821): balance/refusals.m8.test.ts.
  });

  it('refuse the Unsung whole until T808, naming each part', () => {
    const unsung: CompiledEnemyDef = LIVE.enemies.unsung;
    // As m3seams.test.ts's contentWith: the fixture map's groups all send it.
    const waves = MAP.waves.map((w) =>
      Object.assign({}, w, {
        groups: w.groups.map((g) => Object.assign({}, g, { enemy: unsung })),
      }),
    );
    const content = { ...FX, maps: { fx_map: Object.assign({}, MAP, { waves }) } };
    expect(gateRefusals(fixtureConfig({ content }))).toEqual([
      "a boss ending 'layToRest' (unsung) is not simulated until T808",
      "a phase's HP floor (unsung) is not simulated until T808",
      'a burrow toward the choir (unsung) is not simulated until T808',
      "a phase's adds (unsung) is not simulated until T808",
    ]);
  });
});

describe('the finale content (the Unsung, a stub under its final id)', () => {
  it('compiles its four forms (enemies.md § 6; D154)', () => {
    const u = LIVE.enemies.unsung;
    expect([u.hp, u.faction, u.body, u.bounty]).toEqual([30000, 'hollow', 'void', 0]);
    const boss = u.boss!;
    expect(boss.ending).toBe('layToRest');
    expect(boss.phases.map((p) => [p.fromPct, p.floorPct, p.burrowTo])).toEqual([
      [1, 0, null],
      [0.75, 0, null],
      [0.5, 0, 'choir'],
      [0.25, 0.01, null],
    ]);
    expect(boss.phases[0]?.gather).not.toBeNull();
    expect(boss.phases[2]?.burrow).toMatchObject({ times: 2, durationTicks: 180 });
    expect(boss.phases[3]?.adds).toEqual({ enemy: 'silencer', count: 1, everyTicks: 1200 });
    expect(u.sprites).toEqual({ body: 'enemy.unsung', icon: 'icon.enemy.unsung' });
  });
});

// ── The validators reject each malformed boss phase kind ──────────────────────────────────────

/** The live content with `enemies` patched in. */
function live(enemies: Record<string, EnemyDef>): RawContent<IdSpace> {
  return { ...RAW_CONTENT, enemies: { ...RAW_CONTENT.enemies, ...enemies } };
}
/** The errors of rule `rule` in `raw`. */
function errors(raw: RawContent<IdSpace>, rule: string): string[] {
  return validate(raw).filter((e) => e.startsWith(`[${rule}] `));
}
const UNSUNG = RAW_CONTENT.enemies.unsung;

describe('validation of the finale boss phases', () => {
  it('accepts the live content', () => {
    expect(() => compileContent(RAW_CONTENT)).not.toThrow();
  });

  it('[enemy-ability]: the floor, burrowTo, adds, and the layToRest ending', () => {
    const [p1, p2, p3, p4] = UNSUNG.boss!.phases;
    const { floorPct: _floor, ...song } = p4!;
    const bad: EnemyDef = {
      ...UNSUNG,
      boss: {
        ...UNSUNG.boss!,
        phases: [
          { ...p1!, floorPct: 1 },
          p2!,
          { fromPct: p3!.fromPct, burrowTo: 'choir' },
          { ...song, adds: { enemy: 'nobody', count: 0, everySec: 0 } },
        ],
      },
    };
    expect(errors(live({ unsung: bad }), 'enemy-ability')).toEqual([
      "[enemy-ability] enemies.unsung.boss.phases[0].floorPct: must be above 0 and below its phase's start",
      '[enemy-ability] enemies.unsung.boss.phases[2].burrowTo: goes with a `burrow` in the same phase',
      "[enemy-ability] enemies.unsung.boss.phases[3].adds.enemy: unknown enemy 'nobody'",
      '[enemy-ability] enemies.unsung.boss.phases[3].adds.count: must be a whole number ≥ 1',
      '[enemy-ability] enemies.unsung.boss.phases[3].adds.everySec: must be > 0',
      "[enemy-ability] enemies.unsung.boss.ending: a 'layToRest' boss's last phase has a floorPct (the song ends it)",
    ]);
    const everglow: EnemyDef = { ...UNSUNG, faction: 'everglow' };
    expect(errors(live({ unsung: everglow }), 'enemy-ability')).toContain(
      '[enemy-ability] enemies.unsung.boss.ending: only the Hollow is laid to rest',
    );
    const maw = RAW_CONTENT.enemies.gathering_maw;
    const floored: EnemyDef = {
      ...maw,
      boss: {
        ...maw.boss!,
        phases: [{ ...maw.boss!.phases[0]!, floorPct: 0.1 }, maw.boss!.phases[1]!],
      },
    };
    expect(errors(live({ gathering_maw: floored }), 'enemy-ability')).toEqual([
      "[enemy-ability] enemies.gathering_maw.boss.phases[0].floorPct: only a 'layToRest' boss has an HP floor",
    ]);
  });
});
