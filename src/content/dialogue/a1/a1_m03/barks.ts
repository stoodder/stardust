// A1M3 · Special Delivery: map-scoped barks (story/campaign/act1.md § A1M3, *Barks*), verbatim. They
// fire only on this map; act-wide pools live in ../../barks/. Ids end `_a1_03` (this map), so no other
// Act I map's ids collide with them. Gerald's own status text
// ("DELIVERY: ATTEMPTED. RECIPIENT: ARMED.") isn't a bark: he is never on the radio.
import { defineBarks } from '../../define.ts';

export const barks = defineBarks([
  // Gerald hit (only an aimed shot counts, D072): two gentle reminders, one a hit, never a scold.
  {
    id: 'quill_neutral_hit_a1_03',
    speaker: 'quill',
    expression: 'worried',
    text: 'Do NOT shoot Gerald. Gerald is the mail.',
    trigger: { on: 'neutral_hit' },
  },
  {
    id: 'quill_neutral_hit_again_a1_03',
    speaker: 'quill',
    expression: 'worried',
    text: "Hold Fire, please, Technician. He's doing his best.",
    trigger: { on: 'neutral_hit' },
  },
  {
    id: 'quill_hold_fire_used_a1_03',
    speaker: 'quill',
    expression: 'happy',
    text: "Thank you! Gerald thanks you. Gerald can't talk.",
    trigger: { on: 'hold_fire_used' },
  },
  {
    id: 'quill_new_enemy_a1_03',
    speaker: 'quill',
    expression: 'happy',
    text: "Flying pests! They're fluffy. Don't let that stop you!",
    trigger: { on: 'new_enemy', enemy: 'puffwing' },
  },
]);
