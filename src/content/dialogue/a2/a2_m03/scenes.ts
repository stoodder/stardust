// A2M3 · Second Look: scenes (story/campaign/act2.md § A2M3, *Story delivery*), verbatim. Ids are
// `a2_m03_<slot>` (style-guide.md § 5.3); tools/dialogueCanon.test.ts checks each against act2.md
// § A2M3. The map where the player understands, by sight: A1M2's terraces at dusk, the Haulers'
// sacks full of young, and Pebble on the Peeker's rock. Nobody explains anything. Bricks keeps
// telling the player where to look and looking himself; QUILL hesitates on the record; Sterling
// would like a little less looking. The rescue cue is the player's own click (or W6's clear, the
// map script's fallback, so it always lands); Bricks names her at W7, QUILL declines to log it, and
// the debrief is his pension, read aloud. Pebble's name plate reads "???" until he names her, and
// his portrait carries her in his pocket from the rescue on (speakers.ts, D103).
import { defineScene, defineScenes } from '../../define.ts';

export const scenes = defineScenes([
  defineScene('a2_m03_brief', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: 'Same terraces. Different day. Keep your eyes on the path, Thorn.',
    },
  ]),
  defineScene('a2_m03_w02', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Don't look at the eggs, Thorn. Look at the path. ...I said look at the path.",
    },
  ]),
  // Before the Warden: the Haulers have just walked out with their sacks. Plain words, no tell:
  // QUILL says the policy out loud instead of hiding behind it.
  defineScene('a2_m03_w04', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: "Per policy, I am required to classify those as 'cargo.' I would like the record to show that I hesitated.",
    },
  ]),
  defineScene('a2_m03_w06', [
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: 'Love the thoroughness, Four-Forty-Seven! Maybe a little less looking, a little more processing?',
    },
  ]),
  // After the rescue (it lands by W6's clear at the latest): he names her, and QUILL's first
  // disobedience.
  defineScene('a2_m03_w07', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "You keep following me. Pebble. That's you. It's a rock thing.",
    },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: "Naming a pest violates Handbook Section 12.4. ...I've decided not to log it. I don't know why I said that out loud.",
    },
  ]),
  defineScene('a2_m03_w09', [
    {
      kind: 'line',
      speaker: 'goldie',
      expression: 'worried',
      text: "There's grey creeping into Dome 3's soil. Plants know when something's wrong. People take longer.",
    },
  ]),
  // The rescue (design/core-loop.md § 6.9): the player's click on the rock, or W6's clear. A brief
  // pause; she isn't named yet.
  defineScene('a2_m03_cue_pebble', [
    { kind: 'line', speaker: 'pebble', expression: 'worried', text: '(squeak)' },
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Small Fry. On your own? ...Pocket's got room. Just till we find her folks.",
    },
    { kind: 'line', speaker: 'pebble', text: '(squeak, smaller)' },
  ]),
  // Bricks's name tag (campaign.md § 6.3): Auntie Funmi, on the earliest-built attacking turret.
  defineScene('a2_m03_cue_name_tag', [
    {
      kind: 'line',
      speaker: 'bricks',
      point: 'firstTower',
      text: "That one's Auntie Funmi. Raised me. Wrote every month for ten years. Then she didn't.",
    },
  ]),
  // The debrief: on a win Bricks reads the memo that's waiting (memo_a2_03) and laughs, once. On a
  // loss, the terraces will keep.
  defineScene('a2_m03_debrief', [
    { kind: 'branch', cond: { outcome: 'lost' }, goto: 'lost' },
    {
      kind: 'line',
      speaker: 'bricks',
      text: "'Pension Restructuring Opportunity.' Nineteen years, restructured into a coupon. Ha.",
    },
    { kind: 'end' },
    {
      label: 'lost',
      kind: 'line',
      speaker: 'bricks',
      text: 'The terraces will keep. Go again, Thorn.',
    },
  ]),
]);
