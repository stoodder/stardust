// A1M4 · The Audit: map-scoped barks (story/campaign/act1.md § A1M4, *Barks*), verbatim. They
// fire only on this map; act-wide pools live in ../../barks/. Ids end `_a1_04` (this map), so no
// other Act I map's ids collide with them.
import { defineBarks } from '../../define.ts';

export const barks = defineBarks([
  // Zibzab rides along this shift: the sale is his whole personality.
  {
    id: 'zibzab_map_start_a1_04',
    speaker: 'zibzab',
    expression: 'happy',
    text: "Clearance Sale! Everything must go. Not you. You're not for sale. Yet.",
    trigger: { on: 'map_start' },
  },
  {
    id: 'zibzab_tower_built_zapcoil_a1_04',
    speaker: 'zibzab',
    text: 'Ten percent better than new. Honestly, eight. The ten is marketing.',
    trigger: { on: 'tower_built', tower: 'zapcoil' },
  },
  {
    id: 'quill_new_enemy_elder_a1_04',
    speaker: 'quill',
    expression: 'happy',
    text: 'Elder! Slow, old, and in the way. Clear it first for efficiency!',
    trigger: { on: 'new_enemy', enemy: 'elder' },
  },
]);
