// M5's Aelari on the dev maps (T502; devBattle.ts), whole-sim and deterministic, so the smoke flows
// can count on what they look for:
// - dev_aura (smoke/aura.spec.ts): the Aegis Cantor's aura refills shields the Rivet chips (a
//   Glimmer's shield rises while its own regen is still waiting out its delay), and every
//   Blinkstrider holds through a tell and blinks.
// - dev_cloak (T501b, smoke/cloak.spec.ts): with the Rivet alone, wave 1's Veilwalkers walk past it
//   untouched and leak; once the Lookout stands, wave 2's are Revealed and shot.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import type { IdSpace } from '../../content/types.ts';
import { createSim, type Sim, type SimEvent } from '../../sim/index.ts';

type Ev = SimEvent<IdSpace>;

function drain(sim: Sim<IdSpace>, out: Ev[]): void {
  out.length = 0;
  sim.drainEvents(out);
}

/** dev_aura with par's builds: aura refills seen, blinks by enemy, the hash and outcome. */
function playAura(): { refills: number; blinks: number; tells: number; hash: string } {
  const sim = createSim(battleConfig('dev_aura', 1));
  for (const s of sim.map.builds.parBuild.steps) {
    if (s.kind === 'build') sim.enqueue({ type: 'build', tower: s.tower, tile: s.tile });
  }
  sim.enqueue({ type: 'callWave' });
  const prev = new Map<number, number>();
  const out: Ev[] = [];
  let refills = 0;
  let blinks = 0;
  let tells = 0;
  while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 90) {
    sim.step();
    drain(sim, out);
    for (const e of out) {
      if (e.type === 'Blinked' && e.enemy === 'blinkstrider') blinks++;
      if (e.type === 'BlinkTell' && e.enemy === 'blinkstrider') tells++;
    }
    const pool = sim.state.enemies;
    for (let i = 0; i < pool.used; i++) {
      const e = pool.items[i]!;
      if (!e.alive || e.def?.id !== 'glimmer') continue;
      const before = prev.get(e.uid);
      // Its own regen waits out the delay, so a rise now is the aura's.
      if (before !== undefined && e.shieldHp > before && e.shieldRegenDelayTicks > 0) refills++;
      prev.set(e.uid, e.shieldHp);
    }
  }
  return { refills, blinks, tells, hash: sim.hash() };
}

describe('dev_aura (T502)', () => {
  it('is deterministic: the aura refills chipped shields and every Blinkstrider blinks', () => {
    const a = playAura();
    expect(playAura()).toEqual(a);
    expect(a.refills).toBeGreaterThan(10);
    expect(a.tells).toBeGreaterThanOrEqual(3);
    expect(a.blinks).toBeGreaterThanOrEqual(3);
  });
});

describe('dev_cloak (T501b)', () => {
  it('the Rivet alone never touches a Veilwalker; with the Lookout, wave 2 is Revealed and shot', () => {
    const sim = createSim(battleConfig('dev_cloak', 1));
    sim.enqueue({ type: 'build', tower: 'rivet', tile: [10, 3] });
    sim.enqueue({ type: 'callWave' });
    const out: Ev[] = [];
    const leaked: string[] = [];
    let hitInW1 = 0;
    while (sim.state.wave < 2 && sim.state.outcome === 'playing' && sim.state.tick < 60 * 60) {
      sim.step();
      drain(sim, out);
      for (const e of out) {
        if (e.type === 'EnemyLeaked') leaked.push(e.enemy);
        if (e.type === 'ProjectileHit' || e.type === 'ShieldHit' || e.type === 'EnemyDied')
          hitInW1++;
      }
      if (leaked.length === 4) break; // before wave 2's countdown runs out
    }
    expect(leaked).toEqual(['veilwalker', 'veilwalker', 'veilwalker', 'veilwalker']);
    expect(hitInW1).toBe(0);
    expect(sim.state.stats.killsByEnemy.veilwalker ?? 0).toBe(0);

    sim.enqueue({ type: 'build', tower: 'lookout', tile: [8, 4] });
    sim.enqueue({ type: 'callWave' });
    let revealed = 0;
    let shot = 0;
    while (sim.state.outcome === 'playing' && sim.state.tick < 60 * 120) {
      sim.step();
      drain(sim, out);
      for (const e of out) {
        if (e.type === 'Revealed') revealed++;
        if (e.type === 'ShieldHit' || e.type === 'EnemyDied') shot++;
      }
    }
    expect(revealed).toBeGreaterThanOrEqual(4);
    expect(shot).toBeGreaterThan(0);
  });
});
