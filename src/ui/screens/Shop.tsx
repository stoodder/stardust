// Zibzab's shop (T204d; design/progression.md § 4): the Stardust shelf, after A1M3. Global
// upgrades, then the tower tune-ups, then the Field Protocol unlocks, each group in catalog order.
// Vrell licenses and the "Where does stardust come from?" item join with their towers and the
// dialogue runtime (M3).
import type { Offer } from '../../meta/index.ts';
import type { BasePaneProps } from './BasePanes.tsx';
import { Shelf, type ShelfGroup } from './Shelf.tsx';

function shopGroups(offers: readonly Offer[]): ShelfGroup[] {
  const groups: ShelfGroup[] = [
    {
      title: 'Global upgrades',
      offers: offers.filter((o) => o.item.kind === 'upgrade' && o.tower === null),
    },
    {
      title: 'Tune-ups',
      offers: offers.filter((o) => o.item.kind === 'upgrade' && o.tower !== null),
    },
    { title: 'Field Protocols', offers: offers.filter((o) => o.item.kind === 'protocol') },
  ];
  return groups.filter((g) => g.offers.length > 0);
}

export function ShopPane({ view }: BasePaneProps) {
  return <Shelf pane="shop" view={view} group={shopGroups} />;
}
