// Stillness: Ves'thara's companion ability (slot 2; design/core-loop.md § 3.2), from A2M6 (in A2M5
// she is the Ward ally). Targeted, radius 2.5 tiles: Stasis for 3 s (a boss takes Chilled 50%
// instead, the Stasis rule), which interrupts abilities (enemies.md § 2.4). 45 s cooldown. It
// answers jam as a tell interrupter (rules.ts COUNTER_ANSWERS).
//
// The sim runs the `stasisArea` effect since T507 (sim/abilities/stillness.ts: instant, ground and
// air, never a unit out of reach). Icon: a placeholder under its final id (T540b).
import { defineAbility } from '../define.ts';

export const stillness = defineAbility({
  id: 'stillness',
  name: 'Stillness',
  companion: 'vesthara',
  cooldownSec: 45,
  effect: { kind: 'stasisArea', radiusTiles: 2.5, durationSec: 3 },
  sprites: { icon: 'icon.ability.stillness' },
});
