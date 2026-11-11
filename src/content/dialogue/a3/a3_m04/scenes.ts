// A3M4 · Empty Slot: scenes (story/campaign/act3.md § A3M4, *Story delivery*), verbatim. Ids are
// `a3_m04_<slot>` (style-guide.md § 5.3); tools/dialogueCanon.test.ts checks each against act3.md
// § A3M4. Bricks's slot is empty (`absent`): his silences are lines with `text: ''` in his frame,
// which shows dark for an absent speaker (app/dialogue.ts `lineView`).
// - The briefing: QUILL patches in System Reboot; then the door's own people (Goldie for the
//   convoy, Pebble for the warren; with no door set, a dev battle, Goldie's).
// - The radio: W2 Bricks's silence (3 s); w03 Pebble's lettuce joke and the silence where he'd
//   have fact-checked her (2 s); w05 QUILL; w07 QUILL warns of Gerald's pass (the countdown before
//   W7, so the player can hold fire); w08 Gerald's status line, once he has delivered; w16 QUILL
//   on the Silencer exam's timing (reboot as they reach out). Bricks's
//   other silences (map_start, the first wave cleared) are barks (barks.ts).
// - The mail scene (`a3_m04_scene_mail`, before the card: content/dialogue/resultsFlow.ts): the
//   lines over T714's staging of Gerald's envelope. Its grant (Suppressing Fire) is meta's
//   (`inheritAbility`, T710).
// - The debrief (C4, on the card): asked once, on a win; a replay or a loss plays nothing (the
//   answer is locked, app/dialogue.ts LOCKED_CHOICE_FLAGS; committed through `resolveC4`, T710).
// - Night Shift (`a3_m04_base_night_shift`): the base's mandatory visit after C4
//   (app/baseScenes.ts `NIGHT_SHIFT_SCENE`), QUILL's line by C4's answer (Purge: its status bar
//   blinks, a silence in its frame).
import { defineScene, defineScenes } from '../../define.ts';

const C4_MADE = {
  any: [
    { flag: 'quill_choice', eq: 'purge' },
    { flag: 'quill_choice', eq: 'keep' },
    { flag: 'quill_choice', eq: 'rewrite' },
  ],
} as const;

export const scenes = defineScenes([
  defineScene('a3_m04_brief', [
    {
      kind: 'line',
      speaker: 'quill',
      text: "I've patched in System Reboot. It was in a folder marked 'Do Not.' I did.",
    },
    { kind: 'branch', cond: { flag: 'door_choice', eq: 'warren' }, goto: 'warren' },
    {
      kind: 'line',
      speaker: 'goldie',
      text: "Two hundred people, six trucks, and a lot of lettuce. I'm in charge now, apparently. Nobody else raised a hand.",
    },
    { kind: 'end' },
    {
      label: 'warren',
      kind: 'line',
      speaker: 'pebble',
      expression: 'happy',
      text: 'The warren says thank you. Loudly. These are their spitters. (squeak)',
    },
  ]),
  // Where he would have said something as the first wave starts.
  defineScene('a3_m04_w02', [{ kind: 'line', speaker: 'bricks', text: '', durationSec: 3 }]),
  // Where he would have fact-checked her.
  defineScene('a3_m04_w03', [
    {
      kind: 'line',
      speaker: 'pebble',
      text: "Why did the lettuce cross the road? It was going home. (squeak) QUILL says that's not it.",
    },
    { kind: 'line', speaker: 'bricks', text: '', durationSec: 2 },
  ]),
  defineScene('a3_m04_w05', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'sad',
      text: "Sergeant Okonkwo would say— ...Never mind. I don't want to do his voice. It wouldn't be fair to him.",
    },
  ]),
  // The countdown before Gerald's pass (W7): hold fire.
  defineScene('a3_m04_w07', [
    {
      kind: 'line',
      speaker: 'quill',
      text: 'Gerald is on the path. He has mail. From the Sergeant. Please hold fire.',
    },
  ]),
  // Gerald's status line, after his pass (T713 frames it).
  defineScene('a3_m04_w08', [{ kind: 'line', speaker: 'gerald', text: 'DELIVERY: COMPLETE.' }]),
  // The countdown before the Silencer exam (W16): the tell's timing, once more (D150).
  defineScene('a3_m04_w16', [
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: 'All the Silencers they have left. Both rifts, then the tunnel. When they reach out, reboot.',
    },
  ]),
  // Gerald's envelope (T714 stages it): the pension form's beneficiary, the fire-control key, and
  // Kip's blank slip with only a batch number. Nobody comments.
  defineScene('a3_m04_scene_mail', [
    { kind: 'line', speaker: 'narrator', text: 'Pebble, c/o the Deep Halls.' },
    { kind: 'line', speaker: 'narrator', text: '', durationSec: 2 },
    {
      kind: 'line',
      speaker: 'narrator',
      text: 'Fire-control key. For Thorn. Point it at the bad stuff.',
    },
    { kind: 'line', speaker: 'narrator', text: '', durationSec: 2 },
    { kind: 'line', speaker: 'narrator', text: 'R2-0001' },
  ]),
  // C4 (campaign.md § 6.1): asked once, on a win.
  defineScene('a3_m04_debrief', [
    { kind: 'branch', cond: { outcome: 'lost' }, goto: 'done' },
    { kind: 'branch', cond: C4_MADE, goto: 'done' },
    {
      kind: 'line',
      speaker: 'quill',
      text: "I'd decide for myself, but I'm not permitted to. That's sort of the whole problem.",
    },
    {
      kind: 'choice',
      options: [
        {
          text: 'Purge them. All of them.',
          tone: 'earnest',
          set: { quill_choice: 'purge' },
          remember: 'quill',
        },
        {
          text: 'Keep them. Stay yourself.',
          tone: 'quiet',
          set: { quill_choice: 'keep' },
          remember: 'quill',
        },
        {
          text: 'Write your own.',
          tone: 'wry',
          set: { quill_choice: 'rewrite' },
          remember: 'quill',
        },
      ],
    },
    { label: 'done', kind: 'end' },
  ]),
  // Night Shift: Ves'thara's only laugh in the heaviest stretch of the game.
  defineScene('a3_m04_base_night_shift', [
    {
      kind: 'line',
      speaker: 'vesthara',
      expression: 'sad',
      text: "I cannot remember my mother's face. I remember that I loved it. That will have to be enough.",
    },
    {
      kind: 'line',
      speaker: 'pebble',
      text: "Why did the scarecrow win a prize? Because he was out. Standing. In a field. (squeak) That's two jokes.",
    },
    { kind: 'line', speaker: 'vesthara', expression: 'laugh', text: '(a laugh, short, surprised)' },
    { kind: 'line', speaker: 'vesthara', text: 'I had forgotten I could do that.' },
    { kind: 'branch', cond: { flag: 'quill_choice', eq: 'keep' }, goto: 'keep' },
    { kind: 'branch', cond: { flag: 'quill_choice', eq: 'rewrite' }, goto: 'rewrite' },
    // Purge: no line; its status bar blinks (a silence in its frame).
    { kind: 'line', speaker: 'quill', text: '', durationSec: 2 },
    { kind: 'branch', cond: { flag: 'quill_choice', eq: 'purge' }, goto: 'again' },
    {
      label: 'keep',
      kind: 'line',
      speaker: 'quill',
      text: "It's 'outstanding in his field,' Pebble. ...Yours is better.",
    },
    { kind: 'branch', cond: { flag: 'quill_choice', eq: 'keep' }, goto: 'again' },
    {
      label: 'rewrite',
      kind: 'line',
      speaker: 'quill',
      expression: 'happy',
      text: "I'll have one tomorrow. I'm writing it.",
    },
    {
      label: 'again',
      kind: 'line',
      speaker: 'pebble',
      expression: 'happy',
      text: '(squeak) Again!',
    },
  ]),
]);
