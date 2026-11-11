// A3M4 · Empty Slot: map-scoped barks (story/campaign/act3.md § A3M4, *Silence* and *Barks*),
// verbatim. They fire only on this map; ids end `_a3_04`. Bricks is absent, so his are authored
// silences: his frame lights dark for 3 s with no text as the map starts and as the first wave is
// cleared (where he would have named a turret); a silence plays for an absent speaker
// (story/barks.ts). The W2 silence is a radio slot (scenes.ts `a3_m04_w02`).
import { defineBarks } from '../../define.ts';

export const barks = defineBarks([
  {
    id: 'bricks_map_start_a3_04',
    speaker: 'bricks',
    text: '',
    durationSec: 3,
    trigger: { on: 'map_start' },
  },
  {
    id: 'bricks_wave_cleared_a3_04',
    speaker: 'bricks',
    text: '',
    durationSec: 3,
    trigger: { on: 'wave_cleared' },
  },
  {
    id: 'quill_new_enemy_a3_04',
    speaker: 'quill',
    expression: 'worried',
    text: 'That one makes things quiet. Reboot as it reaches out. Before it lands, please.',
    trigger: { on: 'new_enemy', enemy: 'silencer' },
  },
  {
    id: 'quill_perfect_wave_a3_04',
    speaker: 'quill',
    text: "Clean wave. He'd have said something gruff. I'll leave a gap.",
    trigger: { on: 'perfect_wave' },
  },
]);
