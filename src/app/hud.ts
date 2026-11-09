// Mirrors a battle into the HUD's signals (ui/state.ts `hud`) after every host frame and on every
// interaction change. Components read `hud` and `speed`, and act through app/commands.ts. Signals
// only notify on a changed value; arrays and view objects are replaced only when their contents
// change, so a steady frame re-renders nothing.
import type { CompiledAbilityDef, CompiledMapDef, CompiledTowerDef } from '../content/compiled.ts';
import { MAX_TIER_BEFORE_SPEC } from '../content/rules.ts';
import type { IdSpace, MeterLabel, TileChar } from '../content/types.ts';
import { gridToScreen, mapOrigin, type IsoOrigin } from '../render/iso.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { VIEW_H, VIEW_W } from '../render/scale.ts';
import { TICK_HZ } from '../shared/time.ts';
import { assertNever } from '../shared/types.ts';
import {
  abilityStats,
  callWaveBonus,
  isBuildableTile,
  sellValue,
  towerStats,
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
  type SelectedTowerView,
  type WavePreview,
  type WavePreviewGroup,
} from '../ui/state.ts';
import type { Host } from './host.ts';

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

/** The build slots for a loadout. `unlockWaves`: towerUnlockWaves(map). */
export function buildSlots(
  towers: Readonly<Record<string, CompiledTowerDef>>,
  loadout: readonly string[],
  unlockWaves: Readonly<Record<string, number>> = {},
): BuildSlotView[] {
  return loadout.map((id) => {
    const def = towers[id];
    if (def === undefined) throw new RangeError(`hud: loadout tower '${id}' is not in the content`);
    return {
      tower: id,
      label: displayName(id),
      icon: def.sprites.icon,
      cost: def.tiers[0].cost,
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
      return m === null ? { speaker: null, text: line } : { speaker: m[1]!, text: m[2]! };
    });
}

/** Whole seconds left in the countdown to the next wave (rounded up), or null when none runs. */
export function countdownSeconds(phase: SchedulePhase, ticksLeft: number): number | null {
  return phase === 'countdown' && ticksLeft > 0 ? Math.ceil(ticksLeft / TICK_HZ) : null;
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
    a.stats === b.stats &&
    a.upgradeDelta === b.upgradeDelta &&
    a.x === b.x &&
    a.y === b.y
  );
}

/**
 * The selected tower's panel view, or null if it's gone. Reuses `prev` when nothing changed, and
 * `prev`'s stat lines while the tower and tier are the same (no stat work on a steady frame).
 */
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
  let statLine: string;
  let upgradeDelta: string | null;
  if (prev !== null && prev.uid === uid && prev.tier === t.tier) {
    statLine = prev.stats;
    upgradeDelta = prev.upgradeDelta;
  } else {
    const stats = towerStats(t.def, t.tier);
    statLine = statLineText(stats);
    upgradeDelta = deltaText(stats.next);
  }
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
    stats: statLine,
    upgradeDelta,
    x: p.x,
    y: p.y,
  };
  return sameSelected(prev, next) ? prev : next;
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
  hud.notice.value = { id: ++noticeId, text };
  if (noticeTimer !== null) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    noticeTimer = null;
    hud.notice.value = null;
  }, NOTICE_MS);
}

export interface HudOptions {
  /** Open the map's static briefing (if it has one) over the battle until it's dismissed. */
  readonly briefing: boolean;
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
  hud.slots.value = buildSlots(towers, sim.config.loadout, towerUnlockWaves(sim.map));
  const abilityViews = abilitySlots(sim.config);
  const cooldownTotals = abilityCooldownTotals(sim.config);
  hud.abilities.value = abilityViews;
  hud.notice.value = null;
  const lines = opts.briefing ? briefingLines(sim.map.briefing) : [];
  hud.briefing.value = lines.length === 0 ? null : lines;
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
    hud.selected.value = selectedView(sim, interaction.selectedTower, origin, hud.selected.value);
    hud.upgradeHint.value = upgradeHintShows(
      teachStarted,
      upgraded,
      s.towers.live,
      s.outcome === 'playing',
    );
    syncCooldowns();
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
    hud.selected.value = selectedView(sim, interaction.selectedTower, origin, hud.selected.value);
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
      const cost = towers[e.tower]?.tiers[0].cost ?? Infinity;
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
    hud.countdown.value = null;
    hud.callBonus.value = 0;
  };
}
