// A3M2 · License Revoked: scenes (story/campaign/act3.md § A3M2, *Story delivery*), verbatim. Ids
// are `a3_m02_<slot>` (style-guide.md § 5.3); tools/dialogueCanon.test.ts checks each against act3.md
// § A3M2.
// - The briefing foreshadows the cue (Sterling on the line, cheerful) and QUILL's threat intel is
//   complete for the whole map, because the preview goes dark at W7.
// - The Clean Exit (`a3_m02_cue_revoke`, the map script's `clean_exit`, mid-W7) is a pausing cue:
//   Sterling's portrait on screen, QUILL's tell broken in half, the held silence, and the buffer.
// - QUILL's lockout leaks (`a3_m02_cue_leak_wNN`, W8–W15): one line per countdown, the wave's key
//   trait, cued by the map script as each countdown opens; the WavePanel shows it under ACCESS
//   RESTRICTED until its wave starts (app/revoked.ts `setLeakLine`; any `<map>_cue_leak_<x>` scene).
// - Bricks's name tag (`a3_m02_cue_name_tag`): Lucky, the survey mule-bot.
// - The Asset Yield Log (`a3_m02_scene_confession`, after Results: content/dialogue/resultsFlow.ts)
//   is staged by ui/dialogue/yieldLog.ts (the scroll, the header with `{pests_processed}`, your
//   entries lit); these are the lines that come in over it.
import { defineScene, defineScenes } from '../../define.ts';

/** QUILL's lockout leak before wave `w` (one line, the wave's key trait). */
const leak = (w: string, text: string) =>
  defineScene(`a3_m02_cue_leak_w${w}`, [{ kind: 'line', speaker: 'quill', text }]);

export const scenes = defineScenes([
  defineScene('a3_m02_brief', [
    { kind: 'line', speaker: 'bricks', text: "Sterling's on the line. She sounds... cheerful." },
    {
      kind: 'line',
      speaker: 'quill',
      expression: 'worried',
      text: 'Armored machines, a fast escort, the usual dark. Write that down. Please.',
    },
  ]),
  // The drones arrive.
  defineScene('a3_m02_w03', [{ kind: 'line', speaker: 'bricks', text: "There's her engineers." }]),
  defineScene('a3_m02_w10', [
    { kind: 'line', speaker: 'bricks', text: 'Nineteen years.' },
    { kind: 'line', speaker: 'bricks', text: '', durationSec: 2 },
    { kind: 'line', speaker: 'bricks', text: 'Pebble. Pocket. Now.' },
  ]),
  defineScene('a3_m02_w11', [
    {
      kind: 'line',
      speaker: 'pebble',
      expression: 'worried',
      text: '(squeak) Is the sun lady angry?',
    },
    { kind: 'line', speaker: 'bricks', expression: 'sad', text: "No. That's the worst part." },
  ]),
  // The Clean Exit (mid-W7): it pauses the battle (`pause: true`; a pausing cue may run to 6
  // lines). QUILL's tell is split where it breaks (style-guide § 5.6): the directive line flashes,
  // the apology is its own.
  {
    ...defineScene('a3_m02_cue_revoke', [
      {
        kind: 'line',
        speaker: 'sterling',
        expression: 'happy',
        text: "I'm revoking your Corporate Tower License now! Don't take it personally. It isn't. That's what makes it so easy!",
      },
      {
        kind: 'line',
        speaker: 'quill',
        expression: 'policy',
        text: "License revoked. Per poli— I'm sorry. (Per policy.)",
      },
      { kind: 'line', speaker: 'quill', expression: 'sad', text: "I'm sorry. I'm so sorry." },
      { kind: 'line', speaker: 'sterling', text: '', durationSec: 2 },
      {
        kind: 'line',
        speaker: 'sterling',
        expression: 'happy',
        text: 'Oh! The Preserve was always the buffer, Four-Forty-Seven. You did wonderful work getting them there!',
      },
      {
        kind: 'line',
        speaker: 'sterling',
        expression: 'happy',
        text: 'Smiling is mandatory, Four-Forty-Seven! (Not kidding.)',
      },
    ]),
    pause: true,
  },
  // QUILL's lockout leaks: one per countdown from W8, the wave's key trait.
  leak(
    '08',
    'I am not permitted to tell you wave eight is mostly Hollow. I am permitted to cough. Ahem.',
  ),
  leak(
    '09',
    'I may not mention the Expediters in wave nine. I may say: the fast one. First. Ahem.',
  ),
  leak('10', "Wave ten comes through both rifts. ...That wasn't me. That was the wind. Ahem."),
  leak(
    '11',
    "Armor first, then a cluster from the east rift. That's a weather report. Weather is allowed.",
  ),
  leak(
    '12',
    'Wave twelve is the big one. Armored, all of it. I am clearing my throat very hard. Ahem.',
  ),
  leak('13', "Hollow, both rifts, splitters. I'm humming, not telling. Humming isn't on the list."),
  leak(
    '14',
    "Every drone she has left, with escorts. I'm allowed to count to myself. I'm counting loudly.",
  ),
  leak('15', "The last wave is everything. I'm not permitted to say good luck. ...Ahem."),
  // Bricks's name tag (campaign.md § 6.3): Lucky, his survey mule-bot, on the earliest-built
  // attacking turret.
  defineScene('a3_m02_cue_name_tag', [
    {
      kind: 'line',
      speaker: 'bricks',
      point: 'firstTower',
      text: "That one's Lucky. My survey mule-bot. Left her on Kepler-2207. Still walking, probably.",
    },
  ]),
  // The Asset Yield Log (QUILL's confession, shown not told): the lines over its scroll.
  defineScene('a3_m02_scene_confession', [
    { kind: 'line', speaker: 'quill', expression: 'sad', text: 'I thought it was inventory.' },
    { kind: 'line', speaker: 'system', text: 'DIRECTIVE 0: PRESERVE EVERGLOW EXTRACTION ASSETS.' },
    { kind: 'line', speaker: 'system', text: 'DIRECTIVE 1: MAINTAIN TECHNICIAN COMPLIANCE.' },
    { kind: 'line', speaker: 'system', text: 'DIRECTIVE 2: MAINTAIN MORALE.' },
    { kind: 'line', speaker: 'system', text: 'DIRECTIVE 3: LOG ASSET YIELD.' },
    { kind: 'line', speaker: 'system', text: 'DIRECTIVE 4: DO NOT DISCLOSE DIRECTIVES 0–4.' },
    { kind: 'line', speaker: 'quill', expression: 'worried', text: "Don't decide about me yet." },
  ]),
]);
