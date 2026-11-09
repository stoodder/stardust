// Time Dilation: QUILL's companion ability (design/core-loop.md § 3.2): every enemy slowed 40% for
// 6 s (bosses 20%), no target, 60 s cooldown. On QUILL's maps (A1M3 first); under C4 Keep also a
// Technician ability from A3M5 (M5). createSim refuses it until T304d (FEATURE_GATES
// `ability.slowAll`). The icon is a placeholder under its final id (T311a).
import { defineAbility } from '../define.ts';

export const time_dilation = defineAbility({
  id: 'time_dilation',
  name: 'Time Dilation',
  cooldownSec: 60,
  effect: { kind: 'slowAll', slowPct: 0.4, bossSlowPct: 0.2, durationSec: 6 },
  companion: 'quill',
  sprites: { icon: 'icon.ability.time_dilation' },
});
