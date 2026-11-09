// The base's buy panes in words (T204d): each offer's name, effect summary (derived from its
// grants, so the text can't drift from what the sim applies), state line, and the presenters'
// framing and thank-you lines. The catalog's item copy is content/upgrades/copy.ts's (T210c);
// these are the screens' own strings. They show from Act I to the finale, so like the catalog copy
// they use no exclamation points and no protected word (story/style-guide.md §§ 2, 3, 6.3, 6.4).
import { silkText } from '../silk.ts';
import { displayName, towerName as hudTowerName } from '../../app/hudText.ts';
import { ABILITIES } from '../../content/abilities/index.ts';
import { TOWERS } from '../../content/towers/index.ts';
import { itemCopy } from '../../content/upgrades/copy.ts';
import {
  PROTOCOLS,
  UPGRADES,
  type ModifierGrant,
  type ProtocolDef,
  type UpgradeDef,
} from '../../content/upgrades/index.ts';
import type { Offer, StorePane } from '../../meta/index.ts';
import { mapMilestone } from '../../meta/index.ts';
import { assertNever } from '../../shared/types.ts';
import { formatCount } from './format.ts';

// The registries keyed by plain strings, for lookups by an offer's id.
const UPGRADE_DEFS: Readonly<Record<string, UpgradeDef>> = UPGRADES;
const PROTOCOL_DEFS: Readonly<Record<string, ProtocolDef>> = PROTOCOLS;
const ABILITY_NAMES: Readonly<Record<string, { readonly name: string }>> = ABILITIES;
const TOWER_SPECS: Readonly<
  Record<
    string,
    { readonly specs?: { readonly a: { name: string }; readonly b: { name: string } } }
  >
> = TOWERS;
const TOWER_ROLES: Readonly<Record<string, { readonly role: string }>> = TOWERS;

function lookup<T>(table: Readonly<Record<string, T>>, id: string): T | undefined {
  return Object.hasOwn(table, id) ? table[id] : undefined;
}

/** A fraction as a signed whole percent: 0.05 → "+5%", −0.15 → "−15%". */
function pct(x: number): string {
  const n = Math.round(x * 100);
  return `${n < 0 ? '−' : '+'}${Math.abs(n)}%`;
}

/** A signed number: 0.5 → "+0.5", −1 → "−1". */
function signed(x: number): string {
  return `${x < 0 ? '−' : '+'}${Math.abs(x)}`;
}

/** A tower id's display name (`rivet` → "Rivet"; T119: its content `name`). */
export function towerName(id: string): string {
  return hudTowerName(id);
}

function abilityName(id: string): string {
  return lookup(ABILITY_NAMES, id)?.name ?? displayName(id);
}

/** A grant's amount: its `pct` as a percent, else its `flat`. */
function amount(g: { readonly pct?: number; readonly flat?: number }, flatUnit = ''): string {
  if (g.pct !== undefined) return pct(g.pct);
  return `${signed(g.flat ?? 0)}${flatUnit}`;
}

const ECONOMY_TEXT: Readonly<Record<string, string>> = {
  startCredits: 'starting credits',
  coreIntegrity: 'core integrity',
  bounty: 'kill bounties',
  earlyCallBonus: 'early-call bonus',
  salvage: 'wreckage salvage',
  clearSpeed: 'wreckage clearing speed',
};

const TOWER_STAT_TEXT: Readonly<Record<string, string>> = {
  damage: 'damage',
  rate: 'fire rate',
  range: 'range',
};

/** One grant as a short effect line ("+0.5 Orbital Strike radius", "−5% Rivet build cost"). */
export function grantText(g: ModifierGrant): string {
  switch (g.kind) {
    case 'towerStat': {
      const who = g.tower === '*' ? 'tower' : towerName(g.tower);
      return `${amount(g)} ${who} ${TOWER_STAT_TEXT[g.stat] ?? g.stat}`;
    }
    case 'towerCost':
      return g.tiers === 'spec'
        ? `${pct(g.pct)} tier-4 cost for ${g.tower === '*' ? 'one tower you pick' : towerName(g.tower)}`
        : `${pct(g.pct)} ${g.tower === '*' ? 'tower' : towerName(g.tower)} build and upgrade cost`;
    case 'economy':
      return g.set !== undefined
        ? `${ECONOMY_TEXT[g.stat] ?? g.stat} set to ${g.set}`
        : `${amount(g)} ${ECONOMY_TEXT[g.stat] ?? g.stat}`;
    case 'sellRefund':
      return `${pct(g.flat)} sell refund`;
    case 'abilityStat': {
      const what = g.stat === 'radius' ? 'radius' : 'cooldown';
      if (g.ability === '*') return `${amount(g)} ability ${what}s`;
      return `${amount(g)} ${abilityName(g.ability)} ${what}`;
    }
    case 'linkBonus':
      return `${pct(g.pct)} link bonuses`;
    case 'tileBonus':
      return g.tile === 'highGround'
        ? `${pct(g.flat)} high-ground range`
        : `${pct(g.flat)} power-node bonus`;
    case 'leakAbsorb':
      return `Absorbs the first ${g.flat} integrity lost to leaks`;
    case 'firstBuildFree':
      return 'First turret each shift costs 0 credits';
    case 'freeCast':
      return `Each ability's first cast in wave ${g.wave} skips its recharge`;
    default:
      return assertNever(g);
  }
}

/**
 * An offer's effect summary: its next (or top) rank's grants, what a spec unlock opens, or the
 * turret a license adds.
 */
export function effectText(o: Offer): string {
  if (o.item.kind === 'license') {
    const role = lookup(TOWER_ROLES, o.item.tower)?.role;
    const what = `Adds the ${towerName(o.item.tower)} to your turrets`;
    return silkText(role === undefined ? what : `${what}: ${role}`);
  }
  if (o.item.kind === 'specs') {
    const specs = lookup(TOWER_SPECS, o.item.tower)?.specs;
    return specs === undefined
      ? 'Unlocks both tier-4 specializations'
      : `Unlocks tier 4: ${specs.a.name} or ${specs.b.name}`;
  }
  const lines = o.grants.map(grantText);
  if (o.protocolSlots > 0) {
    lines.push(`+${o.protocolSlots} Field Protocol slot${o.protocolSlots === 1 ? '' : 's'}`);
  }
  return lines.join(' · ');
}

/** An offer's display name. */
export function offerName(o: Offer): string {
  switch (o.item.kind) {
    case 'upgrade':
      return silkText(lookup(UPGRADE_DEFS, o.item.id)?.name ?? o.item.id);
    case 'protocol':
      return silkText(lookup(PROTOCOL_DEFS, o.item.id)?.name ?? o.item.id);
    case 'specs':
      return `${towerName(o.item.tower)} specializations`;
    case 'license':
      return `${towerName(o.item.tower)} license`;
    default:
      return assertNever(o.item);
  }
}

/** Shown where an item has no catalog copy yet (copy.test.ts should make this unreachable). */
export const MISSING_COPY = 'Copy pending.';

/** The seller's line for an offer: the catalog copy, or null (spec unlocks have none). */
export function offerCopy(o: Offer): string | null {
  switch (o.item.kind) {
    case 'upgrade':
      return silkText(lookup(UPGRADE_DEFS, o.item.id)?.copy ?? MISSING_COPY);
    case 'protocol':
      return silkText(lookup(PROTOCOL_DEFS, o.item.id)?.copy ?? MISSING_COPY);
    case 'specs':
      return null;
    case 'license':
      return silkText(itemCopy(`license_${o.item.tower}`) ?? MISSING_COPY);
    default:
      return assertNever(o.item);
  }
}

/** The price tag: "2 Intel", "120 Stardust". */
export function priceText(o: Offer): string {
  return `${formatCount(o.price)} ${o.currency === 'intel' ? 'Intel' : 'Stardust'}`;
}

/** "Arrives after The Audit": an item not stocked yet. */
export function arrivalText(o: Offer): string {
  return o.availableAfter === null
    ? 'Not stocked yet'
    : `Arrives after ${mapMilestone(o.availableAfter)}`;
}

/** Who presents each pane, and how. */
export interface Presenter {
  /** The pane's owner line ("Research Command · QUILL"). */
  readonly who: string;
  /** The speaker's name, for the thank-you line. */
  readonly speaker: string;
  /** The framing line under the owner. */
  readonly intro: string;
  /** Thank-you lines after a purchase, used in turn. */
  readonly thanks: readonly string[];
  /** The button's word for a purchase. */
  readonly verb: string;
  /** What the speaker says when the bank is short. */
  readonly short: (o: Offer, bank: number) => string;
  /** What the speaker says about an item already owned in full. */
  readonly owned: string;
}

export const PRESENTERS: Readonly<Record<StorePane, Presenter>> = {
  rnd: {
    who: 'Research Command · QUILL',
    speaker: 'QUILL',
    intro:
      'Every medal files one Intel here, and Intel buys options. I keep the paperwork. I like paperwork.',
    thanks: [
      "Requisition filed. It's live from your next shift. Thank you, Technician.",
      'Installed and logged. I checked it twice. Then I checked the checking.',
      "Done. That's one more option on file. I like options.",
    ],
    verb: 'Order',
    short: (o, bank) =>
      `That one is ${priceText(o)}. You have ${formatCount(bank)}. Medals pay Intel, one each.`,
    owned: 'Already on file, Technician. It stays installed.',
  },
  shop: {
    who: "Zibzab's Genuine Pre-Owned Defensive Solutions",
    speaker: 'Zibzab',
    intro: 'Price first: everything has one. Read it, then buy it. No refunds, no regrets.',
    thanks: [
      'Sold. Pleasure doing business, Valued Customer. No refunds, no regrets.',
      'Wrapped. Not literally. Wrapping costs extra.',
      'Sold. Zibzab thanks you. The shell thanks you. The shell is also Zibzab.',
    ],
    verb: 'Buy',
    short: (o, bank) =>
      `Price first: ${formatCount(o.price)} stardust. You have ${formatCount(bank)}. Zibzab does not do layaway.`,
    owned: 'You own the whole thing already. Zibzab does not sell things twice. Usually.',
  },
  engineering: {
    who: 'Engineering · QUILL',
    speaker: 'QUILL',
    intro:
      'Tier approvals are signed. One unlock opens both tier-4 specializations of a turret; you pick in the field.',
    thanks: [
      'Specs unlocked. At tier 4, pick one. You can pick the other next time.',
      "Approved and filed. Your turret doesn't know yet. It will be thrilled.",
    ],
    verb: 'Unlock',
    short: (o, bank) =>
      `That unlock is ${priceText(o)}. You have ${formatCount(bank)}. Medals pay Intel, one each.`,
    owned: 'Both specializations are already unlocked for that turret.',
  },
};
