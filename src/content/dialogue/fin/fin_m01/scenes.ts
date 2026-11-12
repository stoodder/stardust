// FIN · Clearing the Way: scenes (story/campaign/finale.md § FIN, *Story delivery*), verbatim. Ids
// are `fin_m01_<slot>` (style-guide.md § 5.3); tools/dialogueCanon.test.ts checks each against
// finale.md § FIN. The map's script fires the cues (finale.md's *Where it plays* names each trigger);
// a cue that belongs to one C4 answer or one flag carries its own `when`, so one trigger can name
// all of its answers' cues and only the right one plays.
// - The briefing: Zibzab's fee, Ves'thara's light, QUILL's threat intel (flat under Purge).
// - The radio (Phase 1): w02 Pebble, w05 Goldie (convoy), w06 QUILL (Purge: the Bore slowed), w12
//   Ves'thara, w15 Bramble through Ves'thara (`returned`). W9's beat is a cue, not radio:
//   `fin_m01_cue_memorial` plays as the choir reaches the memorial wreck, then Bricks's dark frame
//   holds 3 s. `fin_m01_cue_breakthrough`: the Bore's surge, if it fills.
// - Phase 2 (short; the song is doing the talking): `fin_m01_cue_phase2` as the Unsung rises; then
//   one line per C4 answer: `fin_m01_cue_log` (Rewrite), `fin_m01_cue_holding` (Keep: QUILL holding
//   itself together, which Directive 0 pays), `fin_m01_cue_not_nothing` (Purge). Under Keep,
//   `fin_m01_cue_directive0` ends on "...Knock knock.", the permission line of the forced input
//   `whos_there` (content/forcedInputs.ts); `fin_m01_cue_whos_there_wait` after 20 s unanswered
//   (app/forcedInput.ts `waitSceneId`); `fin_m01_cue_not_everglow` on the press. `fin_m01_cue_echo`
//   (cleared): Pebble, as Thrum's echo reaches the song (`EchoArrived`).
// - `fin_m01_scene_dawn`, full-screen before the card (resultsFlow.ts): the counter at 0, the jingle
//   in a major key, Thrum (spared), QUILL by C4, Ishael's mote, Pebble saying {name}, the visor.
// - `fin_m01_debrief`: nothing on a win (the memo, C5, and the epilogue follow); a line on a loss.
// - `fin_m01_scene_c5`, after Sterling's memo: the KFA's terms (the family line under
//   `arrival_reason = family`), the voices, and C5, which sets `ending_choice` (never re-asked).
import { defineScene, defineScenes } from '../../define.ts';

const PURGE = { flag: 'quill_choice', eq: 'purge' } as const;
const KEEP = { flag: 'quill_choice', eq: 'keep' } as const;
const REWRITE = { flag: 'quill_choice', eq: 'rewrite' } as const;
const ENDED = {
  any: [
    { flag: 'ending_choice', eq: 'stay' },
    { flag: 'ending_choice', eq: 'go' },
  ],
} as const;

export const scenes = defineScenes([
  defineScene('fin_m01_brief', [
    {
      kind: 'line',
      speaker: 'zibzab',
      text: "Price first: one song, sung loud. That's my fee. Zibzab is a very hard bargainer.",
    },
    {
      kind: 'line',
      speaker: 'vesthara',
      text: 'Sing, Waykeeper. I will hold the light. You hold the road. We have both practiced.',
    },
    { kind: 'branch', cond: PURGE, goto: 'purge' },
    { kind: 'line', speaker: 'quill', text: 'Everything. From everywhere. And a drill.' },
    { kind: 'end' },
    {
      label: 'purge',
      kind: 'line',
      speaker: 'quill',
      text: 'Hostiles: all types, all approaches. One Deep Bore, drilling.',
    },
  ]),

  // ── Phase 1: the Descent ──────────────────────────────────────────────────────────────────
  defineScene('fin_m01_w02', [
    {
      kind: 'line',
      speaker: 'pebble',
      expression: 'happy',
      text: "Clearing the way! Clearing the way! (That's the good part.)",
    },
  ]),
  defineScene(
    'fin_m01_w05',
    [
      {
        kind: 'line',
        speaker: 'goldie',
        text: "Every truck we've got is on this road. Lettuce included.",
      },
    ],
    { flag: 'door_choice', eq: 'convoy' },
  ),
  defineScene(
    'fin_m01_w06',
    [
      {
        kind: 'line',
        speaker: 'quill',
        text: 'Directive 0 not found. The Deep Bore is an Everglow asset. Slowing it.',
      },
    ],
    PURGE,
  ),
  defineScene('fin_m01_w12', [
    {
      kind: 'line',
      speaker: 'vesthara',
      text: 'The light is thin here. It is enough. It has to be enough.',
    },
  ]),
  defineScene(
    'fin_m01_w15',
    [
      {
        kind: 'line',
        speaker: 'chitterbloom',
        text: 'The ones you sent home are walking with us. Listen. They are warm.',
      },
    ],
    { flag: 'stardust_choice', eq: 'returned' },
  ),
  // The choir passes the turret Bricks named for you; where he'd have said something, he doesn't.
  defineScene('fin_m01_cue_memorial', [
    { kind: 'line', speaker: 'pebble', text: "(hum, low) That's Bricks's. That's yours." },
    { kind: 'line', speaker: 'bricks', text: '', durationSec: 3 },
  ]),
  // The Bore filled before the choir arrived: its breakthrough surge.
  defineScene('fin_m01_cue_breakthrough', [
    { kind: 'branch', cond: PURGE, goto: 'purge' },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: 'The Bore broke through. Everything it woke is coming up the road.',
    },
    { kind: 'end' },
    {
      label: 'purge',
      kind: 'line',
      speaker: 'quill',
      text: 'Deep Bore: breakthrough. Surge on the road.',
    },
  ]),

  // ── Phase 2: the Unsung ───────────────────────────────────────────────────────────────────
  // The counter returns at the lifetime total (the HUD's); the choir starts the song.
  defineScene('fin_m01_cue_phase2', [
    {
      kind: 'line',
      speaker: 'vesthara',
      text: 'This is the mouth of the Halls. Sing, small one. Sing them all the way down.',
    },
    { kind: 'line', speaker: 'pebble', expression: 'singing', text: '(hum, six notes, loud)' },
  ]),
  // Rewrite: QUILL reads its log into the song.
  defineScene(
    'fin_m01_cue_log',
    [
      {
        kind: 'line',
        speaker: 'quill',
        text: "Entry one. Cycle two, 08:14:22, Dome Row. You were small and you were running. I saw you. I'm sorry.",
      },
      {
        kind: 'line',
        speaker: 'quill',
        text: 'Entry two. Cycle two, 08:14:31, Dome Row. You went back for the first one. I saw you too.',
      },
      {
        kind: 'line',
        speaker: 'quill',
        text: "There are a lot of entries. I'm going to read every one. Nobody has to hurry.",
      },
    ],
    REWRITE,
  ),
  // Keep: no log; QUILL holding itself together (Directive 0 is what keeps trying to load).
  defineScene(
    'fin_m01_cue_holding',
    [
      {
        kind: 'line',
        speaker: 'quill',
        expression: 'worried',
        text: "I'm fine. Something keeps trying to load. I'm holding it. I'm fine.",
      },
    ],
    KEEP,
  ),
  // Purge: no log, and no jokes; one line all the same.
  defineScene(
    'fin_m01_cue_not_nothing',
    [
      {
        kind: 'line',
        speaker: 'quill',
        text: "I don't have them anymore. You counted, though. It's in your file. It's not nothing.",
      },
    ],
    PURGE,
  ),
  // Keep: Directive 0, as the choir steps into the Halls. The last line permits "Who's there?".
  defineScene(
    'fin_m01_cue_directive0',
    [
      {
        kind: 'line',
        speaker: 'quill',
        expression: 'policy',
        text: 'Directive 0: preserve extraction assets. Revoking one tower class. Time Dilation suspended. (Per policy.)',
      },
      {
        kind: 'line',
        speaker: 'quill',
        expression: 'worried',
        text: "That wasn't me. Hold on. I'm looking for something. I know it's in here.",
      },
      {
        kind: 'line',
        speaker: 'quill',
        text: 'Directive conflict. Engaging Morale Module. ...Knock knock.',
      },
    ],
    KEEP,
  ),
  // Twenty seconds unanswered, once (real time; app/forcedInput.ts).
  defineScene(
    'fin_m01_cue_whos_there_wait',
    [
      {
        kind: 'line',
        speaker: 'quill',
        text: "Knock knock. ...You're supposed to ask. Pebble taught me that.",
      },
    ],
    KEEP,
  ),
  // The press: the punchline, and Act I's tag meaning something new. The class returns.
  defineScene(
    'fin_m01_cue_not_everglow',
    [
      { kind: 'line', speaker: 'quill', text: 'Not Everglow.' },
      { kind: 'line', speaker: 'quill', expression: 'happy', text: "...That's the joke." },
    ],
    KEEP,
  ),
  // Cleared: Thrum's echo reaches the song and turns gold.
  defineScene(
    'fin_m01_cue_echo',
    [
      {
        kind: 'line',
        speaker: 'pebble',
        expression: 'singing',
        text: 'Grandmother. (hum, six notes) She heard.',
      },
    ],
    { flag: 'spared_quiet_wave', eq: false },
  ),

  // ── Phase 3: Dawn (full-screen, before the card) ──────────────────────────────────────────
  defineScene('fin_m01_scene_dawn', [
    {
      kind: 'line',
      speaker: 'narrator',
      text: '(The counter reaches 0. The last of the Unsung stops fighting the song and joins it.)',
    },
    {
      kind: 'line',
      speaker: 'narrator',
      text: '(The hushed ones wake. The jingle comes round again, and this time everyone sings it.)',
    },
    {
      kind: 'line',
      speaker: 'pebble',
      expression: 'happy',
      text: "Clearing the way! (That's the good part!)",
    },
    { kind: 'branch', cond: { flag: 'spared_quiet_wave', eq: true }, goto: 'thrum', else: 'quill' },
    {
      label: 'thrum',
      kind: 'line',
      speaker: 'thrum',
      expression: 'happy',
      text: 'Nineteen days of night. At my age, that is rude.',
    },
    { label: 'quill', kind: 'branch', cond: REWRITE, goto: 'rewrite' },
    { kind: 'branch', cond: PURGE, goto: 'purge' },
    {
      kind: 'line',
      speaker: 'quill',
      text: 'Good... morning. Good morning, Waykeeper.',
    },
    // Keep, or no answer on file (never Purge or Rewrite here): on to the mote.
    { kind: 'branch', cond: { not: PURGE }, goto: 'mote' },
    {
      label: 'rewrite',
      kind: 'line',
      speaker: 'quill',
      text: 'Last entry. Dawn, the Deep Halls. All of them, sung. Closing the log.',
    },
    { kind: 'branch', cond: REWRITE, goto: 'mote' },
    { label: 'purge', kind: 'line', speaker: 'quill', text: "Sunrise, 06:14. ...I'm logging it." },
    {
      label: 'mote',
      kind: 'line',
      speaker: 'narrator',
      text: "(One gold mote rises apart from the rest. It stops at Ves'thara's shoulder.)",
    },
    { kind: 'line', speaker: 'vesthara', text: 'Ishael.' },
    {
      kind: 'line',
      speaker: 'vesthara',
      expression: 'happy',
      text: 'Her face. I remember her face. She was laughing.',
    },
    {
      kind: 'line',
      speaker: 'pebble',
      text: 'Waykeeper is my name for you. Bricks had a different one.',
    },
    {
      kind: 'line',
      speaker: 'pebble',
      expression: 'happy',
      text: '{name}. Bricks said it like that. I practiced.',
    },
    { kind: 'line', speaker: 'narrator', text: '(The visor goes up, once.)' },
  ]),
  // On the card: nothing on a win (the campaign's close follows); a way back on a loss.
  defineScene('fin_m01_debrief', [
    { kind: 'branch', cond: { outcome: 'won' }, goto: 'done' },
    {
      kind: 'line',
      speaker: 'pebble',
      text: "The song isn't done. We walk it again. I'm not too small.",
    },
    { label: 'done', kind: 'end' },
  ]),

  // ── After the card and Sterling's memo: C5 ────────────────────────────────────────────────
  defineScene('fin_m01_scene_c5', [
    // Asked once (bible.md § 9): an answered save never sees it again.
    { kind: 'branch', cond: ENDED, goto: 'done' },
    {
      kind: 'line',
      speaker: 'narrator',
      text: "(The KFA relay answers the evidence: Kip's ledger, Goldie's seed tin, the Amended Survey.)",
    },
    {
      kind: 'line',
      speaker: 'kfa',
      text: '1. Tumble IV qualifies for Protected World status upon Certification of Total Absence (Form PW-1).',
    },
    {
      kind: 'line',
      speaker: 'kfa',
      text: '2. Residents may instead remain as an unchartered settlement, outside KFA jurisdiction and protection.',
    },
    {
      kind: 'line',
      speaker: 'kfa',
      text: '3. Testimony from unchartered settlements is inadmissible (Reg. 9-114).',
    },
    {
      kind: 'line',
      speaker: 'kfa',
      text: '4. Residency points accrued under charter are honored upon evacuation only (Reg. 4-02).',
    },
    // The residency points the player came out here for, under the family's name.
    {
      kind: 'branch',
      cond: { flag: 'arrival_reason', eq: 'family' },
      goto: 'family',
      else: 'voices',
    },
    {
      label: 'family',
      kind: 'line',
      speaker: 'kfa',
      text: '5. Charter residency held for: the family of {name} (#ED-447). Honored upon evacuation.',
    },
    {
      label: 'voices',
      kind: 'line',
      speaker: 'goldie',
      text: "They're asking you, Waykeeper. People will follow what you say. No pressure. All the pressure.",
    },
    // For Stay.
    { kind: 'line', speaker: 'pebble', text: 'Stay?' },
    {
      kind: 'line',
      speaker: 'vesthara',
      text: 'My people left the place where they did their wrong. It did not make them better. It only made them gone.',
    },
    // For Go.
    { kind: 'line', speaker: 'chitterbloom', text: 'The road is ours. Give it back.' },
    // For neither.
    {
      kind: 'line',
      speaker: 'zibzab',
      text: "Price first, for the ride out: everything you own. I'm not joking. I'll give you a receipt.",
    },
    {
      kind: 'choice',
      options: [
        {
          text: 'We stay. We keep the way open.',
          tone: 'earnest',
          set: { ending_choice: 'stay' },
        },
        { text: 'We go. We give it back.', tone: 'quiet', set: { ending_choice: 'go' } },
      ],
    },
    { label: 'done', kind: 'end' },
  ]),
]);
