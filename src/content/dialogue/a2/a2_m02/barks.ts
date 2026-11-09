// A2M2 · The Glass Witch: map-scoped barks (story/campaign/act2.md § A2M2, *Barks*), verbatim. They
// fire only on this map; Act II's act-wide pool is ../../barks/act2.ts (QUILL's runner and hush
// lines play here too; Bricks's jingle doesn't, since QUILL is the companion). Ids end `_a2_02`
// (this map).
import { defineBarks } from '../../define.ts';

export const barks = defineBarks([
  // A wave with nothing through to the relay or the rigs.
  {
    id: 'quill_perfect_wave_a2_02',
    speaker: 'quill',
    expression: 'happy',
    text: "Both rigs intact! (Per policy.) Also, you're intact. Also good.",
    trigger: { on: 'perfect_wave' },
  },
  // The first Glimmer the save meets (W2, the shield teach).
  {
    id: 'quill_new_enemy_a2_02',
    speaker: 'quill',
    expression: 'happy',
    text: "Shielded! Energy breaks shields. Zapcoils are energy. You see where I'm going.",
    trigger: { on: 'new_enemy', enemy: 'glimmer' },
  },
]);
