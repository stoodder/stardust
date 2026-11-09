// The results fixture (`__sd.results`, `?test=1` only; T316): a finished run built from a few
// facts instead of played, so the smoke flows and agents can see any map's Results and its flow
// (A1M5's party → card → stinger, its CONTAINMENT LAPSE stamp) without playing ten waves. It reads
// the save in play but never writes it: the payroll is what the run *would* pay.
import { SCENES, type Scene } from '../content/dialogue/index.ts';
import { MAPS } from '../content/maps/index.ts';
import type { MapId, WaveTag } from '../content/types.ts';
import { runEnd, type SaveData } from '../meta/index.ts';
import type { FlagRuleStats } from '../story/flags.ts';
import { DEV_SCENES } from '../ui/dialogue/dev.ts';
import type { RunResult } from '../ui/screens/state.ts';
import type { ResultsScenes } from './router.ts';
import { flowScenes } from './runFlow.ts';
import {
  debriefStoryOf,
  metaRunEndOf,
  offeredMedals,
  runResultOf,
  type RunEndInput,
} from './runResult.ts';
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
  return Object.hasOwn(MAPS, id);
}

/** The run's facts: the map's own when it's registered, else a 10-wave map paying nothing. */
function inputOf(f: ResultsFixture): RunEndInput {
  const won = f.outcome === 'won';
  const map = isMapId(f.map) ? MAPS[f.map] : undefined;
  const waveCount = map?.waves.length ?? 10;
  const medals = offeredMedals({ medals: map?.medals ?? null });
  return {
    mapId: f.map,
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
  };
}

/** The fixture's result, as Results would show it after the run end in `save` (never written). */
export function fixtureResult(f: ResultsFixture, save: SaveData | null): RunResult {
  const input = inputOf(f);
  const meta = metaRunEndOf(input, f.outcome);
  const summary =
    save === null || !isMapId(f.map) ? null : runEnd(save, { ...meta, mapId: f.map }).summary;
  return runResultOf({ ...input, ...debriefStoryOf(save) }, f.outcome, summary);
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
