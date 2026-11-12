// The challenge maps (design/maps.md § 8; T862): the harness runs them after the campaign, outside
// its monotonic chain; each run carries its map's rules (sim/rules.ts `challengeConfig`), which are
// the veteran modifiers' own grants under a `challenge:` source, so no veteran bonus is paid; and
// each rule bites in a real run (Skitterkin Only fits a loadout to the warrens' towers, Lights Out
// cloaks every unit, Glass Core and Radio Silence hold on Story too). The par band, the no-counter
// losses, and Story's win are `npm run sim`'s (assertions 1–13).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { IdSpace } from '../content/types.ts';
import { veteranGrants, veteranModsOf } from '../meta/veteran.ts';
import { challengeConfig, createSim, radioSilent, type SimConfig } from '../sim/index.ts';
import type { RunRecord } from './checks.ts';
import { campaignMapIds, challengeMapIds, monotonicCheck, type MapReport } from './harness.ts';
import { referenceRunProfile, runConfig } from './profile.ts';

const content: CompiledContent<IdSpace> = compileContent(RAW_CONTENT);
const CHALLENGES = ['ch_m01', 'ch_m02', 'ch_m03'];

/** Par's config on `mapId` (`story`: on Story), as the harness builds it. */
function parConfig(mapId: string, story = false): SimConfig<IdSpace> {
  const map = content.maps[mapId]!;
  const profile = referenceRunProfile(map, content, story ? 'story' : 'standard');
  return runConfig(content, map, map.builds.parBuild, profile, 1);
}

/** A bare report for the monotonic check (#3 reads par's margins). */
function report(mapId: string, marginPct: number): MapReport {
  const map = content.maps[mapId]!;
  const run: RunRecord = {
    build: 'par',
    seed: 1,
    repeat: false,
    error: null,
    result: null,
    marginPct,
    ms: 0,
  };
  return {
    mapId,
    act: map.act,
    objective: map.objective,
    band: null,
    ok: true,
    checks: [],
    runs: [run],
    notChecked: [],
    ms: 0,
  };
}

describe('challenge maps (T862)', () => {
  it('the harness runs them after the campaign, and --map finds each', () => {
    expect(challengeMapIds(content)).toEqual(CHALLENGES);
    const all = campaignMapIds(content);
    expect(all.slice(-3)).toEqual(CHALLENGES);
    expect(all.slice(0, content.campaign.length)).toEqual(content.campaign);
    expect(all).not.toContain('end_m01');
    for (const id of CHALLENGES) expect(campaignMapIds(content, id)).toEqual([id]);
  });

  it('they stand outside the monotonic chain (#3)', () => {
    const reports = [report('a3_m06', 55), report('ch_m01', 90), report('ch_m02', 90)];
    monotonicCheck(content, reports);
    expect(reports[1]!.checks).toEqual([]);
    expect(reports[2]!.checks).toEqual([]);
  });

  it('each map is a challenge: no Stardust, its medal, its rules, never a campaign map', () => {
    for (const id of CHALLENGES) {
      const map = content.maps[id]!;
      expect(map.act).toBe('challenge');
      expect(map.stardust).toBe(0);
      expect(map.medals).not.toBeNull();
      expect(map.challenge?.rules.length).toBeGreaterThan(0);
      expect(content.campaign).not.toContain(id);
    }
  });

  it("Glass Core and Radio Silence are the veteran grants under the challenge's source", () => {
    const cfg = createSim(parConfig('ch_m03')).config;
    const source = 'challenge:ch_m03';
    const grants = (['glass_core', 'radio_silence'] as const).map(veteranGrants);
    expect(cfg.modifiers.filter((m) => m.source === source)).toEqual(
      grants.flatMap((g) => g.modifiers).map((m) => ({ ...m, source })),
    );
    expect((cfg.rules ?? []).filter((r) => r.source === source)).toEqual(
      grants.flatMap((g) => g.rules).map((r) => ({ ...r, source })),
    );
    // No veteran bonus, no Veteran medal: the run carries no `veteran:` source.
    expect(veteranModsOf(cfg)).toEqual([]);
  });

  it('Skitterkin Only keeps the warrens’ towers and leaves the rest home', () => {
    const par = parConfig('ch_m01');
    const sim = createSim({ ...par, loadout: ['rivet', 'gloop', 'zapcoil', 'sproing'] });
    expect(sim.config.loadout).toEqual(['gloop', 'sproing']);
    for (const t of createSim(par).config.loadout) {
      expect(content.towers[t]!.faction).toBe('skitterkin');
    }
  });

  it('Lights Out cloaks every unit it spawns', () => {
    const sim = createSim(parConfig('ch_m02'));
    sim.enqueue({ type: 'callWave' });
    let seen = 0;
    for (let i = 0; i < 1800; i++) {
      sim.step();
      for (const e of sim.state.enemies.items) {
        if (!e.alive || e.def === null) continue;
        seen++;
        expect(e.def.cloaked).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('Glass Core and Radio Silence hold on Story too', () => {
    for (const story of [false, true]) {
      const sim = createSim(parConfig('ch_m03', story));
      // 5, and the reference's two Reinforced Core ranks.
      expect(sim.state.maxIntegrity).toBe(7);
      expect(sim.config.abilities.slot1).toBeNull();
      expect(radioSilent(sim.config)).toBe(true);
    }
  });

  it('the challenge config is idempotent (a retry rebuilds the same run)', () => {
    for (const id of CHALLENGES) {
      const once = challengeConfig(parConfig(id));
      expect(challengeConfig(once)).toBe(once);
    }
  });
});
