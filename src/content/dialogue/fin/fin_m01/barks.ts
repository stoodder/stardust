// FIN · Clearing the Way: map-scoped barks (story/campaign/finale.md § FIN, *Barks*), verbatim. They
// fire only on this map; ids end `_afin_NN` (style-guide.md § 5.3). Few on purpose: in Phase 2 the
// song is the bark (style-guide § 2). Pebble (the choir's leader), Ves'thara (she holds the light),
// and the picked companion are on the radio here (app/dialogue.ts `presentSpeakers`). Pebble's and
// QUILL's lines are Phase 2's (`phaseAtLeast`: the gold only exists there); QUILL's only under
// Keep, the one answer whose QUILL still says something like that.
import { defineBarks } from '../../define.ts';

const PHASE_2 = { phaseAtLeast: 2 } as const;

export const barks = defineBarks([
  {
    id: 'pebble_wave_cleared_afin_01',
    speaker: 'pebble',
    expression: 'singing',
    text: 'Louder! Sing louder!',
    trigger: { on: 'wave_cleared' },
    when: PHASE_2,
  },
  {
    id: 'vesthara_ally_hushed_afin_01',
    speaker: 'vesthara',
    expression: 'sad',
    text: 'Keep singing. She will come back. They all come back.',
    trigger: { on: 'ally_hushed', ally: 'singer' },
  },
  {
    id: 'quill_perfect_wave_afin_01',
    speaker: 'quill',
    expression: 'happy',
    text: 'That one went gold. All of it.',
    trigger: { on: 'perfect_wave' },
    when: { all: [PHASE_2, { flag: 'quill_choice', eq: 'keep' }] },
  },
]);
