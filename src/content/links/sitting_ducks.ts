// Sitting Ducks (design/towers.md § 6.2): Thumper + Sprinkler. The Thumper deals +20% damage to
// Chilled enemies (a conditional bonus, checked per victim when a shell lands); the Sprinkler's
// pulse radius grows by 0.3 tiles. Debuts on A1M2.
import { defineLink } from '../define.ts';

export const sitting_ducks = defineLink({
  id: 'sitting_ducks',
  name: 'Sitting Ducks',
  partners: [
    { tower: 'thumper', bonuses: [{ stat: 'damage', pct: 0.2, vsStatus: ['chilled'] }] },
    { tower: 'sprinkler', bonuses: [{ stat: 'range', flat: 0.3 }] },
  ],
});
