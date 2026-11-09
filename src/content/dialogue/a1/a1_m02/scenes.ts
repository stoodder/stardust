// A1M2 · Hatching Season: scenes (story/campaign/act1.md § A1M2, *Story delivery*), verbatim. Ids are
// `a1_m02_<slot>` (style-guide.md § 5.3). `a1_m02_cue_name_tag` plays at Bricks's tag moment (the
// first wave clear with an attacking turret standing; story/tags.ts), the playfield pinging the
// turret he means (D059). The debrief shows on the results card (app/runResult.ts).
import { defineScene, defineScenes } from '../../define.ts';

export const scenes = defineScenes([
  defineScene('a1_m02_brief', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: 'Sensors show something big and sparkly on the terraces. Sparkly is good! Usually!',
    },
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Hatching season. Everything's out and about. Keep your eyes on the path, Sprout.",
    },
  ]),
  // The shift's start, the first battle the save brings the newly issued Sprinkler into (D061):
  // app/dialogue.ts plays `<map>_cue_issued_<tower>` for each newly issued tower.
  defineScene('a1_m02_cue_issued_sprinkler', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: 'New hardware! The Frostline Sprinkler chills pests. (Gently!) Set it by a Thumper: chilled pests are Sitting Ducks!',
    },
  ]),
  defineScene('a1_m02_w02', [
    {
      kind: 'line',
      speaker: 'kip',
      expression: 'happy',
      text: "Kip Vandermeer. 'The Exterminator.' Number one on the Bounty Board, three quarters running. Don't get comfy at two.",
    },
  ]),
  // Policy placement: the tell ends its own line (style-guide § 5.6), so the shrug is a second one.
  defineScene('a1_m02_w03', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'policy',
      text: 'Suggested build site: beside Extraction Rig 3. (Per policy.)',
    },
    { kind: 'line', speaker: 'quill', text: 'The housing block will be fine. Probably!' },
  ]),
  // Joke of the Shift: the setup, the punchline, and Bricks's fact-check, which answers it (D028).
  defineScene('a1_m02_w04', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: 'Joke of the Shift! Why did the scarecrow get Employee of the Month? He was outstanding in his field.',
    },
    {
      kind: 'line',
      speaker: 'quill',
      text: "That's the joke. He's real, by the way. Terrace 2. He's been out there since 2349. I worry about him.",
    },
    { kind: 'line', speaker: 'bricks', text: 'Fewer complaints than Kip.' },
  ]),
  defineScene('a1_m02_w05', [
    {
      kind: 'line',
      speaker: 'kip',
      text: "Pro tip: Brood Haulers. Big bounty, slow, never shoot back. I hold the record. 'Most Haulers, Before Lunch.'",
    },
  ]),
  defineScene('a1_m02_w07', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Four hundred and twelve days to pension. Then it's me, a hammock, and a planet with zero bugs on it.",
    },
  ]),
  // Bricks's name tag (campaign.md § 6.3): Denise, on the earliest-built attacking turret standing.
  defineScene('a1_m02_cue_name_tag', [
    {
      kind: 'line',
      speaker: 'bricks',
      point: 'firstTower',
      text: "That one's Denise. After my first wife. Keeps her distance, fires on schedule, never calls.",
    },
  ]),
  // The debrief: Kip on a win (his signing bonus if yours was too), or Bricks's support on a loss.
  defineScene('a1_m02_debrief', [
    { kind: 'branch', cond: { outcome: 'lost' }, goto: 'lost' },
    { kind: 'line', speaker: 'kip', expression: 'happy', text: 'Nice wave, Sprout! For a two.' },
    {
      kind: 'line',
      speaker: 'kip',
      text: "New record, by the way. 'Most Records Set, Terraces Division.' I made the division.",
    },
    { kind: 'branch', cond: { flag: 'arrival_reason', eq: 'bonus' }, goto: 'bonus' },
    { kind: 'end' },
    { label: 'bonus', kind: 'line', speaker: 'kip', text: 'Signing bonus? Me too. Spent it.' },
    { kind: 'end' },
    {
      label: 'lost',
      kind: 'line',
      speaker: 'bricks',
      text: "Reset and go again, Sprout. The Haulers aren't going anywhere. Neither am I.",
    },
  ]),
]);
