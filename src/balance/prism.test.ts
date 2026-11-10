// T504: a Prism-bearing build runs on a live map. No existing par owns the Prism (the gift comes
// after A2M5), so the harness's own runs never build one; this adds a Prism to A2M3's par (built in
// W6 on the free pad nearest the pump station, over Terrace 2's road) and checks the run plays
// through: no invariant violation, every step issued, the beam firing and dealing
// damage, and the map still won. The maps' own numbers are their tests' (a2m3.test.ts and kin).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledBuild, CompiledBuildStep } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { isBuildable } from '../sim/grid.ts';
import { runHeadless } from '../sim/index.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);

describe('a Prism in a live map (T504)', { timeout: HARNESS_TEST_TIMEOUT_MS }, () => {
  it("A2M3's par plus a Prism: plays clean and still wins", () => {
    const map = content.maps.a2_m03;
    const par = map.builds.parBuild;
    expect(par.loadout).not.toContain('prism');
    const used = new Set(
      par.steps.flatMap((s) => ('tile' in s ? [`${s.tile[0]},${s.tile[1]}`] : [])),
    );
    // The free pad nearest the pump station (12, 7); ties: the first scanning row by row.
    let tile: [number, number] | null = null;
    let best = Infinity;
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const d2 = (c - 12) ** 2 + (r - 7) ** 2;
        if (isBuildable(map, c, r) && !used.has(`${c},${r}`) && d2 < best) {
          best = d2;
          tile = [c, r];
        }
      }
    }
    expect(tile).not.toBeNull();
    const step: CompiledBuildStep = { wave: 6, kind: 'build', tower: 'prism', tile: tile! };
    const build: CompiledBuild = {
      ...par,
      loadout: [...par.loadout, 'prism'],
      steps: [...par.steps, step],
    };
    const profile = referenceRunProfile(map, content);
    const r = runHeadless(runConfig(content, map, build, profile, 1), build);
    expect(r.violations).toEqual([]);
    expect(r.steps.every((s) => s.issuedTick >= 0 && s.error === null)).toBe(true);
    const prism = r.towers.find((t) => t.tower === 'prism');
    expect(prism).toBeDefined();
    expect(prism!.shots).toBeGreaterThan(0); // beam locks
    expect(prism!.damage).toBeGreaterThan(0);
    expect(r.outcome).toBe('won');
  });
});
