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
import { ringGrowth, ringTelling } from './enemyAbilities/jamRing.ts';
import type { SimEvent } from './events.ts';
import { FEATURE_GATES } from './gates.ts';
import { jams, jamTower } from './jam.ts';
import { createState, type SimState } from './state.ts';
import { links } from './systems/links.ts';
import { createScratch, type TickContext } from './tick.ts';

const LIVE: CompiledContent<IdSpace> = compileContent(RAW_CONTENT);
const AUDITOR = LIVE.enemies.auditor!;
const RING = AUDITOR.jam!;
const CHOIR = LIVE.towers.choir!;
const RIVET = LIVE.towers.rivet!;
const WAIT = RING.periodTicks - RING.tellTicks; // 480: the first ring starts this long after the spawn

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
  it('is the roster row: every 10 s a 2 s ring, 2 tiles, 3 s; the tell is at least 1.5 s', () => {
    expect(RING).toMatchObject({
      kind: 'ring',
      periodTicks: 600,
      tellTicks: 120,
      radiusTiles: 2,
      durationTicks: 180,
      preferChoir: false,
    });
    expect(RING.tellTicks).toBeGreaterThanOrEqual(secToTicks(JAM_MIN_TELL_SEC));
    expect(FEATURE_GATES['enemy.jam.ring']).toBeNull();
  });

  it('rings 8 s after its spawn, holds still, then jams every tower in reach for 3 s', () => {
    const { state, ctx } = world();
    const a = placeTower(state, RIVET, 1, 1);
    const b = placeTower(state, RIVET, 3, 1);
    const edge = placeTower(state, RIVET, 4, 0);
    const far = placeTower(state, RIVET, 3, 2);
    const e = spawn(state, AUDITOR, { dist: 2 });
    expect(run(state, ctx, WAIT)).toEqual([]);
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
      [a, b, edge].map((t) => ({ type: 'TowerJammed', uid: t.uid, ticks: 180, source: e.uid })),
    );
    expect([a.jamTicks, b.jamTicks, edge.jamTicks, far.jamTicks]).toEqual([180, 180, 180, 0]);
    expect(ringTelling(e)).toBe(false);
    // Landing to landing is the period: the next ring lands 480 ticks on, and the towers are
    // jammable again by then (3 s jams, then JAM_IMMUNITY_SEC's 3 s of immunity: free at 360).
    const next = run(state, ctx, RING.periodTicks);
    const kinds = next.map((ev) => ev.type);
    expect(kinds.filter((k) => k === 'TowerUnjammed')).toHaveLength(3);
    expect(kinds).toContain('JamTell');
    expect(kinds.filter((k) => k === 'TowerJammed')).toHaveLength(3); // immunity spent
  });

  it('skips Jammed and immune towers, and a Choir at T3 makes it 0.75 s', () => {
    const { state, ctx } = world();
    const choir = placeTower(state, CHOIR, 3, 1, 3);
    const shielded = placeTower(state, RIVET, 1, 1); // within the Choir's 2 tiles
    const jammed = placeTower(state, RIVET, 4, 0);
    const immune = placeTower(state, RIVET, 1, 0);
    state.linksDirty = true;
    links(state, ctx);
    state.events.length = 0;
    jamTower(state, jammed, 240, 1);
    jammed.jamTicks = 5000; // still Jammed when the ring lands
    immune.jamImmuneTicks = 5000; // a jam's end or a Reboot
    const e = spawn(state, AUDITOR, { dist: 2 });
    run(state, ctx, WAIT);
    const tell = run(state, ctx, 1);
    expect(tell[0]).toMatchObject({ kind: 'ring', towers: [choir.uid, shielded.uid] });
    const landed = run(state, ctx, RING.tellTicks);
    expect(landed).toEqual([
      { type: 'TowerJammed', uid: choir.uid, ticks: 180, source: e.uid }, // no Choir guards a Choir
      { type: 'TowerJammed', uid: shielded.uid, ticks: 45, source: e.uid }, // × 0.25
    ]);
  });

  it('waits, ready, while no tower it could jam is in reach; a Reboot mid-ring spends it', () => {
    const { state, ctx } = world();
    const far = placeTower(state, RIVET, 3, 2);
    const e = spawn(state, AUDITOR, { dist: 2 });
    expect(run(state, ctx, WAIT + 200)).toEqual([]); // ready, but nothing to ring
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
    expect([near.jamTicks, far.jamTicks]).toEqual([0, 0]);
  });

  it('Stasis or Unnerved cancels a ring under way and restarts the period', () => {
    const { state, ctx } = world();
    placeTower(state, RIVET, 1, 1);
    const e = spawn(state, AUDITOR, { dist: 2 });
    run(state, ctx, WAIT + 1 + 30);
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
    run(state, ctx, WAIT + 10);
    e.leaving = true;
    expect(run(state, ctx, RING.tellTicks + 5)).toEqual([]);
    expect(e.jamTellTicks).toBe(0);
  });
});
