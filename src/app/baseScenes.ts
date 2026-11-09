// The base's conversations (T308; story/campaign/act1.md § A1M3, *Base*): Zibzab's arrival, which
// plays the first time the base opens with his shop open (the Zapcoil sample is already in hand:
// meta/issued.ts gives it as the shop opens), and the shop's open question, "Where does stardust
// come from?", which the player asks from its shop row (meta/purchase.ts `openQuestionOffered`).
// Both play as a pausing panel over the base (app/dialogue.ts); what they set (the scene seen,
// `asked_zibzab_early`) is written to the save as they end.
import { sceneById, type SceneId } from '../content/dialogue/index.ts';
import { openQuestionOffered } from '../meta/index.ts';
import { dialogueEnabled, playScene } from './dialogue.ts';
import { activeSave, systemOpen } from './save.ts';

/** Zibzab's arrival at the base. */
export const ARRIVAL_SCENE: SceneId = 'a1_m03_base_arrival';
/** The shop's open question. */
export const OPEN_QUESTION_SCENE: SceneId = 'a1_m03_base_stardust';

/**
 * Whether Zibzab's arrival is due: his shop is open and the save hasn't seen the scene. It plays
 * only while dialogue does (`?test=1` turns it off unless `&dialogue=1`, the radio's rule).
 */
export function arrivalDue(): boolean {
  const save = activeSave();
  return (
    save !== null &&
    dialogueEnabled() &&
    systemOpen('shop') &&
    !save.story.seen.includes(ARRIVAL_SCENE)
  );
}

/** Plays Zibzab's arrival if it's due. Returns whether it plays (the base shows the shop). */
export function playArrivalIfDue(): boolean {
  if (!arrivalDue()) return false;
  const scene = sceneById(ARRIVAL_SCENE);
  if (scene === undefined) return false;
  playScene(scene, { mode: 'panel' });
  return true;
}

/** Whether the shop shows its open question for the save in play. */
export function openQuestionShown(): boolean {
  const save = activeSave();
  return save !== null && openQuestionOffered(save, systemOpen('shop') ? ['shop'] : []);
}

/** Asks Zibzab the open question: plays its scene (its answer sets `asked_zibzab_early`). */
export function askOpenQuestion(): void {
  const scene = sceneById(OPEN_QUESTION_SCENE);
  if (scene === undefined || !openQuestionShown()) return;
  playScene(scene, { mode: 'panel' });
}
