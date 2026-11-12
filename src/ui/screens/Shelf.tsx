// A base pane's shelf (T204d): the presenter's line, then the pane's offers in groups. Each row
// shows the item's name, rank pips, effect summary, and its seller's copy, with its price and a
// buy button, or "Owned" ("Given" for a gift), or what it waits for ("Arrives after The Audit",
// "Needs the Prism Spire"). A purchase writes the
// save at once (app/save.ts `purchase`), plays the upgrade sound, and the presenter says thanks in
// a polite live region. After a purchase the focus stays on that row: its button (the next rank)
// or, when the item is now owned in full and the button is gone, the row itself (U6). A button the
// bank can't cover is aria-disabled and explains itself when pressed. While QUILL is offline (A3M5
// under C4 Rewrite, from C4 until A3M5 is won: meta `quillOffline` on the frontier; T713), R&D
// shows no QUILL text: no item copy, no intro, no thanks (a refusal still says why). The jailbreak's
// row (T709) shows the classes it brings back, drawn jailbroken (T731's icon variant). An upgrade
// whose price the story paid back (Purge's QUILL Rapport, the uplink's Mk II) reads "Refunded", and
// one never bought then reads "No longer stocked", with no button (storeText `retiredText`).
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { playSfx } from '../../app/audio.ts';
import { activeSave, purchase, storeShelf } from '../../app/save.ts';
import { JailbreakConfirm } from './jailbreakConfirm.tsx'; // T714
import { TOWERS } from '../../content/towers/index.ts';
import { quillOffline, type Offer, type SaveData, type StorePane } from '../../meta/index.ts';
import { Icon, JAILBROKEN_ICON } from '../hud/Icon.tsx';
import {
  PRESENTERS,
  arrivalText,
  effectText,
  offerCopy,
  offerName,
  priceText,
  retiredText,
  towerName,
} from './storeText.ts';
import type { CampaignView } from './state.ts';
import './base.css';
import './Shelf.css';

const TOWER_ICONS: Readonly<Record<string, { readonly sprites: { readonly icon: string } }>> =
  TOWERS;

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
const thanked: Record<StorePane, number> = { rnd: 0, shop: 0, engineering: 0, xenotech: 0 };

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
  if (o.item.kind === 'jailbreak') return 'jailbreak';
  return o.item.kind === 'specs' || o.item.kind === 'license' || o.item.kind === 'attune'
    ? `${o.item.kind}:${o.item.tower}`
    : `${o.item.kind}:${o.item.id}`;
}

/**
 * The jailbreak row's art (T709): each class it brings back (the revoked ones; once taken, the
 * jailbroken ones), drawn jailbroken: the Everglow plate scratched out, the lights Vrell orange.
 */
function JailbreakArt({ save }: { save: SaveData | null }) {
  const u = save?.unlocks;
  const towers = (u?.revokedTowers.length ?? 0) > 0 ? u!.revokedTowers : (u?.jailbroken ?? []);
  if (towers.length === 0) return null;
  return (
    <span class="sd-offer-art" aria-hidden="true" data-testid="jailbreak-art">
      {towers.map((t) => (
        <Icon
          key={t}
          id={TOWER_ICONS[t]?.sprites.icon ?? `icon.tower.${t}`}
          variant={JAILBROKEN_ICON}
        />
      ))}
    </span>
  );
}

function OfferRow({
  offer,
  onBuy,
  quiet,
}: {
  offer: Offer;
  onBuy: (o: Offer) => void;
  /** The presenter is offline: no seller's copy (QUILL under Rewrite). */
  quiet: boolean;
}) {
  const p = PRESENTERS[offer.pane];
  const name = offerName(offer);
  const copy = quiet ? null : offerCopy(offer);
  const save = activeSave();
  const retired = retiredText(offer, save);
  const r = offer.refusal;
  const state = retired !== null ? 'retired' : r === null ? 'buyable' : r;
  const bank = offer.currency === 'intel' ? 'sd-intel' : 'sd-stardust';
  let side;
  if (retired !== null) {
    side = (
      <span class={offer.owned > 0 ? 'sd-offer-owned' : 'sd-offer-wait'} data-testid="retired">
        {retired}
      </span>
    );
  } else if (r === 'not_stocked' || r === 'pane_locked') {
    side = (
      <span class="sd-offer-wait">
        <span class="sd-lock" aria-hidden="true" />
        {arrivalText(offer, save)}
      </span>
    );
  } else if (r === 'not_owned' || r === 'no_specs') {
    side = (
      <span class="sd-offer-wait">
        {r === 'not_owned'
          ? `Needs the ${towerName(offer.needs ?? offer.tower ?? '')}`
          : 'Arrives in a later shipment'}
      </span>
    );
  } else if (r === 'maxed') {
    side = <span class="sd-offer-owned">{offer.gift ? 'Given' : 'Owned'}</span>;
  } else {
    const short = r === 'short';
    side = (
      <>
        <span class={`sd-offer-price ${short ? 'sd-offer-short' : bank}`} data-critical="price">
          {priceText(offer)}
        </span>
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
      {offer.item.kind === 'jailbreak' && <JailbreakArt save={save} />}
      <div class="sd-offer-main">
        <p class="sd-offer-head">
          <span class="sd-offer-name">{name}</span>
          {offer.item.kind === 'upgrade' && <RankPips owned={offer.owned} ranks={offer.ranks} />}
        </p>
        <p class="sd-offer-effect">{effectLine(offer)}</p>
        {copy !== null && (
          <p class="sd-offer-copy" data-voice="shelf-copy">
            {copy}
          </p>
        )}
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
  // QUILL offline (A3M5 under Rewrite): R&D runs without a word from it.
  const quiet = pane === 'rnd' && quillOffline(view.frontier ?? '', activeSave());
  const groups = group?.(offers) ?? [{ title: '', offers }];
  const bank = pane === 'shop' ? view.stardust : view.intel;

  // T714: the jailbreak asks first (jailbreakConfirm.tsx), so the moment is seen, free or not.
  const [confirming, setConfirming] = useState<Offer | null>(null);
  const onBuy = (o: Offer): void => {
    if (o.item.kind === 'jailbreak' && o.refusal === null) {
      setConfirming(o);
      return;
    }
    buy(o);
  };

  const buy = (o: Offer): void => {
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
    const unlock =
      o.item.kind === 'specs' ||
      o.item.kind === 'license' ||
      o.item.kind === 'attune' ||
      o.item.kind === 'jailbreak';
    playSfx(unlock ? 'unlock' : 'upgrade');
    const line = p.thanks[thanked[pane]++ % p.thanks.length] ?? '';
    if (r.writeFailed === null && quiet) return;
    setSaid(
      r.writeFailed === null
        ? { tone: 'thanks', text: line }
        : { tone: 'warn', text: r.writeFailed },
    );
  };

  return (
    <div class="sd-store" ref={root}>
      {confirming !== null && (
        <JailbreakConfirm
          towers={activeSave()?.unlocks.revokedTowers ?? []}
          price={confirming.price}
          onConfirm={() => {
            setConfirming(null);
            buy(confirming);
          }}
          onCancel={() => {
            bought.current = offerKey(confirming);
            setConfirming(null);
          }}
        />
      )}
      <div class="sd-store-intro">
        <p class="sd-pane-who">{p.who}</p>
        <p
          class={`sd-store-line${said === null ? '' : ` sd-store-${said.tone}`}`}
          role="status"
          data-testid="store-line"
          data-voice="store-line"
        >
          {said === null ? (
            quiet ? null : (
              p.intro
            )
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
                <OfferRow key={offerKey(o)} offer={o} onBuy={onBuy} quiet={quiet} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
