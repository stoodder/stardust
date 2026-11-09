// Reel It In (design/towers.md § 6.2): Salvage Crane + Grapple Harpoon. Harpoon kills pay +3
// credits, and the Harpoon gets +10% fire rate. Act II early. A T400a stub: both towers are
// refused until T408 (which runs the kill credits), so the link can't form before then.
import { defineLink } from '../define.ts';

export const reel_it_in = defineLink({
  id: 'reel_it_in',
  name: 'Reel It In',
  partners: [
    { tower: 'crane', bonuses: [] },
    { tower: 'harpoon', bonuses: [{ stat: 'rate', pct: 0.1 }], killCredits: 3 },
  ],
});
