// A fixture map for harness assertion #16 (free choices stay free; T206a): the sim fixture's
// fx_map (W2 has 4 fleeing runners) plus a W3 Quiet Wave shaped like A1M5's: one `quiet_wave`
// walker (Old Thrum, leak 1) leading four `quiet_wave` + `youngling` walkers (leak 0, half
// speed, bounty 0). No live map has fleeing or quiet-wave groups yet.
//
// FLAG_VARIANT_CONTENT is the same map with a script that reads a story flag (assertion #14,
// T206b): under `spared_quiet_wave = true` it grants 20 credits at W3's countdown, and its
// flagVariants entry runs par under true and false.
import type { CompiledContent } from '../../content/compiled.ts';
import { compileContent } from '../../content/compile.ts';
import type { MapDef } from '../../content/types.ts';
import { SIM_FIXTURE, type FixtureIds } from '../../sim/__fixtures__/sim.ts';

const rawMap = SIM_FIXTURE.maps.fx_map;

const quietMap: MapDef<FixtureIds, 'fx_map'> = {
  ...rawMap,
  waves: [
    ...rawMap.waves,
    {
      countdownSec: 10,
      groups: [
        { enemy: 'fx_walker', count: 1, route: 'a', tags: ['quiet_wave'] },
        {
          enemy: 'fx_walker',
          count: 4,
          intervalSec: 0.8,
          delaySec: 0.6,
          route: 'a',
          tags: ['quiet_wave', 'youngling'],
        },
      ],
    },
  ],
};

export const QUIET_WAVE_CONTENT: CompiledContent<FixtureIds> = compileContent<FixtureIds>({
  ...SIM_FIXTURE,
  maps: { fx_map: quietMap },
});

/** The `thank_you` event's grant under `spared_quiet_wave = true`. */
export const THANK_YOU_CREDITS = 20;

export const FLAG_VARIANT_CONTENT: CompiledContent<FixtureIds> = compileContent<FixtureIds>({
  ...SIM_FIXTURE,
  maps: {
    fx_map: {
      ...quietMap,
      events: [
        ...(quietMap.events ?? []),
        {
          id: 'thank_you',
          on: { wave: 3, phase: 'countdown' },
          when: { flag: 'spared_quiet_wave', eq: true },
          actions: [{ grantCredits: THANK_YOU_CREDITS }],
        },
      ],
      flagVariants: { spared_quiet_wave: [true, false] },
    },
  },
});
