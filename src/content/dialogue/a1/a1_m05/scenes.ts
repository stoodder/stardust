// A1M5 · Record Quarter: scenes (story/campaign/act1.md § A1M5, *Story delivery*), verbatim. Ids are
// `a1_m05_<slot>` (style-guide.md § 5.3). The Quarterly Results party is on, QUILL is in a party
// hat (its portrait variant on this map), the Joke of the Shift (w04) gets Bricks's verdict, the
// Matriarch is revealed at W9's countdown, and the Quiet Wave (C1) is cued as W10 starts by the map
// script (`a1_m05_cue_quiet_wave`): Bricks's "Clear it, Sprout." and Sterling's cheer, then
// nothing. The flow plays the party, then Results, then the stinger by name (T316); the debrief
// shows on the results card and reads *this run's* C1 (`thisRun`), so a replay's line matches the
// replay. Later payoffs read the saved flag.
import { defineScene, defineScenes } from '../../define.ts';

export const scenes = defineScenes([
  defineScene('a1_m05_brief', [
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: 'Quarterly Results party at the north gate, Four-Forty-Seven! Hats on. Pests are NOT on the guest list!',
    },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "I'm wearing a hat! Don't check the budget code.",
    },
    {
      kind: 'line',
      speaker: 'quill',
      text: 'Sensors show something big under the north road. Probably a party surprise!',
    },
  ]),
  defineScene('a1_m05_w03', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Second road's open. Watch both. Marguerite said I could only ever watch one thing. She had a point.",
    },
  ]),
  // Joke of the Shift, party edition: QUILL combines a joke and a compliment; Bricks rates the hat.
  defineScene('a1_m05_w04', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "Joke of the Shift, party edition! Why did the pest cross the perimeter? It didn't. You're very good at your job!",
    },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "...That's the joke. It's also a compliment. I'm allowed to combine them. I checked.",
    },
    { kind: 'line', speaker: 'bricks', text: "It's a good hat, QUILL." },
  ]),
  defineScene('a1_m05_w05', [
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: 'Q2 pest losses down 38%! Lettuce lost to pests: 40%! Insurance covers pests, so both numbers are super!',
    },
    // Calling W5 early piles its Haulers onto W4's Bunchlings (the harness's early-call run).
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Armor next. Don't call it early, Sprout. Haulers take a while to crack.",
    },
  ]),
  defineScene('a1_m05_w07', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Four hundred even. Round number. Don't like round numbers.",
    },
  ]),
  // The boss cue: the Matriarch is revealed as her wave's countdown begins.
  defineScene('a1_m05_w09', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: "That's not a surprise. That's a Matriarch. Codename: CHITTERBLOOM.",
    },
  ]),
  // The Quiet Wave (C1), as W10 starts (the map script's cue). Bricks lowers his cannon after this
  // line, a silent tell (allies never target the Quiet Wave). Then nothing.
  defineScene('a1_m05_cue_quiet_wave', [
    { kind: 'line', speaker: 'bricks', text: 'Clear it, Sprout.' },
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: "Let's finish strong, Four-Forty-Seven!",
    },
  ]),
  // Bricks's name tag (campaign.md § 6.3): Marguerite, on the earliest-built attacking turret.
  defineScene('a1_m05_cue_name_tag', [
    {
      kind: 'line',
      speaker: 'bricks',
      point: 'firstTower',
      text: "That one's Marguerite. Second wife. Twice the range, half the patience.",
    },
  ]),
  // The debrief: Bricks at map end, by this run's C1; on a loss, Sterling's pep.
  defineScene('a1_m05_debrief', [
    { kind: 'branch', cond: { outcome: 'lost' }, goto: 'lost' },
    { kind: 'branch', cond: { thisRun: 'spared_quiet_wave', eq: true }, goto: 'spared' },
    { kind: 'line', speaker: 'bricks', text: 'Good work.' },
    { kind: 'end' },
    { label: 'spared', kind: 'line', speaker: 'bricks', text: '...Sprout.' },
    { kind: 'line', speaker: 'bricks', text: 'Yeah. Okay.' },
    { kind: 'end' },
    {
      label: 'lost',
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: 'The party is postponed, not cancelled! Hats stay on, Four-Forty-Seven. Go again!',
    },
  ]),
  // The party (full-screen; the confetti and the record counter are the scene's staging, T316).
  defineScene('a1_m05_scene_party', [
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: "RECORD QUARTER! Top five percent, Four-Forty-Seven! I didn't check. I don't have to. I believe in you!",
    },
    {
      kind: 'line',
      speaker: 'kip',
      text: "Rematch next quarter, Sprout. I'm inventing a category. I've already won it.",
    },
    {
      kind: 'line',
      speaker: 'goldie',
      expression: 'happy',
      text: "Duchess has a party hat! It's a thimble. She's thrilled. You can tell because she's lettuce.",
    },
    {
      kind: 'line',
      speaker: 'zibzab',
      text: 'Price first: party hats, two stardust. Honestly, one. The other one is the party.',
    },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "Everyone's wearing a hat. This is the best day in my whole log!",
    },
    { kind: 'line', speaker: 'goldie', expression: 'happy', text: 'Dance, Sergeant!' },
    { kind: 'line', speaker: 'bricks', text: "I don't dance." },
    { kind: 'line', speaker: 'goldie', expression: 'happy', text: "You're tapping." },
    { kind: 'line', speaker: 'bricks', text: "That's a muscle condition." },
  ]),
  // The stinger, after Results: Rig Nine stops answering (six frames of something the wrong shape
  // are the scene's staging, T316), a held beat, and QUILL files it away.
  defineScene('a1_m05_scene_stinger', [
    { kind: 'line', speaker: 'narrator', text: 'Rig Nine. Status: not answering.' },
    { kind: 'line', speaker: 'narrator', text: '', durationSec: 2 },
    { kind: 'line', speaker: 'quill', expression: 'happy', text: 'Probably a smudge! Logging it.' },
  ]),
]);
