// A2M4 · Second Harvest: map-scoped barks (story/campaign/act2.md § A2M4, *Barks*), verbatim. They
// fire only on this map; Act II's act-wide pool is ../../barks/act2.ts (QUILL's runner line joins
// Zibzab's here; Bricks's jingle line stops at A2M4, where the jingle turns minor). Ids end `_a2_04`
// (this map).
import { defineBarks } from '../../define.ts';
import type { Condition } from '../../types.ts';

/** Once the player has asked (the truth scene is saved as seen as it ends). */
const AFTER_TRUTH: Condition = { seen: 'a2_m04_scene_truth' };

export const barks = defineBarks([
  // A runner fleeing the Hollow killed by the player: the last killable Skitterkin, priced.
  {
    id: 'zibzab_skitterkin_killed_ahead_a2_04',
    speaker: 'zibzab',
    text: "That one was worth eight stardust. Price first. I won't pretend.",
    trigger: { on: 'skitterkin_killed_ahead' },
  },
  // A wave cleared after the truth scene: the minor jingle, and QUILL's words for it.
  {
    id: 'quill_wave_cleared_a2_04',
    speaker: 'quill',
    expression: 'sad',
    text: '...Pests processed.',
    trigger: { on: 'wave_cleared' },
    when: AFTER_TRUTH,
  },
  // A wave with nothing through to the control core.
  {
    id: 'zibzab_perfect_wave_a2_04',
    speaker: 'zibzab',
    text: 'Good work. Zibzab is careful what he calls good.',
    trigger: { on: 'perfect_wave' },
  },
]);
