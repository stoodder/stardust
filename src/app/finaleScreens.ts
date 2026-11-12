// The finale's screens (T810: the campaign's close, and the Dawn and C5 stages) are their own lazy
// chunk (app/acts/finUi.ts registers them as it loads; ui/screens/epilogueState.ts), loaded beside
// the finale's story wherever a screen needs it (app/contentGate.ts, boot's up-front load, "Watch
// the epilogue"), the way the battle renderer is (app/battleRenderer.ts). The Node tools register
// the acts' content without it.

let loaded = false;
let pending: Promise<void> | null = null;

/** Whether the finale's screens have loaded (and registered). */
export function finaleScreensLoaded(): boolean {
  return loaded;
}

/** Loads the finale's screens, once (a failed fetch may be retried by the next call). */
export function loadFinaleScreens(): Promise<void> {
  if (loaded) return Promise.resolve();
  pending ??= import('./acts/finUi.ts').then(
    () => {
      loaded = true;
    },
    (err: unknown) => {
      pending = null;
      throw err;
    },
  );
  return pending;
}
