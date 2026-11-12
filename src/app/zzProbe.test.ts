import { it } from 'vitest';
import { createSim } from '../sim/index.ts';
import { battleConfig } from './battleSetup.ts';
import { createHost } from './host.ts';
import { startAutoplay } from './autoplay.ts';
it('probe', () => {
  const h = createHost(createSim(battleConfig('dev_bore', 1)), { now: () => 0, speed: 0 });
  startAutoplay(h, 'par');
  while (h.sim.state.phase < 2) h.fastForward(1);
  h.setDriver(null);
  const t = h.sim.state.towers;
  for (let i = 0; i < t.used; i++) if (t.items[i]!.alive) h.enqueue({ type: 'sell', towerUid: t.items[i]!.uid });
  for (let k = 0; k < 60 * 60 * 5 && h.sim.state.outcome === 'playing'; k++) h.fastForward(1);
  console.log('OUT', h.sim.state.outcome, h.sim.state.integrity, h.sim.state.tick, h.checkpoints);
});
