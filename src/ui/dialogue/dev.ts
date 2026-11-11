// Dev dialogue for the smoke flows and agents (`__sd.dialogue`, only with `?test=1`): a cue scene
// with a choice (it pauses play), C3's door choice, a full-screen scene, the Asset Yield Log's
// staging (T614), a bark with a reply button, and Act III part two's shapes (T713: A3M5's intel
// under Rewrite, a QUILL bark, Purge's blinking silence). Never in the registries, so the game never plays
// them; dev.test.ts validates them like real dialogue.
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
  // Last, so the scenes above keep their places. C3's shape (T610; A3M3's briefing): a choice whose options set `door_choice`, so the smoke
  // flows can commit a door (and see its 700 ms lock) before A3M3's own briefing is registered.
  // It ends (and commits) on the pick.
  defineScene('a1_m01_cue_dev_door', [
    { kind: 'line', speaker: 'bricks', text: 'Your call, Thorn. Which door do I hold?' },
    {
      kind: 'choice',
      options: [
        { text: 'The convoy road.', tone: 'earnest', set: { door_choice: 'convoy' } },
        { text: 'The warren tunnel.', tone: 'quiet', set: { door_choice: 'warren' } },
      ],
    },
  ]),
  // The Asset Yield Log's staging (staging.ts `yield_log`, T614) over stand-in lines, so the smoke
  // flow sees the scroll and its first-pass lock before A3M2's own scene is written.
  defineScene('a1_m01_scene_dev_yield_log', [
    { kind: 'line', speaker: 'quill', text: 'I thought it was inventory.' },
    { kind: 'line', speaker: 'system', text: 'DIRECTIVE 3: LOG ASSET YIELD.' },
    { kind: 'line', speaker: 'quill', text: "Don't decide about me yet." },
  ]),
  // A3M5's shape under C4 Rewrite (T713; the real lines are T721's): QUILL's intel, then
  // `system`'s. With QUILL offline only `system` speaks; with it online both do.
  defineScene('a1_m01_cue_dev_intel', [
    {
      kind: 'line',
      speaker: 'quill',
      text: "Jammers inbound. Prim's model. I'm sorry it's her face.",
    },
    {
      kind: 'line',
      speaker: 'system',
      text: 'Threat Advisory: Auditor units inbound. Jamming expected.',
    },
  ]),
  // Purge's QUILL in a panel (T713; Night Shift's "no line; its status bar blinks"): a silence.
  defineScene('a1_m01_base_dev_status', [
    { kind: 'line', speaker: 'quill', text: '', durationSec: 4 },
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
  // A QUILL bark to cue on A3M5 (T713): silent while it is offline.
  {
    id: 'quill_boss_phase_a1_98',
    speaker: 'quill',
    text: "Directive conflict. I'm— helping you anyway.",
    trigger: { on: 'boss_phase' },
  },
]);
