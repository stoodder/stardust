// Act I `wave_cleared` pool (story/campaign/act1.md § Act I barks): the jingle after a clear, from
// A1M3 on (A1M1's own jingle barks come first), for whoever is on the radio. QUILL's first jingle
// and Bricks's "That jingle. Every time." stay A1M1's.
import { defineBarks } from '../define.ts';
import type { Condition } from '../types.ts';

const ACT1_LATE: Condition = { all: [{ act: 1 }, { mapAtLeast: 'a1_m03' }] };

export const waveCleared = defineBarks([
  {
    id: 'quill_wave_cleared_a1_10',
    speaker: 'quill',
    expression: 'happy',
    text: '(humming along) Ev-er-glow! I learned the harmony. Nobody asked me to!',
    trigger: { on: 'wave_cleared' },
    when: ACT1_LATE,
  },
  {
    id: 'bricks_wave_cleared_a1_10',
    speaker: 'bricks',
    text: "That jingle's in my head now. If you hear humming, it isn't me.",
    trigger: { on: 'wave_cleared' },
    when: ACT1_LATE,
  },
  {
    id: 'bricks_wave_cleared_a1_11',
    speaker: 'bricks',
    text: 'Nineteen years of that jingle. Nineteen.',
    trigger: { on: 'wave_cleared' },
    when: ACT1_LATE,
  },
  {
    id: 'zibzab_wave_cleared_a1_10',
    speaker: 'zibzab',
    text: 'That jingle again. Price first: Zibzab would pay you to unplug it.',
    trigger: { on: 'wave_cleared' },
    when: ACT1_LATE,
  },
]);
