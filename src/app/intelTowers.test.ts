// The briefing names only towers the run may bring (app/hudViews.ts `intelTowers`; T862): on
// Skitterkin Only (`towerFaction: 'skitterkin'`), every required counter's answers are the warrens'
// towers, however many others the save owns; on a campaign map the save's towers stand as they are.
import { describe, expect, it } from 'vitest';
import { createSim } from '../sim/index.ts';
import { battleConfig } from './battleSetup.ts';
import { intelTowers, threatIntel } from './hudViews.ts';

/** Every tower in the live content, as a post-game save owns them. */
const ALL = Object.keys(battleConfig('a1_m01', 1).content.towers);

describe('the briefing names only towers the run may bring (T862)', () => {
  it('Skitterkin Only lists only Skitterkin towers', () => {
    const sim = createSim(battleConfig('ch_m01', 1));
    const towers = sim.config.content.towers;
    const owned = intelTowers(sim.config, ALL);
    expect(owned.length).toBeGreaterThan(0);
    for (const t of owned) expect(towers[t]!.faction).toBe('skitterkin');
    const intel = threatIntel(sim.map, owned, []);
    expect(intel.required.map((r) => r.counter)).toEqual(['splash', 'air']);
    for (const r of intel.required) {
      expect(r.answers.length).toBeGreaterThan(0);
      for (const a of r.answers) expect(a).toMatch(/Gloop|Sproing|Den|Choir/);
    }
  });

  it('a map without the rule keeps the save’s towers', () => {
    const sim = createSim(battleConfig('a1_m01', 1));
    expect(intelTowers(sim.config, ALL)).toEqual(ALL);
  });
});
