// A2M3 · Second Look: map-scoped barks (story/campaign/act2.md § A2M3, *Barks*), verbatim. They
// fire only on this map; Act II's act-wide pool is ../../barks/act2.ts (QUILL's runner line and
// Bricks's jingle join these here, act2.md § Act II barks). Ids end `_a2_03` (this map).
import { defineBarks } from '../../define.ts';
import type { Condition } from '../../types.ts';

/** Once she's in his pocket (the rescue cue has played; it's saved as seen as it ends). */
const AFTER_RESCUE: Condition = { seen: 'a2_m03_cue_pebble' };

export const barks = defineBarks([
  // Skitterkin in range and nobody firing at them: he notices.
  {
    id: 'bricks_not_firing_a2_03',
    speaker: 'bricks',
    text: '...You okay, Thorn?',
    trigger: { on: 'not_firing' },
  },
  // A wave cleared after the rescue.
  {
    id: 'bricks_wave_cleared_a2_03',
    speaker: 'bricks',
    text: "She's not a pest, she's a passenger. Don't make it weird.",
    trigger: { on: 'wave_cleared' },
    when: AFTER_RESCUE,
  },
  // A runner fleeing the Hollow killed by the player (QUILL's act-wide line is in the pool too).
  {
    id: 'quill_skitterkin_killed_ahead_a2_03',
    speaker: 'quill',
    expression: 'worried',
    text: "Logged. ...I'm logging the small ones separately now.",
    trigger: { on: 'skitterkin_killed_ahead' },
  },
]);
