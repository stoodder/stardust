// dev_witch (T404; devBattle.ts): par's Zapcoils drive the short Glass Witch through phase 2's
// blink to her retreat and a win, the same way every run, so the smoke flow (smoke/witch.spec.ts)
// can count on a tell, an afterimage, and the retreat.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type SimEvent } from '../../sim/index.ts';

const BOSS_EVENTS = new Set(['BossPhase', 'BlinkTell', 'Blinked', 'BlinkInterrupted', 'BossEnded']);

/** Par's builds, the wave called; the boss's events and how the run ends. */
function play(): { log: string[]; hash: string; blinks: number; outcome: string } {
  const sim = createSim(battleConfig('dev_witch', 1));
  for (const s of sim.map.builds.parBuild.steps) {
    if (s.kind === 'build') sim.enqueue({ type: 'build', tower: s.tower, tile: s.tile });
  }
  sim.enqueue({ type: 'callWave' });
  const log: string[] = [];
  const out: SimEvent<IdSpace>[] = [];
  while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 120) {
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) if (BOSS_EVENTS.has(e.type)) log.push(`${sim.state.tick} ${e.type}`);
  }
  return { log, hash: sim.hash(), blinks: sim.state.stats.bossBlinks, outcome: sim.state.outcome };
}

describe('dev_witch', () => {
  it('is deterministic: par sees her phase 2, a blink, and her retreat, and wins', () => {
    const a = play();
    expect(play()).toEqual(a);
    expect(a.outcome).toBe('won');
    expect(a.blinks).toBeGreaterThanOrEqual(1);
    const kinds = a.log.map((l) => l.split(' ')[1]);
    expect(kinds).toContain('BlinkTell');
    expect(kinds).toContain('Blinked');
    expect(kinds.at(-1)).toBe('BossEnded');
  });
});
