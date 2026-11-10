// A2M5 · The Long Walk: map-scoped barks (story/campaign/act2.md § A2M5, *Barks*), verbatim. They
// fire only on this map; Act II's act-wide pool is ../../barks/act2.ts. Ids end `_a2_05` (this
// map).
import { defineBarks } from '../../define.ts';

export const barks = defineBarks([
  // A refugee hushed on the road (the sim's Hushed event with a refugee victim).
  {
    id: 'bricks_ally_hushed_a2_05',
    speaker: 'bricks',
    text: 'Lost one. Keep the rest moving.',
    trigger: { on: 'ally_hushed', ally: 'refugee' },
  },
  // The meter running low.
  {
    id: 'quill_low_integrity_a2_05',
    speaker: 'quill',
    expression: 'worried',
    text: 'Too many. Too many on the road.',
    trigger: { on: 'low_integrity' },
  },
]);
