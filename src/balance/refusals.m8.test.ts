// The harness's finale rows (T800a; D154): a Choir map's Voices margins (#2) are measured since
// T804 (tools/devVoices.test.ts); the song's Phase 2 timing per `quill_choice`
// (#18) waits for T821, refusing loudly, naming its task.
import { describe, expect, it } from 'vitest';
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { FIXTURE_CONTENT } from '../sim/__fixtures__/sim.ts';
import { fakeResult, fakeRun } from './__fixtures__/harness.ts';
import { HARNESS_GATES, refusedFeatures } from './refusals.ts';

const MAP: CompiledMapDef<IdSpace> = FIXTURE_CONTENT.maps.fx_map;

describe('HARNESS_GATES (the finale)', () => {
  it('name the task that lifts each finale row', () => {
    expect(HARNESS_GATES).toMatchObject({ choir: null, songTiming: 'T821' });
  });

  it('refuse a choir map with a song: #18 song timing (T821); #2 Voices runs (T804)', () => {
    const map: CompiledMapDef<IdSpace> = {
      ...MAP,
      objective: 'choir',
      song: {
        baseRadius: 2.5,
        silentPct: 0.6,
        restTarget: 40,
        restPerTick: 0.01,
        restPerBossHp: 0,
        multipliers: [],
        scatter: { reformTicks: 240, hpPct: 0.5 },
      },
    };
    const refused = refusedFeatures(map);
    expect(refused.map((c) => c.id)).toEqual(['18']);
    const failures = refused.map(
      (c) => c.evaluate(() => fakeRun({ build: 'par', seed: 1 }, fakeResult('won', 20))).failures,
    );
    expect(failures).toEqual([["Phase 2's length is checked per quill_choice (T821)"]]);
  });
});
