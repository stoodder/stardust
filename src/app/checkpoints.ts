// Retry checkpoints (architecture.md § Checkpoints; design/core-loop.md § 2.12). The sim emits
// `CheckpointReached` as the countdown to every 5th wave begins (Act II on); the host records each
// one as `{ wave, tick, commandCount }`. "Retry from wave N" needs no state serialization: a new
// sim from the same config replays the first `commandCount` logged commands headlessly up to
// `tick` (the sim is deterministic), dispatching each tick's events so the app's story state
// (barks, name tags, met enemies, hints) rebuilds itself, with the side effects held back
// (`Host.replaying`). Checkpoints live in memory, for the current run only.
import type { IdSpace, LiveIds } from '../content/types.ts';
import type { CommandLogEntry, Sim } from '../sim/index.ts';

/** A point a lost run can be retried from. */
export interface Checkpoint {
  /**
   * A script checkpoint's label (the finale's `'halls'` at Phase 2's start: "Retry from the
   * Halls"; `CheckpointReached.label`); absent on a wave checkpoint.
   */
  readonly label?: string;
  /** The wave whose countdown it marks ("Retry from wave 5"); a labelled one's last wave started. */
  readonly wave: number;
  /** The tick the retry resumes at: replay steps the sim until `state.tick` reaches it. */
  readonly tick: number;
  /** How many of the run's logged commands came before it (their `tick` is below `tick`). */
  readonly commandCount: number;
}

/**
 * The checkpoint a `CheckpointReached` event marks, from the command log as it stands when the
 * host dispatches it (a frame may have run a few ticks, and logged a few commands, past it).
 */
export function checkpointOf(
  e: { readonly wave: number; readonly tick: number; readonly label?: string | undefined },
  log: readonly { readonly tick: number }[],
): Checkpoint {
  let n = log.length;
  while (n > 0 && log[n - 1]!.tick >= e.tick) n--; // n > 0
  const at = { wave: e.wave, tick: e.tick, commandCount: n };
  return e.label === undefined ? at : { label: e.label, ...at };
}

/** Where each script checkpoint label puts the player, as the retry and the HUD name it. */
const CHECKPOINT_PLACES: Readonly<Record<string, string>> = { halls: 'the Halls' };

/**
 * Where a checkpoint resumes, in words: "the Halls" for the finale's `'halls'` (an unknown label
 * reads as its id), else "wave N". The Results button is "Retry from {place}" (core-loop.md
 * § 2.12); the HUD's cue and the resumed notice read it too.
 */
export function checkpointPlace(c: { readonly label?: string; readonly wave: number }): string {
  if (c.label === undefined) return `wave ${c.wave}`;
  return Object.hasOwn(CHECKPOINT_PLACES, c.label) ? CHECKPOINT_PLACES[c.label]! : c.label; // hasOwn
}

/** The Results button that resumes a lost run from `c`: "Retry from wave 5", "Retry from the Halls". */
export function retryLabel(c: { readonly label?: string; readonly wave: number }): string {
  return `Retry from ${checkpointPlace(c)}`;
}

/**
 * The checkpoint a lost run offers (D134): the latest one taken before the run's final tick
 * (`endTick`, the sim's `state.tick` once it ended), or null. One taken on the very tick the run
 * ended would replay straight into the loss, so an earlier one stands in (W5, not W10).
 */
export function usableCheckpoint(
  checkpoints: readonly Checkpoint[],
  endTick: number,
): Checkpoint | null {
  for (let i = checkpoints.length - 1; i >= 0; i--) {
    const c = checkpoints[i]!; // i < length
    if (c.tick < endTick) return c;
  }
  return null;
}

/** What a resumed battle replays: its checkpoint, and the logged commands that lead to it. */
export interface Resume<K extends IdSpace = LiveIds> {
  readonly checkpoint: Checkpoint;
  /** The run's command log up to the checkpoint (`commandCount` entries). */
  readonly log: readonly CommandLogEntry<K>[];
  /**
   * A reload of the finale's persisted run (`pendingRun`, app/resume.ts), not a lost run's retry:
   * the checkpoint a retry before it resumed from (`Host.resumedFrom`, which forfeits Perfect and
   * the Challenge), or null for a run from wave 1, which goes on as the same run with every medal
   * still to play for. Absent: a retry, resumed from `checkpoint`.
   */
  readonly retriedFrom?: Checkpoint | null;
  /**
   * The run's kills already filed in the save (`Host.killsBefore`): a reload's own, persisted with
   * it (nothing the closed tab played was filed). Absent: a retry, whose lost attempt filed every
   * kill up to the checkpoint (the sim's count there).
   */
  readonly killsBefore?: number;
}

/** The resume for `checkpoint` from a run's command log. */
export function resumeOf<K extends IdSpace>(
  log: readonly CommandLogEntry<K>[],
  checkpoint: Checkpoint,
): Resume<K> {
  return { checkpoint, log: log.slice(0, checkpoint.commandCount) };
}

/**
 * Skitterkin killed in this attempt (Pests Processed): the sim's count less what the attempt that
 * reached a resumed run's checkpoint already filed in the save (core-loop.md § 6.2: every run end counts its
 * kills, so the replayed ones mustn't count twice). 0 while replaying.
 */
export function attemptKills(host: {
  readonly sim: Pick<Sim<IdSpace>, 'state'>;
  readonly replaying: boolean;
  readonly killsBefore: number;
}): number {
  if (host.replaying) return 0;
  return Math.max(0, host.sim.state.stats.skitterkinKilled - host.killsBefore);
}
