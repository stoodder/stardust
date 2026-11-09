// A1M1 · Orientation Day: scenes (story/campaign/act1.md § A1M1, *Story delivery*), verbatim. Ids are
// `a1_m01_<slot>` (style-guide.md § 5.3). The briefing names you Sprout (the callsign beat) and
// gives the player a first choice; its how-to line is the W2 radio slot's (D026), so W2 has no
// scene. The W3 line is the Thumper's unlock (its build button unlocks as W3's countdown starts).
// The debrief shows on the results card (app/runResult.ts), its lines picked by the run's outcome.
import { defineScene, defineScenes } from '../../define.ts';

export const scenes = defineScenes([
  defineScene('a1_m01_brief', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "Hello, Technician! I'm QUILL, your Quantified Unified Integrated Logistics & Lethality assistant. I love my job!",
    },
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Name's Okonkwo. Sergeant. I'll call you Sprout, 'cause you're green and you work with lettuce.",
    },
    // The callsign beat, once: a replay of this briefing never takes back a later callsign.
    { kind: 'branch', cond: { seen: 'a1_m01_brief' }, goto: 'intel' },
    { kind: 'set', callsign: 'sprout' },
    {
      label: 'intel',
      kind: 'line',
      speaker: 'quill',
      text: "Today's forecast: Nibblers, with a chance of Zoomers!",
    },
    {
      kind: 'line',
      speaker: 'bricks',
      text: 'Turrets go on the pads. Bugs go on the path. Nothing goes on the path but bugs and bad decisions.',
    },
    { kind: 'line', speaker: 'bricks', text: 'Any questions, Sprout?' },
    {
      kind: 'choice',
      options: [
        { text: 'Where do they all come from?', tone: 'earnest', goto: 'whence' },
        { text: 'Is the lettuce always this aggressive?', tone: 'wry', goto: 'lettuce' },
        { text: '...No, Sergeant.', tone: 'quiet', goto: 'no_questions' },
      ],
    },
    {
      label: 'whence',
      kind: 'line',
      speaker: 'quill',
      expression: 'policy',
      text: 'The Spires, up north, where the rigs are! Further questions go to Extraction. (Per policy.)',
    },
    { kind: 'end' },
    {
      label: 'lettuce',
      kind: 'line',
      speaker: 'bricks',
      text: 'Lettuce is fine. Ask Goldie. She talks to it.',
    },
    { kind: 'end' },
    {
      label: 'no_questions',
      kind: 'line',
      speaker: 'bricks',
      text: 'Good. I asked questions once. They gave me a clipboard.',
    },
  ]),
  defineScene('a1_m01_w03', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "New hardware! Put the mortar beside your Rivet. They like each other. It's called Crossfire!",
    },
  ]),
  // Goldie reads your intake form when you wrote "lettuce" (D068).
  defineScene('a1_m01_w04', [
    { kind: 'branch', cond: { flag: 'arrival_reason', eq: 'lettuce' }, goto: 'lettuce' },
    {
      kind: 'line',
      speaker: 'goldie',
      expression: 'happy',
      text: "Oh! You're the new tech! Want to meet Duchess? She's a butterhead. She's shy. Don't look directly at her.",
    },
    { kind: 'end' },
    {
      label: 'lettuce',
      kind: 'line',
      speaker: 'goldie',
      expression: 'happy',
      text: "You're the one who wrote 'lettuce' on the form! I cried. Meet Duchess. She's shy. Don't look directly at her.",
    },
  ]),
  // Bricks walks this shift with you (T125), so slot 2 is his Suppressing Fire.
  defineScene('a1_m01_w05', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "Fast ones. Lay my Suppressing Fire across the road. That's what it's for.",
    },
  ]),
  // Joke of the Shift: the setup, the punchline, and Bricks's fact-check, which answers it (D028).
  defineScene('a1_m01_w06', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "Time for Joke of the Shift! I'm contractually obligated to tell one. Fifty are pre-approved!",
    },
    {
      kind: 'line',
      speaker: 'quill',
      text: "Why did the lettuce cross the road? It was scheduled to. Logistics Route 4, Tuesdays. ...That's the joke.",
    },
    { kind: 'line', speaker: 'bricks', text: "It's Wednesday." },
  ]),
  defineScene('a1_m01_w07', [
    {
      kind: 'line',
      speaker: 'bricks',
      text: "If that jingle plays one more time I'm filing a grievance. With God. Cc'ing HR.",
    },
  ]),
  // The debrief: a win's two lines (he names one tomorrow), or a loss's supportive one (D059).
  defineScene('a1_m01_debrief', [
    { kind: 'branch', cond: { outcome: 'lost' }, goto: 'lost' },
    { kind: 'line', speaker: 'bricks', expression: 'happy', text: 'Not bad, Sprout.' },
    { kind: 'line', speaker: 'bricks', text: "Don't name things on day one. You get attached." },
    { kind: 'end' },
    {
      label: 'lost',
      kind: 'line',
      speaker: 'bricks',
      text: 'Back on the pads, Sprout. Everybody loses some lettuce on day one.',
    },
  ]),
]);
