// A3M1 · The Preserve: map-scoped barks (story/campaign/act3.md § A3M1, *Barks*), verbatim. They
// fire only on this map; ids end `_a3_01` (this map). Bramble is the companion, so her hush line
// plays on its trigger. Ves'thara's Maw line is a cue scene instead (`a3_m01_cue_maw`, scenes.ts):
// she translates on the radio but isn't a present speaker (app/dialogue.ts `presentSpeakers`).
import { defineBarks } from '../../define.ts';

export const barks = defineBarks([
  // A refugee hushed on the road (translated).
  {
    id: 'chitterbloom_ally_hushed_a3_01',
    speaker: 'chitterbloom',
    text: 'One of mine.',
    trigger: { on: 'ally_hushed', ally: 'refugee' },
  },
  // No jingle plays from Act III on, and QUILL notices: the first wave cleared.
  {
    id: 'quill_wave_cleared_a3_01',
    speaker: 'quill',
    text: '...No song. Logging it.',
    trigger: { on: 'wave_cleared' },
    once: 'map',
  },
]);
