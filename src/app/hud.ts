// Mirrors a battle into the HUD's signals (ui/state.ts `hud`) after every host frame and on every
// interaction change. Components read `hud` and `speed`, and act through app/commands.ts. Signals
// only notify on a changed value; arrays and view objects are replaced only when their contents
// change, so a steady frame re-renders nothing.
import { CAMPAIGN_PLAN } from '../content/campaign.ts';
import type {
  CompiledAbilityDef,
  CompiledLinkDef,
  CompiledMapDef,
  CompiledTier,
  CompiledTowerDef,
} from '../content/compiled.ts';
import { COUNTER_ANSWERS, MAX_TIER_BEFORE_SPEC, STATUS_BITS } from '../content/rules.ts';
import { answerScope, answersCarried, type ReachedTower } from '../content/counterAnswers.ts';
import { SPRITES } from '../content/sprites/index.ts';
import { SYSTEM_UNLOCKS } from '../meta/index.ts';
import type { IdSpace, MeterLabel, TileChar } from '../content/types.ts';
import { gridToScreen, mapOrigin, type IsoOrigin } from '../render/iso.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { VIEW_H, VIEW_W } from '../render/scale.ts';
import { TICK_HZ } from '../shared/time.ts';
import { assertNever, type DeepReadonly } from '../shared/types.ts';
import {
  abilityStats,
  callWaveBonus,
  costFor,
  isBuildableTile,
  MEDAL_KINDS,
  medalId,
  type MedalKind,
  type MedalStatus,
  sellValue,
  tileAndLinkRules,
  towerStats,
  type SellValue,
  type SpecChoice,
  type Tower,
  type TowerBonuses,
  type RejectReason,
  type TierStatDelta,
  type TowerStatLine,
  type AbilityStats,
  type SchedulePhase,
  type Sim,
  type SimConfig,
} from '../sim/index.ts';
import {
  hud,
  speed,
  type AbilityCooldownView,
  type AbilitySlotView,
  type BriefingLine,
  type BuildSlotView,
  type MedalView,
  type RequiredCounterView,
  type SelectedTowerView,
  type ThreatIntelView,
  type ThreatView,
  type SpecChoiceView,
  type SpecOptionView,
  type WavePreview,
  type WavePreviewGroup,
} from '../ui/state.ts';
import { silkText } from '../ui/silk.ts';
import { CARD_CHARS, PANEL_CHARS, wrapParts } from '../ui/hud/layout.ts';
import type { Host } from './host.ts';
import { activeSave, systemOpen } from './save.ts';

/** Every registered sprite id (the tell glyphs the briefing may show). */
const SPRITE_IDS: ReadonlySet<string> = new Set(SPRITES.map((d) => d.id));

/** How long a notice stays up, in ms of real time. */
export const NOTICE_MS = 1800;
/** How long the "WAVE n" banner shows, in ms of real time (D026). */
export const WAVE_BANNER_MS = 1200;
/** The call-wave button pulses only while more than this many seconds of countdown are left. */
export const CALL_PULSE_MIN_SEC = 5;

const sameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/** A content id as a display name: `dev_` dropped, words capitalized (`rivet` → `Rivet`). */
export function displayName(id: string): string {
  return id
    .replace(/^dev_/, '')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** The meter's HUD label (core-loop §2.9). */
export function meterLabelText(label: MeterLabel | null): string {
  switch (label) {
    case 'evacuated':
      return 'Evacuated';
    case 'sheltered':
      return 'Sheltered';
    case 'voices':
      return 'Voices';
    case null:
    case 'integrity':
      return 'Core';
    default:
      return assertNever(label);
  }
}

/**
 * The wave whose countdown unlocks each tower the map holds back (`towerUnlockWave`, compiled to
 * `unlockTowerClass` events on a wave's countdown).
 */
export function towerUnlockWaves(map: CompiledMapDef<IdSpace>): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const ev of map.events) {
    if (!('wave' in ev.on)) continue;
    for (const a of ev.actions) {
      if ('unlockTowerClass' in a && !Object.hasOwn(out, a.unlockTowerClass)) {
        out[a.unlockTowerClass] = ev.on.wave;
      }
    }
  }
  return out;
}

/**
 * The build slots for a loadout. `unlockWaves`: towerUnlockWaves(map). Costs are what the sim
 * charges: tier 1 after the run's `towerCost` modifiers (`costFor`, D037).
 */
export function buildSlots(
  towers: Readonly<Record<string, CompiledTowerDef>>,
  loadout: readonly string[],
  unlockWaves: Readonly<Record<string, number>> = {},
  modifiers: SimConfig<IdSpace>['modifiers'] = [],
): BuildSlotView[] {
  return loadout.map((id) => {
    const def = towers[id];
    if (def === undefined) throw new RangeError(`hud: loadout tower '${id}' is not in the content`);
    return {
      tower: id,
      label: displayName(id),
      icon: def.sprites.icon,
      cost: costFor(modifiers, id, def.tiers[0].cost),
      unlockWave: Object.hasOwn(unlockWaves, id) ? (unlockWaves[id] ?? null) : null,
    };
  });
}

/** What a locked slot says (D026): "Thumper ships at wave 3", or "Thumper locked" with no wave. */
export function lockedText(slot: BuildSlotView): string {
  return slot.unlockWave === null
    ? `${slot.label} locked`
    : `${slot.label} ships at wave ${slot.unlockWave}`;
}

/** A number for a stat line: whole, or up to two decimals (2, 0.8, 2.5). */
function statNum(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** A tower's stats as the tower panel shows them (sim `towerStats`), e.g. "8 dmg · 2/s · range 3". */
export function statLineText(s: TowerStatLine): string {
  if (s.kind === null) return 'Support';
  const parts = [`${statNum(s.damage)} dmg`, `${statNum(s.ratePerSec)}/s`];
  parts.push(`range ${statNum(s.rangeTiles)}`);
  return parts.join(' · ');
}

/** A signed stat change: "+3", "-0.5". */
function signed(n: number): string {
  return n > 0 ? `+${statNum(n)}` : statNum(n);
}

/** What the next upgrade changes, e.g. "+3 dmg · +0.5 range", or null at the top (or no change). */
export function deltaText(d: TierStatDelta | null): string | null {
  if (d === null) return null;
  const parts: string[] = [];
  if (d.damage !== 0) parts.push(`${signed(d.damage)} dmg`);
  if (d.ratePerSec !== 0) parts.push(`${signed(d.ratePerSec)}/s`);
  if (d.rangeTiles !== 0) parts.push(`${signed(d.rangeTiles)} range`);
  if (d.splashTiles !== 0) parts.push(`${signed(d.splashTiles)} splash`);
  if (d.armorPierce !== 0) parts.push(`${signed(d.armorPierce)} pierce`);
  return parts.length === 0 ? null : parts.join(' · ');
}

/**
 * An ability's one-line description (D026) with its real numbers (`stats`: abilityStats, so Mk II's
 * radius and Rapport's or Coolant's cooldown show), e.g. "200 damage in a 1.5-tile radius after
 * 1 s. Recharges 45 s." or "Slows 3 tiles of path 50% and deals 20 damage/s for 5 s. Recharges
 * 50 s." Without `stats`, the content's own numbers.
 */
export function abilityDescription(def: CompiledAbilityDef, stats?: AbilityStats): string {
  const e = def.effect;
  const cd = statNum((stats?.cooldownTicks ?? def.cooldownTicks) / TICK_HZ);
  if (e.kind === 'segment') {
    const slow = statNum(Math.round(e.slowPct * 100));
    const sec = statNum(e.durationTicks / TICK_HZ);
    const len = 2 * e.reachTiles + 1;
    return `Slows ${len} tiles of path ${slow}% and deals ${statNum(e.damagePerSec)} damage/s for ${sec} s. Recharges ${cd} s.`;
  }
  const delay = statNum(e.delayTicks / TICK_HZ);
  const radius = statNum(stats?.radiusTiles ?? e.radiusTiles);
  return `${statNum(e.damage)} damage in a ${radius}-tile radius after ${delay} s. Recharges ${cd} s.`;
}

/**
 * The preview of the wave after `wave` (the last wave started), or null if none is left. Groups
 * of the same enemy on the same layer merge, in first-appearance order (core-loop §2.2).
 */
export function wavePreview(map: CompiledMapDef<IdSpace>, wave: number): WavePreview | null {
  const next = map.waves[wave];
  if (next === undefined) return null;
  const groups: WavePreviewGroup[] = [];
  for (const g of next.groups) {
    const air = g.enemy.layer === 'air';
    const i = groups.findIndex((x) => x.enemy === g.enemy.id && x.air === air);
    const prev = groups[i];
    if (prev === undefined) {
      groups.push({
        enemy: g.enemy.id,
        label: displayName(g.enemy.id),
        icon: g.enemy.sprites.icon,
        count: g.count,
        air,
        fast: g.enemy.tells.includes('fast'),
      });
    } else {
      groups[i] = { ...prev, count: prev.count + g.count };
    }
  }
  return { number: next.number, groups };
}

/**
 * A map's static briefing (M1: map data `briefing`, one line per `\n`) as lines with their
 * speakers: "QUILL: Hello!" is spoken by QUILL. A line with no short speaker prefix has none.
 */
export function briefingLines(briefing: string | null): BriefingLine[] {
  if (briefing === null) return [];
  return briefing
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')
    .map((line) => {
      const m = /^([^:\s][^:]{0,15}): (.+)$/.exec(line);
      return m === null
        ? { speaker: null, text: silkText(line) }
        : { speaker: m[1]!, text: silkText(m[2]!) };
    });
}

/** Whole seconds left in the countdown to the next wave (rounded up), or null when none runs. */
export function countdownSeconds(phase: SchedulePhase, ticksLeft: number): number | null {
  return phase === 'countdown' && ticksLeft > 0 ? Math.ceil(ticksLeft / TICK_HZ) : null;
}

/** "+10%" from a fraction (0.1), or "+0.3" for a flat amount. */
function pctText(frac: number): string {
  return `+${statNum(Math.round(frac * 1000) / 10)}%`;
}

/** A status mask's names for a conditional bonus, e.g. "Chilled". */
function statusNames(mask: number): string {
  return STATUS_BITS.filter((_, i) => (mask & (1 << i)) !== 0)
    .map((st) => displayName(st))
    .join('/');
}

/**
 * Where a tower's bonuses come from, one entry per source (the panel's lines; D037's stacking):
 * its tile ("+25% range (high ground)", "+20% rate (power node)") and each active link
 * ("+10% rate (Crossfire)", "+20% dmg vs Chilled (Sitting Ducks)"), after the run's `tileBonus`
 * and `linkBonus` modifiers. Static `towerStat` modifiers show only in the stat line.
 */
export function bonusTexts(
  tile: TileChar | undefined,
  tower: Pick<Tower, 'linkMask'> & { readonly def: { readonly id: string } | null },
  hasAttack: boolean,
  links: readonly CompiledLinkDef<IdSpace>[],
  modifiers: SimConfig<IdSpace>['modifiers'],
): string[] {
  const rules = tileAndLinkRules(modifiers);
  const out: string[] = [];
  if (tile === '^') out.push(`${pctText(rules.highGroundRangePct)} range (high ground)`);
  else if (tile === '+') {
    out.push(
      hasAttack
        ? `${pctText(rules.powerNodeRatePct)} rate (power node)`
        : `${pctText(rules.powerNodeAuraPct)} aura (power node)`,
    );
  }
  if (tower.def === null || tower.linkMask === 0) return out;
  for (const link of links) {
    if ((tower.linkMask & link.bit) === 0) continue;
    const p = link.partners[0].tower === tower.def.id ? link.partners[0] : link.partners[1];
    const k = rules.linkMult;
    const parts: string[] = [];
    if (p.pctDamage !== 0) parts.push(`${pctText(p.pctDamage * k)} dmg`);
    if (p.vsStatusMask !== 0) {
      parts.push(`${pctText(p.vsStatusPct * k)} dmg vs ${statusNames(p.vsStatusMask)}`);
    }
    if (p.pctRate !== 0) parts.push(`${pctText(p.pctRate * k)} rate`);
    if (p.pctRange !== 0) parts.push(`${pctText(p.pctRange * k)} range`);
    if (p.flatDamage !== 0) parts.push(`${signed(p.flatDamage * k)} dmg`);
    if (p.flatRate !== 0) parts.push(`${signed(p.flatRate * k)}/s`);
    if (p.flatRange !== 0) parts.push(`${signed(p.flatRange * k)} range`);
    for (const part of parts) out.push(`${part} (${link.name})`);
  }
  return out;
}

/**
 * A spec's short description from its stats (what changes from tier 3, and what's special about
 * it), e.g. "9 dmg · 7.5/s · 1 s spin-up" or "120 dmg · 0.5/s · range 6 · ignores armor".
 */
export function specDescription(
  t3: TowerStatLine,
  spec: TowerStatLine,
  tier: DeepReadonly<CompiledTier>,
): string {
  const parts: string[] = [];
  if (spec.damage !== t3.damage) parts.push(`${statNum(spec.damage)} dmg`);
  if (spec.ratePerSec !== t3.ratePerSec) parts.push(`${statNum(spec.ratePerSec)}/s`);
  if (spec.rangeTiles !== t3.rangeTiles) parts.push(`range ${statNum(spec.rangeTiles)}`);
  if (spec.splashTiles !== t3.splashTiles) parts.push(`splash ${statNum(spec.splashTiles)}`);
  const a = tier.attack;
  if (a !== null) {
    if (a.kind === 'lobbed' && a.bomblets !== null) parts.push(`+${a.bomblets.count} bomblets`);
    if (a.ignoresArmor) parts.push('ignores armor');
    if (a.spinUpTicks > 0) parts.push(`${statNum(a.spinUpTicks / TICK_HZ)} s spin-up`);
  }
  for (const e of tier.effects) {
    if (e.status === 'corroded') parts.push(`${e.stacks} Corroded`);
  }
  return parts.join(' · ');
}

/**
 * What a locked tier-4 choice says (T202d): the Engineering pane opens after Shift n
 * (`SYSTEM_UNLOCKS`), or, once it's open, that the pair is bought there.
 */
export function specLockText(engineeringOpen: boolean): string {
  if (engineeringOpen) return 'Unlock in Engineering';
  const n = CAMPAIGN_PLAN.findIndex((m) => m.id === SYSTEM_UNLOCKS.engineering) + 1;
  return `Engineering unlocks after Shift ${n}`;
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
  const t3 = towerStats(def, MAX_TIER_BEFORE_SPEC, bonuses, modifiers);
  const option = (choice: SpecChoice): SpecOptionView => {
    const tierDef = def.specs![choice]; // checked above
    const description = specDescription(
      t3,
      towerStats(def, MAX_TIER_BEFORE_SPEC + 1, bonuses, modifiers, choice),
      tierDef,
    );
    return {
      choice,
      name: tierDef.name ?? displayName(`${def.id}_${choice}`),
      cost: costFor(modifiers, def.id, tierDef.cost, true),
      description,
      descLines: wrapParts(description.split(' · '), CARD_CHARS),
    };
  };
  return {
    locked: !unlocked,
    lockLines: unlocked ? [] : wrapParts([lockText], PANEL_CHARS),
    options: [option('a'), option('b')],
  };
}

/** "Next: +0.5/s · +3 pierce" as wrappable parts, the label on the first. */
function nextParts(delta: string): string[] {
  const parts = delta.split(' · ');
  parts[0] = `Next: ${parts[0] ?? ''}`;
  return parts;
}

/** What the battle knows about the save in play, for the tower panel and the briefing. */
export interface HudSaveInfo {
  /** Engineering (tier-4 unlocks) is open for this save (the lock note's wording). */
  readonly engineeringOpen: boolean;
  /** Medal ids already on file for this map. */
  readonly heldMedals: readonly string[];
  /** Towers the player owns (the required counters' answers); the loadout without a save. */
  readonly ownedTowers: readonly string[];
  /** Towers whose specs are unlocked (the answers that need a spec). */
  readonly specsUnlocked: readonly string[];
  /** The spare-runners controls show (`meta/progress.ts`: after A1M5, or `devUnlocks`). */
  readonly spareRunnersOpen: boolean;
}

/** The selected tower's panel inputs, as a key: the view is rebuilt only when it changes. */
function selectedKey(t: DeepReadonly<Tower>, sell: SellValue, x: number, y: number): string {
  // Credits stay out: the component reads them itself (an unaffordable button dims).
  return [
    t.uid,
    t.tier,
    t.spec,
    t.linkMask,
    t.flatDamage,
    t.flatRate,
    t.flatRange,
    t.pctDamage,
    t.pctRate,
    t.pctRange,
    t.vsStatusMask,
    t.vsStatusPct,
    sell.value,
    sell.full,
    t.priority,
    t.holdFire,
    t.spareRunners,
    x,
    y,
  ].join('|');
}

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
  const p = { x: 0, y: 0 };
  gridToScreen(t.x, t.y, origin, p);
  const { state, config, map } = sim;
  const sell = sellValue(t, state.tick, state.economy.sellRefundPct);
  const key = selectedKey(t, sell, p.x, p.y);
  if (prev !== null && prev.key === key) return prev;
  const mods = config.modifiers;
  // A specialized tower (tier 4) reads its spec's stats.
  const stats = towerStats(t.def, t.tier, t, mods, t.spec);
  const upgradeDelta = deltaText(stats.next);
  const statLine = statLineText(stats);
  const tile = map.tiles[t.row * map.cols + t.col];
  const bonusList = bonusTexts(
    tile,
    t,
    (t.tierDef?.attack ?? null) !== null,
    config.content.links,
    mods,
  );
  return {
    uid,
    key,
    label: displayName(t.def.id),
    specName: t.spec === null ? null : (t.def.specs?.[t.spec].name ?? null),
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
    bonuses: bonusList.flatMap((b) => wrapParts([b], PANEL_CHARS)),
    upgradeDelta,
    deltaLines: upgradeDelta === null ? [] : wrapParts(nextParts(upgradeDelta), PANEL_CHARS),
    specs: specChoice(t.def, t.tier, t, mods, config.specsUnlocked.includes(t.def.id), specLock),
    x: p.x,
    y: p.y,
  };
}

/** The two fixed medals' one-liners for the briefing and the tracker (progression.md § 3). */
const MEDAL_TEXT = {
  victory: { name: 'Victory', description: 'Win the shift.' },
  perfectCore: { name: 'Perfect Core', description: 'Win with no leaks.' },
} as const;

/**
 * The map's medals in display order (Victory, Perfect Core, the Challenge if any) with this run's
 * standing and whether the save already holds each (`held`: medal ids on file for the map).
 */
export function medalViews(
  map: Pick<CompiledMapDef<IdSpace>, 'medals'>,
  status: Readonly<Record<MedalKind, MedalStatus>>,
  held: readonly string[],
): MedalView[] {
  const out: MedalView[] = [];
  for (const kind of MEDAL_KINDS) {
    const id = medalId(map, kind);
    if (id === null) continue;
    const text =
      kind === 'challenge'
        ? {
            name: map.medals?.challenge.name ?? '',
            description: map.medals?.challenge.description ?? '',
          }
        : MEDAL_TEXT[kind];
    out.push({ kind, id, ...text, held: held.includes(id), status: status[kind] });
  }
  return out;
}

/** "rivet T3" (a counter-answer label) → "Rivet T3"; "thumper [Bunker Buster]" → "Thumper [Bunker Buster]". */
function answerLabel(label: string): string {
  const [tower = '', ...rest] = label.split(' ');
  return [displayName(tower), ...rest].join(' ');
}

/**
 * The briefing's threat intel (campaign.md § 4.8; T202d): each `threatIntel` trait with its tell
 * glyph if one is drawn, then any other tell of the map's enemies that has a glyph (the Hauler's
 * `carrier`); and each required counter with the owned towers that answer it, by the counter
 * model (content/counterAnswers.ts: the highest in-map tier, and a spec only when its pair is
 * unlocked).
 */
export function threatIntel(
  map: Pick<CompiledMapDef<IdSpace>, 'act' | 'threatIntel' | 'requiredCounters' | 'waves'>,
  owned: readonly string[],
  specsUnlocked: readonly string[],
): ThreatIntelView {
  const enemies = new Map<
    string,
    CompiledMapDef<IdSpace>['waves'][number]['groups'][number]['enemy']
  >();
  for (const w of map.waves) for (const g of w.groups) enemies.set(g.enemy.id, g.enemy);
  const threats: ThreatView[] = map.threatIntel.map((trait) => ({
    id: trait,
    label: displayName(trait),
    glyph: tellGlyph([trait]),
  }));
  const seen = new Set<string>(map.threatIntel);
  for (const e of enemies.values()) {
    for (const tell of e.tells) {
      const glyph = tellGlyph([tell]);
      if (seen.has(tell) || glyph === null) continue;
      seen.add(tell);
      threats.push({ id: tell, label: displayName(tell), glyph });
    }
  }
  const required: RequiredCounterView[] = map.requiredCounters.map((counter) => {
    const scope = answerScope(counter, map.act, enemies.values());
    const answers: string[] = [];
    for (const tower of owned) {
      const reached: ReachedTower[] = [{ tower, tier: MAX_TIER_BEFORE_SPEC, spec: null }];
      if (specsUnlocked.includes(tower)) {
        reached.push({ tower, tier: MAX_TIER_BEFORE_SPEC + 1, spec: 'a' });
        reached.push({ tower, tier: MAX_TIER_BEFORE_SPEC + 1, spec: 'b' });
      }
      const labels = answersCarried(COUNTER_ANSWERS[counter], scope, reached, []);
      // A tower that answers at an in-map tier needn't list its spec too.
      const plain = labels.filter((l) => !l.includes('['));
      for (const l of plain.length > 0 ? plain : labels) answers.push(answerLabel(l));
    }
    return { counter, label: displayName(counter), answers };
  });
  return { threats, required };
}

/** The tell glyph sprite for a trait or tell id, if one is drawn (`icon.tell.<id>`). */
function tellGlyph(ids: readonly string[]): string | null {
  for (const id of ids) {
    const glyph = `icon.tell.${id}`;
    if (SPRITE_IDS.has(glyph)) return glyph;
  }
  return null;
}

/** The save in play as the HUD reads it (app/save.ts); a `?map=` battle has none. */
export function hudSaveInfo(mapId: string, loadout: readonly string[]): HudSaveInfo {
  const save = activeSave();
  if (save === null) {
    return {
      engineeringOpen: false,
      heldMedals: [],
      ownedTowers: loadout,
      specsUnlocked: [],
      spareRunnersOpen: false,
    };
  }
  const maps: Readonly<Record<string, { readonly medals: readonly string[] } | undefined>> =
    save.campaign.maps;
  return {
    engineeringOpen: systemOpen('engineering'),
    heldMedals: Object.hasOwn(maps, mapId) ? (maps[mapId]?.medals ?? []) : [],
    ownedTowers: save.unlocks.towers.filter((t) => !save.unlocks.revokedTowers.includes(t)),
    specsUnlocked: save.unlocks.specs,
    spareRunnersOpen: systemOpen('spareRunners'),
  };
}

/** What each tile type is called in the cursor's announcement. */
const TILE_NAMES: Readonly<Record<TileChar, string>> = {
  '#': 'Path',
  o: 'Pad',
  '^': 'High ground',
  '+': 'Power node',
  x: 'Wreckage',
  '.': 'Ground',
  S: 'Spawn',
  C: 'Core',
};

/**
 * What the keyboard tile cursor on tile `index` announces (T126; the HUD's aria-live region):
 * the tile (columns and rows counted from 1), what stands on it, and what Enter does there.
 * `aimingLabel` is the aimed ability's name, or null. Null while the cursor is hidden.
 */
export function cursorText(
  sim: Sim<IdSpace>,
  index: number,
  armed: string | null,
  aimingLabel: string | null,
): string | null {
  const map = sim.map;
  const tile = map.tiles[index];
  if (index < 0 || tile === undefined) return null;
  const col = index % map.cols;
  const where = `column ${col + 1}, row ${(index - col) / map.cols + 1}`;
  const slot = sim.state.towerAtTile[index] ?? -1;
  const tower = slot < 0 ? null : (sim.state.towers.items[slot] ?? null);
  const what =
    tower !== null && tower.alive && tower.def !== null
      ? `${displayName(tower.def.id)} tier ${tower.tier}, ${where}`
      : `${TILE_NAMES[tile]}, ${where}${isBuildableTile(tile) ? ', empty' : ''}`;
  if (aimingLabel !== null) return `${what}. Enter fires ${aimingLabel} here.`;
  if (tower !== null && tower.alive) return `${what}. Enter selects it.`;
  if (armed !== null && isBuildableTile(tile))
    return `${what}. Enter builds ${displayName(armed)}.`;
  return `${what}.`;
}

/** How many standing towers are holding fire (the HUD's Hold fire button counts them). */
export function holdingCount(pool: Sim<IdSpace>['state']['towers']): number {
  let n = 0;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (t.alive && t.holdFire) n++;
  }
  return n;
}

/** Every standing tower's tile center in game pixels (for the tower panel's placement). */
export function towerPoints(sim: Sim<IdSpace>, origin: IsoOrigin): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const pool = sim.state.towers;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (!t.alive) continue;
    const p = { x: 0, y: 0 };
    gridToScreen(t.x, t.y, origin, p);
    out.push(p);
  }
  return out;
}

/**
 * The armed-slot rule after a build (T106): the slot stays armed while another of the same tower
 * is affordable, so the player can place several in a row; otherwise it disarms.
 */
export function staysArmed(armed: string | null, built: string, credits: number, cost: number) {
  return armed === built && credits >= cost;
}

/**
 * Whether the call-wave button pulses (D026): during a countdown with nothing alive and more than
 * CALL_PULSE_MIN_SEC left (calling now pays), or in the setup once a tower stands.
 */
export function callPulses(
  wave: number,
  countdown: number | null,
  enemiesAlive: number,
  built: boolean,
): boolean {
  if (wave === 0) return built;
  return countdown !== null && countdown > CALL_PULSE_MIN_SEC && enemiesAlive === 0;
}

/** The first wave whose countdown starts the upgrade teach (D028: W2's build phase). */
export const UPGRADE_TEACH_WAVE = 2;

/**
 * Whether the upgrade teach shows (D028): it has started (W2's countdown came) and no tower has
 * been upgraded yet, while a tower stands and the map is still being played.
 */
export function upgradeHintShows(
  started: boolean,
  upgraded: boolean,
  towersLive: number,
  playing: boolean,
): boolean {
  return started && !upgraded && towersLive > 0 && playing;
}

/** Notice text for a rejected command, or null for rejections the player needn't hear about. */
export function rejectText(reason: RejectReason): string | null {
  switch (reason) {
    case 'cantAfford':
      return 'Not enough credits';
    case 'towerLocked':
      return 'Tower locked';
    case 'maxTier':
      return 'Max tier';
    case 'tileOccupied':
    case 'notBuildable':
    case 'invalidTile':
      return "Can't build there";
    case 'noTargeting':
      return 'No targeting on this tower';
    case 'notImplemented':
      return 'Not online yet';
    case 'specLocked':
      return 'Specialization locked';
    case 'noSpecs':
      return 'No specializations';
    case 'needsTier3':
      return 'Needs tier 3';
    case 'alreadySpecialized':
      return 'Already specialized';
    case 'waveInProgress':
      return 'Wave in progress';
    case 'noWavesLeft':
      return 'No waves left';
    case 'noAbility':
      return 'No ability equipped';
    case 'abilityOnCooldown':
      return 'Uplink recharging';
    case 'invalidTarget':
      return "Can't target there";
    case 'mapEnded':
    case 'notInLoadout':
    case 'noSuchTower':
      return null;
    default:
      return assertNever(reason);
  }
}

/** The battle config fields the ability slots read. */
type AbilityConfig = Pick<SimConfig<IdSpace>, 'content' | 'abilities' | 'modifiers'>;

/** The hotkey of each ability slot (core-loop §4). */
const ABILITY_KEYS = { 1: 'Q', 2: 'E' } as const;

/**
 * The commander ability slots a config equips (core-loop §3.1), in slot order: slot 1 (the
 * Technician's, on Q) when it holds an ability, and slot 2 (the companion's, on E) when the map
 * has a companion (`absent`: shown dark). Descriptions carry the modified numbers.
 */
export function abilitySlots(cfg: AbilityConfig): AbilitySlotView[] {
  const out: AbilitySlotView[] = [];
  const { slot1, slot2, slot2State } = cfg.abilities;
  const view = (slot: 1 | 2, id: string, absent: boolean): AbilitySlotView => {
    const def = Object.hasOwn(cfg.content.abilities, id) ? cfg.content.abilities[id] : undefined;
    if (def === undefined) throw new RangeError(`hud: ability '${id}' is not in the content`);
    return {
      slot,
      ability: def.id,
      label: def.name,
      icon: def.sprites.icon,
      key: ABILITY_KEYS[slot],
      description: abilityDescription(def, abilityStats(def, cfg.modifiers)),
      aim: def.effect.kind === 'segment' ? 'path' : 'area',
      absent,
    };
  };
  if (slot1 !== null) out.push(view(1, slot1, false));
  if (slot2 !== null && slot2State !== 'none') out.push(view(2, slot2, slot2State === 'absent'));
  return out;
}

/** The cooldown each ability slot starts when cast (`abilityStats`), by slot (0 when empty). */
export function abilityCooldownTotals(cfg: AbilityConfig): [number, number] {
  const total = (id: string | null): number => {
    const def = id === null ? undefined : cfg.content.abilities[id];
    return def === undefined ? 0 : abilityStats(def, cfg.modifiers).cooldownTicks;
  };
  return [total(cfg.abilities.slot1), total(cfg.abilities.slot2)];
}

/** Steps in the cooldown wipe (one per game pixel of the 16 px icon). */
export const COOLDOWN_STEPS = 16;
const READY: AbilityCooldownView = Object.freeze({ secondsLeft: 0, remaining: 0 });

/**
 * An ability's cooldown as the HUD shows it: whole seconds left (rounded up) and the share still
 * to recharge in 1/16 steps (the icon's wipe). Reuses `prev` when neither changed, so the slot
 * re-renders about once a second, not every tick.
 */
export function cooldownView(
  ticksLeft: number,
  totalTicks: number,
  prev: AbilityCooldownView | null,
): AbilityCooldownView {
  if (ticksLeft <= 0 || totalTicks <= 0)
    return prev !== null && prev.secondsLeft === 0 ? prev : READY;
  const secondsLeft = Math.ceil(ticksLeft / TICK_HZ);
  const remaining =
    Math.ceil(Math.min(1, ticksLeft / totalTicks) * COOLDOWN_STEPS) / COOLDOWN_STEPS;
  if (prev !== null && prev.secondsLeft === secondsLeft && prev.remaining === remaining)
    return prev;
  return { secondsLeft, remaining };
}

let noticeId = 0;
let noticeTimer: ReturnType<typeof setTimeout> | null = null;

/** Shows a short HUD notice, replacing any current one. */
export function showNotice(text: string): void {
  hud.notice.value = { id: ++noticeId, text: silkText(text) };
  if (noticeTimer !== null) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    noticeTimer = null;
    hud.notice.value = null;
  }, NOTICE_MS);
}

export interface HudOptions {
  /** Open the map's static briefing (if it has one) over the battle until it's dismissed. */
  readonly briefing: boolean;
  /** The save in play as the HUD reads it; default: app/save.ts's (`hudSaveInfo`). */
  readonly save?: HudSaveInfo;
}

/** Wires the HUD signals to a battle. Returns the unwiring (which also resets them). */
export function bindHud(
  host: Host<IdSpace>,
  interaction: BattleInteraction,
  opts: HudOptions = { briefing: false },
): () => void {
  const { sim } = host;
  const towers = sim.config.content.towers;
  const origin = mapOrigin(sim.map.cols, sim.map.rows, VIEW_W, VIEW_H);
  hud.mapId.value = sim.map.id;
  hud.act.value = String(sim.map.act);
  hud.waveCount.value = sim.map.waves.length;
  hud.meterLabel.value = meterLabelText(sim.map.meterLabel);
  hud.loadout.value = [...sim.config.loadout];
  hud.slots.value = buildSlots(
    towers,
    sim.config.loadout,
    towerUnlockWaves(sim.map),
    sim.config.modifiers,
  );
  const abilityViews = abilitySlots(sim.config);
  const cooldownTotals = abilityCooldownTotals(sim.config);
  hud.abilities.value = abilityViews;
  hud.notice.value = null;
  const lines = opts.briefing ? briefingLines(sim.map.briefing) : [];
  hud.briefing.value = lines.length === 0 ? null : lines;
  const saveInfo = opts.save ?? hudSaveInfo(sim.map.id, sim.config.loadout);
  const specLock = specLockText(saveInfo.engineeringOpen);
  hud.intel.value = threatIntel(sim.map, saveInfo.ownedTowers, saveInfo.specsUnlocked);
  hud.medals.value = medalViews(sim.map, sim.state.medals, saveInfo.heldMedals);
  let medalState = { ...sim.state.medals };
  hud.spareRunnersOpen.value = saveInfo.spareRunnersOpen;
  hud.leak.value = null;
  hud.waveBanner.value = null;
  hud.built.value = false;
  hud.callPulse.value = false;
  hud.upgradeHint.value = false;
  let teachStarted = false;
  let upgraded = false;
  let previewFor = -1;
  let leakId = 0;
  let bannerId = 0;
  let bannerTimer: ReturnType<typeof setTimeout> | null = null;
  const sync = (): void => {
    const s = sim.state;
    hud.credits.value = s.credits;
    hud.integrity.value = s.integrity;
    hud.wave.value = s.wave;
    hud.outcome.value = s.outcome;
    if (!sameList(hud.lockedTowers.value, s.lockedTowers)) {
      hud.lockedTowers.value = [...s.lockedTowers];
    }
    if (previewFor !== s.wave) {
      previewFor = s.wave;
      hud.nextWave.value = wavePreview(sim.map, s.wave);
    }
    hud.countdown.value = countdownSeconds(s.schedule.phase, s.schedule.countdownTicks);
    hud.callBonus.value = callWaveBonus(s, sim.map);
    hud.callPulse.value =
      s.outcome === 'playing' &&
      callPulses(s.wave, hud.countdown.value, s.enemies.live, hud.built.value);
    hud.selected.value = selectedView(
      sim,
      interaction.selectedTower,
      origin,
      hud.selected.value,
      specLock,
      saveInfo.spareRunnersOpen,
    );
    const m = s.medals;
    if (
      m.victory !== medalState.victory ||
      m.perfectCore !== medalState.perfectCore ||
      m.challenge !== medalState.challenge
    ) {
      medalState = { ...m };
      hud.medals.value = medalViews(sim.map, m, saveInfo.heldMedals);
    }
    hud.upgradeHint.value = upgradeHintShows(
      teachStarted,
      upgraded,
      s.towers.live,
      s.outcome === 'playing',
    );
    syncCooldowns();
    hud.holdFireAll.value = s.holdFireAll;
    hud.spareRunnersAll.value = s.spareRunnersAll;
    hud.holdingCount.value = holdingCount(s.towers);
    speed.value = host.speed;
  };
  const syncCooldowns = (): void => {
    const prev = hud.abilityCooldowns.value;
    let next: AbilityCooldownView[] | null = null;
    for (let i = 0; i < abilityViews.length; i++) {
      const v = abilityViews[i]!; // i < length
      const left = sim.state.abilityCooldownTicks[v.slot - 1] ?? 0;
      const cd = cooldownView(left, cooldownTotals[v.slot - 1] ?? 0, prev[i] ?? null);
      if (cd !== prev[i]) next ??= [...prev];
      if (next !== null) next[i] = cd;
    }
    if (next !== null) hud.abilityCooldowns.value = next;
  };
  const syncCursor = (): void => {
    const aiming = interaction.aiming;
    const label = aiming === null ? null : (abilityViews[aiming - 1]?.label ?? 'the ability');
    hud.cursor.value = cursorText(sim, interaction.cursor, interaction.armed, label);
  };
  const syncTowers = (): void => {
    hud.towerPoints.value = towerPoints(sim, origin);
    syncCursor();
  };
  const syncInteraction = (): void => {
    hud.selectedTower.value = interaction.selectedTower;
    hud.armedTower.value = interaction.armed;
    hud.aimingAbility.value = interaction.aiming;
    hud.cursorShown.value = interaction.cursor >= 0;
    hud.selected.value = selectedView(
      sim,
      interaction.selectedTower,
      origin,
      hud.selected.value,
      specLock,
      saveInfo.spareRunnersOpen,
    );
    syncCursor();
  };
  sync();
  syncInteraction();
  syncTowers();
  const offs = [
    host.onAfterFrame(sync),
    interaction.subscribe(syncInteraction),
    // A path ability aimed off the path (render/input/apply.ts): "Can't target there".
    interaction.onRefusal((r) => showNotice(rejectText(r) ?? '')),
    host.bus.on('TowerBuilt', (e) => {
      hud.built.value = true;
      syncTowers();
      const def = towers[e.tower];
      const cost =
        def === undefined ? Infinity : costFor(sim.config.modifiers, e.tower, def.tiers[0].cost);
      if (!staysArmed(interaction.armed, e.tower, sim.state.credits, cost)) {
        if (interaction.armed === e.tower) interaction.arm(null);
      }
    }),
    host.bus.on('EnemyLeaked', (e) => {
      if (e.leak > 0) hud.leak.value = { id: ++leakId, amount: e.leak };
    }),
    host.bus.on('WaveStarted', (e) => {
      hud.waveBanner.value = { id: ++bannerId, wave: e.wave };
      if (bannerTimer !== null) clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => {
        bannerTimer = null;
        hud.waveBanner.value = null;
      }, WAVE_BANNER_MS);
    }),
    host.bus.on('CountdownStarted', (e) => {
      hud.countdownCue.value++;
      if (e.wave >= UPGRADE_TEACH_WAVE) teachStarted = true;
    }),
    host.bus.on('TowerUpgraded', () => {
      upgraded = true;
      syncCursor();
    }),
    host.bus.on('TowerSold', syncTowers),
    host.bus.on('TowerSpecialized', syncCursor),
    host.bus.on('CommandRejected', (e) => {
      const text = rejectText(e.reason);
      if (text !== null) showNotice(text);
    }),
  ];
  return () => {
    for (const off of offs) off();
    if (bannerTimer !== null) clearTimeout(bannerTimer);
    hud.mapId.value = null;
    hud.leak.value = null;
    hud.waveBanner.value = null;
    hud.callPulse.value = false;
    hud.upgradeHint.value = false;
    hud.selectedTower.value = 0;
    hud.selected.value = null;
    hud.towerPoints.value = [];
    hud.cursor.value = null;
    hud.armedTower.value = null;
    hud.aimingAbility.value = null;
    hud.abilities.value = [];
    hud.abilityCooldowns.value = [];
    hud.nextWave.value = null;
    hud.notice.value = null;
    hud.briefing.value = null;
    hud.intel.value = null;
    hud.medals.value = [];
    hud.cursorShown.value = false;
    hud.countdown.value = null;
    hud.callBonus.value = 0;
    hud.holdFireAll.value = false;
    hud.holdingCount.value = 0;
    hud.spareRunnersAll.value = false;
    hud.spareRunnersOpen.value = false;
  };
}
