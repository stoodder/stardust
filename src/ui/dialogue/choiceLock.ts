// A locked choice's press rule (D141, D143 R1, D144 S4: C3 and the questions in its scene). The
// options take no press until the lock passes (`lockedUntil`, app/dialogue.ts
// STORY_CHOICE_LOCK_MS), and the lock debounces: any key-down or pointer-down while it holds
// restarts its window (`restartChoiceLock`), so Next spammed through the lines before it, or Enter
// mashed, keeps it shut for as long as it goes on. After that, only a fresh down answers: a
// key-down or pointer-down that began once the lock had passed and isn't a key's auto-repeat; for
// a mouse, one that moved over the option since it appeared (`pointerMoved`: the option slid in
// under a cursor that was clicking Next isn't a pick); for a touch, one that doesn't land where the
// tap that brought the choice on did (`tapOnReveal`: Next tapped steadily on one spot isn't a pick
// either). The SEAL's rule is app/forcedInput.ts `pressAccepted`'s.

/**
 * Whether a press on a locked choice's option counts: from a down at `downAt` (null: a click with
 * no down behind it, as a screen reader's) at `now`, with the lock passing at `until` (0: no lock).
 * A mouse's down (`pointer`) also needs a move over the option since it appeared (`moved`), and a
 * touch's is refused where the choice's revealing tap landed (`onReveal`, `tapOnReveal`).
 */
export function choicePressAccepted(p: {
  readonly until: number;
  readonly downAt: number | null;
  readonly now: number;
  readonly repeat?: boolean;
  readonly pointer?: boolean;
  readonly moved?: boolean;
  readonly onReveal?: boolean;
}): boolean {
  if (p.until <= 0) return true;
  if (p.repeat === true || p.onReveal === true) return false;
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

/**
 * The option a number key names (`Digit1`/`Numpad1` → 0 … 9 → 8), the number on its badge; null for
 * any other key (M8 r1, D156: a locked choice answers 1 and 2 as well as the arrows and Enter).
 */
export function optionKey(code: string): number | null {
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(code);
  return m === null ? null : Number(m[1]) - 1;
}

/**
 * The one-line keyboard hint under a locked choice of `n` options (D156): the badges' numbers
 * answer, as do the arrows and Enter. In words: Silkscreen has no arrow glyphs.
 */
export function choiceKeysHint(n: number): string {
  const keys = Array.from({ length: n }, (_, i) => String(i + 1));
  const nums =
    keys.length <= 1 ? keys.join('') : `${keys.slice(0, -1).join(', ')} or ${keys.at(-1)}`;
  return `Keys: ${nums}, or arrows and Enter`;
}

/** A pointer's position in client px. */
export interface PointerAt {
  readonly x: number;
  readonly y: number;
}

/**
 * Whether a pointermove over an option is the mouse's own: it reports movement, or it's somewhere
 * other than `last`, the mouse's last position seen on the page (some engines report a real move
 * with no movement). The move a browser sends as an option slides in under a still cursor has
 * neither (null `last`: none seen yet, so only movement counts).
 */
export function pointerMoved(
  e: {
    readonly clientX: number;
    readonly clientY: number;
    readonly movementX: number;
    readonly movementY: number;
  },
  last: PointerAt | null,
): boolean {
  if (e.movementX !== 0 || e.movementY !== 0) return true;
  return last !== null && (last.x !== e.clientX || last.y !== e.clientY);
}

/** How near (client px, either axis) a touch must land to the revealing tap to count as its spot. */
export const TAP_SLOP_PX = 16;

/**
 * Whether a touch landing at `at` is on the spot of `reveal`, the tap that advanced the dialogue
 * onto a locked choice (null: the choice came on by itself, or a touch has landed elsewhere since).
 * Such a touch is refused on an option (a player tapping Next steadily, the option slid in under
 * the finger), and one landing elsewhere clears `reveal` for good (`nextRevealTap`).
 */
export function tapOnReveal(at: PointerAt, reveal: PointerAt | null): boolean {
  return (
    reveal !== null &&
    Math.abs(at.x - reveal.x) <= TAP_SLOP_PX &&
    Math.abs(at.y - reveal.y) <= TAP_SLOP_PX
  );
}

/** The revealing tap after a touch lands at `at`: kept if it landed on its spot, else cleared. */
export function nextRevealTap(at: PointerAt, reveal: PointerAt | null): PointerAt | null {
  return tapOnReveal(at, reveal) ? reveal : null;
}
