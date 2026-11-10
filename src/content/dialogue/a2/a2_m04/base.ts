// A2M4 · Second Harvest: its base scene (story/campaign/act2.md § A2M4, *Base*), verbatim: Bricks
// hands Pebble over to Goldie at Dome 3, so she sleeps somewhere warm while A2M5's walk is planned.
// Ids are `a2_m04_base_<name>` (style-guide.md § 5.3); app/baseScenes.ts plays base topics (playing
// this one on the first base visit after A2M4 is won is the app's wiring, not this file's).
import { defineScene, defineScenes } from '../../define.ts';

export const scenes = defineScenes([
  defineScene('a2_m04_base_handover', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "She's yours tonight, Goldie. She bites.",
    },
    { kind: 'line', speaker: 'pebble', expression: 'happy', text: '(squeak) Only a little.' },
    {
      kind: 'line',
      speaker: 'goldie',
      expression: 'happy',
      text: "She can sleep in the butterheads. She doesn't eat them. She just... sits in them. Like a little egg.",
    },
  ]),
]);
