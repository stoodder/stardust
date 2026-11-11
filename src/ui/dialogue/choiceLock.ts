// A locked choice's press rule (D141, D143 R1, D144 S4: C3 and the questions in its scene). The
// options take no press until the lock passes (`lockedUntil`, app/dialogue.ts
// STORY_CHOICE_LOCK_MS), and the lock debounces: any key-down or pointer-down while it holds
// restarts its window (`restartChoiceLock`), so Next spammed through the lines before it, or Enter
// mashed, keeps it shut for as long as it goes on. After that, only a fresh down answers: a
// key-down or pointer-down that began once the lock had passed and isn't a key's auto-repeat, and
// for a pointer, one that moved over the option since it appeared (the option slid in under a
// cursor that was clicking Next isn't a pick). The SEAL's rule is app/forcedInput.ts
// `pressAccepted`'s.

/**
 * Whether a press on a locked choice's option counts: from a down at `downAt` (null: a click with
 * no down behind it, as a screen reader's) at `now`, with the lock passing at `until` (0: no lock).
 * A pointer's down (`pointer`) also needs a move over the option since it appeared (`moved`).
 */
export function choicePressAccepted(p: {
  readonly until: number;
  readonly downAt: number | null;
  readonly now: number;
  readonly repeat?: boolean;
  readonly pointer?: boolean;
  readonly moved?: boolean;
}): boolean {
  if (p.until <= 0) return true;
  if (p.repeat === true) return false;
  if (p.pointer === true && p.moved !== true) return false;
  return p.downAt === null ? p.now >= p.until : p.downAt >= p.until;
}

/**
 * Where a locked choice's lock ends after a down at `now`: a down while it holds (`now < until`)
 * restarts it for `windowMs`; one after it changes nothing. An open choice (0) stays open.
 */
export function restartChoiceLock(until: number, now: number, windowMs: number): number {
  return until > 0 && now < until ? now + windowMs : until;
}

/** The keys that press a focused option (Enter on its down, Space on its up). */
export function isPressKey(code: string): boolean {
  return code === 'Enter' || code === 'NumpadEnter' || code === 'Space';
}
