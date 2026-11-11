// FIN · Clearing the Way: scenes (story/campaign/finale.md § FIN, *Story delivery*), verbatim once
// authored (T811). Ids are `fin_m01_<slot>` (style-guide.md § 5.3); the map isn't in
// tools/dialogueCanon.test.ts's COMPLETE until T811 lands its lines. The slots the seams name
// (T800b; m8-plan § 3):
// - `fin_m01_brief` (Zibzab, Ves'thara, QUILL or `system` under Purge);
// - the radio `fin_m01_w02`, `_w05` (convoy), `_w06` (Purge), `_w09` (with
//   `fin_m01_cue_memorial`: Pebble at the memorial, then Bricks's dark-frame silence), `_w12`, `_w15`
//   (`returned`);
// - Phase 2's cues: `fin_m01_cue_phase2` (the counter returns), `fin_m01_cue_log` (Rewrite),
//   `fin_m01_cue_directive0` with the forced input `whos_there` and `fin_m01_cue_not_everglow`
//   (Keep), `fin_m01_cue_not_nothing` (Purge), `fin_m01_cue_echo` (cleared, at rest progress 50%);
// - the full-screen `fin_m01_scene_dawn` (≤ 20 lines; before the card, `RESULTS_FLOW.fin_m01`) and
//   `fin_m01_scene_c5` (C5's voices and its two options, which set `ending_choice`; after the card
//   and Sterling's memo, `RESULTS_FLOW.fin_m01.ending`).
import { defineScenes } from '../../define.ts';

export const scenes = defineScenes([]);
