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
  /** One line on what it does, for its tooltip. */
  readonly description: string;
}

/** An ability slot's cooldown as shown: 0 seconds left means ready. */
export interface AbilityCooldownView {
  /** Whole seconds until ready, rounded up. */
  readonly secondsLeft: number;
  /** The share still recharging (0–1, in 1/16 steps): the height of the icon's dark wipe. */
  readonly remaining: number;
}

/** The selected tower, for its upgrade / sell / targeting panel. */
export interface SelectedTowerView {
  readonly uid: number;
  readonly label: string;
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
  /** The current tier's stats, e.g. "8 dmg · 2/s · range 3". */
  readonly stats: string;
  /** What the next upgrade adds, e.g. "+3 dmg", or null at the top tier. */
  readonly upgradeDelta: string | null;
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

/** A short HUD message (a rejected command, a locked slot). `id` changes with every notice. */
export interface HudNotice {
  readonly id: number;
  readonly text: string;
}

/** A radio line on screen (D026's M1 radio ticker). `id` changes with every line. */
export interface RadioView {
  readonly id: number;
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
};
