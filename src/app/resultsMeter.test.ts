// Act III's meter line on Results (T612; core-loop.md § 6.2): the run's meter (`RunResult.meter`)
// is an Escort's or a Holdout's Evacuated count and nothing on a Defend map, whose card then shows
// no counter line ("Held." is only the Holdout card's headline). The results fixture gives an
// Escort or Holdout map its meter, so Act III's cards read as played ones do.
import { describe, expect, it } from 'vitest';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { resultsCounter } from '../story/counter.ts';
import { heldCard } from '../ui/screens/heldCard.ts';
import { fixtureResult } from './resultsFixture.ts';
import { meterOf, offeredMedals, runResultOf, type RunEndInput } from './runResult.ts';

const DEFEND: RunEndInput = {
  mapId: 'a3_m02',
  act: 3,
  waveCount: 15,
  maxIntegrity: 20,
  integrity: 17,
  skitterkinKilled: 0,
  wavesCleared: 15,
  firstLeakAgo: null,
  stardust: 0,
  medals: offeredMedals({ medals: null }),
  earnedMedals: [],
};

const ESCORT = {
  kind: 'evacuated',
  label: 'Evacuated',
  evacuated: 22,
  total: 30,
  lost: 8,
} as const;

describe('RunResult.meter', () => {
  it("is an Escort's or a Holdout's Evacuated count, and null on a Defend map", () => {
    expect(meterOf({})).toBeNull();
    expect(meterOf({ escort: ESCORT })).toEqual({ kind: 'evacuated', n: 22 });
    expect(meterOf({ escort: { ...ESCORT, kind: 'sheltered', label: 'Sheltered' } })).toEqual({
      kind: 'sheltered',
      n: 22,
    });
    const defend = runResultOf(DEFEND, 'won');
    expect(defend).toMatchObject({ counter: 'meter', meter: null, escort: null });
    expect(resultsCounter(defend.counter, 0, 0, defend.meter)).toBeNull();
    const escort = runResultOf({ ...DEFEND, mapId: 'a3_m01', escort: ESCORT }, 'lost');
    expect(escort.meter).toEqual({ kind: 'evacuated', n: 22 });
    expect(resultsCounter(escort.counter, 0, 0, escort.meter)?.line).toBe('Evacuated: 22.');
  });
});

describe('the results fixture in Act III', () => {
  it('A3M1 (an Escort) reads its Evacuated count; on a loss, half the run made it', () => {
    const save = DEV_SAVES.after_a3m1_spared.build();
    // Thrum's group walks under `spared`: 30 refugees.
    const won = fixtureResult({ map: 'a3_m01', outcome: 'won' }, save);
    expect(won.escort).toMatchObject({ evacuated: 30, total: 30, lost: 0 });
    expect(won.meter).toEqual({ kind: 'evacuated', n: 30 });
    expect(won.escort?.holdout).toBeUndefined();
    const lost = fixtureResult({ map: 'a3_m01', outcome: 'lost' }, save);
    expect(lost.escort).toMatchObject({ evacuated: 15, total: 30, lost: 15 });
    const told = fixtureResult({ map: 'a3_m01', outcome: 'won', escort: { evacuated: 25 } }, save);
    expect(told.escort).toMatchObject({ evacuated: 25, lost: 5 });
    // Under `cleared` Thrum's group is never on the road: 24.
    const cleared = fixtureResult(
      { map: 'a3_m01', outcome: 'won' },
      DEV_SAVES.after_a3m1_cleared.build(),
    );
    expect(cleared.escort?.total).toBe(24);
  });

  it('A3M2 (a Defend map) has no meter: no counter line, never "Held."', () => {
    const r = fixtureResult(
      { map: 'a3_m02', outcome: 'won' },
      DEV_SAVES.after_a3m1_cleared.build(),
    );
    expect(r.escort).toBeNull();
    expect(r.meter).toBeNull();
    expect(resultsCounter(r.counter, r.pestsProcessed, 0, r.meter)).toBeNull();
    expect(heldCard(r)).toBeNull();
  });

  it("A3M3 (the Holdout) ends on the Held card, its door's refugees counted", () => {
    const r = fixtureResult({ map: 'a3_m03', outcome: 'won' }, DEV_SAVES.after_a3m2_rivet.build());
    expect(r.escort).toMatchObject({ holdout: true, kind: 'evacuated' });
    expect(r.escort?.total).toBeGreaterThan(0);
    expect(heldCard(r)).toEqual({ headline: 'Held.', line: `Evacuated: ${r.escort!.total}.` });
  });

  it('an Act I or Act II map has no meter (its counter is Pests Processed)', () => {
    const r = fixtureResult({ map: 'a2_m06', outcome: 'won' }, DEV_SAVES.after_a2m5.build());
    expect(r.meter).toBeNull();
    expect(resultsCounter(r.counter, 3, 3, r.meter)?.line).toBe('Pests processed: 3.');
  });
});
