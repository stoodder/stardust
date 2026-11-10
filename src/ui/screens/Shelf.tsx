// A base pane's shelf (T204d): the presenter's line, then the pane's offers in groups. Each row
// shows the item's name, rank pips, effect summary, and its seller's copy, with its price and a
// buy button, or "Owned", or what it waits for ("Arrives after The Audit"). A purchase writes the
// save at once (app/save.ts `purchase`), plays the upgrade sound, and the presenter says thanks in
// a polite live region. After a purchase the focus stays on that row: its button (the next rank)
// or, when the item is now owned in full and the button is gone, the row itself (U6). A button the
// bank can't cover is aria-disabled and explains itself when pressed.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../app/audio.ts';
import { activeSave, purchase, storeShelf } from '../../app/save.ts';
import type { Offer, StorePane } from '../../meta/index.ts';
import {
  PRESENTERS,
  arrivalText,
  effectText,
  offerCopy,
  offerName,
  priceText,
  towerName,
} from './storeText.ts';
import type { CampaignView } from './state.ts';
import './base.css';

export interface ShelfGroup {
  readonly title: string;
  readonly offers: readonly Offer[];
}

export interface ShelfProps {
  readonly pane: StorePane;
  readonly view: CampaignView;
  /** Splits the pane's offers into titled groups (default: one untitled group). */
  readonly group?: (offers: readonly Offer[]) => readonly ShelfGroup[];
  /** Shown above the groups (the shop's open question). */
  readonly lead?: ComponentChildren;
}

/** Purchases made per pane this session, so the thank-you lines take turns. */
const thanked: Record<StorePane, number> = { rnd: 0, shop: 0, engineering: 0 };

/** Rank pips: one 5 px square per rank, filled for each owned. */
export function RankPips({ owned, ranks }: { owned: number; ranks: number }) {
  return (
    <span class="sd-pips" role="img" aria-label={`Rank ${owned} of ${ranks}`}>
      {Array.from({ length: ranks }, (_, i) => (
        <span key={i} class={i < owned ? 'sd-pip sd-pip-on' : 'sd-pip'} />
      ))}
    </span>
  );
}

type Said = { readonly tone: 'thanks' | 'refusal' | 'warn'; readonly text: string } | null;

/** The effect line: what the next rank adds, or the top rank's once owned in full. */
function effectLine(o: Offer): string {
  const effect = effectText(o);
  if (o.ranks <= 1) return effect;
  const rank = Math.min(o.owned + 1, o.ranks);
  return `Rank ${rank}: ${effect}`;
}

/** A row's stable key: the item it sells. */
function offerKey(o: Offer): string {
  return o.item.kind === 'specs' || o.item.kind === 'license'
    ? `${o.item.kind}:${o.item.tower}`
    : `${o.item.kind}:${o.item.id}`;
}

function OfferRow({ offer, onBuy }: { offer: Offer; onBuy: (o: Offer) => void }) {
  const p = PRESENTERS[offer.pane];
  const name = offerName(offer);
  const copy = offerCopy(offer);
  const r = offer.refusal;
  const state = r === null ? 'buyable' : r;
  const bank = offer.currency === 'intel' ? 'sd-intel' : 'sd-stardust';
  let side;
  if (r === 'not_stocked' || r === 'pane_locked') {
    side = (
      <span class="sd-offer-wait">
        <span class="sd-lock" aria-hidden="true" />
        {arrivalText(offer, activeSave())}
      </span>
    );
  } else if (r === 'not_owned' || r === 'no_specs') {
    side = (
      <span class="sd-offer-wait">
        {r === 'not_owned'
          ? `Needs the ${towerName(offer.tower ?? '')}`
          : 'Arrives in a later shipment'}
      </span>
    );
  } else if (r === 'maxed') {
    side = <span class="sd-offer-owned">Owned</span>;
  } else {
    const short = r === 'short';
    side = (
      <>
        <span class={`sd-offer-price ${short ? 'sd-offer-short' : bank}`}>{priceText(offer)}</span>
        <button
          type="button"
          class={`sd-button sd-button-small${short ? '' : ' sd-button-primary'}`}
          aria-disabled={short}
          aria-label={`${p.verb} ${name}, ${priceText(offer)}${short ? ', not enough' : ''}`}
          onClick={() => onBuy(offer)}
        >
          {p.verb}
        </button>
      </>
    );
  }
  return (
    <li class={`sd-offer sd-offer-${state}`} data-offer={offerKey(offer)} tabIndex={-1}>
      <div class="sd-offer-main">
        <p class="sd-offer-head">
          <span class="sd-offer-name">{name}</span>
          {offer.item.kind === 'upgrade' && <RankPips owned={offer.owned} ranks={offer.ranks} />}
        </p>
        <p class="sd-offer-effect">{effectLine(offer)}</p>
        {copy !== null && <p class="sd-offer-copy">{copy}</p>}
      </div>
      <div class="sd-offer-side">{side}</div>
    </li>
  );
}

/** A base pane: its presenter, then its offers. */
export function Shelf({ pane, view, group, lead }: ShelfProps) {
  const [said, setSaid] = useState<Said>(null);
  const root = useRef<HTMLDivElement>(null);
  /** The row just bought from: the focus returns to it after the re-render. */
  const bought = useRef<string | null>(null);
  useEffect(() => {
    const key = bought.current;
    if (key === null) return;
    bought.current = null;
    const row = root.current?.querySelector<HTMLElement>(`[data-offer="${CSS.escape(key)}"]`);
    (row?.querySelector<HTMLElement>('button') ?? row)?.focus();
  });
  const p = PRESENTERS[pane];
  const offers = storeShelf(pane);
  const groups = group?.(offers) ?? [{ title: '', offers }];
  const bank = pane === 'shop' ? view.stardust : view.intel;

  const onBuy = (o: Offer): void => {
    if (o.refusal === 'short') {
      playSfx('reject');
      setSaid({ tone: 'refusal', text: p.short(o, bank) });
      return;
    }
    if (o.refusal === 'maxed') {
      setSaid({ tone: 'refusal', text: p.owned });
      return;
    }
    const r = purchase(o.item);
    if (!r.ok) {
      playSfx('reject');
      setSaid({
        tone: 'refusal',
        text:
          r.reason === 'short' ? p.short(o, bank) : `${offerName(o)} can't be bought right now.`,
      });
      return;
    }
    bought.current = offerKey(o);
    playSfx(o.item.kind === 'specs' || o.item.kind === 'license' ? 'unlock' : 'upgrade');
    const line = p.thanks[thanked[pane]++ % p.thanks.length] ?? '';
    setSaid(
      r.writeFailed === null
        ? { tone: 'thanks', text: line }
        : { tone: 'warn', text: r.writeFailed },
    );
  };

  return (
    <div class="sd-store" ref={root}>
      <div class="sd-store-intro">
        <p class="sd-pane-who">{p.who}</p>
        <p
          class={`sd-store-line${said === null ? '' : ` sd-store-${said.tone}`}`}
          role="status"
          data-testid="store-line"
        >
          {said === null ? (
            p.intro
          ) : (
            <>
              {said.tone !== 'warn' && <span class="sd-store-speaker">{p.speaker}: </span>}
              {said.text}
            </>
          )}
        </p>
      </div>
      <div class="sd-store-list">
        {lead}
        {groups.map((g) => (
          <section key={g.title} class="sd-store-group" aria-label={g.title || p.who}>
            {g.title !== '' && <h2 class="sd-store-group-title">{g.title}</h2>}
            <ul class="sd-offers">
              {g.offers.map((o) => (
                <OfferRow key={offerKey(o)} offer={o} onBuy={onBuy} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
