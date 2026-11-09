// Crossfire (design/towers.md § 6.2): Rivet + Thumper, both +10% fire rate. Act I's teaching link
// (A1M1 W3, when the Thumper unlocks beside the Rivets).
import { defineLink } from '../define.ts';

export const crossfire = defineLink({
  id: 'crossfire',
  name: 'Crossfire',
  partners: [
    { tower: 'rivet', bonuses: [{ stat: 'rate', pct: 0.1 }] },
    { tower: 'thumper', bonuses: [{ stat: 'rate', pct: 0.1 }] },
  ],
});
