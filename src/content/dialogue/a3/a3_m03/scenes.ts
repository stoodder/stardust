// A3M3 · The Gap: scenes (story/campaign/act3.md § A3M3, *Story delivery*), verbatim. Ids are
// `a3_m03_<slot>` (style-guide.md § 5.3): the briefing with C3 (`door_choice`, committed as the
// briefing closes), the radio, `a3_m03_cue_vitals`, and the SEAL (`a3_m03_cue_seal`). No debrief:
// Results reads "Held.". Registered empty (T600b) so the map's task (T622) adds only its lines
// here; tools/dialogueCanon.test.ts checks each against act3.md § A3M3.
import { defineScenes } from '../../define.ts';

export const scenes = defineScenes([]);
