// A3M5 · Unsung: map-scoped barks (story/campaign/act3.md § A3M5, *Barks*), verbatim. They fire
// only on this map; ids end `_a3_05`. Ves'thara is the companion, so hers plays when the Hollow
// hush a bearer; QUILL's `boss_phase` line plays only under C4 Keep (the other answers leave it
// flat or offline). QUILL's `skitterkin_killed_ahead` never fires here (no hostile Skitterkin).
import { defineBarks } from '../../define.ts';

export const barks = defineBarks([
  {
    id: 'vesthara_ally_hushed_a3_05',
    speaker: 'vesthara',
    expression: 'sad',
    text: 'Carry the next one. Do not look back.',
    trigger: { on: 'ally_hushed', ally: 'bearer' },
  },
  {
    id: 'quill_boss_phase_a3_05',
    speaker: 'quill',
    expression: 'worried',
    text: "Directive conflict. I'm— helping you anyway.",
    trigger: { on: 'boss_phase' },
    when: { flag: 'quill_choice', eq: 'keep' },
  },
]);
