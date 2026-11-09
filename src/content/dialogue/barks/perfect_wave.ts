// Act I `perfect_wave` pool (story/campaign/act1.md § Act I barks): a wave cleared with no leak,
// on every Act I map, for whoever is on the radio.
import { defineBarks } from '../define.ts';

export const perfectWave = defineBarks([
  {
    id: 'quill_perfect_wave_a1_10',
    speaker: 'quill',
    expression: 'happy',
    text: "Perfect wave! I'd give you a sticker, but stickers are Tier 2.",
    trigger: { on: 'perfect_wave' },
    when: { act: 1 },
  },
  {
    id: 'bricks_perfect_wave_a1_10',
    speaker: 'bricks',
    text: 'Clean wave. Do it again, Sprout.',
    trigger: { on: 'perfect_wave' },
    when: { act: 1 },
  },
  {
    id: 'zibzab_perfect_wave_a1_10',
    speaker: 'zibzab',
    expression: 'happy',
    text: 'Perfect wave! Zibzab would charge extra for that. You work cheap. Bad business.',
    trigger: { on: 'perfect_wave' },
    when: { act: 1 },
  },
]);
