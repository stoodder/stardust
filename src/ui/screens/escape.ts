// Esc in the menus (T212): each menu screen and sub-panel registers what Esc does there (close
// Settings, back out of a Title panel or the Base, cancel a confirm), and app/keys.ts runs the
// newest registration first. A sub-panel mounts after its screen, so the innermost one wins; a
// handler that returns false (nothing to close) passes Esc to the one under it.
import { useLayoutEffect, useRef } from 'preact/hooks';

const stack: (() => boolean)[] = [];

/** Registers an Esc handler on top of the others. Returns its removal. */
export function pushEscape(handler: () => boolean): () => void {
  stack.push(handler);
  return () => {
    const i = stack.lastIndexOf(handler);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** Runs the Esc handlers, newest first, until one handles it. Returns whether one did. */
export function runEscape(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i]?.() === true) return true;
  }
  return false;
}

/**
 * Registers `handler` for Esc while the component is mounted (the latest render's handler runs).
 * A layout effect, so it's in place as soon as the panel is on screen.
 */
export function useEscape(handler: () => boolean): void {
  const ref = useRef(handler);
  ref.current = handler;
  useLayoutEffect(() => pushEscape(() => ref.current()), []);
}
