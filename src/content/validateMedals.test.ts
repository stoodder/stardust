// Medal and condition validation (validateMedals.ts): the fixture's Challenge is valid, and each
// rule has a fixture that breaks it. Every case goes through compileContent().
import { describe, expect, it } from 'vitest';
import { FIXTURE, fxMap } from './__fixtures__/content.ts';
import { compileContent } from './compile.ts';
import { mapDefinersFor } from './define.ts';
import type { ChallengeMedalDef, ConditionDef, IdSpace, MapDef, RawContent } from './types.ts';
import { CHALLENGE_PENDING } from './validateMedals.ts';

const loose = mapDefinersFor<IdSpace>();
const BASE: RawContent<IdSpace> = FIXTURE;
const CHALLENGE: ChallengeMedalDef<IdSpace> = fxMap.medals!.challenge;

function withMap(patch: Partial<MapDef<IdSpace>>): RawContent<IdSpace> {
  return { ...BASE, maps: { fx_map: loose.defineMap({ ...fxMap, ...patch }) } };
}
/** fx_map without a Challenge, patched; `campaign: false` takes it off the campaign. */
function withoutChallenge(
  patch: Partial<MapDef<IdSpace>> = {},
  campaign = true,
): RawContent<IdSpace> {
  const { medals: _, ...rest } = fxMap;
  const maps = { fx_map: loose.defineMap({ ...rest, ...patch }) };
  return { ...BASE, maps, campaign: campaign ? BASE.campaign : [] };
}
const event = (when: ConditionDef<IdSpace>): RawContent<IdSpace> =>
  withMap({ events: [{ id: 'e', on: { tick: 1 }, when, actions: [{ grantCredits: 1 }] }] });
function withChallenge(patch: Partial<ChallengeMedalDef<IdSpace>>): RawContent<IdSpace> {
  return withMap({ medals: { challenge: { ...CHALLENGE, ...patch } } });
}
function withCondition(condition: ConditionDef<IdSpace>): RawContent<IdSpace> {
  return withChallenge({ condition });
}
function rejects(raw: RawContent<IdSpace>, rule: string, message?: RegExp): void {
  expect(() => compileContent(raw)).toThrow(new RegExp(`\\[${rule}\\] `));
  if (message !== undefined) expect(() => compileContent(raw)).toThrow(message);
}
function accepts(raw: RawContent<IdSpace>): void {
  expect(() => compileContent(raw)).not.toThrow();
}

describe('[medals]', () => {
  it('the fixture Challenge is valid', () => accepts(BASE));

  it('a campaign map without a Challenge (unless pending), but not a map off the campaign', () => {
    rejects(withoutChallenge(), 'medals', /needs a Challenge medal/);
    accepts(withoutChallenge({}, false));
    expect(CHALLENGE_PENDING).toEqual({}); // A1M1's Teamwork landed with T125
  });

  it('a Challenge id that is not snake_case, or a built-in id', () => {
    rejects(withChallenge({ id: 'Gun-Show' }), 'medals', /snake_case/);
    for (const id of ['victory', 'perfect_core', 'challenge']) {
      rejects(withChallenge({ id }), 'medals', /built-in medal id/);
    }
  });

  it('an empty or overlong name or description', () => {
    rejects(withChallenge({ name: ' ' }), 'medals', /name: must be 1–40/);
    rejects(
      withChallenge({ description: 'x'.repeat(101) }),
      'medals',
      /description: must be 1–100/,
    );
  });

  it('a Challenge that references medal-exempt units', () => {
    rejects(
      withCondition({ not: { tagRatio: { tag: 'fleeing', of: 'leaked', gte: 0.5 } } }),
      'medals',
      /medal-exempt units \(tagRatio\)/,
    );
    // fx_runner only walks in W2's fleeing group.
    const markers = { rock: [0, 2], post: [1, 2] } as const;
    const raw = withMap({
      markers,
      medals: {
        challenge: {
          ...CHALLENGE,
          condition: { not: { passedMarker: { marker: 'post', enemy: 'fx_runner' } } },
        },
      },
    });
    rejects(raw, 'medals', /'fx_runner' never appears outside medal-exempt groups/);
    accepts(
      withMap({
        markers,
        medals: {
          challenge: {
            ...CHALLENGE,
            condition: { not: { passedMarker: { marker: 'post', enemy: 'fx_walker' } } },
          },
        },
      }),
    );
  });

  it('a Challenge that reads a flag without a flagVariants entry', () => {
    rejects(withCondition({ flag: 'door_choice', eq: 'warren' }), 'flag-variants', /door_choice/);
    accepts(
      withMap({
        flagVariants: { door_choice: ['convoy', 'warren'] },
        medals: { challenge: { ...CHALLENGE, condition: { flag: 'door_choice', eq: 'warren' } } },
      }),
    );
  });

  it('parMedals with a repeat, or a challenge the map lacks', () => {
    rejects(withMap({ parMedals: ['victory', 'victory'] }), 'medals', /listed twice/);
    rejects(
      withoutChallenge({ parMedals: ['challenge'] }, false),
      'medals',
      /needs a Challenge medal on the map/,
    );
    accepts(withMap({ parMedals: ['victory', 'perfectCore', 'challenge'] }));
  });
});

describe('[condition]', () => {
  it('stat and towers need a whole-number bound, gte ≤ lte', () => {
    rejects(withCondition({ stat: 'towersBuilt' }), 'condition', /needs a bound/);
    rejects(
      withCondition({ towers: {}, gte: 1.5 }),
      'condition',
      /gte: 1.5 must be a whole number/,
    );
    rejects(withCondition({ stat: 'abilityUses', gte: 3, lte: 2 }), 'condition', /can never hold/);
  });

  it('tagRatio.gte in (0, 1]; all/any non-empty', () => {
    rejects(
      event({ tagRatio: { tag: 'quiet_wave', of: 'leaked', gte: 0 } }),
      'condition',
      /\(0, 1\]/,
    );
    rejects(event({ all: [] }), 'condition', /'all' needs at least one/);
    rejects(withCondition({ any: [] }), 'condition', /'any' needs at least one/);
  });

  it('passedMarker names a marker within reach of a route its units walk', () => {
    rejects(
      withCondition({ not: { passedMarker: { marker: 'nowhere' } } }),
      'condition',
      /unknown marker/,
    );
    // The rock at (0,2) is 2 tiles from the road's nearest point (2,2).
    rejects(
      withCondition({ not: { passedMarker: { marker: 'rock' } } }),
      'condition',
      /more than 1.5 tiles/,
    );
    accepts(
      withMap({
        markers: { rock: [0, 2], post: [1, 2] },
        medals: {
          challenge: { ...CHALLENGE, condition: { not: { passedMarker: { marker: 'post' } } } },
        },
      }),
    );
  });
});
