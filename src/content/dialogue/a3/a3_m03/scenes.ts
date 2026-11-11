// A3M3 · The Gap: scenes (story/campaign/act3.md § A3M3, *Story delivery*), verbatim. Ids are
// `a3_m03_<slot>` (style-guide.md § 5.3); tools/dialogueCanon.test.ts checks each against act3.md
// § A3M3. The second tear beat: Bricks's farewell, played straight from the briefing on.
// - The briefing: the jar for Pebble, the Amended Survey, "Why'd you really come out here?" (the
//   arrival echo: Bricks notices when the answer isn't your file's `arrival_reason`), and C3 (its
//   options set `door_choice`, committed as the briefing closes, held 700 ms; app/dialogue.ts). A
//   door already chosen is never asked again: on a replay the briefing ends after the echo.
// - The radio: W2, W4, W8 Bricks (more polite as it goes); W6 the door's own people (Goldie for the
//   convoy, Bramble for the warren, translated by Ves'thara).
// - The last name tag (`a3_m03_cue_name_tag`, cued as W10's countdown opens): `{name}`, on the newest
//   turret, in his handwriting (story/tags.ts `latest`).
// - QUILL's vitals cue (W13's start, Bricks at 25%), the SEAL cue (W14's start; it plays the same at
//   any score), and the line after 20 s of the SEAL waiting (`a3_m03_cue_seal_wait`, real time,
//   once; app/forcedInput.ts).
// No debrief: Results reads "Held." (T614).
import { defineScene, defineScenes } from '../../define.ts';

const DOOR_CHOSEN = {
  any: [
    { flag: 'door_choice', eq: 'convoy' },
    { flag: 'door_choice', eq: 'warren' },
  ],
} as const;

export const scenes = defineScenes([
  defineScene('a3_m03_brief', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Take this home, Pebble. It's someone. I kept 'em in a jar for fifteen years like a fool.",
    },
    // The Amended Survey, in his hand.
    { kind: 'line', speaker: 'bricks', text: 'Correction: they were singing.' },
    { kind: 'line', speaker: 'bricks', text: "Why'd you really come out here, Thorn?" },
    {
      kind: 'choice',
      options: [
        { text: 'The signing bonus.', tone: 'quiet', goto: 'bonus' },
        { text: 'Money for my family.', tone: 'earnest', goto: 'family' },
        { text: 'Honestly? The lettuce.', tone: 'wry', goto: 'lettuce' },
      ],
    },
    { label: 'bonus', kind: 'line', speaker: 'bricks', text: 'Ha. Me too, nineteen years back.' },
    { kind: 'branch', cond: { flag: 'arrival_reason', eq: 'bonus' }, goto: 'door', else: 'file' },
    {
      label: 'family',
      kind: 'line',
      speaker: 'bricks',
      text: "Yeah. Send 'em a picture of something nice.",
    },
    { kind: 'branch', cond: { flag: 'arrival_reason', eq: 'family' }, goto: 'door', else: 'file' },
    {
      label: 'lettuce',
      kind: 'line',
      speaker: 'bricks',
      expression: 'happy',
      text: 'Lettuce. Best answer I ever heard.',
    },
    { kind: 'branch', cond: { flag: 'arrival_reason', eq: 'lettuce' }, goto: 'door' },
    // The arrival echo: the answer isn't the one on the intake form.
    {
      label: 'file',
      kind: 'line',
      speaker: 'bricks',
      text: 'Not what your file says. ...Files lie. I wrote one.',
    },
    // C3, asked once (D141): a door already chosen ends the briefing here.
    { label: 'door', kind: 'branch', cond: DOOR_CHOSEN, goto: 'done' },
    { kind: 'line', speaker: 'bricks', text: 'Your call, Thorn. Which door do I hold?' },
    {
      kind: 'choice',
      options: [
        {
          text: "The convoy. Goldie's people.",
          tone: 'earnest',
          set: { door_choice: 'convoy' },
          remember: 'goldie',
        },
        {
          text: "The warren. Pebble's people.",
          tone: 'quiet',
          set: { door_choice: 'warren' },
          remember: 'chitterbloom',
        },
      ],
    },
    { label: 'done', kind: 'end' },
  ]),
  defineScene('a3_m03_w02', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Pebble's with Goldie. Told her to be good. She said no. Good kid.",
    },
  ]),
  defineScene('a3_m03_w04', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Stopped counting the days. Didn't seem like the important number anymore.",
    },
  ]),
  // The door's own people on the radio: Goldie for the convoy, Bramble (through Ves'thara) for the
  // warren.
  defineScene('a3_m03_w06', [
    { kind: 'branch', cond: { flag: 'door_choice', eq: 'warren' }, goto: 'warren' },
    {
      kind: 'line',
      speaker: 'goldie',
      expression: 'worried',
      text: "We're coming. Hold it. Please hold it.",
    },
    { kind: 'end' },
    {
      label: 'warren',
      kind: 'line',
      speaker: 'chitterbloom',
      text: "We're coming. Hold it. Please hold it.",
    },
  ]),
  // Getting more polite.
  defineScene('a3_m03_w08', [
    { kind: 'line', speaker: 'bricks', text: 'Thank you for the cover, Thorn. Much obliged.' },
  ]),
  // The last name tag: the plate over the newest turret reads {name}, in his handwriting.
  defineScene('a3_m03_cue_name_tag', [
    { kind: 'line', speaker: 'bricks', text: "This one's yours. Good turret. Doesn't quit." },
  ]),
  // W13's start, where his timeline puts him at 25%.
  defineScene('a3_m03_cue_vitals', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: "His vitals are dropping. I'm not permitted to— I'm telling you anyway.",
    },
  ]),
  // The SEAL (W14's start): the same at any Evacuated score. The only button is SEAL.
  defineScene('a3_m03_cue_seal', [
    { kind: 'line', speaker: 'bricks', text: "That's all we're getting through." },
    { kind: 'line', speaker: 'bricks', text: '(hum, six notes, slow)' },
    { kind: 'line', speaker: 'pebble', expression: 'singing', text: '(hum, six notes, along)' },
    { kind: 'line', speaker: 'bricks', text: 'Do it, {name}.' },
  ]),
  // After 20 s of the SEAL waiting, once (real time; app/forcedInput.ts).
  defineScene('a3_m03_cue_seal_wait', [
    { kind: 'line', speaker: 'bricks', text: "Kid. It's okay. Turns out I like this song." },
  ]),
]);
