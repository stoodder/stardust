// The HUD's other view models (T225 split from app/hud.ts): build slots, the wave preview, the
// briefing's lines, medals, threat intel, the towers on the field (hold-fire count, panel points),
// and the ability slots and their cooldowns. Content text goes through `silkText` here, so the
// components draw it as given (D059).
import type { CompiledMapDef, CompiledTowerDef } from '../content/compiled.ts';
import { COUNTER_ANSWERS, MAX_TIER_BEFORE_SPEC } from '../content/rules.ts';
import { answerScope, answersCarried, type ReachedTower } from '../content/counterAnswers.ts';
import { SPRITES } from '../content/sprites/index.ts';
import type { IdSpace } from '../content/types.ts';
import { gridToScreen, type IsoOrigin } from '../render/iso.ts';
import { TICK_HZ } from '../shared/time.ts';
import {
  abilityStats,
  costFor,
  MEDAL_KINDS,
  medalId,
  type MedalKind,
  type MedalStatus,
  type SchedulePhase,
  type Sim,
  type SimConfig,
} from '../sim/index.ts';
import type {
  AbilityCooldownView,
  AbilitySlotView,
  BriefingLine,
  BuildSlotView,
  MedalView,
  RequiredCounterView,
  ThreatIntelView,
  ThreatView,
  WavePreview,
  WavePreviewGroup,
} from '../ui/state.ts';
import { silkText } from '../ui/silk.ts';
import { abilityDescription, answerLabel, displayName } from './hudText.ts';

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
 * The build slots for a loadout. `unlockWaves`: towerUnlockWaves(map). Costs are what the sim
 * charges: tier 1 after the run's `towerCost` modifiers (`costFor`, D037). `newTowers`: the
 * loadout's newly issued towers (meta/hints.ts), whose slots wear a NEW pip.
 */
export function buildSlots(
  towers: Readonly<Record<string, CompiledTowerDef>>,
  loadout: readonly string[],
  unlockWaves: Readonly<Record<string, number>> = {},
  modifiers: SimConfig<IdSpace>['modifiers'] = [],
  newTowers: readonly string[] = [],
): BuildSlotView[] {
  return loadout.map((id) => {
    const def = towers[id];
    if (def === undefined) throw new RangeError(`hud: loadout tower '${id}' is not in the content`);
    return {
      tower: id,
      label: def.name,
      icon: def.sprites.icon,
      cost: costFor(modifiers, id, def.tiers[0].cost),
      unlockWave: Object.hasOwn(unlockWaves, id) ? (unlockWaves[id] ?? null) : null,
      isNew: newTowers.includes(id),
    };
  });
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
        label: g.enemy.name,
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
 * A map's threats as the briefing lists them: each `threatIntel` trait, then any other glyph-
 * bearing tell of its enemies (the Hauler's `carrier`).
 */
function threatViews(map: Pick<CompiledMapDef<IdSpace>, 'threatIntel' | 'waves'>): ThreatView[] {
  const threats: ThreatView[] = map.threatIntel.map((trait) => ({
    id: trait,
    label: displayName(trait),
    glyph: tellGlyph([trait]),
  }));
  const seen = new Set<string>(map.threatIntel);
  for (const e of mapEnemies(map).values()) {
    for (const tell of e.tells) {
      const glyph = tellGlyph([tell]);
      if (seen.has(tell) || glyph === null) continue;
      seen.add(tell);
      threats.push({ id: tell, label: displayName(tell), glyph });
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
      label: silkText(def.name),
      icon: def.sprites.icon,
      key: ABILITY_KEYS[slot],
      description: silkText(abilityDescription(def, abilityStats(def, cfg.modifiers))),
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
