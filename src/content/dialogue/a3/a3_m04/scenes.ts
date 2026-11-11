// A3M4 · Empty Slot: scenes (story/campaign/act3.md § A3M4, *Story delivery*), verbatim once
// authored (T720). Ids are `a3_m04_<slot>` (style-guide.md § 5.3); tools/dialogueCanon.test.ts
// checks each against act3.md § A3M4. The slots the seams name (T700b; m7-plan § 3):
// - `a3_m04_brief` (QUILL patches in System Reboot; Goldie or Pebble by door), `a3_m04_wNN`;
// - `a3_m04_scene_mail` (Gerald's envelope: before the card, content/dialogue/resultsFlow.ts; its
//   grant, Suppressing Fire, is `inheritAbility` at run end, meta/storyTransactions.ts);
// - `a3_m04_debrief` (C4, `quill_choice`, with `remember`; answered on the card);
// - `a3_m04_base_night_shift` (act3.md's `base_a3_night_shift` vignette: the base's mandatory
//   visit scene after C4, app/baseScenes.ts `NIGHT_SHIFT_SCENE`).
import { defineScenes } from '../../define.ts';

export const scenes = defineScenes([]);
