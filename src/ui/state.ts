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
  /** Tier-1 build cost. */
  readonly cost: number;
  /** The wave whose countdown unlocks it, if the map holds it back (`towerUnlockWave`). */
  readonly unlockWave: number | null;
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
  /** What aiming it picks: a spot on the map (a strike) or a stretch of path (a segment). */
  readonly aim: 'area' | 'path';
  /**
   * The companion is `absent` (A3M4, core-loop §3.1): the slot shows, dark and disabled, with no
   * label; its ability can't be used.
   */
  readonly absent: boolean;
}

/** An ability slot's cooldown as shown: 0 seconds left means ready. */
export interface AbilityCooldownView {
  /** Whole seconds until ready, rounded up. */
  readonly secondsLeft: number;
  /** The share still recharging (0–1, in 1/16 steps): the height of the icon's dark wipe. */
  readonly remaining: number;
}

/** One tier-4 specialization the tower panel offers at tier 3 (T202d). */
export interface SpecOptionView {
  readonly choice: 'a' | 'b';
  /** The spec's name ("Rivet Storm"). */
  readonly name: string;
  /** Its price after modifiers (`costFor(..., true)`). */
  readonly cost: number;
  /** A short description from its stats, e.g. "9 dmg · 7.5/s · 1 s spin-up". */
  readonly description: string;
  /** The description wrapped to the panel's width. */
  readonly descLines: readonly string[];
}

/** The tower panel's tier-4 choice (T202d): both specs, or both locked with what unlocks them. */
export interface SpecChoiceView {
  /** The pair isn't unlocked for this run (`SimConfig.specsUnlocked`). */
  readonly locked: boolean;
  /** What unlocks them, wrapped to the panel's width ("Engineering unlocks after Shift 4"). */
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
  /** The next tier's cost, or null at the top tier. */
  readonly upgradeCost: number | null;
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
  /** What the next upgrade adds, e.g. "+3 dmg", or null at the top tier. */
  readonly upgradeDelta: string | null;
  /** "Next: …" wrapped to the panel's width (empty at the top tier). */
  readonly deltaLines: readonly string[];
  /** The tier-4 choice while the tower is at tier 3 and its type has specs; else null. */
  readonly specs: SpecChoiceView | null;
  /** The share a sell returns after the grace (70%, or more with Resale Value), in percent. */
  readonly refundPct: number;
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
  /** The enemy has the `fast` tell (art-direction §8): the preview shows a » chip. */
  readonly fast: boolean;
}

/** The next wave: its number and what it brings. */
export interface WavePreview {
  readonly number: number;
  readonly groups: readonly WavePreviewGroup[];
}

/** One line of a map's static briefing (M1), with its speaker if it names one. */
export interface BriefingLine {
  readonly speaker: string | null;
  readonly text: string;
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
}

/** A spoken line with its speaker's name plate (the radio ticker, the results card's debrief). */
export interface SpokenLine {
  /** The speaker's name plate. */
  readonly name: string;
  /** The name plate's color. */
  readonly color: ColorName;
  readonly text: string;
}

/** A radio line on screen (D026's M1 radio ticker). `id` changes with every line. */
export interface RadioView extends SpokenLine {
  readonly id: number;
  /** The line this one replies to, kept up above it (D028), or null. */
  readonly cue: SpokenLine | null;
}

/** A leak at the core, for the meter's flash. `id` changes with every leak. */
export interface LeakFlash {
  readonly id: number;
  /** Integrity lost. */
  readonly amount: number;
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
  /** The latest notice, or null. */
  notice: signal<HudNotice | null>(null),
  /** Whole seconds until the next wave starts on its own, or null when no countdown runs. */
  countdown: signal<number | null>(null),
  /** What calling the next wave now would pay (core-loop §2.4); 0 outside a countdown. */
  callBonus: signal(0),
  /**
   * The map's static briefing while it's open (M1; it opens as a battle starts), or null. Game
   * hotkeys are off while it's open.
   */
  briefing: signal<readonly BriefingLine[] | null>(null),
  /** The map's threat intel, for the briefing (T202d); null outside a battle. */
  intel: signal<ThreatIntelView | null>(null),
  /** The map's medals with this run's progress and what the save already holds (T202d). */
  medals: signal<readonly MedalView[]>([]),
  /** The radio line on screen, or null (app/radio.ts). */
  radio: signal<RadioView | null>(null),
  /** The latest leak, for the meter's edge flash, or null. */
  leak: signal<LeakFlash | null>(null),
  /** The "WAVE n" banner while it shows, or null. */
  waveBanner: signal<WaveBanner | null>(null),
  /** Whether a tower has been built this battle (onboarding pulses stop after the first). */
  built: signal(false),
  /** Whether the call-wave button pulses: nothing alive and time to spare, or a setup with a tower. */
  callPulse: signal(false),
  /** Changes when a countdown starts, so a ready ability slot pulses. */
  countdownCue: signal(0),
  /**
   * The upgrade teach (D028): from W2's countdown until the first upgrade, while a tower stands,
   * built towers pulse and the HUD says how to upgrade.
   */
  upgradeHint: signal(false),
};
