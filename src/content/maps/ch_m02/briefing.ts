// CH_M02's briefing (Lights Out; T862): Ves'thara names the trick, Goldie the answer. It loads with
// the finale's chunk (content/acts/fin.ts) and plays as `<map>_brief` (app/dialogue.ts
// `briefingScene`).
import { defineScene, defineScenes } from '../../dialogue/index.ts';

export const scenes = defineScenes([
  defineScene('ch_m02_brief', [
    {
      kind: 'line',
      speaker: 'vesthara',
      text: 'Tonight every one of them wears the dark, Waykeeper. Even the small ones.',
    },
    {
      kind: 'line',
      speaker: 'goldie',
      text: "Lookouts first, then. You can't weed what you can't see.",
    },
    {
      kind: 'line',
      speaker: 'vesthara',
      text: 'Light the way, and they will have nowhere to hide.',
    },
  ]),
]);
