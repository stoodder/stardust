// Harmony (design/towers.md § 6.2): Mindspike Obelisk + Hum Choir. The Mindspike hits 1 extra
// target with each shot (`extraTargets`: whole, ×1.5 under Linked Up rounded down, so still 1;
// sim/attacks/extraTargets.ts), and the Choir's auras reach 0.5 tiles further (`auraRadiusTiles`,
// scaled like any link bonus; sim/systems/auras.ts). Lullaby's radius isn't an aura: it doesn't
// grow. Aelari + Skitterkin, Act III early–mid (T607).
import { defineLink } from '../define.ts';

export const harmony = defineLink({
  id: 'harmony',
  name: 'Harmony',
  partners: [
    { tower: 'mindspike', bonuses: [], extraTargets: 1 },
    { tower: 'choir', bonuses: [], auraRadiusTiles: 0.5 },
  ],
});
