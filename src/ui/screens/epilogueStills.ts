// The finale's full-screen stills (T843's `scene.dawn`, `scene.wayside`, `scene.orbit`: 320×180
// each, drawn at 2× on the 640×360 stage), as the finale's screens read them (T810: the Dawn
// stage, the epilogue's final image). They are painted lazily in the finale's chunk, so the
// lookup is installed by it (app/acts/fin.ts, `setFinaleStills` with T843's `finaleSceneSprite`);
// until then a still is looked up in the core sprite registry (hud/Icon.tsx `baked`), and a
// missing one is null: each screen draws its placeholder.
import { baked } from '../hud/Icon.tsx';

/** A still baked for the DOM: its data URL and size (sprite px). */
export interface FinaleStill {
  readonly url: string;
  readonly w: number;
  readonly h: number;
}

/** The scale the stills are drawn at (game px per sprite px): 320×180 fills the stage. */
export const STILL_SCALE = 2;

type Lookup = (id: string, frame: string) => FinaleStill | null;

let lookup: Lookup = (id, frame) => baked(id, frame);

/** Installs the finale's still lookup (app/acts/fin.ts: T843's `finaleSceneSprite`). */
export function setFinaleStills(next: Lookup): void {
  lookup = next;
}

/** Still `id` at `frame`, or null while it isn't painted (the screen draws its placeholder). */
export function finaleStill(id: string, frame: string): FinaleStill | null {
  try {
    return lookup(id, frame);
  } catch {
    return null;
  }
}
