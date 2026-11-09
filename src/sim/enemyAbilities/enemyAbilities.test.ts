// T304c: burrow, split, huddle, and bosses (design/enemies.md § 3, § 5.1, § 6). Unit tests drive
// the systems directly on fx_map's road (9 tiles: (0,0) → (2,0) → (2,3) → (3,3) → (3,4) → (5,4))
// with the live Act I units; whole-sim tests check wave resolution, the boss leak, the tripled
// clear bonus, the boss script hooks, and determinism.
import { describe, expect, it } from 'vitest';
import { RAW_CONTENT } from '../../content/registry.ts';
import { compileContent } from '../../content/compile.ts';
import type {
  CompiledContent,
  CompiledEnemyDef,
  CompiledScriptedEvent,
} from '../../content/compiled.ts';
import { BOSS_CLEAR_BONUS_MULT, waveClearBonus, waveClearBonusFor } from '../../content/rules.ts';
import type { IdSpace } from '../../content/types.ts';
import { MAP, setup, spawn } from '../__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig, type FixtureIds } from '../__fixtures__/sim.ts';
import { applyChill, applyDamage, applyEffects } from '../combat/damage.ts';
import { canHit } from '../combat/targeting.ts';
import type { Enemy } from '../entities.ts';
import type { SimEvent } from '../events.ts';
import { createSim } from '../sim.ts';
import type { SimState } from '../state.ts';
import { cleanup } from '../systems/cleanup.ts';
import { movement } from '../systems/movement.ts';
import { triggers } from '../systems/triggers.ts';
import type { TickContext } from '../tick.ts';
import { bossNextAbility, bossTelling, BOSS_ABILITY_TELL_TICKS } from './boss.ts';
import {
  BOSS_BURROW_GAP_TICKS,
  BOSS_PHASE_INVULNERABLE_TICKS,
  LEAVE_MAX_TICKS,
} from './bossPhases.ts';
import { burrowTelling, surfaceTicks } from './burrow.ts';
import { enemyAbilities, immune, untargetable } from './index.ts';

const LIVE = compileContent(RAW_CONTENT);
const E = LIVE.enemies;
const GROUND = { ground: true, air: false } as const;
const SRC = { kind: 'ability', slot: 1 } as const;

/** A bare state and a context whose content has the live enemies (for broods). */
function world(): { state: SimState; ctx: TickContext } {
  const { state, ctx } = setup();
  const content = Object.assign({}, ctx.content, { enemies: E });
  return { state, ctx: Object.assign({}, ctx, { content }) };
}

function put(state: SimState, def: CompiledEnemyDef, dist: number, wave = 1): Enemy {
  const e = spawn(state, def, { dist });
  e.wave = wave;
  return e;
}

function events<T extends SimEvent<IdSpace>['type']>(
  state: SimState,
  type: T,
): Extract<SimEvent<IdSpace>, { type: T }>[] {
  return state.events.filter((e): e is Extract<SimEvent<IdSpace>, { type: T }> => e.type === type);
}

function live(state: SimState, id: string): Enemy[] {
  return state.enemies.items.filter((e) => e.alive && e.def?.id === id);
}

describe('burrow (the Digger)', () => {
  const burrow = E.digger.burrow!;

  it('walks 4 s, tells for the last 0.8 s, digs in for 2 s at 1.5× pace, and surfaces', () => {
    const { state, ctx } = world();
    const d = put(state, E.digger, 1);
    const up = surfaceTicks(burrow);
    expect(up).toBe(240); // every 6 s, 2 s of it underground
    expect(burrow.tellTicks).toBe(48);
    const trace: { burrowed: boolean; tell: boolean; pace: number }[] = [];
    for (let t = 0; t < up + burrow.durationTicks + 2; t++) {
      enemyAbilities(state, ctx);
      trace.push({ burrowed: d.burrowed, tell: burrowTelling(d, burrow), pace: d.paceMul });
    }
    // Tick 0 starts the surface stretch; it digs in on tick `up`, after a 48-tick tell.
    expect(trace.slice(0, up).every((s) => !s.burrowed && s.pace === 1)).toBe(true);
    expect(trace.findIndex((s) => s.tell)).toBe(up - burrow.tellTicks);
    expect(trace.filter((s) => s.tell)).toHaveLength(burrow.tellTicks);
    const down = trace.slice(up, up + burrow.durationTicks);
    expect(down.every((s) => s.burrowed && s.pace === 1.5 && !s.tell)).toBe(true);
    expect(trace[up + burrow.durationTicks]).toEqual({ burrowed: false, tell: false, pace: 1 });
  });

  it('is untouchable underground: no targeting, damage, or status', () => {
    const { state } = world();
    const d = put(state, E.digger, 1);
    d.burrowed = true;
    expect(untargetable(d) && immune(d)).toBe(true);
    expect(canHit(d, GROUND)).toBe(false);
    expect(applyDamage(state, d, 500, 'explosive', SRC)).toBe(0);
    applyEffects(d, [{ status: 'chilled', pct: 0.5, durationTicks: 60 }]);
    expect(d.hp).toBe(70);
    expect(d.chillPct).toBe(0);
    d.burrowed = false;
    expect(canHit(d, GROUND)).toBe(true);
    expect(applyDamage(state, d, 5, 'kinetic', SRC)).toBeGreaterThan(0);
  });

  it('keeps moving underground and still leaks', () => {
    const { state, ctx } = world();
    const d = put(state, E.digger, 8.99);
    d.burrowed = true;
    d.abilityTicks = 50;
    enemyAbilities(state, ctx);
    movement(state);
    expect(d.alive).toBe(false);
    expect(events(state, 'EnemyLeaked')).toHaveLength(1);
  });
});

describe('split (the Bunchling)', () => {
  it('releases 3 Nibblers on its route when killed, trailing its death point, in its wave', () => {
    const { state, ctx } = world();
    const b = put(state, E.bunchling, 4, 2);
    const remaining = [...state.schedule.remaining];
    applyDamage(state, b, 1000, 'kinetic', SRC);
    expect(b.alive).toBe(false);
    cleanup(state, ctx);
    const kids = live(state, 'nibbler');
    expect(kids.map((k) => k.dist)).toEqual([4, 3.75, 3.5]);
    expect(kids.every((k) => k.wave === 2 && k.hp === E.nibbler.hp)).toBe(true);
    expect(state.schedule.remaining[1]).toBe(remaining[1]! - 1 + 3);
    const died = state.events.findIndex((e) => e.type === 'EnemyDied');
    const spawned = events(state, 'EnemySpawned');
    expect(spawned).toHaveLength(3);
    expect(state.events.indexOf(spawned[0]!)).toBeGreaterThan(died);
  });

  it('releases nothing when it leaks, and children never go behind the spawn', () => {
    const { state, ctx } = world();
    put(state, E.bunchling, 8.99);
    movement(state);
    cleanup(state, ctx);
    expect(live(state, 'nibbler')).toHaveLength(0);
    const near = put(state, E.bunchling, 0.3);
    applyDamage(state, near, 1000, 'kinetic', SRC);
    cleanup(state, ctx);
    const dists = live(state, 'nibbler').map((k) => k.dist);
    expect(dists).toHaveLength(3);
    [0.3, 0.05, 0].forEach((d, i) => expect(dists[i]).toBeCloseTo(d, 12));
  });

  it("children carry the parent's wave tags", () => {
    const { state, ctx } = world();
    const b = put(state, E.bunchling, 3);
    b.tags = ['youngling'];
    applyDamage(state, b, 1000, 'kinetic', SRC);
    cleanup(state, ctx);
    expect(live(state, 'nibbler').every((k) => k.tags.includes('youngling'))).toBe(true);
    expect(state.stats.tagSpawned.youngling).toBe(3);
  });
});

describe('huddle (the Elder)', () => {
  it('holds nearby allies to its pace and heals them 4 HP/s; the leader and far units are not', () => {
    const { state, ctx } = world();
    const elder = put(state, E.elder, 3);
    const near = put(state, E.nibbler, 3.8);
    const zoom = put(state, E.zoomer, 2.5);
    const chonk = put(state, E.chonk, 3.2); // as slow as the Elder: never sped up
    const far = put(state, E.nibbler, 6);
    near.hp = 10;
    far.hp = 10;
    elder.hp = 100;
    enemyAbilities(state, ctx);
    expect(near.huddleUid).toBe(elder.uid);
    expect(zoom.huddleUid).toBe(elder.uid);
    expect(far.huddleUid).toBe(0);
    expect(elder.huddleUid).toBe(0);
    expect(near.hp).toBeCloseTo(10 + 4 / 60, 12);
    expect(far.hp).toBe(10);
    expect(elder.hp).toBe(100);
    expect(zoom.hp).toBe(E.zoomer.hp); // never above full HP
    const pace = E.elder.speedTilesPerTick;
    expect(near.paceMul * E.nibbler.speedTilesPerTick).toBeCloseTo(pace, 12);
    expect(zoom.paceMul * E.zoomer.speedTilesPerTick).toBeCloseTo(pace, 12);
    expect(chonk.paceMul).toBe(1);
    expect(far.paceMul).toBe(1);
  });

  it("follows the leader's chill, and scatters when the leader dies", () => {
    const { state, ctx } = world();
    const elder = put(state, E.elder, 3);
    const near = put(state, E.nibbler, 3.5);
    applyChill(elder, 0.5, 600);
    enemyAbilities(state, ctx);
    expect(near.paceMul * E.nibbler.speedTilesPerTick).toBeCloseTo(
      E.elder.speedTilesPerTick * 0.5,
      12,
    );
    applyDamage(state, elder, 10000, 'explosive', SRC);
    enemyAbilities(state, ctx);
    expect(near.huddleUid).toBe(0);
    expect(near.paceMul).toBe(1);
  });

  it('never huddles a burrowed Digger', () => {
    const { state, ctx } = world();
    put(state, E.elder, 3);
    const d = put(state, E.digger, 3.3);
    d.burrowed = true;
    d.abilityTicks = 100;
    enemyAbilities(state, ctx);
    expect(d.huddleUid).toBe(0);
    expect(d.paceMul).toBe(1.5);
  });
});

/** A script event that cues its own id. */
function ev(id: string, on: CompiledScriptedEvent<IdSpace>['on']): CompiledScriptedEvent<IdSpace> {
  return { id, on, when: null, actions: [{ cue: id }], once: true };
}

describe('Matriarch Chitterbloom', () => {
  const boss = E.chitterbloom.boss!;
  const max = E.chitterbloom.hp;

  /** A boss at `dist`, phase 1 begun. */
  function begin(dist = 2): { state: SimState; ctx: TickContext; b: Enemy } {
    const { state, ctx } = world();
    const b = put(state, E.chitterbloom, dist);
    enemyAbilities(state, ctx);
    return { state, ctx, b };
  }

  it('begins phase 1 as she spawns and sneezes 2 Nibblers every 5 s after a 1.5 s tell', () => {
    const { state, ctx, b } = begin();
    expect(events(state, 'BossPhase')).toEqual([
      { type: 'BossPhase', uid: b.uid, enemy: 'chitterbloom', phase: 1 },
    ]);
    expect(b.invulnerableTicks).toBe(0);
    expect(bossNextAbility(b)).toBe('spawn');
    let firstTell = -1;
    for (let t = 1; t <= 300; t++) {
      if (firstTell < 0 && bossTelling(b)) firstTell = t;
      enemyAbilities(state, ctx);
    }
    expect(BOSS_ABILITY_TELL_TICKS).toBe(90);
    expect(firstTell).toBe(300 - 90); // begin() ran the spawn tick
    const kids = live(state, 'nibbler');
    expect(kids.map((k) => [k.dist, k.wave])).toEqual([
      [2, 1],
      [1.75, 1],
    ]);
    expect(b.abilityTicks).toBe(299); // the next sneeze, 5 s after this one, one tick on
  });

  it('halves chills, and stops each phase change at its threshold with 1.5 s of invulnerability', () => {
    const { state, ctx, b } = begin();
    applyChill(b, 0.4, 60);
    expect(b.chillPct).toBeCloseTo(0.2, 12);
    // A huge hit stops at 60%: phase 2 begins and nothing lands until the telegraph ends.
    expect(
      applyDamage(state, b, 99999, 'kinetic', SRC, { armorPierce: 0, ignoresArmor: true }),
    ).toBe(max * 0.4);
    expect(b.hp).toBe(max * 0.6);
    expect(b.alive).toBe(true);
    expect(events(state, 'BossPhase').map((e) => e.phase)).toEqual([1, 2]);
    expect(b.invulnerableTicks).toBe(BOSS_PHASE_INVULNERABLE_TICKS);
    expect(immune(b) && !untargetable(b)).toBe(true);
    expect(canHit(b, GROUND)).toBe(true);
    expect(applyDamage(state, b, 500, 'kinetic', SRC)).toBe(0);
    for (let t = 0; t < BOSS_PHASE_INVULNERABLE_TICKS; t++) enemyAbilities(state, ctx);
    expect(immune(b)).toBe(false);
    expect(applyDamage(state, b, 102, 'kinetic', SRC)).toBe(100); // armor 2
  });

  it('phase 2: burrows twice for 3 s, surfacing with a Bunchling each time, then waits', () => {
    const { state, ctx, b } = begin();
    applyDamage(state, b, max * 0.4, 'psionic', SRC);
    expect(b.bossPhase).toBe(2);
    const log: string[] = [];
    let was = '';
    for (let t = 0; t < 2000; t++) {
      enemyAbilities(state, ctx);
      const now = `${b.burrowed ? 'down' : 'up'}:${live(state, 'bunchling').length}`;
      if (now !== was) log.push(`${t}:${now}`);
      was = now;
    }
    const firstDig = BOSS_PHASE_INVULNERABLE_TICKS + BOSS_BURROW_GAP_TICKS - 1;
    const dig = boss.phases[1]!.burrow!.durationTicks;
    expect(dig).toBe(180);
    expect(log).toEqual([
      '0:up:0',
      `${firstDig}:down:0`,
      `${firstDig + dig}:up:1`,
      `${firstDig + dig + BOSS_BURROW_GAP_TICKS}:down:1`,
      `${firstDig + 2 * dig + BOSS_BURROW_GAP_TICKS}:up:2`,
    ]);
    expect(b.abilityCount).toBe(0);
    expect(b.abilityTicks).toBe(0);
    expect(bossNextAbility(b)).toBeNull();
  });

  it('phase 3: Haste 50% and a huddle on her young', () => {
    const { state, ctx, b } = begin();
    applyDamage(state, b, max * 0.4, 'psionic', SRC);
    b.invulnerableTicks = 0;
    applyDamage(state, b, max * 0.35, 'psionic', SRC);
    expect(b.bossPhase).toBe(3);
    const kid = put(state, E.nibbler, 2.5);
    kid.hp = 1;
    enemyAbilities(state, ctx);
    expect(b.paceMul).toBe(1.5);
    expect(kid.huddleUid).toBe(b.uid);
    expect(kid.hp).toBeCloseTo(1 + 4 / 60, 12);
    expect(kid.paceMul * E.nibbler.speedTilesPerTick).toBeCloseTo(
      E.chitterbloom.speedTilesPerTick * 1.5,
      12,
    );
  });

  it('is driven off at 0% with her brood: untargetable, off the nearest edge within 4 s, no leak', () => {
    const { state, ctx, b } = begin(4);
    const kid = put(state, E.nibbler, 3);
    const other = put(state, E.nibbler, 0.5, 2); // another wave's unit stays
    b.bossPhase = 3;
    applyDamage(state, b, 99999, 'psionic', SRC);
    expect(b.hp).toBe(0);
    expect(b.alive && b.leaving && kid.leaving && !other.leaving).toBe(true);
    expect(events(state, 'BossEnded')).toEqual([
      { type: 'BossEnded', uid: b.uid, enemy: 'chitterbloom', how: 'driveOff' },
    ]);
    expect(events(state, 'EnemyDied')).toHaveLength(0);
    expect(canHit(b, GROUND) || canHit(kid, GROUND)).toBe(false);
    expect(applyDamage(state, b, 10, 'kinetic', SRC)).toBe(0);
    const integrity = state.integrity;
    let gone = -1;
    for (let t = 0; t < LEAVE_MAX_TICKS + 5 && gone < 0; t++) {
      enemyAbilities(state, ctx);
      movement(state);
      if (!b.alive) gone = t;
    }
    expect(gone).toBeGreaterThanOrEqual(0);
    expect(gone).toBeLessThan(LEAVE_MAX_TICKS);
    expect(kid.alive).toBe(false);
    expect(other.alive).toBe(true);
    expect(state.integrity).toBe(integrity);
    expect(events(state, 'EnemyLeaked')).toHaveLength(0);
    cleanup(state, ctx);
    expect(state.stats.skitterkinKilled).toBe(0);
  });

  it('script triggers: bossPhase and bossHpPct fire on the tick after the change', () => {
    const { state, ctx, b } = begin();
    const map = Object.assign({}, MAP, {
      events: [
        ev('p1', { bossPhase: 1 }),
        ev('p2', { bossPhase: 2 }),
        ev('hp70', { bossHpPct: 0.7 }),
        ev('hp70_other', { bossHpPct: 0.7, boss: 'elder' }),
      ],
    });
    const c = Object.assign({}, ctx, { map });
    state.scriptFired = map.events.map(() => false);
    const cues = (): string[] => events(state, 'ScriptCue').map((e) => e.cueId);
    triggers(state, c);
    expect(cues()).toEqual(['p1']);
    applyDamage(state, b, max * 0.35, 'psionic', SRC); // 65%: still phase 1
    triggers(state, c);
    expect(cues()).toEqual(['p1', 'hp70']);
    applyDamage(state, b, max * 0.2, 'psionic', SRC);
    triggers(state, c);
    expect(cues()).toEqual(['p1', 'hp70', 'p2']);
  });
});

// ── Whole sims ────────────────────────────────────────────────────────────────────────────────

/** fx_map with wave 1 replaced by `groups` (enemy, count, interval s) and extra script events. */
function contentWith(
  groups: readonly [CompiledEnemyDef, number, number][],
  extra: readonly CompiledScriptedEvent<IdSpace>[] = [],
): CompiledContent<FixtureIds> {
  const [w1, ...rest] = MAP.waves;
  const base = w1!.groups[0]!;
  const g = groups.map(([enemy, count, sec]) =>
    Object.assign({}, base, { enemy, count, intervalTicks: Math.round(sec * 60), delayTicks: 0 }),
  );
  const last = Math.max(...g.map((x) => (x.count - 1) * x.intervalTicks));
  const wave = Object.assign({}, w1, { groups: g, lastSpawnTicks: last });
  const map = Object.assign({}, MAP, {
    waves: [wave, ...rest],
    events: [...MAP.events, ...extra],
  });
  const enemies = Object.assign({}, FIXTURE_CONTENT.enemies, E);
  return Object.assign({}, FIXTURE_CONTENT, { enemies, maps: { fx_map: map } });
}

function run(content: CompiledContent<FixtureIds>, gun = false, ticks = 6000) {
  const sim = createSim(fixtureConfig({ content }));
  if (gun) {
    sim.enqueue({ type: 'build', tower: 'fx_gun', tile: [1, 1] });
    sim.enqueue({ type: 'build', tower: 'fx_gun', tile: [1, 3] });
  }
  sim.enqueue({ type: 'callWave' });
  const log: SimEvent<IdSpace>[] = []; // enemy ids beyond the fixture's
  const out: SimEvent<FixtureIds>[] = [];
  while (sim.state.tick < ticks && sim.state.outcome === 'playing') {
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    log.push(...out);
  }
  return { sim, log };
}

describe('whole sims', () => {
  it('a leaking boss drains all integrity and loses the map', () => {
    const { sim, log } = run(contentWith([[E.chitterbloom, 1, 1]]));
    const leaks = log.filter((e) => e.type === 'EnemyLeaked');
    const bossLeak = leaks.find((e) => e.enemy === 'chitterbloom');
    expect(bossLeak).toBeDefined();
    expect(bossLeak!.leak).toBeGreaterThan(E.chitterbloom.leak);
    expect(sim.state.integrity).toBe(0);
    expect(sim.state.outcome).toBe('lost');
  });

  it('the bossEnd script action drives her off; the boss wave pays a tripled clear bonus', () => {
    const drive: CompiledScriptedEvent<IdSpace> = {
      id: 'drive',
      on: { wave: 1, phase: { afterTicks: 30 } },
      when: null,
      actions: [{ bossEnd: 'driveOff' }],
      once: true,
    };
    const { log } = run(contentWith([[E.chitterbloom, 1, 1]], [drive]), false, 1200);
    expect(log.filter((e) => e.type === 'BossEnded')).toHaveLength(1);
    const cleared = log.find((e) => e.type === 'WaveCleared' && e.wave === 1);
    expect(cleared).toMatchObject({ bonus: waveClearBonus(1) * BOSS_CLEAR_BONUS_MULT });
    expect(waveClearBonusFor(1, true)).toBe(72);
    expect(waveClearBonusFor(1, false)).toBe(waveClearBonus(1));
    expect(log.some((e) => e.type === 'EnemyLeaked' && e.enemy === 'chitterbloom')).toBe(false);
  });

  it("a wave with splitters resolves only once the children are gone, and its bonus isn't tripled", () => {
    const { sim, log } = run(contentWith([[E.bunchling, 2, 1]]), true);
    const kids = log.filter((e) => e.type === 'EnemySpawned' && e.enemy === 'nibbler');
    expect(kids.length).toBeGreaterThan(0);
    const cleared = log.find((e) => e.type === 'WaveCleared' && e.wave === 1);
    expect(cleared).toMatchObject({ bonus: waveClearBonus(1) });
    const lastKid = Math.max(...kids.map((k) => (k.type === 'EnemySpawned' ? k.uid : 0)));
    const end = log.find(
      (e) => (e.type === 'EnemyDied' || e.type === 'EnemyLeaked') && e.uid === lastKid,
    );
    expect(log.indexOf(end!)).toBeLessThan(log.indexOf(cleared!));
    expect(sim.state.outcome).not.toBe('playing');
  });

  it('is deterministic with every Act I ability in one wave', () => {
    const content = contentWith([
      [E.chitterbloom, 1, 1],
      [E.bunchling, 3, 1.2],
      [E.digger, 3, 1],
      [E.elder, 1, 1],
    ]);
    const a = run(content, true, 4000);
    const b = run(content, true, 4000);
    expect(a.sim.hash()).toBe(b.sim.hash());
    expect(a.log).toEqual(b.log);
    expect(a.log.some((e) => e.type === 'EnemySpawned' && e.enemy === 'nibbler')).toBe(true);
  });
});
