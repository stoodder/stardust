// Zibzab's crate (act3.md § A3M6; D146; T714): it opens as A3M6's briefing closes. Clock in first
// opens the crate's card over the briefing (app/commands.ts `dismissBriefing` asks `crateIntercepts`):
// the NO REFUNDS sticker peeled off, then what it holds. Every Vrell tune-up rank the player
// doesn't own, installed at no cost, listed; or, when they own them all, the Field Protocols to
// pick one from (the pick waits CHOICE_LOCK_MS, as a story choice does). Taking it closes the
// briefing; app/router.ts then opens the crate on the save (`openCrateAtBriefing(map, pick)`).
// The view is pure over the offer (app/storyMeta.ts `crateOffer`) and the save; the card is
// crateCard.tsx.
import { signal } from '@preact/signals';
import { PROTOCOLS, UPGRADES } from '../../content/upgrades/index.ts';
import type { ProtocolId, UpgradeId } from '../../content/types.ts';
import { CRATE, type SaveData } from '../../meta/index.ts';
import { crateOffer } from '../../app/storyMeta.ts';
import { grantText } from './storeText.ts';

/** What the crate holds, as its card lists it. */
export type CrateView =
  | { readonly kind: 'tune_ups'; readonly rows: readonly CrateRow[] }
  | { readonly kind: 'pick'; readonly options: readonly CrateOption[] }
  /** Nothing left to give: only the sticker, peeled off. */
  | { readonly kind: 'empty' };

/** A tune-up the crate installs: "Zapcoil Tune-up", "Ranks 2–3". */
export interface CrateRow {
  readonly id: UpgradeId;
  readonly name: string;
  readonly ranks: string;
}

/** A Field Protocol the player may pick. */
export interface CrateOption {
  readonly id: ProtocolId;
  readonly name: string;
  readonly effect: string;
}

/** The offer as app/storyMeta.ts's `crateOffer` gives it. */
export interface CrateOfferLike {
  readonly tuneUps: Readonly<Partial<Record<UpgradeId, number>>>;
  readonly protocols: readonly ProtocolId[];
}

/** "Rank 3", "Ranks 2–3", "All 3 ranks": from the rank owned to the top. */
export function ranksText(owned: number, top: number): string {
  if (owned <= 0) return top === 1 ? 'Rank 1' : `All ${top} ranks`;
  if (owned + 1 === top) return `Rank ${top}`;
  return `Ranks ${owned + 1}–${top}`;
}

/** The card's view of `offer` over `save`, or null with no crate to open (opened, or no save). */
export function crateView(offer: CrateOfferLike | null, save: SaveData | null): CrateView | null {
  if (offer === null || save === null) return null;
  const owned: Readonly<Partial<Record<string, number>>> = save.upgrades;
  const ids = Object.keys(offer.tuneUps).filter((id): id is UpgradeId =>
    Object.hasOwn(UPGRADES, id),
  );
  if (ids.length > 0) {
    return {
      kind: 'tune_ups',
      rows: ids.map((id) => ({
        id,
        name: UPGRADES[id].name,
        ranks: ranksText(owned[id] ?? 0, offer.tuneUps[id] ?? 0),
      })),
    };
  }
  if (offer.protocols.length === 0) return { kind: 'empty' };
  return {
    kind: 'pick',
    options: offer.protocols.map((id) => ({
      id,
      name: PROTOCOLS[id].name,
      effect: PROTOCOLS[id].grants.map(grantText).join(' · '),
    })),
  };
}

/** The crate's view on `mapId` for `save` (the map it opens on, unopened), else null. */
export function crateHere(mapId: string | null, save: SaveData | null): CrateView | null {
  return mapId === CRATE.map ? crateView(crateOffer(save), save) : null;
}

/** The sticker on the crate, peeled off (act3.md § A3M6). */
export const STICKER = 'No refunds';

/** The card's line under its title, by what the crate holds. */
export function crateLine(view: CrateView): string {
  if (view.kind === 'tune_ups') {
    return 'Every tune-up rank your Vrell turrets were missing, installed at no cost.';
  }
  if (view.kind === 'pick') {
    return 'Your Vrell turrets are fully tuned already. Pick one Field Protocol instead.';
  }
  return 'You own everything it could hold. The sticker was the point.';
}

/**
 * The crate's card while it is up over the briefing (the map it opens on), the protocol picked so
 * far, and whether the player has taken it (the briefing may then close).
 */
export const crate = {
  open: signal(false),
  pick: signal<ProtocolId | null>(null),
  taken: signal(false),
};

/** Forgets the card (a new briefing, or a battle torn down). */
export function resetCrate(): void {
  crate.open.value = false;
  crate.pick.value = null;
  crate.taken.value = false;
}

/** Whether the card can be taken: a pick made when it asks for one. */
export function canTake(view: CrateView, pick: ProtocolId | null): boolean {
  return view.kind !== 'pick' || (pick !== null && view.options.some((o) => o.id === pick));
}

/**
 * Clock in's question (app/commands.ts): with a crate to open here and the card not yet taken,
 * open the card instead of closing the briefing (true: the briefing stays).
 */
export function crateIntercepts(view: CrateView | null): boolean {
  if (view === null || crate.taken.value) return false;
  crate.open.value = true;
  return true;
}

/**
 * The card's answer: take the crate (with its pick). Returns false while a pick is still owed.
 */
export function takeCrate(view: CrateView): boolean {
  if (!canTake(view, crate.pick.value)) return false;
  crate.taken.value = true;
  crate.open.value = false;
  return true;
}

/** The pick the router opens the crate with, once taken (undefined: none owed or none made). */
export function takenPick(): ProtocolId | undefined {
  return crate.taken.value ? (crate.pick.value ?? undefined) : undefined;
}
