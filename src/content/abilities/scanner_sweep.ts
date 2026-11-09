// Scanner Sweep: a Technician ability bought in R&D after A2M1 (2 Intel; upgrades/access.ts),
// ahead of the first cloaked enemies (A2M4). Numbers: design/core-loop.md § 3.2 (targeted, radius
// 4 tiles, reveals cloaked enemies for 10 s, 30 s cooldown). It answers detection (rules.ts
// COUNTER_ANSWERS) only when cast. The sim opens a `reveal` zone at the target tile for the
// duration (systems/abilities.ts), and detection Reveals the cloaked units inside it each tick
// (systems/detection.ts). Its icon is a placeholder (T440b).
import { defineAbility } from '../define.ts';

export const scanner_sweep = defineAbility({
  id: 'scanner_sweep',
  name: 'Scanner Sweep',
  cooldownSec: 30,
  effect: { kind: 'reveal', radiusTiles: 4, durationSec: 10 },
  sprites: { icon: 'icon.ability.scanner_sweep' },
});
