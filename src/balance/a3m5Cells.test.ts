// A3M5's story cells (T721; campaign.md § 4.9 "both C3 branches, every C4"; D146 fork 3): par
// wins in band through each door under each C4 answer, and drives "Shareholder Value" off short of
// the core in every one. Keep plays the reference par. Purge: the harness's run adds the −2
// Everglow armor a save's battle does (balance/profile.ts `storyRunModifiers`, the same
// `storyModifiers` app/battleSetup.ts adds), every Everglow unit with its panel open. Rewrite:
// QUILL is offline and System Reboot locked, so par's slot 1 is Suppressing Fire (its own par
// build) and the Choir carries the jam. The warren owns the Gloop Spitter; par doesn't build it.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { abilitiesOffOn, createNewSave, storyModifiers } from '../meta/index.ts';
import { createBuildExecutor, createSim } from '../sim/index.ts';
import { expectBeats, runA3m5 } from './__fixtures__/a3m5.ts';
import { buildFor } from './harness.ts';
import { referenceRunProfile, runConfig, storyRunModifiers } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.a3_m05;
const DOORS = ['convoy', 'warren'] as const;
const C4 = ['keep', 'purge', 'rewrite'] as const;
/** The furthest down the road any cell drives the platform off (A2M4's road is 38 tiles on). */
const WORST_DRIVE_OFF = 37.5;

const label = (door: string, c4: string): string => `flags:door_choice=${door},quill_choice=${c4}`;

describe('A3M5 door × C4 cells', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it.each(DOORS.flatMap((d) => C4.map((c) => [d, c] as const)))(
    'wins par in band through the %s door under %s, the platform driven off',
    (door, c4) => {
      const l = label(door, c4);
      const build = buildFor(l, map, content)!;
      expect(build.loadout).toEqual(['choir', 'harpoon', 'bloom', 'thumper']);
      expect(build.technicianAbility).toBe(c4 === 'rewrite' ? 'suppressing_fire' : 'system_reboot');
      const r = runA3m5(content, l);
      expectBeats(r, l);
      const margin = Math.min(r.integrity / 22, r.asset / 12) * 100;
      expect(margin, l).toBeGreaterThanOrEqual(50);
      // Act III's band, its top 75 for Purge's earned edge (builds.ts `marginBand`).
      expect(margin, l).toBeLessThanOrEqual(c4 === 'purge' ? 75 : 70);
      expect(r.droveOffAt!, l).toBeLessThan(WORST_DRIVE_OFF);
      expect(r.stats.jamOverLimitTicks, l).toBe(0);
    },
  );

  it('locks System Reboot under Rewrite only, and the Rewrite par never casts it', () => {
    const save = createNewSave();
    for (const c4 of C4) {
      const s = {
        ...save,
        story: { ...save.story, flags: { ...save.story.flags, quill_choice: c4 } },
      };
      expect(abilitiesOffOn(map, s), c4).toEqual(c4 === 'rewrite' ? ['system_reboot'] : []);
    }
    const rewrite = buildFor(label('convoy', 'rewrite'), map, content)!;
    const casts = rewrite.steps.filter((s) => s.kind === 'ability' && s.slot === 1);
    expect(casts.length).toBeGreaterThan(0);
    for (const c of casts) expect(c.kind === 'ability' && c.target !== null).toBe(true);
  });

  it("gives a Purge run the −2 Everglow armor a save's battle gets, panels open", () => {
    const flags = { door_choice: 'convoy', quill_choice: 'purge' } as const;
    const added = storyRunModifiers(content, 'a3_m05', flags);
    const save = createNewSave();
    const purged = { ...save, story: { ...save.story, flags: { ...save.story.flags, ...flags } } };
    // The same modifiers a save's battle gets (app/battleSetup.ts `simulatedStoryModifiers` adds
    // `storyModifiers`' less any the sim refuses; this one is live).
    expect(added).toEqual(storyModifiers('a3_m05', purged));
    expect(added).toEqual([
      { kind: 'enemyStat', stat: 'armor', faction: 'everglow', flat: -2, source: 'c4:purge' },
    ]);
    // Keep, Rewrite, and no answer add nothing; nor does Purge before A3M5.
    expect(storyRunModifiers(content, 'a3_m05', { quill_choice: 'keep' })).toEqual([]);
    expect(storyRunModifiers(content, 'a3_m05', { quill_choice: 'rewrite' })).toEqual([]);
    expect(storyRunModifiers(content, 'a3_m05', {})).toEqual([]);
    expect(storyRunModifiers(content, 'a3_m04', { quill_choice: 'purge' })).toEqual([]);
    // In the run: a Liability walks in with armor 10 and its panel open; the Hollow are untouched.
    const l = label('convoy', 'purge');
    const build = buildFor(l, map, content)!;
    const cfg = runConfig(
      content,
      map,
      build,
      referenceRunProfile(map, content, 'standard', undefined, flags),
      1,
      flags,
    );
    expect(cfg.modifiers).toContainEqual(added[0]);
    const sim = createSim(cfg);
    const exec = createBuildExecutor(sim, build);
    const seen: Record<string, { armor: number; openPanel: boolean }> = {};
    while (sim.state.outcome === 'playing' && sim.state.wave <= 6) {
      exec.beforeTick();
      sim.step();
      for (let i = 0; i < sim.state.enemies.used; i++) {
        const e = sim.state.enemies.items[i]!;
        if (e.alive && e.def !== null) {
          seen[e.def.id] = { armor: e.def.armor, openPanel: e.def.openPanel };
        }
      }
    }
    expect(seen.liability).toEqual({ armor: 10, openPanel: true });
    expect(seen.compliance).toEqual({ armor: 2, openPanel: true });
    expect(seen.mote).toEqual({ armor: 0, openPanel: false });
  });
});
