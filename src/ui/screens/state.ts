// View models for the full-screen menus (Title, Campaign, Base, Settings, Results). The router
// (app/router.ts) and the save session (app/save.ts) write them; the screens read them and act
// through app/navigation.ts and app/save.ts.
import { signal } from '@preact/signals';
import type { RunOutcome } from '../../app/testHookTypes.ts';
import type { ArrivalReason, CallsignId, PronounId } from '../../content/dialogue/profile.ts';
import type { SpokenLine } from '../state.ts';

/** A finished run, as the results screen shows it (built by app/runResult.ts at run end). */
export interface RunResult {
  readonly mapId: string;
  readonly outcome: RunOutcome;
  /** Waves resolved this run (all of them on a win). */
  readonly wavesSurvived: number;
  readonly waveCount: number;
  /** Core integrity left, and the map's starting integrity. */
  readonly integrity: number;
  readonly maxIntegrity: number;
  /** Pests Processed: this run's `stats.skitterkinKilled`. */
  readonly pestsProcessed: number;
  /**
   * The card's spoken lines, in order (D028): the first leak's radio line if it was still fresh
   * when the map ended, then the map's debrief for this outcome. Empty for a map with no radio.
   */
  readonly debrief: readonly SpokenLine[];
  /**
   * Story stamps on the card (core-loop.md § 6.2; A1M5's "CONTAINMENT LAPSE"), as stamped, from
   * the run that just ended (content/dialogue/resultsFlow.ts). Story-only: they never pay.
   */
  readonly stamps: readonly string[];
  /** What the run paid into the save in play (meta run end); null outside a campaign (`?map=`). */
  readonly rewards: RunRewards | null;
}

/** One of the map's medals on the results card. */
export interface MedalResult {
  readonly id: string;
  /** "Victory", "Perfect Core", or the Challenge's name. */
  readonly name: string;
  /** Earned this run. */
  readonly earned: boolean;
  /** Earned this run for the first time (it paid Intel). */
  readonly isNew: boolean;
  /** The Intel it paid this run (0 unless new). */
  readonly intel: number;
}

/** One of the map's optional objectives on the results card (core-loop.md § 2.13). */
export interface ObjectiveResult {
  readonly id: string;
  /** Its name ("Clean Audit"). */
  readonly name: string;
  /** Done this run (else it failed, or was still open when the map was lost). */
  readonly done: boolean;
  /** Done this run for the first time on a win (it paid Intel). */
  readonly isNew: boolean;
  /** The Intel it paid this run (0 unless new). */
  readonly intel: number;
}

/** How the run's Stardust was earned (meta/rewards.ts StardustSource). */
export type StardustSourceView = 'first_clear' | 'replay' | 'defeat' | 'defeat_replay';

/** A run's rewards (meta-runtime.md § Run end), as the results card shows them. */
export interface RunRewards {
  /** The map's medals in display order (Victory, Perfect Core, Challenge). */
  readonly medals: readonly MedalResult[];
  readonly stardust: {
    readonly source: StardustSourceView;
    readonly amount: number;
    /** The map's first-clear value. */
    readonly base: number;
    readonly wavesResolved: number;
    readonly waveCount: number;
  };
  /** The map's optional objectives in map order, with this run's standing (none on most maps). */
  readonly objectives: readonly ObjectiveResult[];
  /** Intel paid: one per newly earned medal, plus new objectives' Intel. */
  readonly intel: number;
  /** The lifetime Pests Processed after this run (design/core-loop.md § 6.2). */
  readonly lifetimePests: number;
  /**
   * Where the Stardust goes while it can't be spent yet ("Banked for Zibzab's shop. Opens after
   * Shift 3 (coming soon)."), under the payroll's Stardust line on the first payday only (T235);
   * null on every other run.
   */
  readonly stardustNote: string | null;
  /**
   * The run paid the save's first Stardust, before the shop opens (T235): the payroll tags its
   * Stardust line "FIRST PAYDAY!".
   */
  readonly firstPayday: boolean;
  /** Display names of the towers this win issued for the next map (the Sprinkler after A1M1). */
  readonly issued: readonly string[];
  /**
   * The save slot write failed (null when it held): the run counts for this session only, and this
   * message says so in Records' voice.
   */
  readonly saveNotice: string | null;
}

/** The last finished run, or null before any run has ended. */
export const runResult = signal<RunResult | null>(null);

/** A Shift board row (meta/progress.ts ShiftEntry, as the Campaign screen shows it). */
export interface ShiftView {
  readonly id: string;
  readonly name: string;
  readonly index: number;
  readonly state: 'won' | 'open' | 'locked' | 'coming_soon';
  /** Medals earned, of the map's 3. */
  readonly medals: number;
}

/** A between-map system's pane: open, or locked with what opens it. */
export interface SystemView {
  readonly unlocked: boolean;
  /** "Opens after Orientation Day". */
  readonly hint: string;
}

export type Difficulty = 'standard' | 'story';

/** The campaign that's being played: its slot, banks, Shift board, and which systems are open. */
/** The player's file (SaveData.profile and the `arrival_reason` flag), for the menus. */
export interface ProfileView {
  readonly name: string;
  readonly pronouns: PronounId;
  readonly callsign: CallsignId;
  /** The intake's reason for joining (the flag), or null if the save has none. */
  readonly arrival: ArrivalReason | null;
}

export interface CampaignView {
  /** 1–3, or null for the dev hook's in-memory scratch slot (`?test=1&save=`). */
  readonly slot: 1 | 2 | 3 | null;
  readonly stardust: number;
  readonly intel: number;
  readonly pestsProcessed: number;
  readonly difficulty: Difficulty;
  /** The player's file from the intake (T306), or null until it's filled in. */
  readonly profile: ProfileView | null;
  readonly board: readonly ShiftView[];
  readonly systems: {
    readonly base: SystemView;
    readonly rnd: SystemView;
    readonly shop: SystemView;
    readonly engineering: SystemView;
  };
}

/** One save slot as the Title's lists show it. */
export type SlotView =
  | { readonly slot: 1 | 2 | 3; readonly status: 'empty' }
  | {
      readonly slot: 1 | 2 | 3;
      readonly status: 'ok';
      /** "Shift 2 · Hatching Season": the next map to play. */
      readonly progress: string;
      readonly mapsWon: number;
      readonly stardust: number;
      readonly intel: number;
      /** Epoch ms of the last write. */
      readonly savedAt: number;
      /** The main save was unreadable and its backup loaded. */
      readonly fromBackup: boolean;
    }
  | {
      readonly slot: 1 | 2 | 3;
      readonly status: 'unreadable';
      /** The stored text, for "Copy raw data" (never silently wiped). */
      readonly raw: string;
    };

/** The campaign in play, or null on the Title (no save loaded). */
export const campaign = signal<CampaignView | null>(null);

/** The three save slots, refreshed whenever one changes. */
export const slots = signal<readonly SlotView[]>([]);

/**
 * A notice for the menus (the Shift board, the loadout screen): set when a battle couldn't start
 * (its config failed, say a save the sim refuses) and the menu stayed up; null otherwise. The
 * router clears it whenever a battle opens.
 */
export const menuNotice = signal<string | null>(null);
