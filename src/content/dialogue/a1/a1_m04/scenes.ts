// A1M4 · The Audit: scenes (story/campaign/act1.md § A1M4, *Story delivery*), verbatim. Ids are
// `a1_m04_<slot>` (style-guide.md § 5.3). Prim audits the shift from the podium, Sterling has your
// back, and the Joke of the Shift (w03) gets fact-checked by the auditor instead of Bricks. The
// debrief shows on the results card (app/runResult.ts).
import { defineScene, defineScenes } from '../../define.ts';

export const scenes = defineScenes([
  defineScene('a1_m04_brief', [
    {
      kind: 'line',
      speaker: 'prim',
      text: 'Compliance Officer Prim. Audit 2361-Q2-447. Please continue working. I will be watching your face.',
    },
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: "Smiling is mandatory! (Kidding! It's in your contract, though.)",
    },
    { kind: 'line', speaker: 'prim', text: 'Smiling detected at 61% of mandated sincerity.' },
  ]),
  // Joke of the Shift, for the audit: the auditor measures the punchline.
  defineScene('a1_m04_w03', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "Joke of the Shift, for the audit! Why did the auditor cross the road? To measure it. 6.2 meters. ...That's the joke.",
    },
    { kind: 'line', speaker: 'prim', text: '6.1.' },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "I'm contractually obligated to tell a joke every shift. Not to land one. That's a loophole!",
    },
  ]),
  defineScene('a1_m04_w04', [
    {
      kind: 'line',
      speaker: 'sterling',
      text: "Auditor Prim, Four-Forty-Seven is the best technician on this rock. Dock {their} pay and you'll have to dock mine.",
    },
  ]),
  // QUILL's policy pick, then Zibzab's doubt right behind it: the tell, and someone noticing it.
  defineScene('a1_m04_w05', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'policy',
      text: "Suggested build site: beside the billboards. They're very valuable! (Per policy.)",
    },
    {
      kind: 'line',
      speaker: 'zibzab',
      text: "Your grid says 'per policy' like I say 'price first.' Difference is, I always tell you the price.",
    },
  ]),
  defineScene('a1_m04_w06', [
    {
      kind: 'line',
      speaker: 'goldie',
      expression: 'worried',
      text: 'Memo says pests ate forty percent of the crop. Weird! I count every head. They walked right past Duchess.',
    },
  ]),
  defineScene('a1_m04_w07', [
    {
      kind: 'line',
      speaker: 'prim',
      text: 'Observation: Technician has blinked 1,140 times this shift. Recommended maximum: 900. Noted.',
    },
  ]),
  defineScene('a1_m04_w08', [
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: 'Tier approvals are on me, Four-Forty-Seven. My signature, my risk!',
    },
  ]),
  // The debrief: Sterling files Prim's report, Kip holds the record; on a loss, Sterling's pep.
  defineScene('a1_m04_debrief', [
    { kind: 'branch', cond: { outcome: 'lost' }, goto: 'lost' },
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: "Prim filed a report. I filed it under 'recycling.' Super!",
    },
    {
      kind: 'line',
      speaker: 'kip',
      text: "Audited, huh? I hold that record. 'Fewest Blinks Under Audit.' Prim didn't count them. I did.",
    },
    { kind: 'end' },
    {
      label: 'lost',
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: "Prim's report says 'room for growth.' Growth is our whole brand, Four-Forty-Seven! Go again!",
    },
  ]),
]);
