// Lightsong (design/towers.md § 6.2): Prism Spire + Seer's Lantern. The Prism ramps 30% faster
// (`Tower.linkRampPct`); the Lantern's Marks are +5% (`Tower.linkMarkPct`; T508). Act II late.
// Inert until both towers lift their stubs (towers/index.ts STUB_TOWER_TASKS: T504, T508).
import { defineLink } from '../define.ts';

export const lightsong = defineLink({
  id: 'lightsong',
  name: 'Lightsong',
  partners: [
    { tower: 'prism', bonuses: [], rampPct: 0.3 },
    { tower: 'lantern', bonuses: [], markPct: 0.05 },
  ],
});
