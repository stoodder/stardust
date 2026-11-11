// The Gathering Maw (T708; design/enemies.md § 6, D146): its phase-1 gather (gather.ts at the
// phase's numbers), the split at 50% (enemyAbilities/bossSplit.ts), and the merge
// (bossMerge.ts), driven through the abilities system on fx_map's road (9 tiles) with the live
// boss, its parts, Fractures, and Motes. The whole fight (dev_gmaw), defeat by a part at the gate,
// determinism, replays, and the cues: tools/devGmaw.test.ts.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { BOSS_MIN_TELL_SEC, HASTE_CAP } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import { secToTicks } from '../shared/time.ts';
import { MAP, spawn } from './__fixtures__/combat.ts';
import { fixtureConfig } from './__fixtures__/sim.ts';
import { applyDamage } from './combat/damage.ts';
import type { SimConfig } from './config.ts';
import { BOSS_PHASE_INVULNERABLE_TICKS, bossDamage } from './enemyAbilities/bossPhases.ts';
import {
  isMergedBoss,
  isSplitPart,
  MERGE_TELL_TICKS,
  mergeTelling,
} from './enemyAbilities/bossMerge.ts';
import { isSplitBorn, SPLIT_SPREAD_TILES, splitHp } from './enemyAbilities/bossSplit.ts';
import { gatherOf, gatherScale, gatherTelling } from './enemyAbilities/gather.ts';
import { enemyAbilities } from './enemyAbilities/index.ts';
import type { Enemy } from './entities.ts';
import type { SimEvent } from './events.ts';
import { FEATURE_GATES } from './gates.ts';
import { createState, type SimState } from './state.ts';
import { cleanup } from './systems/cleanup.ts';
import { movement } from './systems/movement.ts';
import { applyStasis, applyUnnerved } from './systems/status.ts';
import { createScratch, type TickContext } from './tick.ts';

const LIVE: CompiledContent<IdSpace> = compileContent(RAW_CONTENT);
const GMAW = LIVE.enemies.gathering_maw!;
const PART = LIVE.enemies.gathering_maw_part!;
const [P1, P2] = GMAW.boss!.phases;
const GATHER = P1!.gather!;
const SPLIT = P2!.split!;
const SRC = { kind: 'ability', slot: 1 } as const;

function world(): { state: SimState; ctx: TickContext } {
  const config: SimConfig<IdSpace> = {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- fx_map's config, live content
    ...(fixtureConfig() as unknown as SimConfig<IdSpace>),
    content: LIVE,
  };
  return {
    state: createState(MAP, config.seed),
    ctx: { content: LIVE, map: MAP, config, scratch: createScratch() },
  };
}

/** `n` ticks of the abilities (and, when `move`, movement), then cleanup; returns the events. */
function run(state: SimState, ctx: TickContext, n: number, move = false): SimEvent<IdSpace>[] {
  const out: SimEvent<IdSpace>[] = [];
  for (let i = 0; i < n; i++) {
    enemyAbilities(state, ctx);
    if (move) movement(state, ctx);
    cleanup(state, ctx);
    state.tick++;
    out.push(...state.events);
    state.events.length = 0;
  }
  return out;
}

function of<T extends SimEvent<IdSpace>['type']>(events: SimEvent<IdSpace>[], type: T) {
  return events.filter((e): e is Extract<SimEvent<IdSpace>, { type: T }> => e.type === type);
}

function live(state: SimState): Enemy[] {
  return state.enemies.items.slice(0, state.enemies.used).filter((e) => e.alive);
}

/** Ticks until `b`'s tendril tell starts (at most 2 periods); how many that took (−1: none). */
function untilTell(state: SimState, ctx: TickContext, b: Enemy): number {
  for (let t = 1; t <= GATHER.everyTicks * 2; t++) {
    run(state, ctx, 1);
    if (b.gatherUid !== 0) return t;
  }
  return -1;
}

/** The boss at `dist`, phase 1 begun (its first abilities tick run), events drained. */
function boss(state: SimState, ctx: TickContext, dist = 4): Enemy {
  const b = spawn(state, GMAW, { dist });
  run(state, ctx, 1);
  return b;
}

/** Takes the boss to 50% and runs its telegraph out: returns the split's events and its parts. */
function split(state: SimState, ctx: TickContext, b: Enemy) {
  bossDamage(state, b, b.hp - 0.5 * GMAW.hp);
  const events = run(state, ctx, BOSS_PHASE_INVULNERABLE_TICKS + 1);
  const parts = live(state).filter((e) => e.def?.id === 'gathering_maw_part');
  return { events, parts };
}

describe('the Gathering Maw’s data and gates (D146)', () => {
  it('4000 HP, armor 4, speed 0.3; gathers 2 tiles every 5 s (1.5 s tell); 3 × 20%, merge 12 s, Haste 30%', () => {
    expect([GMAW.hp, GMAW.armor, GMAW.speedTilesPerTick * 60, GMAW.bounty]).toEqual([
      4000, 4, 0.3, 0,
    ]);
    expect(GATHER).toMatchObject({ everyTicks: 300, tellTicks: 90, radiusSq: 4, maxAbsorbs: 5 });
    expect(GATHER.tellTicks).toBeGreaterThanOrEqual(secToTicks(BOSS_MIN_TELL_SEC));
    expect(P2!.fromPct).toBe(0.5);
    expect(SPLIT).toEqual({
      part: 'gathering_maw_part',
      count: 3,
      hpPct: 0.2,
      mergeAfterTicks: 720,
      mergeHastePct: 0.3,
    });
    expect([PART.hp, PART.armor, PART.speedTilesPerTick * 60, PART.bounty]).toEqual([
      800, 4, 0.3, 0,
    ]);
    expect(PART.boss).not.toBeNull(); // boss rules
    expect(MERGE_TELL_TICKS).toBe(secToTicks(BOSS_MIN_TELL_SEC));
    expect(FEATURE_GATES['enemy.boss.gather']).toBeNull();
    expect(FEATURE_GATES['enemy.boss.split']).toBeNull();
  });
});

describe('phase 1: the wide gather (gather.ts at the phase’s numbers)', () => {
  it('first tells one period after it spawns, takes a Fracture 2 tiles back, grows; not 2.5', () => {
    const { state, ctx } = world();
    const b = boss(state, ctx, 5);
    const near = spawn(state, LIVE.enemies.fracture!, { dist: 3 }); // 2 tiles behind
    const far = spawn(state, LIVE.enemies.mote!, { dist: 2.5 });
    expect(gatherOf(b)).toBe(GATHER);
    // Spawned on tick 0 (its first tick alive starts the period): ready a tell before it ends.
    expect(untilTell(state, ctx, b)).toBe(GATHER.everyTicks - GATHER.tellTicks);
    expect(b.gatherUid).toBe(near.uid);
    expect(gatherTelling(b)).toBe(true);
    const gathered = run(state, ctx, GATHER.tellTicks - 1);
    expect(of(gathered, 'Gathered')).toEqual([]);
    gathered.push(...run(state, ctx, 1));
    expect(of(gathered, 'Gathered')).toMatchObject([{ uid: b.uid, victim: 'fracture', hp: 200 }]);
    expect([b.hp, b.bonusMaxHp, b.absorbs]).toEqual([4200, 200, 1]);
    expect(gatherScale(b)).toBeCloseTo(1.1);
    expect(far.alive).toBe(true); // 2.5 tiles: out of reach
    // A boss's leak drains everything; its absorbs add no bounty.
    expect([GATHER.leakPerAbsorb, GATHER.bountyPerHollowAbsorb]).toEqual([0, 0]);
  });

  it('never takes a Maw (a gatherer) or a boss (its own parts included)', () => {
    const { state, ctx } = world();
    const b = boss(state, ctx, 5);
    const maw = spawn(state, LIVE.enemies.maw!, { dist: 4.5 });
    const other = spawn(state, PART, { dist: 4.6 });
    run(state, ctx, GATHER.everyTicks * 2);
    expect(maw.alive && other.alive).toBe(true);
    expect(b.absorbs).toBe(0);
  });

  it('Unnerved cancels its tell and restarts the period; Stasis (Chilled 50% on a boss) doesn’t', () => {
    const { state, ctx } = world();
    const b = boss(state, ctx, 5);
    spawn(state, LIVE.enemies.fracture!, { dist: 4 });
    expect(untilTell(state, ctx, b)).toBeGreaterThan(0);
    applyStasis(b, 600);
    run(state, ctx, 10);
    expect(gatherTelling(b)).toBe(true);
    applyUnnerved(b, 120);
    run(state, ctx, 1);
    expect(gatherTelling(b)).toBe(false);
    expect(b.gatherTicks).toBe(GATHER.everyTicks);
  });

  it('lets go of a tell under way as phase 2 begins, and gathers no more', () => {
    const { state, ctx } = world();
    const b = boss(state, ctx, 5);
    const f = spawn(state, LIVE.enemies.fracture!, { dist: 4 });
    untilTell(state, ctx, b);
    expect(b.gatherUid).toBe(f.uid);
    bossDamage(state, b, b.hp - 0.5 * GMAW.hp);
    run(state, ctx, 1);
    expect([b.gatherUid, b.bossPhase, f.alive]).toEqual([0, 2, true]);
    expect(gatherOf(b)).toBeNull();
  });
});

describe('the split at 50% (bossSplit.ts)', () => {
  it('telegraphs 1.5 s invulnerable, then splits into 3 parts of 20% each, spread on its route', () => {
    const { state, ctx } = world();
    const b = boss(state, ctx);
    const uid = b.uid;
    bossDamage(state, b, b.hp - 0.5 * GMAW.hp);
    expect([b.bossPhase, b.invulnerableTicks]).toEqual([2, BOSS_PHASE_INVULNERABLE_TICKS]);
    const tele = run(state, ctx, BOSS_PHASE_INVULNERABLE_TICKS);
    expect(of(tele, 'BossSplit')).toEqual([]);
    expect(b.alive).toBe(true);
    const events = run(state, ctx, 1);
    const [s] = of(events, 'BossSplit');
    expect(s).toMatchObject({ uid });
    expect(b.alive).toBe(false);
    expect(of(events, 'EnemyDied')).toEqual([]); // gone, not killed: no bounty, no kill
    const parts = live(state);
    expect(parts.map((p) => p.uid)).toEqual(s!.parts);
    expect(parts.map((p) => [p.def!.id, p.hp, p.ownerUid, p.bossPhase, p.splitMaxHp])).toEqual(
      Array.from({ length: 3 }, () => ['gathering_maw_part', 800, uid, 2, 2400]),
    );
    expect(parts.map((p) => p.dist)).toEqual([4 - SPLIT_SPREAD_TILES, 4, 4 + SPLIT_SPREAD_TILES]);
    expect(parts.every((p) => p.splitFrom === GMAW && p.mergeTicks === SPLIT.mergeAfterTicks)).toBe(
      true,
    );
    expect(parts.every((p) => isSplitPart(p) && isSplitBorn(p) && p.invulnerableTicks === 0)).toBe(
      true,
    );
    expect(splitHp(state.enemies, uid)).toBe(2400); // the one bar: 2400 of 2400
  });

  it('parts follow boss rules (Stasis is Chilled 50%) but die at 0 HP like units', () => {
    const { state, ctx } = world();
    const { parts } = split(state, ctx, boss(state, ctx));
    const p = parts[0]!;
    applyStasis(p, 120);
    expect([p.stasisTicks, p.chillPct]).toEqual([0, 0.5]);
    const events: SimEvent<IdSpace>[] = [];
    applyDamage(state, p, 1e6, 'psionic', SRC);
    events.push(...state.events);
    expect(p.alive).toBe(false);
    expect(of(events, 'EnemyDied')).toMatchObject([
      { uid: p.uid, enemy: 'gathering_maw_part', bounty: 0 },
    ]);
    expect(of(events, 'BossEnded')).toEqual([]);
  });
});

describe('the merge (bossMerge.ts)', () => {
  it('lands exactly 12 s after the split: one Maw, their HP summed, phase 3, Haste 30%', () => {
    const { state, ctx } = world();
    const { events, parts } = split(state, ctx, boss(state, ctx));
    const splitAt = of(events, 'BossSplit').length;
    expect(splitAt).toBe(1);
    const dealt = applyDamage(state, parts[0]!, 500, 'psionic', SRC);
    const wait = run(state, ctx, SPLIT.mergeAfterTicks - 1);
    expect(of(wait, 'BossMerged')).toEqual([]);
    const merged = run(state, ctx, 1);
    const [m] = of(merged, 'BossMerged');
    expect(m).toBeDefined();
    expect(of(merged, 'BossPhase')).toEqual([
      { type: 'BossPhase', uid: m!.uid, enemy: 'gathering_maw', phase: 3 },
    ]);
    const [one] = live(state);
    expect(live(state)).toHaveLength(1);
    expect(one!.uid).toBe(m!.uid);
    expect([one!.def, one!.hp, one!.bossPhase, one!.invulnerableTicks]).toEqual([
      GMAW,
      2400 - dealt, // the survivors' HP summed
      3,
      BOSS_PHASE_INVULNERABLE_TICKS,
    ]);
    expect(one!.ownerUid).toBe(parts[0]!.ownerUid);
    expect(isMergedBoss(one!)).toBe(true);
    expect(one!.dist).toBeCloseTo(Math.max(...parts.map((p) => p.dist)));
    expect(parts.every((p) => !p.alive)).toBe(true);
    expect(of(merged, 'EnemyDied')).toEqual([]); // the parts are gone, not killed
    expect(one!.paceMul).toBeCloseTo(1.3);
    expect(applyDamage(state, one!, 500, 'psionic', SRC)).toBe(0); // its 1.5 s: shots plink off
    run(state, ctx, 1);
    expect(one!.paceMul).toBeCloseTo(1 + Math.min(SPLIT.mergeHastePct, HASTE_CAP));
    expect(gatherOf(one!)).toBeNull(); // the merged Maw gathers no more
    expect(splitHp(state.enemies, one!.ownerUid)).toBe(2400 - dealt);
    expect(one!.splitMaxHp).toBe(2400);
  });

  it('walks together in its last 1.5 s: the lead holds, the others close on it hasted', () => {
    const { state, ctx } = world();
    const { parts } = split(state, ctx, boss(state, ctx));
    run(state, ctx, SPLIT.mergeAfterTicks - MERGE_TELL_TICKS - 1, true);
    expect(parts.some(mergeTelling)).toBe(false);
    run(state, ctx, 1, true);
    expect(parts.every(mergeTelling)).toBe(true);
    const lead = parts.reduce((a, p) => (p.dist > a.dist ? p : a));
    expect(lead.paceMul).toBe(0);
    for (const p of parts) if (p !== lead) expect(p.paceMul).toBeCloseTo(1.3);
    const gap = lead.dist - Math.min(...parts.map((p) => p.dist));
    run(state, ctx, MERGE_TELL_TICKS - 1, true);
    // The last one closes 0.3 × 1.3 tiles/s × 1.5 s on the lead, which holds.
    const closed = gap - (lead.dist - Math.min(...parts.map((p) => p.dist)));
    expect(closed).toBeCloseTo(0.3 * 1.3 * ((MERGE_TELL_TICKS - 1) / 60), 2);
  });

  it('isn’t cancelled by Unnerved or Stasis (it is the phase change)', () => {
    const { state, ctx } = world();
    const { parts } = split(state, ctx, boss(state, ctx));
    for (const p of parts) applyUnnerved(p, 1200);
    const events = run(state, ctx, SPLIT.mergeAfterTicks);
    expect(of(events, 'BossMerged')).toHaveLength(1);
  });

  it('comes at once as the last but one part dies, with the survivor’s HP', () => {
    const { state, ctx } = world();
    const { parts } = split(state, ctx, boss(state, ctx));
    run(state, ctx, 60);
    applyDamage(state, parts[0]!, 1e6, 'psionic', SRC);
    expect(of(run(state, ctx, 1), 'BossMerged')).toEqual([]); // two left: the clock runs on
    applyDamage(state, parts[2]!, 1e6, 'psionic', SRC);
    const dealt = applyDamage(state, parts[1]!, 400, 'psionic', SRC);
    const events = run(state, ctx, 1);
    expect(of(events, 'BossMerged')).toHaveLength(1);
    const [one] = live(state);
    expect([one!.def, one!.hp, one!.bossPhase]).toEqual([GMAW, 800 - dealt, 3]);
  });

  it('never comes when all three parts die before it: the boss is beaten', () => {
    const { state, ctx } = world();
    const { parts } = split(state, ctx, boss(state, ctx));
    run(state, ctx, 60);
    applyDamage(state, parts[0]!, 1e6, 'psionic', SRC);
    run(state, ctx, 1);
    // A splash on the last two at once.
    applyDamage(state, parts[1]!, 1e6, 'psionic', SRC);
    applyDamage(state, parts[2]!, 1e6, 'psionic', SRC);
    const events = run(state, ctx, SPLIT.mergeAfterTicks);
    expect(of(events, 'BossMerged')).toEqual([]);
    expect(live(state)).toEqual([]);
  });

  it('the merged Maw dies at 0 HP (no ending, no bounty)', () => {
    const { state, ctx } = world();
    split(state, ctx, boss(state, ctx));
    run(state, ctx, SPLIT.mergeAfterTicks + BOSS_PHASE_INVULNERABLE_TICKS);
    const [one] = live(state);
    applyDamage(state, one!, 1e6, 'psionic', SRC);
    expect(one!.alive).toBe(false);
    expect(of(state.events, 'EnemyDied')).toMatchObject([{ enemy: 'gathering_maw', bounty: 0 }]);
    expect(of(state.events, 'BossEnded')).toEqual([]);
  });
});
