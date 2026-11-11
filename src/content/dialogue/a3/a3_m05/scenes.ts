// A3M5 · Unsung: scenes (story/campaign/act3.md § A3M5, *Story delivery*), verbatim. Ids are
// `a3_m05_<slot>` (style-guide.md § 5.3); tools/dialogueCanon.test.ts checks each against act3.md
// § A3M5.
// - The briefing: Kip hands over the ledger (its first line, `R2-0001`, as a caption), leaves his
//   #1 pin on the console (a silence: nobody comments), Pebble's Boing (the Sproing Pad gift), then
//   the threat intel by C4's answer: QUILL's apology (Keep, or no answer yet), its flat Directive 0
//   line (Purge), or `system`'s advisory (Rewrite: QUILL is offline here, and app/dialogue.ts skips
//   its lines wherever it is; T713).
// - The radio: w05 Ves'thara, w06 Kip, w09 Pebble (Grandmother if Old Thrum was spared, else
//   Bramble), w13 Kip on the hunt (save the casts for the old intake; every C4 answer; D151).
// - The Choir's hint (`a3_m05_cue_choir`, map.ts's `choir_hint`: W9's countdown, with a Hum Choir
//   on the field): Pebble's hint for Declined, every C4 answer (D151).
// - Cut the Feed (`a3_m05_cue_feed_cut`, the objective's `objectiveCompleted`): QUILL's line, or
//   `system`'s under Rewrite.
// - Sterling's remote boss cues: the platform's three phases (map.ts `bossPhase` events).
import { defineScene, defineScenes } from '../../define.ts';

const PURGE = { flag: 'quill_choice', eq: 'purge' } as const;
const REWRITE = { flag: 'quill_choice', eq: 'rewrite' } as const;

export const scenes = defineScenes([
  defineScene('a3_m05_brief', [
    {
      kind: 'line',
      speaker: 'kip',
      expression: 'sad',
      text: 'Here. The ledger. Every batch, every date. Take it before I get scared again.',
    },
    { kind: 'line', speaker: 'narrator', text: 'R2-0001' },
    // He leaves the #1 EXTERMINATOR pin on the console (a caption, as the ledger's batch number
    // is). Nobody comments.
    { kind: 'line', speaker: 'narrator', text: '#1 EXTERMINATOR' },
    { kind: 'line', speaker: 'kip', text: '', durationSec: 2 },
    {
      kind: 'line',
      speaker: 'pebble',
      expression: 'happy',
      text: 'My friend Boing wants to help. He jumps very high!',
    },
    { kind: 'branch', cond: REWRITE, goto: 'rewrite' },
    { kind: 'branch', cond: PURGE, goto: 'purge' },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'sad',
      text: "Jammers inbound. Prim's model. I'm sorry it's her face.",
    },
    { kind: 'end' },
    {
      label: 'purge',
      kind: 'line',
      speaker: 'quill',
      text: 'Directive 0 not found. Everglow assets are no longer protected.',
    },
    { kind: 'end' },
    {
      label: 'rewrite',
      kind: 'line',
      speaker: 'system',
      text: 'Threat Advisory: Auditor units inbound. Jamming expected.',
    },
  ]),
  defineScene('a3_m05_w05', [
    {
      kind: 'line',
      speaker: 'vesthara',
      expression: 'sad',
      text: 'Every vat is a chamber nobody sang to. Open them, Kip. Let them be carried.',
    },
  ]),
  defineScene('a3_m05_w06', [
    {
      kind: 'line',
      speaker: 'kip',
      expression: 'sad',
      text: 'The vats hum. Same six notes, all day. I told myself it was the machinery.',
    },
  ]),
  defineScene('a3_m05_w09', [
    {
      kind: 'branch',
      cond: { flag: 'spared_quiet_wave', eq: true },
      goto: 'spared',
      else: 'cleared',
    },
    {
      label: 'spared',
      kind: 'line',
      speaker: 'pebble',
      text: "The big ones carry the morning. That's what Grandmother says.",
    },
    { kind: 'end' },
    {
      label: 'cleared',
      kind: 'line',
      speaker: 'pebble',
      text: "The big ones carry the morning. That's what Bramble says.",
    },
  ]),
  // The countdown before the bearers' biggest group: where to answer the hunt (D151: the
  // Silencers that come up the sluice behind it hush the hub's guns).
  defineScene('a3_m05_w13', [
    {
      kind: 'line',
      speaker: 'kip',
      expression: 'worried',
      text: 'This is the biggest group. The Hollow will come up the sluice behind it.',
    },
    {
      kind: 'line',
      speaker: 'kip',
      expression: 'worried',
      text: 'Save what you have. Freeze them on the back path, by the old intake.',
    },
  ]),
  // The hint for Declined, before the layout is set (D151): the Hum Choir shortens a hostile jam
  // on the towers in its aura, to 1 s at T3 ("our loudest"). It plays only with a Choir built.
  defineScene('a3_m05_cue_choir', [
    {
      kind: 'line',
      speaker: 'pebble',
      text: 'The big machine is coming. If it grabs your towers, keep them near the Choir.',
    },
    {
      kind: 'line',
      speaker: 'pebble',
      expression: 'singing',
      text: 'When we sing our loudest, nothing stays quiet long! (squeak)',
    },
  ]),
  // Cut the Feed: the three vat-feed lines cleared before W10.
  defineScene('a3_m05_cue_feed_cut', [
    { kind: 'branch', cond: REWRITE, goto: 'rewrite' },
    {
      kind: 'line',
      speaker: 'quill',
      text: 'All three feed lines are cut. The vats take no one else tonight.',
    },
    { kind: 'end' },
    { label: 'rewrite', kind: 'line', speaker: 'system', text: 'Feed lines 1–3: no flow.' },
  ]),
  // Sterling, by remote, defending her throughput: one line per phase of the platform.
  defineScene('a3_m05_cue_sv_spawn', [
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'angry',
      text: 'Four-Forty-Seven! That plant is ninety percent of my quarterly bonus! The other ten is also the plant!',
    },
  ]),
  defineScene('a3_m05_cue_takeover', [
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'happy',
      text: "It's just a name! Mostly!",
    },
  ]),
  defineScene('a3_m05_cue_jettison', [
    {
      kind: 'line',
      speaker: 'sterling',
      expression: 'worried',
      text: "That plating was leased! You're going to love the invoice!",
    },
  ]),
]);
