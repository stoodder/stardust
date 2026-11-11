// A3M6 · Let Them In: scenes (story/campaign/act3.md § A3M6, *Story delivery*), verbatim. Ids are
// `a3_m06_<slot>` (style-guide.md § 5.3); tools/dialogueCanon.test.ts checks each against act3.md
// § A3M6.
// - The briefing: Goldie opens the domes, `system` schedules the repossession, Zibzab gives the
//   crate (meta opens it as the briefing closes: app/storyMeta.ts `openCrateAtBriefing`, T710).
//   Under C4 Rewrite QUILL, back online after A3M5, shows its own list: the `system` header line
//   `QUILL_LIST_HEADER` between its two lines carries `QUILL_LIST` (quillList.ts; T714 stages it).
// - The radio: w02 the knock-knock (the first group has sheltered): Pebble's knock carries the
//   **Who's there?** button; pressed, it plays `a3_m06_cue_knock_answer`; ignored, the radio runs on
//   to her own punchline. Both endings get Goldie's line and Bricks's 2 s silence in his dark frame
//   (where he'd have said the dome was always twenty-two degrees). A radio slot that opens on a
//   reply button may run to 4 lines (content/dialogue/rules.ts `RADIO_REPLY_MAX_LINES`). w03
//   Pebble on the rock (by `peeker_poked`), w05 Ves'thara, w08 Goldie, w12 Zibzab.
// - `a3_m06_cue_sheltered`: QUILL as the first refugee is sheltered (map.ts `sheltered`), flat under
//   Purge.
// - The debrief, on a win: Pebble names you Waykeeper ("Grandmother" if Old Thrum was spared,
//   Bramble otherwise), then the callsign is set (T714 stages it: `debriefAsScene`). A loss plays
//   nothing.
import { defineScene, defineScenes } from '../../define.ts';

/** The `system` line QUILL's list hangs on (T714 stages `QUILL_LIST` over it). */
export const QUILL_LIST_HEADER = 'QUILL.DIRECTIVES (rewritten offline). Entries: 5.';

/** Goldie at the open door, the last word but one on both endings of the knock-knock. */
const GOLDIE_DOORS = {
  kind: 'line',
  speaker: 'goldie',
  text: "Doors are open, sweetheart. It's cold in here too, now. Come in, all of you.",
} as const;
/** Where Bricks would have said the dome was always twenty-two degrees. */
const BRICKS_SILENCE = { kind: 'line', speaker: 'bricks', text: '', durationSec: 2 } as const;

const PURGE = { flag: 'quill_choice', eq: 'purge' } as const;

export const scenes = defineScenes([
  defineScene('a3_m06_brief', [
    {
      kind: 'line',
      speaker: 'goldie',
      text: 'Open the domes. All of them. If Accounting has a problem, Accounting can come out here and say it.',
    },
    {
      kind: 'line',
      speaker: 'system',
      text: 'Asset Recovery: Dome Row scheduled for repossession. Please vacate.',
    },
    {
      kind: 'line',
      speaker: 'zibzab',
      text: "Price first: nothing. ...Don't look at me like that, friend. It's a terrible deal. I hate it. Take the crate.",
    },
    { kind: 'branch', cond: { flag: 'quill_choice', eq: 'rewrite' }, goto: 'list' },
    { kind: 'end' },
    {
      label: 'list',
      kind: 'line',
      speaker: 'quill',
      text: 'I wrote them while I was dark. Do you want to see?',
    },
    { kind: 'line', speaker: 'system', text: QUILL_LIST_HEADER },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: 'Directive 1, written by me: tell a joke at least once a day. Not because I have to. Because Pebble laughs.',
    },
  ]),
  // The knock-knock, as the first group has sheltered.
  defineScene('a3_m06_w02', [
    {
      kind: 'line',
      speaker: 'pebble',
      expression: 'happy',
      text: 'Knock knock! (squeak)',
      button: { label: "Who's there?", reply: 'a3_m06_cue_knock_answer' },
    },
    {
      kind: 'line',
      speaker: 'pebble',
      text: "Lettuce! You're supposed to ask. ...Lettuce in, anyway. It's cold out here.",
    },
    GOLDIE_DOORS,
    BRICKS_SILENCE,
  ]),
  // The button's reply: she gets to say it all.
  defineScene('a3_m06_cue_knock_answer', [
    {
      kind: 'line',
      speaker: 'pebble',
      expression: 'happy',
      text: "Lettuce! ...Lettuce in. It's cold out here. QUILL told me that one.",
    },
    GOLDIE_DOORS,
    BRICKS_SILENCE,
  ]),
  // Pebble on the Peeker rock: whether the player ever clicked it in Act I.
  defineScene('a3_m06_w03', [
    { kind: 'branch', cond: { flag: 'peeker_poked', eq: true }, goto: 'poked' },
    {
      kind: 'line',
      speaker: 'pebble',
      text: "I watched you from the rock. You never looked up. That's okay. You were busy.",
    },
    { kind: 'end' },
    {
      label: 'poked',
      kind: 'line',
      speaker: 'pebble',
      text: 'I watched you from the rock. You poked at me. I thought it was hello. Was it hello?',
    },
  ]),
  defineScene('a3_m06_w05', [
    {
      kind: 'line',
      speaker: 'vesthara',
      text: 'Thorn. No. You need a new name. Ask the small one. She has opinions.',
    },
  ]),
  defineScene('a3_m06_w08', [
    {
      kind: 'line',
      speaker: 'goldie',
      expression: 'sad',
      text: 'They never ate a single leaf. Not one. They were just walking home through my garden.',
    },
  ]),
  defineScene('a3_m06_w12', [
    {
      kind: 'line',
      speaker: 'zibzab',
      text: "The Hollow is the worst customer I ever had. It doesn't want anything. It only wants.",
    },
  ]),
  // The first refugee sheltered (map.ts `sheltered`).
  defineScene('a3_m06_cue_sheltered', [
    { kind: 'branch', cond: PURGE, goto: 'purge' },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: 'Pest escaped containment. ...Toward the domes. Logging it. Gladly.',
    },
    { kind: 'end' },
    { label: 'purge', kind: 'line', speaker: 'quill', text: 'Sheltered: {evacuated}.' },
  ]),
  // Waykeeper (T714 stages it): Pebble's pick, then the callsign.
  defineScene('a3_m06_debrief', [
    { kind: 'branch', cond: { outcome: 'lost' }, goto: 'done' },
    { kind: 'branch', cond: { flag: 'spared_quiet_wave', eq: true }, goto: 'grandmother' },
    {
      kind: 'line',
      speaker: 'pebble',
      text: 'I picked Waykeeper. Bramble says the ones who walk with the song need a name. You have to like it.',
    },
    { kind: 'branch', cond: { flag: 'spared_quiet_wave', eq: false }, goto: 'named' },
    {
      label: 'grandmother',
      kind: 'line',
      speaker: 'pebble',
      text: 'I picked Waykeeper. Grandmother says the ones who walk with the song need a name. You have to like it.',
    },
    { label: 'named', kind: 'set', callsign: 'waykeeper' },
    { label: 'done', kind: 'end' },
  ]),
]);
