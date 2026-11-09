// View models for the full-screen menus (Title, Campaign, Base, Settings, Results). The router
// (app/router.ts) and the save session (app/save.ts) write them; the screens read them and act
// through app/navigation.ts and app/save.ts.
import { signal } from '@preact/signals';
import type { RunOutcome } from '../../app/testHookTypes.ts';
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
  /**
   * Pests Processed: this run's `stats.skitterkinKilled`. The lifetime counter (design/core-loop.md
   * §6.2) arrives with run-end rewards (T204c).
   */
  readonly pestsProcessed: number;
  /**
   * The card's spoken lines, in order (D028): the first leak's radio line if it was still fresh
   * when the map ended, then the map's debrief for this outcome. Empty for a map with no radio.
   */
  readonly debrief: readonly SpokenLine[];
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
export interface CampaignView {
  /** 1–3, or null for the dev hook's in-memory scratch slot (`?test=1&save=`). */
  readonly slot: 1 | 2 | 3 | null;
  readonly stardust: number;
  readonly intel: number;
  readonly pestsProcessed: number;
  readonly difficulty: Difficulty;
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
