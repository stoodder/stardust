// The one keydown listener (architecture.md § UI: DOM overlay, keyboard routing), so the routing
// rule lives in one place:
// - Game hotkeys are ignored while focus is in a text input, textarea, or contenteditable.
// - On a focused button, Space and 1–4 go to the game hotkey (preventDefault, so the button doesn't
//   also activate), unless a modal is open, in which case the modal keeps them.
// - Enter always activates the focused button (never a game hotkey).
// Bindings (design/core-loop.md §4) live in the table below; T106 adds the HUD ones (1–4, U, S, T,
// W, Q) here.
import { cancel, toggleFastSpeed, togglePause } from './commands.ts';

/** A hotkey's action, by `KeyboardEvent.code` (layout-independent). */
const BINDINGS: Readonly<Record<string, () => void>> = {
  Space: togglePause,
  KeyF: toggleFastSpeed,
  Escape: cancel,
};

/** Keys a focused button would act on itself, which the game takes instead (the modal keeps them). */
const BUTTON_PASSTHROUGH = new Set(['Space', 'Digit1', 'Digit2', 'Digit3', 'Digit4']);

export interface KeyRouting {
  /** Whether game hotkeys are live (a battle is on screen). */
  isActive(): boolean;
  /** Whether a modal dialog is open (it keeps Space and 1–4). */
  isModalOpen(): boolean;
}

function isTextEntry(el: Element | null): boolean {
  if (el === null) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    return !['button', 'checkbox', 'radio', 'range', 'reset', 'submit'].includes(el.type);
  }
  return el instanceof HTMLElement && el.isContentEditable;
}

/** Which binding (if any) a key press should run, per the routing rule. */
export function routeKey(
  e: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'repeat'>,
  focused: Element | null,
  modalOpen: boolean,
): (() => void) | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return null;
  if (e.code === 'Enter' || e.code === 'NumpadEnter') return null;
  if (isTextEntry(focused)) return null;
  const onButton = focused instanceof HTMLButtonElement;
  if (onButton && modalOpen && BUTTON_PASSTHROUGH.has(e.code)) return null;
  return BINDINGS[e.code] ?? null;
}

/** Installs the listener. Returns its removal. */
export function installKeys(routing: KeyRouting): () => void {
  const onKeyDown = (e: KeyboardEvent): void => {
    if (!routing.isActive()) return;
    const action = routeKey(e, document.activeElement, routing.isModalOpen());
    if (action === null) return;
    e.preventDefault();
    action();
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
