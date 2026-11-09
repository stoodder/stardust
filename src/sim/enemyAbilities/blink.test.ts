// Blinks (T404; enemyAbilities/blink.ts): the timer, the tell (holding still) and its landing, the
// blink along the route and its clamp, the interrupt rules (Stasis on a non-boss; a boss's
// converted Chilled never), the boss rules (a phase's first tell at once; waits between phases; a
// retreat cancels), `bossBlinks` and Glass Half Empty, Story scaling, the in-stage cue triggers,
// the lifted gate, and determinism on the dev map.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import type { CompiledBlink, CompiledScriptedEvent } from '../../content/compiled.ts';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { IdSpace } from '../../content/types.ts';
import { enemyDef, MAP, ROAD, setup, spawn } from '../__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig } from '../__fixtures__/sim.ts';
import { applyDamage } from '../combat/damage.ts';
import { evaluateCondition, settledCondition } from '../conditions.ts';
import type { Enemy } from '../entities.ts';
import type { SimEvent } from '../events.ts';
import { FEATURE_GATES, gateRefusals } from '../gates.ts';
import { createSim } from '../sim.ts';
import type { SimState } from '../state.ts';
import { segmentAt } from '../path.ts';
import { movement } from '../systems/movement.ts';
import { applyStasis } from '../systems/status.ts';
import { triggers } from '../systems/triggers.ts';
import { scaledEnemy } from '../systems/waves.ts';
import { activeBlink, blinkLanding, blinkStep, blinkTelling } from './blink.ts';
import { enemyAbilities } from './index.ts';

const LIVE = compileContent(RAW_CONTENT);
const WITCH = LIVE.enemies.glass_witch;
const SRC = { kind: 'ability', slot: 1 } as const;

/** Every 60 ticks, the last 15 the tell; 2.5 tiles. */
const BLINK: CompiledBlink = Object.freeze({ everyTicks: 60, tellTicks: 15, tiles: 2.5 });
const strider = enemyDef('fx_strider', { faction: 'aelari', body: 'crystalline', blink: BLINK });

type Ev = SimEvent<IdSpace>;
function events<T extends Ev['type']>(state: SimState, type: T): Extract<Ev, { type: T }>[] {
  return state.events.filter((e): e is Extract<Ev, { type: T }> => e.type === type);
}

/** The Witch in phase 2 (crossed 70% and through its invulnerability), at `dist` on the road. */
function witchInPhase2(dist = 1): { state: SimState; w: Enemy; step: () => void } {
  const { state, ctx } = setup();
  const w = spawn(state, WITCH, { dist });
  w.shieldHp = 0;
  enemyAbilities(state, ctx); // phase 1
  applyDamage(state, w, WITCH.hp * 0.31, 'kinetic', SRC); // 69%: to 70% exactly, phase 2
  expect(w.bossPhase).toBe(2);
  const step = (): void => enemyAbilities(state, ctx);
  while (w.invulnerableTicks > 0) step();
  return { state, w, step };
}

describe("a unit's own blink (M5's Blinkstrider)", () => {
  it('first tells one period after its first tick, holds still through the tell, then blinks', () => {
    const { state, ctx } = setup();
    const e = spawn(state, strider, { dist: 1 });
    blinkStep(state, ctx, e, BLINK);
    expect(e.blinkTicks).toBe(60);
    let telling = 0;
    let stillTicks = 0;
    for (let i = 0; i < 60; i++) {
      e.paceMul = 1;
      blinkStep(state, ctx, e, BLINK);
      if (blinkTelling(e, BLINK)) telling++;
      if (e.paceMul === 0) stillTicks++;
    }
    expect(telling).toBe(15); // 15 down to 1, then it blinks
    expect(stillTicks).toBe(15);
    expect(e.blinkTicks).toBe(60);
    expect(e.dist).toBeCloseTo(3.5, 12);
    const [tell] = events(state, 'BlinkTell');
    const [blinked] = events(state, 'Blinked');
    expect(tell).toMatchObject({ uid: e.uid, enemy: 'fx_strider', x: 1.5, y: 0.5 });
    // The tell shows where it lands; it held still, so that's where it went.
    expect(blinked).toMatchObject({ uid: e.uid, x: 1.5, y: 0.5, toX: tell!.toX, toY: tell!.toY });
    expect([e.x, e.y]).toEqual([blinked!.toX, blinked!.toY]);
    expect(state.stats.bossBlinks).toBe(0); // only a boss's blinks count
  });

  it('jumps along the route (round corners), keeping seg and position in step', () => {
    const { state, ctx } = setup();
    // fx_map's road runs (0.5,0.5) east to (2.5,0.5), then south: from dist 1.5, 2.5 on is dist 4.
    const e = spawn(state, strider, { dist: 1.5 });
    e.blinkTicks = 1;
    blinkStep(state, ctx, e, BLINK);
    expect(e.dist).toBe(4);
    expect(e.seg).toBe(segmentAt(ROAD, 4));
    expect([e.x, e.y]).toEqual([2.5, 2.5]);
  });

  it('lands at most on the route end, and leaks as movement runs', () => {
    const { state, ctx } = setup();
    const e = spawn(state, strider, { dist: ROAD.lengthTiles - 1 });
    const out = { x: 0, y: 0 };
    expect(blinkLanding(e, BLINK, out)).toBe(ROAD.lengthTiles);
    e.blinkTicks = 1;
    blinkStep(state, ctx, e, BLINK);
    expect(e.dist).toBe(ROAD.lengthTiles);
    movement(state);
    expect(e.alive).toBe(false);
    expect(events(state, 'EnemyLeaked')).toHaveLength(1);
  });
});

describe('the interrupt (enemies.md § 2.4; systems/status.ts isInterrupted)', () => {
  it('Stasis cancels a tell, even mid-tell, and the cooldown restarts', () => {
    const { state, ctx } = setup();
    const e = spawn(state, strider, { dist: 1 });
    e.blinkTicks = 10; // mid-tell
    e.stasisTicks = 3;
    blinkStep(state, ctx, e, BLINK);
    expect(e.blinkTicks).toBe(60);
    expect(events(state, 'BlinkInterrupted')).toEqual([{ type: 'BlinkInterrupted', uid: e.uid }]);
    expect(e.dist).toBe(1);
  });

  it('blocks a tell from starting (no event: it never began); before the tell the timer runs', () => {
    const { state, ctx } = setup();
    const e = spawn(state, strider, { dist: 1 });
    e.blinkTicks = 16;
    expect(applyStasis(e, 30)).toBe(true);
    blinkStep(state, ctx, e, BLINK);
    expect(e.blinkTicks).toBe(60);
    expect(state.events).toEqual([]);
    e.blinkTicks = 40;
    blinkStep(state, ctx, e, BLINK);
    expect(e.blinkTicks).toBe(39);
  });

  it("never touches the Witch: Stasis on a boss is Chilled 50% (D101)", () => {
    const { state, w, step } = witchInPhase2();
    step(); // the tell begins
    expect(events(state, 'BlinkTell')).toHaveLength(1);
    expect(applyStasis(w, 30)).toBe(false);
    expect(w.stasisTicks).toBe(0);
    expect(w.chillPct).toBe(0.5);
    w.stasisTicks = 30; // even forced, a boss is never interrupted
    for (let i = 0; i < 90; i++) step();
    expect(events(state, 'BlinkInterrupted')).toEqual([]);
    expect(events(state, 'Blinked')).toHaveLength(1);
  });
});

describe("the Glass Witch's blink (enemies.md § 6; D101)", () => {
  it('none in phase 1; from 70% her first tell starts with the phase, then every 7 s', () => {
    const { state, ctx } = setup();
    const w = spawn(state, WITCH, { dist: 1 });
    for (let t = 0; t < 900; t++) enemyAbilities(state, ctx);
    expect(activeBlink(w)).toBeNull();
    expect(events(state, 'BlinkTell')).toEqual([]);
    expect(w.blinkTicks).toBe(0);

    const p2 = witchInPhase2(1);
    const at: [string, number][] = [];
    for (let t = 1; t <= 1000; t++) {
      const before = p2.state.events.length;
      p2.step();
      for (const e of p2.state.events.slice(before)) {
        if (e.type === 'BlinkTell' || e.type === 'Blinked') at.push([e.type, t]);
      }
    }
    // The tell begins on the tick after the invulnerability ends (3 s after she crossed 70%, she
    // blinks), then one every 7 s.
    expect(at).toEqual([
      ['BlinkTell', 1],
      ['Blinked', 91],
      ['BlinkTell', 421],
      ['Blinked', 511],
      ['BlinkTell', 841],
      ['Blinked', 931],
    ]);
    expect(p2.state.stats.bossBlinks).toBe(3);
  });

  it('holds still through the tell and lands 2.5 tiles on', () => {
    const { state, w, step } = witchInPhase2(1);
    step();
    const [tell] = events(state, 'BlinkTell');
    expect(w.paceMul).toBe(0);
    for (let i = 0; i < 90; i++) {
      movement(state);
      step();
    }
    expect(w.dist).toBeCloseTo(3.5, 9);
    expect([w.x, w.y]).toEqual([tell!.toX, tell!.toY]);
    expect(events(state, 'Blinked')).toHaveLength(1);
  });

  it('waits while invulnerable between phases', () => {
    const { state, ctx } = setup();
    const w = spawn(state, WITCH, { dist: 1 });
    const blink = WITCH.boss!.phases[1]!.blink!;
    w.bossPhase = 2;
    w.blinkTicks = 10;
    w.invulnerableTicks = 5;
    blinkStep(state, ctx, w, blink);
    expect(w.blinkTicks).toBe(10);
    expect(blinkTelling(w, blink)).toBe(false);
    w.invulnerableTicks = 0;
    expect(blinkTelling(w, blink)).toBe(true);
  });

  it('a retreat at 40% cancels a tell: she leaves, never blinks again', () => {
    const { state, w, step } = witchInPhase2(1);
    step();
    const blink = activeBlink(w)!;
    expect(blinkTelling(w, blink)).toBe(true);
    applyDamage(state, w, WITCH.hp, 'kinetic', SRC); // to 40%: retreat
    expect(w.leaving).toBe(true);
    expect(blinkTelling(w, blink)).toBe(false);
    const dist = w.dist;
    for (let i = 0; i < 200 && w.alive; i++) step();
    expect(events(state, 'Blinked')).toEqual([]);
    expect(w.dist).toBe(dist);
    expect(state.stats.bossBlinks).toBe(0);
  });
});

describe('Glass Half Empty: retreat before 3 blinks (stats.bossBlinks)', () => {
  const half = { stat: 'bossBlinks', lte: 2 } as const;
  it('holds through two blinks and fails on the third', () => {
    const { state, ctx } = setup();
    const cctx = { ...ctx, links: {} };
    state.stats.bossBlinks = 2;
    expect(evaluateCondition(half, state, ctx)).toBe(true);
    expect(settledCondition(half, state, cctx)).toBeNull(); // still open
    state.stats.bossBlinks = 3;
    expect(evaluateCondition(half, state, ctx)).toBe(false);
    expect(settledCondition(half, state, cctx)).toBe(false);
  });
});

describe('Story difficulty (progression.md § 9)', () => {
  it('scales her HP and shield but no blink number; her thresholds follow her HP', () => {
    const pct = { hp: -0.3, shield: -0.3, speed: 0 };
    const story = scaledEnemy(WITCH, pct);
    expect(story.hp).toBeCloseTo(1260, 9);
    expect(story.boss!.phases[1]!.blink).toBe(WITCH.boss!.phases[1]!.blink);
    expect(story.boss!.phases.map((p) => p.fromPct)).toEqual([1, 0.7]);
    expect(story.boss!.endAtPct).toBe(0.4);
    // On Story she still enters phase 2 at 70% of her (scaled) HP and blinks on the same clock.
    const { state, ctx } = setup();
    const w = spawn(state, story, { dist: 1 });
    w.shieldHp = 0;
    enemyAbilities(state, ctx);
    applyDamage(state, w, story.hp * 0.31, 'kinetic', SRC);
    expect(w.bossPhase).toBe(2);
    expect(w.hp).toBeCloseTo(story.hp * 0.7, 9);
    for (let t = 0; t < 90 + 2; t++) enemyAbilities(state, ctx);
    expect(events(state, 'BlinkTell')).toHaveLength(1);
  });
});

describe("the in-stage cues (act2.md § A2M2: spawn with C1's flag, 70%, 55%, retreat)", () => {
  const ev = (
    id: string,
    on: CompiledScriptedEvent<IdSpace>['on'],
    when: CompiledScriptedEvent<IdSpace>['when'] = null,
  ): CompiledScriptedEvent<IdSpace> => ({ id, on, when, actions: [{ cue: id }], once: true });

  function run(spared: boolean): string[] {
    const events_ = [
      ev('spawn', { bossPhase: 1 }, { flag: 'spared_quiet_wave', eq: true }),
      ev('hp70', { bossHpPct: 0.7 }),
      ev('hp55', { bossHpPct: 0.55 }),
      ev('retreat', { bossHpPct: 0.4 }),
    ];
    const map = Object.assign({}, MAP, { events: events_ });
    const { state, ctx } = setup({ scriptFlags: { spared_quiet_wave: spared } });
    const c = Object.assign({}, ctx, { map });
    state.scriptFired = map.events.map(() => false);
    const w = spawn(state, WITCH, { dist: 1 });
    w.shieldHp = 0;
    const cues = (): string[] => events(state, 'ScriptCue').map((e) => e.cueId);
    const tick = (): void => {
      enemyAbilities(state, c);
      triggers(state, c);
    };
    tick();
    const out = [cues().join(',')];
    applyDamage(state, w, WITCH.hp * 0.31, 'kinetic', SRC); // to 70%
    tick();
    out.push(cues().join(','));
    while (w.invulnerableTicks > 0) tick();
    applyDamage(state, w, WITCH.hp * 0.15, 'kinetic', SRC); // to 55%
    tick();
    out.push(cues().join(','));
    applyDamage(state, w, WITCH.hp, 'kinetic', SRC); // to 40%: retreat
    expect(w.leaving).toBe(true);
    tick();
    out.push(cues().join(','));
    return out;
  }

  it('each fires on the tick after its threshold, the spawn line only with the flag', () => {
    expect(run(true)).toEqual([
      'spawn',
      'spawn,hp70',
      'spawn,hp70,hp55',
      'spawn,hp70,hp55,retreat',
    ]);
    expect(run(false)).toEqual(['', 'hp70', 'hp70,hp55', 'hp70,hp55,retreat']);
  });
});

describe('the gate (T404 lifts enemy.blink)', () => {
  it('a blinking unit and the Witch play', () => {
    expect(FEATURE_GATES['enemy.blink']).toBeNull();
    for (const enemy of [strider, WITCH]) {
      const waves = MAP.waves.map((w) =>
        Object.assign({}, w, { groups: w.groups.map((g) => Object.assign({}, g, { enemy })) }),
      );
      const fx = Object.assign({}, MAP, { waves });
      const cfg = fixtureConfig({ content: { ...FIXTURE_CONTENT, maps: { fx_map: fx } } });
      expect(gateRefusals(cfg), enemy.id).toEqual([]);
    }
  });
});

describe('dev_witch (render/__fixtures__/devBattle.ts)', () => {
  /** Par's Zapcoils, the wave called; the boss events and the end state. */
  function play(): { log: string[]; hash: string; blinks: number; outcome: string } {
    const sim = createSim(battleConfig('dev_witch', 1));
    for (const s of sim.map.builds.parBuild.steps) {
      if ('build' in s) sim.enqueue({ type: 'build', tower: s.build, tile: s.tile });
    }
    sim.enqueue({ type: 'callWave' });
    const log: string[] = [];
    const out: Ev[] = [];
    while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 120) {
      sim.step();
      out.length = 0;
      sim.drainEvents(out);
      for (const e of out) {
        if (e.type === 'BlinkTell' || e.type === 'Blinked' || e.type === 'BossEnded') {
          log.push(`${sim.state.tick} ${e.type}`);
        }
      }
    }
    return {
      log,
      hash: sim.hash(),
      blinks: sim.state.stats.bossBlinks,
      outcome: sim.state.outcome,
    };
  }

  it('is deterministic, and par drives her through a blink to her retreat and a win', () => {
    const a = play();
    expect(play()).toEqual(a);
    expect(a.outcome).toBe('won');
    expect(a.blinks).toBeGreaterThanOrEqual(1);
    expect(a.log.at(-1)).toMatch(/BossEnded$/);
  });
});
