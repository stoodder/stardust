// The tower panel's view model (T225 split from app/hud.ts; T106, T202d): the selected tower's
// stats, bonuses, upgrade, sell value, and tier-4 choice, rebuilt only when what it shows changes.
// Content text goes through `silkText` here, so the components draw it as given (D059).
import type { CompiledTowerDef } from '../content/compiled.ts';
import { MAX_TIER_BEFORE_SPEC } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import { gridToScreen, type IsoOrigin } from '../render/iso.ts';
import type { DeepReadonly } from '../shared/types.ts';
import {
  darkDims,
  liveTileAt,
  sellValueInto,
  towerStats,
  type SellValue,
  type Sim,
  type SimConfig,
  type SpecChoice,
  type PurchaseState,
  type TierStatDelta,
  type Tower,
  type TowerBonuses,
  type TowerStatLine,
} from '../sim/index.ts';
import { LIST_PRICE_STATE, priceOf } from './hudViews.ts';
import type { SelectedTowerView, SpecChoiceView, SpecOptionView } from '../ui/state.ts';
import { silkText } from '../ui/silk.ts';
import { CARD_CHARS, PANEL_CHARS, wrapParts } from '../ui/hud/layout.ts';
import {
  beamDps,
  bonusTexts,
  darkTexts,
  deltaText,
  displayName,
  rampText,
  specDescription,
  specLockText,
  statLineText,
} from './hudText.ts';

/** "Next: +0.5/s · +3 pierce" as wrappable parts, the label on the first. */
function nextParts(delta: string): string[] {
  const parts = delta.split(' · ');
  parts[0] = `Next: ${parts[0] ?? ''}`;
  return parts;
}

/**
 * The tier-4 choice for a tier-3 tower whose type has specs (else null), each priced as the sim
 * would charge it now (`purchasePriceInto` on `state`, a `spec` purchase: D077).
 */
export function specChoice(
  def: DeepReadonly<CompiledTowerDef>,
  tier: number,
  bonuses: TowerBonuses,
  modifiers: SimConfig<IdSpace>['modifiers'],
  unlocked: boolean,
  lockText: string,
  state: PurchaseState = LIST_PRICE_STATE,
): SpecChoiceView | null {
  if (def.specs === null || tier !== MAX_TIER_BEFORE_SPEC) return null;
  const option = (choice: SpecChoice): SpecOptionView => {
    const tierDef = def.specs![choice]; // checked above
    const description = specDescription(
      towerStats(def, MAX_TIER_BEFORE_SPEC + 1, bonuses, modifiers, choice),
      tierDef,
      // What the choice gives up, against the tier it replaces (D138).
      def.tiers[MAX_TIER_BEFORE_SPEC - 1],
    );
    const { cost, price } = priceOf(state, modifiers, def.id, tierDef.cost, 'spec');
    return {
      choice,
      name: silkText(tierDef.name ?? displayName(`${def.id}_${choice}`)),
      cost,
      price,
      description,
      descLines: wrapParts(description.split(' · '), CARD_CHARS),
    };
  };
  return {
    locked: !unlocked,
    lockLines: unlocked ? [] : wrapParts([silkText(lockText)], PANEL_CHARS),
    options: [option('a'), option('b')],
  };
}

/** A beam's damage-per-second change from an upgrade (T531): the tier's dps after, less now. */
function beamDpsDelta(
  now: Pick<TowerStatLine, 'damage' | 'ratePerSec'>,
  d: Pick<TierStatDelta, 'damage' | 'ratePerSec'>,
  tickSec: number,
): number {
  const after = { damage: now.damage + d.damage, ratePerSec: now.ratePerSec + d.ratePerSec };
  return beamDps(after, tickSec) - beamDps(now, tickSec);
}

/** What an upgrade does to a beam's ramp, for the "Next:" line ("ramp ×5 in 8 s"), if anything. */
function rampDelta(
  now: { readonly rampCap: number; readonly rampPctPerTick: number },
  next: DeepReadonly<CompiledTowerDef['tiers'][number]['attack']>,
): string[] {
  if (next === null || next.kind !== 'beam') return [];
  if (next.rampCap === now.rampCap && next.rampPctPerTick === now.rampPctPerTick) return [];
  return next.rampCap > 1 ? [rampText(next.rampCap, next.rampPctPerTick)] : [];
}

/**
 * The selected beam tower's live ramp for the panel's ramp row (T531): its strongest lit beam's
 * multiplier (Refractor's three each ramp on their own), floored to a tenth so the signal moves
 * about five times a second, not every frame; 1 with no beam on a target, or null when `uid`
 * isn't a standing beam tower that ramps.
 */
export function selectedRamp(sim: Sim<IdSpace>, uid: number): number | null {
  if (uid === 0) return null;
  const pool = sim.state.towers;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (!t.alive || t.uid !== uid) continue;
    const a = t.tierDef?.attack ?? null;
    if (a === null || a.kind !== 'beam' || a.rampCap <= 1) return null;
    let r = 1;
    if (t.targetUid !== 0 && t.beamRamp > r) r = t.beamRamp;
    if (t.beam2Uid !== 0 && t.beam2Ramp > r) r = t.beam2Ramp;
    if (t.beam3Uid !== 0 && t.beam3Ramp > r) r = t.beam3Ramp;
    return Math.floor(r * 10 + 1e-6) / 10;
  }
  return null;
}

/** The last selected-panel key's parts and string (selectedKey reuses them while unchanged). */
const keyParts: (number | string | boolean | null)[] = [];
const keyNext: (number | string | boolean | null)[] = [];
let keyText = '';

/**
 * The selected tower's panel inputs, as a key: the view is rebuilt only when it changes. Called
 * every frame, so it allocates nothing while the inputs hold still (D059, C7): the parts go into a
 * scratch array, and the joined string is rebuilt only when one of them changed.
 */
function selectedKey(
  t: DeepReadonly<Tower>,
  sell: SellValue,
  x: number,
  y: number,
  sale: PurchaseState,
  tile: string,
  dark: number,
): string {
  // Credits stay out: the component reads them itself (an unaffordable button dims).
  const k = keyNext;
  k[0] = t.uid;
  k[1] = t.tier;
  k[2] = t.spec;
  k[3] = t.linkMask;
  k[4] = t.flatDamage;
  k[5] = t.flatRate;
  k[6] = t.flatRange;
  k[7] = t.pctDamage;
  k[8] = t.pctRate;
  k[9] = t.pctRange;
  k[10] = t.vsStatusMask;
  k[11] = t.vsStatusPct;
  k[12] = sell.value;
  k[13] = sell.full;
  k[14] = t.priority;
  k[15] = t.holdFire;
  k[16] = t.spareRunners;
  k[17] = x;
  k[18] = y;
  // The prices follow Clearance Sale's charges (D077); the bonus lines follow the live tile
  // (a node uncovered under wreckage pays, D082).
  k[19] = sale.discountCharges;
  k[20] = sale.discountPct;
  k[21] = tile;
  // Sundown (T505, T531): the range the dark takes (it eases over 4 s at a wave start) and whether
  // the tower stands in the light while the map is dark.
  k[22] = t.darkRangePct;
  k[23] = dark > 0 && t.lit;
  let same = keyParts.length === k.length;
  for (let i = 0; same && i < k.length; i++) same = keyParts[i] === k[i];
  if (same) return keyText;
  for (let i = 0; i < k.length; i++) keyParts[i] = k[i] ?? null;
  keyParts.length = k.length;
  keyText = k.join('|');
  return keyText;
}

/** The selected tower's screen point and sell value (selectedView's scratch, read every frame). */
const panelPoint = { x: 0, y: 0 };
const panelSell = { value: 0, full: false };

/**
 * The selected tower's panel view, or null if it's gone (T106; T202d): its stats after every
 * bonus (`towerStats` with the tower's bonuses and the run's modifiers), where those bonuses come
 * from, the upgrade's cost after `towerCost` modifiers, the sell value at the run's refund rate,
 * and at tier 3 the tier-4 choice. Reuses `prev` while nothing it shows changed.
 */
export function selectedView(
  sim: Sim<IdSpace>,
  uid: number,
  origin: IsoOrigin,
  prev: SelectedTowerView | null,
  specLock = specLockText(false),
  spareRunnersOpen = false,
): SelectedTowerView | null {
  if (uid === 0) return null;
  const pool = sim.state.towers;
  let t: (typeof pool.items)[number] | null = null;
  for (let i = 0; i < pool.used; i++) {
    const c = pool.items[i]!; // i < used ≤ items.length
    if (c.alive && c.uid === uid) {
      t = c;
      break;
    }
  }
  if (t === null || t.def === null) return null;
  const p = panelPoint;
  gridToScreen(t.x, t.y, origin, p);
  const { state, config, map } = sim;
  const sell = sellValueInto(t, state.tick, state.economy.sellRefundPct, panelSell);
  // The live tile: a cleared wreck reads as what it uncovered (D076, D082).
  const tile = liveTileAt(map, state.wreckage, t.row * map.cols + t.col);
  const key = selectedKey(t, sell, p.x, p.y, state, tile, state.dark);
  if (prev !== null && prev.key === key) return prev;
  const mods = config.modifiers;
  // A specialized tower (tier 4) reads its spec's stats.
  const stats = towerStats(t.def, t.tier, t, mods, t.spec);
  const attack = t.tierDef?.attack ?? null;
  const beam = attack !== null && attack.kind === 'beam' ? attack : null;
  const upgradeDelta = deltaText(
    stats.next,
    beam === null || stats.next === null ? null : beamDpsDelta(stats, stats.next, beam.beamTickSec),
    beam === null ? [] : rampDelta(beam, t.def.tiers[t.tier]?.attack ?? null),
  );
  const statLine = statLineText(stats, t.tierDef);
  const dark = darkTexts(t.darkRangePct, t.lit, state.dark, darkDims(t.tierDef));
  const bonusList = bonusTexts(
    tile,
    t,
    (t.tierDef?.attack ?? null) !== null,
    config.content.links,
    mods,
  );
  const specName = t.spec === null ? null : (t.def.specs?.[t.spec].name ?? null);
  // The next tier's price as the sim will charge it (D077: tune-ups, then Clearance Sale).
  const nextTier = t.def.tiers[t.tier];
  const upgrade =
    stats.next === null || nextTier === undefined
      ? null
      : priceOf(state, mods, t.def.id, nextTier.cost, 'upgrade');
  return {
    uid,
    key,
    label: silkText(t.def.name),
    specName: specName === null ? null : silkText(specName),
    icon: t.def.sprites.icon,
    tier: t.tier,
    maxTier: MAX_TIER_BEFORE_SPEC,
    upgradeCost: upgrade?.cost ?? null,
    upgradePrice: upgrade?.price ?? 'list',
    sellValue: sell.value,
    fullRefund: sell.full,
    refundPct: Math.round(state.economy.sellRefundPct * 100),
    priority: t.priority,
    holdFire: t.holdFire,
    // The filter only changes whom a tower picks, so a tower with no attack doesn't offer it.
    spareRunners: spareRunnersOpen && (t.tierDef?.attack ?? null) !== null ? t.spareRunners : null,
    stats: statLine,
    statsLines: wrapParts(statLine.split(' · '), PANEL_CHARS),
    bonuses: bonusList.flatMap((b) => wrapParts([silkText(b)], PANEL_CHARS)),
    dark: dark.flatMap((d) => wrapParts([d], PANEL_CHARS)),
    darkLit: t.darkRangePct === 0 && dark.length > 0,
    rampCap: beam !== null && beam.rampCap > 1 ? beam.rampCap : null,
    upgradeDelta,
    deltaLines: upgradeDelta === null ? [] : wrapParts(nextParts(upgradeDelta), PANEL_CHARS),
    specs: specChoice(
      t.def,
      t.tier,
      t,
      mods,
      config.specsUnlocked.includes(t.def.id),
      specLock,
      state,
    ),
    x: p.x,
    y: p.y,
  };
}
