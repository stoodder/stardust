// The flow around a won map's results card (T316; content/dialogue/resultsFlow.ts): full-screen
// scenes before Results (A1M5's party, over the frozen battle) and after it is dismissed (the
// stinger, before the way on the player picked). A listed scene plays only once it is registered,
// and only while dialogue plays (`?test=1` turns it off unless `&dialogue=1`, the radio's rule).
// Every win plays them; Esc or Skip skips one (style-guide.md § 4: full-screen scenes are
// skippable). A flow scene's line can play the colony jingle as it shows (the flow's `jingles`:
// the PA's minor shift change that closes Act II, T512); a skipped line never plays it.
import { effect } from '@preact/signals';
import { sceneById, type Scene } from '../content/dialogue/index.ts';
import { RESULTS_FLOW, resultsFlow, type FlowJingle } from '../content/dialogue/resultsFlow.ts';
import { dialogue, type SceneView } from '../ui/dialogue/state.ts';
import { dialogueEnabled, playScene } from './dialogue.ts';
import type { RunOutcome } from './testHookTypes.ts';

/** When a flow scene plays: before the results card, or after it's dismissed. */
export type FlowSlot = 'before' | 'after';

/** The registered scenes a run of `mapId` that ended `outcome` plays at `slot` (a win's only). */
export function flowScenes(
  mapId: string,
  outcome: RunOutcome,
  slot: FlowSlot,
  lookup: (id: string) => Scene | undefined = sceneById,
): Scene[] {
  if (outcome !== 'won') return [];
  const flow = resultsFlow(mapId);
  const ids = (slot === 'before' ? flow.beforeResults : flow.afterResults) ?? [];
  return ids.flatMap((id) => {
    const scene = lookup(id);
    return scene === undefined ? [] : [scene];
  });
}

/** Every flow's jingles that `scenes` carry (content/dialogue/resultsFlow.ts `jingles`). */
export function jinglesOf(scenes: readonly Scene[]): FlowJingle[] {
  const ids = new Set(scenes.map((s) => s.id));
  return Object.values(RESULTS_FLOW).flatMap((f) =>
    (f?.jingles ?? []).filter((j) => ids.has(j.scene)),
  );
}

/** The jingle due as `view` shows its line (that line's index is the lines said before it). */
export function jingleDue(
  view: SceneView | null,
  jingles: readonly FlowJingle[],
): FlowJingle | null {
  if (view === null || view.line === null) return null;
  return jingles.find((j) => j.scene === view.sceneId && j.line === view.transcript.length) ?? null;
}

/** The watch over the playing flow's lines for its jingles (one flow at a time). */
let stopJingles: (() => void) | null = null;

/** Plays each of `jingles` once, as its line shows, until `stop` (the flow's end). */
function watchJingles(jingles: readonly FlowJingle[]): void {
  stopJingles?.();
  stopJingles = null;
  if (jingles.length === 0) return;
  const waiting = [...jingles];
  stopJingles = effect(() => {
    const j = jingleDue(dialogue.scene.value, waiting);
    if (j === null) return;
    waiting.splice(waiting.indexOf(j), 1);
    // Loaded on demand: a static import of the audio here closes an import cycle (audio → save →
    // … → router → runFlow) that changes the app's module order at boot.
    void import('./audio.ts').then((audio) => audio.playJingle(j.jingle));
  });
}

/**
 * Plays `scenes` full-screen, one after another, then runs `done` (at once when there are none
 * or dialogue is off). A scene that has nothing to say ends at once and the next plays. `record`
 * false (the results fixture) saves nothing they do, not even that they were seen. Their flow's
 * jingles play as their lines show.
 */
export function playInOrder(scenes: readonly Scene[], done: () => void, record = true): void {
  if (scenes.length === 0 || !dialogueEnabled()) {
    done();
    return;
  }
  watchJingles(jinglesOf(scenes));
  const end = (): void => {
    stopJingles?.();
    stopJingles = null;
    done();
  };
  // Queued together: the dialogue plays a held scene's followers in order (app/dialogue.ts).
  scenes.forEach((scene, i) => {
    playScene(
      scene,
      i === scenes.length - 1
        ? { mode: 'fullscreen', onEnd: end, record }
        : { mode: 'fullscreen', record },
    );
  });
}

/** The scenes to play once the results card on screen is dismissed, and whether they save. */
let afterResults: readonly Scene[] = [];
let afterRecord = true;

/**
 * Sets what plays once the card on screen is dismissed (the router, as Results shows); `record`
 * false for the results fixture's card, whose scenes save nothing.
 */
export function setAfterResults(scenes: readonly Scene[], record = true): void {
  afterResults = scenes;
  afterRecord = record;
}

/** Whether scenes wait for the card on screen to be dismissed. */
export function afterResultsPending(): boolean {
  return afterResults.length > 0;
}

/**
 * Leaves the results card: plays its after-scenes (once: they're cleared first), then `go` (the
 * way on the player picked: Continue, Retry, Change loadout, Title).
 */
export function leaveResults(go: () => void): void {
  const scenes = afterResults;
  afterResults = [];
  playInOrder(scenes, go, afterRecord);
}
