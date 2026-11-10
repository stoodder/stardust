// dev_lantern (T508; devLantern.ts): the par build (a Truthlight Lantern beside a Prism for
// Lightsong, an All-Seeing Lantern, two Rivets) against W1's Veilwalkers, Rift Moths, and
// Blinkstriders and W2's Diggers plays the same way every run: Lightsong forms, Marks land (the
// area's and the beams'), Truthlight's no-evade holds on someone, and the map is won. The smoke
// flow (smoke/lantern.spec.ts) counts on the same.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type SimEvent } from '../../sim/index.ts';
import { LANTERN_TILES } from './devLantern.ts';

interface Run {
  hash: string;
  outcome: string;
  links: string[];
  marked: number;
  noEvade: number;
  specs: (string | null)[];
}

function play(): Run {
  const sim = createSim(battleConfig('dev_lantern', 1));
  expect(sim.config.specsUnlocked).toContain('lantern');
  const { truthlight, allSeeing, prism, rivets } = LANTERN_TILES;
  sim.enqueue({ type: 'build', tower: 'lantern', tile: [...truthlight] });
  sim.enqueue({ type: 'build', tower: 'lantern', tile: [...allSeeing] });
  sim.enqueue({ type: 'build', tower: 'prism', tile: [...prism] });
  for (const r of rivets) sim.enqueue({ type: 'build', tower: 'rivet', tile: [...r] });
  sim.step();
  for (const [tile, spec] of [
    [truthlight, 'b'],
    [allSeeing, 'a'],
  ] as const) {
    const t = sim.state.towers.items.find((x) => x.alive && x.col === tile[0] && x.row === tile[1]);
    const uid = t?.uid ?? 0;
    expect(uid).toBeGreaterThan(0);
    sim.enqueue({ type: 'upgrade', towerUid: uid });
    sim.enqueue({ type: 'upgrade', towerUid: uid });
    sim.enqueue({ type: 'specialize', towerUid: uid, spec });
  }
  sim.enqueue({ type: 'callWave' });
  const links: string[] = [];
  const out: SimEvent<IdSpace>[] = [];
  let marked = 0;
  let noEvade = 0;
  while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 180) {
    sim.step();
    for (let i = 0; i < sim.state.enemies.used; i++) {
      const e = sim.state.enemies.items[i]!;
      if (!e.alive) continue;
      if (e.markTicks > 0) marked++;
      if (e.noEvadeTicks > 0) noEvade++;
    }
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) if (e.type === 'LinkFormed') links.push(e.link);
  }
  const specs = sim.state.towers.items.filter((t) => t.alive).map((t) => t.spec);
  return { hash: sim.hash(), outcome: sim.state.outcome, links, marked, noEvade, specs };
}

describe('dev_lantern', () => {
  it('is deterministic: Lightsong forms, Marks and Truthlight land, and it wins', () => {
    const a = play();
    expect(play()).toEqual(a);
    expect(a.outcome).toBe('won');
    expect(a.links).toEqual(['lightsong']);
    expect(a.specs.filter((s) => s !== null).toSorted()).toEqual(['a', 'b']);
    expect(a.marked).toBeGreaterThan(0);
    expect(a.noEvade).toBeGreaterThan(0);
  });
});
