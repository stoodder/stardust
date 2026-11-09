// Dev dialogue for the smoke flows and agents (`__sd.dialogue`, only with `?test=1`): a cue scene
// with a choice (it pauses play), a full-screen scene, and a bark with a reply button. Never in the
// registries, so the game never plays them; dev.test.ts validates them like real dialogue.
import { defineBarks, defineScene, defineScenes } from '../../content/dialogue/define.ts';

export const DEV_SCENES = defineScenes([
  defineScene('a1_m01_cue_dev_survey', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: 'Quick survey, Technician! How is your first shift going?',
    },
    { kind: 'line', speaker: 'bricks', text: 'Careful. It logs everything.' },
    {
      kind: 'choice',
      options: [
        { text: 'Great, honestly.', tone: 'earnest', goto: 'great' },
        { text: 'Ask me after lunch.', tone: 'wry', goto: 'lunch' },
        { text: '...', tone: 'quiet', goto: 'quiet' },
      ],
    },
    {
      label: 'great',
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: 'Logged as: thriving!',
    },
    { kind: 'end' },
    {
      label: 'lunch',
      kind: 'line',
      speaker: 'quill',
      expression: 'policy',
      text: 'Lunch is at noon. (Per policy.)',
    },
    { kind: 'end' },
    {
      label: 'quiet',
      kind: 'line',
      speaker: 'bricks',
      expression: 'happy',
      text: 'Quiet one. I like that.',
    },
    { kind: 'end' },
  ]),
  defineScene('a1_m01_scene_dev_party', [
    {
      kind: 'line',
      speaker: 'narrator',
      text: 'Dome 1, the break room. Someone brought a cake shaped like a turret.',
    },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "Surprise! It's nobody's birthday. I checked twice.",
    },
    { kind: 'line', speaker: 'bricks', text: "It's a good cake, Sprout. Don't tell it I said so." },
    { kind: 'line', speaker: 'player', expression: 'happy', text: '(You take the biggest slice.)' },
  ]),
  defineScene('a1_m01_cue_dev_knock', [
    { kind: 'line', speaker: 'quill', expression: 'happy', text: 'Lettuce!' },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "Lettuce in, it's cold out here! ...That's the joke.",
    },
  ]),
]);

export const DEV_BARKS = defineBarks([
  {
    id: 'quill_map_start_a1_99',
    speaker: 'quill',
    expression: 'happy',
    text: 'Knock knock!',
    trigger: { on: 'map_start' },
    button: { label: "Who's there?", reply: 'a1_m01_cue_dev_knock' },
  },
]);
