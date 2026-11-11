import { it } from 'vitest';
import { battleConfig } from '../app/battleSetup.ts';
import { createBuildExecutor, createSim } from './index.ts';
it('probe', () => {
  for (const q of ['keep', 'purge', 'rewrite']) {
    const base = battleConfig('dev_song', 1);
    const cfg = { ...base, scriptFlags: { ...base.scriptFlags, quill_choice: q } };
    const s = createSim(cfg);
    const ex = createBuildExecutor(s, s.map.builds.parBuild);
    let t = 0; let ev: any[] = []; const counts: Record<string, number> = {}; const ticks: string[] = [];
    while (s.state.outcome === 'playing' && t < 60000) { ex.beforeTick(); s.step(); t++; ev.length = 0; s.drainEvents(ev); for (const e of ev) { if (['LaidToRest','Scattered','Reformed','PhaseChanged','EnemyDied','SingerHushed','ChoirHalted','WaveStarted','MapWon'].includes(e.type)) counts[e.type] = (counts[e.type] ?? 0) + 1; if (['Scattered','Reformed','LaidToRest','WaveStarted','MapWon'].includes(e.type)) ticks.push(e.type[0]+e.type[1]+t);} }
    console.log(q, s.state.outcome, t, JSON.stringify(counts), s.state.restPoints.toFixed(2), s.state.stats.restedKills, s.state.stats.scatteredKills, s.state.choir.voices, s.state.choir.y.toFixed(2), ticks.join(' '));
  }
});
