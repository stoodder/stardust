// Zibzab's shop (T204d, T308; design/progression.md § 4): the Stardust shelf, after A1M3. The open
// question first ("Where does stardust come from?", from the shop's opening until it's asked or
// A2M4), then the Vrell licenses (the Zapcoil sample, given as the shop opens), the global
// upgrades, the tower tune-ups, and the Field Protocol unlocks, each group in catalog order.
// Asking plays the question's scene over the base (app/baseScenes.ts).
import { askOpenQuestion, openQuestionShown } from '../../app/baseScenes.ts';
import type { Offer } from '../../meta/index.ts';
import type { BasePaneProps } from './BasePanes.tsx';
import { Shelf, type ShelfGroup } from './Shelf.tsx';

function shopGroups(offers: readonly Offer[]): ShelfGroup[] {
  const groups: ShelfGroup[] = [
    { title: 'Licenses', offers: offers.filter((o) => o.item.kind === 'license') },
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

/** The open question: a shelf row whose price is Zibzab's warning, and an Ask button. */
function OpenQuestion() {
  return (
    <section class="sd-store-group" aria-label="Ask Zibzab">
      <h2 class="sd-store-group-title">Ask Zibzab</h2>
      <ul class="sd-offers">
        <li class="sd-offer sd-offer-question" data-offer="question:stardust">
          <div class="sd-offer-main">
            <p class="sd-offer-head">
              <span class="sd-offer-name">Where does stardust come from?</span>
            </p>
            <p class="sd-offer-effect">Asking costs nothing.</p>
            <p class="sd-offer-copy">Price first: you won't like it, and you can't return it.</p>
          </div>
          <div class="sd-offer-side">
            <button
              type="button"
              class="sd-button sd-button-small sd-button-primary"
              aria-label="Ask Zibzab where stardust comes from"
              onClick={askOpenQuestion}
            >
              Ask
            </button>
          </div>
        </li>
      </ul>
    </section>
  );
}

export function ShopPane({ view }: BasePaneProps) {
  return (
    <Shelf
      pane="shop"
      view={view}
      group={shopGroups}
      lead={openQuestionShown() ? <OpenQuestion /> : null}
    />
  );
}
