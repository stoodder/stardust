// A2M2 · The Glass Witch: scenes (story/campaign/act2.md § A2M2, *Story delivery*), verbatim. Ids
// are `a2_m02_<slot>` (style-guide.md § 5.3); tools/dialogueCanon.test.ts checks each against
// act2.md § A2M2. Act II's first boss and the player's first look at Ves'thara, through her
// lumenglass avatar: Sterling's "vandalism" stays cheerful, QUILL's "(Per policy.)" is for once
// correct, and the one voice that refuses to joke is hers. Her in-stage cues are map-script cues
// (map.ts `events`): at her spawn only for a player who spared the Quiet Wave (C1), then at 70%,
// 55%, and her retreat at 40%; each comes once a battle. Bricks names the player Thorn at the
// debrief, on a win.
import { defineScene, defineScenes } from '../../define.ts';

export const scenes = defineScenes([
  defineScene('a2_m02_brief', [
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: "Vandalism at the ridge rigs! That's the word. Vandalism. Write it on everything!",
    },
    // The threat intel: the shields, and the Zapcoil Zibzab gave away.
    {
      kind: 'line',
      speaker: 'quill',
      text: 'Shielded signatures. Your Zapcoil was free. It is about to earn it.',
    },
  ]),
  // "(Per policy.)" mid-line, so QUILL's portrait keeps its face (the tell flashes only on a line
  // that starts or ends with it).
  defineScene('a2_m02_w03', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: 'Rig integrity is my top priority. (Per policy.) Your integrity is also a priority. A close second.',
    },
  ]),
  // The domes on the west edge: decor she never goes near, and Bricks is the one who notices.
  defineScene('a2_m02_w06', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Whoever it is, they're not touching the domes. Not once. That's a choice.",
    },
  ]),
  defineScene('a2_m02_w09', [
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: "Insurers say 'vandalism.' Legal says 'vandalism.' So it's vandalism. Super!",
    },
  ]),
  // Her spawn, only if the Quiet Wave was spared (the map script's `when` reads C1).
  defineScene('a2_m02_cue_witch_spared', [
    {
      kind: 'line',
      speaker: 'vesthara',
      text: 'You let the small ones walk, once. I saw. It is why I have not struck you.',
    },
  ]),
  // 70%: she reads the counter aloud (the lifetime count plus this run's, story/text.ts). The
  // act's thesis, so it pauses the battle (a pausing panel, D134): heard, not glanced at.
  {
    id: 'a2_m02_cue_witch_counter',
    pause: true,
    nodes: [
      {
        kind: 'line',
        speaker: 'vesthara',
        text: 'You are the Counter. {pests_processed}. I have watched you count.',
      },
    ],
  },
  defineScene('a2_m02_cue_witch_strike', [
    {
      kind: 'line',
      speaker: 'vesthara',
      text: 'I do not strike your homes, Counter. Look at what I strike. Ask yourself why it bleeds light.',
    },
  ]),
  // Her retreat at 40%: the line that ends the map.
  defineScene('a2_m02_cue_witch_retreat', [
    {
      kind: 'line',
      speaker: 'vesthara',
      expression: 'sad',
      text: 'Keep shooting. You are very good at it. That has never been the question.',
    },
  ]),
  // The debrief, on a win: QUILL heard its own log in her mouth (her cues come close together at
  // the fight's pace, so its line waits for the card), then Bricks names the player Thorn (the
  // callsign beat; Waykeeper comes at A3M6). Sterling on a loss.
  defineScene('a2_m02_debrief', [
    { kind: 'branch', cond: { outcome: 'lost' }, goto: 'lost' },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: 'She read out my number. The exact one. ...How does she have my number?',
    },
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Sprout's grown some thorns. Thorn. That's you now. Don't let it go to your head.",
    },
    { kind: 'set', callsign: 'thorn' },
    { kind: 'end' },
    {
      label: 'lost',
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: 'The vandal won a round! Rounds are not quarters. Back up the ridge, Four-Forty-Seven!',
    },
  ]),
]);
