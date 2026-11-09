// A2M1 · Rig Nine: scenes (story/campaign/act2.md § A2M1, *Story delivery*), verbatim. Ids are
// `a2_m01_<slot>` (style-guide.md § 5.3); tools/dialogueCanon.test.ts checks each against
// act2.md § A2M1. The first Act II map: the same voices, fewer jokes landing. QUILL's firmware
// update (Spare runners) is cued as the build phase opens, after the briefing (the map script's
// `a2_m01_cue_spare_runners`), so the filter is taught while the HUD is in view; its crew-log line
// is cued by the first crew log the drone recovers, or by W6's countdown if none is by then (a cue
// scene plays once a battle, so a later log doesn't repeat it).
import { defineScene, defineScenes } from '../../define.ts';

export const scenes = defineScenes([
  defineScene('a2_m01_brief', [
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: 'Minor operational hiccup at Rig Nine! Super minor. Hiccup-sized. Go take a peek, Four-Forty-Seven!',
    },
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Rig crew's been quiet four days. Quiet's not a status, Sprout. Quiet's a symptom.",
    },
  ]),
  // Spare runners (core-loop.md § 2.7), taught in one line as the shift's build phase opens.
  defineScene('a2_m01_cue_spare_runners', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: 'Firmware update! New filter: Spare runners, Alt+H. Runners pay one credit now. Not worth the ammo!',
    },
  ]),
  defineScene('a2_m01_w02', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: "They're moving faster than usual. And they keep looking back. Logging it.",
    },
  ]),
  // The crew found: the hushed crew sit outside their hut by the bore road.
  defineScene('a2_m01_w04', [
    {
      kind: 'line',
      speaker: 'bricks',
      expression: 'worried',
      text: "They're breathing. They just don't know their names. Sweet moons.",
    },
  ]),
  // The first crew log recovered (or W6's countdown, if the drone hasn't reached one).
  defineScene('a2_m01_cue_crew_log', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: "The crew called it 'the hollow.' Lower case. I don't know why that's worse.",
    },
  ]),
  defineScene('a2_m01_w07', [
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: "Love the field report! I'm calling it a hiccup in my report too. Consistency!",
    },
  ]),
  defineScene('a2_m01_w08', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: 'Three hundred ninety-six days. Saying it out loud. Helps.',
    },
  ]),
  // Bricks's name tag (campaign.md § 6.3): Biscuit, on the earliest-built attacking turret.
  defineScene('a2_m01_cue_name_tag', [
    {
      kind: 'line',
      speaker: 'bricks',
      point: 'firstTower',
      text: "That one's Biscuit. Good dog. Barked at the dark so I didn't have to.",
    },
  ]),
  // The debrief: Bricks on a win (the brief's "quiet", come back wrong); Sterling on a loss.
  defineScene('a2_m01_debrief', [
    { kind: 'branch', cond: { outcome: 'lost' }, goto: 'lost' },
    { kind: 'line', speaker: 'bricks', text: "Rig's quiet again. Not the good quiet." },
    { kind: 'end' },
    {
      label: 'lost',
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: "Hiccups happen! Rig Nine isn't going anywhere. Neither are you, Four-Forty-Seven!",
    },
  ]),
]);
