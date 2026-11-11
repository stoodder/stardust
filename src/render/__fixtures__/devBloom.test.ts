// dev_bloom (T608; devBloom.ts): par's Gravity Well Bloom in the road's corner, a Mindspike beside it
// (Stillmind), a Harpoon (Pinned Down), and two Rivets, against a Maw with Motes, Diggers, and
// Puffwings. The same run every time: both links form and reach the Bloom, it pulses on its
// shortened beat, freezes and pulls units on the road, chills the flyers overhead, and par wins. The smoke flow
// (smoke/bloom.spec.ts) counts on these.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type Sim, type SimEvent } from '../../sim/index.ts';

interface Run {
  hash: string;
  outcome: string;
  pulses: number;
  frozen: number;
  pulledIds: Set<string>;
  frozenIds: Set<string>;
  chilledIds: Set<string>;
  bloom: { radius: number; sooner: number; spec: string | null };
  links: string[];
}

/** Par's steps in order (each wave-1 step at once), wave 1 called at once, then every wave. */
function play(): Run {
  const sim: Sim<IdSpace> = createSim(battleConfig('dev_bloom', 1));
  const uidAt = (col: number, row: number): number => {
    const t = sim.state.towers.items.find((x) => x.alive && x.col === col && x.row === row);
    return t?.uid ?? 0;
  };
  for (const s of sim.map.builds.parBuild.steps) {
    if (s.kind === 'build') sim.enqueue({ type: 'build', tower: s.tower, tile: s.tile });
    else if (s.kind === 'upgrade') sim.enqueue({ type: 'upgrade', towerUid: uidAt(...s.tile) });
    else if (s.kind === 'specialize') {
      sim.enqueue({ type: 'specialize', towerUid: uidAt(...s.tile), spec: s.spec });
    }
    sim.step(); // each step lands before the next names its tower
  }
  sim.enqueue({ type: 'callWave' });
  const events: SimEvent<IdSpace>[] = [];
  let pulses = 0;
  let frozen = 0;
  const pulledIds = new Set<string>();
  const frozenIds = new Set<string>();
  const chilledIds = new Set<string>();
  const idOf = new Map<number, string>();
  while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 240) {
    sim.step();
    const st = sim.state;
    if (st.schedule.phase === 'countdown') sim.enqueue({ type: 'callWave' });
    for (let i = 0; i < st.enemies.used; i++) {
      const e = st.enemies.items[i]!;
      if (!e.alive || e.def === null) continue;
      idOf.set(e.uid, e.def.id);
      if (e.stasisTicks > 0) frozenIds.add(e.def.id);
      if (e.chillPct > 0) chilledIds.add(e.def.id);
    }
    events.length = 0;
    sim.drainEvents(events);
    for (const e of events) {
      if (e.type === 'PulseBurst') {
        pulses++;
        frozen += e.frozen;
      } else if (e.type === 'PulledBack') pulledIds.add(idOf.get(e.uid) ?? '?');
    }
  }
  const b = sim.state.towers.items.find((t) => t.alive && t.def?.id === 'bloom')!;
  const links = Object.entries(sim.state.stats.linkTicks)
    .filter(([, n]) => (n ?? 0) > 0)
    .map(([id]) => id)
    .toSorted();
  return {
    hash: sim.hash(),
    outcome: sim.state.outcome,
    pulses,
    frozen,
    pulledIds,
    frozenIds,
    chilledIds,
    bloom: { radius: b.linkFieldRadiusTiles, sooner: b.linkPulseSoonerTicks, spec: b.spec },
    links,
  };
}

describe('dev_bloom (T608)', () => {
  const run = play();

  it('is deterministic and par wins', () => {
    expect(play().hash).toBe(run.hash);
    expect(run.outcome).toBe('won');
  });

  it('forms Pinned Down and Stillmind on the Gravity Well Bloom', () => {
    expect(run.links).toEqual(expect.arrayContaining(['pinned_down', 'stillmind']));
    expect(run.bloom.spec).toBe('a');
    expect(run.bloom.radius).toBeCloseTo(0.3, 12);
    expect(run.bloom.sooner).toBe(60);
  });

  it('pulses, freezing and pulling units, and chills the flyers overhead', () => {
    expect(run.pulses).toBeGreaterThan(3);
    expect(run.frozen).toBeGreaterThan(3);
    // The Puffwings cross the corner between pulses: the field's chill reaches them in the air.
    expect([...run.frozenIds]).toEqual(expect.arrayContaining(['maw', 'mote', 'digger']));
    expect([...run.chilledIds]).toEqual(expect.arrayContaining(['maw', 'mote', 'puffwing']));
    expect([...run.pulledIds]).toEqual(expect.arrayContaining(['maw', 'mote', 'digger']));
  });
});
