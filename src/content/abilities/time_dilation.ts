// Time Dilation: QUILL's companion ability (design/core-loop.md § 3.2): every enemy slowed 40% for
// 6 s, no target, 60 s cooldown. On QUILL's maps (A1M3 first); under C4 Keep also a Technician
// ability from A3M5 (M5). The sim (systems/abilities.ts, T304d) opens a map-wide field that
// Chills every enemy by `slowPct`, late spawns included; a boss takes half through the boss rule
// (applyChill × BOSS_CHILL_MULT), so `bossSlowPct` is that rule's result, kept here for the HUD
// (a test holds them equal). The icon is a placeholder under its final id (T311a).
import { defineAbility } from '../define.ts';

export const time_dilation = defineAbility({
  id: 'time_dilation',
  name: 'Time Dilation',
  cooldownSec: 60,
  effect: { kind: 'slowAll', slowPct: 0.4, bossSlowPct: 0.2, durationSec: 6 },
  companion: 'quill',
  sprites: { icon: 'icon.ability.time_dilation' },
});
