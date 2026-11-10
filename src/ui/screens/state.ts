// View models for the full-screen menus (Title, Campaign, Base, Settings, Results). The router
// (app/router.ts) and the save session (app/save.ts) write them; the screens read them and act
// through app/navigation.ts and app/save.ts.
import { signal } from '@preact/signals';
import type { RunOutcome } from '../../app/testHookTypes.ts';
import type { CampaignMapId } from '../../content/campaign.ts';
import type { ArrivalReason, CallsignId, PronounId } from '../../content/dialogue/profile.ts';
import type { StoryAct } from '../../content/dialogue/types.ts';
import type { CounterStyle } from '../../content/presentation.ts';
import type { SpokenLine } from '../state.ts';

/** A finished run, as the results screen shows it (built by app/runResult.ts at run end). */
export interface RunResult {
  readonly mapId: string;
  readonly outcome: RunOutcome;
  /**
   * The map's results counter style and UI act theme (its presentation dials, core-loop.md
   * § 6.7): Act I's starred brag and "Exemplary!", Act II's plain line (story/counter.ts).
   */
  readonly counter: CounterStyle;
  readonly theme: StoryAct;
  /** Waves resolved this run (all of them on a win). */
  readonly wavesSurvived: number;
  readonly waveCount: number;
  /** Core integrity left, and the map's starting integrity. */
  readonly integrity: number;
  readonly maxIntegrity: number;
  /** A Protect map's asset as the run left it ("Rigs 7 / 10"; T305a), or null on other maps. */
  readonly asset: RunAsset | null;
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
  /**
   * The checkpoint wave this run resumed from (core-loop.md § 2.12), or null for a run from wave
   * 1: a win's card says Perfect Core and the Challenge needed a run from the start.
   */
  readonly resumedFromWave: number | null;
  /** A loss's latest checkpoint wave: the card offers "Retry from wave N". Null: none. */
  readonly retryFromWave: number | null;
  /**
   * The run's Escort meter as it ended (the map was an Escort at the end: from the start, or
   * after a pivot; T305c), or null on other runs. Results lists it in Core integrity's place
   * (app/runResult.ts `resultsStats`), and a `meter` counter shows its line.
   */
  readonly escort: RunEscort | null;
  /**
   * The debrief's story choice the card offers (C2 on A2M4's first win; app/resultsFlow.ts), or
   * null. While it waits (`picked` null) the card's way on is the choice.
   */
  readonly choice: ResultsChoice | null;
}

/** An Escort's meter at the run's end ("Evacuated 9 / 12"). */
export interface RunEscort {
  /** The meter's kind and label ("Evacuated", "Sheltered"; the map's `meterLabel`). */
  readonly kind: 'evacuated' | 'sheltered';
  readonly label: string;
  readonly evacuated: number;
  /** The map's refugees (`escort.total`). */
  readonly total: number;
  /** Refugees lost (`stats.refugeesLost`): the row's " · lost N". */
  readonly lost: number;
}

/** A debrief's story choice on the card (C2: Zibzab's Price). */
export interface ResultsChoice {
  /** Who makes the offer, for the group's name ("Zibzab's offer"). */
  readonly by: string;
  /** Price first: the stake, the whole Stardust bank. */
  readonly bank: number;
  /** The options' text, as the debrief writes them (never previewing the payoff). */
  readonly options: readonly string[];
  /** The option taken, or null while the card waits. */
  readonly picked: number | null;
}

/** A story transaction as the card shows it (meta/storyTransactions.ts `StoryTransaction`). */
export type ResultsTransaction =
  | { readonly kind: 'q3_bonus'; readonly stardust: number }
  /** A tower the story gave (A2M5's Prism Spire), by its display name. */
  | { readonly kind: 'gift'; readonly tower: string }
  /** C2 as resolved: the bank it took, the Intel windfall, and the Zibzab Tune-up's name and line. */
  | {
      readonly kind: 'c2';
      readonly choice: 'sold' | 'returned' | 'none';
      readonly bank: number;
      readonly intel: number;
      readonly tuneUp: { readonly name: string; readonly line: string } | null;
    };

/** A memo that arrives on the results card (A2M4's Q3 Bonus memo): its id and subject. */
export interface ResultsMemo {
  readonly id: string;
  readonly subject: string;
}

/** A Protect map's asset meter at the run's end: its name, what's left, and its full value. */
export interface RunAsset {
  readonly name: string;
  readonly value: number;
  readonly max: number;
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
    /** The checkpoint wave a defeat's stipend counts from (`wavesResolved` from it on), or null. */
    readonly fromWave: number | null;
  };
  /** The map's optional objectives in map order, with this run's standing (none on most maps). */
  readonly objectives: readonly ObjectiveResult[];
  /** Intel paid: one per newly earned medal, plus new objectives' Intel. */
  readonly intel: number;
  /** The lifetime Pests Processed after this run (design/core-loop.md § 6.2). */
  readonly lifetimePests: number;
  /**
   * Where the Stardust goes while it can't be spent yet ("Banked for Zibzab's shop. Opens after
   * Special Delivery."), under the payroll's Stardust line on the first payday only (T235);
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
  /**
   * The story transactions this run made (run end's step 6: the Q3 Bonus, a gift), then the
   * debrief's choice once taken (C2), in order. Empty on most runs.
   */
  readonly transactions: readonly ResultsTransaction[];
  /** Memos that arrive on the card itself (the Q3 Bonus's), in delivery order. Usually none. */
  readonly memos: readonly ResultsMemo[];
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
  /** The board's last row: the map after Act I, unnamed, dimmed and padlocked (D097 R6, D102). */
  readonly teaser: boolean;
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
  /**
   * Which campaign screen the save is on: the Shift board through Act I, the star map (the Sector
   * map) once A1M5 is won (D102; meta/progress.ts `onStarMap`).
   */
  readonly mode: 'shiftBoard' | 'starMap';
  /** 1–3, or null for the dev hook's in-memory scratch slot (`?test=1&save=`). */
  readonly slot: 1 | 2 | 3 | null;
  /**
   * The next map to play (meta/progress.ts `frontierOf`; null once the finale is won): the menus'
   * presentation dials between maps (the UI act theme; story/presentation.ts).
   */
  readonly frontier: CampaignMapId | null;
  readonly stardust: number;
  readonly intel: number;
  readonly pestsProcessed: number;
  readonly difficulty: Difficulty;
  /** The player's file from the intake (T306), or null until it's filled in. */
  readonly profile: ProfileView | null;
  readonly board: readonly ShiftView[];
  /**
   * The Pest Bounty Board's base tab (core-loop.md § 6.6): shown from A1M2 won through Act II, and
   * Kip's row on assignment from A2M4 (ui/screens/bountyBoard.ts).
   */
  readonly bountyBoard: { readonly shown: boolean; readonly kipAway: boolean };
  readonly systems: {
    readonly base: SystemView;
    readonly rnd: SystemView;
    readonly shop: SystemView;
    readonly engineering: SystemView;
    /** Ves'thara's Xenotech (after A2M5); its tab is hidden until it opens. */
    readonly xenotech: SystemView;
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
      /** Its next map to play (null once the finale is won): the Title's loading tip reads it. */
      readonly frontier: CampaignMapId | null;
    }
  | {
      readonly slot: 1 | 2 | 3;
      readonly status: 'unreadable';
      /** The stored text, for "Copy raw data" (never silently wiped). */
      readonly raw: string;
    };

/** The campaign in play, or null on the Title (no save loaded). */
export const campaign = signal<CampaignView | null>(null);

/**
 * The node the star map last showed its marker on, in this save's session (UI memory, not saved):
 * the marker walks from it to a newly won node (ui/screens/StarMap.tsx). app/save.ts forgets it
 * whenever the save in play changes (T461), so a walk never starts from another save's node.
 */
let starMapMarker: CampaignMapId | null = null;

/** The star map's remembered marker node (`starMapMarker`), or null. */
export function lastStarMapMarker(): CampaignMapId | null {
  return starMapMarker;
}

/** Remembers the node the star map shows its marker on; null forgets it. */
export function rememberStarMapMarker(id: CampaignMapId | null): void {
  starMapMarker = id;
}

/** The three save slots, refreshed whenever one changes. */
export const slots = signal<readonly SlotView[]>([]);

/**
 * A notice for the menus (the Shift board, the loadout screen): set when a battle couldn't start
 * (its config failed, say a save the sim refuses) and the menu stayed up; null otherwise. The
 * router clears it whenever a battle opens.
 */
export const menuNotice = signal<string | null>(null);
