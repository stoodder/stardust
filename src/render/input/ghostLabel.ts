// The placement ghost's tile-bonus label (D059): over high ground or a power node, the ghost says
// what the tile would add ("+25% RANGE", "+20% RATE", or AURA for a tower with no attack). The
// words are built once per battle from its modifiers (T234), so the hover allocates nothing.
import type { IdSpace, TileChar } from '../../content/types.ts';
import { tileAndLinkRules, type SimConfig } from '../../sim/index.ts';

/** A battle's ghost labels, one per tile bonus. */
export interface GhostLabels {
  readonly range: string;
  readonly rate: string;
  readonly aura: string;
}

/** A tile bonus fraction as the label's percent ("+25%"). */
function pct(frac: number): string {
  return `+${Math.round(frac * 100)}%`;
}

/** The ghost labels for a battle (its modifiers hold for the whole battle). */
export function ghostLabels(modifiers: SimConfig<IdSpace>['modifiers']): GhostLabels {
  const rules = tileAndLinkRules(modifiers);
  return {
    range: `${pct(rules.highGroundRangePct)} RANGE`,
    rate: `${pct(rules.powerNodeRatePct)} RATE`,
    aura: `${pct(rules.powerNodeAuraPct)} AURA`,
  };
}

/**
 * The tile bonus a tower built on `tile` would get, as the ghost's label: RANGE on high ground,
 * RATE (or AURA, for a tower with no attack) on a power node; null elsewhere.
 */
export function ghostLabel(
  labels: GhostLabels,
  tile: TileChar | undefined,
  hasAttack: boolean,
): string | null {
  if (tile === '^') return labels.range;
  if (tile === '+') return hasAttack ? labels.rate : labels.aura;
  return null;
}

/**
 * The hover label over a wreck a plain click would clear (D097): what the click does, and the
 * salvage it pays after the run's modifiers, in the 3×5 font ("SEND DRONE +40").
 */
export function salvageLabel(pays: number): string {
  return pays > 0 ? `SEND DRONE +${pays}` : 'SEND DRONE';
}
