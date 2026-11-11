// A sprite icon in the DOM (art-direction §5: shown 1:1 in game pixels). Icons are baked from the
// same sprite definitions as the canvas art (render/sprites), once per id, into data URLs.
import { PALETTES } from '../../content/palettes/index.ts';
import { SPRITES } from '../../content/sprites/index.ts';
import type { SpriteDef } from '../../content/sprites/types.ts';
import { bakeSprite, DEFAULT_VARIANT, frameKey } from '../../render/sprites/bake.ts';
import { imageToCanvas } from '../../render/sprites/canvas.ts';

export interface Baked {
  readonly url: string;
  readonly w: number;
  readonly h: number;
}

/**
 * The jailbroken palette (content/palettes/factions.ts; render/views/towerLook.ts's
 * JAILBROKEN_PALETTE): a jailbroken class's icon variant (T731).
 */
export const JAILBROKEN_ICON = 'everglow.jailbroken';

const cache = new Map<string, Baked | null>();

/**
 * The sprite's baked `frame` (in palette `variant`, default its own) as a data URL, or null if no
 * such sprite, variant, or frame exists.
 */
export function baked(id: string, frameName: string, variant = DEFAULT_VARIANT): Baked | null {
  const cacheKey = `${id}|${variant}|${frameName}`;
  const hit = cache.get(cacheKey);
  if (hit !== undefined) return hit;
  const def = (SPRITES as readonly SpriteDef[]).find((s) => s.id === id);
  let out: Baked | null = null;
  if (def !== undefined) {
    const key = frameKey(id, variant, frameName);
    const frame = bakeSprite(def, PALETTES).frames.find((f) => f.key === key);
    if (frame !== undefined) {
      out = { url: imageToCanvas(frame.image).toDataURL(), w: frame.image.w, h: frame.image.h };
    }
  }
  cache.set(cacheKey, out);
  return out;
}

/**
 * Decorative: the surrounding control carries the accessible name. `frame` picks another frame
 * than `icon` (a portrait's `neutral`, for the intake's ID badge).
 */
export function Icon({
  id,
  frame = 'icon',
  class: cls,
  variant,
}: {
  id: string;
  frame?: string;
  class?: string;
  /**
   * A palette variant the sprite declares (T731: `everglow.jailbroken` for a jailbroken class's
   * icon); its own palette when absent, or when the sprite has no such variant.
   */
  variant?: string | undefined;
}) {
  const b = (variant === undefined ? null : baked(id, frame, variant)) ?? baked(id, frame);
  const name = `icon ${cls ?? ''}`.trim();
  if (b === null) return <span class={`${name} icon-missing`} aria-hidden="true" />;
  return <img class={name} src={b.url} width={b.w} height={b.h} alt="" aria-hidden="true" />;
}
