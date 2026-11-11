// Finders Keepers (design/towers.md § 6.2): Salvage Crane + Scuttle Den. The Den keeps one more
// swarmling (`Tower.linkSwarmlings`), and each kill its swarmlings make pays +1 credit
// (`killCredits`, as Reel It In's: whole, ×1.5 under Linked Up rounded down, so still +1; a spared
// runner pays none; sim/towerEconomy.ts). The Crane gets nothing. Act III early (T604).
import { defineLink } from '../define.ts';

export const finders_keepers = defineLink({
  id: 'finders_keepers',
  name: 'Finders Keepers',
  partners: [
    { tower: 'crane', bonuses: [] },
    { tower: 'burrow', bonuses: [], swarmlings: 1, killCredits: 1 },
  ],
});
