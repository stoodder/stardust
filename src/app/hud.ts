// Mirrors a battle into the HUD's signals (ui/state.ts `hud`) after every host frame and on every
// interaction change. Components read `hud` and `speed`, and act through app/commands.ts. Signals
// only notify on a changed value; arrays and view objects are replaced only when their contents
// change, so a steady frame re-renders nothing. The view models are built by hudViews.ts and
// hudPanel.ts, and their words by hudText.ts (T225).
import type { IdSpace } from '../content/types.ts';
import { isMapWon, specsOwned, UPGRADE_HINT } from '../meta/index.ts';
import { mapOrigin } from '../render/iso.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { VIEW_H, VIEW_W } from '../render/scale.ts';
import {
  abilityStats,
  callWaveBonus,
  freeCastReady,
  nextWaveIsQuiet,
  objectiveStatusById,
} from '../sim/index.ts';
import { CALLSIGNS } from '../content/dialogue/profile.ts';
import { presentationOfMap } from '../story/presentation.ts';
import { hud, speed, type AbilityCooldownView } from '../ui/state.ts';
import { silkText } from '../ui/silk.ts';
import type { Host } from './host.ts';
import { bindAssetMeter } from './hudAsset.ts';
import { selectedView } from './hudPanel.ts';
import {
  displayName,
  holdFireText,
  cursorText,
  meterLabelText,
  refusalText,
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
  objectiveViews,
  priceKey,
  priceOf,
  saleView,
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
  /** Towers whose specs are unlocked and authored (the answers that need a spec; T319). */
  readonly specsUnlocked: readonly string[];
  /** The spare-runners controls show (`meta/progress.ts`: after A1M5, or `devUnlocks`). */
  readonly spareRunnersOpen: boolean;
  /**
   * The Spare runners teach can show (T431): the controls are open and the map that teaches the
   * filter (SPARE_TEACH_MAP, A2M1) isn't won yet.
   */
  readonly spareRunnersTeach: boolean;
  /** This map's optional objectives the save already holds (`MapRecord.objectives`). */
  readonly heldObjectives: readonly string[];
  /** The loadout's newly issued towers, in their first battle for this save (meta/hints.ts). */
  readonly newTowers: readonly string[];
  /** The save has shown the upgrade teach before, so it stays off (once per save, D061). */
  readonly upgradeHintSeen: boolean;
  /** Enemy types the save has met (`campaign.seenEnemies`): the wave preview's NEW badges. */
  readonly seenEnemies: readonly string[];
  /**
   * The callsign the HUD's name plate shows, read again each frame (a scene's `set` node can
   * change it mid-map; core-loop §6.1). Sprout without a profile (D070's fallback).
   */
  callsign(): string;
}

/** The name plate's callsign without a save or profile (D070: the token fallback). */
export const DEFAULT_CALLSIGN = 'Sprout';

/** The callsign of the save in play, for the name plate. */
function savedCallsign(): string {
  const id = activeSave()?.profile?.callsign;
  return id === undefined ? DEFAULT_CALLSIGN : CALLSIGNS[id];
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
      spareRunnersTeach: false,
      heldObjectives: [],
      newTowers: [],
      upgradeHintSeen: false,
      seenEnemies: [],
      callsign: () => DEFAULT_CALLSIGN,
    };
  }
  const maps: Readonly<
    Record<
      string,
      { readonly medals: readonly string[]; readonly objectives?: readonly string[] } | undefined
    >
  > = save.campaign.maps;
  const record = Object.hasOwn(maps, mapId) ? maps[mapId] : undefined;
  const spareOpen = systemOpen('spareRunners');
  return {
    engineeringOpen: systemOpen('engineering'),
    heldMedals: record?.medals ?? [],
    heldObjectives: record?.objectives ?? [],
    ownedTowers: save.unlocks.towers.filter((t) => !save.unlocks.revokedTowers.includes(t)),
    specsUnlocked: specsOwned(save),
    spareRunnersOpen: spareOpen,
    spareRunnersTeach: spareOpen && !isMapWon(save, SPARE_TEACH_MAP),
    newTowers: newTowersIn(loadout),
    upgradeHintSeen: hintShown(UPGRADE_HINT),
    seenEnemies: save.campaign.seenEnemies,
    callsign: savedCallsign,
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

/**
 * Whether the Hold Fire teach shows (core-loop §2.7: "the HUD's Hold Fire (all) button pulses
 * until the player uses it"): a neutral unit (Gerald) is on the field, the master switch hasn't
 * been used this run, and the map is still being played.
 */
export function holdFireTeachShows(
  neutralsLive: number,
  masterUsed: boolean,
  playing: boolean,
): boolean {
  return neutralsLive > 0 && !masterUsed && playing;
}

/**
 * Whether the Hold Fire teach's second lesson shows (R4, A1M3: Bricks's "Hold the Rivets. Keep
 * the mortars working."): a neutral unit is on the field on its second pass or later (`pass`
 * counts the times one arrived on an empty field), and no single turret has held fire this run.
 */
export function holdFireOneHintShows(
  neutralsLive: number,
  pass: number,
  towerHoldUsed: boolean,
  playing: boolean,
): boolean {
  return neutralsLive > 0 && pass >= 2 && !towerHoldUsed && playing;
}

/** The first wave whose countdown starts the salvage teach (A1M3: QUILL's W2 drone prompt). */
export const SALVAGE_TEACH_WAVE = 2;
/** The salvage teach goes after this many wave starts (D098: a hint never goes stale). */
export const SALVAGE_HINT_WAVES = 2;

/**
 * Whether the salvage teach shows (R4, D098), on any map with wreckage: it has started (W2's
 * countdown came), fewer than SALVAGE_HINT_WAVES waves have started since (`wavesSince`), the map
 * has wreckage standing, and the drone hasn't been sent this run, while the map is still played.
 */
export function salvageHintShows(
  started: boolean,
  wreckStanding: boolean,
  sent: boolean,
  playing: boolean,
  wavesSince = 0,
): boolean {
  return started && wavesSince < SALVAGE_HINT_WAVES && wreckStanding && !sent && playing;
}

/** The map whose shift teaches Spare runners (core-loop §2.7: QUILL's line on A2M1). */
export const SPARE_TEACH_MAP = 'a2_m01';
/** The Spare runners teach goes after this many wave starts (D098: a hint never goes stale). */
export const SPARE_HINT_WAVES = 2;

/**
 * Whether the Spare runners teach shows (T431): the save may see it (`allowed`), a wave with
 * runners (a `fleeing` group) has started (`started`), fewer than SPARE_HINT_WAVES waves have
 * started since (`wavesSince`), and the filter hasn't been used this run, while the map is played.
 */
export function spareRunnersHintShows(
  allowed: boolean,
  started: boolean,
  used: boolean,
  playing: boolean,
  wavesSince = 0,
): boolean {
  return allowed && started && !used && playing && wavesSince < SPARE_HINT_WAVES;
}

/** Per wave (index = wave − 1): whether it sends runners (a group tagged `fleeing`). */
export function runnerWaves(
  waves: readonly { readonly groups: readonly { readonly tags: readonly string[] }[] }[],
): boolean[] {
  return waves.map((w) => w.groups.some((g) => g.tags.includes('fleeing')));
}

/** How long the "Checkpoint" cue shows, in ms of real time (T431). */
export const CHECKPOINT_CUE_MS = 3000;

/** An air group this big is a flock (A1M3's W5: ten Puffwings), what Time Dilation is taught on. */
export const FLOCK_SIZE = 10;

/**
 * Per wave (index = wave − 1): whether it sends a flock (an air group of FLOCK_SIZE or more).
 */
export function flockWaves(
  waves: readonly {
    readonly groups: readonly {
      readonly count: number;
      readonly enemy: { readonly layer: string };
    }[];
  }[],
): boolean[] {
  return waves.map((w) => w.groups.some((g) => g.enemy.layer === 'air' && g.count >= FLOCK_SIZE));
}

/**
 * Whether the Time Dilation teach shows (D098, A1M3's W5): Time Dilation is in the bar and ready,
 * it hasn't been cast this run, a flock has come within a turret's reach (`inReach`: a turret is
 * shooting at one of its flyers) and some of that flock is still alive, while the map is played.
 */
export function timeDilationTeachShows(
  inReach: boolean,
  cast: boolean,
  ready: boolean,
  playing: boolean,
): boolean {
  return inReach && !cast && ready && playing;
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
  // The UI act theme is a presentation dial (core-loop.md § 6.7; story/presentation.ts).
  hud.act.value = String(presentationOfMap(sim.map).theme);
  hud.waveCount.value = sim.map.waves.length;
  hud.meterLabel.value = meterLabelText(sim.map.meterLabel);
  hud.loadout.value = [...sim.config.loadout];
  const saveInfo = opts.save ?? hudSaveInfo(sim.map.id, sim.config.loadout);
  const unlockWaves = towerUnlockWaves(sim.map);
  // Prices follow the sim's (D077): the slots are rebuilt when Rapid Deploy's free build is spent
  // or Clearance Sale's charges change.
  let slotPrices = priceKey(sim.state);
  hud.slots.value = buildSlots(
    towers,
    sim.config.loadout,
    unlockWaves,
    sim.config.modifiers,
    saveInfo.newTowers,
    sim.state,
  );
  hud.sale.value = saleView(sim.state, null);
  // The NEW pips are this run's: the save remembers the towers have been fielded (D061).
  if (saveInfo.newTowers.length > 0) markNewTowersShown(saveInfo.newTowers);
  const abilityViews = abilitySlots(sim.config);
  const cooldownTotals = abilityCooldownTotals(sim.config);
  // Each slot's cooldown in waves (Clearance Sale), and whether its ability loads charges.
  const waveTotals = abilityViews.map((v) => {
    const def = sim.config.content.abilities[v.ability];
    return def === undefined ? 0 : abilityStats(def, sim.config.modifiers).cooldownWaves;
  });
  const chargeSlots = abilityViews.map(
    (v) => sim.config.content.abilities[v.ability]?.effect.kind === 'discount',
  );
  hud.abilities.value = abilityViews;
  hud.notice.value = null;
  const specLock = specLockText(saveInfo.engineeringOpen);
  hud.intel.value = threatIntel(sim.map, saveInfo.ownedTowers, saveInfo.specsUnlocked);
  // A checkpoint retry keeps Victory only (core-loop.md § 2.12): the tracker shows the other two
  // forfeited from the start.
  const resumed = host.resumedFrom !== null;
  let medalState = {
    victory: sim.state.medals.victory,
    perfectCore: resumed ? ('forfeited' as const) : sim.state.medals.perfectCore,
    challenge: resumed ? ('forfeited' as const) : sim.state.medals.challenge,
  };
  hud.medals.value = medalViews(sim.map, medalState, saveInfo.heldMedals);
  // Each objective's standing, redrawn whenever the sim settles one (T304f, D090).
  const syncObjectives = (): void => {
    hud.objectives.value = objectiveViews(
      sim.map,
      objectiveStatusById(sim.state, sim.map),
      saveInfo.heldObjectives,
    );
  };
  syncObjectives();
  hud.callsign.value = saveInfo.callsign();
  // The wave preview's NEW badges: types the save has met before this battle.
  const seen: ReadonlySet<string> = new Set(saveInfo.seenEnemies);
  // The Hold Fire teach (A1M3's Gerald): neutral units on the field, and whether Hold (all) has
  // been used this run.
  let neutralsLive = 0;
  let masterUsed = false;
  // Its second lesson (R4): Gerald's passes so far, and whether one turret has held fire.
  let neutralPass = 0;
  let towerHoldUsed = false;
  hud.holdFireTeach.value = false;
  hud.holdFireOneHint.value = false;
  // The salvage teach (R4): from W2's countdown, on a map with wreckage, until the drone is sent.
  let wrecks = 0;
  for (const ch of sim.map.tiles) if (ch === 'x') wrecks++;
  let salvageStarted = false;
  let salvageWaves = 0;
  hud.salvageHint.value = false;
  // The Time Dilation teach (D098): its slot, the waves that send a flock, whether a flock is in
  // reach (latched until its flyers are gone), and whether it has been cast this run.
  const tdSlot = abilityViews.find((v) => v.ability === 'time_dilation')?.slot ?? 0;
  const flock = flockWaves(sim.map.waves);
  let flockInReach = false;
  let tdCast = false;
  hud.timeDilationTeach.value = 0;
  hud.spareRunnersOpen.value = saveInfo.spareRunnersOpen;
  // The Spare runners teach (T431): from the first wave with runners, until the filter is used.
  const runners = runnerWaves(sim.map.waves);
  let spareStarted = false;
  let spareWaves = 0;
  let spareUsed = false;
  hud.spareRunnersTeach.value = false;
  hud.nameTag.value = null;
  hud.checkpoint.value = null;
  let checkpointTimer: ReturnType<typeof setTimeout> | null = null;
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
      hud.nextWave.value = wavePreview(sim.map, s.wave, seen);
    }
    hud.countdown.value = countdownSeconds(s.schedule.phase, s.schedule.countdownTicks);
    hud.callBonus.value = callWaveBonus(s, sim.map);
    // The Quiet Wave can't be called (D097, K3): no Call button, no bonus, no pulse.
    hud.nextQuiet.value = nextWaveIsQuiet(s, sim.map);
    hud.callPulse.value =
      s.outcome === 'playing' &&
      !hud.nextQuiet.value &&
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
    const perfectCore = resumed ? 'forfeited' : m.perfectCore;
    const challenge = resumed ? 'forfeited' : m.challenge;
    if (
      m.victory !== medalState.victory ||
      perfectCore !== medalState.perfectCore ||
      challenge !== medalState.challenge
    ) {
      medalState = { victory: m.victory, perfectCore, challenge };
      hud.medals.value = medalViews(sim.map, medalState, saveInfo.heldMedals);
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
    const key = priceKey(s);
    if (key !== slotPrices) {
      slotPrices = key;
      hud.slots.value = buildSlots(
        towers,
        sim.config.loadout,
        unlockWaves,
        sim.config.modifiers,
        saveInfo.newTowers,
        s,
      );
    }
    hud.sale.value = saleView(s, hud.sale.value);
    hud.callsign.value = saveInfo.callsign();
    const playing = s.outcome === 'playing';
    hud.holdFireTeach.value = holdFireTeachShows(neutralsLive, masterUsed, playing);
    hud.holdFireOneHint.value = holdFireOneHintShows(
      neutralsLive,
      neutralPass,
      towerHoldUsed,
      playing,
    );
    const w = s.wreckage;
    hud.salvageHint.value = salvageHintShows(
      salvageStarted,
      w.cleared.length < wrecks,
      w.queue.length > 0 || w.cleared.length > 0,
      playing,
      salvageWaves,
    );
    if (tdSlot !== 0 && !tdCast) {
      flockInReach = flockReach(flockInReach);
      const ready =
        (s.abilityCooldownTicks[tdSlot - 1] ?? 0) <= 0 &&
        (s.abilityCooldownWaves[tdSlot - 1] ?? 0) <= 0;
      hud.timeDilationTeach.value = timeDilationTeachShows(flockInReach, tdCast, ready, playing)
        ? tdSlot
        : 0;
    }
    hud.spareRunnersTeach.value = spareRunnersHintShows(
      saveInfo.spareRunnersTeach,
      spareStarted,
      spareUsed,
      playing,
      spareWaves,
    );
    hud.holdFireAll.value = s.holdFireAll;
    hud.spareRunnersAll.value = s.spareRunnersAll;
    hud.holdingCount.value = holdingCount(s.towers);
    speed.value = host.speed;
  };
  /**
   * Whether a flock is in reach now: once a turret shoots at one of its flyers, it stays in reach
   * (`latched`) until none of the flock's flyers is left. Scans the pools only while it matters.
   */
  /** Whether enemy slot `slot` (uid `uid`; 0: any) is a live flyer of a flock wave. */
  const isFlyer = (slot: number, uid: number): boolean => {
    const e = sim.state.enemies.items[slot];
    return (
      e !== undefined &&
      e.alive &&
      (uid === 0 || e.uid === uid) &&
      e.def?.layer === 'air' &&
      flock[e.wave - 1] === true
    );
  };
  const flockReach = (latched: boolean): boolean => {
    const s = sim.state;
    if (flock[s.wave - 1] !== true && !latched) return false;
    if (latched) {
      for (let i = 0; i < s.enemies.used; i++) if (isFlyer(i, 0)) return true;
      return false;
    }
    const towersPool = s.towers;
    for (let i = 0; i < towersPool.used; i++) {
      const t = towersPool.items[i]!; // i < used
      if (t.alive && t.targetUid !== 0 && isFlyer(t.targetSlot, t.targetUid)) return true;
    }
    return false;
  };
  const extras = { wavesLeft: 0, totalWaves: 0, free: false, charges: 0 };
  const syncCooldowns = (): void => {
    const prev = hud.abilityCooldowns.value;
    let next: AbilityCooldownView[] | null = null;
    const s = sim.state;
    for (let i = 0; i < abilityViews.length; i++) {
      const v = abilityViews[i]!; // i < length
      const left = s.abilityCooldownTicks[v.slot - 1] ?? 0;
      const wavesLeft = s.abilityCooldownWaves[v.slot - 1] ?? 0;
      const ready = left <= 0 && wavesLeft <= 0 && !v.absent;
      extras.wavesLeft = wavesLeft;
      extras.totalWaves = waveTotals[i] ?? 0;
      // Ready Room's free cast shows only on a slot that can cast now.
      extras.free = ready && freeCastReady(s, sim.config.modifiers, v.slot);
      extras.charges = chargeSlots[i] === true ? s.discountCharges : 0;
      const cd = cooldownView(left, cooldownTotals[v.slot - 1] ?? 0, prev[i] ?? null, extras);
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
    bindAssetMeter(host),
    host.onAfterFrame(sync),
    interaction.subscribe(syncInteraction),
    // Inputs refused before the sim (render/input/apply.ts): a path ability aimed off the path
    // ("Can't target there"), a build on wreckage (how to send the drone), wreckage already queued.
    interaction.onRefusal((r) => showNotice(refusalText(r))),
    host.bus.on('TowerBuilt', (e) => {
      hud.built.value = true;
      syncTowers();
      const def = towers[e.tower];
      // The next copy's price, as the sim will charge it (a sale charge may just have gone).
      const cost =
        def === undefined
          ? Infinity
          : priceOf(sim.state, sim.config.modifiers, e.tower, def.tiers[0].cost, 'build').cost;
      if (!staysArmed(interaction.armed, e.tower, sim.state.credits, cost)) {
        if (interaction.armed === e.tower) interaction.arm(null);
      }
    }),
    // A resumed run's replay (Host.replaying) rebuilds the counters below but shows nothing: its
    // flashes, banners, notices, and announcements played in the attempt that reached the
    // checkpoint (app/checkpoints.ts).
    host.bus.on('EnemyLeaked', (e) => {
      if (e.leak > 0 && !host.replaying) hud.leak.value = { id: ++leakId, amount: e.leak };
    }),
    host.bus.on('WaveStarted', (e) => {
      if (salvageStarted) salvageWaves++;
      if (spareStarted) spareWaves++;
      else if (runners[e.wave - 1] === true) spareStarted = true;
      if (host.replaying) return;
      hud.waveBanner.value = { id: ++bannerId, wave: e.wave };
      if (bannerTimer !== null) clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => {
        bannerTimer = null;
        hud.waveBanner.value = null;
      }, WAVE_BANNER_MS);
    }),
    host.bus.on('CountdownStarted', (e) => {
      if (!host.replaying) hud.countdownCue.value++;
      if (e.wave >= UPGRADE_TEACH_WAVE) teachStarted = true;
      if (e.wave >= SALVAGE_TEACH_WAVE) salvageStarted = true;
    }),
    host.bus.on('TowerUpgraded', () => {
      upgraded = true;
      syncCursor();
    }),
    host.bus.on('TowerSold', syncTowers),
    host.bus.on('ObjectiveProgress', syncObjectives),
    host.bus.on('SpareRunnersChanged', (e) => {
      if (e.on) spareUsed = true;
    }),
    // A checkpoint taken (T305b; core-loop §2.12): a small cue for a few seconds (T450: its sound).
    host.bus.on('CheckpointReached', (e) => {
      if (host.replaying) return;
      hud.checkpoint.value = { id: e.tick, wave: e.wave };
      if (checkpointTimer !== null) clearTimeout(checkpointTimer);
      checkpointTimer = setTimeout(() => {
        checkpointTimer = null;
        hud.checkpoint.value = null;
      }, CHECKPOINT_CUE_MS);
    }),
    host.bus.on('TowerSpecialized', syncCursor),
    // A clickable world object on the cursor's tile turned on or off (T409): say what it is now.
    host.bus.on('ClickableChanged', syncCursor),
    host.bus.on('CommandRejected', (e) => {
      if (host.replaying) return;
      const text = rejectText(e.reason);
      if (text !== null) showNotice(text);
    }),
    // Screen readers hear what H, Shift+H, and a cast did (D059; T is commands.ts's).
    host.bus.on('EnemySpawned', (e) => {
      if (sim.config.content.enemies[e.enemy]?.neutral === true) {
        if (neutralsLive === 0) neutralPass++;
        neutralsLive++;
      }
    }),
    host.bus.on('NeutralExited', () => {
      neutralsLive = Math.max(0, neutralsLive - 1);
    }),
    host.bus.on('HoldFireChanged', (e) => {
      if (e.target === 'all') masterUsed = true;
      else if (e.on) towerHoldUsed = true;
      if (host.replaying) return;
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
      if (e.ability === 'time_dilation') {
        tdCast = true;
        hud.timeDilationTeach.value = 0;
      }
      if (host.replaying) return;
      const def = sim.config.content.abilities[e.ability];
      announce(`${def?.name ?? displayName(e.ability)} fired.`);
    }),
  ];
  return () => {
    for (const off of offs) off();
    if (bannerTimer !== null) clearTimeout(bannerTimer);
    if (checkpointTimer !== null) clearTimeout(checkpointTimer);
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
    hud.nextQuiet.value = false;
    hud.holdFireAll.value = false;
    hud.holdingCount.value = 0;
    hud.spareRunnersAll.value = false;
    hud.spareRunnersOpen.value = false;
    hud.holdFireTeach.value = false;
    hud.holdFireOneHint.value = false;
    hud.salvageHint.value = false;
    hud.timeDilationTeach.value = 0;
    hud.sale.value = null;
    hud.objectives.value = [];
    hud.spareRunnersTeach.value = false;
    hud.nameTag.value = null;
    hud.checkpoint.value = null;
  };
}
