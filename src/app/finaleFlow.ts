// The campaign's close after the finale's results card (D154; content/dialogue/resultsFlow.ts
// `ending`): Sterling's farewell memo as a card, C5, the epilogue (its cards one at a time, before
// the counter and the credits), then the post-game star map. Pure: what a won run of a map plays once its card is dismissed, in order, and
// which steps are still placeholders. app/ending.ts plays them (T810: the memo, C5, the epilogue;
// the post-game step routes to the star map until T863 builds its screen); a step whose content
// or screen hasn't landed is a placeholder, passed over, so the flow can be wired before its pieces
// exist.
import { sceneById } from '../content/dialogue/index.ts';
import {
  resultsFlow,
  type EndingScreen,
  type EndingStep,
} from '../content/dialogue/resultsFlow.ts';
import { MEMOS } from '../content/memos/index.ts';
import type { SaveData } from '../meta/saveData.ts';

/** The task that builds each ending screen (a screen not in `BUILT_ENDING_SCREENS` waits for it). */
export const ENDING_SCREEN_TASKS: Readonly<Record<EndingScreen, string>> = {
  epilogue: 'T810',
  post_game: 'T863',
};

/** The ending screens built so far (each task adds its own as it lands). */
export const BUILT_ENDING_SCREENS: readonly EndingScreen[] = ['epilogue', 'post_game'];

/**
 * The steps a win of `mapId` plays once its card is dismissed, over the save as run end left it:
 * the flow's `first` while C5 is unanswered (`ending_choice` unset), else its `replay`. None for a
 * map with no `ending` (every map but the finale) or a run that wasn't won.
 */
export function endingSteps(
  mapId: string,
  won: boolean,
  save: Pick<SaveData, 'story'>,
): readonly EndingStep[] {
  const ending = resultsFlow(mapId).ending;
  if (!won || ending === undefined) return [];
  return save.story.flags.ending_choice === undefined ? ending.first : ending.replay;
}

/**
 * Why `step` can't play yet, or null when it can: a memo or scene not registered yet (its words
 * task, T811), or a screen not built (`ENDING_SCREEN_TASKS`).
 */
export function endingPlaceholder(
  step: EndingStep,
  built: readonly EndingScreen[] = BUILT_ENDING_SCREENS,
): string | null {
  if ('memo' in step) {
    return Object.hasOwn(MEMOS, step.memo) ? null : `memo ${step.memo} isn't registered yet`;
  }
  if ('scene' in step) {
    return sceneById(step.scene) === undefined ? `scene ${step.scene} isn't registered yet` : null;
  }
  return built.includes(step.screen)
    ? null
    : `screen ${step.screen} waits for ${ENDING_SCREEN_TASKS[step.screen]}`;
}
