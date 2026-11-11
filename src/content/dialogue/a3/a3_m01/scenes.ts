// A3M1 · The Preserve: scenes (story/campaign/act3.md § A3M1, *Story delivery*), verbatim. Ids are
// `a3_m01_<slot>` (style-guide.md § 5.3); tools/dialogueCanon.test.ts checks each against act3.md
// § A3M1. The matriarch comes back as an ally and gets her name; Bramble speaks through
// Ves'thara's translation, so her lines carry her own portrait and plate (`chitterbloom`, "Bramble"
// from this map on) and Ves'thara's "She says" lines are Ves'thara's. Old Thrum speaks only if she
// was spared at A1M5 (`spared_quiet_wave`), through the same translation.
// - The radio reads C1 and C2: Bramble remembers the terraces at dusk (`held_fire_second_look`),
//   Ves'thara the warm stone sent home (`stardust_choice = returned`), and W10 is Thrum's group or
//   the memory of it.
// - The Leaving Song (`a3_m01_scene_song`) plays full-screen as a win ends, before Results
//   (content/dialogue/resultsFlow.ts): Pebble hums the six notes, Thrum with her if alive, QUILL
//   matches the melody, and the player answers. The C1 echo is the last line when spared; cleared,
//   the scene simply ends.
// - The debrief is the first gift stones: the warrens' Stardust, sung and warm (Results shows the
//   stones; T610).
import { defineScene, defineScenes } from '../../define.ts';

const SPARED = { flag: 'spared_quiet_wave', eq: true } as const;

export const scenes = defineScenes([
  // The briefing: the matriarch's terms, her name, the Scuttle Den (the briefing's gift), and
  // QUILL's threat intel (the Maw foreshadowed).
  defineScene('a3_m01_brief', [
    {
      kind: 'line',
      speaker: 'chitterbloom',
      text: 'You chased me off my own road. Now help me walk it.',
    },
    {
      kind: 'line',
      speaker: 'pebble',
      text: "Her name is Bramble. 'Chitterbloom' is a sun-lady word. (squeak)",
    },
    {
      kind: 'line',
      speaker: 'vesthara',
      text: 'A bramble is where small things hide from hawks. It is a good name for a mother.',
    },
    {
      kind: 'line',
      speaker: 'pebble',
      expression: 'happy',
      text: 'Her friends will dig for you. They dig very fast. (squeak)',
    },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: "Something in there is gathering them. Don't let it.",
    },
  ]),
  // C2's second look, remembered (A2M3: the hold-fire run on the fleeing groups).
  {
    id: 'a3_m01_w03',
    when: { flag: 'held_fire_second_look', eq: true },
    nodes: [
      {
        kind: 'line',
        speaker: 'chitterbloom',
        text: 'On the terraces, at dusk, you stopped. Some of mine walked home because you stopped.',
      },
    ],
  },
  // C2's stone, arrived (A2M4: Return).
  {
    id: 'a3_m01_w05',
    when: { flag: 'stardust_choice', eq: 'returned' },
    nodes: [
      {
        kind: 'line',
        speaker: 'vesthara',
        text: 'She says the warm stone you sent home arrived. She says it is good to be trusted.',
      },
    ],
  },
  defineScene('a3_m01_w07', [
    {
      kind: 'line',
      speaker: 'pebble',
      text: "(squeak) Bricks says 'keep 'em off the perimeter.' What is perimeter? Is it a friend?",
    },
  ]),
  // The first Maw, as it spawns (W4; the map script's `maw_cue`): Ves'thara's new-enemy line, a cue
  // because she translates on the radio but isn't a present speaker, so her bark couldn't play.
  defineScene('a3_m01_cue_maw', [
    {
      kind: 'line',
      speaker: 'vesthara',
      expression: 'worried',
      text: 'It takes them into itself. Break it before it is full.',
    },
  ]),
  // The third group: Old Thrum's, walking as W10 starts, if she was spared; else Pebble's memory.
  defineScene('a3_m01_w10', [
    { kind: 'branch', cond: SPARED, goto: 'spared', else: 'cleared' },
    {
      label: 'spared',
      kind: 'line',
      speaker: 'pebble',
      expression: 'happy',
      text: '(squeak) Grandmother!',
    },
    {
      kind: 'line',
      speaker: 'thrum',
      text: 'You are very tall. It must be lonely up there.',
    },
    { kind: 'end' },
    {
      label: 'cleared',
      kind: 'line',
      speaker: 'pebble',
      expression: 'sad',
      text: 'Grandmother walked with the small ones. The sky sang the Leaving Song that day.',
    },
  ]),
  // The Leaving Song (the first tear beat, sung not said): full-screen as a win ends, before
  // Results. Thrum hums with Pebble if she's alive; the C1 echo closes it if she was spared.
  defineScene('a3_m01_scene_song', [
    { kind: 'line', speaker: 'pebble', expression: 'singing', text: '(hum, six notes)' },
    { kind: 'branch', cond: SPARED, goto: 'thrum_hums', else: 'match' },
    {
      label: 'thrum_hums',
      kind: 'line',
      speaker: 'thrum',
      expression: 'singing',
      text: '(hum, six notes)',
    },
    { label: 'match', kind: 'line', speaker: 'quill', text: "Melody match: 'Everglow Bright.'" },
    {
      kind: 'line',
      speaker: 'pebble',
      text: 'This is the Leaving Song. The sky sings it when lots of us leave at once. You know it?',
    },
    {
      kind: 'choice',
      options: [
        { text: "I know it. I'm so sorry.", tone: 'earnest' },
        { text: "Everyone knows it. That's the problem.", tone: 'wry' },
        { text: '(hum along)', tone: 'quiet' },
      ],
    },
    {
      kind: 'line',
      speaker: 'vesthara',
      expression: 'sad',
      text: 'They thought you were mourning them.',
    },
    { kind: 'branch', cond: SPARED, goto: 'echo' },
    { kind: 'end' },
    { label: 'echo', kind: 'line', speaker: 'narrator', text: 'Old Thrum remembered.' },
  ]),
  // The debrief: the first gift stones. The warrens' Stardust, given (Results shows it as warm-gold
  // stones from here on; T610), and Zibzab's words from C2, back in Ves'thara's voice. On a loss,
  // Bramble sends you back down her road.
  defineScene('a3_m01_debrief', [
    { kind: 'branch', cond: { outcome: 'lost' }, goto: 'lost' },
    {
      kind: 'line',
      speaker: 'vesthara',
      text: 'She says: these are ours. Sung, and warm. Take them.',
    },
    {
      kind: 'line',
      speaker: 'vesthara',
      expression: 'sad',
      text: 'She says: the dead do not mind being useful. They mind being forgotten.',
    },
    { kind: 'end' },
    {
      label: 'lost',
      kind: 'line',
      speaker: 'chitterbloom',
      text: 'My young are still in there. So is my road. Walk it again.',
    },
  ]),
]);
