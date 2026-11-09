// The only console user in src/ (docs/tech/conventions.md § Lint and format).

/** Logs an error with context. Smoke tests fail on any console.error. */
export function logError(message: string, err?: unknown): void {
  console.error(`[stardust] ${message}`, err);
}

/** Logs a developer-facing warning (not an error, so smoke tests allow it). */
export function logWarn(message: string): void {
  console.warn(`[stardust] ${message}`);
}
