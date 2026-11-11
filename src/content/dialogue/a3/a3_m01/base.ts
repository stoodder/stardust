// A3M1 · The Preserve: its base scene (story/campaign/act3.md § A3M1, *Base scene*), verbatim:
// Bricks's survey confession (twist layer 6), its own beat after the Leaving Song. act3.md's
// `base_a3_survey` files as `a3_m01_base_survey` (style-guide.md § 5.3); app/baseScenes.ts plays
// it on the first base visit after A3M1 is won. Pebble is asleep in his pocket throughout.
import { defineScene, defineScenes } from '../../define.ts';

export const scenes = defineScenes([
  defineScene('a3_m01_base_survey', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Got something to say, Thorn. Should've said it fifteen years ago.",
    },
    {
      kind: 'line',
      speaker: 'bricks',
      expression: 'sad',
      text: "I wrote 'vocalizations: non-linguistic.' I heard 'em, kid. I heard 'em singing, and I wrote that.",
    },
    { kind: 'line', speaker: 'bricks', text: 'Not knowing is a choice. I kept making it.' },
    {
      kind: 'choice',
      options: [
        { text: 'Then write it again. Right, this time.', tone: 'earnest', goto: 'earnest' },
        { text: 'Fifteen years is a long time not to ask.', tone: 'wry', goto: 'wry' },
        { text: '...', tone: 'quiet', goto: 'quiet' },
      ],
    },
    { label: 'earnest', kind: 'line', speaker: 'bricks', text: '...Yeah. Working on it.' },
    { kind: 'line', speaker: 'pebble', text: '(squeak, asleep)' },
    { kind: 'end' },
    {
      label: 'wry',
      kind: 'line',
      speaker: 'bricks',
      text: 'Longer than both my marriages. Put together.',
    },
    { kind: 'line', speaker: 'pebble', text: '(squeak, asleep)' },
    { kind: 'end' },
    { label: 'quiet', kind: 'line', speaker: 'bricks', text: '', durationSec: 2 },
    { kind: 'line', speaker: 'bricks', text: "Yeah. That's about right." },
    { kind: 'line', speaker: 'pebble', text: '(squeak, asleep)' },
  ]),
]);
