// The flow around a won map's results card (T316; content/dialogue/resultsFlow.ts): full-screen
// scenes before Results (A1M5's party, over the frozen battle; A2M6's debrief, D138) and after it
// is dismissed (the stinger, before the way on the player picked). A listed scene plays only once
// it is registered, and only while dialogue plays (`?test=1` turns it off unless `&dialogue=1`,
// the radio's rule).
// Every win plays them; Esc or Skip skips one (style-guide.md § 4: full-screen scenes are
// skippable), except a flow's `unskippableFirst` scene the save hasn't seen (the finale's Dawn).
// A flow scene's line can play the colony jingle as it shows (the flow's `jingles`: the PA's minor
// shift change that closes Act II, T512); a skipped line never plays it. After the card and its
// after-scenes, a won finale plays the campaign's close (`ending`, app/ending.ts; T810).
import { effect } from '@preact/signals';
import { sceneById, type Scene } from '../content/dialogue/index.ts';
import { RESULTS_FLOW, resultsFlow, type FlowJingle } from '../content/dialogue/resultsFlow.ts';
import type { EndingStep } from '../content/dialogue/resultsFlow.ts';
import { dialogue, type SceneView } from '../ui/dialogue/state.ts';
import { dialogueEnabled, playScene } from './dialogue.ts';
import { playEnding } from './ending.ts';
import type { RunOutcome } from './testHookTypes.ts';

/** When a flow scene plays: before the results card, or after it's dismissed. */
export type FlowSlot = 'before' | 'after';

/**
 * The registered scenes a run of `mapId` that ended `outcome` plays at `slot` (a win's only):
 * before Results, the flow's `beforeResults` and then its debrief when it plays as a scene
 * (`debriefAsScene`, D138: A2M6's Ishael).
 */
export function flowScenes(
  mapId: string,
  outcome: RunOutcome,
  slot: FlowSlot,
  lookup: (id: string) => Scene | undefined = sceneById,
): Scene[] {
  if (outcome !== 'won') return [];
  const flow = resultsFlow(mapId);
  const ids =
    slot === 'before'
      ? [
          ...(flow.beforeResults ?? []),
          ...(flow.debriefAsScene === true ? [`${mapId}_debrief`] : []),
        ]
      : (flow.afterResults ?? []);
  return ids.flatMap((id) => {
    const scene = lookup(id);
    return scene === undefined ? [] : [scene];
  });
}

/**
 * Whether Esc may not skip `scene` in `mapId`'s flow: one of its `unskippableFirst` the save
 * hasn't seen (`seen`, the save's `story.seen`; the finale's Dawn the first time).
 */
export function unskippable(mapId: string, scene: Scene, seen: readonly string[]): boolean {
  return (resultsFlow(mapId).unskippableFirst ?? []).includes(scene.id) && !seen.includes(scene.id);
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

/**
 * Plays a flow's jingle: the audio's `playJingle`, which boot.ts installs (`setJinglePlayer`).
 * Injected, not imported: a static import of the audio here closes an import cycle (audio → save →
 * … → router → runFlow) that changes the app's module order at boot. Nothing plays until then.
 */
let jinglePlayer: (jingle: FlowJingle['jingle']) => void = () => {};

/** Installs the flow jingles' player (boot.ts: the audio's `playJingle`; tests: a recorder). */
export function setJinglePlayer(play: (jingle: FlowJingle['jingle']) => void): void {
  jinglePlayer = play;
}

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
    jinglePlayer(j.jingle);
  });
}

/**
 * Plays `scenes` full-screen, one after another, then runs `done` (at once when there are none
 * or dialogue is off). A scene that has nothing to say ends at once and the next plays. `record`
 * false (the results fixture) saves nothing they do, not even that they were seen. Their flow's
 * jingles play as their lines show. A scene `noSkip` holds Esc doesn't skip (`unskippable`).
 */
export function playInOrder(
  scenes: readonly Scene[],
  done: () => void,
  record = true,
  noSkip: (scene: Scene) => boolean = () => false,
): void {
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
    const held = noSkip(scene) ? { noSkip: true } : {};
    playScene(
      scene,
      i === scenes.length - 1
        ? { mode: 'fullscreen', onEnd: end, record, ...held }
        : { mode: 'fullscreen', record, ...held },
    );
  });
}

/** The scenes to play once the results card on screen is dismissed, and whether they save. */
let afterResults: readonly Scene[] = [];
let afterRecord = true;
/** The campaign's close after them (a won finale's `ending` steps; app/finaleFlow.ts). */
let ending: readonly EndingStep[] = [];

/**
 * Sets what plays once the card on screen is dismissed (the router, as Results shows): its
 * after-scenes, then the campaign's close (`steps`, a won finale's: app/finaleFlow.ts
 * `endingSteps`); `record` false for the results fixture's card, whose scenes save nothing.
 */
export function setAfterResults(
  scenes: readonly Scene[],
  record = true,
  steps: readonly EndingStep[] = [],
): void {
  afterResults = scenes;
  afterRecord = record;
  ending = steps;
}

/** Whether scenes wait for the card on screen to be dismissed. */
export function afterResultsPending(): boolean {
  return afterResults.length > 0;
}

/**
 * Leaves the results card: plays its after-scenes (once: they're cleared first), then the
 * campaign's close when the card set one (app/ending.ts: a first win's whatever the way on, a
 * replay's only `onward`), then `go` (the way on the player picked: Continue, Retry, Change
 * loadout, Title) unless the close ended on the post-game star map. `onward`: the way on is
 * Continue (navigation.ts `afterWin`).
 */
export function leaveResults(go: () => void, onward = false): void {
  const scenes = afterResults;
  const steps = ending;
  const record = afterRecord;
  afterResults = [];
  ending = [];
  playInOrder(scenes, () => playEnding(steps, { record, onward }, go), record);
}
