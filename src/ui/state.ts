// UI view models (signals). The host updates them (app/hud.ts, after every frame, only when a
// value changes); components read them and act through app/commands.ts.
import { signal } from '@preact/signals';
import type { ScreenId, Speed } from '../app/testHookTypes.ts';
import type { ColorName } from '../content/palettes/master.ts';
import type { TargetPriority } from '../content/types.ts';

/** The screen the overlay shows. `null` while booting. */
export const screen = signal<ScreenId | null>(null);

/** Game speed (0 is paused). Mirrors the host loop's speed during a battle. */
export const speed = signal<Speed>(1);

/** One build slot (the loadout, slots 1–4): fixed for a battle. */
export interface BuildSlotView {
  readonly tower: string;
  /** Display name. */
  readonly label: string;
  /** The `icon.tower.*` sprite id. */
  readonly icon: string;
  /**
   * What building it costs right now (`purchasePriceInto`: tune-ups, then Rapid Deploy's free
   * first build, then Clearance Sale's discount), so the slot never refuses what the sim would
   * take (D077).
   */
  readonly cost: number;
  /** Its price after tune-ups alone (`costFor`): what it costs with no sale and no free build. */
  readonly listCost: number;
  /** How `cost` came about: the list price, Clearance Sale's discount, or Rapid Deploy's free build. */
  readonly price: PriceTag;
  /** The wave whose countdown unlocks it, if the map holds it back (`towerUnlockWave`). */
  readonly unlockWave: number | null;
  /** Newly issued, in its first battle for this save: the slot wears a NEW pip (D061). */
  readonly isNew: boolean;
}

/** How a purchase's price came about (D077): as listed, on sale, or free (Rapid Deploy). */
export type PriceTag = 'list' | 'sale' | 'free';

/** Clearance Sale while it has charges left (core-loop §3.2): "SALE -40% x3". */
export interface SaleView {
  /** Purchases left at the discount. */
  readonly charges: number;
  /** The discount in whole percent (40). */
  readonly pct: number;
}

/** One commander ability slot (core-loop §3.1): fixed for a battle. */
export interface AbilitySlotView {
  readonly slot: 1 | 2;
  readonly ability: string;
  /** Display name. */
  readonly label: string;
  /** The `icon.ability.*` sprite id. */
  readonly icon: string;
  /** Hotkey label (Q for slot 1, E for slot 2). */
  readonly key: string;
  /** One line on what it does, with its real numbers (`abilityStats`), for its tooltip. */
  readonly description: string;
  /**
   * What aiming it picks: a spot on the map (a strike) or a stretch of path (a segment); `none`
   * for an untargeted ability (Time Dilation, Clearance Sale), which casts on the press.
   */
  readonly aim: 'area' | 'path' | 'none';
  /** Its cooldown counts wave starts, not seconds (Clearance Sale: "Ready in 2 waves"). */
  readonly wavesCooldown: boolean;
  /**
   * The companion is `absent` (A3M4, core-loop §3.1): the slot shows, dark and disabled, with no
   * label; its ability can't be used.
   */
  readonly absent: boolean;
  /**
   * Slot 2's companion (T216, T431; art-direction §9: "the two commander ability slots (with the
   * companion's portrait)"): their portrait sprite, their name plate's color, and their name; null
   * on slot 1, or for a companion with no portrait.
   */
  readonly companion: CompanionView | null;
}

/** The companion beside slot 2: whose portrait shows on the slot (T216). */
export interface CompanionView {
  readonly name: string;
  /** Their portrait sprite (`portrait.<speaker>`). */
  readonly portrait: string;
  /** Their name plate's color (a master palette name, speakers.ts). */
  readonly color: string;
}

/** An ability slot's cooldown as shown: 0 seconds and 0 waves left means ready. */
export interface AbilityCooldownView {
  /** Whole seconds until ready, rounded up. */
  readonly secondsLeft: number;
  /** Wave starts until ready, for a cooldown counted in waves (Clearance Sale); else 0. */
  readonly wavesLeft: number;
  /** The share still recharging (0–1, in 1/16 steps): the height of the icon's dark wipe. */
  readonly remaining: number;
  /** A cast now is Ready Room's free one (`freeCastReady`): the slot says FREE. */
  readonly free: boolean;
  /** Charges the slot's ability has loaded and not yet spent (Clearance Sale's), or 0. */
  readonly charges: number;
}

/** One tier-4 specialization the tower panel offers at tier 3 (T202d). */
export interface SpecOptionView {
  readonly choice: 'a' | 'b';
  /** The spec's name ("Rivet Storm"). */
  readonly name: string;
  /** What specializing costs right now (`purchasePriceInto`, a `spec` purchase). */
  readonly cost: number;
  /** How the price came about (a Clearance Sale charge discounts it). */
  readonly price: PriceTag;
  /** A short description from its stats, e.g. "9 dmg · 7.5/s · 1 s spin-up". */
  readonly description: string;
  /** The description wrapped to the panel's width. */
  readonly descLines: readonly string[];
}

/** The tower panel's tier-4 choice (T202d): both specs, or both locked with what unlocks them. */
export interface SpecChoiceView {
  /** The pair isn't unlocked for this run (`SimConfig.specsUnlocked`). */
  readonly locked: boolean;
  /** What unlocks them, wrapped to the panel's width ("Engineering unlocks after The Audit"). */
  readonly lockLines: readonly string[];
  readonly options: readonly [SpecOptionView, SpecOptionView];
}

/** The selected tower, for its upgrade / sell / targeting panel. */
export interface SelectedTowerView {
  readonly uid: number;
  /**
   * Changes whenever anything the panel shows changes (tier, spec, bonuses, sell value, ...): the
   * view is rebuilt only then.
   */
  readonly key: string;
  readonly label: string;
  /** The specialization's name once the tower has one (tier 4), else null. */
  readonly specName: string | null;
  readonly icon: string;
  readonly tier: number;
  /** The highest in-map tier (3; tier 4 is a specialization, T202). */
  readonly maxTier: number;
  /** What the next tier costs right now (`purchasePriceInto`), or null at the top tier. */
  readonly upgradeCost: number | null;
  /** How the upgrade's price came about (a Clearance Sale charge discounts it). */
  readonly upgradePrice: PriceTag;
  /** Credits a sell returns right now (100% inside the misclick grace). */
  readonly sellValue: number;
  /** True while a sell would still refund everything (core-loop §2.3 misclick grace). */
  readonly fullRefund: boolean;
  /** null for towers that pick no target (pulse and support). */
  readonly priority: TargetPriority | null;
  /** The current tier's stats after every bonus (`towerStats`), e.g. "8 dmg · 2.22/s · range 3". */
  readonly stats: string;
  /** `stats` wrapped to the panel's width (a long bonus-laden line takes two). */
  readonly statsLines: readonly string[];
  /**
   * Where the bonuses come from, one per line: "+10% rate (Crossfire)", "+25% range (high
   * ground)". Empty with none.
   */
  readonly bonuses: readonly string[];
  /**
   * Sundown's line (T531; app/hudText.ts `darkTexts`), wrapped: "-15% range (dark)" for an unlit
   * tower, "Lit: full range" for a lit one while the map is dark; empty in daylight.
   */
  readonly dark: readonly string[];
  /** Sundown's line is the lit one (gold), not the range lost (violet). */
  readonly darkLit: boolean;
  /** A ramping beam's cap (the panel's ramp row: ×1 up to this; `hud.beamRamp` is now), or null. */
  readonly rampCap: number | null;
  /** What the next upgrade adds, e.g. "+3 dmg", or null at the top tier. */
  readonly upgradeDelta: string | null;
  /** "Next: …" wrapped to the panel's width (empty at the top tier). */
  readonly deltaLines: readonly string[];
  /** The tier-4 choice while the tower is at tier 3 and its type has specs; else null. */
  readonly specs: SpecChoiceView | null;
  /** The share a sell returns after the grace (70%, or more with Resale Value), in percent. */
  readonly refundPct: number;
  /** The tower is holding fire (core-loop §2.7): the panel's Hold fire toggle (H). */
  readonly holdFire: boolean;
  /**
   * The tower's spare-runners filter, or null while the control is hidden (until spare runners
   * unlock, after A1M5; or on a tower with no attack).
   */
  readonly spareRunners: boolean | null;
  /** The tower's tile center in game pixels, for placing the panel beside it. */
  readonly x: number;
  readonly y: number;
}

/** One group of the next wave's preview (core-loop §2.2), merged by enemy and layer. */
export interface WavePreviewGroup {
  readonly enemy: string;
  readonly label: string;
  readonly icon: string;
  readonly count: number;
  readonly air: boolean;
  /** A neutral unit (Gerald, the mail): a "MAIL" tag and the hold-fire glyph, never NEW or AIR. */
  readonly neutral: boolean;
  /** The enemy has the `fast` tell (art-direction §8): the preview shows a » chip. */
  readonly fast: boolean;
  /**
   * A type the player has never met (core-loop §2.2): not in the save's `seenEnemies` and not in
   * an earlier wave of this map. The Quiet Wave never wears it (act1.md § A1M5).
   */
  readonly isNew: boolean;
  /**
   * Where it comes from on a map with more than one spawn ("West", "East"), or null with one
   * spawn (the preview never lies about the lane: core-loop §2.2).
   */
  readonly spawn: string | null;
  /** This group's spawn sends nothing in any earlier wave: the route opens now (A1M5's W3). */
  readonly newSpawn: boolean;
}

/** The next wave: its number and what it brings. */
export interface WavePreview {
  readonly number: number;
  readonly groups: readonly WavePreviewGroup[];
}

/** An optional objective's standing this run (T304f settles it in the sim; until then, open). */
export type ObjectiveStatusView = 'open' | 'done' | 'failed';

/** One optional objective (Objective Intel; design/progression.md § 3), for the HUD's tracker. */
export interface ObjectiveView {
  readonly id: string;
  /** "Clean Audit". */
  readonly name: string;
  /** What completes it ("Sell no turret after its build phase."). */
  readonly description: string;
  /** The Intel it pays on a win. */
  readonly intel: number;
  readonly status: ObjectiveStatusView;
  /** The save already holds it (done on an earlier win): the briefing says "On file". */
  readonly held: boolean;
}

/** Which of a map's three medals (design/progression.md § 3). */
export type MedalKindView = 'victory' | 'perfectCore' | 'challenge';

/** One of the map's medals, for the briefing and the HUD's medal tracker (T202d). */
export interface MedalView {
  readonly kind: MedalKindView;
  /** The save id (`victory`, `perfect_core`, or the Challenge's id). */
  readonly id: string;
  readonly name: string;
  /** What earns it (the Challenge's description; the two fixed medals say it in their name). */
  readonly description: string;
  /** Already on file in the save in play. */
  readonly held: boolean;
  /** This run: still open, earned, or out of reach (`MedalProgress`). */
  readonly status: 'open' | 'earned' | 'forfeited';
}

/** One threat the briefing's intel strip shows: a trait (or tell) and its glyph, if one is drawn. */
export interface ThreatView {
  readonly id: string;
  readonly label: string;
  /** The 8×8 `icon.tell.*` glyph, or null (the label stands alone). */
  readonly glyph: string | null;
  /** Its tooltip, or null: the Skittish chip names the runners' traits (D134). */
  readonly tip: string | null;
}

/** A required counter (campaign.md § 4.8) and the owned towers that answer it. */
export interface RequiredCounterView {
  readonly counter: string;
  /** "Armor". */
  readonly label: string;
  /** Owned towers that answer it, e.g. "Rivet T3", "Thumper"; empty when none does yet. */
  readonly answers: readonly string[];
}

/** The briefing's threat-intel strip (T202d). */
export interface ThreatIntelView {
  readonly threats: readonly ThreatView[];
  readonly required: readonly RequiredCounterView[];
}

/** A short HUD message (a rejected command, a locked slot). `id` changes with every notice. */
export interface HudNotice {
  readonly id: number;
  readonly text: string;
  /**
   * A longer banner (the checkpoint resume's; D135): it wraps to two balanced lines, at most
   * 310 px wide, centred below the HUD's top button row, clear of the corner panels.
   */
  readonly banner?: boolean;
}

/** A spoken line with its speaker's name plate (the radio ticker, the results card's debrief). */
export interface SpokenLine {
  /** The speaker's name plate. */
  readonly name: string;
  /** The name plate's color. */
  readonly color: ColorName;
  readonly text: string;
}

/** A leak at the core, for the meter's flash. `id` changes with every leak. */
export interface LeakFlash {
  readonly id: number;
  /** Integrity lost. */
  readonly amount: number;
}

/**
 * A Protect map's asset meter (T305a; core-loop § 2.10): its name ("Rigs"), what's left, and its
 * full value. `damage` is the sim's band (`assetDamage`): `critical` is the low-asset alarm.
 */
export interface AssetMeterView {
  readonly name: string;
  readonly value: number;
  readonly max: number;
  readonly damage: 'intact' | 'damaged' | 'critical' | 'lost';
}

/**
 * An Escort's meter (T305c; core-loop § 2.9): refugees evacuated of the map's total, and those
 * lost against `maxLost` (null: no limit). The minimal readout; T531 builds the real meter.
 */
export interface EscortMeterView {
  readonly evacuated: number;
  readonly total: number;
  readonly lost: number;
  readonly maxLost: number | null;
  /**
   * The lost row's pips (T531), one per loss the map allows (`maxLost`), true once lost; null
   * when there's no `maxLost` or too many to draw (the row then reads "3/20" in words).
   */
  readonly pips: readonly boolean[] | null;
  /** Few losses left before defeat (story/meters.ts `escortLow`): the lost row's alarm. */
  readonly low: boolean;
}

/** The meter's relabel moment (T531): the label it had before an objective change. */
export interface MeterRelabel {
  /** Changes with every relabel, so the transition restarts. */
  readonly id: number;
  readonly from: string;
  /**
   * The old meter's number as it changed (the core's last integrity), shown with the old label
   * until the new one shows (D138: never "Core 0"); null shows "—".
   */
  readonly fromValue: number | null;
  /**
   * The old meter still shows whole (D139): true until its held beat has played (`relabelShown`),
   * then the Escort's rows show at once.
   */
  readonly held: boolean;
}

/**
 * Bricks's name tag on a turret (T431; story/tags.ts): the tower's uid and the plate's text, in
 * the 3×5 font's capitals. The battle scene draws the plate over that tower.
 */
export interface NameTagView {
  readonly uid: number;
  readonly text: string;
}

/** The "Checkpoint" cue as a checkpoint is taken (T431; core-loop §2.12). `id` changes each time. */
export interface CheckpointCue {
  readonly id: number;
  readonly wave: number;
}

/** The "WAVE n" banner as a wave starts. `id` changes with every wave. */
export interface WaveBanner {
  readonly id: number;
  readonly wave: number;
}

/**
 * The battle HUD's view model. Mirrors sim state and the battle's interaction state; never write
 * these from components, use app/commands.ts.
 */
export const hud = {
  /** The map being played, or null outside a battle. */
  mapId: signal<string | null>(null),
  /** The map's act, for the HUD's `data-act` theme (art-direction § Act themes). */
  act: signal('1'),
  credits: signal(0),
  /** Core integrity (lose at 0). */
  integrity: signal(0),
  /** The meter's label (map data `meterLabel`; Defend maps say Core). */
  meterLabel: signal('Core'),
  /** A Protect map's asset meter (app/hudAsset.ts), or null on other maps. */
  asset: signal<AssetMeterView | null>(null),
  /** The latest hit on the asset, for its meter's flash, or null. */
  assetHit: signal<LeakFlash | null>(null),
  /** An Escort's meter (app/hudEscort.ts) while the map is one, else null (T305c). */
  escort: signal<EscortMeterView | null>(null),
  /** The latest refugee lost, for the Escort meter's flash, or null (T531). */
  escortLost: signal<LeakFlash | null>(null),
  /** The meter's relabel as the map turns Escort mid-map (A2M5's pivot), or null (T531). */
  relabel: signal<MeterRelabel | null>(null),
  /** The selected beam tower's live ramp (app/hudPanel.ts `selectedRamp`), or null (T531). */
  beamRamp: signal<number | null>(null),
  /** The last wave started (0 during the setup phase). */
  wave: signal(0),
  waveCount: signal(0),
  outcome: signal<'playing' | 'won' | 'lost'>('playing'),
  /** The loadout, in slot order (build slots 1–4). */
  loadout: signal<readonly string[]>([]),
  /** The build slots, in loadout order. */
  slots: signal<readonly BuildSlotView[]>([]),
  /** Loadout towers still locked (towerUnlockWave). */
  lockedTowers: signal<readonly string[]>([]),
  /** The selected tower's uid, or 0. */
  selectedTower: signal(0),
  /** The selected tower's panel data, or null. */
  selected: signal<SelectedTowerView | null>(null),
  /** Every standing tower's tile center in game pixels, so the tower panel can avoid them (T126). */
  towerPoints: signal<readonly { readonly x: number; readonly y: number }[]>([]),
  /**
   * What the keyboard tile cursor is on (T126), for the HUD's aria-live announcement ("Pad,
   * column 4, row 2, empty. Enter builds Rivet."), or null while the cursor is hidden.
   */
  cursor: signal<string | null>(null),
  /** Whether the keyboard tile cursor shows (the aim hint then says Enter fires, T213). */
  cursorShown: signal(false),
  /** The tower armed for building (a build slot), or null. */
  armedTower: signal<string | null>(null),
  /** The commander ability slots, in slot order (bottom-left; empty when none is equipped). */
  abilities: signal<readonly AbilitySlotView[]>([]),
  /** Each ability slot's cooldown, in the same order as `abilities`. */
  abilityCooldowns: signal<readonly AbilityCooldownView[]>([]),
  /** The ability slot being aimed (click a tile to fire), or null. */
  aimingAbility: signal<1 | 2 | null>(null),
  /** The next wave's preview, or null after the last wave has started. */
  nextWave: signal<WavePreview | null>(null),
  /** Refugees the next wave sends walking (an Escort's "+6 walking" chip, D138); 0: no chip. */
  nextWalking: signal(0),
  /** The latest notice, or null. */
  notice: signal<HudNotice | null>(null),
  /**
   * The latest screen-reader announcement of a player action (D059: Hold fire, targeting, a
   * cast), read out by the HUD's polite live region; "" when there's none.
   */
  announce: signal(''),
  /** Whole seconds until the next wave starts on its own, or null when no countdown runs. */
  countdown: signal<number | null>(null),
  /** What calling the next wave now would pay (core-loop §2.4); 0 outside a countdown. */
  callBonus: signal(0),
  /**
   * The briefing scene's id while the briefing is open (it opens as a battle starts; app/
   * dialogue.ts plays it into `dialogue.scene`), or null. Game hotkeys are off while it's open.
   */
  briefing: signal<string | null>(null),
  /** The map's threat intel, for the briefing (T202d); null outside a battle. */
  intel: signal<ThreatIntelView | null>(null),
  /** The map's medals with this run's progress and what the save already holds (T202d). */
  medals: signal<readonly MedalView[]>([]),
  /** The latest leak, for the meter's edge flash, or null. */
  leak: signal<LeakFlash | null>(null),
  /** The "WAVE n" banner while it shows, or null. */
  waveBanner: signal<WaveBanner | null>(null),
  /** Whether a tower has been built this battle (onboarding pulses stop after the first). */
  built: signal(false),
  /** The next wave comes in its own time (`noCall`: the Quiet Wave, D097; A2M5's W6, D138): Call is hidden. */
  nextNoCall: signal(false),
  /** Whether the call-wave button pulses: nothing alive and time to spare, or a setup with a tower. */
  callPulse: signal(false),
  /** Changes when a countdown starts, so a ready ability slot pulses. */
  countdownCue: signal(0),
  /**
   * The upgrade teach (D028): from W2's countdown until the first upgrade, while a tower stands,
   * built towers pulse and the HUD says how to upgrade.
   */
  upgradeHint: signal(false),
  /** Hold Fire (all) is on (`state.holdFireAll`): the HUD's master switch (core-loop §2.7). */
  holdFireAll: signal(false),
  /** Towers holding fire right now, one by one or through the master switch. */
  holdingCount: signal(0),
  /**
   * The Hold Fire teach (core-loop §2.7, A1M3): a neutral unit (Gerald) is on the field and the
   * master switch hasn't been used this run, so Hold (all) pulses and a hint says why.
   */
  holdFireTeach: signal(false),
  /**
   * The Hold Fire teach's second lesson (A1M3, R4): on Gerald's second pass and later, until a
   * single turret has held fire this run, the hint names both keys (H one, Shift+H all).
   */
  holdFireOneHint: signal(false),
  /**
   * The salvage teach (A1M3, R4): from W2's countdown on a map with wreckage, until the salvage
   * drone is first sent this run, a hint says how (click a wreck with nothing armed).
   */
  salvageHint: signal(false),
  /**
   * The Time Dilation teach (A1M3, D098): the ability slot (1 or 2) that pulses, with a hint, once
   * a flock first comes within a turret's reach, until Time Dilation is first cast this run; 0
   * while it doesn't show.
   */
  timeDilationTeach: signal<0 | 1 | 2>(0),
  /** Clearance Sale while it has charges (the "SALE -40% x3" tag over the build slots), or null. */
  sale: signal<SaleView | null>(null),
  /** The HUD's name plate (core-loop §5): "JPT-1 · SPROUT", the profile's callsign. */
  callsign: signal('Sprout'),
  /** The map's optional objectives with this run's standing (under the medal tracker). */
  objectives: signal<readonly ObjectiveView[]>([]),
  /** Spare runners (all) is on (`state.spareRunnersAll`). */
  spareRunnersAll: signal(false),
  /** The spare-runners controls show (unlocked after A1M5, or by `devUnlocks`; Alt+H works). */
  spareRunnersOpen: signal(false),
  /**
   * The Spare runners teach (T431, A2M1): from the first wave that sends runners, until the filter
   * is first used this run or two waves have started, Spare (all) pulses and a hint names Alt+H.
   */
  spareRunnersTeach: signal(false),
  /** Bricks's name tag, while a turret carries it (app/dialogue.ts steps `tagStep`), or null. */
  nameTag: signal<NameTagView | null>(null),
  /** The latest checkpoint taken this attempt (a small cue under the wave panel), or null. */
  checkpoint: signal<CheckpointCue | null>(null),
};
