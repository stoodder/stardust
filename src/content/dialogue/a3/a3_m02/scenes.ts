// A3M2 · License Revoked: scenes (story/campaign/act3.md § A3M2, *Story delivery*), verbatim. Ids
// are `a3_m02_<slot>` (style-guide.md § 5.3): the briefing, the radio (QUILL's lockout leaks from
// w08), the Clean Exit cue (`a3_m02_cue_revoke`, a pausing cue), and the Asset Yield Log
// (`a3_m02_scene_confession`, after Results). Registered empty (T600b) so the map's task (T621)
// adds only its lines here; tools/dialogueCanon.test.ts checks each against act3.md § A3M2.
import { defineScenes } from '../../define.ts';

export const scenes = defineScenes([]);
