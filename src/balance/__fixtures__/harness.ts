// Test helpers for the balance harness: the sim fixture's content without wave tags (so a run
// plans only the core checks, not #16's free-choice runs), a pick-list variant (#15), a meta
// catalog for the fixture content and a map with a no-counter build (#5, #6), and synthetic run
// records for judging checks without a sim.
import type { CompiledContent } from '../../content/compiled.ts';
import { compileContent } from '../../content/compile.ts';
import { FIXTURE_CONTENT, SIM_FIXTURE, type FixtureIds } from '../../sim/__fixtures__/sim.ts';
import { PROTOCOLS, UPGRADES } from '../../content/upgrades/index.ts';
import { defineUpgrade, sameEachRank } from '../../content/upgrades/define.ts';
import type { MetaCatalog } from '../../meta/index.ts';
import type { HeadlessResult } from '../../sim/index.ts';
import { marginOf, type RunRecord, type RunRequest } from '../checks.ts';

/** `content` with every wave tag removed from fx_map (no #16 runs). */
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

/** The fixture content with every wave tag removed (no #16 runs). */
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
    asset: 0,
    maxAsset: 0,
    objective: 'defend',
    escortTotal: 0,
    voices: 0,
    choirSize: 0,
    choirBase: 0,
    phaseStartTick: [0],
    restored: [],
    maxLost: null,
    credits: 0,
    lostAtWave,
    forcedInputs: [],
    revoked: { towers: [], abilities: [] },
    // A draw, so the judge never reuses a fake seed's run for another (`reuseSeed`; D157).
    seedDraws: {
      waves: 0,
      triggers: 0,
      status: 0,
      abilities: 0,
      movement: 0,
      towers: 0,
      allies: 0,
      projectiles: 1,
    },
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
      markersPassed: {},
      neutralHits: 0,
      wreckageCleared: 0,
      lateSells: 0,
      bossBlinks: 0,
      heavyLeaks: 0,
      leaksByFaction: { skitterkin: 0, aelari: 0, everglow: 0, hollow: 0 },
      leaksByEnemy: {},
      leaksByWave: [],
      pivotWave: 0,
      refugeesSpawned: 0,
      evacuated: 0,
      refugeesLost: 0,
      lostByGroup: [],
      refugeesGathered: 0,
      revocations: 0,
      jammedPeak: 0,
      jamOverLimitTicks: 0,
      jammedTowerTicks: 0,
      towerTicks: 0,
      takeoverJamTicks: 0,
      bearersHome: 0,
      restedKills: 0,
      scatteredKills: 0,
      voicesMin: 0,
      boreProgress: 0,
    },
    waves: [],
    towers: [],
    abilityKills: 0,
    allyKills: 0,
    violations: [],
    ticks: 1000,
    hash: '0000000000000000',
    steps: [],
    waveCalls: [],
    commandCount: 0,
    medals: {
      victory: outcome === 'won' ? 'earned' : 'forfeited',
      perfectCore: outcome === 'won' && integrity === 20 ? 'earned' : 'forfeited',
      challenge: 'open',
    },
    objectives: [],
    hushes: 0,
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
    marginPct: marginOf(result),
    ms: 1,
  };
}

/** A fixture tune-up for every tower: +10% damage per rank, 3 ranks. */
const fx_power = defineUpgrade({
  id: 'fx_power',
  name: 'Fixture Power',
  copy: null,
  kind: 'shop',
  currency: 'stardust',
  availableAfter: null,
  ranks: sameEachRank([1, 1, 1], [{ kind: 'towerStat', tower: '*', stat: 'damage', pct: 0.1 }]),
});

/**
 * A meta catalog the fixture content can take (the live one names Rivet and Orbital Strike):
 * fx_power, the live id-free global upgrades (Salvage Rights among them, which the sim refuses
 * until M3), the protocol slots, and the three protocols the full-catalog profile equips.
 */
export const FIXTURE_CATALOG: MetaCatalog = {
  upgrades: {
    fx_power,
    reinforced_core: UPGRADES.reinforced_core,
    seed_money: UPGRADES.seed_money,
    salvage_rights: UPGRADES.salvage_rights,
    protocol_slots: UPGRADES.protocol_slots,
  },
  protocols: {
    head_start: PROTOCOLS.head_start,
    emergency_bulkhead: PROTOCOLS.emergency_bulkhead,
    linked_up: PROTOCOLS.linked_up,
  },
};

/**
 * The plain fixture with a swarm wave (40 walkers) as W2 and a splash counter required, with a
 * no-counter build (no mortar: one gun by the road, upgraded once) that loses in W2 on the
 * reference profile, and still loses with the full catalog.
 */
export const NO_SPLASH_CONTENT: CompiledContent<FixtureIds> = (() => {
  const compiled = withoutTags(
    compileContent<FixtureIds>({
      ...SIM_FIXTURE,
      maps: {
        fx_map: {
          ...rawMap,
          waves: [
            rawMap.waves[0]!,
            {
              countdownSec: 10,
              groups: [{ enemy: 'fx_walker', count: 40, intervalSec: 0.25, route: 'a' }],
            },
            ...rawMap.waves.slice(1),
          ],
        },
      },
    }),
  );
  const map = compiled.maps.fx_map;
  return {
    ...compiled,
    maps: {
      fx_map: {
        ...map,
        requiredCounters: ['splash'],
        builds: {
          ...map.builds,
          noCounterBuilds: {
            splash: {
              loadout: ['fx_gun'],
              companion: null,
              technicianAbility: null,
              callEarly: false,
              steps: [
                { wave: 1, kind: 'build', tower: 'fx_gun', tile: [1, 1] },
                { wave: 1, kind: 'upgrade', tile: [1, 1] },
              ],
            },
          },
        },
      },
    },
  };
})();
