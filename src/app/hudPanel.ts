// The tower panel's view model (T225 split from app/hud.ts; T106, T202d): the selected tower's
// stats, bonuses, upgrade, sell value, and tier-4 choice, rebuilt only when what it shows changes.
// Content text goes through `silkText` here, so the components draw it as given (D059).
import type { CompiledTowerDef } from '../content/compiled.ts';
import { MAX_TIER_BEFORE_SPEC } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import { gridToScreen, type IsoOrigin } from '../render/iso.ts';
import type { DeepReadonly } from '../shared/types.ts';
import {
  costFor,
  sellValueInto,
  towerStats,
  type SellValue,
  type Sim,
  type SimConfig,
  type SpecChoice,
  type Tower,
  type TowerBonuses,
} from '../sim/index.ts';
import type { SelectedTowerView, SpecChoiceView, SpecOptionView } from '../ui/state.ts';
import { silkText } from '../ui/silk.ts';
import { CARD_CHARS, PANEL_CHARS, wrapParts } from '../ui/hud/layout.ts';
import {
  bonusTexts,
  deltaText,
  displayName,
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

/** The tier-4 choice for a tier-3 tower whose type has specs (else null). */
export function specChoice(
  def: DeepReadonly<CompiledTowerDef>,
  tier: number,
  bonuses: TowerBonuses,
  modifiers: SimConfig<IdSpace>['modifiers'],
  unlocked: boolean,
  lockText: string,
): SpecChoiceView | null {
  if (def.specs === null || tier !== MAX_TIER_BEFORE_SPEC) return null;
  const option = (choice: SpecChoice): SpecOptionView => {
    const tierDef = def.specs![choice]; // checked above
    const description = specDescription(
      towerStats(def, MAX_TIER_BEFORE_SPEC + 1, bonuses, modifiers, choice),
      tierDef,
    );
    return {
      choice,
      name: silkText(tierDef.name ?? displayName(`${def.id}_${choice}`)),
      cost: costFor(modifiers, def.id, tierDef.cost, true),
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

/** The last selected-panel key's parts and string (selectedKey reuses them while unchanged). */
const keyParts: (number | string | boolean | null)[] = [];
const keyNext: (number | string | boolean | null)[] = [];
let keyText = '';

/**
 * The selected tower's panel inputs, as a key: the view is rebuilt only when it changes. Called
 * every frame, so it allocates nothing while the inputs hold still (D059, C7): the parts go into a
 * scratch array, and the joined string is rebuilt only when one of them changed.
 */
function selectedKey(t: DeepReadonly<Tower>, sell: SellValue, x: number, y: number): string {
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
  const key = selectedKey(t, sell, p.x, p.y);
  if (prev !== null && prev.key === key) return prev;
  const mods = config.modifiers;
  // A specialized tower (tier 4) reads its spec's stats.
  const stats = towerStats(t.def, t.tier, t, mods, t.spec);
  const upgradeDelta = deltaText(stats.next);
  const statLine = statLineText(stats, t.tierDef);
  const tile = map.tiles[t.row * map.cols + t.col];
  const bonusList = bonusTexts(
    tile,
    t,
    (t.tierDef?.attack ?? null) !== null,
    config.content.links,
    mods,
  );
  const specName = t.spec === null ? null : (t.def.specs?.[t.spec].name ?? null);
  return {
    uid,
    key,
    label: silkText(displayName(t.def.id)),
    specName: specName === null ? null : silkText(specName),
    icon: t.def.sprites.icon,
    tier: t.tier,
    maxTier: MAX_TIER_BEFORE_SPEC,
    upgradeCost: stats.next?.cost ?? null,
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
    upgradeDelta,
    deltaLines: upgradeDelta === null ? [] : wrapParts(nextParts(upgradeDelta), PANEL_CHARS),
    specs: specChoice(t.def, t.tier, t, mods, config.specsUnlocked.includes(t.def.id), specLock),
    x: p.x,
    y: p.y,
  };
}
