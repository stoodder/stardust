// Pieces every scene staging shares (the briefing, the bottom panel, full-screen): the Next control
// (a click or Enter finishes the typing, then moves on), the choice buttons (keyboard first: the
// first option takes the focus, the arrows move between them), the Tab trap a modal keeps, and the
// line announcer screen readers hear each line from.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { advancesItself, chooseOption, nextScene } from '../../app/dialogue.ts';
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

/**
 * A choice's options as buttons (role group, "Your answer"). The first takes the focus; Up and
 * Down move between them; Enter, Space, or a click picks one.
 */
/** Up and Down move the focus between a choice's options (wrapping). */
function moveChoiceFocus(e: KeyboardEvent & { currentTarget: HTMLElement }): void {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
  const i = items.findIndex((b) => b === document.activeElement);
  const step = e.key === 'ArrowDown' ? 1 : -1;
  const next = items[(i + step + items.length) % items.length];
  e.preventDefault();
  e.stopPropagation();
  next?.focus();
}

/**
 * Whether a locked story choice (C3, D141: `ChoiceView.lockedUntil`) still waits; it re-renders
 * as the lock passes. The press itself is refused until then by app/dialogue.ts `chooseOption`.
 */
function useChoiceLock(choices: readonly ChoiceView[]): boolean {
  const until = choices[0]?.lockedUntil ?? 0;
  const [locked, setLocked] = useState(() => performance.now() < until);
  useEffect(() => {
    const left = until - performance.now();
    setLocked(left > 0);
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLocked(false), left);
    return () => clearTimeout(t);
  }, [until]);
  return locked;
}

export function ChoiceList({ choices }: { choices: readonly ChoiceView[] }) {
  const first = useFocusOn(choices);
  const locked = useChoiceLock(choices);
  return (
    <div class="dlg-choices" role="group" aria-label="Your answer" onKeyDown={moveChoiceFocus}>
      {choices.map((c, i) => (
        <button
          key={i}
          ref={i === 0 ? first : null}
          type="button"
          class="hud-btn chamfer dlg-choice"
          data-tone={c.tone}
          aria-disabled={locked ? 'true' : undefined}
          onClick={() => chooseOption(i)}
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
