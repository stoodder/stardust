// A1M1 · Orientation Day: map-scoped barks (story/campaign/act1.md § A1M1, *Barks*), verbatim. They
// fire only on this map; act-wide pools live in ../../barks/. Ids end `_a1_01` (this map), so no
// other Act I map's ids collide with them.
// QUILL's perfect-wave sticker and the bank nudge are act-wide (../../barks/).
import { defineBarks } from '../../define.ts';

export const barks = defineBarks([
  // The fair-play seed: the first pest out goes south, into the wilds. Once per campaign, and
  // never dropped: app/dialogue.ts queues a `first_leak` bark behind the line on the panel.
  {
    id: 'quill_first_leak_a1_01',
    speaker: 'quill',
    text: 'Pest escaped containment! (Toward... the wilderness? Odd. Logging it.)',
    trigger: { on: 'first_leak' },
    once: 'campaign',
  },
  // W1's clear is the first jingle; Bricks's line waits for a later one (the jingle again).
  {
    id: 'quill_wave_cleared_a1_01',
    speaker: 'quill',
    expression: 'happy',
    text: '(singing along) Ev-er-glow, Ev-er-glow!',
    trigger: { on: 'wave_cleared', wave: 1 },
  },
  {
    id: 'bricks_wave_cleared_a1_01',
    speaker: 'bricks',
    text: 'That jingle. Every time.',
    trigger: { on: 'wave_cleared' },
  },
]);
