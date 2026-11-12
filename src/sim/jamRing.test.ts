// The Auditor's ring (T707; design/enemies.md § 4, D146; enemyAbilities/jamRing.ts), in the jams
// slot on fx_map's 6×5 grid with the live Auditor, Hum Choir, and Rivet (towers placed directly;
// reach is centre to centre). An Auditor at dist 2 stands at (2.5, 0.5): (1,1), (3,1), and (4,0)
// are within its 2 tiles ((4,0) exactly 2), and (3,2) and (1,3) aren't. The whole map (dev_jam,
// dev_takeover), harness #10, and determinism: render/__fixtures__/devTakeover.test.ts.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { JAM_MIN_TELL_SEC } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import { secToTicks } from '../shared/time.ts';
import { MAP, placeTower, spawn } from './__fixtures__/combat.ts';
import { fixtureConfig } from './__fixtures__/sim.ts';
import { castReboot } from './abilities/reboot.ts';
import { landRing, ringGrowth, ringTelling } from './enemyAbilities/jamRing.ts';
import type { SimEvent } from './events.ts';
import { FEATURE_GATES } from './gates.ts';
import { JAM_FIRST_READY_TICKS, jams, jamTower } from './jam.ts';
import { createState, type SimState } from './state.ts';
import { links } from './systems/links.ts';
import { createScratch, type TickContext } from './tick.ts';

const LIVE: CompiledContent<IdSpace> = compileContent(RAW_CONTENT);
const AUDITOR = LIVE.enemies.auditor!;
const RING = AUDITOR.jam!;
const CHOIR = LIVE.towers.choir!;
const RIVET = LIVE.towers.rivet!;
/** After a landing, the next ring starts this long after it (the period less the tell: 480). */
const WAIT = RING.periodTicks - RING.tellTicks;
/** The first ring may start this many ticks after its first tick alive (T760: at once, in reach). */
const FIRST = Math.max(1, JAM_FIRST_READY_TICKS);

/**
 * `n` Rivets out of the Auditor's reach (rows 3–4): towers placed count toward the jam limit,
 * max(1, floor(25% × placed)), so a test of a ring landing on several towers fills the map first.
 */
function fill(state: SimState, n: number): void {
  for (let i = 0; i < n; i++) placeTower(state, RIVET, i % 6, 3 + Math.floor(i / 6));
}

function world(): { state: SimState; ctx: TickContext } {
  const config = fixtureConfig();
  return {
    state: createState(MAP, config.seed),
    ctx: { content: LIVE, map: MAP, config, scratch: createScratch() },
  };
}

/** Runs the jams slot `n` times, a tick each; returns the events. */
function run(state: SimState, ctx: TickContext, n: number): SimEvent<IdSpace>[] {
  const out: SimEvent<IdSpace>[] = [];
  for (let i = 0; i < n; i++) {
    jams(state, ctx);
    state.tick++;
    out.push(...state.events);
    state.events.length = 0;
  }
  return out;
}

describe('the Auditor’s ring (enemies.md § 4)', () => {
  it('is the roster row: every 10 s a 2 s ring, 2 tiles, 4 s; the tell is at least 1.5 s', () => {
    expect(RING).toMatchObject({
      kind: 'ring',
      periodTicks: 600,
      tellTicks: 120,
      radiusTiles: 2,
      durationTicks: 240,
      preferChoir: false,
    });
    expect(RING.tellTicks).toBeGreaterThanOrEqual(secToTicks(JAM_MIN_TELL_SEC));
    expect(FEATURE_GATES['enemy.jam.ring']).toBeNull();
  });

  it('rings as soon as a tower is in reach, holds still, then jams every tower in reach for 4 s', () => {
    const { state, ctx } = world();
    const a = placeTower(state, RIVET, 1, 1);
    const b = placeTower(state, RIVET, 3, 1);
    const edge = placeTower(state, RIVET, 4, 0);
    const far = placeTower(state, RIVET, 3, 2);
    fill(state, 8); // 12 placed: the jam limit is 3
    const e = spawn(state, AUDITOR, { dist: 2 });
    expect(run(state, ctx, FIRST)).toEqual([]);
    const tell = run(state, ctx, 1);
    expect(tell).toEqual([
      { type: 'JamTell', uid: e.uid, kind: 'ring', towers: [a.uid, b.uid, edge.uid] },
    ]);
    expect([ringTelling(e), e.paceMul, e.jamTarget]).toEqual([true, 0, 0]);
    // The ring shows for its whole tell, growing, the Auditor still; then the jams land.
    const during = run(state, ctx, RING.tellTicks - 1);
    expect(during).toEqual([]);
    expect(e.paceMul).toBe(0);
    expect(ringGrowth(e)).toBeCloseTo(1 - 1 / RING.tellTicks);
    const landed = run(state, ctx, 1);
    expect(landed).toEqual(
      [a, b, edge].map((t) => ({ type: 'TowerJammed', uid: t.uid, ticks: 240, source: e.uid })),
    );
    expect([a.jamTicks, b.jamTicks, edge.jamTicks, far.jamTicks]).toEqual([240, 240, 240, 0]);
    expect(ringTelling(e)).toBe(false);
    // Landing to landing is the period: the next ring lands 600 ticks on, and the towers are
    // jammable again by then (4 s jams, then JAM_IMMUNITY_SEC's 3 s of immunity: free at 420).
    const next = run(state, ctx, RING.periodTicks);
    const kinds = next.map((ev) => ev.type);
    expect(kinds.filter((k) => k === 'TowerUnjammed')).toHaveLength(3);
    expect(kinds).toContain('JamTell');
    expect(kinds.filter((k) => k === 'TowerJammed')).toHaveLength(3); // immunity spent
  });

  it('skips Jammed and immune towers, and a Choir at T3 makes it 1 s', () => {
    const { state, ctx } = world();
    const choir = placeTower(state, CHOIR, 3, 1, 3);
    const shielded = placeTower(state, RIVET, 1, 1); // within the Choir's 2 tiles
    const jammed = placeTower(state, RIVET, 4, 0);
    const immune = placeTower(state, RIVET, 1, 0);
    fill(state, 8); // 12 placed: the jam limit is 3, one Jammed already
    state.linksDirty = true;
    links(state, ctx);
    state.events.length = 0;
    jamTower(state, jammed, 240, 1);
    jammed.jamTicks = 5000; // still Jammed when the ring lands
    immune.jamImmuneTicks = 5000; // a jam's end or a Reboot
    const e = spawn(state, AUDITOR, { dist: 2 });
    run(state, ctx, FIRST);
    const tell = run(state, ctx, 1);
    expect(tell[0]).toMatchObject({ kind: 'ring', towers: [choir.uid, shielded.uid] });
    const landed = run(state, ctx, RING.tellTicks);
    expect(landed).toEqual([
      { type: 'TowerJammed', uid: choir.uid, ticks: 240, source: e.uid }, // no Choir guards a Choir
      { type: 'TowerJammed', uid: shielded.uid, ticks: 60, source: e.uid }, // × 0.25
    ]);
  });

  it('waits, ready, while no tower it could jam is in reach; a Reboot mid-ring spends it', () => {
    const { state, ctx } = world();
    const far = placeTower(state, RIVET, 3, 2);
    const e = spawn(state, AUDITOR, { dist: 2 });
    expect(run(state, ctx, FIRST + 200)).toEqual([]); // ready, but nothing to ring
    expect(e.jamTellTicks).toBe(0);
    const near = placeTower(state, RIVET, 1, 1);
    expect(run(state, ctx, 1)).toEqual([
      { type: 'JamTell', uid: e.uid, kind: 'ring', towers: [near.uid] },
    ]);
    run(state, ctx, 60);
    castReboot(state, { kind: 'reboot', immuneTicks: 360 });
    state.events.length = 0;
    const rest = run(state, ctx, RING.tellTicks);
    expect(rest.filter((ev) => ev.type === 'TowerJammed')).toEqual([]);
    expect(rest.filter((ev) => ev.type === 'JamFizzled')).toEqual([
      { type: 'JamFizzled', uid: e.uid },
    ]);
    expect([near.jamTicks, far.jamTicks]).toEqual([0, 0]);
  });

  it('Stasis or Unnerved cancels a ring under way and restarts the period', () => {
    const { state, ctx } = world();
    placeTower(state, RIVET, 1, 1);
    const e = spawn(state, AUDITOR, { dist: 2 });
    run(state, ctx, FIRST + 1 + 30);
    expect(ringTelling(e)).toBe(true);
    e.stasisTicks = 5;
    expect(run(state, ctx, 1)).toEqual([{ type: 'JamInterrupted', uid: e.uid }]);
    expect([e.jamTellTicks, e.jamTicks]).toEqual([0, RING.periodTicks]);
    e.stasisTicks = 0;
    // The full wait again before the next ring.
    expect(run(state, ctx, WAIT - 1)).toEqual([]);
    expect(run(state, ctx, 1)[0]).toMatchObject({ type: 'JamTell', kind: 'ring' });
    e.unnervedTicks = 5;
    expect(run(state, ctx, 1)).toEqual([{ type: 'JamInterrupted', uid: e.uid }]);
  });

  it('a unit leaving or standing down drops its ring quietly', () => {
    const { state, ctx } = world();
    placeTower(state, RIVET, 1, 1);
    const e = spawn(state, AUDITOR, { dist: 2 });
    run(state, ctx, FIRST + 10);
    e.leaving = true;
    expect(run(state, ctx, RING.tellTicks + 5)).toEqual([]);
    expect(e.jamTellTicks).toBe(0);
  });

  it('lands within the jam limit: max(1, 25% of the towers placed), counting the Jammed', () => {
    // Four towers placed (three in reach): the limit is 1, so the ring lands on the first only.
    const { state, ctx } = world();
    const a = placeTower(state, RIVET, 1, 1);
    const b = placeTower(state, RIVET, 3, 1);
    const edge = placeTower(state, RIVET, 4, 0);
    placeTower(state, RIVET, 3, 2);
    spawn(state, AUDITOR, { dist: 2 });
    run(state, ctx, FIRST + RING.tellTicks + 1); // the init, then the whole ring
    expect([a.jamTicks, b.jamTicks, edge.jamTicks]).toEqual([240, 0, 0]); // landed this tick
    expect(state.stats.jamOverLimitTicks).toBe(0);
    // Eight placed with one Jammed elsewhere: room for one more.
    const w = world();
    const x = placeTower(w.state, RIVET, 1, 1);
    const y = placeTower(w.state, RIVET, 3, 1);
    fill(w.state, 6);
    const other = w.state.towers.items[w.state.towers.used - 1]!;
    jamTower(w.state, other, 6000, 1);
    w.state.events.length = 0;
    spawn(w.state, AUDITOR, { dist: 2 });
    run(w.state, w.ctx, FIRST + RING.tellTicks + 1);
    expect([x.jamTicks, y.jamTicks]).toEqual([240, 0]); // landed this tick
    expect(w.state.stats.jamOverLimitTicks).toBe(0);
  });

  describe('the fizzle (T777): only when a counter turned it', () => {
    /** A ring under way over (1,1) with `n` towers out of reach placed; its Auditor and tower. */
    function ringing(n = 0) {
      const w = world();
      const near = placeTower(w.state, RIVET, 1, 1);
      fill(w.state, n);
      const e = spawn(w.state, AUDITOR, { dist: 2 });
      run(w.state, w.ctx, FIRST + 1 + 30);
      expect(ringTelling(e)).toBe(true);
      return { ...w, e, near };
    }
    /** The rest of the ring's tell, to its landing tick; its events. */
    const land = (w: ReturnType<typeof ringing>) => run(w.state, w.ctx, w.e.jamTellTicks);

    it('a tower in reach immune (a Reboot, a jam’s end): JamFizzled on the landing tick', () => {
      const w = ringing();
      w.near.jamImmuneTicks = 5000;
      expect(land(w)).toEqual([{ type: 'JamFizzled', uid: w.e.uid }]);
      expect(ringTelling(w.e)).toBe(false);
    });

    it('nothing in reach any more (sold in the tell): no fizzle', () => {
      const w = ringing();
      w.near.alive = false;
      expect(land(w)).toEqual([]);
    });

    it('every tower in reach already Jammed: no fizzle', () => {
      const w = ringing(4); // 5 placed: the limit is 1, so the jam below fills it
      jamTower(w.state, w.near, 6000, 1);
      w.state.events.length = 0;
      expect(land(w)).toEqual([]);
    });

    it('the jam limit full, an immune tower in reach beside a jammable one: no fizzle', () => {
      const w = ringing(2); // 3 placed: the limit is 1
      const other = placeTower(w.state, RIVET, 3, 1); // in reach, jammable: the limit stops it
      const far = w.state.towers.items[1]!; // out of reach
      jamTower(w.state, far, 6000, 1);
      w.near.jamImmuneTicks = 5000;
      w.state.events.length = 0;
      expect(land(w)).toEqual([]);
      expect(other.jamTicks).toBe(0);
    });

    it('jammed one tower and an immune one beside it: a landing, not a fizzle', () => {
      const w = ringing(8); // 9 placed, then 10: the limit is 2
      const other = placeTower(w.state, RIVET, 3, 1);
      w.near.jamImmuneTicks = 5000;
      expect(land(w)).toEqual([
        { type: 'TowerJammed', uid: other.uid, ticks: 240, source: w.e.uid },
      ]);
    });

    it('a ring dropped on its landing tick (leaving): no fizzle', () => {
      const w = ringing();
      w.near.jamImmuneTicks = 5000;
      run(w.state, w.ctx, w.e.jamTellTicks - 1);
      w.e.leaving = true;
      expect(run(w.state, w.ctx, 1)).toEqual([]);
      expect(w.e.jamTellTicks).toBe(0);
    });

    it('landRing: a Rally Chorus (jamMul 0) counts as immune; nothing in reach is nothing', () => {
      const w = world();
      const e = spawn(w.state, AUDITOR, { dist: 2 });
      expect(landRing(w.state, e, RING)).toBe('nothing');
      const t = placeTower(w.state, RIVET, 1, 1);
      t.jamMul = 0;
      expect(landRing(w.state, e, RING)).toBe('fizzled');
      t.jamMul = 1;
      expect(landRing(w.state, e, RING)).toBe('jammed');
      expect(t.jamTicks).toBe(240);
    });
  });
});
