// The harness's finale rows (T800a; D154): a Choir map's Voices margins (#2) are measured since
// T804 (tools/devVoices.test.ts); the song's Phase 2 timing per `quill_choice`
// (#18, balance/songChecks.ts) since T821.
import { describe, expect, it } from 'vitest';
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { FIXTURE_CONTENT } from '../sim/__fixtures__/sim.ts';
import { HARNESS_GATES, refusedFeatures } from './refusals.ts';

const MAP: CompiledMapDef<IdSpace> = FIXTURE_CONTENT.maps.fx_map;

describe('HARNESS_GATES (the finale)', () => {
  it('name the task that lifts each finale row', () => {
    expect(HARNESS_GATES).toMatchObject({ choir: null, songTiming: null });
  });

  it('refuse nothing on a choir map with a song: #2 Voices (T804) and #18 (T821) both run', () => {
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
    expect(refusedFeatures(map)).toEqual([]);
  });
});
