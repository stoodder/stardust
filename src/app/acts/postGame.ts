// The post-game shell's lazy half (T863), registered as the finale's screens chunk loads
// (app/acts/finUi.ts imports it): the dawn chart's look, the post-game plate, the Endless score
// screen, and Endless's launch (its generator), so none of it is in the initial JS.
import { dawnChartLook } from '../../content/sprites/starmap/dawn.ts';
import { EndlessScore, firstPostGameEntry, PostGameLayer } from '../../ui/screens/PostGame.tsx';
import { endlessRunContent } from '../endlessLaunch.ts';
import { registerPostGame } from '../postGameHooks.ts';

/** Registers the post-game shell's lazy half (app/acts/finUi.ts calls it as the chunk loads). */
export function registerPostGameUi(): void {
  registerPostGame({
    dawnLook: dawnChartLook,
    Layer: PostGameLayer,
    EndlessScore,
    firstEntry: firstPostGameEntry,
    runContent: endlessRunContent,
  });
}
