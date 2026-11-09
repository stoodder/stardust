// Act I `bank_nudge` (story/campaign/act1.md § Act I barks): QUILL's once-a-shift nudge to spend,
// on every Act I map (D059): a build phase from W2 on that opens with 250+ credits banked. Never a
// scold.
import { defineBarks } from '../define.ts';

export const bankNudge = defineBarks([
  {
    id: 'quill_bank_nudge_a1_10',
    speaker: 'quill',
    text: "Unspent budget detected! Credits can't shoot. I checked. Turrets can!",
    trigger: { on: 'bank_nudge' },
    when: { act: 1 },
  },
]);
