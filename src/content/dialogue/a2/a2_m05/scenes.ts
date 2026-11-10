// A2M5 · The Long Walk: scenes (story/campaign/act2.md § A2M5, *Story delivery*), verbatim. Ids are
// `a2_m05_<slot>` (style-guide.md § 5.3); tools/dialogueCanon.test.ts checks each against act2.md
// § A2M5. Ves'thara's turn: she comes for the Preserve Road in a glass giant and argues with the
// player through it (the Penitent's cues, played by the map script at its spawn and as its shield
// first breaks), then the Hollow comes for everyone on the road and she kneels over the refugees
// (the pivot cue, the one pausing cue on the map: it holds the battle mid-fight until it's read).
// After it the radio is the escort: QUILL likes a number, Sterling likes the initiative, Pebble is
// in Bricks's pocket. The debrief is hers: "Not there. Never there." Her portrait is `touched`
// from this map on (speakers.ts); the Prism Spire she gives is the run end's gift (T510).
import { defineScene, defineScenes } from '../../define.ts';

export const scenes = defineScenes([
  // The briefing: Bricks on the pilot, and QUILL's foreshadow of the pivot (maps.md § 6.3: the
  // story event is foreshadowed in the briefing).
  defineScene('a2_m05_brief', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Relocation pilot. We walk 'em to the Preserve. Sterling's budget, Sterling's risk.",
    },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: 'Hollow readings rising behind the rig road. They may arrive during the engagement.',
    },
  ]),
  // The Penitent comes down the road (W5, at its spawn): her challenge, and Bricks's answer.
  defineScene('a2_m05_cue_penitent', [
    {
      kind: 'line',
      speaker: 'vesthara',
      expression: 'angry',
      text: 'Everglow builds a road to a pen and calls it relocation. I will break the road.',
    },
    {
      kind: 'line',
      speaker: 'bricks',
      text: "She's not wrong about the road, Thorn. Doesn't mean she gets it.",
    },
  ]),
  // Its shield breaks (phase 2: the cloaked shards).
  defineScene('a2_m05_cue_shield', [
    {
      kind: 'line',
      speaker: 'vesthara',
      expression: 'sad',
      text: 'You count them, Counter. I carry them. One of us will have to stop.',
    },
  ]),
  // The pivot (her 50%, or W6 starting): she kneels and becomes the wall, the PA clears the area,
  // and Bricks can't hear the order. A brief pause (enemies.md § 6.1): the one pausing cue here.
  {
    id: 'a2_m05_cue_pivot',
    pause: true,
    nodes: [
      {
        kind: 'line',
        speaker: 'vesthara',
        expression: 'worried',
        text: 'Run, small ones. I will be the wall. Counter, if you have ever been sorry, be sorry now, and help me.',
      },
      {
        kind: 'line',
        speaker: 'pa',
        text: 'Mixed hostile contact. Area clearance authorized.',
      },
      {
        kind: 'line',
        speaker: 'bricks',
        text: "Radio's bad. Can't hear the order. Funny, that. Get those little ones moving.",
      },
    ],
  },
  defineScene('a2_m05_w08', [
    {
      kind: 'line',
      speaker: 'quill',
      text: "Evacuated is a number I like. I don't know if I'm allowed to like numbers.",
    },
  ]),
  defineScene('a2_m05_w10', [
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: 'Love the initiative! The Preserve has plenty of room. Plenty!',
    },
  ]),
  defineScene('a2_m05_w11', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Pebble's in my pocket. Don't tell Goldie. She thinks it's unsanitary.",
    },
    { kind: 'line', speaker: 'pebble', text: '(squeak) I am very sanitary.' },
  ]),
  // Bricks's name tag (campaign.md § 6.3): Dele, his brother, on the earliest-built attacking
  // turret.
  defineScene('a2_m05_cue_name_tag', [
    {
      kind: 'line',
      speaker: 'bricks',
      point: 'firstTower',
      text: "That one's Dele. My brother. Accountant on the Core. Doesn't call. Still counts.",
    },
  ]),
  // The debrief: hers. "Then where?" gets no answer: a held silence, and she gives the Prism Spire
  // (Results shows the gift). On a loss, the road keeps.
  defineScene('a2_m05_debrief', [
    { kind: 'branch', cond: { outcome: 'lost' }, goto: 'lost' },
    { kind: 'line', speaker: 'vesthara', expression: 'sad', text: 'Not there. Never there.' },
    { kind: 'line', speaker: 'bricks', text: 'Then where?' },
    { kind: 'line', speaker: 'vesthara', text: '', durationSec: 2 },
    { kind: 'end' },
    {
      label: 'lost',
      kind: 'line',
      speaker: 'bricks',
      text: "The road's still there. So are they. Go again, Thorn.",
    },
  ]),
]);
