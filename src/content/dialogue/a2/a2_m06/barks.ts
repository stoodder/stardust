// A2M6 · Sundown: map-scoped barks (story/campaign/act2.md § A2M6, *Barks*), verbatim. They fire
// only on this map; Act II's act-wide pool is ../../barks/act2.ts. Ids end `_a2_06` (this map).
// Ves'thara is the companion, so hers play.
import { defineBarks } from '../../define.ts';

export const barks = defineBarks([
  // The first Prism Spire built after W8 (from W9's build phase, whose radio is seen as it ends).
  {
    id: 'vesthara_tower_built_a2_06',
    speaker: 'vesthara',
    text: 'Build the Spire there. I will hold the light.',
    trigger: { on: 'tower_built', tower: 'prism' },
    when: { seen: 'a2_m06_w09' },
    once: 'map',
  },
  // The first Fracture.
  {
    id: 'vesthara_new_enemy_a2_06',
    speaker: 'vesthara',
    text: 'It breaks. It does not end. Remember that.',
    trigger: { on: 'new_enemy', enemy: 'fracture' },
  },
  // A wave with nothing through to the domes.
  {
    id: 'vesthara_perfect_wave_a2_06',
    speaker: 'vesthara',
    text: 'Good. Again.',
    trigger: { on: 'perfect_wave' },
  },
]);
