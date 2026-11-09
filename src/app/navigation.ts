// The one door for screen changes from the UI (the Title and Results buttons), the way
// commands.ts is for battle actions: components call these, never the router directly.
import { logError } from './log.ts';
import type { Router } from './router.ts';

let router: Router | null = null;

/** Points navigation at the app's router (boot.ts). */
export function setNavigator(next: Router | null): void {
  router = next;
}

function run(what: string, go: (r: Router) => Promise<void>): void {
  if (router === null) return;
  go(router).catch((err: unknown) => {
    logError(`navigation: ${what} failed`, err);
  });
}

/** Title → Start: opens the default battle (or the one the URL names). */
export function startGame(): void {
  run('start', (r) => r.goto('battle'));
}

/** Results → Retry: replays the last battle's map. */
export function retryRun(): void {
  run('retry', (r) => r.retry());
}

/** Results → Title. */
export function toTitle(): void {
  run('title', (r) => r.goto('title'));
}
