// Conductive (design/towers.md § 6.2): Sprinkler + Zapcoil. The Zapcoil's chain makes 2 more jumps;
// the Sprinkler's pulse Soaks from tier 1 (3 s, its tier-3 duration), and a Soaked enemy takes +25%
// Energy damage (enemies.md § 2.4), so the pair is Act I's shield answer. Debuts on A1M3.
import { defineLink } from '../define.ts';

export const conductive = defineLink({
  id: 'conductive',
  name: 'Conductive',
  partners: [
    { tower: 'sprinkler', bonuses: [], soakedSec: 3 },
    { tower: 'zapcoil', bonuses: [], chainJumps: 2 },
  ],
});
