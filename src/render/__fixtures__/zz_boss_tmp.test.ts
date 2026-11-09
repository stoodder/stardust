import { it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import { createSim, bossTelling, burrowTelling } from '../../sim/index.ts';

it('dev_boss timeline', () => {
  const sim = createSim(battleConfig('dev_boss', 1));
  const builds: [string, number, number][] = [['rivet', 9, 3], ['rivet', 9, 5], ['rivet', 7, 1], ['rivet', 6, 5]];
  for (const [t, c, r] of builds) sim.enqueue({ type: 'build', tower: t, tile: [c, r] } as never);
  sim.enqueue({ type: 'callWave' } as never);
  const seen = new Set<string>();
  for (let k = 0; k < 60 * 120; k++) {
    sim.step();
    const st = sim.state;
    const evs: any[] = []; sim.drainEvents(evs); for (const ev of evs) {
      if (['BossPhase','BossEnded','WaveStarted','EnemyDied','WaveCleared','CountdownStarted','MapWon','MapLost'].includes(ev.type)) console.log(st.tick, JSON.stringify(ev));
    }
    for (let i = 0; i < st.enemies.used; i++) {
      const e = st.enemies.items[i]!;
      if (!e.alive || !e.def) continue;
      const tags = [e.def.id];
      if (e.def.burrow && burrowTelling(e as never, e.def.burrow)) tags.push('dtell');
      if (e.burrowed) tags.push('burrowed');
      if (e.def.boss && bossTelling(e as never)) tags.push('btell');
      if (e.huddleUid) tags.push('huddled');
      if (e.leaving) tags.push('leaving');
      if (e.invulnerableTicks) tags.push('inv');
      const key = tags.join(':');
      if (tags.length > 1 && !seen.has(key + e.uid)) { seen.add(key + e.uid); console.log(st.tick, e.uid, key, e.x.toFixed(2), e.y.toFixed(2), e.hp.toFixed(0)); }
    }
    if (st.outcome !== 'playing') { console.log('outcome', st.outcome, st.tick); break; }
  }
});
