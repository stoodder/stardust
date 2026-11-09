// The one keydown listener (architecture.md § UI: DOM overlay, keyboard routing), so the routing
// rule lives in one place:
// - Game hotkeys are ignored while focus is in a text input, textarea, or contenteditable.
// - On a focused button, Space and 1–4 go to the game hotkey (preventDefault, so the button doesn't
//   also activate), unless a modal is open, in which case the modal keeps them.
// - Enter activates the focused control. With nothing focused, it acts on the keyboard tile
//   cursor's tile (T126): it never takes Enter from a button.
// - The arrow keys move the tile cursor; on a focused HUD button they first drop the focus, so
//   the next Enter acts on the playfield.
// - Esc closes a blocking modal (the M1 briefing) wherever the focus is, before anything else.
//   In the menus it closes the innermost panel or screen (Settings, a Title panel, the Base;
//   ui/screens/escape.ts), from a text field too.
// - Global keys (M: mute) work on every screen, under the same text-entry and modifier rules.
// Bindings (design/core-loop.md §4) live in the table below. Still to come: H and Shift+H (Hold
// Fire, T206), and Alt+H (spare runners).
import { runEscape } from '../ui/screens/escape.ts';
import {
  callWave,
  cancel,
  cycleTargeting,
  moveCursor,
  pressAbility,
  pressBuildSlot,
  pressCursor,
  sellSelected,
  toggleFastSpeed,
  togglePause,
  upgradeSelected,
} from './commands.ts';
import { toggleMute } from './settings.ts';

/** A hotkey's action, by `KeyboardEvent.code` (layout-independent). */
export const BINDINGS: Readonly<Record<string, () => void>> = {
  Space: togglePause,
  KeyF: toggleFastSpeed,
  Escape: cancel,
  Digit1: () => pressBuildSlot(0),
  Digit2: () => pressBuildSlot(1),
  Digit3: () => pressBuildSlot(2),
  Digit4: () => pressBuildSlot(3),
  Numpad1: () => pressBuildSlot(0),
  Numpad2: () => pressBuildSlot(1),
  Numpad3: () => pressBuildSlot(2),
  Numpad4: () => pressBuildSlot(3),
  KeyU: upgradeSelected,
  KeyS: sellSelected,
  KeyT: cycleTargeting,
  KeyW: callWave,
  KeyQ: () => pressAbility(1),
  KeyE: () => pressAbility(2),
  ArrowUp: () => moveCursor('up'),
  ArrowDown: () => moveCursor('down'),
  ArrowLeft: () => moveCursor('left'),
  ArrowRight: () => moveCursor('right'),
  Enter: pressCursor,
  NumpadEnter: pressCursor,
};

/** The arrow keys (they move the tile cursor). */
const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/** Keys that work on every screen (title, battle, results), not only in a live battle. */
export const GLOBAL_BINDINGS: Readonly<Record<string, () => void>> = {
  KeyM: toggleMute,
};

/** Keys a focused button would act on itself, which the game takes instead (the modal keeps them). */
const BUTTON_PASSTHROUGH = new Set([
  'Space',
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Numpad1',
  'Numpad2',
  'Numpad3',
  'Numpad4',
]);

export interface KeyRouting {
  /** Whether game hotkeys are live (a battle is on screen). */
  isActive(): boolean;
  /** Whether a modal dialog is open (it keeps Space and 1–4). */
  isModalOpen(): boolean;
  /**
   * Esc: closes the open blocking modal (the briefing), whatever has the focus. Returns false when
   * none is open, so Esc goes on to its game binding.
   */
  dismissModal?(): boolean;
}

function isTextEntry(el: Element | null): boolean {
  if (el === null) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    return !['button', 'checkbox', 'radio', 'range', 'reset', 'submit'].includes(el.type);
  }
  return el instanceof HTMLElement && el.isContentEditable;
}

/** Whether nothing that takes keys has the focus (the page, or the game canvas). */
function onNothing(el: Element | null): boolean {
  return el === null || el === document.body || el instanceof HTMLCanvasElement;
}

/** Which binding (if any) a key press should run, per the routing rule. */
export function routeKey(
  e: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'repeat'>,
  focused: Element | null,
  modalOpen: boolean,
): (() => void) | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  // Held arrows repeat (the cursor glides); nothing else does.
  if (e.repeat && !ARROWS.has(e.code)) return null;
  // Enter is the focused control's; only with nothing focused does it reach the cursor.
  if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !onNothing(focused)) return null;
  if (isTextEntry(focused)) return null;
  const onButton = focused instanceof HTMLButtonElement;
  if (onButton && modalOpen && BUTTON_PASSTHROUGH.has(e.code)) return null;
  return BINDINGS[e.code] ?? null;
}

/** Whether a global key press should run (not typed into a field, no modifiers, not a repeat). */
export function routeGlobalKey(
  e: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey' | 'repeat'>,
  focused: Element | null,
): boolean {
  return !(e.ctrlKey || e.metaKey || e.altKey || e.repeat) && !isTextEntry(focused);
}

/** Installs the listener. Returns its removal. */
export function installKeys(routing: KeyRouting): () => void {
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Escape' && !e.repeat && routing.dismissModal?.() === true) {
      e.preventDefault();
      return;
    }
    // Esc in the menus: the innermost panel or screen closes (none registers during a battle).
    if (
      e.code === 'Escape' &&
      !e.repeat &&
      !e.isComposing &&
      !(e.ctrlKey || e.metaKey || e.altKey) &&
      runEscape()
    ) {
      e.preventDefault();
      return;
    }
    const global = GLOBAL_BINDINGS[e.code];
    if (global !== undefined && routeGlobalKey(e, document.activeElement)) {
      e.preventDefault();
      global();
      return;
    }
    if (!routing.isActive()) return;
    const action = routeKey(e, document.activeElement, routing.isModalOpen());
    if (action === null) return;
    e.preventDefault();
    // An arrow takes the keys to the playfield: a focused HUD button lets go of the focus.
    const focused = document.activeElement;
    if (ARROWS.has(e.code) && focused instanceof HTMLElement && !onNothing(focused)) {
      focused.blur();
    }
    action();
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
