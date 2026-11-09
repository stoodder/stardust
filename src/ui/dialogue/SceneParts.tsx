// Pieces every scene staging shares (the briefing, the bottom panel, full-screen): the Next control
// (a click or Enter finishes the typing, then moves on), the choice buttons (keyboard first: the
// first option takes the focus, the arrows move between them), and the Tab trap a modal keeps.
import { useEffect, useRef } from 'preact/hooks';
import { advanceScene, chooseOption, closeScene } from '../../app/dialogue.ts';
import { useTypewriter, type Typewriter } from './LineText.tsx';
import type { ChoiceView, SceneView } from './state.ts';

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
  /** Whether Next has anything to do (a line on screen, or a played-out scene still showing). */
  readonly canNext: boolean;
}

/** The typing and the Next action for scene `view`. */
export function useSceneStep(view: SceneView): SceneStep {
  const typed = useTypewriter(view.line, view.instant);
  const canNext = view.line !== null || (view.ended && view.mode !== 'briefing');
  return {
    typed,
    canNext,
    next: () => {
      if (view.line !== null && !typed.done) typed.finish();
      else if (view.line !== null) advanceScene();
      else if (view.ended) closeScene();
    },
  };
}

/**
 * Focuses the element `ref` holds whenever `key` changes (a new line, a choice, the end), and on
 * mount, while `when` holds.
 */
export function useFocusOn(key: unknown, when = true): { current: HTMLButtonElement | null } {
  const ref = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
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

export function ChoiceList({ choices }: { choices: readonly ChoiceView[] }) {
  const first = useFocusOn(choices);
  return (
    <div class="dlg-choices" role="group" aria-label="Your answer" onKeyDown={moveChoiceFocus}>
      {choices.map((c, i) => (
        <button
          key={i}
          ref={i === 0 ? first : null}
          type="button"
          class="hud-btn chamfer dlg-choice"
          data-tone={c.tone}
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
