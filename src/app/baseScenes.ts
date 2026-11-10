// The base's conversations (T308, T513): the visit scenes, each played once, on the first time the
// base opens with its moment come, and the shop's open question.
// - **Visit scenes** (`VISIT_SCENES`, in order): Zibzab's arrival (story/campaign/act1.md § A1M3,
//   *Base*), once his shop is open (the Zapcoil sample is already in hand: meta/issued.ts gives it
//   as the shop opens); and Bricks handing Pebble to Goldie at Dome 3 (act2.md § A2M4, *Base*),
//   once A2M4 is won. Two due on one visit play one after the other.
// - **The open question**, "Where does stardust come from?", which the player asks from its shop
//   row (meta/purchase.ts `openQuestionOffered`).
// All play as a pausing panel over the base (app/dialogue.ts); what they set (the scene seen,
// `asked_zibzab_early`) is written to the save as they end. They play only while dialogue does
// (`?test=1` turns it off unless `&dialogue=1`, the radio's rule).
import { sceneById, type SceneId } from '../content/dialogue/index.ts';
import { isMapWon, openQuestionOffered, type SaveData } from '../meta/index.ts';
import { dialogueEnabled, playScene } from './dialogue.ts';
import { activeSave, systemOpen } from './save.ts';

/** Zibzab's arrival at the base. */
export const ARRIVAL_SCENE: SceneId = 'a1_m03_base_arrival';
/** Bricks hands Pebble over to Goldie (after A2M4). */
export const HANDOVER_SCENE: SceneId = 'a2_m04_base_handover';
/** The shop's open question. */
export const OPEN_QUESTION_SCENE: SceneId = 'a1_m03_base_stardust';

/** A scene the base plays once, on the first visit where its moment has come. */
interface VisitScene {
  readonly id: SceneId;
  readonly due: (save: SaveData) => boolean;
}

/** The base's visit scenes, in the order they play when several are due. */
export const VISIT_SCENES: readonly VisitScene[] = [
  { id: ARRIVAL_SCENE, due: () => systemOpen('shop') },
  { id: HANDOVER_SCENE, due: (save) => isMapWon(save, 'a2_m04') },
];

/** The visit scenes due for the save in play (none while dialogue is off), in order. */
export function visitScenesDue(): SceneId[] {
  const save = activeSave();
  if (save === null || !dialogueEnabled()) return [];
  return VISIT_SCENES.filter((v) => !save.story.seen.includes(v.id) && v.due(save)).map(
    (v) => v.id,
  );
}

/** Whether Zibzab's arrival is due (the base then opens on the Shop tab). */
export function arrivalDue(): boolean {
  return visitScenesDue().includes(ARRIVAL_SCENE);
}

/**
 * Plays the visit scenes due, in order (each waits for the one before). Returns whether Zibzab's
 * arrival is among them (the base shows the shop).
 */
export function playBaseScenesIfDue(): boolean {
  let arrival = false;
  for (const id of visitScenesDue()) {
    const scene = sceneById(id);
    if (scene === undefined) continue;
    playScene(scene, { mode: 'panel' });
    if (id === ARRIVAL_SCENE) arrival = true;
  }
  return arrival;
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
