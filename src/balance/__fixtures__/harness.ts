// Test helpers for the balance harness: the sim fixture's content without fleeing tags (which
// the harness refuses until T206), and synthetic run records for judging checks without a sim.
import type { CompiledContent } from '../../content/compiled.ts';
import { FIXTURE_CONTENT, type FixtureIds } from '../../sim/__fixtures__/sim.ts';
import type { HeadlessResult } from '../../sim/index.ts';
import type { RunRecord, RunRequest } from '../checks.ts';

const fxMap = FIXTURE_CONTENT.maps.fx_map;

/** The fixture content with every wave tag removed, so no feature is refused. */
export const PLAIN_CONTENT: CompiledContent<FixtureIds> = {
  ...FIXTURE_CONTENT,
  maps: {
    fx_map: {
      ...fxMap,
      waves: fxMap.waves.map((w) =>
        Object.assign({}, w, { groups: w.groups.map((g) => Object.assign({}, g, { tags: [] })) }),
      ),
    },
  },
};

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
