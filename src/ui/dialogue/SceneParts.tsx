// Pieces every scene staging shares (the briefing, the bottom panel, full-screen): the Next control
// (a click or Enter finishes the typing, then moves on), the choice buttons (keyboard first: the
// first option takes the focus, the arrows move between them; a locked choice's group takes it
// instead, D143 R1), the Tab trap a modal keeps, and the line announcer screen readers hear each
// line from.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import {
  advancesItself,
  chooseOption,
  nextScene,
  STORY_CHOICE_LOCK_MS,
} from '../../app/dialogue.ts';
import { choicePressAccepted, isPressKey, restartChoiceLock } from './choiceLock.ts';
import { useTypewriter, type Typewriter } from './LineText.tsx';
import { plainText } from './text.ts';
import type { ChoiceView, LineView, SceneView } from './state.ts';

/** The focusable controls inside `root`, in tab order. */
function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]')].filter(
    (el) => el.tabIndex >= 0 && !el.hasAttribute('disabled'),
  );
}

/** Keeps Tab (and Shift+Tab) cycling inside a modal's root. */
export function trapTab(e: KeyboardEvent & { currentTarget: HTMLElement }): void {
  if (e.key !== 'Tab') return;
  const items = focusables(e.currentTarget);
  if (items.length === 0) return;
  const active = document.activeElement;
  const i = active instanceof HTMLElement ? items.indexOf(active) : -1;
  const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i + 1) % items.length;
  e.preventDefault();
  items[next]?.focus();
}

export interface SceneStep {
  readonly typed: Typewriter;
  /** Next: finishes the typing, else moves past the line (or closes a played-out scene). */
  readonly next: () => void;
  /**
   * Whether Next shows: a line on screen (but not a full-screen silence, which moves on by itself,
   * D098), or a played-out scene still showing.
   */
  readonly canNext: boolean;
}

/** The typing and the Next action for scene `view` (its clock is the scene's, app/dialogue.ts). */
export function useSceneStep(view: SceneView): SceneStep {
  const typed = useTypewriter(view.line, view.instant, view.typing);
  const canNext =
    (view.line !== null && !advancesItself(view.mode, view.line, view.instant)) ||
    (view.ended && view.mode !== 'briefing');
  return { typed, canNext, next: nextScene };
}

/**
 * Focuses the element `ref` holds whenever `key` changes (a new line, a choice, the end), and on
 * mount, while `when` holds.
 */
export function useFocusOn(key: unknown, when = true): { current: HTMLButtonElement | null } {
  const ref = useRef<HTMLButtonElement | null>(null);
  // A layout effect: the focus is in place as the control appears, so an Enter right away lands.
  useLayoutEffect(() => {
    if (when) ref.current?.focus();
  }, [key, when]);
  return ref;
}

/** The Next button: focused as each line arrives, so Enter (or Space) reads on. */
export function NextButton({ step, lineKey }: { step: SceneStep; lineKey: unknown }) {
  const ref = useFocusOn(lineKey);
  if (!step.canNext) return null;
  return (
    <button ref={ref} type="button" class="hud-btn chamfer dlg-next" onClick={step.next}>
      {step.typed.done ? 'Next' : 'Skip'}
      <span class="dlg-next-mark" aria-hidden="true" />
    </button>
  );
}

/** Up and Down move the focus between a choice's options (wrapping; from the group, to an end). */
function moveChoiceFocus(e: KeyboardEvent & { currentTarget: HTMLElement }): void {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
  const i = items.findIndex((b) => b === document.activeElement);
  const step = e.key === 'ArrowDown' ? 1 : -1;
  const next =
    i < 0 ? items.at(step > 0 ? 0 : -1) : items[(i + step + items.length) % items.length];
  e.preventDefault();
  e.stopPropagation();
  next?.focus();
}

/**
 * A locked choice's lock (C3 and its scene's questions, D141/D143/D144: `ChoiceView.lockedUntil`),
 * debounced: any key-down or pointer-down on the page while it holds restarts its window
 * (`restartChoiceLock`; listened for in the capture phase, so it's counted before the option's own
 * handler reads it). Returns whether it still holds (it re-renders as it passes) and where it ends
 * now. The press is refused until then by app/dialogue.ts `chooseOption` (from the choice's show)
 * and by `choicePressAccepted` (from the last down).
 */
function useChoiceLock(until: number): { locked: boolean; end: { current: number } } {
  const end = useRef(until);
  const [locked, setLocked] = useState(() => performance.now() < until);
  useLayoutEffect(() => {
    end.current = until;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const arm = (): void => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      const left = end.current - performance.now();
      setLocked(left > 0);
      if (left > 0) timer = setTimeout(arm, left);
    };
    arm();
    if (until <= 0) return undefined;
    const onDown = (): void => {
      const now = performance.now();
      const next = restartChoiceLock(end.current, now, STORY_CHOICE_LOCK_MS);
      if (next === end.current) return;
      end.current = next;
      arm();
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onDown, true);
    return () => {
      if (timer !== null) clearTimeout(timer);
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onDown, true);
    };
  }, [until]);
  return { locked, end };
}

/**
 * A choice's options as buttons (role group, "Your answer"); Up and Down move between them; Enter,
 * Space, or a click picks one. An open choice's first option takes the focus. A locked one's
 * group takes it instead (as C2's heading does, ui/screens/StoryChoice.tsx), so Enter mashed
 * through the lines before it lands nowhere; its options wait out the lock (restarted by every
 * down while it holds), then take only a fresh key-down, or a fresh pointer-down on an option the
 * pointer has moved over since it appeared (`choicePressAccepted`; D144 S4).
 */
export function ChoiceList({ choices }: { choices: readonly ChoiceView[] }) {
  const until = choices[0]?.lockedUntil ?? 0;
  const lockedChoice = until > 0;
  const first = useFocusOn(choices, !lockedChoice);
  const group = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (lockedChoice) group.current?.focus();
  }, [choices, lockedChoice]);
  const { locked, end } = useChoiceLock(until);
  // The down behind the next click (pointer or key), and whether Space's down was refused.
  const down = useRef<{ at: number; pointer: boolean } | null>(null);
  const spaceRefused = useRef(false);
  // The options a pointer has moved over since they appeared (by index; reset with each choice).
  const moved = useRef(new Set<number>());
  useLayoutEffect(() => {
    moved.current = new Set();
  }, [choices]);
  const onKeyDown = (e: KeyboardEvent & { currentTarget: HTMLElement }): void => {
    moveChoiceFocus(e);
    if (!lockedChoice || !isPressKey(e.code)) return;
    // On the group itself, Enter and Space do nothing (no game key, no pause, no answer).
    const onOption = e.target instanceof HTMLButtonElement;
    const now = performance.now();
    const fresh = choicePressAccepted({ until: end.current, downAt: now, now, repeat: e.repeat });
    if (!onOption || !fresh) {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Space') spaceRefused.current = true;
      return;
    }
    down.current = { at: now, pointer: false };
    if (e.code === 'Space') spaceRefused.current = false;
  };
  const onKeyUp = (e: KeyboardEvent): void => {
    // Space presses on its up: one whose down was refused doesn't.
    if (lockedChoice && e.code === 'Space' && spaceRefused.current) {
      e.preventDefault();
      spaceRefused.current = false;
    }
  };
  const pick = (i: number): void => {
    const d = down.current;
    down.current = null;
    const ok = choicePressAccepted({
      until: lockedChoice ? end.current : 0,
      downAt: d?.at ?? null,
      now: performance.now(),
      pointer: d?.pointer ?? false,
      moved: moved.current.has(i),
    });
    if (ok) chooseOption(i);
  };
  return (
    <div
      ref={group}
      class="dlg-choices"
      role="group"
      aria-label="Your answer"
      tabIndex={lockedChoice ? -1 : undefined}
      data-testid="choice-group"
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      {choices.map((c, i) => (
        <button
          key={i}
          ref={i === 0 ? first : null}
          type="button"
          class="hud-btn chamfer dlg-choice"
          data-tone={c.tone}
          aria-disabled={locked ? 'true' : undefined}
          onPointerMove={(e) => {
            // A real move (a layout shift under a still cursor has none).
            if (e.movementX !== 0 || e.movementY !== 0) moved.current.add(i);
          }}
          onPointerDown={(e) => {
            // Only a mouse has a cursor an option can slide in under; a tap is a pick by itself.
            down.current = { at: performance.now(), pointer: e.pointerType === 'mouse' };
          }}
          onClick={() => pick(i)}
        >
          <span class="dlg-choice-n" aria-hidden="true">
            {i + 1}
          </span>
          <span class="grow">{c.text}</span>
        </button>
      ))}
    </div>
  );
}

/** What a screen reader hears as a line arrives: "QUILL: Hello!" (a caption reads alone). */
export function lineAnnouncement(line: LineView | null): string {
  if (line === null || line.silence) return '';
  const text = plainText(line.text);
  return line.name === '' ? text : `${line.name}: ${text}`;
}

/**
 * The line on screen for screen readers (U-M1): a polite live region inside the scene's dialog,
 * filled a frame after it mounts and on every new line (a region's first content isn't read),
 * with the speaker and the whole line at once while the typewriter types for the eyes.
 */
export function LineAnnouncer({ line }: { line: LineView | null }) {
  const [said, setSaid] = useState('');
  const id = line?.id ?? -1;
  useEffect(() => {
    setSaid(lineAnnouncement(line));
  }, [id]);
  return (
    <div class="dlg-sr" role="status" aria-live="polite" data-testid="line-announce">
      {said}
    </div>
  );
}
