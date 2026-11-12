// CH_M01's briefing (Skitterkin Only; T862): Bramble's terms and Pebble's roll call, the only thing
// the map says (a challenge has no radio, cues, or barks). It loads with the finale's chunk
// (content/acts/fin.ts) and plays as `<map>_brief` (app/dialogue.ts `briefingScene`).
import { defineScene, defineScenes } from '../../dialogue/index.ts';

export const scenes = defineScenes([
  defineScene('ch_m01_brief', [
    {
      kind: 'line',
      speaker: 'chitterbloom',
      // Her plate's campaign rule (Bramble from A3M1 on) reads campaign maps; this isn't one.
      plateAs: 'Bramble',
      text: 'Your machines stay home today. My families hold this road.',
    },
    {
      kind: 'line',
      speaker: 'pebble',
      expression: 'happy',
      text: 'Den digs! Gloop spits! Sproing bonks! Choir sings! That is everybody. (squeak)',
    },
    {
      kind: 'line',
      speaker: 'chitterbloom',
      plateAs: 'Bramble',
      text: 'You walked our road once. Today, walk it our way.',
    },
  ]),
]);
