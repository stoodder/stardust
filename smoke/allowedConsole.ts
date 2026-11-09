// Console errors the smoke tests tolerate. Every entry needs a comment saying why it's safe.
// Never add an entry just to get green (docs/tech/conventions.md § Red means stop).
const ALLOWED: readonly RegExp[] = [];

/** True if a console error message is on the allow-list. */
export function isAllowedConsole(text: string): boolean {
  return ALLOWED.some((re) => re.test(text));
}
