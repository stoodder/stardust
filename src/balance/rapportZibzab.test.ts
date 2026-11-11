// Zibzab's Rapport in the harness (T709; progression.md § 7.3, core-loop.md § 3.2): stocked after
// A1M4, it is an R&D pick (D060) wherever par casts Clearance Sale after that: A3M6, his map whose
// par casts the sale every five waves. A2M4's par never casts it (only its alts do), so A2M4 has no
// pick, and A1M4 comes before the stock. The pick makes the sale's cooldown 3 waves, not 4, and
// par with it bought still wins A3M6, at par's own margin (its casts are five waves apart).
import { describe, expect, it } from 'vitest';
import { ABILITIES } from '../content/abilities/index.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { abilityStats } from '../sim/systems/abilities.ts';
import { runMap } from './harness.ts';
import { referenceRunProfile, rndPickProfile, rndPicks } from './profile.ts';
import { rndPickLabel } from './rndChecks.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const PICK = 'rapport_zibzab';

describe("Zibzab's Rapport as an R&D pick (T709)", { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it('is a pick on A3M6 only: A2M4 par never casts the sale, A1M4 comes before the stock', () => {
    expect(rndPicks(content.maps.a3_m06, content)).toContain(PICK);
    expect(rndPicks(content.maps.a2_m04, content)).not.toContain(PICK);
    expect(rndPicks(content.maps.a1_m04, content)).not.toContain(PICK);
    // No map before A1M4 is won offers it.
    for (const id of ['a1_m01', 'a1_m02', 'a1_m03'] as const) {
      expect(rndPicks(content.maps[id], content), id).not.toContain(PICK);
    }
  });

  it("its profile makes Clearance Sale's cooldown 3 waves; the reference's stays 4", () => {
    const map = content.maps.a3_m06;
    const sale = content.abilities.clearance_sale;
    expect(ABILITIES.clearance_sale.cooldownWaves).toBe(4);
    const ref = referenceRunProfile(map, content);
    expect(abilityStats(sale, ref.modifiers).cooldownWaves).toBe(4);
    const pick = rndPickProfile(map, content, PICK);
    expect(abilityStats(sale, pick.modifiers).cooldownWaves).toBe(3);
  });

  it("par with it bought wins A3M6 at par's margin (its casts are five waves apart)", () => {
    const report = runMap(content, 'a3_m06', { seeds: 1, build: PICK });
    expect(report.checks.filter((k) => !k.ok).map((k) => `${k.id}: ${k.summary}`)).toEqual([]);
    const rec = (build: string) => report.runs.find((r) => r.build === build && !r.repeat)!;
    const bought = rec(rndPickLabel(PICK));
    expect(bought.result?.outcome).toBe('won');
    expect(bought.marginPct).toBe(rec('par').marginPct);
  });
});
