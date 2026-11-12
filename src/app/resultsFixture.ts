// The results fixture (`__sd.results`, `?test=1` only; T316): a finished run built from a few
// facts instead of played, so the smoke flows and agents can see any map's Results and its flow
// (A1M5's party → card → stinger, its CONTAINMENT LAPSE stamp; A2M4's C2 offer) without playing
// ten waves. It reads the save in play but never writes it: the payroll is what the run *would*
// pay, and a story choice taken on its card changes nothing (unless `commitChoice`, which writes
// that choice as a real card does; the run is still never filed).
import { SCENES, type Scene } from '../content/dialogue/index.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import type { MapId, WaveTag } from '../content/types.ts';
import { runEnd, type SaveData } from '../meta/index.ts';
import type { FlagRuleStats } from '../story/flags.ts';
import { DEV_SCENES } from '../ui/dialogue/dev.ts';
import type { RunAsset, RunBearers, RunEscort, RunResult } from '../ui/screens/state.ts';
import { bearerTotal, choirSize, createSim, escortTotal } from '../sim/index.ts';
import { battleConfig } from './battleSetup.ts';
import { meterLabelText } from './hudText.ts';
import type { ResultsScenes } from './router.ts';
import { withResultsChoice } from './resultsFlow.ts';
import { flowScenes } from './runFlow.ts';
import {
  debriefStoryOf,
  metaRunEndOf,
  offeredMedals,
  runResultOf,
  type RunEndInput,
} from './runResult.ts';
import { revokedAtEnd } from './storyMeta.ts';
import type { ResultsFixture } from './testHookTypes.ts';

const NO_TAGS: Readonly<Record<WaveTag, number>> = {
  quiet_wave: 0,
  youngling: 0,
  fleeing: 0,
  medal_exempt: 0,
};

/**
 * The run's stats: nothing counted, but the Quiet Wave's spawns and leaks (C1). Its spawns are Old
 * Thrum and younglings for the rest; a leak counts Thrum first, so `leaked` > 0 means she lived.
 */
function statsOf(f: ResultsFixture): FlagRuleStats {
  const quiet = f.quietWave ?? { spawned: 0, leaked: 0 };
  const young = Math.max(0, quiet.spawned - 1);
  const youngLeaked = Math.min(young, Math.max(0, quiet.leaked - 1));
  return {
    holdFireUses: 0,
    holdFireTicks: 0,
    integrityLost: 0,
    towersBuilt: 0,
    creditsSpent: 0,
    abilityUses: 0,
    tagSpawned: { ...NO_TAGS, quiet_wave: quiet.spawned, youngling: young },
    tagLeaked: { ...NO_TAGS, quiet_wave: quiet.leaked, youngling: youngLeaked },
    tagKilled: {
      ...NO_TAGS,
      quiet_wave: quiet.spawned - quiet.leaked,
      youngling: young - youngLeaked,
    },
  };
}

function isMapId(id: string): id is MapId {
  return Object.hasOwn(RAW_CONTENT.maps, id);
}

/**
 * The fixture's Escort meter on a map that is an Escort or a Holdout from the start (A3M1, A3M3;
 * T612): its refugees under the save's story flags (`escortTotal`, as the battle counts them),
 * every one through on a win and half of them on a loss, unless `f.escort` says. None elsewhere
 * (a pivot like A2M5's isn't played, so its card stays a Defend's).
 */
function escortOf(f: ResultsFixture, save: SaveData | null): { escort?: RunEscort } {
  const config = battleConfig(f.map, 0, save);
  const map = config.content.maps[f.map];
  if (map === undefined || (map.objective !== 'escort' && map.objective !== 'holdout')) return {};
  const total = escortTotal(map, config.scriptFlags);
  const evacuated = f.escort?.evacuated ?? (f.outcome === 'won' ? total : Math.floor(total / 2));
  const kind = map.meterLabel === 'sheltered' ? 'sheltered' : 'evacuated';
  return {
    escort: {
      kind,
      label: meterLabelText(kind),
      evacuated,
      total,
      lost: f.escort?.lost ?? total - evacuated,
      ...(map.objective === 'holdout' ? { holdout: true } : {}),
    },
  };
}

/**
 * The fixture's Protect meter and bearers (A3M5; T712): the asset whole on a win and at half on a
 * loss, out of the run's max (the sim's `maxAsset`: Story ×1.5); the bearers its flags walk (`bearerTotal`, as the battle counts them), every one home on a
 * win and half of them on a loss, unless `f.bearers` says. None on a map with no asset or bearers.
 */
function protectOf(
  f: ResultsFixture,
  save: SaveData | null,
): { asset?: RunAsset; bearers?: RunBearers } {
  const config = battleConfig(f.map, 0, save);
  const map = config.content.maps[f.map];
  if (map === undefined || map.asset === null) return {};
  const won = f.outcome === 'won';
  // The run's own meter: the asset's integrity under the run's modifiers (Story's ×1.5).
  const max = createSim(config).state.maxAsset;
  const asset = { name: map.asset.name, value: won ? max : Math.floor(max / 2), max };
  const total = bearerTotal(map, config.scriptFlags);
  if (total === 0) return { asset };
  const home = f.bearers?.home ?? (won ? total : Math.floor(total / 2));
  return { asset, bearers: { home, lost: f.bearers?.lost ?? total - home, total } };
}

/**
 * The fixture's choir (the finale; T810): its Voices held, 60% of the singers its flags walk on a
 * win and a quarter on a loss, and REMEMBERED: {n}, the lifetime count the countdown starts from
 * (the save's). None on a map with no choir.
 */
function choirOf(
  f: ResultsFixture,
  save: SaveData | null,
): { voices?: { n: number; total: number }; remembered?: number } {
  const config = battleConfig(f.map, 0, save);
  const choir = config.content.maps[f.map]?.choir ?? null;
  if (choir === null) return {};
  const total = choirSize(choir, config.scriptFlags);
  const n = f.outcome === 'won' ? Math.ceil(total * 0.6) : Math.floor(total / 4);
  return { voices: { n, total }, remembered: save?.stats.pestsProcessed ?? 0 };
}

/** The run's facts: the map's own when it's registered, else a 10-wave map paying nothing. */
function inputOf(f: ResultsFixture, save: SaveData | null): RunEndInput {
  const won = f.outcome === 'won';
  const map = isMapId(f.map) ? RAW_CONTENT.maps[f.map] : undefined;
  const waveCount = map?.waves.length ?? 10;
  // The map's objective names Perfect Core plain "Perfect" on an Escort, as the battle does, and
  // on a Protect map whose bearers walk (A3M5; its compiled escort).
  const bearers =
    map?.objective === 'protect' ? battleConfig(f.map, 0, save).content.maps[f.map] : undefined;
  const medals = offeredMedals({
    medals: map?.medals ?? null,
    ...(map === undefined ? {} : { objective: map.objective }),
    ...(bearers === undefined ? {} : { escort: bearers.escort }),
  });
  return {
    mapId: f.map,
    act: map?.act ?? 1,
    waveCount,
    maxIntegrity: map?.coreIntegrity ?? 20,
    integrity: won ? 18 : 0,
    skitterkinKilled: f.pests ?? 120,
    wavesCleared: won ? waveCount : Math.floor(waveCount / 2),
    firstLeakAgo: null,
    stardust: map?.stardust ?? 0,
    medals,
    earnedMedals: won ? medals.map((m) => m.id).filter((id) => id !== 'perfect_core') : [],
    objectives: (map?.objectives ?? []).map((o) => ({
      id: o.id,
      name: o.name,
      intel: o.intel,
      status: won ? 'done' : 'failed',
    })),
    stats: statsOf(f),
    resumedFromWave: f.checkpoint?.resumedFrom ?? null,
    checkpointWave: f.checkpoint?.latest ?? f.checkpoint?.resumedFrom ?? null,
    ...(f.revoked === undefined ? {} : { revoked: revokedAtEnd(f.revoked) }),
    ...(map === undefined ? {} : escortOf(f, save)),
    ...(map === undefined ? {} : protectOf(f, save)),
    ...(map === undefined ? {} : choirOf(f, save)),
  };
}

/** The fixture's result, as Results would show it after the run end in `save` (never written). */
export function fixtureResult(f: ResultsFixture, save: SaveData | null): RunResult {
  const input = inputOf(f, save);
  const meta = metaRunEndOf(input, f.outcome);
  const ended = save === null || !isMapId(f.map) ? null : runEnd(save, { ...meta, mapId: f.map });
  // The debrief reads the save as this run would leave it (the Q3 Bonus banked before C2), and its
  // story choice plays on a copy: nothing is written (app/resultsFlow.ts, `record` false).
  const after = ended?.save ?? save;
  const story = { ...input, ...debriefStoryOf(after) };
  const result = runResultOf(story, f.outcome, ended?.summary ?? null);
  // `commitChoice` (T710's C4 smoke): the pick is made on the save in play and written.
  return withResultsChoice(result, story, f.outcome, after, f.commitChoice === true);
}

/** A flow scene by id: registered, or a dev scene (`ui/dialogue/dev.ts`). */
function flowScene(id: string): Scene {
  const scene = SCENES[id] ?? DEV_SCENES.find((s) => s.id === id);
  if (scene === undefined) throw new Error(`__sd.results: no scene '${id}'`);
  return scene;
}

/** The fixture's flow scenes: its own when it names them, else the map's (a win's only). */
export function fixtureScenes(f: ResultsFixture): ResultsScenes {
  const pick = (ids: readonly string[] | undefined, slot: 'before' | 'after'): Scene[] =>
    ids === undefined ? flowScenes(f.map, f.outcome, slot) : ids.map(flowScene);
  return { before: pick(f.flow?.before, 'before'), after: pick(f.flow?.after, 'after') };
}
