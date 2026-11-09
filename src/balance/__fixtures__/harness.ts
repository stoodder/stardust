// Test helpers for the balance harness: the sim fixture's content without fleeing tags (which
// the harness refuses until T206), a pick-list variant (#15), and synthetic run records for
// judging checks without a sim.
import type { CompiledContent } from '../../content/compiled.ts';
import { compileContent } from '../../content/compile.ts';
import { FIXTURE_CONTENT, SIM_FIXTURE, type FixtureIds } from '../../sim/__fixtures__/sim.ts';
import type { HeadlessResult } from '../../sim/index.ts';
import type { RunRecord, RunRequest } from '../checks.ts';

/** `content` with every wave tag removed from fx_map, so no feature is refused. */
function withoutTags(content: CompiledContent<FixtureIds>): CompiledContent<FixtureIds> {
  const map = content.maps.fx_map;
  return {
    ...content,
    maps: {
      fx_map: {
        ...map,
        waves: map.waves.map((w) =>
          Object.assign({}, w, { groups: w.groups.map((g) => Object.assign({}, g, { tags: [] })) }),
        ),
      },
    },
  };
}

/** The fixture content with every wave tag removed, so no feature is refused. */
export const PLAIN_CONTENT: CompiledContent<FixtureIds> = withoutTags(FIXTURE_CONTENT);

const rawMap = SIM_FIXTURE.maps.fx_map;
const rawPar = rawMap.parBuild;

/**
 * The plain fixture as a pick-list map (the finale's shape, harness check #15): Bricks (the
 * default, fx_suppress) or QUILL (fx_chime), and a par build that casts slot 2 in W1.
 */
export const PICK_CONTENT: CompiledContent<FixtureIds> = withoutTags(
  compileContent<FixtureIds>({
    ...SIM_FIXTURE,
    maps: {
      fx_map: {
        ...rawMap,
        companion: { pick: ['bricks', 'quill'] },
        parBuild: {
          ...rawPar,
          steps: [
            ...rawPar.steps.slice(0, 2),
            { wave: 1, ability: 2, target: [2, 1], when: { afterSec: 1 } },
            ...rawPar.steps.slice(2),
          ],
        },
      },
    },
  }),
);

/** A headless result with just the fields the checks read. */
export function fakeResult(
  outcome: HeadlessResult['outcome'],
  integrity: number,
  lostAtWave: number | null = null,
): HeadlessResult {
  return {
    outcome,
    integrity,
    maxIntegrity: 20,
    credits: 0,
    lostAtWave,
    stats: {
      skitterkinKilled: 0,
      killsByEnemy: {},
      integrityLost: 20 - integrity,
      towersBuilt: 0,
      creditsSpent: 0,
      creditsRefunded: 0,
      creditsEarned: 0,
      abilityUses: 0,
      holdFireTicks: 0,
      holdFireUses: 0,
      ticksSinceFiredAtSkitterkin: 0,
      tagSpawned: { quiet_wave: 0, youngling: 0, fleeing: 0, medal_exempt: 0 },
      tagLeaked: { quiet_wave: 0, youngling: 0, fleeing: 0, medal_exempt: 0 },
      tagKilled: { quiet_wave: 0, youngling: 0, fleeing: 0, medal_exempt: 0 },
      medalExemptLeaks: 0,
      linkTicks: {},
    },
    waves: [],
    towers: [],
    abilityKills: 0,
    violations: [],
    ticks: 1000,
    hash: '0000000000000000',
    steps: [],
    waveCalls: [],
    commandCount: 0,
  };
}

/** A run record for `req` with a fake result. */
export function fakeRun(req: RunRequest, result: HeadlessResult): RunRecord {
  return {
    build: req.build,
    seed: req.seed,
    repeat: req.repeat === true,
    error: null,
    result,
    marginPct: (100 * result.integrity) / result.maxIntegrity,
    ms: 1,
  };
}
