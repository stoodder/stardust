// The HUD's other view models (T225 split from app/hud.ts): build slots, the wave preview, the
// briefing's lines, medals, threat intel, the towers on the field (hold-fire count, panel points),
// and the ability slots and their cooldowns. Content text goes through `silkText` here, so the
// components draw it as given (D059).
import type {
  CompiledAbilityEffect,
  CompiledMapDef,
  CompiledTowerDef,
} from '../content/compiled.ts';
import { COUNTER_ANSWERS, MAX_TIER_BEFORE_SPEC, THREAT_INTEL_TELL } from '../content/rules.ts';
import { answerScope, answersCarried, type ReachedTower } from '../content/counterAnswers.ts';
import { SPEAKERS } from '../content/dialogue/speakers.ts';
import { SPRITES } from '../content/sprites/index.ts';
import type { IdSpace } from '../content/types.ts';
import { gridToScreen, type IsoOrigin } from '../render/iso.ts';
import { TICK_HZ } from '../shared/time.ts';
import { assertNever } from '../shared/types.ts';
import {
  abilityStats,
  costFor,
  MEDAL_KINDS,
  medalId,
  purchasePriceInto,
  type MedalKind,
  type MedalStatus,
  type PurchaseKind,
  type PurchasePrice,
  type PurchaseState,
  type SchedulePhase,
  type Sim,
  type SimConfig,
} from '../sim/index.ts';
import type {
  AbilityCooldownView,
  AbilitySlotView,
  BuildSlotView,
  CompanionView,
  MedalView,
  ObjectiveStatusView,
  ObjectiveView,
  PriceTag,
  RequiredCounterView,
  SaleView,
  ThreatIntelView,
  ThreatView,
  WavePreview,
  WavePreviewGroup,
} from '../ui/state.ts';
import { silkText } from '../ui/silk.ts';
import { abilityDescription, answerLabel, displayName, threatLabel } from './hudText.ts';

/** Every registered sprite id (the tell glyphs the briefing may show). */
const SPRITE_IDS: ReadonlySet<string> = new Set(SPRITES.map((d) => d.id));

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
 * A purchase state with nothing in play: a tower already built (so Rapid Deploy's free first
 * build doesn't apply) and no sale. Prices read against it are list prices (tune-ups only), what
 * the loadout screen shows before a battle.
 */
export const LIST_PRICE_STATE: PurchaseState = Object.freeze({
  stats: Object.freeze({ towersBuilt: 1 }),
  discountCharges: 0,
  discountPct: 0,
});

/** Scratch for `priceOf` (one price at a time, never kept). */
const quote: PurchasePrice = { cost: 0, discounted: false };

/**
 * What a purchase costs right now and how that came about (D077: `purchasePriceInto`, the price
 * the sim charges): tune-ups, then Rapid Deploy's free first build, then Clearance Sale.
 */
export function priceOf(
  state: PurchaseState,
  modifiers: SimConfig<IdSpace>['modifiers'],
  tower: string,
  base: number,
  kind: PurchaseKind,
): { readonly cost: number; readonly price: PriceTag } {
  const p = purchasePriceInto(state, modifiers, tower, base, kind, quote);
  const listed = p.cost === costFor(modifiers, tower, base, kind === 'spec');
  const price: PriceTag = p.discounted ? 'sale' : p.cost === 0 && !listed ? 'free' : 'list';
  return { cost: p.cost, price };
}

/**
 * What changes a build slot's price mid-battle (`purchasePriceInto`'s state inputs), as a key:
 * the HUD rebuilds the slots only when it changes.
 */
export function priceKey(state: PurchaseState): number {
  // A number, not a string: the HUD reads it every frame (C6), so it allocates nothing. The sale's
  // percent in tenths of a percent (0–1000) and the first-build flag pack under the charges.
  const pct = Math.round(state.discountPct * 1000);
  return (state.discountCharges * 1001 + pct) * 2 + (state.stats.towersBuilt === 0 ? 1 : 0);
}

/** Clearance Sale while it has charges (the tag over the build slots), else null. */
export function saleView(state: PurchaseState, prev: SaleView | null): SaleView | null {
  if (state.discountCharges <= 0 || state.discountPct <= 0) return null;
  const pct = Math.round(state.discountPct * 100);
  if (prev !== null && prev.charges === state.discountCharges && prev.pct === pct) return prev;
  return { charges: state.discountCharges, pct };
}

/** The sale tag's words (core-loop §3.2): "SALE -40% x3". ASCII: Silkscreen has no − or ×. */
export function saleText(sale: SaleView): string {
  return `Sale -${sale.pct}% x${sale.charges}`;
}

/**
 * The build slots for a loadout. `unlockWaves`: towerUnlockWaves(map). Costs are what the sim
 * charges for a build now (`purchasePriceInto` on `state`, D077): tier 1 after the run's
 * `towerCost` modifiers, then Rapid Deploy's free first build, then Clearance Sale; without a
 * state, the list price. `newTowers`: the loadout's newly issued towers (meta/hints.ts), whose
 * slots wear a NEW pip.
 */
export function buildSlots(
  towers: Readonly<Record<string, CompiledTowerDef>>,
  loadout: readonly string[],
  unlockWaves: Readonly<Record<string, number>> = {},
  modifiers: SimConfig<IdSpace>['modifiers'] = [],
  newTowers: readonly string[] = [],
  state: PurchaseState = LIST_PRICE_STATE,
): BuildSlotView[] {
  return loadout.map((id) => {
    const def = towers[id];
    if (def === undefined) throw new RangeError(`hud: loadout tower '${id}' is not in the content`);
    const base = def.tiers[0].cost;
    const { cost, price } = priceOf(state, modifiers, id, base, 'build');
    return {
      tower: id,
      label: def.name,
      icon: def.sprites.icon,
      cost,
      listCost: costFor(modifiers, id, base),
      price,
      unlockWave: Object.hasOwn(unlockWaves, id) ? (unlockWaves[id] ?? null) : null,
      isNew: newTowers.includes(id),
    };
  });
}

/** The first tile of each ground route, as "col,row" (a map's spawn points). */
function spawnKey(route: { readonly tiles: readonly (readonly [number, number])[] }): string {
  const t = route.tiles[0];
  return t === undefined ? '' : `${t[0]},${t[1]}`;
}

/**
 * The preview of the wave after `wave` (the last wave started), or null if none is left. Groups
 * of the same enemy on the same layer and spawn merge, in first-appearance order (core-loop
 * §2.2). `seen`: the enemy types the save has met (`campaign.seenEnemies`); a type that's in none
 * of them nor in an earlier wave of the map wears NEW, except in the Quiet Wave (`quiet_wave`
 * groups: no NEW badge, no prompt; act1.md § A1M5). On a map whose ground routes start at more
 * than one spawn, each ground group names its spawn, and a spawn that sent nothing before opens
 * (`newSpawn`).
 */
export function wavePreview(
  map: Pick<CompiledMapDef<IdSpace>, 'waves'>,
  wave: number,
  seen: ReadonlySet<string> = new Set(),
): WavePreview | null {
  const next = map.waves[wave];
  if (next === undefined) return null;
  const met = new Set(seen);
  const usedSpawns = new Set<string>();
  // Each ground spawn's name: the first route the map's waves send from it ("west" → "West").
  const spawns = new Map<string, string>();
  for (const w of map.waves) {
    for (const g of w.groups) {
      const k = spawnKey(g.route);
      if (g.route.layer === 'ground' && !spawns.has(k)) spawns.set(k, displayName(g.route.id));
    }
  }
  for (const w of map.waves.slice(0, wave)) {
    for (const g of w.groups) {
      met.add(g.enemy.id);
      usedSpawns.add(spawnKey(g.route));
    }
  }
  const named = spawns.size > 1;
  const groups: WavePreviewGroup[] = [];
  for (const g of next.groups) {
    // A neutral (Gerald) is the mail, not a pest (R9): no NEW, no AIR, a MAIL tag instead.
    const neutral = g.enemy.neutral;
    const air = g.enemy.layer === 'air' && !neutral;
    const spawn =
      named && g.route.layer === 'ground' ? (spawns.get(spawnKey(g.route)) ?? null) : null;
    const isNew = !met.has(g.enemy.id) && !g.tags.includes('quiet_wave') && !neutral;
    const i = groups.findIndex((x) => x.enemy === g.enemy.id && x.air === air && x.spawn === spawn);
    const prev = groups[i];
    if (prev === undefined) {
      groups.push({
        enemy: g.enemy.id,
        label: g.enemy.name,
        icon: g.enemy.sprites.icon,
        count: g.count,
        air,
        neutral,
        fast: g.enemy.tells.includes('fast'),
        isNew,
        spawn,
        newSpawn: spawn !== null && wave > 0 && !usedSpawns.has(spawnKey(g.route)),
      });
    } else {
      groups[i] = { ...prev, count: prev.count + g.count, isNew: prev.isNew && isNew };
    }
  }
  return { number: next.number, groups };
}

/** Whole seconds left in the countdown to the next wave (rounded up), or null when none runs. */
export function countdownSeconds(phase: SchedulePhase, ticksLeft: number): number | null {
  return phase === 'countdown' && ticksLeft > 0 ? Math.ceil(ticksLeft / TICK_HZ) : null;
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
            name: silkText(map.medals?.challenge.name ?? ''),
            description: silkText(map.medals?.challenge.description ?? ''),
          }
        : MEDAL_TEXT[kind];
    out.push({ kind, id, ...text, held: held.includes(id), status: status[kind] });
  }
  return out;
}

type MapEnemy = CompiledMapDef<IdSpace>['waves'][number]['groups'][number]['enemy'];

/** Every enemy type a map's waves send, by id. */
function mapEnemies(map: Pick<CompiledMapDef<IdSpace>, 'waves'>): Map<string, MapEnemy> {
  const enemies = new Map<string, MapEnemy>();
  for (const w of map.waves) for (const g of w.groups) enemies.set(g.enemy.id, g.enemy);
  return enemies;
}

/**
 * A map's threats as the briefing lists them: each `threatIntel` trait with its tell's glyph
 * (`THREAT_INTEL_TELL`: `burrowing` draws `icon.tell.burrower`, `boss` `icon.tell.boss`), then any other glyph-bearing tell of its
 * enemies (the Hauler's `carrier`), each tell once. Neutrals (Gerald) aren't threats.
 */
function threatViews(map: Pick<CompiledMapDef<IdSpace>, 'threatIntel' | 'waves'>): ThreatView[] {
  const seen = new Set<string>();
  const threats: ThreatView[] = [];
  for (const trait of map.threatIntel) {
    const tell = THREAT_INTEL_TELL[trait];
    if (seen.has(tell)) continue;
    seen.add(tell);
    threats.push({ id: trait, label: threatLabel(trait), glyph: tellGlyph([tell]) });
  }
  for (const e of mapEnemies(map).values()) {
    if (e.neutral) continue;
    for (const tell of e.tells) {
      const glyph = tellGlyph([tell]);
      if (seen.has(tell) || glyph === null) continue;
      seen.add(tell);
      threats.push({ id: tell, label: threatLabel(tell), glyph });
    }
  }
  return threats;
}

/**
 * A map's threat names, exactly the briefing's strip (D059: the loadout screen's Threats list
 * reads the same, Carrier included): "Fast", "Armored", "Carrier".
 */
export function threatNames(map: Pick<CompiledMapDef<IdSpace>, 'threatIntel' | 'waves'>): string[] {
  return threatViews(map).map((t) => t.label);
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
  const enemies = mapEnemies(map);
  const threats = threatViews(map);
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

/** The battle config fields the ability slots read. */
type AbilityConfig = Pick<SimConfig<IdSpace>, 'content' | 'abilities' | 'modifiers'> &
  Partial<Pick<SimConfig<IdSpace>, 'companion'>>;

const SPEAKER_DEFS_BY_ID: Readonly<
  Record<string, { readonly name: string; readonly color: string; readonly portrait: string | null }>
> = SPEAKERS;

/** The companion slot 2 belongs to, as its portrait shows (T216), or null without a portrait. */
export function companionView(companion: string | null | undefined): CompanionView | null {
  if (companion === null || companion === undefined) return null;
  const def = Object.hasOwn(SPEAKER_DEFS_BY_ID, companion)
    ? SPEAKER_DEFS_BY_ID[companion]
    : undefined;
  if (def?.portrait === null || def === undefined) return null;
  return { name: def.name, portrait: def.portrait, color: def.color };
}

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
      label: silkText(def.name),
      icon: def.sprites.icon,
      key: ABILITY_KEYS[slot],
      description: silkText(abilityDescription(def, abilityStats(def, cfg.modifiers))),
      aim: aimOf(def.effect.kind),
      wavesCooldown: def.cooldownWaves > 0,
      absent,
      companion: slot === 2 ? companionView(cfg.companion) : null,
    };
  };
  if (slot1 !== null) out.push(view(1, slot1, false));
  if (slot2 !== null && slot2State !== 'none') out.push(view(2, slot2, slot2State === 'absent'));
  return out;
}

/**
 * What aiming an ability picks (core-loop §3.1): a stretch of path (a segment), a spot (a
 * strike), or nothing at all: Time Dilation and Clearance Sale cast on the press (D082).
 */
export function aimOf(kind: CompiledAbilityEffect['kind']): AbilitySlotView['aim'] {
  switch (kind) {
    case 'segment':
      return 'path';
    case 'strike':
    case 'reveal':
      return 'area';
    case 'slowAll':
    case 'discount':
      return 'none';
    default:
      return assertNever(kind);
  }
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
const READY: AbilityCooldownView = Object.freeze({
  secondsLeft: 0,
  wavesLeft: 0,
  remaining: 0,
  free: false,
  charges: 0,
});

/** What else a slot shows besides its countdown: waves left, Ready Room's FREE, sale charges. */
export interface SlotExtras {
  /** Wave starts until ready (a cooldown counted in waves), else 0. */
  readonly wavesLeft: number;
  /** The wave cooldown's full length, for the wipe (0 for a tick cooldown). */
  readonly totalWaves: number;
  readonly free: boolean;
  readonly charges: number;
}

const NO_EXTRAS: SlotExtras = Object.freeze({
  wavesLeft: 0,
  totalWaves: 0,
  free: false,
  charges: 0,
});

/**
 * An ability's cooldown as the HUD shows it: whole seconds left (rounded up), or wave starts left
 * for one counted in waves (Clearance Sale), and the share still to recharge in 1/16 steps (the
 * icon's wipe); plus Ready Room's FREE and the charges it has loaded. Reuses `prev` when nothing
 * changed, so the slot re-renders about once a second, not every tick.
 */
export function cooldownView(
  ticksLeft: number,
  totalTicks: number,
  prev: AbilityCooldownView | null,
  extras: SlotExtras = NO_EXTRAS,
): AbilityCooldownView {
  const { wavesLeft, totalWaves, free, charges } = extras;
  const ticking = ticksLeft > 0 && totalTicks > 0;
  if (!ticking && wavesLeft <= 0) {
    if (!free && charges === 0) {
      return prev !== null &&
        prev.secondsLeft === 0 &&
        prev.wavesLeft === 0 &&
        !prev.free &&
        prev.charges === 0
        ? prev
        : READY;
    }
  }
  const secondsLeft = ticking ? Math.ceil(ticksLeft / TICK_HZ) : 0;
  const share = ticking
    ? Math.min(1, ticksLeft / totalTicks)
    : wavesLeft > 0
      ? Math.min(1, wavesLeft / Math.max(1, totalWaves))
      : 0;
  const remaining = Math.ceil(share * COOLDOWN_STEPS) / COOLDOWN_STEPS;
  const waves = wavesLeft > 0 ? wavesLeft : 0;
  if (
    prev !== null &&
    prev.secondsLeft === secondsLeft &&
    prev.wavesLeft === waves &&
    prev.remaining === remaining &&
    prev.free === free &&
    prev.charges === charges
  ) {
    return prev;
  }
  return { secondsLeft, wavesLeft: waves, remaining, free, charges };
}

/** What a recharging slot's chip reads: "12s", or "1 wave" / "3 waves" for a wave cooldown. */
export function cooldownChip(cd: AbilityCooldownView): string {
  if (cd.wavesLeft > 0) return cd.wavesLeft === 1 ? '1 wave' : `${cd.wavesLeft} waves`;
  return `${cd.secondsLeft}s`;
}

/** A wave cooldown in words (core-loop §3.2, Clearance Sale): "Ready in 1 wave", "Ready in 3 waves". */
export function readyInWaves(waves: number): string {
  return `Ready in ${waves} ${waves === 1 ? 'wave' : 'waves'}`;
}

/**
 * The slot's recharge for its screen-reader label (after ", recharging, "): "34 s", or "1 wave" /
 * "3 waves" for a wave cooldown.
 */
export function cooldownWords(cd: AbilityCooldownView): string {
  if (cd.wavesLeft > 0) return cd.wavesLeft === 1 ? '1 wave' : `${cd.wavesLeft} waves`;
  return `${cd.secondsLeft} s`;
}

/**
 * The map's optional objectives (Objective Intel; maps.md § 5.3) for the HUD's tracker and the
 * briefing, each with its standing this run. `status`: the sim's standing by id
 * (`objectiveStatusById`); an id it doesn't name is open. `held`: the ids the save already holds
 * for this map (`MapRecord.objectives`), which the briefing marks "On file".
 */
export function objectiveViews(
  map: Pick<CompiledMapDef<IdSpace>, 'objectives'>,
  status: Readonly<Record<string, ObjectiveStatusView>> = {},
  held: readonly string[] = [],
): ObjectiveView[] {
  return map.objectives.map((o) => ({
    id: o.id,
    name: silkText(o.name),
    description: silkText(o.description),
    intel: o.intel,
    status: Object.hasOwn(status, o.id) ? (status[o.id] ?? 'open') : 'open',
    held: held.includes(o.id),
  }));
}
