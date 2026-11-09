// The flow around a won map's results card (T316; content/dialogue/resultsFlow.ts): full-screen
// scenes before Results (A1M5's party, over the frozen battle) and after it is dismissed (the
// stinger, before the way on the player picked). A listed scene plays only once it is registered,
// and only while dialogue plays (`?test=1` turns it off unless `&dialogue=1`, the radio's rule).
// Every win plays them; Esc or Skip skips one (style-guide.md § 4: full-screen scenes are
// skippable).
import { sceneById, type Scene } from '../content/dialogue/index.ts';
import { resultsFlow } from '../content/dialogue/resultsFlow.ts';
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

/**
 * Plays `scenes` full-screen, one after another, then runs `done` (at once when there are none
 * or dialogue is off). A scene that has nothing to say ends at once and the next plays.
 */
export function playInOrder(scenes: readonly Scene[], done: () => void): void {
  if (scenes.length === 0 || !dialogueEnabled()) {
    done();
    return;
  }
  // Queued together: the dialogue plays a held scene's followers in order (app/dialogue.ts).
  scenes.forEach((scene, i) => {
    playScene(
      scene,
      i === scenes.length - 1 ? { mode: 'fullscreen', onEnd: done } : { mode: 'fullscreen' },
    );
  });
}

/** The scenes to play once the results card on screen is dismissed. */
let afterResults: readonly Scene[] = [];

/** Sets what plays once the card on screen is dismissed (the router, as Results shows). */
export function setAfterResults(scenes: readonly Scene[]): void {
  afterResults = scenes;
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
  playInOrder(scenes, go);
}
