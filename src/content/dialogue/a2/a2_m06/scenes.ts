// A2M6 · Sundown: scenes (story/campaign/act2.md § A2M6, *Story delivery*), verbatim. Ids are
// `a2_m06_<slot>` (style-guide.md § 5.3); tools/dialogueCanon.test.ts checks each against act2.md
// § A2M6. Everyone on the wall as the sun goes down: Ves'thara fights beside Bricks, Pebble cheers
// from the dome, Sterling is afraid for once, and as W12's build phase opens, in full Long Night
// darkness (the map's lighting reaches it as W11 starts; balance/a2m6.test.ts checks every
// reference run), Goldie puts the lights out in Dome 3 and QUILL forgets the end of its joke. The
// debrief is Ishael: Ves'thara's mother, sung into the oldest chamber, in the shapes we broke. The
// stinger closes Act II over the dark.
import { defineScene, defineScenes } from '../../define.ts';

export const scenes = defineScenes([
  // The briefing: the alliance, and QUILL's threat intel (the Sundown foreshadowed, maps.md § 6.3).
  defineScene('a2_m06_brief', [
    {
      kind: 'line',
      speaker: 'vesthara',
      text: 'Tonight I fight beside the Old Soldier. Do not make me regret it, Thorn.',
    },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: 'Splitting shapes and flickering flyers. And then the sun goes down.',
    },
  ]),
  defineScene('a2_m06_w02', [
    {
      kind: 'line',
      speaker: 'vesthara',
      expression: 'sad',
      text: 'It is not hungry. It is lonely. When you are dead, those are the same thing.',
    },
  ]),
  // Pebble, from the dome.
  defineScene('a2_m06_w04', [
    { kind: 'line', speaker: 'pebble', expression: 'happy', text: "Keep 'em off the perimeter!" },
  ]),
  defineScene('a2_m06_w06', [
    { kind: 'line', speaker: 'bricks', text: 'Everybody on the wall. Even the fancy one.' },
    { kind: 'line', speaker: 'vesthara', text: 'I heard that.' },
  ]),
  // Sterling's moment of fear, before the Rift Moth flock.
  defineScene('a2_m06_w09', [
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'worried',
      text: "Do you know what happens to people who miss targets, Four-Forty-Seven? Neither do I. Nobody's ever seen one.",
    },
  ]),
  // Full dark (W12's build phase): lights out in Dome 3, and QUILL loses the punchline.
  defineScene('a2_m06_w12', [
    {
      kind: 'line',
      speaker: 'goldie',
      text: "Lights out in Dome 3. Pebble's asleep in the butterheads. Don't let anything wake her.",
    },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: "Knock knock. ...I've forgotten the rest. That's never happened before.",
    },
  ]),
  // The debrief: Ishael. Bricks has nothing for a long beat, then the only thing there is. On a
  // loss, Bricks sends the player back up.
  defineScene('a2_m06_debrief', [
    { kind: 'branch', cond: { outcome: 'lost' }, goto: 'lost' },
    {
      kind: 'line',
      speaker: 'vesthara',
      expression: 'sad',
      text: 'Rig Nine bored into the oldest chamber. The Watch sang our dead there. My mother, Ishael, among them.',
    },
    {
      kind: 'line',
      speaker: 'vesthara',
      expression: 'sad',
      text: 'She is in it now. In the shapes we broke tonight. I have been fighting for her for three years.',
    },
    { kind: 'line', speaker: 'bricks', text: '', durationSec: 2 },
    { kind: 'line', speaker: 'bricks', expression: 'sad', text: "...I'm sorry." },
    { kind: 'line', speaker: 'vesthara', text: 'Do not be sorry, Old Soldier. Be awake.' },
    { kind: 'end' },
    {
      label: 'lost',
      kind: 'line',
      speaker: 'bricks',
      text: "Wall's still standing. So are we. Back up there, Thorn.",
    },
  ]),
  // Act II's close, after Results (content/dialogue/resultsFlow.ts): no memo from Sterling, only
  // the dark, the PA's shift change, and the jingle once in its minor arrangement (played as the
  // caption shows, `afterResultsJingle`), left to ring out before the base.
  defineScene('a2_m06_scene_stinger', [
    { kind: 'line', speaker: 'narrator', text: '', durationSec: 2 },
    { kind: 'line', speaker: 'pa', text: 'Shift change.' },
    {
      kind: 'line',
      speaker: 'narrator',
      text: 'The jingle plays once, over the dark. In minor.',
    },
    { kind: 'line', speaker: 'narrator', text: '', durationSec: 3 },
  ]),
]);
