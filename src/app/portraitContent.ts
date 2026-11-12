// The portraits are a lazy chunk (architecture.md § 5, *Bundle*; T871): drawn only in the DOM, so
// their grids stay out of the initial JS. Boot starts the fetch at once, side by side with the
// atlas bake, and the content gate (app/contentGate.ts) waits for it before any screen shows, so a
// face is never blank. Tests register them up front (tools/vitestSetup.ts).
import { registerSprites } from '../content/sprites/registry.ts';
import type { SpriteDef } from '../content/sprites/types.ts';

let loaded = false;
let pending: Promise<void> | null = null;

/** Whether the portraits have registered. */
export function portraitsLoaded(): boolean {
  return loaded;
}

/** Registers the portraits (the chunk's, once loaded; tests pass them up front). */
export function registerPortraits(defs: readonly SpriteDef[]): void {
  registerSprites(defs);
  loaded = true;
}

/** Loads the portraits' chunk and registers it, once (a failed fetch may be retried). */
export function loadPortraits(): Promise<void> {
  if (loaded) return Promise.resolve();
  pending ??= import('../content/sprites/portraits/index.ts').then(
    (m) => {
      registerPortraits(m.PORTRAIT_SPRITES);
    },
    (err: unknown) => {
      pending = null;
      throw err;
    },
  );
  return pending;
}
