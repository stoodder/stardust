// A2M4 · Second Harvest: scenes (story/campaign/act2.md § A2M4, *Story delivery*), verbatim. Ids are
// `a2_m04_<slot>` (style-guide.md § 5.3); tools/dialogueCanon.test.ts checks each against act2.md
// § A2M4. The midpoint: Kip's tour of his new plant, QUILL's policy cut-off and its hint, and after
// W4 the truth scene (full-screen, played by the map script on W4's clear, in W5's build phase), the
// player asking Zibzab and Zibzab telling it plainly. After it the radio keeps going: Kip's
// "throughput", QUILL and the Tidybot chime, Zibzab's discount, Sterling's morale. The debrief is
// Sterling's sustainability pitch and pilot, then C2, Zibzab's two offers, price first.
// - **The truth scene's hook** (T513): the wave-clear jingle turns minor once `a2_m04_scene_truth`
//   is seen (QUILL's "...Pests processed." waits on the same id, barks.ts).
// - **C2** (T510 reads this shape on Results): the lines up to the choice show on the card; the
//   choice's options set `stardust_choice` and become C2's buttons while the flag is unset; with an
//   empty Stardust bank (after step 6) the read-through takes `no_bank` instead and sets `none`.
//   A replay after C2 was made ends after Sterling's lines; a loss plays only its own line.
import { defineScene, defineScenes } from '../../define.ts';
import type { Condition } from '../../types.ts';

/** C2 was already made (`stardust_choice` set): a replay's debrief offers nothing. */
const C2_MADE: Condition = {
  any: [
    { flag: 'stardust_choice', eq: 'sold' },
    { flag: 'stardust_choice', eq: 'returned' },
    { flag: 'stardust_choice', eq: 'none' },
  ],
};

export const scenes = defineScenes([
  // The tour: Kip, promoted, proud, and not looking at the vats; QUILL stops him mid-sentence, then
  // says the one thing it shouldn't.
  defineScene('a2_m04_brief', [
    {
      kind: 'line',
      speaker: 'kip',
      expression: 'happy',
      text: 'Promoted! Reclamation Lead. Big vats, great benefits. Smells like burnt sugar, honestly. You get used to it.',
    },
    {
      kind: 'line',
      speaker: 'kip',
      expression: 'happy',
      text: "Youngest Reclamation Lead ever. Also the first ever. A record's a record.",
    },
    { kind: 'line', speaker: 'kip', text: 'So the intake goes to the vats, and the vats—' },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'policy',
      text: '(Per policy.) Reclamation details are confidential.',
    },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: 'Something under the vats is listening.',
    },
  ]),
  // The truth (twist layer 2), after W4: the player asks, and Zibzab answers plainly. A voice
  // choice with no flag; Zibzab's last line follows whichever the player says.
  defineScene('a2_m04_scene_truth', [
    { kind: 'line', speaker: 'player', text: 'Where does stardust come from?' },
    {
      kind: 'line',
      speaker: 'zibzab',
      text: 'You asked. Good. Stardust is the dead, Technician. Everyone in the trade knows. Nobody in the trade says.',
    },
    { kind: 'branch', cond: { flag: 'asked_zibzab_early', eq: false }, goto: 'reply' },
    {
      kind: 'line',
      speaker: 'zibzab',
      expression: 'sad',
      text: 'You asked me in the afternoon. I told you. You kept buying.',
    },
    {
      label: 'reply',
      kind: 'choice',
      options: [
        { text: 'You knew. All this time.', tone: 'earnest' },
        { text: 'Great. Love that. Very normal.', tone: 'wry' },
        { text: '...', tone: 'quiet' },
      ],
    },
    {
      kind: 'line',
      speaker: 'zibzab',
      text: 'I never lied to you, Technician. Can your QUILL say that? Can your Director?',
    },
  ]),
  // After the truth: Kip has a word for it.
  defineScene('a2_m04_w06', [
    {
      kind: 'line',
      speaker: 'kip',
      expression: 'worried',
      text: "We don't call it that. It's 'throughput.' ...Why do you keep saying it like that?",
    },
  ]),
  defineScene('a2_m04_w07', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'sad',
      text: 'Tidybot 14 is unloading at Intake B. I used to think the chime was cheerful.',
    },
  ]),
  // Before W8's Wardens and Lightwings: his ability, sold as ever.
  defineScene('a2_m04_w08', [
    {
      kind: 'line',
      speaker: 'zibzab',
      text: "Clearance Sale, Technician. You'll want the discount. I'd want it.",
    },
  ]),
  defineScene('a2_m04_w09', [
    {
      kind: 'line',
      speaker: 'kip',
      expression: 'happy',
      text: "New record tonight. 'Most Throughput, Night Shift.' I didn't make that one up. It's on the wall.",
    },
  ]),
  defineScene('a2_m04_w10', [
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: 'Throughput is up, morale is up, everything is up! Keep that plant safe, Four-Forty-Seven!',
    },
  ]),
  // The debrief: Sterling's pitch, then C2 (campaign.md § 6.1), price first. On a loss, no offer.
  defineScene('a2_m04_debrief', [
    { kind: 'branch', cond: { outcome: 'lost' }, goto: 'lost' },
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: "Reclamation is a sustainability initiative, Four-Forty-Seven! Nothing on Tumble IV goes to waste. Isn't that beautiful?",
    },
    {
      kind: 'line',
      speaker: 'sterling',
      text: "Let's call it the Humane Relocation Pilot. My budget, my risk. Just trust me, okay?",
    },
    // A replay after C2 was made: no second offer, the debrief ends quietly.
    { kind: 'branch', cond: C2_MADE, goto: 'done' },
    { kind: 'branch', cond: { bank: 'stardust', lte: 0 }, goto: 'no_bank' },
    {
      kind: 'line',
      speaker: 'zibzab',
      text: 'Price first. Two offers. I sell your stardust at market. Or I carry it home, at cost, plus my fee.',
    },
    {
      kind: 'line',
      speaker: 'zibzab',
      text: "Neither one is wrong. The dead don't mind being useful. They mind being forgotten.",
    },
    {
      kind: 'choice',
      options: [
        { text: 'Sell it. Market price.', tone: 'wry', set: { stardust_choice: 'sold' } },
        { text: 'Take it to them.', tone: 'earnest', set: { stardust_choice: 'returned' } },
      ],
    },
    { kind: 'end' },
    { label: 'no_bank', kind: 'line', speaker: 'zibzab', text: 'No refunds. I did say.' },
    { kind: 'set', flag: 'stardust_choice', value: 'none' },
    { label: 'done', kind: 'end' },
    {
      label: 'lost',
      kind: 'line',
      speaker: 'zibzab',
      text: 'No charge for that one, Technician. Go again.',
    },
  ]),
]);
