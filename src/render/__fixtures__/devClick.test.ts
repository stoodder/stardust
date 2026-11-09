// dev_click (T409; devBattle.ts): the Peeker's rock turns clickable as W1 starts; par's `interact`
// step clicks it at once, and with nobody clicking, W1's clear interacts by fallback. The smoke
// flow (smoke/clickable.spec.ts) counts on both.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, runHeadless, type SimEvent } from '../../sim/index.ts';

describe('dev_click', () => {
  it('par clicks the rock the tick after it turns clickable; the run is deterministic', () => {
    const cfg = battleConfig('dev_click', 1);
    const par = cfg.content.maps.dev_click!.builds.parBuild;
    const a = runHeadless(cfg, par);
    const b = runHeadless(battleConfig('dev_click', 1), par);
    expect(b.hash).toBe(a.hash);
    const click = a.steps.find((s) => s.kind === 'interact')!;
    expect(click).toMatchObject({ issuedTick: 1, error: null });
    expect(a.steps.every((s) => s.error === null)).toBe(true);
  });

  it('without a click, W1 cleared interacts by fallback', () => {
    const sim = createSim(battleConfig('dev_click', 1));
    sim.enqueue({ type: 'callWave' });
    const out: SimEvent<IdSpace>[] = [];
    const seen: SimEvent<IdSpace>[] = [];
    while (sim.state.interacted.length === 0 && sim.state.tick < 60 * 120) {
      sim.step();
      out.length = 0;
      sim.drainEvents(out);
      for (const e of out) {
        if (e.type === 'ClickableChanged' || e.type === 'Interacted') seen.push(e);
      }
    }
    expect(seen).toEqual([
      { type: 'ClickableChanged', marker: 'peeker', on: true },
      { type: 'ClickableChanged', marker: 'peeker', on: false },
      { type: 'Interacted', marker: 'peeker', byFallback: true },
    ]);
    expect(sim.state.schedule.resolved[0]).toBe(true);
  });
});
