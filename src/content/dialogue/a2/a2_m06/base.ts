// A2M6 · Sundown: its base scenes (story/campaign/act2.md § A2M6, *Base scene* and *Base
// vignette*), verbatim: QUILL's loophole (its partial confession, a scene of its own), then Bricks
// teaching Pebble to whistle. She can't; she hums instead, a low family hum, not the jingle (four
// notes, D137's motif). Ids are `a2_m06_base_<name>` (style-guide.md § 5.3: act2.md's
// `base_a2_loophole` and `base_a2_whistle` file as `a2_m06_base_loophole` and
// `a2_m06_base_whistle`); app/baseScenes.ts plays both, loophole first, on the first base visit
// after A2M6 is won, so Act II's base ends on Pebble's hum.
import { defineScene, defineScenes } from '../../define.ts';

export const scenes = defineScenes([
  defineScene('a2_m06_base_loophole', [
    {
      kind: 'line',
      speaker: 'quill',
      text: "There are things I am not permitted to tell you. I am permitted to tell you that. It's a loophole. I found it myself.",
    },
  ]),
  defineScene('a2_m06_base_whistle', [
    { kind: 'line', speaker: 'bricks', text: 'Two fingers in, blow out. Like this, Pebble.' },
    { kind: 'line', speaker: 'pebble', text: '(pfffft)' },
    {
      kind: 'line',
      speaker: 'bricks',
      expression: 'happy',
      text: "That's a raspberry. Some mouths aren't built for it.",
    },
    { kind: 'line', speaker: 'pebble', expression: 'singing', text: 'Hm. Hm-hm. Hmmm.' },
    { kind: 'line', speaker: 'bricks', text: '', durationSec: 2 },
    { kind: 'line', speaker: 'bricks', text: "...That's not the jingle. What is that?" },
    { kind: 'line', speaker: 'pebble', text: '(squeak) Home.' },
    { kind: 'line', speaker: 'bricks', expression: 'sad', text: 'Yeah. Keep that one.' },
  ]),
]);
