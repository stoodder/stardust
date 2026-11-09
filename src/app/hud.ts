// Mirrors a battle into the HUD's signals (ui/state.ts `hud`) after every host frame and on every
// interaction change. Components read `hud` and `speed`, and act through app/commands.ts. Signals
// only notify on a changed value; arrays and view objects are replaced only when their contents
// change, so a steady frame re-renders nothing.
import type { CompiledAbilityDef, CompiledMapDef, CompiledTowerDef } from '../content/compiled.ts';
import { MAX_TIER_BEFORE_SPEC, MISCLICK_GRACE_SEC, SELL_REFUND_PCT } from '../content/rules.ts';
import type { IdSpace, MeterLabel } from '../content/types.ts';
import { gridToScreen, mapOrigin, type IsoOrigin } from '../render/iso.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { VIEW_H, VIEW_W } from '../render/scale.ts';
import { TICK_HZ } from '../shared/time.ts';
import { assertNever } from '../shared/types.ts';
import type { RejectReason, Sim, Tower } from '../sim/index.ts';
import {
  hud,
  speed,
  type AbilityCooldownView,
  type AbilitySlotView,
  type BuildSlotView,
  type SelectedTowerView,
  type WavePreview,
  type WavePreviewGroup,
} from '../ui/state.ts';
import type { Host } from './host.ts';

// TODO(T105b): use the sim's own sell-value rule (rounding included) once it implements `sell`.
/** How long a notice stays up, in ms of real time. */
export const NOTICE_MS = 1800;

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

/** The build slots for a loadout. */
export function buildSlots(
  towers: Readonly<Record<string, CompiledTowerDef>>,
  loadout: readonly string[],
): BuildSlotView[] {
  return loadout.map((id) => {
    const def = towers[id];
    if (def === undefined) throw new RangeError(`hud: loadout tower '${id}' is not in the content`);
    return { tower: id, label: displayName(id), icon: def.sprites.icon, cost: def.tiers[0].cost };
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
        label: displayName(g.enemy.id),
        icon: g.enemy.sprites.icon,
        count: g.count,
        air,
      });
    } else {
      groups[i] = { ...prev, count: prev.count + g.count };
    }
  }
  return { number: next.number, groups };
}

/** What a sell returns now: everything inside the misclick grace, else 70% (rounded down). */
export function sellValue(
  t: Pick<Tower, 'invested' | 'builtTick' | 'firstFiredTick'>,
  tick: number,
): { value: number; full: boolean } {
  const full = t.firstFiredTick < 0 && tick - t.builtTick < MISCLICK_GRACE_SEC * TICK_HZ;
  return { value: full ? t.invested : Math.floor(t.invested * SELL_REFUND_PCT), full };
}

function sameSelected(a: SelectedTowerView | null, b: SelectedTowerView): boolean {
  return (
    a !== null &&
    a.uid === b.uid &&
    a.label === b.label &&
    a.icon === b.icon &&
    a.tier === b.tier &&
    a.maxTier === b.maxTier &&
    a.upgradeCost === b.upgradeCost &&
    a.sellValue === b.sellValue &&
    a.fullRefund === b.fullRefund &&
    a.priority === b.priority &&
    a.x === b.x &&
    a.y === b.y
  );
}

/** The selected tower's panel view, or null if it's gone. Reuses `prev` when nothing changed. */
export function selectedView(
  sim: Sim<IdSpace>,
  uid: number,
  origin: IsoOrigin,
  prev: SelectedTowerView | null,
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
  const sell = sellValue(t, sim.state.tick);
  const next: SelectedTowerView = {
    uid,
    label: displayName(t.def.id),
    icon: t.def.sprites.icon,
    tier: t.tier,
    maxTier: MAX_TIER_BEFORE_SPEC,
    upgradeCost: t.tier < MAX_TIER_BEFORE_SPEC ? (t.def.tiers[t.tier]?.cost ?? null) : null,
    sellValue: sell.value,
    fullRefund: sell.full,
    priority: t.priority,
    x: p.x,
    y: p.y,
  };
  return sameSelected(prev, next) ? prev : next;
}

/**
 * The armed-slot rule after a build (T106): the slot stays armed while another of the same tower
 * is affordable, so the player can place several in a row; otherwise it disarms.
 */
export function staysArmed(armed: string | null, built: string, credits: number, cost: number) {
  return armed === built && credits >= cost;
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
    case 'waveInProgress':
      return 'Wave in progress';
    case 'noWavesLeft':
      return 'No waves left';
    case 'noAbility':
      return 'No ability equipped';
    case 'abilityOnCooldown':
      return 'Recharging';
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

/** The commander ability slots a config equips (slot 1 only in M1; slot 2 is T207's). */
export function abilitySlots(
  abilities: Readonly<Record<string, CompiledAbilityDef>>,
  slot1: string | null,
): AbilitySlotView[] {
  if (slot1 === null) return [];
  const def = abilities[slot1];
  if (def === undefined) throw new RangeError(`hud: ability '${slot1}' is not in the content`);
  return [{ slot: 1, ability: def.id, label: def.name, icon: def.sprites.icon, key: 'Q' }];
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
  hud.notice.value = { id: ++noticeId, text };
  if (noticeTimer !== null) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    noticeTimer = null;
    hud.notice.value = null;
  }, NOTICE_MS);
}

/** Wires the HUD signals to a battle. Returns the unwiring (which also resets them). */
export function bindHud(host: Host<IdSpace>, interaction: BattleInteraction): () => void {
  const { sim } = host;
  const towers = sim.config.content.towers;
  const origin = mapOrigin(sim.map.cols, sim.map.rows, VIEW_W, VIEW_H);
  hud.mapId.value = sim.map.id;
  hud.act.value = String(sim.map.act);
  hud.waveCount.value = sim.map.waves.length;
  hud.meterLabel.value = meterLabelText(sim.map.meterLabel);
  hud.loadout.value = [...sim.config.loadout];
  hud.slots.value = buildSlots(towers, sim.config.loadout);
  const abilityViews = abilitySlots(sim.config.content.abilities, sim.config.abilities.slot1);
  hud.abilities.value = abilityViews;
  hud.notice.value = null;
  let previewFor = -1;
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
    hud.selected.value = selectedView(sim, interaction.selectedTower, origin, hud.selected.value);
    syncCooldowns();
    speed.value = host.speed;
  };
  const syncCooldowns = (): void => {
    const prev = hud.abilityCooldowns.value;
    let next: AbilityCooldownView[] | null = null;
    for (let i = 0; i < abilityViews.length; i++) {
      const v = abilityViews[i]!; // i < length
      const def = sim.config.content.abilities[v.ability];
      const left = sim.state.abilityCooldownTicks[v.slot - 1] ?? 0;
      const cd = cooldownView(left, def?.cooldownTicks ?? 0, prev[i] ?? null);
      if (cd !== prev[i]) next ??= [...prev];
      if (next !== null) next[i] = cd;
    }
    if (next !== null) hud.abilityCooldowns.value = next;
  };
  const syncInteraction = (): void => {
    hud.selectedTower.value = interaction.selectedTower;
    hud.armedTower.value = interaction.armed;
    hud.aimingAbility.value = interaction.aiming;
    hud.selected.value = selectedView(sim, interaction.selectedTower, origin, hud.selected.value);
  };
  sync();
  syncInteraction();
  const offs = [
    host.onAfterFrame(sync),
    interaction.subscribe(syncInteraction),
    host.bus.on('TowerBuilt', (e) => {
      const cost = towers[e.tower]?.tiers[0].cost ?? Infinity;
      if (!staysArmed(interaction.armed, e.tower, sim.state.credits, cost)) {
        if (interaction.armed === e.tower) interaction.arm(null);
      }
    }),
    host.bus.on('CommandRejected', (e) => {
      const text = rejectText(e.reason);
      if (text !== null) showNotice(text);
    }),
  ];
  return () => {
    for (const off of offs) off();
    hud.mapId.value = null;
    hud.selectedTower.value = 0;
    hud.selected.value = null;
    hud.armedTower.value = null;
    hud.aimingAbility.value = null;
    hud.abilities.value = [];
    hud.abilityCooldowns.value = [];
    hud.nextWave.value = null;
    hud.notice.value = null;
  };
}
