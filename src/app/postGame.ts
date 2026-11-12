// The post-game shell's run end (T863; design/maps.md § 8, *The score*): an Endless run's score
// goes into the save's table (meta/endless.ts `withEndlessScore`: one best per seed, ten at most),
// and the score screen reads what it did. The router calls `recordEndlessEnd` for every run, after
// meta's run end, so a run that isn't Endless clears the screen's data. Core-side and small: the
// generator and the screens are in the finale's lazy chunk (app/postGameHooks.ts).
import { endlessBest, endlessScores, withEndlessScore } from '../meta/endless.ts';
import { logError } from './log.ts';
import { ENDLESS_MAP_ID, endlessResult, type EndlessResultView } from './postGameHooks.ts';
import { activeSave, updateActiveSave } from './save.ts';

/** What the run end reads from the finished battle. */
export interface EndlessRunEnd {
  readonly mapId: string;
  readonly seed: number;
  /** `state.schedule.resolved`: one entry per wave, true once it is fully resolved. */
  readonly resolved: readonly boolean[];
}

/** A run's score: the waves it held (sim/endless.ts `endlessWavesHeld`, without the sim import). */
export function wavesHeld(resolved: readonly boolean[]): number {
  let n = 0;
  for (const r of resolved) if (r) n++;
  return n;
}

/**
 * Files an Endless run's score in the save in play and sets the score screen's data; any other run
 * clears it. Returns the view (null for a run that isn't Endless). A failed write is logged; the
 * screen still shows the run's waves.
 */
export function recordEndlessEnd(run: EndlessRunEnd): EndlessResultView | null {
  if (run.mapId !== ENDLESS_MAP_ID) {
    endlessResult.value = null;
    return null;
  }
  const held = wavesHeld(run.resolved);
  const save = activeSave();
  const bestBefore = save === null ? null : endlessBest(save, run.seed);
  let newBest = false;
  if (save !== null) {
    try {
      const next = withEndlessScore(save, run.seed, held);
      newBest = next !== save;
      if (newBest) {
        const w = updateActiveSave(() => next);
        if (!w.ok) logError(`endless: ${w.message}`);
      }
    } catch (err) {
      logError('endless: the score could not be filed', err);
    }
  }
  const after = activeSave();
  const view: EndlessResultView = {
    map: run.mapId,
    seed: run.seed,
    held,
    bestBefore,
    newBest,
    scores: after === null ? [] : endlessScores(after),
    recorded: save !== null,
  };
  endlessResult.value = view;
  return view;
}
