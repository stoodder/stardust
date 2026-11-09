// A sprite icon in the DOM (art-direction §5: shown 1:1 in game pixels). Icons are baked from the
// same sprite definitions as the canvas art (render/sprites), once per id, into data URLs.
import { PALETTES } from '../../content/palettes/index.ts';
import { SPRITES } from '../../content/sprites/index.ts';
import type { SpriteDef } from '../../content/sprites/types.ts';
import { bakeSprite, DEFAULT_VARIANT, frameKey } from '../../render/sprites/bake.ts';
import { imageToCanvas } from '../../render/sprites/canvas.ts';

interface Baked {
  readonly url: string;
  readonly w: number;
  readonly h: number;
}

const cache = new Map<string, Baked | null>();

/** The icon's baked `icon` frame as a data URL, or null if no such sprite exists. */
function baked(id: string): Baked | null {
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  const def = (SPRITES as readonly SpriteDef[]).find((s) => s.id === id);
  let out: Baked | null = null;
  if (def !== undefined) {
    const key = frameKey(id, DEFAULT_VARIANT, 'icon');
    const frame = bakeSprite(def, PALETTES).frames.find((f) => f.key === key);
    if (frame !== undefined) {
      out = { url: imageToCanvas(frame.image).toDataURL(), w: frame.image.w, h: frame.image.h };
    }
  }
  cache.set(id, out);
  return out;
}

/** Decorative: the surrounding control carries the accessible name. */
export function Icon({ id, class: cls }: { id: string; class?: string }) {
  const b = baked(id);
  const name = `icon ${cls ?? ''}`.trim();
  if (b === null) return <span class={`${name} icon-missing`} aria-hidden="true" />;
  return <img class={name} src={b.url} width={b.w} height={b.h} alt="" aria-hidden="true" />;
}
