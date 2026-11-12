// The story's acts, loaded an act at a time (architecture.md § 5, *Bundle*; T802). Act I and the
// shared content are in the initial JS; Act II, Act III, and the finale are each one lazy chunk
// (app/acts/: the act's dialogue, codex entries, memos, and sounds). Loading is cumulative: an act
// loads with every act before it, so the registries always hold a prefix of the campaign.
// `ensureActs` loads up to an act (screens await it through app/contentGate.ts before they show);
// `preloadActs` does it in idle time. Tests and the Node tools register every act up front
// (`registerActChunk` with app/acts/all.ts; tools/vitestSetup.ts).
import { registerSfx } from '../audio/sfx/index.ts';
import {
  actRank,
  LAZY_ACTS,
  registerActStory,
  type LazyAct,
} from '../content/acts/index.ts';
import type { StoryAct } from '../content/dialogue/types.ts';
import type { ActChunk } from './acts/types.ts';

/** Each lazy act's chunk, imported on demand (one dynamic import each, so one chunk each). */
const LOADERS: Readonly<Record<LazyAct, () => Promise<ActChunk>>> = {
  2: () => import('./acts/a2.ts').then((m) => m.ACT2_CHUNK),
  3: () => import('./acts/a3.ts').then((m) => m.ACT3_CHUNK),
  finale: () => import('./acts/fin.ts').then((m) => m.FINALE_CHUNK),
};

const registered = new Set<StoryAct>([1]);
const pending = new Map<LazyAct, Promise<void>>();

/** Adds an act chunk's story and sounds to the registries (idempotent). */
export function registerActChunk(chunk: ActChunk): void {
  registerActStory(chunk.story);
  registerSfx(chunk.sfx);
  registered.add(chunk.story.act);
}

/** Whether `act`'s content is registered (Act I always is). */
export function actLoaded(act: StoryAct): boolean {
  return registered.has(act);
}

/** Whether every act up to `act` is registered. */
export function actsLoaded(act: StoryAct): boolean {
  return LAZY_ACTS.every((a) => actRank(a) > actRank(act) || registered.has(a));
}

/** The acts registered so far, in campaign order (the lazy-loading smoke flow reads it). */
export function loadedActs(): StoryAct[] {
  return [1, ...LAZY_ACTS.filter((a) => registered.has(a))];
}

/** Loads one lazy act's chunk and registers it, once. */
function loadAct(act: LazyAct): Promise<void> {
  if (registered.has(act)) return Promise.resolve();
  let p = pending.get(act);
  if (p === undefined) {
    p = LOADERS[act]().then(
      (chunk) => {
        registerActChunk(chunk);
        pending.delete(act);
      },
      (err: unknown) => {
        // A failed fetch (offline, a new deploy) may be retried by the next call.
        pending.delete(act);
        throw err;
      },
    );
    pending.set(act, p);
  }
  return p;
}

/**
 * Loads every act up to `act` (Act I is always in). Resolves at once when they are all registered.
 */
export function ensureActs(act: StoryAct): Promise<void> {
  const want = LAZY_ACTS.filter((a) => actRank(a) <= actRank(act) && !registered.has(a));
  if (want.length === 0) return Promise.resolve();
  return Promise.all(want.map(loadAct)).then(() => undefined);
}

/** Loads every act (a dev boot validates all the content: app/boot.ts). */
export function ensureAllActs(): Promise<void> {
  return ensureActs('finale');
}

/** Runs `fn` when the browser is idle (or soon, where there's no requestIdleCallback). */
export function whenIdle(fn: () => void): void {
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => number })
    .requestIdleCallback;
  if (ric === undefined) setTimeout(fn, 200);
  else ric(fn);
}

/** Loads every act up to `act` in idle time (the next act, ahead of need). Errors are dropped. */
export function preloadActs(act: StoryAct, onError: (err: unknown) => void = () => {}): void {
  if (actsLoaded(act)) return;
  whenIdle(() => {
    ensureActs(act).catch(onError);
  });
}
