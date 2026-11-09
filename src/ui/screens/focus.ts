// Focus on arrival for menu controls. A stable ref callback, so a re-render never steals the focus
// back (an inline `ref={(el) => el?.focus()}` runs again on every render).
const focused = new WeakSet<HTMLElement>();

/** Ref callback: focuses the element once, when it mounts. */
export function focusOnce(el: HTMLElement | null): void {
  if (el === null || focused.has(el)) return;
  focused.add(el);
  el.focus();
}
