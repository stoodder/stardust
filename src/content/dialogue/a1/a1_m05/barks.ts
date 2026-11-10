// A1M5 · Record Quarter: map-scoped barks (story/campaign/act1.md § A1M5, *Barks*), verbatim. They
// fire only on this map; act-wide pools live in ../../barks/. Ids end `_a1_05` (this map).
//
// Bricks's `not_firing` line is written for the Quiet Wave (act1.md: W10 only, once): the trigger
// fires at most once a wave, when Skitterkin stay in range for NOT_FIRING_SEC with no tower
// firing, and `wave: 10` makes the line wait for W10, so a hold earlier in the map never spends it
// (T330).
import { defineBarks } from '../../define.ts';

export const barks = defineBarks([
  {
    id: 'quill_boss_phase_a1_05',
    speaker: 'quill',
    expression: 'happy',
    text: "She's panicking! Panicking is ninety percent of being driven off!",
    trigger: { on: 'boss_phase', phase: 3 },
  },
  {
    id: 'quill_wave_cleared_boss_a1_05',
    speaker: 'quill',
    text: 'Driven off! Not processed. Is that allowed? Logging it.',
    trigger: { on: 'wave_cleared', boss: true },
  },
  {
    id: 'bricks_not_firing_a1_05',
    speaker: 'bricks',
    text: '...You okay, Sprout?',
    trigger: { on: 'not_firing', wave: 10 },
    once: 'map',
  },
]);
