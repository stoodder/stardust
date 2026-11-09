// T402: the hush rule and Heavy (design/enemies.md § 5.4; D101). Unit tests drive enemyAbilities,
// movement, and cleanup directly on fx_map's road (9 tiles: (0,0) → (2,0) → (2,3) → (3,3) →
// (3,4) → (5,4)) with the live Mote; a whole-sim test plays a mixed wave and checks determinism.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { CompiledContent, CompiledEnemyDef } from '../../content/compiled.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { HUSH_SPEED_MUL } from '../../content/rules.ts';
import type { IdSpace, WaveTag } from '../../content/types.ts';
import { MAP, WALKER, enemyDef, setup, spawn } from '../__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig, type FixtureIds } from '../__fixtures__/sim.ts';
import { applyDamage } from '../combat/damage.ts';
import type { Enemy } from '../entities.ts';
import type { SimEvent } from '../events.ts';
import { createSim } from '../sim.ts';
import type { SimState } from '../state.ts';
import { cleanup } from '../systems/cleanup.ts';
import { enemySpeedPerTick, movement } from '../systems/movement.ts';
import { scaledEnemy } from '../systems/waves.ts';
import type { TickContext } from '../tick.ts';
import { HUSH_TELL_TICKS, contactSq } from './hush.ts';
import { enemyAbilities } from './index.ts';

const E = compileContent(RAW_CONTENT).enemies;
const MOTE = E.mote;
const SRC = { kind: 'ability', slot: 1 } as const;
const FLEE: readonly WaveTag[] = ['fleeing'];

function put(state: SimState, def: CompiledEnemyDef, dist: number, tags: readonly WaveTag[] = []) {
  return spawn(state, def, { dist, tags });
}

/** One tick of the systems the hush touches: abilities, movement, cleanup. */
function tick(state: SimState, ctx: TickContext, n = 1): void {
  for (let i = 0; i < n; i++) {
    enemyAbilities(state, ctx);
    movement(state);
    cleanup(state, ctx);
  }
}

function events<T extends SimEvent<IdSpace>['type']>(
  state: SimState,
  type: T,
): Extract<SimEvent<IdSpace>, { type: T }>[] {
  return state.events.filter((e): e is Extract<SimEvent<IdSpace>, { type: T }> => e.type === type);
}

describe('the hush rule', () => {
  it('stops both for the 0.5 s tell, removes the runner, heals to full, and turns Heavy', () => {
    const { state, ctx } = setup();
    const m = put(state, MOTE, 3);
    const v = put(state, WALKER, 3.3, FLEE);
    const vUid = v.uid;
    m.hp = 5;
    expect(HUSH_TELL_TICKS).toBe(30);
    tick(state, ctx);
    expect(events(state, 'HushStarted')).toEqual([
      { type: 'HushStarted', uid: m.uid, enemy: 'mote', victim: v.uid, x: v.x, y: v.y },
    ]);
    expect([m.hushUid, v.hushUid, m.hushTicks]).toEqual([v.uid, m.uid, HUSH_TELL_TICKS]);
    // Both stand still for the whole tell (30 ticks, the first included).
    for (let t = 1; t < HUSH_TELL_TICKS; t++) {
      expect([m.dist, v.dist, m.paceMul, v.paceMul]).toEqual([3, 3.3, 0, 0]);
      tick(state, ctx);
    }
    expect([m.dist, v.alive]).toEqual([3, true]);
    const [vx, vy] = [v.x, v.y];
    tick(state, ctx); // the tell runs out: the hush lands, and the Heavy unit moves on at once
    expect(v.alive).toBe(false);
    expect(events(state, 'Hushed')).toEqual([
      {
        type: 'Hushed',
        uid: m.uid,
        enemy: 'mote',
        victim: vUid,
        victimEnemy: 'fx_walker',
        x: vx,
        y: vy,
      },
    ]);
    expect(events(state, 'TurnedHeavy')).toEqual([{ type: 'TurnedHeavy', uid: m.uid, enemy: 'mote' }]);
    expect([m.heavy, m.hp, m.hushUid, m.hushTicks]).toEqual([true, MOTE.hp, 0, 0]);
    expect(m.dist).toBeCloseTo(3 + MOTE.speedTilesPerTick * HUSH_SPEED_MUL, 9);
  });

  it('is no kill and no leak: no bounty, not processed, no split; it books to its wave', () => {
    const { state, ctx } = setup();
    put(state, MOTE, 3);
    const v = put(state, E.bunchling, 3.1, FLEE);
    v.wave = 1;
    state.schedule.remaining[0] = 1;
    const credits = state.credits;
    tick(state, ctx, HUSH_TELL_TICKS + 1);
    expect(v.alive).toBe(false);
    expect(events(state, 'EnemyDied')).toEqual([]);
    expect(events(state, 'EnemyLeaked')).toEqual([]);
    expect(state.credits).toBe(credits);
    expect(state.stats.skitterkinKilled).toBe(0);
    expect(state.stats.tagKilled.fleeing).toBe(0);
    expect(state.stats.tagLeaked.fleeing).toBe(0);
    expect(state.schedule.remaining[0]).toBe(0);
    // A hushed Bunchling releases no Nibblers (only a kill splits).
    expect(state.enemies.items.filter((e) => e.alive && e.def?.id === 'nibbler')).toEqual([]);
  });

  it('touches within 0.4 tiles along the route, inclusive', () => {
    const { state, ctx } = setup();
    const m = put(state, MOTE, 3);
    const far = put(state, WALKER, 3.41, FLEE);
    const near = put(state, WALKER, 2.6, FLEE); // behind it counts too
    expect(contactSq(m, far)).toBe(-1);
    expect(contactSq(m, near)).toBeCloseTo(0.16, 12);
    tick(state, ctx);
    expect([m.hushUid, near.hushUid, far.hushUid]).toEqual([near.uid, m.uid, 0]);
  });

  it('across routes, contact is a straight line (where two roads share tiles)', () => {
    const { state } = setup();
    const m = put(state, MOTE, 3);
    const v = put(state, WALKER, 3.1, FLEE);
    const other = Object.assign({}, MAP.routes.a!, { id: 'b' });
    v.route = other;
    expect(contactSq(m, v)).toBeCloseTo(0.01, 12);
    v.x += 0.5;
    expect(contactSq(m, v)).toBe(-1);
  });

  it('only on its own layer: a ground Hollow unit never hushes a flyer, nor an air one a walker', () => {
    const { state, ctx } = setup();
    const flyer = enemyDef('fx_fly', { layer: 'air' });
    const m = put(state, MOTE, 3);
    put(state, flyer, 3.1, FLEE);
    const airMote = enemyDef('fx_air_mote', { ...MOTE, id: 'fx_air_mote', layer: 'air' });
    const a = put(state, airMote, 6);
    put(state, WALKER, 6.1, FLEE);
    tick(state, ctx);
    expect([m.hushUid, a.hushUid]).toEqual([0, 0]);
    expect(events(state, 'HushStarted')).toEqual([]);
  });

  it('hushes only fleeing units, never a boss, a burrowed or leaving unit, or another Hollow', () => {
    const { state, ctx } = setup();
    const m = put(state, MOTE, 3);
    put(state, WALKER, 3.1); // untagged
    const dug = put(state, WALKER, 2.9, FLEE);
    dug.burrowed = true;
    const gone = put(state, WALKER, 3.05, FLEE);
    gone.leaving = true;
    put(state, MOTE, 3.2);
    tick(state, ctx);
    expect(m.hushUid).toBe(0);
  });

  it('one hush each: a Heavy unit walks past every other runner', () => {
    const { state, ctx } = setup();
    const m = put(state, MOTE, 3);
    put(state, WALKER, 3.1, FLEE);
    tick(state, ctx, HUSH_TELL_TICKS + 1);
    expect(m.heavy).toBe(true);
    const next = put(state, WALKER, m.dist + 0.1, FLEE);
    tick(state, ctx, 5);
    expect([m.hushUid, next.hushUid, events(state, 'HushStarted').length]).toEqual([0, 0, 1]);
  });

  it('a Heavy unit walks at base × 1.15, before chill and haste', () => {
    const { state } = setup();
    const m = put(state, MOTE, 3);
    m.heavy = true;
    m.chillMul = 0.5;
    m.paceMul = 1.2;
    expect(enemySpeedPerTick(m)).toBeCloseTo(MOTE.speedTilesPerTick * 1.15 * 0.5 * 1.2, 12);
  });

  it("heals to the run's full HP (Story and HP modifiers scale the def)", () => {
    const { state, ctx } = setup();
    const story = scaledEnemy(MOTE, { hp: -0.3, shield: 0, speed: 0 });
    const m = put(state, story, 3);
    m.hp = 1;
    put(state, WALKER, 3.1, FLEE);
    tick(state, ctx, HUSH_TELL_TICKS + 1);
    expect(m.hp).toBeCloseTo(MOTE.hp * 0.7, 9);
  });

  it('a runner killed during the tell frees the Hollow unit with its hush unspent', () => {
    const { state, ctx } = setup();
    const m = put(state, MOTE, 3);
    const v = put(state, WALKER, 3.1, FLEE);
    tick(state, ctx, 10);
    applyDamage(state, v, 1000, 'kinetic', SRC);
    cleanup(state, ctx);
    tick(state, ctx);
    expect([m.hushUid, m.hushTicks, m.heavy, m.paceMul]).toEqual([0, 0, false, 1]);
    expect(m.dist).toBeGreaterThan(3);
    expect(events(state, 'Hushed')).toEqual([]);
    // It can still hush the next one.
    const w = put(state, WALKER, m.dist + 0.2, FLEE);
    tick(state, ctx);
    expect(m.hushUid).toBe(w.uid);
  });

  it('a Hollow unit killed during the tell lets the runner go', () => {
    const { state, ctx } = setup();
    const m = put(state, MOTE, 3);
    const v = put(state, WALKER, 3.1, FLEE);
    tick(state, ctx, 10);
    applyDamage(state, m, 1000, 'psionic', SRC);
    cleanup(state, ctx);
    tick(state, ctx);
    expect([v.alive, v.hushUid, v.paceMul]).toEqual([true, 0, 1]);
    expect(v.dist).toBeGreaterThan(3.1);
  });

  it('a hush lets go if either side digs in or starts leaving', () => {
    const { state, ctx } = setup();
    const m = put(state, MOTE, 3);
    const v = put(state, WALKER, 3.1, FLEE);
    tick(state, ctx, 5);
    m.burrowed = true; // (a burrowing Hollow unit, M5's Undertow)
    tick(state, ctx);
    expect([m.hushUid, m.hushTicks, v.hushUid, v.paceMul]).toEqual([0, 0, 0, 1]);
  });

  it('two Hollow units never take the same runner, and each takes one', () => {
    const { state, ctx } = setup();
    const a = put(state, MOTE, 3);
    const b = put(state, MOTE, 3.05);
    const v = put(state, WALKER, 3.1, FLEE);
    const w = put(state, WALKER, 3.2, FLEE);
    tick(state, ctx);
    // v's nearest is b (0.05); w's nearest is b too (0.15 < 0.2), so b takes the nearer, v, and a
    // waits a tick for w.
    expect([b.hushUid, a.hushUid]).toEqual([v.uid, 0]);
    tick(state, ctx);
    expect(a.hushUid).toBe(w.uid);
  });
});

describe('the hush rule is order-independent', () => {
  /** The pairs (Hollow label → victim label) after one tick, for units placed in `order`. */
  function pairing(order: readonly string[]): Record<string, string> {
    const { state, ctx } = setup();
    // Fixed uids per label, so only the slot order changes between runs.
    const at: Record<string, [CompiledEnemyDef, number, readonly WaveTag[], number]> = {
      h1: [MOTE, 3, [], 101],
      h2: [MOTE, 3.3, [], 102],
      v1: [WALKER, 3.2, FLEE, 201],
      v2: [WALKER, 3.65, FLEE, 202],
      v3: [WALKER, 2.75, FLEE, 203],
    };
    const units = new Map<string, Enemy>();
    for (const label of order) {
      const [def, dist, tags, uid] = at[label]!;
      const e = put(state, def, dist, tags);
      e.uid = uid;
      units.set(label, e);
    }
    tick(state, ctx);
    const byUid = new Map([...units].map(([l, e]) => [e.uid, l]));
    const out: Record<string, string> = {};
    for (const l of ['h1', 'h2']) {
      const e = units.get(l)!;
      if (e.hushUid !== 0) out[l] = byUid.get(e.hushUid)!;
    }
    return out;
  }

  it('gives the same pairs for every slot order', () => {
    // v1 is nearest h2 (0.1 vs 0.2): a slot-greedy rule would hand it to h1 when h1 comes first.
    // h2 takes v1 (its nearest of v1 and v2); h1 takes v3 (0.25); v2 waits.
    const expected = { h1: 'v3', h2: 'v1' };
    const labels = ['h1', 'h2', 'v1', 'v2', 'v3'];
    const orders = [labels, [...labels].reverse(), ['v2', 'h2', 'v3', 'h1', 'v1']];
    for (const o of orders) expect(pairing(o), o.join(',')).toEqual(expected);
  });

  it('breaks an exact tie by the lower uid', () => {
    const { state, ctx } = setup();
    const a = put(state, MOTE, 3);
    const b = put(state, MOTE, 3.5);
    const v = put(state, WALKER, 3.25, FLEE);
    tick(state, ctx);
    expect([a.hushUid, b.hushUid, v.hushUid]).toEqual([v.uid, 0, a.uid]);
  });
});

// ── A whole sim ───────────────────────────────────────────────────────────────────────────────

/** fx_map whose wave 1 sends 3 fleeing walkers, then 3 Motes 2 s later on the same road. */
function mixedWave(): CompiledContent<FixtureIds> {
  const [w1, ...rest] = MAP.waves;
  const base = w1!.groups[0]!;
  const runners = Object.assign({}, base, {
    enemy: WALKER,
    count: 3,
    intervalTicks: 30,
    delayTicks: 0,
    tags: FLEE,
  });
  const motes = Object.assign({}, base, {
    enemy: MOTE,
    count: 3,
    intervalTicks: 30,
    delayTicks: 120,
    tags: [],
  });
  const wave = Object.assign({}, w1, { groups: [runners, motes], lastSpawnTicks: 180 });
  const map = Object.assign({}, MAP, { waves: [wave, ...rest] });
  const enemies = Object.assign({}, FIXTURE_CONTENT.enemies, E);
  return Object.assign({}, FIXTURE_CONTENT, { enemies, maps: { fx_map: map } });
}

function play(): { hash: string; log: SimEvent<IdSpace>[] } {
  const sim = createSim(fixtureConfig({ content: mixedWave() }));
  sim.enqueue({ type: 'callWave' });
  const log: SimEvent<IdSpace>[] = [];
  const out: SimEvent<FixtureIds>[] = [];
  while (sim.state.tick < 1500 && sim.state.outcome === 'playing') {
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    log.push(...out);
  }
  return { hash: sim.hash(), log };
}

describe('a mixed wave (whole sim)', () => {
  it('the Motes hush the back runners, the bolting lead runner escapes; deterministic', () => {
    const a = play();
    const story = a.log
      .filter((e) => /^(Hushed|TurnedHeavy|SkittishBolt|EnemyLeaked)$/.test(e.type))
      .filter((e) => !('uid' in e) || e.uid <= 6) // wave 1's six units
      .map((e) => {
        if (e.type === 'Hushed') return `hush ${e.uid}→${e.victim}`;
        if (e.type === 'EnemyLeaked') return `leak ${e.uid} (${e.leak})`;
        return `${e.type} ${'uid' in e ? e.uid : ''}`;
      });
    // Runners 1–3 lead Motes 4–6 by 2 s. Mote 4 catches the rearmost runner (3); runners 1 and 2,
    // within 2 tiles, bolt. Mote 5 catches runner 2 (runner 1 bolts again); runner 1 outruns the
    // last Mote and leaks for 0. Every Mote leaks: two Heavy, one not.
    expect(story).toEqual([
      'hush 4→3',
      'TurnedHeavy 4',
      'SkittishBolt 1',
      'SkittishBolt 2',
      'hush 5→2',
      'TurnedHeavy 5',
      'SkittishBolt 1',
      'leak 4 (1)',
      'leak 1 (0)',
      'leak 5 (1)',
      'leak 6 (1)',
    ]);
    expect(play().hash).toBe(a.hash);
  });
});
