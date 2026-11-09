// Mirrors a battle into the HUD's signals (ui/state.ts `hud`) after every host frame and on every
// interaction change. Components read `hud` and `speed`, and act through app/commands.ts. Signals
// only notify on a changed value; arrays and view objects are replaced only when their contents
// change, so a steady frame re-renders nothing. The view models are built by hudViews.ts and
// hudPanel.ts, and their words by hudText.ts (T225).
import type { IdSpace } from '../content/types.ts';
import { UPGRADE_HINT } from '../meta/index.ts';
import { mapOrigin } from '../render/iso.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { VIEW_H, VIEW_W } from '../render/scale.ts';
import { callWaveBonus, costFor } from '../sim/index.ts';
import { hud, speed, type AbilityCooldownView } from '../ui/state.ts';
import { silkText } from '../ui/silk.ts';
import type { Host } from './host.ts';
import { selectedView } from './hudPanel.ts';
import {
  displayName,
  holdFireText,
  cursorText,
  meterLabelText,
  rejectText,
  specLockText,
} from './hudText.ts';
import {
  abilityCooldownTotals,
  abilitySlots,
  buildSlots,
  cooldownView,
  countdownSeconds,
  holdingCount,
  medalViews,
  threatIntel,
  towerPoints,
  towerUnlockWaves,
  wavePreview,
} from './hudViews.ts';
import {
  activeSave,
  hintShown,
  markHintsShown,
  markNewTowersShown,
  newTowersIn,
  systemOpen,
} from './save.ts';

/** How long a notice stays up, in ms of real time. */
export const NOTICE_MS = 1800;
/** How long the "WAVE n" banner shows, in ms of real time (D026). */
export const WAVE_BANNER_MS = 1200;
/** The call-wave button pulses only while more than this many seconds of countdown are left. */
export const CALL_PULSE_MIN_SEC = 5;

const sameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

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
  /** The loadout's newly issued towers, in their first battle for this save (meta/hints.ts). */
  readonly newTowers: readonly string[];
  /** The save has shown the upgrade teach before, so it stays off (once per save, D061). */
  readonly upgradeHintSeen: boolean;
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
      newTowers: [],
      upgradeHintSeen: false,
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
    newTowers: newTowersIn(loadout),
    upgradeHintSeen: hintShown(UPGRADE_HINT),
  };
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

let noticeId = 0;
let noticeTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Tells screen readers what the player's last action did (D059), through the HUD's polite live
 * region. Saying the same thing twice in a row still reads out (a trailing no-break space toggles).
 */
export function announce(text: string): void {
  const prev = hud.announce.value;
  const t = silkText(text);
  hud.announce.value = prev === t ? `${t}\u00a0` : t;
}

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
  /** Open the map's briefing (if it has one) over the battle until it's dismissed (app/dialogue.ts). */
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
  const saveInfo = opts.save ?? hudSaveInfo(sim.map.id, sim.config.loadout);
  hud.slots.value = buildSlots(
    towers,
    sim.config.loadout,
    towerUnlockWaves(sim.map),
    sim.config.modifiers,
    saveInfo.newTowers,
  );
  // The NEW pips are this run's: the save remembers the towers have been fielded (D061).
  if (saveInfo.newTowers.length > 0) markNewTowersShown(saveInfo.newTowers);
  const abilityViews = abilitySlots(sim.config);
  const cooldownTotals = abilityCooldownTotals(sim.config);
  hud.abilities.value = abilityViews;
  hud.notice.value = null;
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
  let upgradeHintMarked = false;
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
    // Once per save (D061): a save that has shown the teach never shows it again.
    hud.upgradeHint.value =
      !saveInfo.upgradeHintSeen &&
      upgradeHintShows(teachStarted, upgraded, s.towers.live, s.outcome === 'playing');
    if (hud.upgradeHint.value && !upgradeHintMarked) {
      upgradeHintMarked = true;
      markHintsShown([UPGRADE_HINT]);
    }
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
    // Screen readers hear what H, Shift+H, and a cast did (D059; T is commands.ts's).
    host.bus.on('HoldFireChanged', (e) => {
      let name: string | null = null;
      if (e.target !== 'all') {
        const pool = sim.state.towers;
        for (let i = 0; i < pool.used; i++) {
          const t = pool.items[i]!; // i < used
          if (t.alive && t.uid === e.target) name = t.def?.name ?? null;
        }
      }
      announce(holdFireText(e.on, e.target === 'all' ? null : (name ?? 'Turret')));
    }),
    host.bus.on('AbilityUsed', (e) => {
      const def = sim.config.content.abilities[e.ability];
      announce(`${def?.name ?? displayName(e.ability)} fired.`);
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
    hud.announce.value = '';
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
