// The harness's no-counter premise check uses the content validator's answer model.
import { describe, expect, it } from 'vitest';
import type { CompiledBuild, CompiledBuildStep } from '../content/compiled.ts';
import { COUNTER_ANSWERS } from '../content/rules.ts';
import type { FixtureIds } from '../sim/__fixtures__/sim.ts';
import { PLAIN_CONTENT } from './__fixtures__/harness.ts';
import { compiledAnswersCarried, noCounterAnswerChecks, noCounterChecks } from './counterChecks.ts';
import { runMap } from './harness.ts';

const map = PLAIN_CONTENT.maps.fx_map;
const ANSWERS = {
  ...COUNTER_ANSWERS,
  splash: {
    towers: [
      { tower: 'fx_gun', minTier: 3 },
      { tower: 'fx_mortar', spec: 'b' as const },
    ],
    abilities: ['fx_strike'],
  },
};
const steps = (...extra: CompiledBuildStep<FixtureIds>[]): CompiledBuild<FixtureIds> => ({
  loadout: ['fx_gun'],
  companion: null,
  technicianAbility: 'fx_strike',
  callEarly: false,
  steps: [
    { wave: 1, kind: 'build', tower: 'fx_gun', tile: [1, 1] },
    { wave: 1, kind: 'upgrade', tile: [1, 1] },
    ...extra,
  ],
});
const withNoSplash = (b: CompiledBuild<FixtureIds>) => ({
  ...map,
  builds: { ...map.builds, noCounterBuilds: { splash: b } },
});

/** The premise check needs no runs. */
const noRuns = (): never => {
  throw new Error('no runs expected');
};

describe('noCounterAnswerChecks', () => {
  it('judges the tiers a build reaches and the abilities it casts', () => {
    const t2 = steps();
    expect(compiledAnswersCarried(map, PLAIN_CONTENT, t2, 'splash', ANSWERS)).toEqual([]);
    const t3 = steps({ wave: 2, kind: 'upgrade', tile: [1, 1] });
    expect(compiledAnswersCarried(map, PLAIN_CONTENT, t3, 'splash', ANSWERS)).toEqual([
      'fx_gun T3',
    ]);
    const cast = steps({ wave: 2, kind: 'ability', slot: 1, target: [2, 2], when: 'asap' });
    expect(compiledAnswersCarried(map, PLAIN_CONTENT, cast, 'splash', ANSWERS)).toEqual([
      'fx_strike',
    ]);
  });

  it('adds one #5 premise check per no-counter build', () => {
    const [ok] = noCounterAnswerChecks(withNoSplash(steps()), PLAIN_CONTENT, ANSWERS);
    expect(ok?.id).toBe('5');
    expect(ok?.subject).toBe('noCounter:splash');
    expect(ok?.needs).toEqual([]);
    expect(ok?.evaluate(noRuns).ok).toBe(true);
    const t3 = withNoSplash(steps({ wave: 2, kind: 'upgrade', tile: [1, 1] }));
    const [bad] = noCounterAnswerChecks(t3, PLAIN_CONTENT, ANSWERS);
    const out = bad?.evaluate(noRuns);
    expect(out?.ok).toBe(false);
    expect(out?.summary).toBe('reaches fx_gun T3');
    expect(noCounterAnswerChecks(map, PLAIN_CONTENT)).toEqual([]);
  });

  it('runs inside runMap with the other no-counter checks', () => {
    const content = { ...PLAIN_CONTENT, maps: { fx_map: withNoSplash(steps()) } };
    const r = runMap(content, 'fx_map', { seeds: 1, build: 'noCounter:splash' });
    const premise = r.checks.find((c) => c.title === 'noCounter:splash carries no splash answer');
    expect(premise?.ok).toBe(true);
  });
});

const withNoJam = (teachMap: boolean) => ({
  ...map,
  builds: { ...map.builds, teachMap, noCounterBuilds: { jam: steps() } },
});
const checkIds = (m: typeof map) => noCounterChecks(m, [1], []).map((c) => `#${c.id} ${c.subject}`);

describe('#6 on the jam teach map (D146 addendum, T720)', () => {
  it("skips jam's full-catalog check on the map that teaches jam, and only there", () => {
    expect(checkIds(withNoJam(true))).toEqual(['#5 noCounter:jam']);
    expect(checkIds(withNoJam(false))).toEqual(['#5 noCounter:jam', '#6 noCounter:jam']);
    // Any other category keeps #6 on a teach map.
    const noSplash = {
      ...withNoSplash(steps()),
      builds: { ...withNoSplash(steps()).builds, teachMap: true },
    };
    expect(checkIds(noSplash)).toEqual(['#5 noCounter:splash', '#6 noCounter:splash']);
  });
});

describe('counter exemptions (BuildsDef.counterExemptions; D146 addenda, T721, T722)', () => {
  it('skips #5 and #6 for an exempt counter only, the premise check still held', () => {
    const exempt = (counter: 'jam' | 'detection') => ({
      ...map,
      builds: {
        ...map.builds,
        noCounterBuilds: { [counter]: steps(), splash: steps() },
        counterExemptions: [{ counter, reason: 'pinned by the map tests' }],
      },
    });
    for (const counter of ['jam', 'detection'] as const) {
      expect(checkIds(exempt(counter)), counter).toEqual([
        '#5 noCounter:splash',
        '#6 noCounter:splash',
      ]);
    }
  });
});
