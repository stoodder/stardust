// A locked choice's press rule (D141, D143 R1: C3 and the questions in its scene). The options take
// no press until the lock passes (`lockedUntil`, app/dialogue.ts STORY_CHOICE_LOCK_MS), and after
// that only from a fresh down: a key-down or pointer-down that began once the lock had passed and
// isn't a key's auto-repeat. Enter mashed or held through the briefing, or a click already on its
// way, can't answer. The same rule as the SEAL's (app/forcedInput.ts `pressAccepted`).

/**
 * Whether a press on a locked choice's option counts: from a down at `downAt` (null: a click with
 * no down behind it, as a screen reader's) at `now`, with the lock passing at `until` (0: no lock).
 */
export function choicePressAccepted(p: {
  readonly until: number;
  readonly downAt: number | null;
  readonly now: number;
  readonly repeat?: boolean;
}): boolean {
  if (p.until <= 0) return true;
  if (p.repeat === true) return false;
  return p.downAt === null ? p.now >= p.until : p.downAt >= p.until;
}

/** The keys that press a focused option (Enter on its down, Space on its up). */
export function isPressKey(code: string): boolean {
  return code === 'Enter' || code === 'NumpadEnter' || code === 'Space';
}
